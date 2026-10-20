/**
 * Instagram wording. Two parts:
 *   IG_TABS / IG_REPORT  overrides for screens shared with Facebook, applied through byPlatform()
 *   igReport             wording for the Instagram-only screens (views/instagram/)
 * Every sentence is written for Instagram; nothing is find-and-replaced from the Facebook copy.
 */
import { fmt } from './strings';

const n = fmt.number;
const plural = (count: number, one: string, many: string) => `${n(count)} ${count === 1 ? one : many}`;

export const IG_TABS = {
  overview: { title: "Here's what Instagram has on you" },
  plan: { title: 'Make Instagram collect and show less' },
  profile: { title: 'What Instagram knows and infers about you' },
  activity: { title: 'What Instagram records about what you do and watch' },
  people: { title: 'Who you follow and talk to' },
};

export const IG_REPORT = {
  profile: {
    lead: 'Everything on this page is copied exactly from your download. Some of it you told Instagram; the rest Instagram worked out from what you do, and those parts are labelled “Inferred by Instagram”.',
    inferredBadge: 'Inferred by Instagram',
    inferredLead: 'Instagram worked these out from your activity; you never filled them in. They’re shown exactly as they appear in your download, whether or not they’re right about you.',
    inferredStat: 'Things Instagram inferred',
    guessesTitle: 'What Instagram inferred about you',
    interestsTitle: (k: number) => `${n(k)} interests Instagram picked for you`,
    categoriesTitle: 'Groups advertisers can reach you through',
    aboutTitle: 'What you told Instagram',
    aboutLead: 'Details you gave Instagram, or that it keeps for your account, including autofill and checkout details.',
    devicesTitle: 'Your devices, as Instagram sees them',
    devicesLead: () => 'Instagram recorded an ID for each device you used, and which camera features each one supports. IDs like these help recognise a device even without cookies.',
    deviceIds: (k: number) => `${plural(k, 'device ID', 'device IDs')} recorded.`,
    lastLocation: 'Last location Instagram recorded',
    guessTitles: {
      locations_of_interest: 'Locations of interest',
      profile_based_in: 'Where your profile is based',
      interest_categories: 'Interest categories',
    } as Record<string, string>,
  },
  media: {
    lead: (photos: number, videos: number) =>
      `Instagram keeps a copy of ${plural(photos, 'photo', 'photos')} and ${plural(videos, 'video', 'videos')} from your posts, stories and messages, along with details about each one.`,
    filters: { post: 'Posts & stories' },
    noneHint: 'Your download may have been requested without media, or with low media quality.',
  },
  raw: {
    lead: 'Exactly what Instagram gave you, file by file. Pick a file to read it. Files marked “Understood” feed the other tabs.',
  },
  overview: {
    yearsNote: 'Each bar is everything Instagram logged that year, split by kind.',
  },
  ads: {
    lead: 'Businesses reach you on Instagram by uploading a list of their customers, or a list built from what people did on their website, app or store. Either way, Meta matched your profile to it.',
    uploadedTitle: 'Uploaded a list that matched your profile',
    uploadedText: 'They had details like your email address or phone number, for example from a purchase or a sign-up, and Meta matched them to your Instagram profile.',
    activityTitle: 'Matched you from what you did with them',
    activityText: 'Their list came from what people did on their website, app or store, and Meta matched you to it.',
    filterUploaded: 'Uploaded a list',
    filterActivity: 'From your activity',
  },
};

/** Wording for the Instagram-only screens. */
export const igReport = {
  overview: {
    lead: (years: number, from: string, files: number) =>
      `Your download covers ${years >= 1 ? `${years.toFixed(1)} years` : 'less than a year'}, back to ${from}, spread over ${n(files)} files. It was read on this device and nothing was uploaded.`,
    findings: {
      advertisers: (k: number) => `${n(k)} businesses have your information`,
      advertisersSub: (uploaded: number, activity: number) =>
        `${n(uploaded)} matched you with a customer list. ${n(activity)} matched you from what you did on their website, app or store.`,
      watched: (k: number) => `Instagram logged ${n(k)} things you looked at`,
      watchedSub: 'Stories, videos and posts you viewed are recorded one by one, with the account and the time.',
      links: (k: number) => `${plural(k, 'web page', 'web pages')} you opened were kept`,
      linksSub: (sites: number) => `On ${plural(sites, 'website', 'websites')}, opened in Instagram’s built-in browser.`,
      follows: (followers: number, following: number) => `${plural(followers, 'follower', 'followers')}, ${n(following)} following`,
      followsSub: (mutual: number, close: number) => `You and ${plural(mutual, 'account follow', 'accounts follow')} each other. ${plural(close, 'person is', 'people are')} in your Close Friends.`,
      messages: (k: number) => `${n(k)} messages are stored`,
      messagesSub: (threads: number) => `From ${plural(threads, 'conversation', 'conversations')}, including ones you may have forgotten.`,
      categories: (k: number) => `Instagram placed you in ${plural(k, 'ad category', 'ad categories')}`,
      categoriesSub: 'Advertisers can choose these to decide who sees their ads.',
    },
    watchedParts: { stories: 'Stories', videos: 'Videos', posts: 'Posts', threads: 'Threads posts' },
  },
  ads: {
    stats: { businesses: 'Businesses with your info', uploaded: 'Uploaded a list', activity: 'From your activity', adsSeen: 'Ads you saw' },
    listTitle: 'Every business with your information',
    listLead: 'Search the full list. A square means they uploaded a customer list that matched you; a circle means their list came from your activity with them.',
    adsTitle: 'Ads you saw and clicked',
    adsLead: (seen: number, clicked: number) => `Instagram kept a list of ${plural(seen, 'ad', 'ads')} you saw recently and ${plural(clicked, 'ad', 'ads')} you clicked.`,
    topSeen: 'Accounts whose ads you saw most',
    formsTitle: (k: number) => `${plural(k, 'answer', 'answers')} you gave advertisers`,
    formsLead: 'When you fill in a form inside an ad, the answers go to the business. Instagram keeps a copy of the questions and answers.',
    formsOpen: 'See the questions and answers',
    categoriesTitle: (k: number) => `${plural(k, 'category', 'categories')} advertisers can reach you through`,
    categoriesLead: 'Instagram sorted you into these groups. Advertisers pick groups to decide who sees an ad.',
    notInterested: (k: number) => `You told Instagram ${plural(k, 'time', 'times')} that you weren’t interested in something.`,
    settingsTitle: 'Ad settings on file',
    settings: {
      ad_optout_third_party: ['Ads using data from ad partners', 'Opted out', 'Not opted out'],
      gpc: ['“Don’t sell or share” signal from your browser', 'Received', 'Not received'],
      ads_about_meta_optout: ['Ads about Meta', 'Opted out', 'Not opted out'],
    } as Record<string, [string, string, string]>,
  },
  activity: {
    lead: (k: number) => `Instagram logs far more than your posts. Here are ${n(k)} things it recorded, from likes to every story you watched.`,
    stats: { actions: 'Things recorded', likes: 'Likes', watched: 'Things you looked at', links: 'Web pages you opened' },
    kindsTitle: 'What gets recorded',
    watchedTitle: 'What you watched, as Instagram recorded it',
    watchedLead: 'Each story, video, post and Threads post you looked at is kept as its own record, with whose it was and when.',
    topWatchedTitle: 'Accounts you watched most',
    topWatchedLead: 'Counted from stories, videos and posts you viewed.',
    linksTitle: 'Websites you opened inside Instagram',
    linksLead: (k: number) => `Instagram’s built-in browser kept ${plural(k, 'web page', 'web pages')} you opened from posts, ads and bios, with the time you spent on each.`,
    sitesTitle: 'Sites you opened most',
    whenTitle: 'When you use Instagram',
    whenLead: (day: string, hour: string) => `You're most active on ${day}s around ${hour}.`,
    whenNote: 'Brighter squares mean more activity at that time of the week, in your local time. Messages you received are left out.',
    overTimeTitle: 'Your activity month by month',
    searchesTitle: (k: number) => `${plural(k, 'search', 'searches')} saved`,
    searchesLead: 'Instagram keeps the words and profiles you searched for. Your most repeated searches:',
  },
  people: {
    lead: 'Who follows you, who you follow, the people you interact with most, and every message stored in your account.',
    stats: { followers: 'Followers', following: 'Following', mutual: 'Follow each other', closeFriends: 'Close Friends' },
    followTitle: 'Followers and following',
    followLead: (mutual: number) => `${plural(mutual, 'account follows', 'accounts follow')} you and is followed back.`,
    followParts: { mutual: 'Follow each other', youOnly: 'Only you follow them', themOnly: 'Only they follow you' },
    listsTitle: 'Lists Instagram keeps about your connections',
    lists: {
      close_friend: 'People in your Close Friends',
      story_hidden_from: 'People you hid your stories from',
      follow_request_sent: 'Follow requests you sent',
      unfollowed: 'Accounts you unfollowed recently',
      suggestion_removed: 'Suggested accounts you dismissed',
      restricted: 'Accounts you restricted or blocked',
      threads_follower: 'Your Threads followers',
    } as Record<string, string>,
    topTitle: 'People you interact with most',
    topLead: 'Counted from messages, likes and comments.',
    messagesTitle: (k: number) => `${n(k)} messages stored`,
    messagesLead: (sent: number, received: number) => `You sent ${n(sent)} and received ${n(received)}.`,
    boxes: {
      inbox: ['Inbox', 'Your normal conversations.'],
      message_requests: ['Message requests', 'Messages from people you didn’t follow, including ones you never opened.'],
    } as Record<string, [string, string]>,
    aiChats: (k: number) => `${plural(k, 'conversation', 'conversations')} with Meta AI ${k === 1 ? 'is' : 'are'} kept too.`,
    conversations: (k: number) => plural(k, 'conversation', 'conversations'),
  },
  security: {
    lead: (k: number) => `Instagram records logins, profile changes and privacy changes, with the internet address and the device used. Your download has ${plural(k, 'of these records', 'of these records')}.`,
    stats: { records: 'Records', devices: 'Kinds of device', ips: 'Internet addresses', privacy: 'Privacy changes' },
    mapTitle: 'Your last known location',
    mapLead: 'Instagram doesn’t record city names with logins, only internet addresses. It did keep the last location your phone reported.',
    noMap: 'Your download has no stored location.',
    ipsTitle: 'Internet addresses recorded',
    ipsLead: 'An internet address points to the network you were on, and roughly where.',
    devicesTitle: 'Devices used',
    overTimeTitle: 'Account activity over time',
    privacyTitle: 'When your account switched between public and private',
    detailsTitle: 'Account details on file',
    note: (logins: number) => `Your download lists ${plural(logins, 'login', 'logins')}. Older ones may not be included.`,
  },
};
