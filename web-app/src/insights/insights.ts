import type { ActivityEvent, Collections, ExportSummary, Fact } from '../model/types';
import { GROUP_ORDER, groupOf, type CategoryGroup } from '../theme/tokens';

/**
 * Everything the tabs show, computed once from the event stream and collections.
 * Pure: no React, no browser APIs, so it can be checked in Node against a real export.
 */

export interface Ranked {
  key: string;
  label: string;
  count: number;
  sub?: string;
}

export interface MediaEntry {
  path: string;
  kind: 'photo' | 'video';
  size: number;
  timestamp?: number;
  /** Where it appeared: one of your posts/albums, or a message. */
  source: 'post' | 'message' | 'other';
  /** Facebook's own description of the post, or the conversation it was sent in. */
  context?: string;
  album?: string;
  uploadIp?: string;
  taken?: number;
  /** The record to open for full details. */
  event?: ActivityEvent;
}

export interface Insights {
  owner?: string;
  accountCreated?: number;
  range?: { start: number; end: number };
  /** Years of history, from account creation (or first record) to the latest record. */
  years: number;
  files: { json: number; media: number; bytes: number };
  /** Where charts should start: skips a long empty lead-in caused by a few very old records. */
  chartStart?: number;
  /** Records before chartStart (still listed on the Timeline, just not charted). */
  beforeChart: number;
  totalEvents: number;
  byType: Ranked[];
  byYear: { years: number[]; series: Record<CategoryGroup, number[]> };
  ads: {
    advertisers: number;
    uploaded: number;
    activity: number;
    both: number;
    names: { name: string; uploaded: boolean; activity: boolean }[];
    interests: string[];
    categories: string[];
    seen: number;
    clicked: number;
    hidden: number;
    topSeen: Ranked[];
    offMetaApps: Ranked[];
    offMetaEvents: number;
    offMetaByCode: Ranked[];
  };
  security: {
    logins: number;
    places: Ranked[];
    countries: Ranked[];
    devices: Ranked[];
    sessions: ActivityEvent[];
    passwordEvents: number;
    recordedTimes: number;
    byMonth: { months: number[]; counts: number[] };
    facts: Fact[];
  };
  activity: {
    heat: [number, number, number][];
    busiest?: { day: number; hour: number };
    searches: number;
    topSearches: Ranked[];
    profileVisits: number;
    topVisited: Ranked[];
    itemsViewed: number;
    byMonth: { months: number[]; counts: number[] };
  };
  people: {
    friends: number;
    removed: number;
    requestsSent: number;
    requestsDeclined: number;
    following: number;
    friendsByYear: { years: number[]; added: number[]; removed: number[] };
    top: (Ranked & { messages: number; reactions: number; comments: number })[];
    sent: number;
    received: number;
    threads: number;
    boxes: Ranked[];
  };
  media: {
    items: MediaEntry[];
    photos: number;
    videos: number;
    inMessages: number;
    withIp: number;
  };
  /** Instagram's own kinds of record. All zero/empty for a Facebook download. */
  instagram: {
    /** What Instagram logged you looking at. */
    watched: { stories: number; posts: number; videos: number; threads: number; total: number };
    /** Accounts whose stories, posts and videos you looked at most. */
    topWatched: Ranked[];
    /** Web pages opened in Instagram's built-in browser. */
    links: number;
    topSites: Ranked[];
    likes: number;
    comments: number;
    saved: number;
    followers: number;
    following: number;
    /** People who follow you and whom you follow back. */
    mutual: number;
    closeFriends: number;
    unfollowed: number;
    threadsFollowers: number;
    posts: number;
    stories: number;
    /** Deleted posts and stories Instagram still holds. */
    deleted: number;
    /** Your posts that carry map coordinates. */
    postsWithPlace: number;
    /** Phone names recorded with your posts. */
    postDevices: string[];
    leadForms: number;
    notInterested: number;
    aiChats: number;
    adsWatched: number;
  };
  profile: {
    about: Fact[];
    guesses: { source: string; facts: Fact[] }[];
    deviceFacts: Fact[];
    hardware: { gpus: string[]; ram: string[]; cores: string[] };
    locationFacts: Fact[];
    lastLocation?: Collections['lastLocation'];
  };
}

const count = <K,>(map: Map<K, number>, key: K, n = 1) => map.set(key, (map.get(key) ?? 0) + n);
const ranked = (map: Map<string, number>, limit = Infinity, label?: (k: string) => string): Ranked[] =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, n]) => ({ key, label: label ? label(key) : key, count: n }));

const monthKey = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};
function monthly(events: ActivityEvent[]): { months: number[]; counts: number[] } {
  if (!events.length) return { months: [], counts: [] };
  const map = new Map<number, number>();
  for (const e of events) count(map, monthKey(e.timestamp));
  const first = Math.min(...map.keys());
  const last = Math.max(...map.keys());
  const months: number[] = [];
  for (let d = new Date(first); d.getTime() <= last; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d.getTime());
  return { months, counts: months.map((m) => map.get(m) ?? 0) };
}

const SECURITY_FACT_SKIP = /^(Fbid|fbid|media)$/;

export function buildInsights(events: ActivityEvent[], collections: Collections, summary: ExportSummary | null): Insights {
  const of = (type: string) => events.filter((e) => e.type === type);

  // ---- overall
  const typeMap = new Map<string, number>();
  for (const e of events) count(typeMap, e.type);
  const latest = events[events.length - 1]?.timestamp;
  const start = collections.accountCreated ?? events[0]?.timestamp;
  const years = start !== undefined && latest !== undefined ? Math.max(0, (latest - start) / (365.25 * 864e5)) : 0;

  // A handful of very old records (e.g. "apps detected in 2013") would otherwise stretch every chart.
  let chartStart = events[0]?.timestamp;
  if (events.length) {
    const allowed = Math.max(1, Math.floor(events.length * 0.005));
    chartStart = events[Math.min(allowed, events.length - 1)]!.timestamp;
    if (collections.accountCreated !== undefined) chartStart = Math.min(chartStart, collections.accountCreated);
  }
  const charted = chartStart === undefined ? events : events.filter((e) => e.timestamp >= chartStart!);

  const yearSet = new Map<number, Map<CategoryGroup, number>>();
  for (const e of charted) {
    const y = new Date(e.timestamp).getFullYear();
    if (!yearSet.has(y)) yearSet.set(y, new Map());
    count(yearSet.get(y)!, groupOf(e));
  }
  const yearList = [...yearSet.keys()].sort((a, b) => a - b);
  const allYears: number[] = [];
  if (yearList.length) for (let y = yearList[0]!; y <= yearList[yearList.length - 1]!; y++) allYears.push(y);
  const series = Object.fromEntries(GROUP_ORDER.map((g) => [g, allYears.map((y) => yearSet.get(y)?.get(g) ?? 0)])) as Record<
    CategoryGroup,
    number[]
  >;

  // ---- ads
  const adv = new Map<string, { uploaded: boolean; activity: boolean }>();
  for (const a of collections.advertisers) {
    const cur = adv.get(a.name) ?? { uploaded: false, activity: false };
    if (a.source === 'uploaded_list') cur.uploaded = true;
    else cur.activity = true;
    adv.set(a.name, cur);
  }
  const names = [...adv.entries()]
    .map(([name, v]) => ({ name, ...v }))
    // Sort by the first letter or digit, so names like "__shop__" don't crowd the top.
    .map((a) => ({ a, k: a.name.replace(/^[^\p{L}\p{N}]+/u, '') || a.name }))
    // Names that start with a letter come first, then numbers and symbols.
    .sort((x, y) => Number(!/^\p{L}/u.test(x.k)) - Number(!/^\p{L}/u.test(y.k)) || x.k.localeCompare(y.k, undefined, { sensitivity: 'base' }))
    .map((x) => x.a);
  const seenMap = new Map<string, number>();
  for (const e of of('ad_viewed')) count(seenMap, String(e.meta?.advertiser ?? 'Unknown'));
  const interactions = of('ad_interaction');
  const isHide = (e: ActivityEvent) => /dislike|hide|hid/i.test(String(e.meta?.action ?? ''));
  const offApps = new Map<string, number>();
  const offCodes = new Map<string, number>();
  for (const a of collections.offMetaApps) {
    count(offApps, a.name, a.events);
    for (const [code, n] of Object.entries(a.byType)) count(offCodes, code, n);
  }

  // ---- security
  const sec = events.filter((e) => e.category === 'security');
  const placeMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  for (const e of sec) {
    if (e.location?.city && e.type !== 'session_started') count(placeMap, [e.location.city, e.location.country].filter(Boolean).join(', '));
    if (e.location?.country) count(countryMap, e.location.country);
    if (e.device) count(deviceMap, e.device);
  }

  // ---- activity
  const heatGrid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const e of events) {
    if (e.type === 'logged' || e.type === 'session_updated' || e.type === 'notification' || e.type === 'message_received') continue;
    const d = new Date(e.timestamp);
    heatGrid[(d.getDay() + 6) % 7]![d.getHours()]!++;
  }
  const heat: [number, number, number][] = [];
  let busiest: { day: number; hour: number; n: number } | undefined;
  heatGrid.forEach((row, day) =>
    row.forEach((n, hour) => {
      heat.push([hour, day, n]);
      if (!busiest || n > busiest.n) busiest = { day, hour, n };
    }),
  );
  const searchMap = new Map<string, number>();
  for (const e of of('search')) if (e.text) count(searchMap, e.text.trim().toLowerCase());
  const visitMap = new Map<string, number>();
  for (const e of of('profile_visit')) if (e.people?.[0]) count(visitMap, e.people[0]);
  const yourActions = events.filter(
    (e) => !['session_updated', 'notification', 'message_received', 'logged', 'off_meta_activity', 'ad_viewed'].includes(e.type),
  );

  // ---- people
  const yearOf = (e: ActivityEvent) => new Date(e.timestamp).getFullYear();
  const added = of('friend_added');
  const removed = of('friend_removed');
  const fy = new Set([...added, ...removed].map(yearOf));
  const fyList: number[] = [];
  if (fy.size) for (let y = Math.min(...fy); y <= Math.max(...fy); y++) fyList.push(y);
  const ppl = new Map<string, { messages: number; reactions: number; comments: number }>();
  for (const e of events) {
    const kind = e.category === 'messages' ? 'messages' : e.type === 'reaction' ? 'reactions' : e.type === 'comment' ? 'comments' : undefined;
    if (!kind) continue;
    for (const p of e.people ?? []) {
      if (p === collections.owner || p === 'Unknown') continue;
      const cur = ppl.get(p) ?? { messages: 0, reactions: 0, comments: 0 };
      cur[kind]++;
      ppl.set(p, cur);
    }
  }
  const top = [...ppl.entries()]
    .map(([name, v]) => ({ key: name, label: name, count: v.messages + v.reactions + v.comments, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
  const msgs = events.filter((e) => e.category === 'messages' && e.type !== 'logged' && e.type !== 'ai_conversation');
  const threads = new Set(msgs.map((e) => String(e.meta?.thread ?? '')));
  const boxThreads = new Map<string, Set<string>>();
  const boxMsgs = new Map<string, number>();
  for (const e of msgs) {
    const box = String(e.meta?.box ?? 'inbox');
    if (!boxThreads.has(box)) boxThreads.set(box, new Set());
    boxThreads.get(box)!.add(String(e.meta?.thread ?? ''));
    count(boxMsgs, box);
  }

  // ---- profile
  const facts = collections.facts;
  const guessSources = new Map<string, Fact[]>();
  const NOT_GUESSES = /your_experiences|your_preferred_categories/;
  for (const f of facts.filter((x) => x.group === 'inference' && !NOT_GUESSES.test(x.source))) {
    if (!guessSources.has(f.source)) guessSources.set(f.source, []);
    guessSources.get(f.source)!.push(f);
  }
  const deviceFacts = facts.filter((f) => f.group === 'device');
  const uniq = (re: RegExp) => [...new Set(deviceFacts.filter((f) => re.test(f.label)).map((f) => f.value))];

  // ---- media: every photo/video file, linked to the post, album or message that used it
  const byUri = new Map<string, ActivityEvent[]>();
  for (const e of events) for (const u of e.mediaUris ?? []) {
    if (!byUri.has(u)) byUri.set(u, []);
    byUri.get(u)!.push(e);
  }
  const mediaItems: MediaEntry[] = (summary?.files ?? [])
    .filter((f) => f.kind === 'media' && /\.(jpe?g|png|gif|webp|heic|mp4|mov|webm)$/i.test(f.path))
    .map((f) => {
      const refs = byUri.get(f.path) ?? [];
      const upload = refs.find((e) => e.type === 'photo_upload' || e.type === 'video_upload');
      const msg = refs.find((e) => e.category === 'messages');
      const post = refs.find((e) => e.category === 'posts' || e.category === 'groups');
      const primary = post ?? upload ?? msg ?? refs[0];
      const thread = msg ? String(msg.title ?? '').replace(/^Message (to|from) /, '') : undefined;
      return {
        path: f.path,
        kind: /\.(mp4|mov|webm)$/i.test(f.path) ? 'video' : 'photo',
        size: f.size,
        timestamp: primary?.timestamp,
        // Files under messages/ with no message pointing at them are conversation pictures (a chat's own photo).
        source: (msg && !post && !upload) || (!refs.length && /\/messages\//.test(f.path)) ? 'message' : refs.length ? 'post' : 'other',
        context: post?.title ?? (msg ? thread : upload?.title ?? (/\/messages\//.test(f.path) ? 'Conversation picture' : undefined)),
        album: typeof upload?.meta?.album === 'string' ? upload.meta.album : undefined,
        uploadIp: upload?.location?.ip ?? post?.location?.ip,
        taken: typeof upload?.meta?.taken === 'number' ? upload.meta.taken : undefined,
        event: primary,
      } satisfies MediaEntry;
    })
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

  // ---- Instagram
  const watchedMap = new Map<string, number>();
  for (const t of ['story_viewed', 'post_viewed', 'video_watched'])
    for (const e of of(t)) {
      const a = e.meta?.account;
      if (typeof a === 'string') count(watchedMap, a);
    }
  const siteMap = new Map<string, number>();
  for (const e of of('link_visited')) count(siteMap, String(e.meta?.domain ?? 'Unknown site'));
  const followerNames = new Set(of('follower_added').flatMap((e) => e.people ?? []));
  const followingNames = new Set(of('followed').flatMap((e) => e.people ?? []));
  const ownPosts = of('post');
  const watched = { stories: of('story_viewed').length, posts: of('post_viewed').length, videos: of('video_watched').length, threads: of('thread_post_viewed').length };

  return {
    owner: collections.owner,
    accountCreated: collections.accountCreated,
    range: summary?.dateRange,
    years,
    files: {
      json: summary?.files.filter((f) => f.kind === 'json').length ?? 0,
      media: summary?.files.filter((f) => f.kind === 'media').length ?? 0,
      bytes: summary?.totalBytes ?? 0,
    },
    chartStart,
    beforeChart: events.length - charted.length,
    totalEvents: events.length,
    byType: ranked(typeMap),
    byYear: { years: allYears, series },
    ads: {
      advertisers: names.length,
      uploaded: names.filter((n) => n.uploaded).length,
      activity: names.filter((n) => n.activity).length,
      both: names.filter((n) => n.uploaded && n.activity).length,
      names,
      interests: [...new Set(collections.adInterests)].sort((a, b) => a.localeCompare(b)),
      categories: [...new Set(collections.adCategories)],
      seen: of('ad_viewed').length,
      clicked: interactions.filter((e) => !isHide(e)).length,
      hidden: interactions.filter(isHide).length,
      topSeen: ranked(seenMap, 12),
      offMetaApps: ranked(offApps),
      offMetaEvents: [...offApps.values()].reduce((s, n) => s + n, 0),
      offMetaByCode: ranked(offCodes),
    },
    security: {
      logins: of('login').length,
      places: ranked(placeMap),
      countries: ranked(countryMap),
      devices: ranked(deviceMap),
      sessions: of('session_started').sort((a, b) => b.timestamp - a.timestamp),
      passwordEvents: of('password_changed').length + of('password_reset_requested').length,
      recordedTimes: sec.length,
      byMonth: monthly(sec),
      facts: facts.filter((f) => f.group === 'security' && !SECURITY_FACT_SKIP.test(f.label)),
    },
    activity: {
      heat,
      busiest: busiest && busiest.n > 0 ? { day: busiest.day, hour: busiest.hour } : undefined,
      searches: of('search').length,
      topSearches: ranked(searchMap, 10),
      profileVisits: of('profile_visit').length,
      topVisited: ranked(visitMap, 8),
      itemsViewed: of('item_viewed').length,
      byMonth: monthly(yourActions),
    },
    people: {
      friends: added.length,
      removed: removed.length,
      requestsSent: of('friend_request_sent').length,
      requestsDeclined: of('friend_request_rejected').length,
      following: of('followed').length,
      friendsByYear: {
        years: fyList,
        added: fyList.map((y) => added.filter((e) => yearOf(e) === y).length),
        removed: fyList.map((y) => removed.filter((e) => yearOf(e) === y).length),
      },
      top,
      sent: of('message_sent').length,
      received: of('message_received').length,
      threads: threads.size,
      boxes: [...boxThreads.entries()]
        .map(([box, set]) => ({ key: box, label: box, count: boxMsgs.get(box) ?? 0, sub: String(set.size) }))
        .sort((a, b) => b.count - a.count),
    },
    media: {
      items: mediaItems,
      photos: mediaItems.filter((m) => m.kind === 'photo').length,
      videos: mediaItems.filter((m) => m.kind === 'video').length,
      inMessages: mediaItems.filter((m) => m.source === 'message').length,
      withIp: mediaItems.filter((m) => m.uploadIp).length,
    },
    instagram: {
      watched: { ...watched, total: watched.stories + watched.posts + watched.videos + watched.threads },
      topWatched: ranked(watchedMap, 10),
      links: of('link_visited').length,
      topSites: ranked(siteMap, 12),
      likes: of('reaction').length,
      comments: of('comment').length,
      saved: of('item_saved').length,
      followers: followerNames.size,
      following: followingNames.size,
      mutual: [...followerNames].filter((n) => followingNames.has(n)).length,
      closeFriends: of('close_friend').length,
      unfollowed: of('unfollowed').length,
      threadsFollowers: of('threads_follower').length,
      posts: ownPosts.length,
      stories: of('story_posted').length,
      deleted: of('deleted_content').length,
      postsWithPlace: [...ownPosts, ...of('story_posted')].filter((e) => e.meta?.hasPlace).length,
      postDevices: [...new Set(ownPosts.map((e) => e.meta?.deviceName).filter((d): d is string => typeof d === 'string'))],
      leadForms: of('lead_form').length,
      notInterested: of('not_interested').length,
      aiChats: of('ai_conversation').length,
      adsWatched: of('ad_viewed').length,
    },
    profile: {
      about: facts.filter((f) => f.group === 'profile'),
      guesses: [...guessSources.entries()].map(([source, fs]) => ({ source, facts: fs })),
      deviceFacts,
      hardware: { gpus: uniq(/GPU renderer|renderer$/i), ram: uniq(/RAM/i), cores: uniq(/CPU cores/i) },
      locationFacts: facts.filter((f) => f.group === 'location'),
      lastLocation: collections.lastLocation,
    },
  };
}
