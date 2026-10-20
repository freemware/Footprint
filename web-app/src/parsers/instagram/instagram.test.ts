import { describe, expect, it } from 'vitest';
import { buildDataset, type SourceFile } from '../../importer/pipeline';
import { deepFixText } from '../../importer/text';
import { buildInsights } from '../../insights/insights';
import { buildPlan, fixesFor } from '../../advice/plan';
import { buildSyntheticInstagram, IG_DEMO_OWNER } from '../../demo/syntheticInstagram';
import { buildSyntheticExport } from '../../demo/syntheticExport';
import { detectPlatform } from '../../importer/platform';

/** The invented download, read the way the importer reads files (text fixed on load). */
const toFiles = (demo: ReturnType<typeof buildSyntheticInstagram>): SourceFile[] =>
  demo.map((d) => ({ path: d.path, size: 100, json: d.json === undefined ? undefined : deepFixText(JSON.parse(JSON.stringify(d.json))) }));

const { events, collections, summary } = buildDataset(toFiles(buildSyntheticInstagram()), 'instagram-robin-2026-10-14-demo.zip');
const insights = buildInsights(events, collections, summary);
const ofType = (t: string) => events.filter((e) => e.type === t);

describe('Instagram import', () => {
  it('is recognised as Instagram, and the Facebook demo as Facebook', () => {
    expect(summary.platform).toBe('instagram');
    expect(detectPlatform(buildSyntheticExport().map((f) => f.path))).toBe('facebook');
  });

  it('reads every file without errors, and nothing falls back to the generic parser', () => {
    expect(summary.files.filter((f) => f.error)).toEqual([]);
    const generic = summary.files.filter((f) => f.kind === 'json' && (!f.parser || f.parser === 'generic')).map((f) => f.path);
    expect(generic).toEqual([]);
  });

  it('finds the owner, the sign-up date and the last known location', () => {
    expect(collections.owner).toBe(IG_DEMO_OWNER);
    expect(new Date(collections.accountCreated!).getUTCFullYear()).toBe(2015);
    expect(collections.lastLocation).toMatchObject({ lat: 0.5, lng: -30.5 });
  });

  it('sorts advertisers into their two lists', () => {
    expect(insights.ads.uploaded).toBe(2);
    expect(insights.ads.activity).toBe(3);
    expect(insights.ads.both).toBe(1);
    expect(insights.ads.categories).toContain('Café lovers');
  });

  it('records what you watched, by account', () => {
    expect(insights.instagram.watched).toMatchObject({ stories: 4, videos: 2, posts: 1, threads: 1, total: 8 });
    expect(insights.instagram.topWatched[0]).toMatchObject({ key: 'mira.okafor', count: 3 });
  });

  it('keeps websites opened in the app, grouped by site', () => {
    expect(insights.instagram.links).toBe(3);
    expect(insights.instagram.topSites[0]).toMatchObject({ key: 'example.com', count: 2 });
  });

  it('merges posts listed twice into one, keeping media, place and device', () => {
    const posts = ofType('post');
    expect(posts).toHaveLength(2);
    expect(posts[0]!.mediaUris).toEqual(['media/posts/20260601/post0.jpg']);
    expect(insights.instagram.postsWithPlace).toBe(1);
    expect(insights.instagram.postDevices).toEqual(['Demo Phone 12']);
    expect(posts[0]!.text).toBe('Beach day 0 🌊');
  });

  it('merges a privacy change recorded in two files, keeping its own wording', () => {
    const p = ofType('privacy_changed');
    expect(p).toHaveLength(1);
    expect(p[0]!.title).toBe('Switched to Public');
  });

  it('counts followers, following and who follows back', () => {
    expect(insights.instagram).toMatchObject({ followers: 4, following: 5, mutual: 2, closeFriends: 1, unfollowed: 1 });
  });

  it('reads likes, comments, saves, searches and messages', () => {
    expect(insights.instagram.likes).toBe(7);
    expect(ofType('comment')[0]!.text).toBe('Looks wonderful — café de luxe!');
    expect(insights.instagram.saved).toBe(1);
    expect(insights.activity.searches).toBe(3);
    expect(insights.activity.topSearches[0]).toMatchObject({ key: 'trail running', count: 2 });
    expect(insights.people.sent).toBe(1);
    expect(insights.people.received).toBe(1);
    expect(insights.people.threads).toBe(1);
    expect(insights.instagram.aiChats).toBe(1);
  });

  it('keeps logins with their address and device', () => {
    const logins = ofType('login');
    expect(logins).toHaveLength(1);
    expect(logins[0]!.location?.ip).toBe('203.0.113.7');
    expect(logins[0]!.device).toBeTruthy();
  });

  it('never puts an advertiser-form answer in a title', () => {
    const forms = ofType('lead_form');
    expect(forms).toHaveLength(1);
    expect(forms[0]!.title).not.toContain('robin@example.com');
  });

  it('reads the settings the plan needs', () => {
    expect(collections.settings.private_account?.value).toBe(false);
    expect(collections.settings.contact_upload?.value).toBe(true);
    expect(collections.settings.gpc?.value).toBe(true);
    expect(collections.settings.ad_optout_third_party?.value).toBe(false);
  });
});

describe('Instagram privacy plan', () => {
  const plan = buildPlan({ insights, collections }, fixesFor('instagram'));
  const status = (id: string) => plan.all.find((p) => p.fix.id === id)?.status;

  it('uses only Instagram fixes', () => {
    expect(plan.all.length).toBeGreaterThan(5);
    expect(plan.all.every((p) => p.fix.platform === 'instagram')).toBe(true);
  });

  it('marks settings from the download', () => {
    expect(status('ig_private_account')).toBe('needs_action');
    expect(status('ig_contact_upload')).toBe('needs_action');
    expect(status('ig_browser_signal')).toBe('done');
    expect(status('ig_other_businesses')).toBe('needs_action');
    expect(status('ig_link_history')).toBe('needs_action');
    expect(status('ig_recently_deleted')).toBe('needs_action');
  });

  it('every fix has a verified month', () => {
    expect(fixesFor('instagram').every((f) => /^\d{4}-\d{2}$/.test(f.verified))).toBe(true);
  });
});
