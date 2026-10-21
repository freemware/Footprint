import { FIX_COPY } from '../../../src/i18n/advice';
import type { CheckDef, PlatformDef } from './types';
import { p } from './types';
import type { Locator, Step } from '../shared/types';

/** Facebook flows inspected live on October 20, 2026. English labels only. */
declare const __FB_ORIGIN__: string | undefined;
declare const __AC_ORIGIN__: string | undefined;
/** Overridden only by the test build, which points these at stand-in pages. */
export const FB = typeof __FB_ORIGIN__ === 'string' ? __FB_ORIGIN__ : 'https://www.facebook.com';
export const AC = typeof __AC_ORIGIN__ === 'string' ? __AC_ORIGIN__ : 'https://accountscenter.facebook.com';

const NAV = ['link', 'tab', 'button', 'menuitem'];
const section = (...names: string[]): Locator => ({ role: NAV, name: names });
/** After choosing an option, close or save if the page asks. */
const finish: Step[] = [
  { op: 'click', optional: true, loc: { role: 'button', name: p('^save( changes)?$', '^done$', '^confirm$') } },
];

const copy = (id: string) => FIX_COPY[id];
const wide = (v: string | boolean) => v === 'public' || v === 'friends_of_friends';

const POSTS = [{ op: 'goto', url: `${FB}/settings/?tab=posts` }] as Step[];
const FIND = [{ op: 'goto', url: `${FB}/settings/?tab=how_people_find_and_contact_you` }] as Step[];
const TAGGING = [{ op: 'goto', url: `${FB}/settings/?tab=profile_and_tagging` }] as Step[];
const SECURITY = (item: string): Step[] => [
  { op: 'goto', url: `${AC}/password_and_security` },
  { op: 'click', loc: section(item) },
];
const OFF_META: Step[] = [
  { op: 'goto', url: `${AC}/info_and_permissions` },
  { op: 'click', loc: section('^Activity from other businesses$') },
];
const ACTIVITY_ALLOW = '^Allow us to use this activity to show you';
const ACTIVITY_DENY = "^Don['’]?t allow us to use this activity to show you";

const SETTINGS_URL = `${FB}/settings`;

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
    open: [...SECURITY('^Two-factor authentication$'), {op:'click', loc:{...section('Facebook$'), unique:true}}],
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
    manual: ['Check Accounts Center → Password and security for Login alerts.', 'This control was absent on the inspected layout. Footprint leaves its status unknown and does not change it.'],
    url: `${AC}/password_and_security`,
    open: SECURITY('^Login alerts$'),
    read: { question: p('^(in-app )?notifications?$', '^Facebook notifications$'), vocab: 'onoff' },
    risky: (v) => v === false,

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
    title: 'Profile suggestions based on your phone number',
    area: 'visibility',
    impact: 'high',
    why: 'Controls whether Facebook suggests your profile using contact information other people uploaded.',
    limits: 'People can still find your profile by name and other connections.',
    manual: ['Open Settings → Audience and visibility → How people find and contact you.', 'Open People with your phone number and choose No one.'],
    url: SETTINGS_URL,
    open: FIND,
    read: { question: p('^People with your phone number'), vocab: 'audience' },
    risky: wide,
    fix: { to: 'No one', expect: 'only_me', steps: [{ op: 'openSetting', question: p('^People with your phone number') }, { op: 'choose', option: p('^no one$') }, ...finish] },
  },
  {
    id: 'lookup_email',
    title: 'Profile suggestions based on your email address',
    area: 'visibility',
    impact: 'high',
    why: 'Controls whether Facebook suggests your profile using contact information other people uploaded.',
    limits: 'People can still find your profile by name and other connections.',
    manual: ['Open Settings → Audience and visibility → How people find and contact you.', 'Open People with your email address and choose No one.'],
    url: SETTINGS_URL,
    open: FIND,
    read: { question: p('^People with your email address'), vocab: 'audience' },
    risky: wide,
    fix: { to: 'No one', expect: 'only_me', steps: [{ op: 'openSetting', question: p('^People with your email address') }, { op: 'choose', option: p('^no one$') }, ...finish] },
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
    fix: { to: 'Off', expect: false, steps: [{ op: 'setToggle', question: p('search engines outside of facebook'), value:false }] },
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
    fix: { to: 'On', expect: true, steps: [{ op: 'setToggle', question: p("review posts you('|’)?re tagged in"), value:true }] },
  },
  {
    id: 'other_businesses',
    title: 'Activity from other businesses',
    area: 'tracking',
    impact: 'high',
    why: 'Controls whether Meta uses activity sent by other businesses to personalize relevant content, including ads.',
    limits: 'Businesses may still send activity. Meta may anonymize it or use it to improve products. This preference may apply to multiple connected accounts.',
    manual: ['Open Accounts Center → Your information and permissions → Activity from other businesses.', 'Choose Don’t allow, then Confirm. This is also linked from Ad preferences → Manage info.'],
    url: `${AC}/info_and_permissions`,
    open: OFF_META,
    read: { question: p(ACTIVITY_ALLOW), vocab: 'onoff' },
    display: (v) => (v ? 'Used for relevant content' : 'Not used for relevant content'),
    risky: (v) => v === true,
    fix: {
      to: 'Not used for relevant content',
      expect: false,
      steps: [{op:'choose', option:p(ACTIVITY_DENY)}, {op:'click', optional:true, loc:section('^Confirm$')}],
    },
  },

];

const activityLog = (...category: string[]): Step[] => [
  { op: 'goto', url: `${FB}/me/allactivity` },
  {op:'click', loc:section('^Your Facebook activity')},
  { op: 'click', loc: section("^Activity you('|’)?re tagged in$") },
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
      { id: 'tagged_posts', label: 'Posts you’re tagged in', open: activityLog("^Posts( and comments)? you('|’)?re tagged in$") },
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
          {op:'click', loc:section('^Your Facebook activity')},
          {op:'click', loc:section('^Posts$')},
          {op:'click', loc:section('^Your posts, photos and videos$')},
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
