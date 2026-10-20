import { mojibake, type DemoFile } from './syntheticExport';

/**
 * An invented Instagram download for tests: the same paths, record shapes and text-encoding quirk
 * as a real one (mapped October 2026), with made-up people, businesses and places.
 * Addresses are from the documentation-only ranges, coordinates point at open sea.
 */

export const IG_DEMO_OWNER = 'Robin Calder';
const T0 = Date.UTC(2026, 5, 1, 17, 0, 0);
const s = (ms: number) => Math.floor(ms / 1000);
const at = (days: number, hours = 0) => T0 + days * 864e5 + hours * 3600e3;

const lv = (label: string, value: string | number | boolean) => ({ label, value: String(value) });
const lvTime = (label: string, ms: number) => ({ label, timestamp_value: s(ms) });
const rec = (label_values: unknown[], ms?: number) => ({ ...(ms !== undefined ? { timestamp: s(ms) } : {}), media: [], label_values, fbid: '1000000000000001' });
const owner = (username: string) => ({ dict: [{ dict: [lv('URL', `https://www.instagram.com/${username}`), lv('Name', username), lv('Username', username)], title: '' }], title: 'Owner' });
const smd = (fields: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, typeof v === 'number' ? { timestamp: s(v) } : { value: v }]));
const person = (username: string, ms: number) => rec([lv('Name', username), lv('URL', `https://www.instagram.com/${username}`), lv('Username', username)], ms);

const ACCOUNTS = ['cafe.ondine', 'mira.okafor', 'trailmix.fitness', 'jonas.reyes', 'pinecrest.grocery', 'sasha.lund'];
const FOLLOWERS = ['mira.okafor', 'jonas.reyes', 'sasha.lund', 'theo.amari'];
const FOLLOWING = ['mira.okafor', 'jonas.reyes', 'cafe.ondine', 'trailmix.fitness', 'pinecrest.grocery'];

export function buildSyntheticInstagram(): DemoFile[] {
  const files: DemoFile[] = [];
  const add = (path: string, json: unknown) => files.push({ path, json: mojibake(json) });

  // ---- ads
  add('ads_information/instagram_ads_and_businesses/advertisers_using_your_activity_or_information.json', {
    media: [],
    label_values: [
      { label: 'Advertisers that have uploaded an audience list containing entries that were matched to your Instagram profile', vec: [{ value: 'Northfield Outfitters' }, { value: 'Bluewave Bank' }] },
      {
        label: "Advertisers who have uploaded an audience list that was matched to your profile based on interactions you may have had with the advertiser's website, app or store",
        vec: [{ value: 'Northfield Outfitters' }, { value: 'Silverleaf Travel' }, { value: 'Cedarnest Home' }],
      },
      { label: 'Advertisers whose store you visited' },
    ],
    fbid: '1000000000000002',
  });
  add('ads_information/instagram_ads_and_businesses/other_categories_used_to_reach_you.json', { media: [], label_values: [{ label: 'Name', vec: [{ value: 'Frequent travellers' }, { value: 'Café lovers' }] }], fbid: '1' });
  add('ads_information/instagram_ads_and_businesses/ad_preferences.json', {
    timestamp: s(at(0)),
    media: [],
    label_values: [lv('Is opted out of third party data at the user level', 'False'), lv('Received Global Privacy Control (GPC) enable signal from browser settings', 'True')],
    fbid: '1',
  });
  add('ads_information/ads_and_topics/ads_viewed.json', [rec([lv('Title', 'Northfield Outfitters'), lv('URL', 'https://example.com/ad/1')], at(3, 2)), rec([lv('Title', 'Bluewave Bank')], at(4, 5))]);
  add('ads_information/ads_and_topics/ads_clicked.json', [rec([lv('Action', 'Click'), lv('Title', 'Silverleaf Travel')], at(5, 1))]);
  add('ads_information/ads_and_topics/posts_viewed.json', [rec([lv('Title', 'cafe.ondine'), owner('cafe.ondine')], at(6, 3))]);
  add('ads_information/ads_and_topics/videos_watched.json', [rec([lv('Title', 'trailmix.fitness'), owner('trailmix.fitness')], at(6, 4)), rec([owner('mira.okafor')], at(7, 4))]);
  add("ads_information/instagram_ads_and_businesses/information_you've_submitted_to_advertisers.json", [rec([lv('Question', 'Email'), lv('Answer', 'robin@example.com'), lvTime('Last updated time', at(8))], at(8))]);

  // ---- activity
  add('your_instagram_activity/likes/liked_posts.json', ACCOUNTS.map((a, i) => rec([lv('URL', `https://www.instagram.com/p/x${i}`), lv('Title', a)], at(10 + i, 2))));
  add('your_instagram_activity/likes/liked_comments.json', { likes_comment_likes: [{ title: 'jonas.reyes', string_list_data: [{ href: 'https://www.instagram.com/p/y', value: '👍', timestamp: s(at(12)) }] }] });
  add('your_instagram_activity/comments/post_comments_1.json', [{ string_map_data: smd({ Comment: 'Looks wonderful — café de luxe!', 'Media Owner': 'cafe.ondine', Time: at(13, 1) }), media_list_data: [] }]);
  add('your_instagram_activity/saved/saved_posts.json', [rec([lv('Title', 'sasha.lund')], at(14))]);
  add(
    'your_instagram_activity/story_interactions/stories_viewed.json',
    ['mira.okafor', 'mira.okafor', 'jonas.reyes', 'cafe.ondine'].map((a, i) => rec([lv('Title', a), owner(a)], at(15 + i, i))),
  );
  add('your_instagram_activity/threads/threads_viewed.json', { text_post_app_text_post_app_posts_seen: [{ string_map_data: smd({ Author: 'sasha.lund', Time: at(16), URL: 'https://www.threads.com/x' }) }] });
  add('logged_information/link_history/link_history.json', [
    rec([lv('Website link you visited', 'https://www.example.com/shoes?utm=x'), lv('Title of website page you visited', 'Trail shoes — Example'), lv('Website session start time', 'Jun 20, 2026 9:00:00am')], at(19)),
    rec([lv('Website link you visited', 'https://shop.example.org/item'), lv('Title of website page you visited', 'Item')], at(20)),
    rec([lv('Website link you visited', 'https://www.example.com/sale')], at(21)),
  ]);
  add('logged_information/recent_searches/word_or_phrase_searches.json', { searches_keyword: [{ title: '', string_map_data: smd({ Search: 'trail running', Time: at(22) }) }, { title: '', string_map_data: smd({ Search: 'Trail running', Time: at(23) }) }] });
  add('logged_information/recent_searches/profile_searches.json', { searches_user: [{ title: 'theo.amari', string_list_data: [{ href: 'https://www.instagram.com/theo.amari', timestamp: s(at(24)) }] }] });

  // ---- your content: each post is listed twice, in two shapes, a second apart
  const postTimes = [at(25, 3), at(40, 6)];
  add(
    'your_instagram_activity/media/posts_1.json',
    postTimes.map((t, i) => ({ media: [{ uri: `media/posts/20260601/post${i}.jpg`, creation_timestamp: s(t), title: `Beach day ${i} 🌊` }], title: `Beach day ${i} 🌊`, creation_timestamp: s(t) })),
  );
  add(
    'your_instagram_activity/media/posts.json',
    postTimes.map((t, i) =>
      rec(
        [
          { label: 'Media', media: [{ uri: `media/posts/20260601/post${i}.jpg`, creation_timestamp: s(t) }] },
          lv('Caption', `Beach day ${i} 🌊`),
          lvTime('Creation time', t + 1000),
          lv('Latitude', i === 0 ? '0.5' : '0'),
          lv('Longitude', i === 0 ? '-30.5' : '0'),
          lv('Device name', 'Demo Phone 12'),
        ],
        t + 1000,
      ),
    ),
  );
  add('your_instagram_activity/media/stories.json', { ig_stories: [{ uri: 'media/stories/20260601/story0.mp4', creation_timestamp: s(at(30)), title: '' }] });
  add('your_instagram_activity/media/recently_deleted_content.json', [rec([lvTime('Creation time', at(31))], at(31))]);

  // ---- messages (same shape as Facebook's)
  add('your_instagram_activity/messages/inbox/miraokafor_1001/message_1.json', {
    participants: [{ name: 'Mira Okafor' }, { name: IG_DEMO_OWNER }],
    messages: [
      { sender_name: 'Mira Okafor', timestamp_ms: at(33), content: 'See you Saturday?' },
      { sender_name: IG_DEMO_OWNER, timestamp_ms: at(33, 1), content: 'Yes! ☕' },
    ],
    title: 'Mira Okafor',
    thread_path: 'inbox/miraokafor_1001',
  });
  add('your_instagram_activity/messages/ai_conversations.json', { title: 'Trip ideas', timestamp: s(at(34)), media: [], label_values: [lv('Summary', 'Ideas for a weekend trip')], fbid: '1' });

  // ---- connections
  add('connections/followers_and_following/followers_1.json', FOLLOWERS.map((u, i) => ({ title: '', media_list_data: [], string_list_data: [{ href: `https://www.instagram.com/${u}`, value: u, timestamp: s(at(1 + i)) }] })));
  add('connections/followers_and_following/following.json', { relationships_following: FOLLOWING.map((u, i) => ({ title: u, string_list_data: [{ href: `https://www.instagram.com/_u/${u}`, timestamp: s(at(2 + i)) }] })) });
  add('connections/followers_and_following/close_friends.json', [person('mira.okafor', at(9))]);
  add('connections/followers_and_following/recently_unfollowed_profiles.json', [person('old.account', at(35))]);

  // ---- personal information and security
  add('personal_information/personal_information/personal_information.json', {
    profile_user: [{ title: '', media_map_data: {}, string_map_data: smd({ Name: IG_DEMO_OWNER, Username: 'robin.calder.demo', Email: 'robin@example.com', 'Private Account': 'False' }) }],
  });
  add('personal_information/personal_information/instagram_profile_information.json', { media: [], label_values: [lv('Contact Syncing', 'True'), lvTime('Last Login', at(36))], fbid: '1' });
  add('personal_information/personal_information/profile_changes.json', { profile_profile_change: [{ title: '', media_map_data: {}, string_map_data: smd({ Changed: 'Bio', 'Previous value': 'old', 'New value': 'new', 'Change date': at(37) }) }] });
  add('personal_information/autofill_information/autofill_information.json', { media: [], label_values: [lv('City', 'Harborview'), lvTime('Last updated time', at(5))], fbid: '1' });
  add('personal_information/information_about_you/locations_of_interest.json', { media: [], label_values: [{ label: 'Locations of interest', vec: [{ value: 'Harborview' }] }, { label: 'Usage explanation' }], fbid: '1' });
  add('personal_information/device_information/device_camera_effects_support.json', [rec([lv('Device ID', 'DEMO-DEVICE-0001')], at(2))]);
  add('security_and_login_information/login_and_profile_creation/login_activity.json', {
    account_history_login_history: [{ title: new Date(at(38)).toISOString(), media_map_data: {}, string_map_data: smd({ 'IP Address': '203.0.113.7', Time: at(38), 'User Agent': 'Instagram 400.0 (iPhone15,2; iOS 19_0; en_US)' }) }],
  });
  add('security_and_login_information/login_and_profile_creation/profile_activity.json', [
    rec([lv('Type', 'Login'), lv('IP address', '203.0.113.7'), lv('User Agent', 'Instagram 400.0 (iPhone15,2; iOS 19_0; en_US)')], at(38)),
    rec([lv('Type', 'Account privacy changed'), lv('IP address', '198.51.100.4')], at(39)),
  ]);
  add('security_and_login_information/login_and_profile_creation/profile_privacy_changes.json', { account_history_account_privacy_history: [{ title: 'Switched to Public', string_list_data: [{ timestamp: s(at(39)) }] }] });
  add('security_and_login_information/login_and_profile_creation/last_known_location.json', {
    account_history_imprecise_last_known_location: [{ title: '', media_map_data: {}, string_map_data: smd({ 'Precise Latitude': '0.5', 'Precise Longitude': '-30.5', 'GPS Time Uploaded': at(41) }) }],
  });
  add('security_and_login_information/login_and_profile_creation/signup_details.json', { account_history_registration_info: [{ title: '', media_map_data: {}, string_map_data: smd({ Time: Date.UTC(2015, 2, 3) }) }] });

  // Media files the posts point at (bytes only).
  files.push({ path: 'media/posts/20260601/post0.jpg', image: { hue: 200, seed: 1 } }, { path: 'media/posts/20260601/post1.jpg', image: { hue: 30, seed: 2 } }, { path: 'media/stories/20260601/story0.mp4', video: true });
  return files;
}
