# Footprint browser extension (source, v0.1)

> **This is not the released extension.** The extension people install is the packaged v0.3.1 in the
> repository's top-level [`footprint-extension-0.3.0/`](../../footprint-extension-0.3.0/) folder, built from newer source that isn't in
> this repository. This folder is the older source the web app uses for its builds and browser tests,
> plus the bridge changes that let the web app show live scan results. Bring the two together before
> releasing from here: [`footprint-extension-0.3.0/maintenance/source-changes.patch`](../../footprint-extension-0.3.0/maintenance/source-changes.patch)
> applies cleanly to this source and covers the 0.3.0 Facebook fixes, but not 0.3.1's saved results,
> previews or Instagram parts.

Scans your privacy settings on the platforms you're signed in to, flags what's open, and makes the
changes you approve. Also: untag yourself from posts and photos, move old posts to trash, and
autoscans that tell you when a setting opens up again. Facebook first; Instagram, LinkedIn, X,
TikTok, Snapchat and Venmo are listed as coming.

## How it keeps people in control

- Uses the sign-ins already in the browser. Never asks for, sees or stores passwords or cookies.
- Opens platform pages only when the person starts a scan, approves a change, or turns on autoscans.
- Scans only read. Every change is shown before and after, runs only after approval, and is read
  back afterwards; the result ("9 of 9 changed and confirmed") is what was confirmed, not assumed.
- Posts go to Facebook's trash (recoverable for 30 days). Footprint never uses permanent delete.
- Two-factor is never changed automatically (it needs the person's phone); the extension shows how.
- Stops at once on a sign-in page or any security check / "slow down" warning.
- Paces itself: one step at a time, batches of 25, at most 100 rows per run.
- Everything it reads stays in `chrome.storage.local` on that device. Extension pages have
  `connect-src 'none'`: they cannot reach the internet at all.
- "What Footprint changed" lists every change. "Delete all Footprint data" removes everything.

Platforms don't officially support tools that act on your account, so the screens say so plainly.

## Free and Pro

Free: scan, risk list, step-by-step instructions. Pro (same `FP1.` license key as the app, checked on
the device): one-click fixes, untagging, post clean-up, autoscans. The Footprint web app can hand its
Pro key to the extension through the bridge.

## Working with the web app

A small bridge script runs only on the Footprint web app's own origin (`FOOTPRINT_APP_ORIGINS`).
Through it the app can: open the extension's dashboard, hand over its Pro key, start a scan (scans
only read), and ask for the latest scan's setting readings. The extension tells the app when a new
scan is saved or a job starts or stops, so the plan updates by itself.

Only setting readings cross (`AppReport` in `src/shared/types.ts`: check id, risk/ok/unknown, the
value and its on-page label, cut to 60 characters, and when it was read). Never page text, names,
posts or messages. Changes still need approval on the extension's own screens; the app can't make
them. The app keeps readings in memory only; the extension remains where they're stored.

In the app's privacy plan, each card says where its answer came from: *Checked live* (the
extension, newest wins), *From your download*, or *Not checked yet*. Merging rules per fix are in
the app's `src/advice/live.ts`.

## Build

```sh
npm run build:extension        # → extension/dist, extension/footprint-extension-<version>.zip,
                               #   and public/footprint-extension.zip for the web app's download
npm run build:extension:test   # → extension/dist-test, pointed at the stand-in pages
```

Set `FOOTPRINT_APP_ORIGINS=https://your-domain` (comma-separated) so the bridge runs on your app,
and `FOOTPRINT_APP_URL=https://your-domain/` for the "Get Pro" and "Open the Footprint app" links.

## Install

**Chrome / Edge (until the store listing):** unzip, open `chrome://extensions` (or
`edge://extensions`), turn on Developer mode, Load unpacked, pick the folder.
**Chrome Web Store:** upload `footprint-extension-<version>.zip`. Explain in the listing why each
permission is needed (the comments in `scripts/build-extension.mjs` have the wording).

**Safari (Mac, needs Xcode and an Apple Developer account):**
```sh
xcrun safari-web-extension-converter extension/dist --app-name "Footprint" --bundle-identifier com.yourname.footprint
```
Open the generated Xcode project, set your team, run it once, then enable the extension in
Safari → Settings → Extensions. Submit through App Store Connect. Safari has no system notifications
for extensions, so autoscan results show on the toolbar badge and in the extension instead.

## Tests

```sh
npx vitest run extension                        # engine, recipes, autoscan logic (jsdom)
node extension/test/standin-server.mjs &        # stand-in Facebook pages on :4310
python3 -m http.server 4311 --directory dist &  # the built web app on :4311
FP_LICENSE=$(FOOTPRINT_LICENSE_KEY=… node scripts/make-license.mjs test) python3 extension/test/e2e.py
python3 extension/test/app_check.py             # the web app with and without the extension
```
`e2e.py` loads the real extension in Chromium and checks scan, Pro gate, approve-and-fix with
read-back, untag, clean-up with scrolling, autoscans and badge, sign-in wall, security-check stop,
popup, the app bridge, and that there are no errors.

## When Facebook changes a page

Recipes are data in `src/platforms/facebook.ts`: where each setting lives and the labels to look
for (regular expressions, tried in order, most specific first). Nothing depends on CSS classes.
When a check shows "Couldn't read", the person can open **Problem report** and copy it: it lists only
the page's button, menu and heading labels (never posts, names or messages). Paste that into a new
pattern, add a jsdom test with the same shape in `engine/engine.test.ts`, rebuild.

Labels are English for now. For other languages, add patterns for the same settings.

## Adding a platform

Write `src/platforms/<name>.ts` exporting a `PlatformDef` (checks with `open`, `read`, `risky`,
optional `fix`; optional `tags` and `posts` list recipes), switch its entry in `registry.ts` to
`available`, add its sites to `host_permissions` in `scripts/build-extension.mjs`, and add stand-in
pages plus e2e checks.
