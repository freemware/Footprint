import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setActivePlatform } from './platform';
import { TABS, report } from './report';
import { planCopy } from './advice';
import { strings } from './strings';
import { igReport } from './instagram';
import { IG_FIX_COPY } from './instagramAdvice';

/**
 * With an Instagram download on screen, no Facebook-only wording may show: every string the
 * Instagram screens use is collected (calling wording functions with sample values) and checked.
 */
const FORBIDDEN = /\bFacebook\b|Marketplace|friends list|friend request|Messenger|(?<!Close )\bfriends\b/i;
/** Places where naming Facebook is the point. */
const ALLOWED = new Set([
  'IG_FIX_COPY.ig_link_history.limits',
  // Shown before any download is loaded, so it names both platforms.
  'strings.empty.importHint',
  // A Facebook file name; Instagram downloads never contain it.
  'report.profile.guessTitles.how_active_we_think_you_are_on_marketplace',
]);
const SAMPLE_VARS = { links: 3, sites: 2, top: ['example.com'], businesses: 4, optedOut: true, uploaded: 2, records: 5, devices: 2, followers: 9, posts: 3, stories: 1, last: true, withPlace: 1, deleted: 2, searches: 4, categories: 3, answers: 1, syncing: true };

function strings_(v: unknown, path: string, out: [string, string][], depth = 0) {
  if (depth > 6) return;
  if (typeof v === 'string') out.push([path, v]);
  else if (typeof v === 'function') {
    for (const args of [[3, 2], [1, 1], [SAMPLE_VARS, 'needs_action'], [SAMPLE_VARS, 'done'], [SAMPLE_VARS, 'review']]) {
      try {
        strings_((v as (...a: unknown[]) => unknown)(...args), path, out, depth + 1);
      } catch {
        /* a wording function that needs other arguments is covered by another call */
      }
    }
  } else if (Array.isArray(v)) v.forEach((x, i) => strings_(x, `${path}[${i}]`, out, depth + 1));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) strings_((v as Record<string, unknown>)[k], `${path}.${k}`, out, depth + 1);
}

describe('Instagram wording', () => {
  beforeAll(() => setActivePlatform('instagram'));
  afterAll(() => setActivePlatform('facebook'));

  it('shared screens and Instagram screens never show Facebook-only wording', () => {
    const out: [string, string][] = [];
    strings_(TABS, 'TABS', out);
    for (const k of ['profile', 'media', 'raw', 'timeline', 'common'] as const) strings_(report[k], `report.${k}`, out);
    strings_({ yearsTitle: report.overview.yearsTitle, yearsNote: report.overview.yearsNote }, 'report.overview', out);
    for (const k of ['lead', 'uploadedTitle', 'uploadedText', 'activityTitle', 'activityText', 'both', 'searchList', 'filterAll', 'filterUploaded', 'filterActivity', 'showing', 'showMore'] as const)
      strings_(report.ads[k], `report.ads.${k}`, out);
    strings_(planCopy, 'planCopy', out);
    strings_({ groups: strings.groups, raw: strings.raw, empty: strings.empty }, 'strings', out);
    strings_(igReport, 'igReport', out);
    strings_(IG_FIX_COPY, 'IG_FIX_COPY', out);
    expect(out.length).toBeGreaterThan(150);
    const bad = out.filter(([path, s]) => FORBIDDEN.test(s) && !ALLOWED.has(path)).map(([p, s]) => `${p}: ${s}`);
    expect(bad).toEqual([]);
  });

  it('wording kept from start-up (before a download was loaded) still follows the platform', () => {
    setActivePlatform('facebook');
    const R = report.profile;
    const C = planCopy.labels;
    setActivePlatform('instagram');
    expect(R.inferredBadge).toBe('Inferred by Instagram');
    expect(R.guessTitles.profile_based_in).toBe('Where your profile is based');
    expect(C.open).toBe('Open this setting');
    setActivePlatform('facebook');
    expect(R.inferredBadge).toBe('Inferred by Facebook');
    expect(C.open).toBe('Open this setting on Facebook');
    setActivePlatform('instagram');
  });

  it('switches back to Facebook wording', () => {
    setActivePlatform('facebook');
    expect(TABS.overview.title).toContain('Facebook');
    expect(report.profile.inferredBadge).toBe('Inferred by Facebook');
    setActivePlatform('instagram');
    expect(TABS.overview.title).toContain('Instagram');
    expect(report.profile.inferredBadge).toBe('Inferred by Instagram');
  });
});
