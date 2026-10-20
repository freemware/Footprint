import { describe, expect, it } from 'vitest';
import { buildDataset, type SourceFile } from '../importer/pipeline';
import { pickParser } from './registry';
import { deviceLabel } from './userAgent';

// All data below is invented. Shapes mirror real exports.
const OWNER = 'Pat Example';
const f = (path: string, json: unknown): SourceFile => ({ path, size: 100, json });

const files: SourceFile[] = [
  f('personal_information/profile_information/profile_information.json', {
    profile_v2: { name: { full_name: OWNER }, registration_timestamp: 1500000000, emails: { emails: ['pat@example.com'] } },
  }),
  f('connections/friends/your_friends.json', { friends_v2: [{ name: 'Sam Sample', timestamp: 1600000000 }] }),
  f('your_facebook_activity/comments_and_reactions/likes_and_reactions.json', [
    { timestamp: 1600000100, label_values: [{ label: 'Reaction', value: 'Love' }, { label: 'Name', value: 'Sam Sample' }] },
  ]),
  f('your_facebook_activity/comments_and_reactions/likes_and_reactions_1.json', [
    { timestamp: 1600000200, title: `${OWNER} liked Robin Test's post.`, data: [{ reaction: { reaction: 'LIKE', actor: OWNER } }] },
  ]),
  f('your_facebook_activity/messages/inbox/samsample_1/message_1.json', {
    participants: [{ name: 'Sam Sample' }, { name: OWNER }],
    title: 'Sam Sample',
    messages: [
      { sender_name: OWNER, timestamp_ms: 1600000300000, content: 'hi' },
      { sender_name: 'Sam Sample', timestamp_ms: 1600000400000, content: 'hello' },
    ],
  }),
  f('security_and_login_information/account_activity.json', {
    account_activity_v2: [
      { action: 'Login', timestamp: 1600000500, ip_address: '192.0.2.1', city: 'Springfield', country: 'US', user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36' },
    ],
  }),
  f('security_and_login_information/logins_and_logouts.json', {
    account_accesses_v2: [{ action: 'Login', timestamp: 1600000500, ip_address: '192.0.2.1' }],
  }),
  f('ads_information/advertisers_using_your_activity_or_information.json', {
    label_values: [
      { label: 'Lista subida', vec: [{ value: 'Shop A' }, { value: 'Shop B' }] },
      { label: 'Interacciones', vec: [{ value: 'Shop C' }] },
    ],
  }),
  f('apps_and_websites_off_of_facebook/your_activity_off_meta_technologies.json', [
    {
      title: 'Example App',
      label_values: [
        { label: 'Events', vec: [{ dict: [{ label: 'Event', value: 'PURCHASE' }, { label: 'Received on', timestamp_value: 1600000600 }] }] },
      ],
    },
  ]),
  f('logged_information/something_new/brand_new_file.json', [{ timestamp: 1600000700, title: 'A new kind of record' }]),
  f('preferences/weird.json', 'not an object'),
  f('your_facebook_activity/posts/media/photo.jpg', undefined),
];

describe('pipeline on synthetic export', () => {
  const { events, collections, summary } = buildDataset(files, 'test');
  const ofType = (t: string) => events.filter((e) => e.type === t);

  it('finds the owner and account creation date', () => {
    expect(collections.owner).toBe(OWNER);
    expect(collections.accountCreated).toBe(1500000000000);
  });
  it('reads both reaction formats and finds who was reacted to', () => {
    const r = ofType('reaction');
    expect(r).toHaveLength(2);
    expect(r.map((e) => e.meta?.reaction)).toEqual(['love', 'like']);
    expect(r.map((e) => e.people?.[0])).toEqual(['Sam Sample', 'Robin Test']);
  });
  it('tells sent from received messages', () => {
    expect(ofType('message_sent')[0]?.people).toEqual(['Sam Sample']);
    expect(ofType('message_received')[0]?.people).toEqual(['Sam Sample']);
  });
  it('de-duplicates a login logged in two files, keeping the detailed copy', () => {
    const logins = ofType('login');
    expect(logins).toHaveLength(1);
    expect(logins[0]?.device).toBe('Chrome on Windows');
    expect(logins[0]?.location?.city).toBe('Springfield');
  });
  it('splits advertiser lists by position when labels are in another language', () => {
    expect(collections.advertisers.filter((a) => a.source === 'uploaded_list').map((a) => a.name)).toEqual(['Shop A', 'Shop B']);
    expect(collections.advertisers.filter((a) => a.source === 'activity').map((a) => a.name)).toEqual(['Shop C']);
  });
  it('reads off-Facebook activity', () => {
    expect(collections.offMetaApps[0]).toMatchObject({ name: 'Example App', events: 1, byType: { PURCHASE: 1 } });
    expect(ofType('off_meta_activity')).toHaveLength(1);
  });
  it('puts unknown files on the timeline via the fallback', () => {
    expect(ofType('logged')[0]?.title).toContain('A new kind of record');
  });
  it('survives junk files and ignores media for parsing', () => {
    expect(summary.files.filter((x) => x.error)).toEqual([]);
    expect(summary.files.find((x) => x.path.endsWith('.jpg'))?.kind).toBe('media');
  });
  it('sorts events by time', () => {
    const ts = events.map((e) => e.timestamp);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
  });
});

describe('warnings', () => {
  it('spots an HTML export', () => {
    const { summary } = buildDataset([{ path: 'index.html', size: 1 }, { path: 'your_facebook_activity/posts/x.html', size: 1 }]);
    expect(summary.warnings).toContain('html_export');
  });
  it('recognises an Instagram download instead of warning about it', () => {
    const { summary } = buildDataset([f('your_instagram_activity/likes/liked_posts.json', []), f('ads_information/ads_and_topics/ads_viewed.json', [])]);
    expect(summary.platform).toBe('instagram');
    expect(summary.warnings).not.toContain('instagram_export');
  });
});

describe('registry and helpers', () => {
  it('falls back to the generic parser', () => {
    expect(pickParser('x/y.json', {}).id).toBe('generic');
  });
  it('labels devices', () => {
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) [FBAN/FBIOS;FBAV/450.0]')).toBe('Facebook app on iPhone');
    expect(deviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Safari/605.1.15')).toBe('Safari on Mac');
    expect(deviceLabel('Instagram 400.0.0 (iPhone15,2; iOS 19_0; en_US)')).toBe('Instagram app on iPhone');
    expect(deviceLabel('Dalvik/2.1.0 (Linux; U; Android 14; Quest 3 Build/X) [FBAN/FB4A]')).toBe('Facebook app on Meta Quest');
    expect(deviceLabel(undefined)).toBeUndefined();
  });
});

import { stripCommonRoot, isJunk } from '../importer/paths';
describe('export root detection', () => {
  it('strips wrapper folders but keeps known export folders', () => {
    const rel = stripCommonRoot(['facebook-x-2026/ads_information/a.json', 'facebook-x-2026/connections/b.json']);
    expect(rel('facebook-x-2026/ads_information/a.json')).toBe('ads_information/a.json');
    expect(stripCommonRoot(['connections/friends/a.json', 'connections/b.json'])('connections/b.json')).toBe('connections/b.json');
    expect(stripCommonRoot(['single.json'])('single.json')).toBe('single.json');
  });
  it('skips OS junk', () => {
    expect(isJunk('__MACOSX/x.json')).toBe(true);
    expect(isJunk('a/._photo.jpg')).toBe(true);
    expect(isJunk('a/photo.jpg')).toBe(false);
  });
});
