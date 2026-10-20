# Footprint web app

> This is the **web app** half of the repository. The browser extension people install is in the
> top-level [`extension/`](../extension/) folder; see the [repository README](../README.md) for how the parts fit.

A social media privacy assistant. Drop in your Facebook or Instagram data download to see, in plain
language, what the platform collects about you, then get a personal privacy plan: which settings to
change, in what order, with exact steps, based on what was found in your own download.
Everything runs in your browser: your download is never uploaded anywhere, and the web app never
logs in to Facebook or Instagram or changes settings for you.

## Try it

**[Open the Footprint web app](https://claude.ai/artifact/Evhotzt7jLYS5CH7vRYTsf)** (test version)

This is a temporary test link; it will move to Footprint's own website before release. Your download
is read inside your browser on that page and isn't uploaded. To try it without your own data, choose
**Explore the demo** on the start screen.

*Working name. Not affiliated with Meta.*

## Run it

All commands run from this `web-app/` folder.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (works offline, deployable anywhere)
npm run preview    # serve the production build locally
```

Drop the ZIP Facebook sent you onto the import screen (or pick it, or an unzipped folder).
It is read inside your browser in a background worker; nothing is uploaded.
**Explore the demo** on the import screen loads an invented person's export instead, through the same importer.

```bash
npm test                                   # unit tests on synthetic data
FB_EXPORT=/path/to/unzipped/export npm test  # also check a real export (prints counts only)
```

## Using it

After import, ten tabs each answer one question in plain language:

| Tab | Answers |
|---|---|
| Overview | What does Facebook have on me, at a glance? |
| Privacy plan | Which settings should I change, in what order, and what will each change really do? |
| Ads & tracking | Which businesses have my information, and what do other apps report? |
| About you | What has Facebook guessed about me (age, languages, places, interests, devices)? |
| Logins & devices | Where (on a world map) and on what devices has my account been used? |
| Activity | What does Facebook record about what I do, and when? |
| People | Who do I interact with, and what messages are stored? |
| Photos & videos | Which photos and videos does Facebook keep, and what does it know about each? |
| Timeline | Every dated record, in order, filterable and searchable |
| Files | Every file in the export, readable |

- **Search everything:** `⌘K` / `Ctrl+K` / `/` finds people, records, businesses, interests and files.
- **Details:** click any row, bar, square, map dot or photo to see the records behind it.
- **Privacy on screen:** the eye button in the header blurs names, emails, searches and IDs (on by default).
- **Keys:** `1`–`9` and `0` switch tabs; `Esc` closes panels; `←` `→` move between photos.

The login map is fully offline: country outlines are bundled (Natural Earth via `world-atlas`) and
place names come from per-country GeoNames lists in `src/geo/cities/`, loaded only for the countries
in an export. Regenerate them with `npm run build:gazetteer`.

## Working with the browser extension

The released extension is the packaged v0.3.1 in the repository's top-level [`extension/`](../extension/) folder.
This folder's `extension/` holds **older extension source (v0.1)** that the web app uses for its builds
and browser tests. It is behind the release, so don't ship from it; see
[`extension/README.md`](extension/README.md).

When both are open in the same browser, the web app's privacy plan merges the settings the extension
read live with the download: every card says *Checked live*, *From your download*, or *Not checked yet*,
and the newer answer wins (`src/advice/live.ts`). For that to work, the released extension needs two
updates that are so far only in this folder's source:

- its bridge must run on the web app's real address (v0.3.1's `manifest.json` lists the placeholder
  `https://footprint.example/*`; set `FOOTPRINT_APP_ORIGINS` when building), and
- its bridge and background must answer the new `report` and `scan` messages (`extension/src/bridge.ts`,
  `extension/src/background/index.ts`). Only setting values cross, never page text, names or posts.

Without them the web app works as before, from the download alone.

## Project layout

```
src/
  importer/    import.worker.ts (ZIP/folder reading in a worker), pipeline.ts (files → events + collections),
               text.ts (mojibake fix), time.ts (timestamp units), fields.ts (label_values normalizer),
               paths.ts (export root detection), client.ts (main-thread API, drag-and-drop folders)
  parsers/     registry.ts (ordered parser list) + one module per area: connections, activity, messages,
               security, ads, profile, generic (timeline fallback). labels.ts holds all language-specific text.
  advice/      facebook.ts (fix catalog: when each fix applies, status, links, verified month), plan.ts, usePlan.ts
  demo/        syntheticExport.ts (invented export for the demo and tests), loadDemo.ts (draws demo photos)
  insights/    insights.ts: every number and list the tabs show, computed once per import (pure, testable)
  model/       types.ts (normalized data model), aggregate.ts (bucketing helpers)
  store/       dataStore, filterStore (global cross-filters), uiStore (theme, layout, inspector)
  theme/       tokens.ts (category + status colors), chartTheme.ts (shared ECharts theme)
  i18n/        strings.ts (interface text), report.ts (tab titles, explanations, friendly labels)
  components/
    report/    Report.tsx: PageHeader (tinted tab band), Body, Section, Card, StatTiles, BarList, ChipCloud,
               SplitBar, Segmented, Tips, Empty, Personal, CountUp
    map/       LoginMap: offline world map (lazy loaded)
    panel/     Panel: framed area used by the file explorer
    raw/       JsonTree: lazy JSON viewer that renders label/value pairs readably
    charts/    Chart (themed ECharts wrapper)
    shell/     Header (brand, search, tabs, privacy, theme), SearchPalette, InspectorDrawer (details sheet), Footer
  geo/         geocode.ts (offline place lookup), cities/ (generated per-country place lists)
  views/       ImportScreen, RawExplorer, tabs/ (one file per tab)
  hooks/       useShortcuts
  dev/         sampleData.ts: fake preview data (not a real-export fixture)
```

## Conventions

- **Plain language first:** every number on screen comes with a sentence saying what it means.
  Copy lives in `i18n/report.ts`; write for someone who has never seen a data export.
- **Colors:** data falls into 8 activity groups (`theme/tokens.ts`, `groupOf`). The palette was
  checked for color-blind separation on both themes; don't reorder or add a 9th color.
  Red/amber/green are reserved for warnings and status.
- **New section:** compute its numbers in `insights/insights.ts`, render with the `report/`
  components, and make rows clickable to open the records behind them (`inspect`).
- **Privacy:** production builds ship a Content Security Policy with `connect-src 'self'`, so the
  app cannot send data to other servers. Fonts and libraries are bundled, never loaded from CDNs.
- **Facebook's labels are localized:** parsers look labels up in `parsers/labels.ts` and fall back
  to position/structure. New file type: write a `Parser` and add it to `parsers/registry.ts`.

## Status

- Milestone 1: scaffold, design tokens, shared panel and chart theme, command-center shell,
  master timeline with brushing, cross-filtering, inspector drawer, four live panels.
- Milestones 2–3: importer (ZIP, multiple ZIPs, folders, JSON files) in a worker; strict encoding fix;
  timestamp normalization; label_values normalizer; parser registry with 27 parsers + generic fallback;
  import screen with progress and summary; raw data explorer with media preview; real KPIs.

- Redesign: replaced the dense command center with eight plain-language tabs (overview findings,
  ads & tracking, guesses about you, logins & devices, activity, people & messages, timeline, files),
  new type and palette, show/hide personal details, details panel on every row.

- Photos & videos tab (worker-made previews, viewer with upload IP and dates), offline login map,
  search everything, and a design pass: sticky header, animated tabs, tinted tab bands, card anatomy,
  details sheet, chart annotations, footer with privacy promise and data credits.

- Privacy assistant: settings parser (`parsers/settings.ts`), dated fix catalog (`advice/`), wording in
  `i18n/advice.ts`, a "Privacy plan" tab with steps, honest limits and "I did this" ticks, plan links in every
  tab, and a plan summary on the Overview.
- Demo: `demo/syntheticExport.ts` builds an invented export that goes through the real importer, so the demo
  fills every tab and the plan. `npm test` checks it.

- Live plan (October 2026): the plan merges extension readings with the download and labels each
  card's source; "guessed" wording replaced with "Inferred by Facebook", each inferred item links to its
  file; map points matched only to a country are hidden by default.
- Instagram (October 2026): Instagram downloads are recognised by their folders and get their own
  parsers (`src/parsers/instagram/`), screens (`src/views/instagram/`), wording (`src/i18n/instagram.ts`)
  and a verified 14-step privacy plan (`src/advice/instagram.ts`). Tests use an invented download
  (`src/demo/syntheticInstagram.ts`); `scripts/instagram_check.py` checks every tab in a browser.

Next: opt-in saving between visits and comparing a newer export, anomaly flags, and the public-release
pieces (landing page, export guide).

## Credits

Place names: GeoNames (CC BY 4.0). Map outlines: Natural Earth (public domain) via world-atlas.
