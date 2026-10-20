/**
 * Plain-language copy for the report tabs. Written for someone who has never seen
 * a data export: say what Facebook does, what it means, and what you can do.
 * All of it lives here so the interface can be translated later.
 */
import { fmt } from './strings';
import { byPlatform } from './platform';
import { IG_REPORT, IG_TABS } from './instagram';

const n = fmt.number;
const plural = (count: number, one: string, many: string) => `${n(count)} ${count === 1 ? one : many}`;

const FB_TABS = {
  overview: { label: 'Overview', title: "Here's what Facebook has on you" },
  plan: { label: 'Privacy plan', title: 'Make Facebook collect and show less' },
  ads: { label: 'Ads & tracking', title: 'Who has your information?' },
  profile: { label: 'About you', title: 'What Facebook knows and infers about you' },
  security: { label: 'Logins & devices', title: 'Where and how your account is used' },
  activity: { label: 'Activity', title: 'What Facebook records about what you do' },
  people: { label: 'People', title: 'Who you talk to' },
  media: { label: 'Photos & videos', title: 'Your photos and videos' },
  timeline: { label: 'Timeline', title: 'Everything, in order' },
  raw: { label: 'Files', title: 'Every file in your export' },
  /* raw lead lives in report.raw */
} as const;
/** Tab names and titles, worded for the platform on screen. */
export type TabId = keyof typeof FB_TABS;
export const TABS = byPlatform<Record<TabId, { label: string; title: string }>>(FB_TABS, { instagram: IG_TABS });
export const TAB_ORDER: TabId[] = ['overview', 'plan', 'ads', 'profile', 'security', 'activity', 'people', 'media', 'timeline', 'raw'];

/** Each tab's hue, used for its header band, icon tiles and highlights. Matches the chart groups. */
export const TAB_HUE: Record<TabId, string> = {
  overview: 'var(--accent)',
  plan: 'var(--plan)',
  ads: 'var(--cat-ads)',
  profile: 'var(--cat-communities)',
  security: 'var(--cat-security)',
  activity: 'var(--cat-social)',
  people: 'var(--cat-messages)',
  media: 'var(--cat-posts)',
  timeline: 'var(--accent)',
  raw: 'var(--text-3)',
};

const FB_REPORT = {
  overview: {
    lead: (years: number, from: string, files: number) =>
      `Your export covers ${years >= 1 ? `${years.toFixed(1)} years` : 'less than a year'}, back to ${from}, spread over ${n(files)} files. It was read on this device and nothing was uploaded.`,
    findings: {
      advertisers: (total: number) => `${n(total)} businesses have your information`,
      advertisersSub: (uploaded: number, activity: number) =>
        `${n(uploaded)} matched you using your email or phone number. ${n(activity)} told Facebook what you did on their website or app.`,
      interests: (k: number) => `Facebook sorted you into ${n(k)} interest categories`,
      interestsSub: 'These are used to decide which ads you see.',
      offMeta: (apps: number) => `${plural(apps, 'app or website', 'apps and websites')} reported your activity to Facebook`,
      offMetaSub: (top?: string) => (top ? `Including ${top}. This happens even when you're not on Facebook.` : "This happens even when you're not on Facebook."),
      places: (cities: number, countries: number) => `Your account was used in ${plural(cities, 'city', 'cities')} across ${plural(countries, 'country', 'countries')}`,
      placesSub: (devices: number) => `On ${plural(devices, 'kind of device', 'kinds of device')}. Facebook keeps the IP address and location each time.`,
      logged: (k: number) => `${n(k)} things you did were logged`,
      loggedSub: (likes: number, searches: number, viewed: number) =>
        `Including ${n(likes)} likes and reactions, ${n(searches)} searches and ${n(viewed)} Marketplace items you looked at.`,
      messages: (k: number) => `${n(k)} messages are stored`,
      messagesSub: (threads: number) => `From ${plural(threads, 'conversation', 'conversations')}, including ones you may have forgotten.`,
    },
    yearsTitle: 'What was recorded each year',
    yearsNote: 'Each bar is everything Facebook logged that year, split by kind.',
    open: 'See details',
  },

  ads: {
    lead: 'Businesses can reach you on Facebook in two ways: by uploading a customer list that contains your details, or by sending Facebook data about what you do on their own websites and apps.',
    uploadedTitle: 'Uploaded a list with your details',
    uploadedText: 'They had your email address or phone number, for example from a purchase or a sign-up, and matched it to your Facebook account to show you ads.',
    activityTitle: 'Shared your activity with Facebook',
    activityText: 'They used a Facebook tracking tool on their website or app and sent Facebook information about your visits.',
    both: (k: number) => `${n(k)} businesses did both.`,
    searchList: 'Search businesses',
    filterAll: 'All',
    filterUploaded: 'Uploaded a list',
    filterActivity: 'Shared activity',
    showing: (shown: number, total: number) => `Showing ${n(shown)} of ${n(total)}`,
    showMore: 'Show more',
    offTitle: 'Apps and websites that report on you',
    offLead: (events: number) =>
      `${plural(events, 'report was', 'reports were')} sent to Facebook by other companies about things you did outside Facebook.`,
    offKinds: 'What they reported',
    adsTitle: 'Ads you saw and clicked',
    adsLead: (seen: number, clicked: number, hidden: number) =>
      `Facebook kept a list of ${plural(seen, 'ad', 'ads')} you saw recently, ${plural(clicked, 'ad', 'ads')} you clicked and ${plural(hidden, 'ad', 'ads')} you hid.`,
    topSeen: 'Advertisers you saw most',
  },

  profile: {
    lead: 'Everything on this page is copied exactly from your download. Some of it you told Facebook; the rest Facebook worked out from what you do, and those parts are labelled “Inferred by Facebook”.',
    inferredBadge: 'Inferred by Facebook',
    inferredLead: 'Facebook worked these out from your activity; you never filled them in. They’re shown exactly as they appear in your download, whether or not they’re right about you.',
    inferredStat: 'Things Facebook inferred',
    fromFile: 'See it in your download',
    guessesTitle: 'What Facebook inferred about you',
    interestsTitle: (k: number) => `${n(k)} interests Facebook picked for you`,
    interestsLead: 'Advertisers can choose to show ads to people in these categories.',
    categoriesTitle: 'Other groups you were put in',
    filterInterests: 'Search interests',
    aboutTitle: 'What you told Facebook',
    aboutLead: 'Details you gave Facebook, or that it keeps for your account.',
    lastLocation: 'Last location Facebook recorded',
    devicesTitle: 'Your devices, as Facebook sees them',
    devicesLead: (gpus: number) =>
      `Facebook recorded hardware details from your devices, including ${plural(gpus, 'graphics chip', 'graphics chips')}, memory size and processor cores. Details like these help recognise a device even without cookies.`,
    gpus: 'Graphics chips',
    ram: 'Memory (GB)',
    cores: 'Processor cores',
    deviceIds: (k: number) => `${plural(k, 'device detail', 'device details')} recorded in total, including advertising and hardware IDs.`,
    locationTitle: 'Locations on file for you',
    locationLead: 'Locations recorded in your download, from your activity and settings.',
    showPersonal: 'Show personal details',
    hidePersonal: 'Hide personal details',
    hiddenNote: 'Personal details like emails, phone numbers and IDs are blurred so you can share your screen safely.',
    guessTitles: {
      age_group_prediction: 'Predicted age group',
      predicted_languages: 'Predicted languages',
      languages_you_may_know: 'Languages you may know',
      locations_of_interest: 'Locations of interest',
      how_active_we_think_you_are_on_marketplace: 'Marketplace activity level',
    } as Record<string, string>,
  },

  security: {
    lead: (times: number) =>
      `Every time your account is used, Facebook records when, from where (IP address and city) and on what device. Your export has ${n(times)} of these records.`,
    stats: { logins: 'Sign-ins recorded', places: 'Cities', countries: 'Countries', devices: 'Kinds of device' },
    placesTitle: 'Where your account was used',
    devicesTitle: 'Devices used',
    overTimeTitle: 'Account activity over time',
    sessionsTitle: 'Where you are logged in right now',
    sessionsLead: 'Sessions that were still active when you downloaded your data.',
    lastActive: 'Last active',
    started: 'Started',
    settingsTitle: 'Security settings on file',
    note: 'Facebook only keeps about the last two years of login history, so older sign-ins don’t appear.',
  },

  activity: {
    lead: (k: number) => `Facebook logs far more than your posts. Here are ${n(k)} actions it recorded, from likes to the profiles you looked at.`,
    kindsTitle: 'What gets recorded',
    whenTitle: 'When you use Facebook',
    whenLead: (day: string, hour: string) => `You're most active on ${day}s around ${hour}.`,
    whenNote: 'Brighter squares mean more activity at that time of the week, in your local time.',
    overTimeTitle: 'Your activity month by month',
    searchesTitle: (k: number) => `${n(k)} searches saved`,
    lookupsTitle: 'Searches and profile visits',
    lookupsLead: 'Facebook keeps what you type into its search box and which profiles you open.',
    searchesLead: 'Facebook keeps what you typed into its search box. Your most repeated searches:',
    visitsTitle: (k: number) => `${n(k)} profile visits logged`,
    visitsLead: 'Facebook records profiles you look at. The ones you visited most:',
  },

  people: {
    lead: 'Your friends list, the people you interact with most, and every message stored in your account.',
    stats: { friends: 'Friends', removed: 'Friends removed', following: 'People you follow', declined: 'Requests you declined' },
    friendsTitle: 'Friends added and removed each year',
    added: 'Added',
    removedLabel: 'Removed',
    topTitle: 'People you interact with most',
    topLead: 'Counted from messages, likes and comments.',
    msgShort: ['message', 'messages'],
    likesShort: ['like', 'likes'],
    commentsShort: ['comment', 'comments'],
    messagesTitle: (k: number) => `${n(k)} messages stored`,
    messagesLead: (sent: number, received: number) => `You sent ${n(sent)} and received ${n(received)}.`,
    boxes: {
      inbox: ['Inbox', 'Your normal conversations.'],
      filtered_threads: ['Filtered', 'Messages Facebook filtered as possible spam or from people you don’t know.'],
      message_requests: ['Message requests', 'Messages from people you weren’t connected to.'],
      archived_threads: ['Archived', 'Conversations you archived. They are still kept.'],
      e2ee_cutover: ['End-to-end encrypted', 'Chats from before Messenger switched to encryption, kept as a copy.'],
    } as Record<string, [string, string]>,
    conversations: (k: number) => plural(k, 'conversation', 'conversations'),
  },

  media: {
    lead: (photos: number, videos: number) =>
      `Facebook keeps a copy of ${plural(photos, 'photo', 'photos')} and ${plural(videos, 'video', 'videos')} from your posts, albums and messages, along with details about each one.`,
    stats: { photos: 'Photos', videos: 'Videos', messages: 'From messages', ip: 'Kept the upload IP address' },
    ipHint: 'The internet address you uploaded from, which can reveal roughly where you were.',
    filters: { all: 'All', post: 'Posts & albums', message: 'Messages', video: 'Videos' },
    undated: 'Date unknown',
    none: 'No photos or videos in this export',
    noneHint: 'Your export may have been requested without media, or with low media quality.',
    sampleHint: 'The sample data has no photos. Import your own export to see yours.',
    viewer: {
      uploaded: 'Uploaded',
      taken: 'Taken',
      ip: 'Upload IP address',
      album: 'Album',
      from: 'Appeared in',
      file: 'File',
      open: 'Open the record',
      prev: 'Previous',
      next: 'Next',
      close: 'Close',
    },
  },

  timeline: {
    lead: 'Every dated record in your export. Drag across the chart to zoom in on a period, or pick a kind of activity below.',
    search: 'Search titles and messages',
    allKinds: 'Everything',
    shown: (shown: number, total: number) => `${n(shown)} of ${n(total)} records`,
    more: 'Show more',
    olderNote: (k: number, since: string) => `${plural(k, 'older record', 'older records')} from before ${since} are listed below but left off the chart.`,
  },

  raw: {
    lead: 'Exactly what Facebook gave you, file by file. Pick a file to read it. Files marked “Understood” feed the other tabs.',
  },

  common: {
    details: 'Click any row to see the records behind it.',
    times: (k: number) => plural(k, 'time', 'times'),
    records: (k: number) => plural(k, 'record', 'records'),
    items: (k: number) => plural(k, 'item', 'items'),
    noData: 'Nothing in your export for this.',
  },
};

/** Report wording, for the platform on screen. */
export const report = byPlatform<typeof FB_REPORT>(FB_REPORT, { instagram: IG_REPORT });

/** Friendly names for event types. Unknown types fall back to "Other logged activity". */
export const TYPE_LABELS: Record<string, string> = {
  reaction: 'Likes and reactions',
  comment: 'Comments',
  group_comment: 'Comments in groups',
  post: 'Posts',
  check_in: 'Check-ins',
  post_on_other_profile: 'Posts on other profiles',
  group_post: 'Posts in groups',
  photo_upload: 'Photos uploaded',
  video_upload: 'Videos uploaded',
  search: 'Searches',
  message_sent: 'Messages you sent',
  message_received: 'Messages you received',
  friend_added: 'Friends added',
  friend_removed: 'Friends removed',
  friend_request_sent: 'Friend requests sent',
  friend_request_received: 'Friend requests received',
  friend_request_rejected: 'Friend requests declined',
  followed: 'People you followed',
  page_liked: 'Pages liked',
  page_followed: 'Pages followed',
  page_unfollowed: 'Pages unfollowed',
  group_membership: 'Groups joined or left',
  item_saved: 'Saved posts and links',
  event_joined: 'Events you went to',
  event_interested: 'Events you were interested in',
  event_invited: 'Event invitations',
  event_declined: 'Events you declined',
  profile_visit: 'Profiles you looked at',
  item_viewed: 'Marketplace items you looked at',
  notification: 'Notifications sent to you',
  ad_viewed: 'Ads you saw',
  ad_interaction: 'Ads you clicked or hid',
  off_meta_activity: 'Reports from other apps and websites',
  login: 'Sign-ins',
  logout: 'Sign-outs',
  session_updated: 'Account use recorded',
  session_started: 'Active sessions',
  password_changed: 'Password changes',
  password_reset_requested: 'Password reset requests',
  account_activity: 'Other account activity',
  // Instagram
  story_viewed: 'Stories you watched',
  post_viewed: 'Posts you viewed',
  video_watched: 'Videos you watched',
  thread_post_viewed: 'Threads posts you saw',
  link_visited: 'Websites you opened in the app',
  story_sticker: 'Story polls and questions you answered',
  story_posted: 'Stories you shared',
  deleted_content: 'Deleted posts still kept',
  repost: 'Reposts',
  profile_photo: 'Profile photo changes',
  profile_changed: 'Profile changes',
  privacy_changed: 'Account privacy changes',
  follower_added: 'Followers',
  close_friend: 'Close Friends',
  story_hidden_from: 'People you hid stories from',
  follow_request_sent: 'Follow requests you sent',
  unfollowed: 'Accounts you unfollowed',
  suggestion_removed: 'Suggestions you dismissed',
  restricted: 'Accounts you restricted or blocked',
  threads_follower: 'Threads followers',
  threads_follow_change: 'Threads follow changes',
  not_interested: 'Things you marked “not interested”',
  lead_form: 'Answers you gave advertisers',
  ai_conversation: 'Conversations with Meta AI',
  logged: 'Other logged activity',
};
export const typeLabel = (t: string) => TYPE_LABELS[t] ?? TYPE_LABELS.logged!;

/** What other companies' tracking events mean, in plain words. */
export const OFF_META_LABELS: Record<string, string> = {
  PAGE_VIEW: 'Viewed a page',
  VIEW_CONTENT: 'Looked at a product or page',
  PURCHASE: 'Made a purchase',
  ADD_TO_CART: 'Added something to a cart',
  INITIATE_CHECKOUT: 'Started checking out',
  ADD_PAYMENT_INFO: 'Added payment details',
  COMPLETE_REGISTRATION: 'Signed up for an account',
  LEAD: 'Filled in a form',
  SEARCH: 'Searched their site',
  ACTIVATE_APP: 'Opened their app',
  SUBSCRIBE: 'Subscribed',
  START_TRIAL: 'Started a free trial',
  CONTACT: 'Contacted them',
  CUSTOM: 'Other activity they chose to track',
};
export const offMetaLabel = (code: string) =>
  OFF_META_LABELS[code] ?? code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' ');

export const BOX_LABEL = (box: string) => report.people.boxes[box]?.[0] ?? box.replace(/_/g, ' ');
