/**
 * A complete, invented Facebook export for the demo and for tests.
 *
 * Every person, business, app, message and number here is made up. File paths, JSON
 * shapes and quirks (label_values nesting, seconds vs milliseconds, 0 meaning "not set",
 * Latin-1 mojibake on non-ASCII text) mirror real exports, so the demo goes through the
 * same importer and parsers as a real export and every tab has something to show.
 *
 * Pure and deterministic: no browser APIs, same output every run. Photos are described
 * here (`image`) and drawn by the browser loader (demo/loadDemo.ts).
 */

export interface DemoFile {
  path: string;
  json?: unknown;
  /** A picture to draw: hue and seed for an abstract scene. */
  image?: { hue: number; seed: number };
  /** A short video placeholder (bytes only; browsers show the video icon). */
  video?: true;
}

// ---------------------------------------------------------------- helpers

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 20261001;
let R = rng(SEED);
const pick = <T,>(a: readonly T[]): T => a[Math.floor(R() * a.length)]!;
const int = (lo: number, hi: number) => lo + Math.floor(R() * (hi - lo + 1));
const chance = (p: number) => R() < p;

/** The export date. All activity happens before it. */
const END = Date.UTC(2026, 8, 28, 18, 0, 0);
const DAY = 864e5;
const sec = (ms: number) => Math.floor(ms / 1000);

/** A time between two dates, weighted towards waking hours in US Pacific time. */
function when(fromMs: number, toMs: number): number {
  const day = Math.floor(fromMs / DAY) + Math.floor(R() * Math.max(1, (toMs - fromMs) / DAY));
  // Busy around lunch and evenings (UTC = Pacific + 7/8h).
  const localHour = pick([7, 8, 9, 12, 12, 13, 13, 13, 17, 18, 19, 20, 20, 21, 21, 22, 23]);
  return day * DAY + ((localHour + 7) % 24) * 3600e3 + int(0, 3599) * 1000;
}
const yearsAgo = (y: number) => END - y * 365.25 * DAY;
const sortedTimes = (n: number, from: number, to = END) => Array.from({ length: n }, () => when(from, to)).sort((a, b) => b - a);

/** Facebook writes text as UTF-8 bytes shown as Latin-1 characters. */
export function mojibake<T>(v: T): T {
  const enc = new TextEncoder();
  const fix = (s: string) => (/[^\x00-\x7f]/.test(s) ? String.fromCharCode(...enc.encode(s)) : s);
  const walk = (x: unknown): unknown =>
    typeof x === 'string' ? fix(x) : Array.isArray(x) ? x.map(walk) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, val]) => [k, walk(val)])) : x;
  return walk(v) as T;
}

const lv = (label: string, value: string | number | boolean) => ({ label, value: String(value) });
const lvTime = (label: string, ms: number) => ({ label, timestamp_value: sec(ms) });
const record = (label_values: unknown[], timestamp?: number, extra: Record<string, unknown> = {}) => ({
  ...(timestamp !== undefined ? { timestamp: sec(timestamp) } : {}),
  media: [],
  label_values,
  fbid: String(int(1e14, 9e14)),
  ...extra,
});

// ---------------------------------------------------------------- invented people and places

export const DEMO_OWNER = 'Robin Calder';
const FIRST = ['Avery', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Quinn', 'Taylor', 'Jamie', 'Drew', 'Sam', 'Alex', 'Parker', 'Rowan', 'Emery', 'Noa', 'Mateo', 'Lucía', 'Zoë', 'Søren', 'Amara', 'Kenji', 'Priya', 'Theo', 'Inès', 'Malik', 'Hana', 'Felix', 'Nadia', 'Oskar', 'Leila'];
const LAST = ['Stone', 'Vale', 'Marsh', 'Lin', 'Pike', 'Harper', 'Brook', 'Fox', 'Ellis', 'Navarro', 'Kerr', 'Shaw', 'Moreau', 'Wu', 'Hale', 'Cole', 'Okafor', 'Nakamura', 'Lindqvist', 'García', 'Novak', 'Haddad', 'Byrne', 'Costa'];
function makePeople() {
  const set = new Set<string>();
  while (set.size < 190) set.add(`${pick(FIRST)} ${pick(LAST)}`);
  set.delete(DEMO_OWNER);
  return [...set];
}

const PLACES = [
  { city: 'Portland', region: 'Oregon', country: 'US', lat: 45.52, lng: -122.68, w: 60 },
  { city: 'Seattle', region: 'Washington', country: 'US', lat: 47.61, lng: -122.33, w: 12 },
  { city: 'Denver', region: 'Colorado', country: 'US', lat: 39.74, lng: -104.99, w: 6 },
  { city: 'Chicago', region: 'Illinois', country: 'US', lat: 41.88, lng: -87.63, w: 5 },
  { city: 'San Diego', region: 'California', country: 'US', lat: 32.72, lng: -117.16, w: 5 },
  { city: 'Toronto', region: 'Ontario', country: 'CA', lat: 43.65, lng: -79.38, w: 4 },
  { city: 'Mexico City', region: 'Ciudad de México', country: 'MX', lat: 19.43, lng: -99.13, w: 4 },
  { city: 'Lisbon', region: 'Lisboa', country: 'PT', lat: 38.72, lng: -9.14, w: 3 },
  { city: 'Reykjavík', region: 'Capital Region', country: 'IS', lat: 64.15, lng: -21.94, w: 2 },
];
const place = () => {
  let r = R() * PLACES.reduce((s, p) => s + p.w, 0);
  for (const p of PLACES) if ((r -= p.w) <= 0) return p;
  return PLACES[0]!;
};
// Documentation-only address ranges (RFC 5737), never real.
const ip = () => `${pick(['192.0.2', '198.51.100', '203.0.113'])}.${int(1, 254)}`;
const UAS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/512.0.0]',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
];
const uaWeights = [40, 15, 12, 6, 3, 2];
const ua = () => {
  let r = R() * uaWeights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < UAS.length; i++) if ((r -= uaWeights[i]!) <= 0) return UAS[i]!;
  return UAS[0]!;
};

// Invented businesses: word parts combined, so no real company is meant.
const B1 = ['North', 'Blue', 'Bright', 'Silver', 'Green', 'Red', 'Golden', 'Clear', 'Swift', 'Urban', 'Lake', 'Pine', 'Stone', 'Maple', 'Cedar', 'Harbor', 'Summit', 'River', 'Sun', 'Moon', 'Fern', 'Copper', 'Willow', 'Amber'];
const B2 = ['field', 'wave', 'leaf', 'path', 'crest', 'gate', 'line', 'point', 'brook', 'ridge', 'nest', 'light'];
const B3 = ['Outfitters', 'Bank', 'Shoes', 'Travel', 'Games', 'Health', 'Coffee', 'Home', 'Fitness', 'Insurance', 'Realty', 'Pets', 'Books', 'Market', 'Studio', 'Motors', 'Wireless', 'Foods', 'Beauty', 'Labs', 'Credit Union', 'Furniture', 'Streaming', 'Tickets'];
function makeBusinesses() {
  const set = new Set<string>();
  while (set.size < 1650) set.add(`${pick(B1)}${pick(B2)} ${pick(B3)}`);
  return [...set];
}

// ---------------------------------------------------------------- build

export function buildSyntheticExport(): DemoFile[] {
  R = rng(SEED); // same export every time
  const people = makePeople();
  const friends = people.slice(0, 150);
  const strangers = people.slice(150);
  const close = friends.slice(0, 14); // the people you message most
  const businesses = makeBusinesses();
  const files: DemoFile[] = [];
  const add = (path: string, json: unknown) => files.push({ path, json: mojibake(json) });
  const created = Date.UTC(2012, 2, 14, 19, 4, 0);

  // ---- profile
  add('personal_information/profile_information/profile_information.json', {
    profile_v2: {
      name: { full_name: DEMO_OWNER, first_name: 'Robin', middle_name: '', last_name: 'Calder' },
      emails: { emails: ['robin.calder@example.com'], previous_emails: ['rcalder.old@example.net'], pending_emails: [], ad_account_emails: [] },
      birthday: { year: 1993, month: 6, day: 21 },
      gender: { gender_option: 'NONBINARY', pronoun: 'THEY' },
      previous_names: [],
      other_names: [],
      hometown: { name: 'Eugene, Oregon', timestamp: 0 },
      current_city: { name: 'Portland, Oregon', timestamp: sec(yearsAgo(6)) },
      education_experiences: [{ name: 'Example State University', graduated: true, concentrations: ['Graphic design'], school_type: 'College', timestamp: sec(yearsAgo(11)) }],
      work_experiences: [
        { employer: 'Fernlight Studio', title: 'Designer', description: '', start_timestamp: sec(yearsAgo(5)), timestamp: sec(yearsAgo(5)) },
        { employer: 'Maplepath Books', title: 'Bookseller', description: '', start_timestamp: sec(yearsAgo(10)), timestamp: sec(yearsAgo(10)) },
      ],
      websites: [],
      screen_names: [],
      phone_numbers: [{ phone_type: 'Mobile', phone_number: '+15035550142', verified: true, creation_time: sec(yearsAgo(9)) }],
      relationship: { status: 'In a relationship', timestamp: sec(yearsAgo(3)) },
      registration_timestamp: sec(created),
      profile_uri: 'https://www.facebook.com/robin.calder.example',
      registration_ip: '198.51.100.23',
      intro_bio: { name: 'Designer · plant person · bad at goodbyes ☕', timestamp: sec(yearsAgo(4)) },
    },
  });

  // ---- connections: more friends early on, a few each year after
  const friendTimes = friends.map((_, i) => when(created + (i < 90 ? 0 : (i / friends.length) * (END - created) * 0.6), i < 90 ? created + 4 * 365 * DAY : END));
  add('connections/friends/your_friends.json', { friends_v2: friends.map((name, i) => ({ name, timestamp: sec(friendTimes[i]!) })).sort((a, b) => b.timestamp - a.timestamp) });
  add('connections/friends/removed_friends.json', { deleted_friends_v2: strangers.slice(0, 28).map((name) => ({ name, timestamp: sec(when(yearsAgo(9), END)) })) });
  add('connections/friends/sent_friend_requests.json', { sent_requests_v2: strangers.slice(28, 34).map((name) => ({ name, timestamp: sec(when(yearsAgo(2), END)) })) });
  add('connections/friends/rejected_friend_requests.json', { rejected_requests_v2: strangers.slice(14, 30).map((name) => ({ name, timestamp: sec(when(yearsAgo(8), END)) })) });
  add('connections/friends/received_friend_requests.json', { received_requests_v2: strangers.slice(30, 36).map((name) => ({ name, timestamp: sec(when(yearsAgo(1), END)) })) });
  add("connections/followers/who_you've_followed.json", { following_v3: friends.slice(20, 70).map((name) => ({ name, timestamp: sec(when(yearsAgo(8), END)) })) });

  // ---- security: Facebook keeps about two years of account activity
  const sessionDevices: { ua: string; p: (typeof PLACES)[number]; ip: string }[] = [];
  const activity = sortedTimes(380, yearsAgo(2)).map((t) => {
    const p = place();
    const u = ua();
    const action = chance(0.55) ? 'Session updated' : chance(0.9) ? 'Login' : pick(['Password change', 'Login failure', 'Logout']);
    const address = ip();
    if (action === 'Login' && sessionDevices.length < 6 && !sessionDevices.some((d) => d.ua === u)) sessionDevices.push({ ua: u, p, ip: address });
    return { action, timestamp: sec(t), ip_address: address, user_agent: u, datr_cookie: `demo${int(1e6, 9e6)}`, city: p.city, region: p.region, country: p.country, site_name: 'www.facebook.com', port: int(1024, 65000) };
  });
  add('security_and_login_information/account_activity.json', { account_activity_v2: activity });
  add('security_and_login_information/logins_and_logouts.json', {
    account_accesses_v2: activity.filter((a) => a.action === 'Login').slice(0, 12).map((a) => ({ action: a.action, timestamp: a.timestamp, site: 'www.facebook.com', ip_address: a.ip_address })),
  });
  add("security_and_login_information/where_you're_logged_in.json", {
    active_sessions_v2: sessionDevices.map((d) => {
      const createdAt = when(yearsAgo(1.5), END - 30 * DAY);
      return { created_timestamp: sec(createdAt), updated_timestamp: sec(when(END - 20 * DAY, END)), ip_address: d.ip, user_agent: d.ua, datr_cookie: `demo${int(1e6, 9e6)}`, device: '', location: `${d.p.city}, ${d.p.region}`, app: /FBIOS/.test(d.ua) ? 'Facebook for iPhone' : 'Facebook', session_type: '' };
    }),
  });
  add('security_and_login_information/ip_address_activity.json', {
    used_ip_address_v2: activity.slice(0, 8).map((a) => ({ ip: a.ip_address, action: 'Login', timestamp: a.timestamp, user_agent: a.user_agent })),
  });
  add('security_and_login_information/two-factor_authentication.json', record([lv('State', 'Disabled'), lvTime('Creation time', created), { label: 'Update time', timestamp_value: 0 }]));
  add('security_and_login_information/login_protection_data.json', [
    record([lv('Type', 'Login cookie'), lv('Value', 'demo-cookie'), lv('IP address', ip()), lvTime('Last updated time', when(yearsAgo(1), END))]),
  ]);
  add('preferences/preferences/login_alerts_settings.json', record([lv('Notifications enabled', true), lv('Notification enabled reason', 'Login alerts enabled by default'), lv('Enabled email address', 'robin.calder@example.com')]));

  // ---- ads: two lists of businesses, interests and categories
  const uploaded = businesses.slice(0, 420);
  const shared = businesses.slice(360, 1650);
  add('ads_information/advertisers_using_your_activity_or_information.json', {
    media: [],
    label_values: [
      { label: 'A list uploaded or used by the advertiser', vec: uploaded.map((value) => ({ value })) },
      { label: "Interactions you may have had with the advertiser's website, app or store", vec: shared.map((value) => ({ value })) },
    ],
    fbid: '100000000000001',
  });
  add('ads_information/ads_viewed.json', sortedTimes(110, yearsAgo(0.5)).map((t) => {
    const b = pick(businesses.slice(0, 80));
    return record([{ label: 'Ad', value: b, href: 'https://www.facebook.com/ads/library/' }, lvTime('Time', t)]);
  }));
  add("ads_information/advertisers_you've_interacted_with.json", sortedTimes(26, yearsAgo(3)).map((t) =>
    record([lv('Action', pick(['Clicked ad', 'Clicked ad', 'Hid ad'])), lv('Title', pick(businesses.slice(0, 120)))], t),
  ));
  add('ads_information/other_categories_used_to_reach_you.json', record([
    { label: 'Name', vec: ['Frequent travelers', 'Close friends of people with birthdays in a month', 'Facebook access (mobile): smartphones and tablets', 'Engaged shoppers', 'Early technology adopters', 'Owns: iPhone 15', 'Primary email domain: example.com', 'Lives away from hometown', 'Commuters', 'Returned from travels 2 weeks ago', 'Pet owners', 'Small business owners'].map((value) => ({ value })) },
  ]));
  const TOPICS = ['Hiking', 'Coffee', 'Graphic design', 'Houseplants', 'Indie music', 'Cycling', 'Camping', 'Typography', 'Vinyl records', 'Running', 'Yoga', 'Baking', 'Board games', 'Photography', 'Travel', 'Vegetarian cuisine', 'Interior design', 'Podcasts', 'Science fiction', 'Thrift stores', 'Climbing', 'Craft beer', 'Electric vehicles', 'Mobile phones', 'Online shopping', 'Sneakers', 'Street food', 'Ceramics', 'Film photography', 'Gardening', 'Jazz', 'Comedy', 'Documentary films', 'Kayaking', 'National parks', 'Cats', 'Dogs', 'Fashion accessories', 'Skin care', 'Personal finance', 'Real estate', 'Video games', 'Tea', 'Cooking', 'Farmers markets', 'Woodworking', 'Architecture', 'Museums', 'Poetry', 'Fantasy novels', 'Tattoos', 'Meditation', 'Swimming', 'Snowboarding', 'Road trips', 'Bicycles', 'Laptops', 'Headphones', 'Smart home', 'Volunteering'];
  add('logged_information/other_logged_information/ads_interests.json', { topics_v2: TOPICS });

  // ---- other businesses reporting activity (off-Meta)
  const APPS = ['Pinecrest Grocery', 'Trailmix Fitness', 'Harborline Airlines', 'Cedar & Co. Furniture', 'Quickcart Deliveries', 'Sunbeam Weather', 'Moonlit Streaming', 'Paperleaf Books', 'Rivertown News', 'Summitstone Bank', 'Glowfern Beauty', 'Stonepath Games'];
  const CODES = ['PAGE_VIEW', 'VIEW_CONTENT', 'SEARCH', 'ADD_TO_CART', 'PURCHASE', 'ACTIVATE_APP', 'COMPLETE_REGISTRATION', 'LEAD', 'CUSTOM'];
  add('apps_and_websites_off_of_facebook/your_activity_off_meta_technologies.json', APPS.map((name, i) =>
    record([lv('ID', String(int(1e14, 9e14))), {
      label: 'Events',
      vec: Array.from({ length: Math.max(2, 40 - i * 3 + int(0, 8)) }, () => ({ dict: [lv('ID', String(int(1e14, 9e14))), lv('Event', pick(CODES)), lvTime('Received on', when(yearsAgo(1), END))] })),
    }], undefined, { title: name }),
  ));
  add('apps_and_websites_off_of_facebook/connected_apps_and_websites.json', {
    installed_apps_v2: [
      ...['Trailmix Fitness', 'Paperleaf Books', 'Bluewave Puzzles', 'Stonepath Games', 'Quickcart Deliveries'].map((name) => ({ name, added_timestamp: sec(when(yearsAgo(6), END)), user_app_scoped_id: int(1e9, 9e9), category: 'active', removed_timestamp: 0 })),
      ...['Pinepoint Quiz', 'Swiftgate Travel', 'Moonlit Streaming'].map((name) => ({ name, added_timestamp: sec(when(yearsAgo(10), yearsAgo(4))), user_app_scoped_id: int(1e9, 9e9), category: 'inactive', removed_timestamp: 0 })),
      ...['Ambercrest Horoscopes', 'Fernpath Photo Editor'].map((name) => ({ name, added_timestamp: 0, user_app_scoped_id: int(1e9, 9e9), category: 'removed', removed_timestamp: 0 })),
    ],
  });
  add('apps_and_websites_off_of_facebook/permissions_you_have_granted_to_apps.json', record([{ label: 'Permissions', vec: [{ value: 'Base' }] }, lvTime('Created time', yearsAgo(6))]));
  add('apps_and_websites_off_of_facebook/your_activity_off_meta_technologies_settings.json', record([
    lv('Profile association state', 'Account association enabled'),
    lvTime('Latest last activity time', END - 3 * DAY),
    lv("Combined number of times you've used these privacy settings", 0),
    lv('Number of times you used clear history settings', 0),
  ]));

  // ---- current settings
  const privacy: [string, string][] = [
    ['Who can see your future posts?', 'Your friends'],
    ["Who can see posts you're tagged in on your profile?", 'Your friends'],
    ['Who can see what others post on your profile?', 'Your friends'],
    ['Who can send you friend requests?', 'Your friends of friends'],
    ['Who can look up your timeline by name?', 'Public'],
    ['Who can look you up using the email address or phone number you provided?', 'Public'],
    ['Who can Facebook suggest your profile to based on your phone number?', 'Your friends of friends'],
    ['Who can Facebook suggest your profile to based on your email address?', 'Only me'],
    ['Who can see your friends list?', 'Only me'],
    ['Who can see your birthday?', 'Your friends'],
    ['Who can see your birth year?', 'Only me'],
    ['Who can see the people and Pages you follow?', 'Your friends'],
    ['Current city', 'Public'],
    ['Hometown', 'Public'],
    ['Relationship', 'Your friends'],
    ['Interested in', 'Only me'],
    ['Languages', 'Public'],
    ['About you', 'Public'],
    ['Political Views', 'Only me'],
    ['Religious Views', 'Only me'],
    ['Music', 'Public'],
    ['Books', 'Public'],
    ['Posts Audience Limit', 'Public'],
    ['Allow others to share your posts to their stories?', 'Public'],
  ];
  add('preferences/preferences/privacy_settings.json', record([{ label: 'Settings', dict: privacy.map(([l, v]) => lv(l, v)) }]));
  add('ads_information/ad_preferences.json', record([
    lv('Is the Digital Advertising Alliance opt-out cookie present in any browser', false),
    lv('Is opted out of using data about interactions between the user and third party sites', false),
    lvTime('When we showed you a notice about ad tracking', yearsAgo(2)),
    { label: 'Added interests', vec: [] },
    lv('Is opted out of using relationship status to target ads', false),
    lv('Is opted out of using religious views to target ads', true),
    lv('Is opted out of using interests to target ads', false),
    lv('Is opted out of using their employer to target ads', false),
    lv('Is opted out of using their job title to target ads', false),
    lv('Is opted out of using political views to target ads', true),
    lv('Is opted out of third party data at the user level', false),
    lv('Received Global Privacy Control (GPC) enable signal from browser settings', false),
    { label: 'Hidden ads', dict: [{ dict: [lv('Event', 'Hide an Ad'), lv('Ad title', 'Summer sale'), lvTime('Creation time', yearsAgo(1))], title: '' }] },
  ]));
  add('ads_information/settings_for_ads_shown_outside_of_meta.json', record([lv('Is opted out from seeing ads off Meta', true)]));
  add('logged_information/location/location_services_setting.json', { location_services_setting_v2: true });
  add('logged_information/location/your_privacy_jurisdiction.json', record([{ label: 'Privacy jurisdictions', vec: [{ value: 'US' }] }, lv('Region privacy jurisdiction', 'US_OR')]));
  add('personal_information/profile_information/contacts_sync_settings.json', record([
    lv('Phone ID', 'DEMO-PHONE-0001'),
    lv('Indicates if syncing is on', 'On'),
    lvTime('Creation time', yearsAgo(5)),
    lvTime('Last sync time', END - 12 * DAY),
    lv('Indicates if your device allows Facebook to read your contacts', true),
  ]));
  add('logged_information/other_logged_information/consents.json', record([lvTime('When you consented to sensitive data processing', yearsAgo(2)), lv('Consent for the processing of your data by ad partners', 'Consented')]));
  add('logged_information/other_logged_information/your_privacy_checkup_interactions.json', [
    record([lvTime('Started', yearsAgo(3.2)), lvTime('Finished', yearsAgo(3.2) + 300e3), lv('Title', 'Who can see what you share')]),
  ]);

  // ---- what Facebook guessed and logged about you
  add('personal_information/other_personal_information/age_group_prediction.json', record([lv('Age group', '25-34')]));
  add('personal_information/profile_information/predicted_languages.json', record([lv('Predicted language(s) based on keyboard', 'English, Spanish'), lv('Predicted language(s) based on region', 'English'), lvTime('Update time', yearsAgo(0.3))], yearsAgo(0.3)));
  add('logged_information/other_logged_information/locations_of_interest.json', record([
    { label: 'Locations of interest', vec: ['Portland, Oregon', 'Seattle, Washington', 'Mount Hood', 'Mexico City', 'Lisbon', 'Reykjavík', 'Bend, Oregon'].map((value) => ({ value })) },
    lv('Usage explanation', 'These are places you may be interested in, based on your activity.'),
  ]));
  add('logged_information/location/primary_location.json', record([{ label: 'Location', dict: [lv('City', 'Portland'), lv('Region', 'Oregon'), lv('Country', 'United States')] }, lv('Zip code', '97201')]));
  add('logged_information/location/last_location.json', { last_location_v2: { time: sec(END - 2 * DAY), coordinate: { latitude: 45.523, longitude: -122.676 } } });
  add('logged_information/location/timezone.json', record([lv('Timezone', 'America/Los_Angeles')]));
  add('logged_information/other_logged_information/detected_hardware.json', [
    record([lvTime('Last full detection time', END - 5 * DAY), lv('GPU vendor', 'Apple'), lv('GPU renderer', 'Apple GPU'), lv('RAM (GB)', '8'), lv('Number of CPU cores', '6')]),
    record([lvTime('Last full detection time', END - 40 * DAY), lv('GPU vendor', 'Google'), lv('GPU renderer', 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)'), lv('RAM (GB)', '16'), lv('Number of CPU cores', '8')]),
  ]);
  add('personal_information/profile_information/your_devices.json', [
    record([lv('Device ID', 'DEMO-DEVICE-A1'), { label: 'Device ID details', dict: [lvTime('first_seen_time', yearsAgo(3)), lvTime('last_seen_time', END - DAY)] }]),
    record([lv('Device ID', 'DEMO-DEVICE-B2'), { label: 'Device ID details', dict: [lvTime('first_seen_time', yearsAgo(6)), lvTime('last_seen_time', yearsAgo(2))] }]),
  ]);

  // ---- your activity
  const POST_TEXT = [
    'First frost on the balcony plants today ❄️', 'Anyone have a good bike shop recommendation?', 'New poster series is finally up at the studio!',
    'Sunday pancakes, as is tradition 🥞', 'Missing the coast already', 'Best taco truck in the city, no contest', 'Packing list for the mountains: done ✅',
    'Three years at the studio today. Thank you all!', 'Rainy day reading list, go:', 'Café con leche and a sketchbook', 'Moving sale this weekend, everything must go',
    'Finished my first ceramics class 🎉', 'That sunset though', 'Happy birthday to my favourite human!', 'Road trip playlist suggestions please',
  ];
  const media = (album: string, albumId: number, n: number, from: number, to: number, hueBase: number) =>
    Array.from({ length: n }, (_, k) => {
      const id = 2000 + albumId * 100 + k;
      const uri = `your_facebook_activity/posts/media/${album.replace(/\s+/g, '')}_${albumId}/${id}.jpg`;
      files.push({ path: uri, image: { hue: (hueBase + k * 23) % 360, seed: id } });
      const t = when(from, to);
      return { uri, creation_timestamp: sec(t), media_metadata: { photo_metadata: { exif_data: [chance(0.7) ? { upload_ip: ip(), taken_timestamp: sec(t - int(1, 6) * 3600e3) } : { upload_ip: ip() }] } }, title: album };
    });
  const mobile = media('Mobile uploads', 1, 14, yearsAgo(8), END, 200);
  const trip = media('Lisbon trip', 2, 8, yearsAgo(2.2), yearsAgo(2.1), 20);
  const profilePics = media('Profile pictures', 3, 4, yearsAgo(12), END, 280);
  add('your_facebook_activity/posts/album/0.json', { name: 'Mobile uploads', photos: mobile, cover_photo: mobile[0], last_modified_timestamp: mobile[0]!.creation_timestamp, description: '' });
  add('your_facebook_activity/posts/album/1.json', { name: 'Lisbon trip', photos: trip, cover_photo: trip[0], last_modified_timestamp: trip[0]!.creation_timestamp, description: 'Pastéis de nata count: too many' });
  add('your_facebook_activity/posts/album/2.json', { name: 'Profile pictures', photos: profilePics, cover_photo: profilePics[0], last_modified_timestamp: profilePics[0]!.creation_timestamp, description: '' });
  const loose = media('Uncategorized', 4, 4, yearsAgo(6), END, 120);
  add('your_facebook_activity/posts/your_uncategorized_photos.json', { other_photos_v2: loose.map(({ title: _t, ...rest }) => rest) });
  const videos = Array.from({ length: 3 }, (_, k) => {
    const uri = `your_facebook_activity/posts/media/videos_5/${2600 + k}.mp4`;
    files.push({ path: uri, video: true });
    return { uri, creation_timestamp: sec(when(yearsAgo(4), END)), media_metadata: { video_metadata: { exif_data: [{ upload_ip: ip(), upload_timestamp: 0 }] } }, title: '', description: pick(POST_TEXT), dubbing_info: [], media_variants: [] };
  });
  add('your_facebook_activity/posts/your_videos.json', { videos_v2: videos });

  const posts = sortedTimes(170, created).map((t, k) => {
    const kind = k % 9 === 0 ? 'checkin' : k % 5 === 0 ? 'photo' : k % 7 === 0 ? 'link' : 'status';
    const p = place();
    const photo = kind === 'photo' ? pick([...mobile, ...trip]) : undefined;
    return {
      timestamp: sec(t),
      attachments:
        kind === 'checkin'
          ? [{ data: [{ place: { name: `${pick(['Blue Fern Café', 'Riverside Park', 'Cedar Hall', 'The Copper Kettle', 'Harbor Market'])}, ${p.city}`, coordinate: { latitude: p.lat + (R() - 0.5) / 50, longitude: p.lng + (R() - 0.5) / 50 }, address: '' } }] }]
          : kind === 'photo' && photo
            ? [{ data: [{ media: photo }] }]
            : kind === 'link'
              ? [{ data: [{ external_context: { url: 'https://example.org/article' } }] }]
              : [],
      data: [{ post: pick(POST_TEXT) }, { update_timestamp: sec(t) }],
      title: kind === 'checkin' ? `${DEMO_OWNER} was at a place.` : kind === 'photo' ? `${DEMO_OWNER} added a new photo.` : kind === 'link' ? `${DEMO_OWNER} shared a link.` : `${DEMO_OWNER} updated their status.`,
    };
  });
  add('your_facebook_activity/posts/your_posts__check_ins__photos_and_videos_1.json', posts);

  const REACT = ['Like', 'Like', 'Like', 'Love', 'Love', 'Haha', 'Wow', 'Care', 'Sad'];
  add('your_facebook_activity/comments_and_reactions/likes_and_reactions.json', sortedTimes(520, yearsAgo(3)).map((t) => {
    const who = chance(0.7) ? pick(close) : pick(friends);
    return record([lv('Reaction', pick(REACT)), { label: 'URL', value: 'https://www.facebook.com/', href: 'https://www.facebook.com/' }, { dict: [{ dict: [lv('Name', who)], title: '' }], title: '' }], t);
  }));
  add('your_facebook_activity/comments_and_reactions/likes_and_reactions_1.json', sortedTimes(480, created, yearsAgo(3)).map((t) => {
    const who = chance(0.6) ? pick(close) : pick(friends);
    const r = pick(REACT);
    return { timestamp: sec(t), data: [{ reaction: { reaction: r.toUpperCase(), actor: DEMO_OWNER } }], title: `${DEMO_OWNER} ${r === 'Like' ? 'liked' : 'reacted to'} ${who}'s ${pick(['post', 'photo', 'comment', 'video'])}.` };
  }));
  const COMMENTS = ['Congrats!! 🎉', 'This is gorgeous', 'Count me in', 'Haha yes', 'Miss you!', 'Where is this?', 'So proud of you', 'Need the recipe', 'Happy birthday!! 🎂', 'Love this'];
  add('your_facebook_activity/comments_and_reactions/comments.json', {
    comments_v2: sortedTimes(160, created).map((t) => {
      const who = chance(0.7) ? pick(close) : pick(friends);
      return { timestamp: sec(t), data: [{ comment: { timestamp: sec(t), comment: pick(COMMENTS), author: DEMO_OWNER } }], title: `${DEMO_OWNER} commented on ${who}'s ${pick(['post', 'photo'])}.` };
    }),
  });

  const QUERIES = [...close.slice(0, 8), 'bike repair portland', 'pottery classes', 'thai food near me', 'apartment for rent', 'camping gear', 'mount hood trail conditions', 'used record player', 'graphic design jobs', 'lisbon travel tips', 'houseplant swap', 'concert tickets', 'farmers market hours', 'dog friendly cafes', 'standing desk', 'Fernlight Studio', 'vintage jacket'];
  add('logged_information/search/your_search_history.json', {
    searches_v2: sortedTimes(640, yearsAgo(4)).map((t) => {
      const q = chance(0.35) ? pick(QUERIES.slice(0, 8)) : pick(QUERIES);
      return { timestamp: sec(t), attachments: [{ data: [{ text: q }] }], data: [{ text: q }], title: `${DEMO_OWNER} searched on Facebook` };
    }),
  });
  add('logged_information/interactions/profile_visits.json', sortedTimes(130, yearsAgo(1.5)).map((t) => record([lv('Name', chance(0.6) ? pick(close) : pick(people))], t)));
  const PRODUCTS = ['Mid-century armchair', 'Road bike, 54cm', 'Monstera plant', 'Record player', 'Standing desk', 'Camping tent (2 person)', 'Ceramic planters', 'Vintage denim jacket', 'Kayak paddle', 'Film camera'];
  add('logged_information/interactions/items_viewed.json', sortedTimes(160, yearsAgo(1.5)).map((t) => {
    const name = pick(PRODUCTS);
    return record([lv('Title', name), lv('Price', `$${int(15, 400)}`), lv('Product name', name)], t);
  }));
  add('logged_information/notifications/notifications.json', {
    notifications_v2: sortedTimes(90, yearsAgo(1)).map((t) => ({ timestamp: sec(t), unread: chance(0.2), href: 'https://www.facebook.com/', text: `${pick(friends)} ${pick(['commented on your post.', 'reacted to your photo.', 'shared a memory.', 'invited you to an event.', 'posted in a group you follow.'])}` })),
  });
  const PAGES = ['Portland Bike Collective', 'Fernlight Studio', 'Oregon Trails Club', 'Rose City Ceramics', 'Northwest Plant Swap', 'Midnight Jazz Hall', 'Copper Kettle Café', 'Harbor Market', 'Indie Film Nights', 'Type & Ink', 'Pacific Climbing Gym', 'Lisbon Food Tours', 'Sunday Pancake Society', 'Good Dog Rescue', 'Coastline Photography'];
  add("your_facebook_activity/pages/pages_you've_liked.json", { page_likes_v2: PAGES.map((name) => ({ name, timestamp: sec(when(created, END)), url: 'https://www.facebook.com/' })) });
  add('your_facebook_activity/pages/pages_and_profiles_you_follow.json', { pages_followed_v2: PAGES.slice(0, 9).map((name) => ({ timestamp: sec(when(yearsAgo(6), END)), data: [{ name }], title: name })) });
  add('your_facebook_activity/saved_items_and_collections/your_saved_items.json', { saves_v2: sortedTimes(45, yearsAgo(5)).map((t) => ({ timestamp: sec(t), title: `${DEMO_OWNER} saved ${pick(['a link', 'a post', 'a video', 'an item from Marketplace'])}.` })) });
  const GROUPS = ['Portland Plant Swap', 'Bike Commuters of PDX', 'Designers Who Hike', 'Lisbon Expats & Friends', 'Buy Nothing Northwest', 'Film Photography Club'];
  add('your_facebook_activity/groups/your_group_membership_activity.json', { groups_joined_v2: GROUPS.map((name) => ({ timestamp: sec(when(created, END)), data: [{ name }], title: `${DEMO_OWNER} became a member of ${name}.` })) });
  add('your_facebook_activity/groups/your_comments_in_groups.json', {
    group_comments_v2: sortedTimes(40, yearsAgo(5)).map((t) => {
      const g = pick(GROUPS);
      return { timestamp: sec(t), data: [{ comment: { timestamp: sec(t), comment: pick(COMMENTS), author: DEMO_OWNER, group: g } }], title: `${DEMO_OWNER} commented on a post in ${g}.` };
    }),
  });
  add('your_facebook_activity/events/your_event_responses.json', {
    event_responses_v2: {
      events_joined: Array.from({ length: 9 }, () => {
        const s = when(yearsAgo(7), END);
        return { name: pick(['Gallery night', 'Plant swap', 'Birthday picnic', 'Jazz in the park', 'Studio open house', 'Trail cleanup']), start_timestamp: sec(s), end_timestamp: sec(s + 3 * 3600e3), response_time: sec(s - 6 * DAY) };
      }),
      events_interested: Array.from({ length: 7 }, () => {
        const s = when(yearsAgo(4), END);
        return { name: pick(['Vinyl fair', 'Night market', 'Design talk', 'Film screening']), start_timestamp: sec(s), end_timestamp: 0, response_time: sec(s - 10 * DAY) };
      }),
    },
  });

  // ---- messages: one folder per conversation, like the real export
  const LINES = [
    'hey! are we still on for saturday?', 'yes!! what time works?', 'omg did you see that', 'haha 😂', 'running 10 min late sorry', 'no worries',
    'can you send me that recipe', 'happy birthday!!! 🎂🎉', 'thank you ❤️', 'call later?', 'just landed ✈️', 'that café was amazing ☕',
    'ok see you there', 'I’ll bring snacks', 'sounds perfect', 'miss you!', 'look at this view', 'lol yes', 'are you coming tonight?', 'on my way',
  ];
  let threadId = 4100;
  const thread = (box: string, others: string[], count: number, from: number, sentShare: number, title?: string, photos = 0) => {
    const slug = `${others[0]!.toLowerCase().replace(/[^a-z]/g, '')}_${threadId++}`;
    const folder = `your_facebook_activity/messages/${box}/${slug}`;
    const times = sortedTimes(count, from);
    const msgs = times.map((t, k) => {
      const mine = R() < sentShare;
      const m: Record<string, unknown> = { sender_name: mine ? DEMO_OWNER : pick(others), timestamp_ms: t, is_geoblocked_for_viewer: false };
      if (k < photos) {
        const uri = `${folder}/photos/${5000 + threadId * 10 + k}.jpg`;
        files.push({ path: uri, image: { hue: (threadId * 37 + k * 50) % 360, seed: threadId * 10 + k } });
        m.photos = [{ uri, creation_timestamp: sec(t) }];
      } else m.content = pick(LINES);
      if (chance(0.08)) m.reactions = [{ reaction: '❤', actor: mine ? pick(others) : DEMO_OWNER }];
      return m;
    });
    add(`${folder}/message_1.json`, {
      participants: [...others.map((name) => ({ name })), { name: DEMO_OWNER }],
      messages: msgs,
      title: title ?? others.join(', '),
      is_still_participant: true,
      thread_path: `${box}/${slug}`,
      magic_words: [],
    });
  };
  close.forEach((p, i) => thread('inbox', [p], Math.max(12, 150 - i * 10 + int(-10, 10)), yearsAgo(i < 5 ? 6 : 3), 0.48, undefined, i < 3 ? 2 : 0));
  friends.slice(14, 26).forEach((p) => thread('inbox', [p], int(3, 15), yearsAgo(8), 0.45));
  thread('inbox', close.slice(0, 5), 140, yearsAgo(2), 0.25, 'Weekend crew 🌲', 1);
  thread('inbox', [close[2]!, close[6]!, friends[30]!, friends[31]!], 60, yearsAgo(4), 0.2, 'Studio people');
  friends.slice(40, 44).forEach((p) => thread('filtered_threads', [p], int(2, 6), yearsAgo(5), 0.2));
  thread('filtered_threads', friends.slice(50, 60), 120, yearsAgo(3), 0.03, 'Building neighbours');
  strangers.slice(36, 39).forEach((p) => thread('message_requests', [p], int(1, 2), yearsAgo(2), 0));
  friends.slice(70, 72).forEach((p) => thread('archived_threads', [p], int(1, 4), yearsAgo(9), 0.5));
  friends.slice(80, 82).forEach((p) => thread('e2ee_cutover', [p], int(4, 12), yearsAgo(1), 0.5));

  return files;
}
