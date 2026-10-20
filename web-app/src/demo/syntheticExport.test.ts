import { describe, expect, it } from 'vitest';
import { buildDataset, type SourceFile } from '../importer/pipeline';
import { deepFixText } from '../importer/text';
import { buildInsights } from '../insights/insights';
import { buildPlan } from '../advice/plan';
import { FACEBOOK_FIXES } from '../advice/facebook';
import { FIX_COPY } from '../i18n/advice';
import { buildSyntheticExport, DEMO_OWNER } from './syntheticExport';

/** Same steps as the import worker: JSON text → parse → fix encoding → parsers. */
function load() {
  const files: SourceFile[] = buildSyntheticExport().map((f) =>
    f.json !== undefined
      ? { path: f.path, size: 1000, json: deepFixText(JSON.parse(JSON.stringify(f.json))) }
      : { path: f.path, size: 50_000 },
  );
  const d = buildDataset(files, 'demo');
  return { d, i: buildInsights(d.events, d.collections, d.summary) };
}

describe('synthetic demo export', () => {
  const { d, i } = load();

  it('is deterministic', () => {
    expect(JSON.stringify(buildSyntheticExport().slice(0, 5))).toBe(JSON.stringify(buildSyntheticExport().slice(0, 5)));
  });

  it('imports cleanly and fills every tab', () => {
    expect(d.summary.files.filter((f) => f.error)).toEqual([]);
    expect(d.summary.warnings).toEqual([]);
    expect(d.collections.owner).toBe(DEMO_OWNER);
    // Overview / ads
    expect(i.ads.uploaded).toBeGreaterThan(100);
    expect(i.ads.activity).toBeGreaterThan(500);
    expect(i.ads.offMetaApps.length).toBeGreaterThan(5);
    expect(i.ads.seen).toBeGreaterThan(0);
    expect(i.ads.interests.length).toBeGreaterThan(20);
    // About you
    expect(i.profile.about.length).toBeGreaterThan(3);
    expect(i.profile.guesses.length).toBeGreaterThan(0);
    expect(i.profile.hardware.gpus.length).toBeGreaterThan(0);
    expect(i.profile.lastLocation).toBeDefined();
    // Logins & devices
    expect(i.security.places.length).toBeGreaterThan(4);
    expect(i.security.countries.length).toBeGreaterThan(2);
    expect(i.security.devices.length).toBeGreaterThan(2);
    expect(i.security.sessions.length).toBeGreaterThan(0);
    // Activity
    expect(i.activity.searches).toBeGreaterThan(100);
    expect(i.activity.profileVisits).toBeGreaterThan(0);
    expect(i.activity.itemsViewed).toBeGreaterThan(0);
    expect(i.activity.busiest).toBeDefined();
    // People
    expect(i.people.friends).toBe(150);
    expect(i.people.sent).toBeGreaterThan(100);
    expect(i.people.received).toBeGreaterThan(100);
    expect(i.people.boxes.length).toBeGreaterThan(3);
    expect(i.people.top.length).toBeGreaterThan(5);
    // Photos & videos
    expect(i.media.photos).toBeGreaterThan(20);
    expect(i.media.videos).toBe(3);
    expect(i.media.inMessages).toBeGreaterThan(0);
    expect(i.media.withIp).toBeGreaterThan(10);
    expect(i.media.items.every((m) => m.timestamp)).toBe(true);
  });

  it('decodes the Facebook text encoding', () => {
    const names = new Set(d.events.flatMap((e) => e.people ?? []));
    expect([...names].some((n) => /[éøëí]/.test(n))).toBe(true);
    expect([...names].some((n) => n.includes('Ã'))).toBe(false);
  });

  it('records settings and produces a plan with every kind of item', () => {
    const s = d.collections.settings;
    expect(s.two_factor?.value).toBe(false);
    expect(s.lookup_email_phone?.value).toBe('public');
    expect(s.contact_upload?.value).toBe(true);
    expect(d.collections.jurisdiction).toBe('US_OR');
    const plan = buildPlan({ insights: i, collections: d.collections });
    expect(plan.todo.map((p) => p.fix.id)).toEqual(expect.arrayContaining(['two_factor', 'other_businesses', 'lookup', 'public_details', 'contact_upload', 'location', 'connected_apps']));
    expect(plan.review.length).toBeGreaterThan(2);
    expect(plan.done.map((p) => p.fix.id)).toEqual(expect.arrayContaining(['login_alerts', 'future_posts', 'friends_list', 'ads_off_meta']));
    // Every fix has wording, and every finding renders to a sentence.
    for (const f of FACEBOOK_FIXES) expect(FIX_COPY[f.id], f.id).toBeDefined();
    for (const p of plan.all) expect(FIX_COPY[p.fix.id]!.finding(p.evidence.vars, p.status).length, p.fix.id).toBeGreaterThan(10);
  });
});
