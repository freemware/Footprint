# Footprint

This repository holds two separate parts:

| Folder | What it is |
|---|---|
| [`extension/`](extension/) | **The browser extension** (packaged v0.3.1). Install it from [`releases/`](releases/). Everything below this table is about the extension. |
| [`web-app/`](web-app/) | **The web app** (source code). Reads the data download Facebook or Instagram gives you and builds a personal privacy plan, entirely in your browser. **[Open the web app](https://claude.ai/artifact/Evhotzt7jLYS5CH7vRYTsf)** (test link) · [`web-app/README.md`](web-app/README.md) |

Footprint is a Chrome extension that helps you review social media privacy settings, find posts you’re tagged in, and clean up old posts. Supported actions vary by platform.

Scans read settings. Changes happen only after you approve an action. Extension data is stored locally in your browser.

## Download

[Download Footprint v0.3.1](https://github.com/freemware/Footprint/raw/refs/heads/main/releases/footprint-extension-0.3.1.zip)

## Install

1. Download and extract the ZIP.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted folder containing `manifest.json`.
6. Open Footprint from Chrome’s extensions menu.
7. Sign in to the social media account you want to scan in the same browser.

### Update an existing installation

1. Close any open Footprint dashboard tabs.
2. Extract the new ZIP and copy its contents into your existing extension folder.
3. Keep the existing folder and installation to preserve the extension’s identity and saved data.
4. Open `chrome://extensions` and click **Reload** for Footprint.
5. Reopen Footprint.

## Features

- **Privacy scan:** Review supported settings and see which are private, need attention, or couldn’t be read.
- **Untag yourself:** Find supported tagged posts, select items, and approve tag removal.
- **Post previews:** See thumbnails and open the original post when Facebook provides an image or link.
- **Saved results:** Tagged and cleanup results are saved separately by platform and list, and remain available after navigation or a dashboard reload.
- **Background scanning:** Facebook scanning tabs open in the background so you can stay in Footprint and follow progress.
- **Cleanup:** Review supported old-post cleanup actions before approving changes.

## What’s new in v0.3.1

- Scanning keeps Footprint visible instead of activating the Facebook settings tab.
- Tagged results can include a thumbnail and a link to the original post.
- Results and the selected list persist across navigation and reloads.
- Collection checks scrollable panels, waits for delayed content, and retains rows that disappear as Facebook loads more items.
- Bulk selection controls are excluded from the results.
- Lists without a confirmed end are labeled **partial**.
- Privacy scans with unread settings show **Scan incomplete**.

## Understanding scan results

- **Already private:** Footprint successfully read the setting and found its expected private value.
- **Needs attention:** Footprint read a setting that differs from its recommended value.
- **Couldn’t be read:** Footprint could not determine the setting. This does not mean the setting is private or unsafe; review it manually.
- **Partial list:** Facebook may have more items than Footprint collected. Run Find again to retry.

## Known limitations

- Facebook can change its pages, restrict access, or stop loading history. Footprint cannot guarantee that it finds every historical tagged photo, video, or post.
- Collection stops at 5,000 items, 150 scroll passes, or six passes without new items. A list is marked complete only when an explicit end marker is detected.
- Images and post links are available only when exposed in the activity row. Some items have no thumbnail, and image URLs may expire.
- Saved results can become outdated after changes on Facebook. Run Find again before acting on an old list.
- Tag-removal verification refuses to confirm missing items from an incomplete verification list.
- Login alerts, two-factor authentication, and other settings may require manual review when Facebook does not expose the expected controls or applies account restrictions.
- Live account mutations and complete historical coverage have not been verified for this release. Automated tests use simulated Facebook pages.

## Troubleshooting

**The old behavior is still showing:** Reload the extension at `chrome://extensions`, close the old dashboard, and reopen Footprint.

**A setting couldn’t be read:** Make sure you are signed in, resolve any Facebook security prompts, and retry. Review the setting manually if it remains unreadable.

**Some tagged items are missing:** Check that you selected the intended list, such as **Photos and videos you’re tagged in**. Retry collection and check whether the results are marked partial.

**An image is missing:** Facebook may not expose a preview, or the image URL may have expired. Use the post link when available.

## Development and validation

The repository contains the packaged Manifest V3 extension. The original application source tree is not included, so this checkout does not support a full source build or TypeScript validation.

With Node.js 24 and npm 11, run:

```sh
cd extension/maintenance
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

The extension's version is in `extension/manifest.json` (currently `0.3.1`).

The test command runs five regression tests and a simulated Facebook privacy scan against the shipped scripts. These tests do not sign in to Facebook or change a live account.

Release validation also included JavaScript syntax and manifest-reference checks, plus desktop and mobile Chromium dashboard checks.
