import type { FixCopy } from './advice';
import { fmt } from './strings';

/**
 * Wording for the Instagram privacy plan, keyed by fix id (see advice/instagram.ts for when each applies).
 *
 * Menu paths checked October 2026 against:
 *   - Meta, "Better Personalization and Changes to Controls for Your Activity From Other Businesses" (June 2026)
 *   - TechPP, Instagram path to Activity from other businesses (June 2026)
 *   - Comparitech, Instagram privacy settings (updated May 2026): private account, two-factor, phone location
 *   - Privacy International, Instagram settings guide (July 2025): private account, two-factor, ad partners
 *   - Guiding Tech: link history (February 2024), contact syncing (August 2024)
 *   - Metricool, clearing Instagram search history (December 2025)
 *   - Instagram, "Introducing Recently Deleted" (2021): 30 days, verify before deleting
 * Instagram renames menus often: keep steps short and name the setting itself.
 */

const n = (v: unknown) => fmt.number(Number(v ?? 0));
const plural = (count: unknown, one: string, many: string) => `${n(count)} ${Number(count) === 1 ? one : many}`;

const MENU = 'Open Instagram, go to your profile and tap ☰ (top right).';
const ACCOUNTS_CENTER = 'Open Instagram, go to your profile, tap ☰ (top right) and choose Accounts Center.';

export const IG_FIX_COPY: Record<string, FixCopy> = {
  ig_two_factor: {
    title: 'Turn on two-factor authentication',
    finding: (v) =>
      `Your download doesn't say whether two-factor is on. It records ${plural(v.records, 'login or account change', 'logins and account changes')} on ${plural(v.devices, 'kind of device', 'kinds of device')}.`,
    why: "With two-factor on, someone who learns your password still can't get in without a code from your phone.",
    steps: [
      {
        steps: [ACCOUNTS_CENTER, 'Choose Password and security → Two-factor authentication.', 'Pick your Instagram account, tap Next, and choose an authentication app (safest) or text message.', 'Save the backup codes somewhere safe.'],
      },
    ],
    limits: "Protects your login. It doesn't change what Instagram collects.",
  },
  ig_sessions: {
    title: "Log out of devices you don't use",
    finding: (v) => `Your account was used on ${plural(v.devices, 'kind of device', 'kinds of device')}.`,
    why: 'An old phone or a shared computer can stay logged in for months.',
    steps: [
      {
        steps: [ACCOUNTS_CENTER, "Choose Password and security → Where you're logged in.", "Log out of any device you don't recognise or no longer use.", 'If something looks wrong, change your password straight away.'],
      },
    ],
    limits: 'Ends access for that device. Instagram keeps the record of past logins.',
  },
  ig_private_account: {
    title: 'Make your account private',
    finding: (v, s) =>
      s === 'done'
        ? `Your account is private, so only your ${plural(v.followers, 'follower', 'followers')} can see your posts and stories.`
        : `Your account is public: anyone can see your ${plural(v.posts, 'post', 'posts')} and ${plural(v.stories, 'story', 'stories')}, even without an account.`,
    why: 'Public posts can be seen, copied and saved by anyone, and appear in search.',
    steps: [{ steps: [MENU, 'Choose Account privacy.', 'Turn on Private account, then confirm Switch to private.'] }],
    limits: 'Hides posts and stories from people who don’t follow you. Your name, username, profile photo and bio stay visible to everyone, and followers can still screenshot what you share.',
  },
  ig_link_history: {
    title: 'Turn off link history',
    finding: (v) =>
      // Site names stay on the Activity tab, where they're blurred with other personal details.
      `Instagram kept ${plural(v.links, 'web page', 'web pages')} you opened in its built-in browser, on ${plural(v.sites, 'website', 'websites')}.`,
    why: 'Meta uses the links you open to personalise ads, and the list shows what you read and shop for outside Instagram.',
    steps: [
      {
        steps: ['Open any link inside Instagram, for example from a post or a bio.', 'In Instagram’s browser, tap ⋯ (top right) → Browser settings.', 'Turn off Allow link history, then tap Don’t allow to confirm.'],
      },
    ],
    limits: 'Removes the links shown in your history and stops new ones being kept. Meta can take up to 90 days to delete them from its servers. Facebook has its own link history setting; links opened in chats or on the website aren’t in it.',
  },
  ig_other_businesses: {
    title: 'Limit what other businesses tell Instagram about you',
    finding: (v, s) => {
      const head = `${plural(v.businesses, 'business has', 'businesses have')} shared what you did on their own websites, apps or stores.`;
      if (s === 'needs_action') return `${head} Your download shows Instagram may use activity from ad partners for your ads.`;
      return v.optedOut === true
        ? `${head} You had opted out of Instagram using data from ad partners. In July 2026 Meta replaced that setting with “Activity from other businesses”, so check it still says Don’t allow.`
        : `${head} Check how this activity is used.`;
    },
    why: 'Shops, apps and websites send Meta what you look at and buy, and it can shape your ads and what appears in your feed.',
    steps: [
      { steps: [ACCOUNTS_CENTER, 'Choose Your information and permissions → Activity from other businesses.', 'Choose Don’t allow Meta to use this activity to show you relevant content, then Confirm.'] },
      {
        where: 'If you don’t see “Activity from other businesses” yet',
        steps: ['In Accounts Center, choose Ad preferences → Ad settings → Activity information from ad partners.', 'Choose Review setting and turn it off.'],
      },
    ],
    limits: 'Limits how Meta uses this activity for ads and content. Businesses can still send it, and Meta can still keep it.',
  },
  ig_list_uploads: {
    title: 'Businesses that uploaded your contact details',
    finding: (v) => `${plural(v.uploaded, 'business uploaded', 'businesses uploaded')} a list with details that matched your Instagram profile, such as your email address or phone number.`,
    why: 'They use these lists to show you ads and to find people like you.',
    steps: [
      {
        steps: [ACCOUNTS_CENTER, 'Choose Ad preferences → Advertisers.', "Choose a business you don't want ads from, then Hide ads."],
      },
    ],
    limits: "Works one business at a time, and Meta can't delete a business's own copy of your details. To be removed from a list, contact the business.",
  },
  ig_contact_upload: {
    title: "Stop uploading your phone's contacts",
    finding: (_v, s) => (s === 'done' ? 'Contact syncing is off.' : 'Contact syncing is on, so Instagram uploads the contacts from your phone.'),
    why: "Uploaded contacts include other people's names and numbers, and are used to suggest accounts to you and you to them.",
    steps: [
      { where: 'Stop syncing', steps: [ACCOUNTS_CENTER, 'Choose Your information and permissions → Upload contacts.', 'Pick your Instagram account and turn off Connect contacts.'] },
      {
        where: 'Delete contacts already uploaded (on a computer)',
        steps: ['Log in at instagram.com, click ☰ More → Settings → See more in Accounts Center.', 'Choose Your information and permissions → Manage contacts.', 'Click Delete, then Delete again to confirm.'],
      },
    ],
    limits: 'Turning syncing off doesn’t delete contacts already uploaded; deleting them can take up to 90 days. People who upload their own contacts may still share your number.',
  },
  ig_location: {
    title: 'Turn off location access for Instagram',
    finding: (v) =>
      [v.last && 'Instagram stored your last known location as map coordinates.', Number(v.withPlace) > 0 && `${plural(v.withPlace, 'of your posts carries', 'of your posts carry')} map coordinates.`]
        .filter(Boolean)
        .join(' '),
    why: 'Precise location shows where you live, work and travel.',
    steps: [
      { where: 'iPhone', steps: ['Settings → Privacy & Security → Location Services → Instagram.', 'Choose Never, or While Using the App if you like tagging places.'] },
      { where: 'Android', steps: ['Settings → Apps → Instagram → Permissions → Location.', "Choose Don't allow."] },
    ],
    limits: 'Stops your phone sharing its location with Instagram. Instagram can still estimate roughly where you are from your internet connection.',
  },
  ig_post_details: {
    title: 'Your posts carry more than the picture',
    finding: (v) =>
      [Number(v.withPlace) > 0 && `${plural(v.withPlace, 'post or story keeps', 'posts and stories keep')} map coordinates.`, Number(v.devices) > 0 && `Instagram recorded the name of ${plural(v.devices, 'phone', 'phones')} you posted from.`]
        .filter(Boolean)
        .join(' '),
    why: 'Coordinates and device names can point to where you were and what you own.',
    steps: [
      {
        steps: ['iPhone: Settings → Privacy & Security → Location Services → Camera → Never, so new photos carry no location.', 'Android: open the Camera app settings and turn off location tags.', "Delete old posts you don't need."],
      },
    ],
    limits: 'Changes new photos only. What Instagram already recorded stays with the posts until you delete them.',
  },
  ig_recently_deleted: {
    title: 'Empty “Recently deleted”',
    finding: (v) => `Instagram is still holding ${plural(v.deleted, 'post or story', 'posts and stories')} you deleted.`,
    why: 'Deleted posts stay in a recoverable folder for up to 30 days, where anyone with access to your account can restore them.',
    steps: [{ steps: [MENU, 'Type “Recently deleted” in the search box at the top, and open it.', 'Choose each item → ⋯ → Delete, and confirm it’s you when asked.'] }],
    limits: 'Deletes them from your account now instead of after 30 days. Copies other people saved or screenshotted remain.',
  },
  ig_search_history: {
    title: 'Clear your search history',
    finding: (v) => `Instagram kept ${plural(v.searches, 'search', 'searches')} you made.`,
    why: 'Searches show who and what you were curious about, and shape what Instagram suggests.',
    steps: [{ steps: [MENU, 'Choose Your activity → Recent searches.', 'Tap Clear all and confirm.'] }],
    limits: 'Clears the list. What Instagram already learned from those searches stays.',
  },
  ig_ad_topics: {
    title: 'See fewer ads about categories picked for you',
    finding: (v) => `Instagram placed you in ${plural(v.categories, 'category', 'categories')} that advertisers can choose.`,
    why: 'These categories come from what you do and decide which ads reach you.',
    steps: [{ steps: [ACCOUNTS_CENTER, 'Choose Ad preferences → Ad topics. Pick a topic and choose See less.'] }],
    limits: 'Changes which ads you see. Instagram keeps working out new categories from what you do.',
  },
  ig_lead_forms: {
    title: 'Answers you gave advertisers',
    finding: (v) => `You answered ${plural(v.answers, 'question', 'questions')} in forms inside advertisers' ads. Those answers went to the businesses.`,
    why: 'Form answers, like your email or what you’re shopping for, are kept by the business that asked.',
    steps: [{ steps: ['Open the records on the Ads & tracking tab to see which forms you filled in.', 'To have your answers deleted, contact that business directly.'] }],
    limits: "Instagram can't delete a business's copy. Only the business can.",
  },
  ig_browser_signal: {
    title: 'Ask websites not to sell your data',
    finding: (_v, s) =>
      s === 'done'
        ? 'Your browser sends Global Privacy Control, a "don’t sell or share my data" signal, and Instagram recorded it.'
        : "Instagram hasn't recorded a Global Privacy Control signal from your browser.",
    why: 'Global Privacy Control asks every site you visit not to sell or share your data. In several US states, sites must honour it.',
    steps: [
      {
        steps: ['Firefox: Settings → Privacy & Security → turn on "Tell websites not to sell or share my data".', 'Brave and DuckDuckGo send it automatically.', 'Chrome and Safari: install a privacy extension that sends Global Privacy Control.'],
      },
    ],
    limits: 'A request, not a block. What it does depends on where you live.',
  },
};
