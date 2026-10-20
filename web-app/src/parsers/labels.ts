/**
 * Facebook localizes the labels inside `label_values` records and some `title`/`action`
 * strings into the account's language. Everything language-specific the parsers rely on
 * lives here, so supporting a new language means adding entries to this file only.
 *
 * Parsers always fall back to structure (position, first time value) when a label isn't
 * listed, so an unknown language degrades to less detail, never to a crash.
 */

/** Field labels inside label_values records. Add translations to each list. */
export const L = {
  name: ['Name'],
  url: ['URL'],
  title: ['Title'],
  time: ['Time'],
  reaction: ['Reaction'],
  action: ['Action'],
  ad: ['Ad'],
  event: ['Event'],
  events: ['Events'],
  receivedOn: ['Received on'],
  productName: ['Product name'],
  advertiserUploadedList: ['A list uploaded or used by the advertiser'],
  advertiserActivity: ["Interactions you may have had with the advertiser's website, app or store"],
} as const;

/**
 * Values of `action` in security files → machine event type.
 * Unlisted actions still import, as type 'account_activity' with the original text as title.
 */
export const SECURITY_ACTIONS: Record<string, string> = {
  login: 'login',
  'log in': 'login',
  logout: 'logout',
  'log out': 'logout',
  'session updated': 'session_updated',
  'requested password reset': 'password_reset_requested',
  'password change': 'password_changed',
  'password changed': 'password_changed',
  'login failure': 'login_failed',
  'failed login': 'login_failed',
  checkpoint: 'checkpoint',
};

/** Reaction names → normalized reaction. Values also arrive as codes like "LIKE", handled by lowercasing. */
export const REACTIONS: Record<string, string> = {
  like: 'like',
  love: 'love',
  haha: 'haha',
  wow: 'wow',
  sad: 'sad',
  angry: 'angry',
  care: 'care',
};

/**
 * Older-format titles only name the other person inside a sentence, e.g.
 * "<you> liked <person>'s post." These patterns pull the person out (group 1).
 */
export const TITLE_TARGET: RegExp[] = [
  /\b(?:liked|reacted to|commented on|replied to|loved|likes)\s+(.+?)['’]s?\s+(?:own\s+)?(?:\w+\s+)?(?:post|comment|photo|video|reel|status|link|story|album|life event)\b/i,
];

export function titleTarget(title: string | undefined, owner?: string): string | undefined {
  if (!title) return undefined;
  for (const re of TITLE_TARGET) {
    const m = re.exec(title);
    const who = m?.[1]?.trim();
    if (who && who !== owner && !/^(his|her|their|your|my|a|an|the)$/i.test(who)) return who;
  }
  return undefined;
}

/**
 * Settings labels → stable setting ids, per settings file. Labels are the account's
 * language; add translations to each list. Unlisted labels are still kept (as 'field:'
 * or 'raw:' settings with their original text), they just don't drive advice.
 */
export const SETTING_LABELS: Record<string, readonly string[]> = {
  // preferences/preferences/privacy_settings.json
  future_posts: ['Who can see your future posts?'],
  tagged_posts: ["Who can see posts you're tagged in on your profile?"],
  others_posts: ['Who can see what others post on your profile?'],
  friend_requests: ['Who can send you friend requests?'],
  lookup_by_name: ['Who can look up your timeline by name?', 'Who can look up your profile by name?'],
  lookup_email_phone: ['Who can look you up using the email address or phone number you provided?'],
  suggest_by_phone: ['Who can Facebook suggest your profile to based on your phone number?'],
  suggest_by_email: ['Who can Facebook suggest your profile to based on your email address?'],
  friends_list: ['Who can see your friends list?'],
  following_list: ['Who can see the people and Pages you follow?', 'Who can see the people, Pages and lists you follow?'],
  followers_list: ['Who can see your followers on your timeline?', 'Who can see your followers on your profile?'],
  birthday: ['Who can see your birthday?'],
  birth_year: ['Who can see your birth year?'],
  story_reshare: ['Allow others to share your posts to their stories?'],
  // security_and_login_information/two-factor_authentication.json
  two_factor: ['State'],
  // preferences/preferences/login_alerts_settings.json
  login_alerts: ['Notifications enabled'],
  // ads_information/ad_preferences.json
  ad_optout_interests: ['Is opted out of using interests to target ads'],
  ad_optout_political: ['Is opted out of using political views to target ads'],
  ad_optout_religious: ['Is opted out of using religious views to target ads'],
  ad_optout_relationship: ['Is opted out of using relationship status to target ads'],
  ad_optout_education: ['Is opted out of using education information (school, college year, field of study, etc.) to target ads'],
  ad_optout_employer: ['Is opted out of using their employer to target ads'],
  ad_optout_job_title: ['Is opted out of using their job title to target ads'],
  ad_optout_third_party: ['Is opted out of third party data at the user level'],
  ad_optout_partner_sites: ['Is opted out of using data about interactions between the user and third party sites'],
  daa_optout: ['Is the Digital Advertising Alliance opt-out cookie present in any browser'],
  gpc: ['Received Global Privacy Control (GPC) enable signal from browser settings'],
  // ads_information/settings_for_ads_shown_outside_of_meta.json
  ads_off_meta_optout: ['Is opted out from seeing ads off Meta'],
  // apps_and_websites_off_of_facebook/your_activity_off_meta_technologies_settings.json
  off_meta_linked: ['Profile association state'],
  off_meta_cleared: ['Number of times you used clear history settings'],
  // personal_information/profile_information/contacts_sync_settings.json
  contact_upload: ['Indicates if syncing is on'],
  contacts_permission: ['Indicates if your device allows Facebook to read your contacts'],
  // logged_information/other_logged_information/consents.json
  ad_partner_consent: ['Consent for the processing of your data by ad partners'],
};

/** Privacy-settings entries that are not profile details (so they're never counted as "public details"). */
export const NOT_PROFILE_FIELDS = new Set([
  'Posts Audience Limit',
  'Reels Audience Limit',
  'Channels',
  'Events Privacy Settings',
  'Location Sharing',
  'Who can see the Fans tab on your page?',
  'Allow your posts to be shared with tagged friends in Messenger?',
  'Allow others to share your public stories to their own story?',
  'Do you want Facebook to be able to recognize you in photos and videos?',
]);

/** Audience names → normalized audience. Lowercased before lookup. */
export const AUDIENCES: Record<string, 'public' | 'friends_of_friends' | 'friends' | 'only_me' | 'custom'> = {
  public: 'public',
  everyone: 'public',
  'your friends of friends': 'friends_of_friends',
  'friends of friends': 'friends_of_friends',
  'your friends': 'friends',
  friends: 'friends',
  'only me': 'only_me',
  custom: 'custom',
  'specific friends': 'custom',
  'friends except...': 'custom',
};

/** Yes/no values as Facebook writes them. Lowercased before lookup. */
export const BOOLEANS: Record<string, boolean> = {
  true: true,
  false: false,
  on: true,
  off: false,
  yes: true,
  no: false,
  enabled: true,
  disabled: false,
  consented: true,
  withdrawn: false,
  'not consented': false,
  'account association enabled': true,
  'account association disabled': false,
};

/** Display names Facebook uses for deleted or unavailable accounts. */
export const UNKNOWN_PEOPLE = new Set(['Facebook user', 'Facebook User', 'Instagram User', 'Deleted user']);

/**
 * Instagram field labels (English). Instagram localizes these like Facebook does; add
 * translations to each list. Parsers fall back to structure when a label isn't listed.
 */
export const IG = {
  username: ['Username'],
  name: ['Name'],
  url: ['URL'],
  title: ['Title'],
  caption: ['Caption'],
  action: ['Action'],
  owner: ['Owner'],
  emoji: ['Emoji'],
  searchQuery: ['Search query'],
  question: ['Question'],
  answer: ['Answer'],
  interest: ['Interest'],
  type: ['Type'],
  ip: ['IP address'],
  userAgent: ['User Agent'],
  latitude: ['Latitude'],
  longitude: ['Longitude'],
  deviceName: ['Device name'],
  creationTime: ['Creation time'],
  media: ['Media'],
  linkUrl: ['Website link you visited'],
  linkTitle: ['Title of website page you visited'],
  deviceId: ['Device ID'],
  locationsOfInterest: ['Locations of interest'],
  location: ['Location'],
  categories: ['Name'],
  /** advertisers_using_your_activity_or_information.json sections, in the order Instagram lists them. */
  advertiserUploaded: ['Advertisers that have uploaded an audience list containing entries that were matched to your Instagram profile'],
  advertiserInteractions: [
    "Advertisers who have uploaded an audience list that was matched to your profile based on interactions you may have had with the advertiser's website, app or store",
  ],
  advertiserStore: ['Advertisers whose store you visited'],
} as const;

/** Instagram account-activity "Type" values → machine event type. Unlisted types stay 'account_activity'. */
export const IG_ACTIVITY_TYPES: Record<string, string> = {
  login: 'login',
  logout: 'logout',
  'account privacy changed': 'privacy_changed',
};

/** Instagram settings recorded in the download, by stable id. */
export const IG_SETTING_LABELS: Record<string, string[]> = {
  ad_optout_third_party: ['Is opted out of third party data at the user level'],
  gpc: ['Received Global Privacy Control (GPC) enable signal from browser settings'],
  ads_about_meta_optout: ['Is opted out of ads about Meta'],
  contact_upload: ['Contact Syncing'],
  private_account: ['Private Account'],
};
