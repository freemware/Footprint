"""
Browser check of the web app (dist served on :4311) with an Instagram download: imports it, opens
every tab, and fails on page errors, requests to other sites, or Facebook-only wording on screen.

  IG_ZIP=<instagram zip> SHOTS=<dir> python3 scripts/instagram_check.py
"""
import asyncio, os, re, sys
from playwright.async_api import async_playwright

APP = 'http://localhost:4311/'
ZIP = os.environ['IG_ZIP']
S = os.environ.get('SHOTS', '/tmp/fp-ig')
# Facebook may be named where both platforms are meant ("Facebook or Instagram") or in the header's nav.
# One Instagram fix rightly says Facebook has its own link history setting.
FORBIDDEN = re.compile(r'\bFacebook\b(?! or Instagram| has its own link history)|Marketplace|friends list|Messenger', re.I)
fails = []

def check(c, w):
    print(('  ok   ' if c else '  FAIL ') + w)
    if not c: fails.append(w)

async def main():
    os.makedirs(S, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 900})
        errs, outside = [], []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('request', lambda r: outside.append(r.url) if not r.url.startswith(('http://localhost:4311', 'data:', 'blob:')) else None)
        await pg.goto(APP)
        await pg.get_by_text('Take back your privacy').wait_for()
        await pg.locator('input[type=file][accept*=".zip"]').set_input_files(ZIP)
        await pg.get_by_text('Your data is ready').wait_for(timeout=60000)
        await pg.get_by_role('button', name='See what Instagram has on you').click()
        await pg.get_by_role('tab').first.wait_for()
        tabs = pg.get_by_role('tab')
        n = await tabs.count()
        for i in range(n):
            t = tabs.nth(i)
            name = (await t.inner_text()).strip()
            await t.click()
            await asyncio.sleep(0.6)
            main_text = await pg.locator('main').inner_text()
            hits = sorted(set(m.group(0) for m in FORBIDDEN.finditer(main_text)))
            check(not hits, f'{name}: no Facebook-only wording {hits}')
            check(len(main_text) > 200, f'{name}: has content')
            await pg.screenshot(path=f'{S}/ig-{i:02d}-{re.sub(r"[^a-z]+", "-", name.lower())}.png', full_page=True)
        check(n >= 10, f'clicked through {n} tabs')
        await pg.get_by_role('tab', name='Overview').click()
        check(await pg.get_by_text("Here's what Instagram has on you").count() > 0, 'overview speaks about Instagram')
        await pg.get_by_role('tab', name='Privacy plan').click()
        check(await pg.get_by_text('Make Instagram collect and show less').count() > 0, 'plan speaks about Instagram')
        check(await pg.get_by_text('Make your account private').count() > 0, 'plan has Instagram fixes')
        check(await pg.get_by_text('Checked live').count() == 0, 'no live-check labels for Instagram')
        check(not errs, f'no page errors {errs[:2]}')
        check(not outside, f'no requests to other sites {outside[:3]}')
        ph = await b.new_page(viewport={'width': 390, 'height': 844})
        await ph.goto(APP)
        await ph.locator('input[type=file][accept*=".zip"]').set_input_files(ZIP)
        await ph.get_by_text('Your data is ready').wait_for(timeout=60000)
        await ph.get_by_role('button', name='See what Instagram has on you').click()
        await asyncio.sleep(0.8)
        w = await ph.evaluate('document.documentElement.scrollWidth')
        check(w <= 390, f'Instagram overview fits a phone ({w})')
        await ph.screenshot(path=f'{S}/ig-phone-overview.png', full_page=True)
        await b.close()
    print('ALL PASSED' if not fails else f'{len(fails)} FAILED')
    sys.exit(1 if fails else 0)

asyncio.run(main())
