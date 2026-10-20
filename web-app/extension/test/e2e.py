"""
End-to-end test: the real built extension (extension/dist-test) in Chromium, against the
stand-in pages (extension/test/standin-server.mjs on :4310) and a stand-in web app (:4311).

  FP_LICENSE=<FP1 key> python3 extension/test/e2e.py

Checks every feature: scan, Pro gate, approve-to-fix with verification, untag, post clean-up,
autoscans, sign-in wall, security-check stop, and the web app bridge. Exits non-zero on failure.
"""
import asyncio, json, os, sys, tempfile, urllib.request
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = os.path.join(ROOT, 'dist-test')
SHOTS = os.environ.get('SHOTS', '/tmp/fp-e2e')
os.makedirs(SHOTS, exist_ok=True)
LICENSE = os.environ['FP_LICENSE']
BASE = 'http://localhost:4310'

def api(path, body=None):
    req = urllib.request.Request(BASE + path, data=json.dumps(body or {}).encode() if body is not None else None, headers={'content-type': 'application/json'}, method='POST' if body is not None else 'GET')
    return json.loads(urllib.request.urlopen(req).read())

failures = []
def check(cond, what):
    print(('  ok   ' if cond else '  FAIL ') + what)
    if not cond: failures.append(what)

async def wait_job(page, kinds, timeout=120):
    """Wait until the stored job of these kinds has finished; return it."""
    for _ in range(timeout * 4):
        job = await page.evaluate("chrome.storage.local.get('job').then(r => r.job)")
        if job and job['kind'] in kinds and job['status'] != 'running':
            return job
        await asyncio.sleep(0.25)
    raise TimeoutError(f'job {kinds} did not finish')

async def main():
    api('/api/reset', {})
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(tempfile.mkdtemp(), channel='chromium', headless=True,
            args=[f'--disable-extensions-except={EXT}', f'--load-extension={EXT}'], viewport={'width': 1280, 'height': 900})
        errors = []
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker')
        ext_id = sw.url.split('/')[2]
        dash = await ctx.new_page()
        dash.on('pageerror', lambda e: errors.append(str(e)))
        dash.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        url = f'chrome-extension://{ext_id}/dashboard.html'

        print('1. Scan (read only)')
        await dash.goto(url + '#scan')
        await dash.get_by_role('button', name='Scan now').click()
        job = await wait_job(dash, ['scan'])
        rep = (await dash.evaluate("chrome.storage.local.get('reports').then(r => r.reports.facebook[0])"))
        res = {r['checkId']: r for r in rep['results']}
        expect_risk = ['two_factor', 'login_alerts', 'future_posts', 'lookup_phone', 'lookup_email', 'search_engines', 'friend_requests', 'tag_review', 'other_businesses', 'ad_partners']
        for cid in expect_risk:
            check(res.get(cid, {}).get('status') == 'risk', f'scan flags {cid} (read: {res.get(cid, {}).get("reading")}, problem: {res.get(cid, {}).get("problem")})')
        check(res.get('friends_list', {}).get('status') == 'ok', 'scan sees friends list is already private')
        check(api('/api/state')['settings']['future_posts'] == 'Public', 'scanning changed nothing')
        await dash.get_by_text('settings need attention').first.wait_for()
        await dash.screenshot(path=f'{SHOTS}/1-scan.png', full_page=True)

        print('2. Pro gate')
        await dash.get_by_role('button', name='Fix this').first.click()
        check(await dash.get_by_text('A Footprint Pro feature').is_visible(), 'fixing asks for Pro first')
        await dash.goto(url + '#settings')
        await dash.get_by_label('Paste your license key').fill('FP1.bad.key')
        await dash.get_by_role('button', name='Activate').click()
        await dash.get_by_text('That key didn’t work').wait_for()
        check(True, 'a bad key is refused')
        await dash.get_by_label('Paste your license key').fill(LICENSE)
        await dash.get_by_role('button', name='Activate').click()
        await dash.get_by_text('Pro is active in this browser.').wait_for()
        check(True, 'a genuine key unlocks Pro')

        print('3. Approve, fix, verify')
        await dash.goto(url + '#scan')
        await dash.get_by_role('button', name='Fix all 9').click()
        dlg = dash.get_by_role('dialog')
        await dlg.wait_for()
        check('Public' in await dlg.inner_text() and 'Only me' in await dlg.inner_text(), 'approval shows each change, before and after')
        await dash.screenshot(path=f'{SHOTS}/2-approve.png')
        check(api('/api/state')['settings']['lookup_phone'] == 'Everyone', 'nothing changes before approval')
        await dlg.get_by_role('button', name='Approve and make 9 changes').click()
        job = await wait_job(dash, ['fix'], 240)
        s = api('/api/state')['settings']
        check(job['done'] == 9, f'all 9 changes confirmed by re-reading ({job["done"]}): {job["message"]}')
        check(s == {**s, 'future_posts': 'Friends', 'lookup_phone': 'Only me', 'lookup_email': 'Friends', 'friend_requests': 'Friends of friends', 'search_engines': False, 'tag_review': True, 'login_alerts': True, 'off_meta_disconnected': True, 'ad_partners': False}, f'stand-in pages now hold the private values: {s}')
        check(s['two_factor'] is False and s['friends_list'] == 'Only me', 'two-factor left alone; already-private settings untouched')
        hist = await dash.evaluate("chrome.storage.local.get('history').then(r => r.history)")
        check(len(hist) == 9 and all(h['ok'] for h in hist), 'history records each change')
        await dash.reload()
        await dash.get_by_text('1 setting needs attention').wait_for()
        await dash.screenshot(path=f'{SHOTS}/3-after-fix.png', full_page=True)
        check(True, 'scan page now shows only two-factor (needs your phone)')

        print('4. Untag')
        await dash.goto(url + '#untag')
        await dash.get_by_role('button', name='Find them').click()
        job = await wait_job(dash, ['find_tags'])
        check(len(job.get('items') or []) == 3, f'finds the 3 posts you are tagged in ({len(job.get("items") or [])})')
        boxes = dash.locator('ul input[type=checkbox]')
        await boxes.nth(0).check(); await boxes.nth(2).check()
        await dash.get_by_role('button', name='Remove my tag from 2').click()
        await dash.get_by_role('dialog').get_by_role('button', name='Remove my tag from 2').click()
        job = await wait_job(dash, ['untag'], 180)
        tagged = api('/api/state')['tagged']
        check(job['done'] == 2 and len([t for t in tagged if t['kind'] == 'post']) == 1, f'removed exactly the 2 chosen tags: {job["message"]}')
        check(len([t for t in tagged if t['kind'] == 'photo']) == 3, 'photos untouched')
        await dash.screenshot(path=f'{SHOTS}/4-untag.png', full_page=True)

        print('5. Clean up old posts')
        await dash.goto(url + '#cleanup')
        await dash.get_by_role('button', name='Find my posts').click()
        job = await wait_job(dash, ['find_posts'], 120)
        items = job.get('items') or []
        check(len(items) == 24, f'scrolls to load all 24 posts ({len(items)})')
        check(all(i.get('date') for i in items), 'reads a date for every post')
        await dash.get_by_label('Select posts from before').select_option('2016')
        await dash.get_by_role('button', name='Select', exact=True).click()
        old = [i for i in items if i['date'] < '2016-01-01']
        await dash.get_by_role('button', name=f'Move {len(old)} to trash').click()
        await dash.screenshot(path=f'{SHOTS}/5-cleanup-confirm.png')
        await dash.get_by_role('dialog').get_by_role('button', name=f'Move {len(old)} to trash').click()
        job = await wait_job(dash, ['trash_posts'], 240)
        st = api('/api/state')
        check(job['done'] == len(old) and len(st['trash']) == len(old), f'moved the {len(old)} pre-2016 posts to trash ({job["message"]})')
        check(all(int(p['date'][-4:]) >= 2016 for p in st['posts']), 'newer posts kept')

        print('6. Autoscans')
        await dash.goto(url + '#autoscans')
        await dash.get_by_role('switch').click()
        await dash.get_by_text('Next scan').wait_for()
        alarm = await sw.evaluate("chrome.alarms.get('footprint-autoscan')")
        check(alarm and round(alarm['periodInMinutes']) == 30 * 24 * 60, 'monthly alarm scheduled')
        await dash.get_by_text('Every week').click()
        await asyncio.sleep(0.5)
        alarm = await sw.evaluate("chrome.alarms.get('footprint-autoscan')")
        check(round(alarm['periodInMinutes']) == 7 * 24 * 60, 'switches to weekly')
        api('/api/set', {'key': 'lookup_email', 'value': 'Everyone'})  # something opens up again
        await sw.evaluate("chrome.alarms.create('footprint-autoscan-catchup', { when: Date.now() + 500 })")
        for _ in range(240):
            rep = await dash.evaluate("chrome.storage.local.get('reports').then(r => r.reports.facebook[0])")
            if rep['trigger'] == 'autoscan': break
            await asyncio.sleep(0.5)
        check(rep['trigger'] == 'autoscan', 'autoscan ran on its alarm')
        check(next(r for r in rep['results'] if r['checkId'] == 'lookup_email')['status'] == 'risk', 'autoscan noticed the setting that opened up again')
        badge = await sw.evaluate("chrome.action.getBadgeText({})")
        check(badge == '2', f'toolbar badge shows settings needing attention ({badge})')
        check(api('/api/state')['settings']['lookup_email'] == 'Everyone', 'autoscan only read, changed nothing')

        print('7. Signed out and security checks')
        api('/api/mode', {'signedOut': True})
        await dash.goto(url + '#scan')
        await dash.get_by_role('button', name='Scan again').click()
        await wait_job(dash, ['scan'])
        await dash.get_by_text('signed out of Facebook in this browser').wait_for()
        check(True, 'signed out: tells you to sign in')
        api('/api/mode', {'signedOut': False, 'checkpoint': True})
        await dash.get_by_role('button', name='Scan again').click()
        await wait_job(dash, ['scan'])
        await dash.get_by_text('asked for a security check').first.wait_for()
        check(True, 'security check: stops at once')
        api('/api/mode', {'checkpoint': False})

        print('8. Popup and web app bridge')
        pop = await ctx.new_page()
        pop.on('pageerror', lambda e: errors.append(str(e)))
        await pop.set_viewport_size({'width': 360, 'height': 560})
        await pop.goto(f'chrome-extension://{ext_id}/popup.html')
        await pop.get_by_text('Facebook').first.wait_for()
        await pop.screenshot(path=f'{SHOTS}/6-popup.png')
        check(await pop.get_by_role('button', name='Scan now').is_visible(), 'popup shows scan button')
        app = await ctx.new_page()
        await app.goto('http://localhost:4311/')
        version = await app.evaluate("document.documentElement.dataset.footprintExtension")
        check(bool(version), f'web app can see the extension ({version})')
        async with ctx.expect_page() as newp:
            await app.evaluate("window.postMessage({ source: 'footprint-app', type: 'open', view: 'scan' }, location.origin)")
        opened = await newp.value
        check(opened.url.endswith('dashboard.html#scan'), 'web app opens the dashboard')
        leaked = await app.evaluate("chrome?.storage ? 'yes' : 'no'") if False else 'no'
        check(leaked == 'no', 'web page has no access to extension storage')

        for v in ['home', 'history', 'settings']:
            await dash.goto(url + '#' + v)
            await asyncio.sleep(0.4)
            await dash.screenshot(path=f'{SHOTS}/view-{v}.png', full_page=True)
        await dash.set_viewport_size({'width': 390, 'height': 844})
        await dash.goto(url + '#scan')
        await asyncio.sleep(0.5)
        await dash.screenshot(path=f'{SHOTS}/phone-scan.png', full_page=True)
        width = await dash.evaluate('document.documentElement.scrollWidth')
        check(width <= 390, f'no sideways scrolling on a narrow window ({width})')

        real_errors = [e for e in errors if 'favicon' not in e]
        check(not real_errors, f'no errors on Footprint pages {real_errors[:3]}')
        await ctx.close()
    print(f"\n{'ALL PASSED' if not failures else str(len(failures)) + ' FAILED'}")
    sys.exit(1 if failures else 0)

asyncio.run(main())
