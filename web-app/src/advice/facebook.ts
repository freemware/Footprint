import type { Audience, SettingState } from '../model/types';
import { currentApps } from '../parsers/settings';
import type { AdviceInput, FixStatus, PrivacyFix } from './types';

/**
 * The Facebook fix catalog: when each recommendation applies and whether it's already done.
 * Wording lives in i18n/advice.ts (keyed by id). Menu paths there were checked in the month
 * given by `verified`; re-check them before each release (Meta moves settings often).
 */

const VERIFIED = '2026-10';

const setting = (i: AdviceInput, id: string): SettingState | undefined => i.collections.settings[id];
const bool = (i: AdviceInput, id: string): boolean | undefined => {
  const v = setting(i, id)?.value;
  return typeof v === 'boolean' ? v : undefined;
};
const audience = (i: AdviceInput, id: string): Audience | undefined => {
  const v = setting(i, id)?.value;
  return typeof v === 'string' && ['public', 'friends_of_friends', 'friends', 'only_me', 'custom', 'unknown'].includes(v) ? (v as Audience) : undefined;
};
const wide = (a: Audience | undefined) => a === 'public' || a === 'friends_of_friends';
const fromBool = (open: boolean | undefined, ifUnknown: FixStatus = 'review'): FixStatus =>
  open === undefined ? ifUnknown : open ? 'needs_action' : 'done';

/** Evenly spaced picks from a sorted list, so examples aren't all from the top of the alphabet. */
const spread = (items: string[], k: number) => (items.length <= k ? items : Array.from({ length: k }, (_, j) => items[Math.floor((j * items.length) / k)]!));

/** Profile details shown to everyone, by their label in the export. */
export function publicDetails(i: AdviceInput): string[] {
  return Object.values(i.collections.settings)
    .filter((s) => (s.id.startsWith('field:') || s.id === 'birthday' || s.id === 'birth_year') && s.value === 'public')
    .map((s) => s.label);
}

export const FACEBOOK_FIXES: PrivacyFix[] = [
  {
    id: 'two_factor',
    platform: 'facebook',
    area: 'security',
    impact: 'high',
    effort: 'quick',
    url: 'https://accountscenter.facebook.com/password_and_security',
    verified: VERIFIED,
    evidence: (i) => ({
      tab: 'security',
      vars: { places: i.insights.security.places.length, devices: i.insights.security.devices.length, countries: i.insights.security.countries.length, state: setting(i, 'two_factor')?.raw },
    }),
    status: (i) => {
      const on = bool(i, 'two_factor');
      return on === undefined ? 'review' : on ? 'done' : 'needs_action';
    },
  },
  {
    id: 'sessions',
    platform: 'facebook',
    area: 'security',
    impact: 'medium',
    effort: 'quick',
    url: 'https://accountscenter.facebook.com/password_and_security',
    verified: VERIFIED,
    evidence: (i) => {
      const sessions = i.insights.security.sessions.length;
      if (!sessions && i.insights.security.devices.length < 2) return null;
      return { tab: 'security', vars: { sessions, devices: i.insights.security.devices.length } };
    },
    status: () => 'review',
  },
  {
    id: 'login_alerts',
    platform: 'facebook',
    area: 'security',
    impact: 'medium',
    effort: 'quick',
    url: 'https://accountscenter.facebook.com/password_and_security',
    verified: VERIFIED,
    evidence: (i) => (setting(i, 'login_alerts') ? { tab: 'security', vars: {} } : null),
    status: (i) => {
      const on = bool(i, 'login_alerts');
      return on === undefined ? 'review' : on ? 'done' : 'needs_action';
    },
  },
  {
    id: 'other_businesses',
    platform: 'facebook',
    area: 'tracking',
    impact: 'high',
    effort: 'quick',
    url: 'https://accountscenter.meta.com/info_and_permissions/activity_from_other_businesses/',
    verified: VERIFIED,
    evidence: (i) => {
      const apps = i.insights.ads.offMetaApps.length;
      const businesses = i.insights.ads.activity;
      if (!apps && !businesses && !setting(i, 'off_meta_linked')) return null;
      return {
        tab: 'ads',
        vars: {
          apps,
          reports: i.insights.ads.offMetaEvents,
          businesses,
          adsUseOff: bool(i, 'ad_optout_partner_sites'),
          linked: bool(i, 'off_meta_linked'),
          topApps: i.insights.ads.offMetaApps.slice(0, 3).map((a) => a.label),
        },
      };
    },
    status: (i) => {
      const linked = bool(i, 'off_meta_linked');
      if (linked !== undefined) return linked ? 'needs_action' : 'done';
      const adsOff = bool(i, 'ad_optout_partner_sites');
      return adsOff === false ? 'needs_action' : 'review';
    },
  },
  {
    id: 'ads_off_meta',
    platform: 'facebook',
    area: 'ads',
    impact: 'medium',
    effort: 'quick',
    url: 'https://accountscenter.facebook.com/ad_preferences',
    verified: VERIFIED,
    evidence: (i) => (setting(i, 'ads_off_meta_optout') ? { tab: 'ads', vars: {} } : null),
    // The export records "opted out", so true means already done.
    status: (i) => {
      const optedOut = bool(i, 'ads_off_meta_optout');
      return fromBool(optedOut === undefined ? undefined : !optedOut);
    },
  },
  {
    id: 'list_uploads',
    platform: 'facebook',
    area: 'ads',
    impact: 'medium',
    effort: 'longer',
    url: 'https://accountscenter.facebook.com/ad_preferences',
    verified: VERIFIED,
    evidence: (i) => (i.insights.ads.uploaded ? { tab: 'ads', vars: { uploaded: i.insights.ads.uploaded, examples: spread(i.insights.ads.names.filter((n) => n.uploaded).map((n) => n.name), 3) } } : null),
    status: () => 'review',
  },
  {
    id: 'ad_profile_info',
    platform: 'facebook',
    area: 'ads',
    impact: 'low',
    effort: 'quick',
    url: 'https://accountscenter.facebook.com/ad_preferences',
    verified: VERIFIED,
    evidence: (i) => {
      const ids = ['ad_optout_relationship', 'ad_optout_employer', 'ad_optout_job_title', 'ad_optout_education', 'ad_optout_political', 'ad_optout_religious'];
      const known = ids.filter((id) => bool(i, id) !== undefined);
      if (!known.length) return null;
      return { tab: 'profile', vars: { open: known.filter((id) => bool(i, id) === false).length, known: known.length } };
    },
    status: (_i, e) => (Number(e.vars.open) > 0 ? 'needs_action' : 'done'),
  },
  {
    id: 'ad_topics',
    platform: 'facebook',
    area: 'ads',
    impact: 'low',
    effort: 'longer',
    url: 'https://accountscenter.facebook.com/ad_preferences',
    verified: VERIFIED,
    evidence: (i) =>
      i.insights.ads.interests.length || i.insights.ads.categories.length
        ? { tab: 'profile', vars: { interests: i.insights.ads.interests.length, categories: i.insights.ads.categories.length, interestsOff: bool(i, 'ad_optout_interests') } }
        : null,
    status: (i) => (bool(i, 'ad_optout_interests') ? 'done' : 'review'),
  },
  {
    id: 'lookup',
    platform: 'facebook',
    area: 'visibility',
    impact: 'high',
    effort: 'quick',
    url: 'https://www.facebook.com/settings',
    verified: VERIFIED,
    evidence: (i) => {
      const ids = ['lookup_email_phone', 'lookup_by_name', 'suggest_by_phone', 'suggest_by_email'];
      if (!ids.some((id) => audience(i, id))) return null;
      return {
        tab: 'profile',
        vars: {
          emailPhone: audience(i, 'lookup_email_phone'),
          byName: audience(i, 'lookup_by_name'),
          suggest: [audience(i, 'suggest_by_phone'), audience(i, 'suggest_by_email')].some(wide),
        },
      };
    },
    status: (i) =>
      wide(audience(i, 'lookup_email_phone')) || audience(i, 'lookup_by_name') === 'public' || wide(audience(i, 'suggest_by_phone')) || wide(audience(i, 'suggest_by_email'))
        ? 'needs_action'
        : 'done',
  },
  {
    id: 'public_details',
    platform: 'facebook',
    area: 'visibility',
    impact: 'medium',
    effort: 'longer',
    url: 'https://www.facebook.com/me',
    verified: VERIFIED,
    evidence: (i) => {
      const known = Object.keys(i.collections.settings).some((id) => id.startsWith('field:'));
      if (!known) return null;
      return { tab: 'profile', vars: { details: publicDetails(i) } };
    },
    status: (_i, e) => ((e.vars.details as string[]).length ? 'needs_action' : 'done'),
  },
  {
    id: 'future_posts',
    platform: 'facebook',
    area: 'visibility',
    impact: 'medium',
    effort: 'quick',
    url: 'https://www.facebook.com/settings',
    verified: VERIFIED,
    evidence: (i) => {
      const a = audience(i, 'future_posts');
      const posts = i.insights.byType.find((t) => t.key === 'post')?.count ?? 0;
      if (!a && !posts) return null;
      return { tab: 'activity', vars: { audience: a, posts } };
    },
    status: (i) => {
      const a = audience(i, 'future_posts');
      return a === undefined ? 'review' : wide(a) ? 'needs_action' : 'done';
    },
  },
  {
    id: 'friends_list',
    platform: 'facebook',
    area: 'visibility',
    impact: 'low',
    effort: 'quick',
    url: 'https://www.facebook.com/settings',
    verified: VERIFIED,
    evidence: (i) =>
      audience(i, 'friends_list') || audience(i, 'friend_requests')
        ? { tab: 'people', vars: { friends: i.insights.people.friends, list: audience(i, 'friends_list'), requests: audience(i, 'friend_requests') } }
        : null,
    status: (i) => (wide(audience(i, 'friends_list')) || audience(i, 'friend_requests') === 'public' ? 'needs_action' : 'done'),
  },
  {
    id: 'contact_upload',
    platform: 'facebook',
    area: 'contacts',
    impact: 'medium',
    effort: 'quick',
    verified: VERIFIED,
    evidence: (i) =>
      setting(i, 'contact_upload') || setting(i, 'contacts_permission')
        ? { tab: 'profile', vars: { syncing: bool(i, 'contact_upload'), permission: bool(i, 'contacts_permission') } }
        : null,
    status: (i) => {
      const on = bool(i, 'contact_upload');
      const perm = bool(i, 'contacts_permission');
      if (on === undefined && perm === undefined) return 'review';
      return on || perm ? 'needs_action' : 'done';
    },
  },
  {
    id: 'location',
    platform: 'facebook',
    area: 'location',
    impact: 'medium',
    effort: 'quick',
    verified: VERIFIED,
    evidence: (i) => {
      const services = bool(i, 'location_services');
      const guesses = i.insights.profile.locationFacts.length;
      const checkins = i.insights.byType.find((t) => t.key === 'check_in')?.count ?? 0;
      if (services === undefined && !i.collections.lastLocation && !guesses && !checkins) return null;
      return { tab: 'profile', vars: { services, last: !!i.collections.lastLocation, guesses, checkins, places: i.insights.security.places.length } };
    },
    status: (i) => fromBool(bool(i, 'location_services')),
  },
  {
    id: 'connected_apps',
    platform: 'facebook',
    area: 'apps',
    impact: 'medium',
    effort: 'quick',
    url: 'https://www.facebook.com/settings',
    verified: VERIFIED,
    evidence: (i) => {
      const apps = currentApps(i.collections.connectedApps).filter((a) => a.status !== 'removed');
      if (!apps.length) return null;
      return { tab: 'ads', vars: { active: apps.filter((a) => a.status === 'active').length, expired: apps.filter((a) => a.status === 'inactive').length, names: apps.slice(0, 4).map((a) => a.name) } };
    },
    status: (_i, e) => (Number(e.vars.active) > 0 ? 'needs_action' : 'review'),
  },
  {
    id: 'browser_signal',
    platform: 'facebook',
    area: 'tracking',
    impact: 'low',
    effort: 'quick',
    verified: VERIFIED,
    regions: ['US'],
    evidence: (i) => (setting(i, 'gpc') || setting(i, 'daa_optout') ? { tab: 'ads', vars: { gpc: bool(i, 'gpc'), daa: bool(i, 'daa_optout') } } : null),
    status: (i) => (bool(i, 'gpc') ? 'done' : 'review'),
  },
  {
    id: 'photo_metadata',
    platform: 'facebook',
    area: 'history',
    impact: 'low',
    effort: 'longer',
    verified: VERIFIED,
    evidence: (i) =>
      i.insights.media.withIp || i.insights.media.items.some((m) => m.taken)
        ? { tab: 'media', vars: { withIp: i.insights.media.withIp, taken: i.insights.media.items.filter((m) => m.taken).length, photos: i.insights.media.photos } }
        : null,
    status: () => 'review',
  },
  {
    id: 'search_history',
    platform: 'facebook',
    area: 'history',
    impact: 'low',
    effort: 'quick',
    verified: VERIFIED,
    evidence: (i) => (i.insights.activity.searches ? { tab: 'activity', vars: { searches: i.insights.activity.searches } } : null),
    status: () => 'review',
  },
  {
    id: 'old_posts',
    platform: 'facebook',
    area: 'history',
    impact: 'low',
    effort: 'longer',
    verified: VERIFIED,
    evidence: (i) => {
      const posts = i.insights.byType.find((t) => t.key === 'post')?.count ?? 0;
      return posts >= 20 ? { tab: 'timeline', vars: { posts, years: Math.round(i.insights.years) } } : null;
    },
    status: () => 'review',
  },
  {
    id: 'privacy_checkup',
    platform: 'facebook',
    area: 'visibility',
    impact: 'low',
    effort: 'quick',
    url: 'https://www.facebook.com/privacy/checkup',
    verified: VERIFIED,
    evidence: (i) => ({ vars: { runs: Number(setting(i, 'privacy_checkup')?.value ?? 0), last: setting(i, 'privacy_checkup')?.changedAt } }),
    status: (i) => {
      const last = setting(i, 'privacy_checkup')?.changedAt;
      // Counts as done when run within the last year of the export.
      const end = i.insights.range?.end ?? Date.now();
      return last && end - last < 365 * 864e5 ? 'done' : 'review';
    },
  },
];
