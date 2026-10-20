import type { Audience } from '../model/types';
import type { FixStatus, Vars } from '../advice/types';
import { fmt } from './strings';
import { IG_FIX_COPY } from './instagramAdvice';
import { byPlatform } from './platform';

/**
 * Wording for the privacy plan, keyed by fix id (see advice/facebook.ts for when each applies).
 * Menu paths were checked in October 2026 against Meta's announcements and recent guides.
 * Facebook renames menus often: keep steps short, name the setting itself, and re-check before releases.
 */

export interface StepGroup {
  /** Where these steps apply, e.g. "iPhone". Omitted when they work everywhere. */
  where?: string;
  steps: string[];
}

export interface FixCopy {
  title: string;
  /** What this export shows, in one or two sentences, with the person's own numbers. */
  finding: (v: Vars, status: FixStatus) => string;
  why: string;
  steps: StepGroup[];
  /** Honest limits: what the change does and doesn't do. */
  limits: string;
}

export const AUDIENCE_LABEL: Record<Audience, string> = {
  public: 'Public (anyone)',
  friends_of_friends: 'Friends of friends',
  friends: 'Friends',
  only_me: 'Only me',
  custom: 'a custom list',
  unknown: 'an unrecognised audience',
};
const aud = (v: unknown) => AUDIENCE_LABEL[(v as Audience) ?? 'unknown'] ?? String(v);
const n = (v: unknown) => fmt.number(Number(v ?? 0));
const list = (v: unknown, max = 3) => {
  const a = Array.isArray(v) ? (v as string[]) : [];
  if (!a.length) return '';
  const shown = a.slice(0, max);
  const more = a.length - shown.length;
  return more > 0 ? `${shown.join(', ')} and ${fmt.number(more)} more` : shown.length > 1 ? `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}` : shown[0]!;
};
const plural = (count: unknown, one: string, many: string) => `${n(count)} ${Number(count) === 1 ? one : many}`;

const ACCOUNTS_CENTER = 'Open Accounts Center: Menu (☰ or your profile picture) → Settings & privacy → Settings → Accounts Center.';
const SETTINGS = 'Open Menu (☰ or your profile picture) → Settings & privacy → Settings.';

const FB_FIX_COPY: Record<string, FixCopy> = {
  two_factor: {
    title: 'Turn on two-factor authentication',
    finding: (v, s) =>
      s === 'done'
        ? 'Two-factor authentication is on.'
        : `${s === 'needs_action' ? 'Two-factor authentication is off.' : "Your export doesn't say whether two-factor authentication is on."} Your account was used from ${plural(v.places, 'place', 'places')} on ${plural(v.devices, 'device', 'devices')}.`,
    why: "With two-factor on, someone who learns your password still can't get in without a code from your phone.",
    steps: [
      {
        steps: [
          ACCOUNTS_CENTER,
          'Choose Password and security → Two-factor authentication, then pick your Facebook account.',
          'Choose an authentication app (safest) or text message, and follow the prompts.',
          'Save the recovery codes somewhere safe, in case you lose your phone.',
        ],
      },
    ],
    limits: "Protects your login. It doesn't change what Facebook collects.",
  },
  sessions: {
    title: "Log out of devices you don't use",
    finding: (v) =>
      `${plural(v.sessions, 'session is', 'sessions are')} still logged in, and your account has been used on ${plural(v.devices, 'device', 'devices')}.`,
    why: 'An old phone or a shared computer can stay logged in for months.',
    steps: [
      {
        steps: [
          ACCOUNTS_CENTER,
          "Choose Password and security → Where you're logged in.",
          "Go through the list. Log out of any device or place you don't recognise or no longer use.",
          'If something looks wrong, change your password straight away.',
        ],
      },
    ],
    limits: 'Ends access for that device. Facebook keeps the record of past logins.',
  },
  login_alerts: {
    title: 'Keep login alerts on',
    finding: (_v, s) =>
      s === 'done'
        ? "Login alerts are on, so you'll hear about logins from new devices."
        : s === 'needs_action'
          ? "Login alerts are off, so you wouldn't be told about a login from a new device."
          : "Your export doesn't say whether login alerts are on.",
    why: 'An alert is often the first sign that someone else has your password.',
    steps: [{ steps: [ACCOUNTS_CENTER, 'Choose Password and security → Login alerts.', 'Turn on alerts by notification and by email.'] }],
    limits: "Tells you about new logins; it doesn't block them.",
  },
  other_businesses: {
    title: 'Limit what other businesses tell Facebook about you',
    finding: (v, s) => {
      const parts: string[] = [];
      if (Number(v.apps) > 0)
        parts.push(`${plural(v.apps, 'app or website', 'apps and websites')} sent Facebook ${plural(v.reports, 'report', 'reports')} about what you did there${(v.topApps as string[] | undefined)?.length ? `, including ${list(v.topApps)}` : ''}.`);
      if (Number(v.businesses) > 0) parts.push(`${plural(v.businesses, 'business has', 'businesses have')} shared your activity on their own sites, apps or stores.`);
      if (s === 'done') parts.push('This activity is no longer linked to your account.');
      else if (v.linked === true) parts.push('This activity is still linked to your account.');
      if (s !== 'done' && v.adsUseOff === true) parts.push("You've already stopped it being used for ads, but it can still shape other things you see.");
      return parts.join(' ');
    },
    why: "Shops, apps and websites that use Meta's tracking tools report visits, searches and purchases to Facebook, even when you aren't using Facebook.",
    steps: [
      {
        where: 'Accounts in the US and some other countries, since July 2026',
        steps: [
          ACCOUNTS_CENTER,
          'Choose Your information and permissions → Activity from other businesses.',
          'Choose not to let Facebook use this activity to personalise your ads and other content.',
        ],
      },
      {
        where: 'If you still see "Your activity off Meta technologies"',
        steps: [
          'In Accounts Center, choose Your information and permissions → Your activity off Meta technologies.',
          'Choose Clear previous activity → Clear.',
          'Choose Manage future activity → Disconnect future activity.',
        ],
      },
    ],
    limits:
      'Limits how Facebook uses this activity. Businesses can still send it, and Meta can keep it in a form that isn’t tied to your account.',
  },
  ads_off_meta: {
    title: 'Stop Facebook ads following you onto other apps',
    finding: (_v, s) =>
      s === 'done'
        ? "You've turned off Facebook-targeted ads on other apps and websites."
        : s === 'needs_action'
          ? 'Facebook can still use your profile to pick ads you see in other apps and websites.'
          : "Your export doesn't say whether Facebook shows you ads on other apps.",
    why: 'Meta places ads in thousands of other apps and sites, targeted with what it knows about you.',
    steps: [
      {
        steps: [
          ACCOUNTS_CENTER,
          'Choose Ad preferences → Ad settings.',
          'Open Ads shown outside of Meta (on some accounts: Ads from ad partners) and choose not to show them.',
        ],
      },
    ],
    limits: "You'll still see ads in other apps; they just won't be picked using your Facebook profile.",
  },
  list_uploads: {
    title: 'Businesses that uploaded your contact details',
    finding: (v) =>
      `${plural(v.uploaded, 'business uploaded', 'businesses uploaded')} a customer list with your email address or phone number on it${(v.examples as string[] | undefined)?.length ? `, for example ${list(v.examples)}` : ''}.`,
    why: 'They use these lists to show you ads on Facebook and to find people like you.',
    steps: [
      {
        steps: [
          ACCOUNTS_CENTER,
          'Choose Ad preferences → Advertisers.',
          "Choose a business you don't want ads from, then Hide ads.",
          'On one of its ads, open ⋯ → Why am I seeing this ad? Where offered, stop ads based on its customer list.',
        ],
      },
    ],
    limits:
      "This only works one business at a time, and Facebook can't delete a business's own copy of your details. To be removed from a list, contact the business.",
  },
  ad_profile_info: {
    title: 'Keep profile details out of ad targeting',
    finding: (v, s) =>
      s === 'done'
        ? "Facebook doesn't use your profile details, such as relationship status, work or views, to pick ads."
        : `Facebook can still use ${n(v.open)} of your profile details, such as relationship status, employer or education, to pick ads.`,
    why: 'These details let advertisers target you by life events and work.',
    steps: [
      {
        steps: [
          ACCOUNTS_CENTER,
          'Choose Ad preferences → Ad settings → Categories used to reach you (on some accounts: Profile information).',
          'Turn off relationship status, employer, job title and education.',
        ],
      },
    ],
    limits: 'Stops these details being used for ads. They stay on your profile.',
  },
  ad_topics: {
    title: 'See fewer ads about topics Facebook picked for you',
    finding: (v, s) =>
      `Facebook gave your account ${plural(v.interests, 'interest', 'interests')} and ${plural(v.categories, 'category', 'categories')} for advertisers.${s === 'done' ? " You've already stopped it using interests to target ads." : ''}`,
    why: 'These interests come from what you click, like and watch, and decide which ads reach you.',
    steps: [
      {
        steps: [
          ACCOUNTS_CENTER,
          'Choose Ad preferences → Ad topics. Pick a topic and choose See less.',
          "Then open Categories used to reach you and remove anything that doesn't fit.",
        ],
      },
    ],
    limits: 'Changes which ads you see. Facebook keeps working out new interests from what you do.',
  },
  lookup: {
    title: 'Stop people finding you by email or phone number',
    finding: (v, s) => {
      if (s === 'done') return 'Only you or your friends can find your profile with your email address or phone number.';
      const parts: string[] = [];
      if (v.emailPhone === 'public' || v.emailPhone === 'friends_of_friends')
        parts.push(`${aud(v.emailPhone)} can find your profile using your email address or phone number.`);
      if (v.byName === 'public') parts.push('Anyone can look up your profile by name.');
      if (v.suggest) parts.push('Facebook suggests your profile to people who have your number or email.');
      return parts.join(' ');
    },
    why: 'Leaked phone numbers and email addresses are often matched to profiles exactly this way.',
    steps: [
      {
        steps: [
          SETTINGS,
          'Choose Audience and visibility → How people can find and contact you.',
          'Set who can look you up by email address and by phone number to Only me.',
          'Turn off "Do you want search engines outside of Facebook to link to your profile?"',
        ],
      },
    ],
    limits: 'People who already have your number can still message you. Your name and profile picture are always public on Facebook.',
  },
  public_details: {
    title: 'Hide profile details anyone can see',
    finding: (v, s) =>
      s === 'done'
        ? 'None of your profile details are set to Public.'
        : `${plural((v.details as string[]).length, 'profile detail is', 'profile details are')} set to Public: ${list(v.details, 6)}. Whatever you filled in there can be seen by anyone, even without a Facebook account.`,
    why: 'Public details help strangers, scammers and data brokers build a picture of you.',
    steps: [
      {
        steps: [
          'Go to your profile and choose Edit profile, or open the About section.',
          'Next to each detail, choose the audience icon (a globe means Public).',
          "Choose Friends or Only me. Delete details you don't need on Facebook at all.",
        ],
      },
    ],
    limits: 'Changes who can see them. Facebook still keeps and uses what you entered.',
  },
  future_posts: {
    title: 'Limit who sees your posts',
    finding: (v, s) =>
      s === 'done'
        ? `New posts are shared with ${aud(v.audience)}.`
        : s === 'needs_action'
          ? `New posts are set to ${aud(v.audience)}, so people you don't know can see them.`
          : `You've made ${plural(v.posts, 'post', 'posts')}. Check who can see them.`,
    why: 'Public posts can be seen, copied and saved by anyone.',
    steps: [
      {
        steps: [
          SETTINGS,
          'Choose Audience and visibility → Posts.',
          'Set "Who can see your future posts?" to Friends.',
          'Choose "Limit who can see past posts" to switch old public posts to Friends in one go.',
        ],
      },
    ],
    limits: "Limiting past posts can't be undone in one step. Copies other people shared stay where they shared them.",
  },
  friends_list: {
    title: 'Keep your friends list private',
    finding: (v, s) => {
      if (s === 'done') return 'Your friends list is hidden and friend requests are limited.';
      const parts: string[] = [];
      if (v.list === 'public' || v.list === 'friends_of_friends') parts.push(`Your friends list is visible to ${aud(v.list)}.`);
      if (v.requests === 'public') parts.push('Anyone can send you a friend request.');
      return parts.join(' ');
    },
    why: 'Fake accounts use friends lists to look trustworthy to the people you know.',
    steps: [
      {
        steps: [
          SETTINGS,
          'Choose Audience and visibility → How people can find and contact you.',
          'Set "Who can see your friends list?" to Only me.',
          'Set "Who can send you friend requests?" to Friends of friends.',
        ],
      },
    ],
    limits: 'Your friends decide who sees their own friends lists, so you may still appear there.',
  },
  contact_upload: {
    title: "Stop uploading your phone's contacts",
    finding: (v, s) =>
      s === 'done'
        ? "Contact upload is off, and your phone doesn't give Facebook your contacts."
        : [v.syncing === true && 'Facebook is uploading the contacts from your phone.', v.permission === true && 'Your phone lets Facebook read your contacts.']
            .filter(Boolean)
            .join(' ') || "Your export doesn't say whether contact upload is on.",
    why: "Uploaded contacts include other people's names, numbers and emails, and help Facebook connect you to them.",
    steps: [
      {
        where: 'In the Facebook app',
        steps: [
          'Open Menu → Settings & privacy → Settings → Accounts Center → Your information and permissions → Upload contacts. (Older app versions: Settings → Media and contacts → Continuous contacts upload.)',
          'Turn uploading off. Do the same in Messenger if you use it.',
        ],
      },
      { where: 'iPhone', steps: ['Settings → Facebook → turn off Contacts.'] },
      { where: 'Android', steps: ['Settings → Apps → Facebook → Permissions → Contacts → Don’t allow.'] },
    ],
    limits: 'Stops future uploads from your phone. Friends who upload their contacts may still share your number.',
  },
  location: {
    title: 'Turn off location access for Facebook',
    finding: (v, s) => {
      const extra = [v.last && 'your last known location as map coordinates', Number(v.guesses) > 0 && `${plural(v.guesses, 'inferred location', 'inferred locations')}`]
        .filter(Boolean)
        .join(' and ');
      const head = s === 'done' ? 'Location services are off for Facebook.' : s === 'needs_action' ? 'Location services are on for Facebook.' : "Your export doesn't say whether location services are on.";
      return `${head}${extra ? ` Your export includes ${extra}.` : ''}`;
    },
    why: 'Precise location shows where you live, work and travel.',
    steps: [
      { where: 'iPhone', steps: ['Settings → Facebook → Location.', 'Choose Never, or While Using the App if you like tagging places.'] },
      { where: 'Android', steps: ['Settings → Apps → Facebook → Permissions → Location.', "Choose Don't allow."] },
    ],
    limits:
      "Facebook stopped keeping Location History in 2022, but it still estimates where you are from your internet connection. No setting turns that off; that's how the places on your login map were recorded.",
  },
  connected_apps: {
    title: 'Remove apps you logged into with Facebook',
    finding: (v, s) =>
      s === 'needs_action'
        ? `${plural(v.active, 'app can', 'apps can')} still use your Facebook login${Number(v.expired) ? `, and ${n(v.expired)} more have expired access` : ''}: ${list(v.names)}.`
        : `${plural(v.expired, 'app', 'apps')} you logged into with Facebook ${Number(v.expired) === 1 ? 'has' : 'have'} expired access: ${list(v.names)}.`,
    why: 'Apps you logged into with Facebook may have received your name, email, friends list or photos.',
    steps: [
      {
        steps: [
          SETTINGS,
          'Choose Apps and websites (under Your activity).',
          'Choose each app you no longer use, then Remove.',
          'To block all of them, turn off "Apps, websites and games".',
        ],
      },
    ],
    limits: 'Ends their access. Apps keep the data they already received.',
  },
  browser_signal: {
    title: 'Ask websites not to sell your data',
    finding: (v, s) =>
      s === 'done'
        ? 'Your browser sends Global Privacy Control, a "don’t sell or share my data" signal, and Facebook recorded it.'
        : `Facebook hasn't recorded a Global Privacy Control signal from your browser.${v.daa ? " You do have the advertising industry's opt-out cookie." : ''}`,
    why: 'Global Privacy Control asks every site you visit not to sell or share your data. In several US states, sites must honour it.',
    steps: [
      {
        steps: [
          'Firefox: Settings → Privacy & Security → turn on "Tell websites not to sell or share my data".',
          'Brave and DuckDuckGo send it automatically.',
          'Chrome and Safari: install a privacy extension that sends Global Privacy Control.',
        ],
      },
    ],
    limits: 'A request, not a block. What it does depends on where you live.',
  },
  photo_metadata: {
    title: 'Your photos carry more than the picture',
    finding: (v) =>
      `${plural(v.withIp, 'photo or video records', 'photos and videos record')} the internet address it was uploaded from${Number(v.taken) ? `, and ${n(v.taken)} keep the date it was taken` : ''}.`,
    why: "An upload address points to the area you were in and the network you used.",
    steps: [
      {
        steps: [
          'iPhone: Settings → Privacy & Security → Location Services → Camera → Never, so new photos carry no location.',
          'Android: open the Camera app settings and turn off location tags.',
          "Delete photos you don't need: Profile → Photos → choose a photo → ⋯ → Delete photo.",
        ],
      },
    ],
    limits: 'Facebook records the upload address of every new photo; no setting turns that off.',
  },
  search_history: {
    title: 'Clear your search history',
    finding: (v) => `Facebook kept ${plural(v.searches, 'search', 'searches')} you made.`,
    why: 'Searches show who and what you were curious about, and feed your ad interests.',
    steps: [
      {
        steps: [
          'Go to your profile and choose ⋯ → Activity log.',
          'Choose Search history (under Logged actions and other activity).',
          'Choose Clear searches.',
        ],
      },
    ],
    limits: 'Clears the list in your activity log. What Facebook already learned from those searches stays.',
  },
  old_posts: {
    title: 'Archive or delete old posts in bulk',
    finding: (v) => `You've made ${plural(v.posts, 'post', 'posts')} over ${plural(v.years, 'year', 'years')}.`,
    why: 'Old posts are easy to forget and easy for others to find.',
    steps: [
      {
        steps: [
          'Go to your profile and choose ⋯ → Activity log → Your activity across Facebook → Posts.',
          'Filter by year, select posts, then choose Archive (only you can see them) or Trash.',
          'Trashed posts are deleted after 30 days.',
        ],
      },
    ],
    limits: 'Removes them from Facebook. Copies others saved or shared may remain.',
  },
  privacy_checkup: {
    title: "Run Facebook's Privacy Checkup",
    finding: (v, s) =>
      s === 'done'
        ? `You ran Privacy Checkup on ${fmt.date(Number(v.last))}.`
        : Number(v.runs) > 0 && v.last
          ? `You last ran Privacy Checkup on ${fmt.date(Number(v.last))}.`
          : "Your export doesn't show you running Privacy Checkup.",
    why: 'It walks through most of the settings above in one place.',
    steps: [{ steps: ['Open Menu → Settings & privacy → Privacy Checkup.', 'Go through each topic it offers.'] }],
    limits: "A guided tour of settings; it doesn't change anything until you do.",
  },
};

/** Every fix's wording. Ids never clash: Instagram fixes start with "ig_". */
export const FIX_COPY: Record<string, FixCopy> = { ...FB_FIX_COPY, ...IG_FIX_COPY };

const FB_PLAN_COPY = {
  tab: 'Your privacy plan',
  title: 'Make Facebook collect and show less',
  lead:
    "Based on your data download, and on a live check of your settings when you've run one, these are the settings worth changing, most important first. Each one says what we found, how to change it and what it really does. You make the changes, or let the Footprint browser extension make the ones you approve.",
  progress: (open: number, done: number) =>
    open
      ? `${fmt.number(open)} ${open === 1 ? 'change' : 'changes'} would make your account more private · ${fmt.number(done)} already done`
      : `Nothing urgent left · ${fmt.number(done)} settings already private`,
  sections: {
    todo: 'Change these',
    todoHint: 'Your download or a live check shows these settings are open. Each card says which.',
    review: 'Also worth checking',
    reviewHint: "Neither your download nor a live check could say whether these are done, or they can only be reduced, not switched off.",
    done: 'Already private',
    doneHint: 'Already set the private way, going by your download or a live check.',
  },
  labels: {
    found: 'What we found',
    why: 'Why it matters',
    how: 'How to change it',
    limits: 'What this does and doesn’t do',
    open: 'Open this setting on Facebook',
    evidence: 'See the evidence',
    markDone: 'I did this',
    markedDone: 'Marked as done',
    undo: 'Undo',
    checked: (month: string) => `Steps checked ${month}`,
    impact: { high: 'High impact', medium: 'Medium impact', low: 'Low impact' },
    effort: { quick: 'Quick', longer: 'Takes a while' },
    status: { needs_action: 'Needs changing', review: 'Worth checking', done: 'Already private' },
    tickedNote: 'Ticks are saved only in this browser. Your next export will show whether the change took.',
    menusMove: 'Facebook moves its menus often. If a step looks different, search Facebook’s settings for the setting’s name.',
    noPlan: "Your export doesn't include the settings files the plan needs. Export again with all information selected.",
    makePrivate: 'Make this more private',
  },
  overview: {
    title: 'Your privacy plan',
    cta: 'See your privacy plan',
  },
};

export const planCopy = byPlatform(FB_PLAN_COPY, {
  instagram: {
    title: 'Make Instagram collect and show less',
    lead: "Based on your Instagram data download, these are the settings worth changing, most important first. Each one says what we found, how to change it and what it really does. Instagram downloads record only a few settings, so more of these are worth a look rather than marked done.",
    sections: {
      todoHint: 'Your download shows these settings are open, or that Instagram is keeping something you can remove.',
      reviewHint: "Your download can't say whether these are done, or they can only be reduced, not switched off.",
      doneHint: 'Your download shows these are already set the private way.',
    },
    labels: {
      open: 'Open this setting',
      menusMove: 'Instagram moves its menus often. If a step looks different, search Instagram’s settings for the setting’s name.',
      noPlan: "Your download doesn't include the files the plan needs. Request it again with all information selected.",
    },
  },
});

/** "2026-10" → "October 2026" */
export const monthName = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : ym;
};
