# Packaged extension maintenance

This checkout contains a packaged Manifest V3 extension, not the original application source tree. Edit the shipped JavaScript carefully; `build.mjs` and `verify.mjs` require the original staging/source tree and cannot run independently here. No full source build or TypeScript validation is available in this checkout.

With Node.js 24 and npm 11:

```sh
cd /workspace/Footprint/footprint-extension-0.3.0/maintenance
npm ci --cache /workspace/footprint-tools/npm-cache --ignore-scripts --no-audit --no-fund
npm test
```

Tests exercise the shipped content script and service worker against simulated Facebook pages. They never sign in, access a live Facebook account, or remove real tags.

To test in Chrome, load `footprint-extension-0.3.0` as an unpacked extension. When updating an existing installation, keep its folder and click Reload in `chrome://extensions`, then reopen Footprint so its dashboard loads the updated bundle. This preserves the extension's stored data.

Scans run in inactive tabs. Tagged and cleanup list results are saved in `chrome.storage.local`, separately by platform, tool, and source. The dashboard remembers the selected source across navigation and reloads. Clear-all removes saved lists along with other extension data.

Collection checks nested scrolling containers, waits through six idle passes, and retains rows across DOM virtualization. It stops at 5,000 items or 150 scroll passes. A list is marked complete only when an explicit end marker is observed; otherwise the UI warns it is partial. Tag-removal verification refuses to confirm disappearance from an incomplete list. Cached results can be stale after external Facebook changes; run Find again before acting.

Post links and thumbnails are shown only when present in the activity row. Profile/avatar images are excluded where identifiable. Thumbnail URLs may expire or Facebook may omit them; broken thumbnails are hidden. Video rows may provide only a poster image. Facebook can withhold history or change its UI, so collecting every historical tagged item is not guaranteed.
