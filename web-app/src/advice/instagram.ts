import type { SettingState } from '../model/types';
import type { AdviceInput, FixStatus, PrivacyFix } from './types';

/**
 * The Instagram fix catalog: when each recommendation applies and whether it's already done.
 * Wording lives in i18n/instagramAdvice.ts (keyed by id). Menu paths were checked in October 2026
 * against Meta's June 2026 announcement and guides dated 2024–2026 (see that file). Instagram's
 * own help pages can't be read automatically, so re-check by hand before each release.
 *
 * Accounts Center is shared by Facebook and Instagram, so those steps match the Facebook catalog.
 */

const VERIFIED = '2026-10';
const setting = (i: AdviceInput, id: string): SettingState | undefined => i.collections.settings[id];
const bool = (i: AdviceInput, id: string): boolean | undefined => {
  const v = setting(i, id)?.value;
  return typeof v === 'boolean' ? v : undefined;
};
const ig = (i: AdviceInput) => i.insights.instagram;
const base = { platform: 'instagram' as const, verified: VERIFIED };

export const INSTAGRAM_FIXES: PrivacyFix[] = [
  {
    ...base,
    id: 'ig_two_factor',
    area: 'security',
    impact: 'high',
    effort: 'quick',
    evidence: (i) =>
      i.insights.security.recordedTimes || i.insights.security.devices.length
        ? { tab: 'security', vars: { devices: i.insights.security.devices.length, records: i.insights.security.recordedTimes } }
        : null,
    // Instagram downloads don't record whether two-factor is on.
    status: () => 'review',
  },
  {
    ...base,
    id: 'ig_sessions',
    area: 'security',
    impact: 'medium',
    effort: 'quick',
    evidence: (i) => (i.insights.security.devices.length ? { tab: 'security', vars: { devices: i.insights.security.devices.length } } : null),
    status: () => 'review',
  },
  {
    ...base,
    id: 'ig_private_account',
    area: 'visibility',
    impact: 'high',
    effort: 'quick',
    evidence: (i) => (setting(i, 'private_account') ? { tab: 'people', vars: { followers: ig(i).followers, posts: ig(i).posts, stories: ig(i).stories } } : null),
    status: (i): FixStatus => (bool(i, 'private_account') ? 'done' : 'needs_action'),
  },
  {
    ...base,
    id: 'ig_link_history',
    area: 'tracking',
    impact: 'high',
    effort: 'quick',
    evidence: (i) => (ig(i).links ? { tab: 'activity', vars: { links: ig(i).links, sites: ig(i).topSites.length, top: ig(i).topSites.slice(0, 3).map((s) => s.label) } } : null),
    status: () => 'needs_action',
  },
  {
    ...base,
    id: 'ig_other_businesses',
    area: 'tracking',
    impact: 'high',
    effort: 'quick',
    url: 'https://accountscenter.meta.com/info_and_permissions/activity_from_other_businesses/',
    evidence: (i) =>
      i.insights.ads.activity || setting(i, 'ad_optout_third_party')
        ? { tab: 'ads', vars: { businesses: i.insights.ads.activity, optedOut: bool(i, 'ad_optout_third_party') } }
        : null,
    // The download records the older ad-partners opt-out; the July 2026 setting replaced it, so it's worth a look either way.
    status: (i) => (bool(i, 'ad_optout_third_party') === false ? 'needs_action' : 'review'),
  },
  {
    ...base,
    id: 'ig_list_uploads',
    area: 'ads',
    impact: 'medium',
    effort: 'longer',
    evidence: (i) => (i.insights.ads.uploaded ? { tab: 'ads', vars: { uploaded: i.insights.ads.uploaded } } : null),
    status: () => 'review',
  },
  {
    ...base,
    id: 'ig_contact_upload',
    area: 'contacts',
    impact: 'medium',
    effort: 'quick',
    evidence: (i) => (setting(i, 'contact_upload') ? { tab: 'profile', vars: { syncing: bool(i, 'contact_upload') } } : null),
    status: (i) => (bool(i, 'contact_upload') ? 'needs_action' : 'done'),
  },
  {
    ...base,
    id: 'ig_location',
    area: 'location',
    impact: 'medium',
    effort: 'quick',
    evidence: (i) =>
      i.collections.lastLocation || ig(i).postsWithPlace
        ? { tab: 'security', vars: { last: !!i.collections.lastLocation, withPlace: ig(i).postsWithPlace } }
        : null,
    status: () => 'review',
  },
  {
    ...base,
    id: 'ig_post_details',
    area: 'location',
    impact: 'low',
    effort: 'quick',
    evidence: (i) =>
      ig(i).postsWithPlace || ig(i).postDevices.length ? { tab: 'media', vars: { withPlace: ig(i).postsWithPlace, devices: ig(i).postDevices.length } } : null,
    status: () => 'review',
  },
  {
    ...base,
    id: 'ig_recently_deleted',
    area: 'history',
    impact: 'low',
    effort: 'quick',
    evidence: (i) => (ig(i).deleted ? { tab: 'timeline', vars: { deleted: ig(i).deleted } } : null),
    status: () => 'needs_action',
  },
  {
    ...base,
    id: 'ig_search_history',
    area: 'history',
    impact: 'low',
    effort: 'quick',
    evidence: (i) => (i.insights.activity.searches ? { tab: 'activity', vars: { searches: i.insights.activity.searches } } : null),
    status: () => 'review',
  },
  {
    ...base,
    id: 'ig_ad_topics',
    area: 'ads',
    impact: 'low',
    effort: 'quick',
    evidence: (i) => (i.insights.ads.categories.length ? { tab: 'ads', vars: { categories: i.insights.ads.categories.length } } : null),
    status: () => 'review',
  },
  {
    ...base,
    id: 'ig_lead_forms',
    area: 'ads',
    impact: 'low',
    effort: 'longer',
    evidence: (i) => (ig(i).leadForms ? { tab: 'ads', vars: { answers: ig(i).leadForms } } : null),
    status: () => 'review',
  },
  {
    ...base,
    id: 'ig_browser_signal',
    area: 'tracking',
    impact: 'low',
    effort: 'quick',
    evidence: (i) => (setting(i, 'gpc') ? { tab: 'ads', vars: {} } : null),
    status: (i) => (bool(i, 'gpc') ? 'done' : 'review'),
  },
];
