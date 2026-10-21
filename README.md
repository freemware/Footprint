# Footprint

Understand what social platforms know about you, check your privacy settings, and choose what stays. Export analysis and extension results stay in your browser.

| Folder | Purpose |
| --- | --- |
| [`extension/`](extension/) | Installable browser extension, v0.4.0. Rebuilt from the source below. |
| [`web-app/`](web-app/) | React website, data-export explorer, and extension source in `web-app/extension`. |
| [`releases/`](releases/) | Installable ZIPs. |

## Install or update

[Download Footprint v0.4.0](releases/footprint-extension-0.4.0.zip), extract it, open `chrome://extensions` (or `brave://extensions`), enable Developer mode, and choose **Load unpacked** with the folder containing `manifest.json`.

For an existing installation, copy the new files into the same extension folder and click **Reload**. Close old Footprint dashboard tabs and reopen the extension. Keeping the existing installation preserves its identity and saved data.

Website changes in this repository do not update the temporary Claude-hosted test artifact automatically.

## New in 0.4.0

- Larger tagged-post cards, original-post links, and expanded previews. **Load post previews** reads up to twelve post pages per request to fill in available captions and images.
- **All tagged posts, photos & videos** scans both Facebook activity lists and deduplicates posts with a recognized permalink. Source-specific views remain available.
- Incremental result saving, explicit per-source coverage, and **Continue scan** from the paused worker tab when it is still available.
- **Keep** decisions, a **Needs review only** filter, and an exportable JSON inventory with coverage metadata.
- A brighter lavender, peach, and mint website design, clearer local-import instructions, working sample data, and shared extension styling.
- Reproducible extension builds using committed source, with the prior packaged Facebook fixes restored and Instagram recipes preserved.

## Honest limits

Reaching the end of a Facebook activity list does **not** guarantee that every historical tag was accessible. Facebook may omit private/deleted content, withhold history, filter results, or change its UI. A paused list remains incomplete; Continue looks for more instead of removing the warning.

Paused scans retain inactive worker tabs for continuation. If those tabs are closed/navigated or the browser restarts, Continue may need a new traversal. Saved lists remain visible. Previews and links are available only where Facebook exposes them; images can expire. The dashboard displays saved snapshots, not a live embedded Facebook feed.

Saved lists are separated by platform/tool/source. Clear Footprint data when changing Facebook accounts on a shared browser profile. No real-account tag removals or complete historical coverage have been verified for this release.

## Develop and validate

```sh
cd web-app
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npx tsc -p extension/tsconfig.json
npm test
npm run build
npm run build:extension
```

The extension build produces `web-app/extension/dist` and its ZIP. Root `extension/` and `releases/` contain the packaged copy for installation.

See [validation and coverage limits](docs/0.4.0-validation.md) and [product differentiation direction](docs/product-direction.md). Tests use synthetic Facebook pages and storage fixtures. Live scans and approved account changes still require testing in a signed-in browser.
