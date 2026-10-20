/**
 * Prints the shape of the insights computed from a real export: counts and lengths only,
 * never names or content. Skipped unless FB_EXPORT is set.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDataset, fileKind, type SourceFile } from '../src/importer/pipeline';
import { deepFixText } from '../src/importer/text';
import { buildInsights } from '../src/insights/insights';

const ROOT = process.env.FB_EXPORT;
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

describe.skipIf(!ROOT)('insights on a real export', () => {
  it('computes without errors', () => {
    const files: SourceFile[] = walk(ROOT!).map((p) => {
      const path = relative(ROOT!, p).split('\\').join('/');
      const size = statSync(p).size;
      return fileKind(path) === 'json' ? { path, size, json: deepFixText(JSON.parse(readFileSync(p, 'utf8'))) } : { path, size };
    });
    const d = buildDataset(files);
    const t0 = Date.now();
    const i = buildInsights(d.events, d.collections, d.summary);
    const n = (x: { length: number }) => x.length;
    console.log(JSON.stringify({
      ms: Date.now() - t0,
      years: i.years.toFixed(1),
      byTypeTop: i.byType.slice(0, 12).map((r) => [r.key, r.count]),
      byYear: i.byYear.years,
      ads: { ...i.ads, names: n(i.ads.names), interests: n(i.ads.interests), categories: n(i.ads.categories), topSeen: n(i.ads.topSeen), offMetaApps: n(i.ads.offMetaApps), offMetaByCode: i.ads.offMetaByCode.map((r) => [r.key, r.count]) },
      security: { logins: i.security.logins, places: n(i.security.places), countries: n(i.security.countries), devices: i.security.devices.map((r) => [r.key, r.count]), sessions: n(i.security.sessions), passwordEvents: i.security.passwordEvents, recorded: i.security.recordedTimes, months: n(i.security.byMonth.months), facts: n(i.security.facts), factLabels: [...new Set(i.security.facts.map((f) => f.label))].slice(0, 25) },
      activity: { busiest: i.activity.busiest, searches: i.activity.searches, topSearches: n(i.activity.topSearches), visits: i.activity.profileVisits, items: i.activity.itemsViewed, months: n(i.activity.byMonth.months) },
      people: { ...i.people, top: n(i.people.top), topShape: i.people.top.slice(0, 3).map((p) => [p.messages, p.reactions, p.comments]), boxes: i.people.boxes.map((b) => [b.key, b.count, b.sub]) },
      media: { photos: i.media.photos, videos: i.media.videos, inMessages: i.media.inMessages, withIp: i.media.withIp, dated: i.media.items.filter((m) => m.timestamp).length, withContext: i.media.items.filter((m) => m.context).length, albums: new Set(i.media.items.map((m) => m.album).filter(Boolean)).size, taken: i.media.items.filter((m) => m.taken).length, sources: i.media.items.reduce((a: Record<string, number>, m) => ((a[m.source] = (a[m.source] ?? 0) + 1), a), {}) },
      profile: { about: i.profile.about.map((f) => f.label), guesses: i.profile.guesses.map((g) => [g.source.split('/').pop(), g.facts.length, [...new Set(g.facts.map((f) => f.label))].slice(0, 6)]), deviceFacts: n(i.profile.deviceFacts), hardware: { gpus: n(i.profile.hardware.gpus), ram: n(i.profile.hardware.ram), cores: n(i.profile.hardware.cores) }, locationFacts: i.profile.locationFacts.map((f) => f.label), lastLocation: Boolean(i.profile.lastLocation) },
    }, null, 1));
    expect(i.totalEvents).toBe(d.events.length);
  });
});
