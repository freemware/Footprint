"""
Browser check of the Footprint web app (dist served on :4311), without and with the test
extension installed. Exits non-zero on failure.  SHOTS=<dir> python3 extension/test/app_check.py
"""
import asyncio, os, sys, tempfile
from playwright.async_api import async_playwright

EXT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dist-test')
S = os.environ.get('SHOTS', '/tmp/fp-e2e')
APP = 'http://localhost:4311/'
DEMO_ZIP = os.environ.get('DEMO_ZIP')
fails = []

def check(c, w):
    print(('  ok   ' if c else '  FAIL ') + w)
    if not c: fails.append(w)

async def main():
    async with async_playwright() as p:
        print('Without the extension')
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(APP)
        await pg.get_by_text('Take back your privacy').wait_for()
        check(await pg.get_by_role('button', name='Get the extension').is_visible(), 'start screen offers the extension when not installed')
        await pg.screenshot(path=f'{S}/app-start.png', full_page=True)
        await pg.get_by_role('button', name='Get the extension').click()
        await pg.get_by_text('Footprint for your browser').wait_for()
        await pg.screenshot(path=f'{S}/app-extension.png', full_page=True)
        r = await pg.request.get(APP + 'footprint-extension.zip')
        check(r.ok and len(await r.body()) > 100000, 'extension download is served by the app')
        await pg.get_by_role('link', name='Download the extension').wait_for(timeout=4000)
        check(True, 'download button shows when the file is there')
        await pg.goto(APP)
        await pg.get_by_role('button', name='Explore the demo').click()
        await pg.get_by_role('tab').first.wait_for()
        tabs = pg.get_by_role('tab')
        n = await tabs.count()
        for i in range(n):
            await tabs.nth(i).click()
            await asyncio.sleep(0.4)
        check(n >= 9, f'clicked through {n} report tabs')
        await pg.get_by_role('tab', name='Privacy plan').click()
        await pg.get_by_role('button', name='Let the extension do it').first.click()
        await pg.get_by_text('Footprint for your browser').wait_for()
        check(True, 'a plan fix without the extension leads to the extension page')
        check(not errs, f'no page errors without the extension {errs[:2]}')
        ph = await b.new_page(viewport={'width': 390, 'height': 844})
        await ph.goto(APP)
        await ph.get_by_text('Take back your privacy').wait_for()
        await ph.screenshot(path=f'{S}/app-start-phone.png', full_page=True)
        w = await ph.evaluate('document.documentElement.scrollWidth')
        check(w <= 390, f'start screen fits a phone ({w})')
        await b.close()

        print('With the extension')
        ctx = await p.chromium.launch_persistent_context(tempfile.mkdtemp(), channel='chromium', headless=True, args=[f'--disable-extensions-except={EXT}', f'--load-extension={EXT}'], viewport={'width': 1280, 'height': 900})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(APP)
        await pg.get_by_role('button', name='Scan now').wait_for(timeout=5000)
        check(True, 'start screen sees the installed extension and offers a live scan')
        await pg.get_by_role('button', name='Scan now').click()
        await pg.get_by_text('Last scan').wait_for(timeout=120000)
        check(True, 'a scan started from the app reports back to the start screen')
        await pg.screenshot(path=f'{S}/app-start-scanned.png', full_page=True)
        async with ctx.expect_page() as np:
            await pg.get_by_role('button', name='See the results').click()
        d = await np.value
        check(d.url.endswith('dashboard.html#scan'), 'opens the extension at the scan results')
        await d.close()
        if DEMO_ZIP and os.path.exists(DEMO_ZIP):
            await pg.locator('input[type=file][accept*=".zip"]').set_input_files(DEMO_ZIP)
            await pg.get_by_text('Your data is ready').wait_for(timeout=60000)
            await pg.get_by_role('button', name='See what Facebook has on you').click()
            await pg.get_by_role('tab', name='Privacy plan').click()
            await pg.get_by_text('checked live on').wait_for(timeout=10000)
            check(True, 'the plan says how many settings were checked live')
            live = await pg.get_by_text('Checked live ·').count()
            dl = await pg.get_by_text('From your download · Oct 14, 2026').count()
            check(live > 0 and dl > 0, f'cards carry both sources ({live} live, {dl} from the download)')
            card = pg.locator('#fix-future_posts')
            check('Checked live' in (await card.inner_text()), 'future posts: the newer live reading (Public) wins over the download (Friends)')
            todo_ids = await pg.locator('ol').first.locator('li[id^="fix-"]').evaluate_all('els => els.map(e => e.id)')
            check('fix-future_posts' in todo_ids, 'future posts moved into "Change these"')
            await card.locator('button').first.click()
            await card.get_by_text('What the extension saw').wait_for()
            check('Public' in (await card.inner_text()), 'the card shows exactly what the extension read')
            await pg.screenshot(path=f'{S}/app-plan-live.png', full_page=True)
            await pg.get_by_role('tab', name='About you').click()
            await pg.get_by_text('Inferred by Facebook').first.wait_for()
            check(await pg.get_by_text('Guessed', exact=True).count() == 0, 'no "Guessed" labels on About you')
            await pg.get_by_role('button', name='See it in your download').first.click()
            await pg.get_by_role('tab', name='Files', selected=True).wait_for(timeout=5000)
            check(True, 'an inferred item opens its file in your download')
            await pg.screenshot(path=f'{S}/app-files-from-inference.png', full_page=True)
            await pg.goto(APP)
            await pg.get_by_role('button', name='Scan again').wait_for(timeout=5000)
        else:
            print('  skip plan merge (set DEMO_ZIP)')
        await pg.get_by_role('button', name='Explore the demo').click()
        await pg.get_by_role('tab', name='Privacy plan').click()
        async with ctx.expect_page() as np2:
            await pg.get_by_role('button', name='Let the extension do it').first.click()
        d2 = await np2.value
        check('dashboard.html#scan:' in d2.url or d2.url.endswith('#cleanup'), f'a plan fix opens that check in the extension (#{d2.url.split("#")[1]})')
        await pg.get_by_role('button', name='Browser extension').click()
        await pg.get_by_text('Installed (version').wait_for()
        check(True, 'extension page shows it is installed')
        check(not errs, f'no page errors with the extension {errs[:2]}')
        await ctx.close()
    print('ALL PASSED' if not fails else f'{len(fails)} FAILED')
    sys.exit(1 if fails else 0)

asyncio.run(main())
