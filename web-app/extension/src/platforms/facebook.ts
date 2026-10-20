import { FIX_COPY } from '../../../src/i18n/advice';
import type { CheckDef, PlatformDef } from './types';
import { p } from './types';
import type { Locator, Step } from '../shared/types';

/**
 * Facebook recipes: where each setting lives and how to read and change it, by visible labels.
 *
 * Paths checked in October 2026 against Meta's Help Center wording and recent guides:
 *   Settings & privacy → Settings → Audience and visibility → Posts / How people find and contact you /
 *   Profile and tagging; Accounts Center → Password and security; Accounts Center → Your information
 *   and permissions → Your activity off Meta technologies; Activity log → Activity you're tagged in;
 *   Activity log → Manage activity → Move to trash (kept 30 days).
 * Labels are English for now. When Facebook renames something, update the patterns here.
 */

declare const __FB_ORIGIN__: string | undefined;
declare const __AC_ORIGIN__: string | undefined;
/** Overridden only by the test build, which points these at stand-in pages. */
export const FB = typeof __FB_ORIGIN__ === 'string' ? __FB_ORIGIN__ : 'https://www.facebook.com';
export const AC = typeof __AC_ORIGIN__ === 'string' ? __AC_ORIGIN__ : 'https://accountscenter.facebook.com';

const NAV = ['link', 'tab', 'button', 'menuitem'];
const section = (...names: string[]): Locator => ({ role: NAV, name: names });
const settingsSection = (...names: string[]): Step[] => [
  { op: 'goto', url: `${FB}/settings` },
  { op: 'click', loc: section(...names) },
];
/** After choosing an option, close or save if the page asks. */
const finish: Step[] = [
  { op: 'click', optional: true, loc: { role: 'button', name: p('^save( changes)?$', '^done$', '^confirm$', '^close$') } },
];
const toggleOff: Step[] = [
  { op: 'choose', optional: true, option: p('^no$', '^off$', "^don'?t allow", '^not allowed$'), timeout: 1500 },
];

const copy = (id: string) => FIX_COPY[id];
const wide = (v: string | boolean) => v === 'public' || v === 'friends_of_friends';

const POSTS = settingsSection('^Posts$');
const FIND = settingsSection('^How people (can )?find and contact you$');
const TAGGING = settingsSection('^Profile and tagging$');
const SECURITY = (item: string): Step[] => [
  { op: 'goto', url: `${AC}/password_and_security` },
  { op: 'click', loc: section(item) },
];
const OFF_META: Step[] = [
  { op: 'goto', url: `${AC}/info_and_permissions` },
  { op: 'click', loc: section('^Your activity off Meta technologies$', '^Activity from other businesses$') },
  { op: 'click', loc: section('^Manage future activity$') },
];
const AD_PARTNERS: Step[] = [
  { op: 'goto', url: `${AC}/ad_preferences` },
  { op: 'click', optional: true, loc: section('^Ad settings$', '^Manage info$') },
  { op: 'click', loc: section('^Activity information from ad partners$') },
  { op: 'click', optional: true, loc: section('^Review setting$') },
];

const SETTINGS_URL = `${FB}/settings`;
/** Most specific first: the setting's own sentence, then the page heading as a last resort. */
const AD_PARTNER_QUESTION = p('(use|using|based on) (this |the )?activity( information)? from (ad )?partners', 'more personali[sz]ed', '^activity information from ad partners$');

export const FACEBOOK_CHECKS: CheckDef[] = [
  {
    id: 'two_factor',
    title: 'Two-factor authentication',
    area: 'security',
    impact: 'high',
    why: copy('two_factor')?.why ?? '',
    limits: copy('two_factor')?.limits ?? '',
    manual: ['Open Accounts Center → Password and security → Two-factor authentication.', 'Pick your Facebook account and choose an authentication app or text message.', 'Save the recovery codes somewhere safe.'],
    url: `${AC}/password_and_security`,
    open: SECURITY('^Two-factor authentication$'),
    read: { question: p('^Two-factor authentication$', 'two-factor authentication is'), vocab: 'onoff' },
    risky: (v) => v === false,
    // No automatic fix: turning it on needs your phone, so you stay in charge of this one.
  },
  {
    id: 'login_alerts',
    title: 'Login alerts',
    area: 'security',
    impact: 'medium',
    why: copy('login_alerts')?.why ?? '',
    limits: copy('login_alerts')?.limits ?? '',
    manual: ['Open Accounts Center → Password and security → Login alerts.', 'Turn on alerts by notification and by email.'],
    url: `${AC}/password_and_security`,
    open: SECURITY('^Login alerts$'),
    read: { question: p('^(in-app )?notifications?$', '^Facebook notifications$'), vocab: 'onoff' },
    risky: (v) => v === false,
    fix: { to: 'On', expect: true, steps: [{ op: 'openSetting', question: p('^(in-app )?notifications?$', '^Facebook notifications$') }, ...finish] },
  },
  {
    id: 'future_posts',
    title: 'Who can see your future posts',
    area: 'visibility',
    impact: 'high',
    why: copy('future_posts')?.why ?? '',
    limits: copy('future_posts')?.limits ?? '',
    manual: ['Open Settings → Audience and visibility → Posts.', 'Next to “Who can see your future posts?”, choose Friends.'],
    url: SETTINGS_URL,
    open: POSTS,
    read: { question: p('who can see your future posts'), vocab: 'audience' },
    risky: wide,
    fix: { to: 'Friends', expect: 'friends', steps: [{ op: 'openSetting', question: p('who can see your future posts') }, { op: 'choose', option: p('^friends$') }, ...finish] },
  },
  {
    id: 'lookup_phone',
    title: 'Who can find you with your phone number',
    area: 'visibility',
    impact: 'high',
    why: copy('lookup')?.why ?? '',
    limits: copy('lookup')?.limits ?? '',
    manual: ['Open Settings → Audience and visibility → How people find and contact you.', 'Next to “Who can look you up using the phone number you provided?”, choose Only me.'],
    url: SETTINGS_URL,
    open: FIND,
    read: { question: p('look you up using the phone number', 'look you up.*phone'), vocab: 'audience' },
    risky: wide,
    fix: { to: 'Only me', expect: 'only_me', steps: [{ op: 'openSetting', question: p('look you up using the phone number', 'look you up.*phone') }, { op: 'choose', option: p('^only me$') }, ...finish] },
  },
  {
    id: 'lookup_email',
    title: 'Who can find you with your email address',
    area: 'visibility',
    impact: 'high',
    why: copy('lookup')?.why ?? '',
    limits: copy('lookup')?.limits ?? '',
    manual: ['Open Settings → Audience and visibility → How people find and contact you.', 'Next to “Who can look you up using the email address you provided?”, choose Friends.'],
    url: SETTINGS_URL,
    open: FIND,
    read: { question: p('look you up using the email address', 'look you up.*email'), vocab: 'audience' },
    risky: wide,
    fix: { to: 'Friends', expect: 'friends', steps: [{ op: 'openSetting', question: p('look you up using the email address', 'look you up.*email') }, { op: 'choose', option: p('^friends$') }, ...finish] },
  },
  {
    id: 'friends_list',
    title: 'Who can see your friends list',
    area: 'visibility',
    impact: 'medium',
    why: copy('friends_list')?.why ?? '',
    limits: copy('friends_list')?.limits ?? '',
    manual: ['Open Settings → Audience and visibility → How people find and contact you.', 'Next to “Who can see your friends list?”, choose Only me or Friends.'],
    url: SETTINGS_URL,
    open: FIND,
    read: { question: p('who can see your friends list'), vocab: 'audience' },
    risky: wide,
    fix: { to: 'Only me', expect: 'only_me', steps: [{ op: 'openSetting', question: p('who can see your friends list') }, { op: 'choose', option: p('^only me$') }, ...finish] },
  },
  {
    id: 'search_engines',
    title: 'Search engines linking to your profile',
    area: 'visibility',
    impact: 'medium',
    why: 'When this is on, Google and other search engines can show your Facebook profile to anyone who searches your name.',
    limits: 'Search engines can take a while to drop your profile, and copies they already saved may remain for a time.',
    manual: ['Open Settings → Audience and visibility → How people find and contact you.', 'Turn off “Do you want search engines outside of Facebook to link to your profile?”.'],
    url: SETTINGS_URL,
    open: FIND,
    read: { question: p('search engines outside of facebook', 'search engines'), vocab: 'onoff' },
    risky: (v) => v === true,
    fix: { to: 'Off', expect: false, steps: [{ op: 'openSetting', question: p('search engines outside of facebook', 'search engines') }, ...toggleOff, ...finish] },
  },
  {
    id: 'friend_requests',
    title: 'Who can send you friend requests',
    area: 'visibility',
    impact: 'low',
    why: 'Fake accounts send friend requests to strangers to get into their friends lists.',
    limits: 'Friends of your friends can still send requests.',
    manual: ['Open Settings → Audience and visibility → How people find and contact you.', 'Next to “Who can send you friend requests?”, choose Friends of friends.'],
    url: SETTINGS_URL,
    open: FIND,
    read: { question: p('who can send you friend requests'), vocab: 'audience' },
    risky: (v) => v === 'public',
    fix: { to: 'Friends of friends', expect: 'friends_of_friends', steps: [{ op: 'openSetting', question: p('who can send you friend requests') }, { op: 'choose', option: p('^friends of friends$') }, ...finish] },
  },
  {
    id: 'tag_review',
    title: 'Review posts you’re tagged in',
    area: 'tagging',
    impact: 'medium',
    why: 'With review on, nothing you’re tagged in appears on your profile until you approve it.',
    limits: 'Posts you’re tagged in still exist on the other person’s profile; review only controls your profile.',
    manual: ['Open Settings → Audience and visibility → Profile and tagging.', 'Turn on “Review posts you’re tagged in before the post appears on your profile?”.'],
    url: SETTINGS_URL,
    open: TAGGING,
    read: { question: p("review posts you('|’)?re tagged in"), vocab: 'onoff' },
    risky: (v) => v === false,
    fix: { to: 'On', expect: true, steps: [{ op: 'openSetting', question: p("review posts you('|’)?re tagged in") }, { op: 'choose', optional: true, option: p('^on$', '^enabled$', '^yes$'), timeout: 1500 }, ...finish] },
  },
  {
    id: 'other_businesses',
    title: 'Activity from other businesses',
    area: 'tracking',
    impact: 'high',
    why: copy('other_businesses')?.why ?? '',
    limits: copy('other_businesses')?.limits ?? '',
    manual: ['Open Accounts Center → Your information and permissions → Your activity off Meta technologies.', 'Choose Manage future activity → Disconnect future activity.'],
    url: `${AC}/info_and_permissions`,
    open: OFF_META,
    read: { question: p('^disconnect future activity'), vocab: 'onoff' },
    display: (v) => (v ? 'Disconnected' : 'Connected'),
    risky: (v) => v === false,
    fix: {
      to: 'Disconnected',
      expect: true,
      steps: [
        { op: 'choose', option: p('^disconnect future activity') },
        { op: 'click', optional: true, loc: { role: 'button', name: p('^continue$', '^disconnect$', '^confirm$') } },
        { op: 'click', optional: true, loc: { role: 'button', name: p('^disconnect$', '^confirm$', '^done$') } },
      ],
    },
  },
  {
    id: 'ad_partners',
    title: 'Ads based on activity from ad partners',
    area: 'ads',
    impact: 'medium',
    why: 'Advertisers share what you did on their sites and apps so Facebook can pick ads for you.',
    limits: 'Changes how ads are picked for you. Advertisers can still share the activity with Meta.',
    manual: ['Open Accounts Center → Ad preferences → Ad settings → Activity information from ad partners.', 'Choose not to use this activity for ads.'],
    url: `${AC}/ad_preferences`,
    open: AD_PARTNERS,
    read: { question: AD_PARTNER_QUESTION, vocab: 'onoff' },
    display: (v) => (v ? 'Used for ads' : 'Not used'),
    risky: (v) => v === true,
    fix: {
      to: 'Not used',
      expect: false,
      steps: [
        { op: 'openSetting', question: AD_PARTNER_QUESTION },
        { op: 'choose', optional: true, option: p("^no\\b", "^don'?t use", '^off$', '^not allowed$'), timeout: 2000 },
        ...finish,
      ],
    },
  },
];

const activityLog = (...category: string[]): Step[] => [
  { op: 'goto', url: `${FB}/me/allactivity` },
  { op: 'click', optional: true, loc: section("^Activity you('|’)?re tagged in$") },
  { op: 'click', loc: section(...category) },
];

export const FACEBOOK: PlatformDef = {
  id: 'facebook',
  name: 'Facebook',
  status: 'available',
  mark: 'f',
  hosts: ['https://www.facebook.com/*', 'https://web.facebook.com/*', 'https://accountscenter.facebook.com/*', 'https://accountscenter.meta.com/*'],
  home: `${FB}/`,
  checks: FACEBOOK_CHECKS,
  tags: {
    sources: [
      { id: 'tagged_posts', label: 'Posts you’re tagged in', open: activityLog("^Posts you('|’)?re tagged in$") },
      { id: 'tagged_photos', label: 'Photos and videos you’re tagged in', open: activityLog("^Photos( and videos)? you('|’)?re tagged in$") },
    ],
    action: { role: 'button', name: p('^remove tags?$', '^untag$') },
    confirm: { role: 'button', name: p('^remove( tags?)?$', '^confirm$', '^ok$'), within: { role: ['dialog', 'alertdialog'] } },
    batch: 25,
    maxPerRun: 100,
  },
  posts: {
    sources: [
      {
        id: 'your_posts',
        label: 'Your posts',
        open: [
          { op: 'goto', url: `${FB}/me/allactivity` },
          { op: 'click', optional: true, loc: section('^Manage (your )?(posts|activity)$') },
          { op: 'click', optional: true, loc: section('^Your posts$') },
        ],
      },
    ],
    // Trash only: posts stay recoverable for 30 days. Footprint never uses permanent delete.
    action: { role: 'button', name: p('^(move to )?trash$') },
    confirm: { role: 'button', name: p('^(move to )?trash$', '^confirm$'), within: { role: ['dialog', 'alertdialog'] } },
    batch: 25,
    maxPerRun: 100,
  },
};
