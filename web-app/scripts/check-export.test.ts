/**
 * Runs the import pipeline against a real, unzipped export on this machine and prints
 * an aggregate report (counts only, never names or content). Skipped unless FB_EXPORT is set:
 *
 *   FB_EXPORT=/path/to/unzipped/export npx vitest run scripts/check-export.test.ts
 *
 * Nothing from the export is written anywhere.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDataset, fileKind, type SourceFile } from '../src/importer/pipeline';
import { deepFixText } from '../src/importer/text';

const ROOT = process.env.FB_EXPORT;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe.skipIf(!ROOT)('real export', () => {
  it('imports every file without errors', () => {
    const files: SourceFile[] = walk(ROOT!).map((p) => {
      const path = relative(ROOT!, p).split('\\').join('/');
      const size = statSync(p).size;
      if (fileKind(path) !== 'json') return { path, size };
      try {
        return { path, size, json: deepFixText(JSON.parse(readFileSync(p, 'utf8'))) };
      } catch (e) {
        return { path, size, error: String(e) };
      }
    });
    const t0 = Date.now();
    const { events, collections, summary } = buildDataset(files, 'real');
    const ms = Date.now() - t0;

    const byParser: Record<string, { files: number; records: number; events: number }> = {};
    for (const f of summary.files) {
      if (!f.parser) continue;
      const b = (byParser[f.parser] ??= { files: 0, records: 0, events: 0 });
      b.files++;
      b.records += f.records ?? 0;
      b.events += f.events ?? 0;
    }
    const byType: Record<string, number> = {};
    for (const e of events) byType[`${e.category}/${e.type}`] = (byType[`${e.category}/${e.type}`] ?? 0) + 1;
    const people = new Set(events.flatMap((e) => e.people ?? []));
    const devices = new Set(events.map((e) => e.device).filter(Boolean));
    const countries = new Set(events.map((e) => e.location?.country).filter(Boolean));
    const genericFiles = summary.files.filter((f) => f.parser === 'generic');

    console.log(
      JSON.stringify(
        {
          ms,
          files: summary.fileCount,
          json: summary.files.filter((f) => f.kind === 'json').length,
          errors: summary.files.filter((f) => f.error).map((f) => `${f.path}: ${f.error}`),
          warnings: summary.warnings,
          ownerFound: Boolean(collections.owner),
          accountCreated: collections.accountCreated ? new Date(collections.accountCreated).toISOString().slice(0, 10) : null,
          events: events.length,
          range: summary.dateRange && [new Date(summary.dateRange.start).toISOString(), new Date(summary.dateRange.end).toISOString()],
          byParser,
          byType,
          sentVsReceived: [byType['messages/message_sent'], byType['messages/message_received']],
          distinctPeople: people.size,
          devices: [...devices],
          countryCount: countries.size,
          advertisers: {
            total: collections.advertisers.length,
            uploaded: collections.advertisers.filter((a) => a.source === 'uploaded_list').length,
            activity: collections.advertisers.filter((a) => a.source === 'activity').length,
          },
          adInterests: collections.adInterests.length,
          adCategories: collections.adCategories.length,
          offMetaApps: collections.offMetaApps.length,
          offMetaEvents: collections.offMetaApps.reduce((s, a) => s + a.events, 0),
          facts: Object.fromEntries(
            ['profile', 'inference', 'device', 'location', 'security'].map((g) => [g, collections.facts.filter((f) => f.group === g).length]),
          ),
          lastLocation: Boolean(collections.lastLocation),
          genericFiles: genericFiles.length,
          genericWithEvents: genericFiles.filter((f) => (f.events ?? 0) > 0).length,
          unixEpochEvents: events.filter((e) => e.timestamp < Date.UTC(2000, 0, 1)).length,
          mojibakeLeft: events.filter((e) => /Ã|â€|ð\u009f/.test(`${e.title}${e.text ?? ''}`)).length,
        },
        null,
        1,
      ),
    );

    expect(summary.files.filter((f) => f.error)).toEqual([]);
    expect(events.length).toBeGreaterThan(0);
  });
});
