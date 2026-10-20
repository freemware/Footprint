import { fieldsToLines, fieldText, firstTime } from '../../importer/fields';
import { str } from '../../importer/text';
import { firstMs } from '../../importer/time';
import { IG } from '../labels';
import type { EventInput, Parser } from '../types';
import { objectLines, recordTime, records } from '../util';
import { domainOf, fieldsOf, igPath, labelRecords, mediaOf, ownerOf, ownText, sld, smd, smdLines } from './shared';

/**
 * your_instagram_activity and logged_information: what you liked, commented, saved and viewed,
 * the websites you opened inside Instagram, your searches, and your own posts and stories.
 */

/** Likes on posts, comments and stories, and emoji reactions to stories. All become 'reaction'. */
export const igLikesParser: Parser = {
  id: 'ig_likes',
  label: 'Likes',
  category: 'reactions',
  match: igPath(/your_instagram_activity\/(likes\/(liked_posts|liked_comments)|story_interactions\/(story_likes|emoji_story_reactions))(_\d+)?\.json$/),
  parse(json, ctx) {
    const on = /liked_comments/.test(ctx.path) ? 'comment' : /story/.test(ctx.path) ? 'story' : 'post';
    const events: EventInput[] = [];
    const recs = records(json);
    for (const r of recs) {
      if (Array.isArray(r.label_values)) {
        const f = fieldsOf(r);
        const timestamp = recordTime(r) ?? firstTime(f);
        if (timestamp === undefined) continue;
        const who = ownerOf(f);
        const emoji = ownText(f, IG.emoji);
        events.push({
          type: 'reaction',
          category: 'reactions',
          timestamp,
          title: `${emoji ? `Reacted ${emoji} to` : 'Liked'} ${who ? `${who}’s ` : 'a '}${on}`,
          people: who ? [who] : undefined,
          details: fieldsToLines(f),
          meta: { reaction: emoji ? 'emoji' : 'like', on },
        });
      } else {
        // liked_comments: { title: account, string_list_data: [ { href, timestamp } ] }
        const e = sld(r);
        const timestamp = e.time ?? recordTime(r);
        if (timestamp === undefined) continue;
        const who = str(r.title);
        events.push({
          type: 'reaction',
          category: 'reactions',
          timestamp,
          title: `Liked ${who ? `${who}’s ` : 'a '}${on}`,
          people: who ? [who] : undefined,
          details: objectLines(r),
          meta: { reaction: 'like', on },
        });
      }
    }
    return { events, records: recs.length };
  },
};

/** Comments on posts and reels, and story "hype" comments: { string_map_data: { Comment, Media Owner, Time } }. */
export const igCommentsParser: Parser = {
  id: 'ig_comments',
  label: 'Comments',
  category: 'comments',
  match: igPath(/your_instagram_activity\/comments\/[^/]+\.json$/),
  parse(json) {
    const recs = records(json);
    const events: EventInput[] = [];
    for (const r of recs) {
      const timestamp = smd(r, 'Time').time ?? recordTime(r);
      if (timestamp === undefined) continue;
      const who = smd(r, 'Media Owner').text;
      const text = smd(r, 'Comment').text;
      events.push({
        type: 'comment',
        category: 'comments',
        timestamp,
        title: `Commented on ${who ? `${who}’s post` : 'a post'}`,
        text,
        people: who ? [who] : undefined,
        details: smdLines(r),
      });
    }
    return { events, records: recs.length };
  },
};

/** Saved posts. */
export const igSavedParser: Parser = {
  id: 'ig_saved',
  label: 'Saved posts',
  category: 'other',
  match: igPath(/your_instagram_activity\/saved\/saved_posts(_\d+)?\.json$/),
  parse(json) {
    const recs = labelRecords(json);
    const events: EventInput[] = [];
    for (const { r, f } of recs) {
      const timestamp = recordTime(r) ?? firstTime(f);
      if (timestamp === undefined) continue;
      const who = ownerOf(f);
      events.push({ type: 'item_saved', category: 'other', timestamp, title: `Saved ${who ? `${who}’s post` : 'a post'}`, people: who ? [who] : undefined, details: fieldsToLines(f) });
    }
    return { events, records: recs.length };
  },
};

/** Stories you watched, Threads posts you saw, and your answers to stickers (polls, questions, quizzes). */
export const igViewsParser: Parser = {
  id: 'ig_views',
  label: 'Stories and Threads posts you viewed',
  category: 'other',
  match: igPath(/your_instagram_activity\/(story_interactions\/(stories_viewed|polls|questions|quizzes)|threads\/threads_viewed)(_\d+)?\.json$/),
  parse(json, ctx) {
    const type = /stories_viewed/.test(ctx.path) ? 'story_viewed' : /threads_viewed/.test(ctx.path) ? 'thread_post_viewed' : 'story_sticker';
    const recs = records(json);
    const events: EventInput[] = [];
    for (const r of recs) {
      let timestamp: number | undefined;
      let who: string | undefined;
      let details: [string, string][];
      if (Array.isArray(r.label_values)) {
        const f = fieldsOf(r);
        timestamp = recordTime(r) ?? firstTime(f);
        who = ownerOf(f);
        details = fieldsToLines(f);
      } else {
        timestamp = smd(r, 'Time').time ?? recordTime(r);
        who = smd(r, 'Author').text;
        details = smdLines(r);
      }
      if (timestamp === undefined) continue;
      events.push({
        type,
        category: 'other',
        timestamp,
        title:
          type === 'story_viewed'
            ? `Watched ${who ? `${who}’s` : 'a'} story`
            : type === 'thread_post_viewed'
              ? `Saw a Threads post${who ? ` by ${who}` : ''}`
              : 'Answered a story sticker',
        details,
        meta: who ? { account: who } : undefined,
      });
    }
    return { events, records: recs.length };
  },
};

/** link_history.json: web pages opened in Instagram's built-in browser, kept by Meta. */
export const igLinksParser: Parser = {
  id: 'ig_links',
  label: 'Websites you opened in Instagram',
  category: 'other',
  match: igPath(/logged_information\/link_history\/link_history(_\d+)?\.json$/),
  parse(json) {
    const recs = labelRecords(json);
    const events: EventInput[] = [];
    for (const { r, f } of recs) {
      const timestamp = recordTime(r) ?? firstTime(f);
      if (timestamp === undefined) continue;
      const href = fieldText(f, IG.linkUrl);
      const domain = domainOf(href);
      events.push({
        type: 'link_visited',
        category: 'other',
        timestamp,
        title: `Opened ${domain ?? 'a website'} inside Instagram`,
        text: fieldText(f, IG.linkTitle),
        details: fieldsToLines(f),
        meta: domain ? { domain } : undefined,
      });
    }
    return { events, records: recs.length };
  },
};

/** Searches: words and phrases, profiles, and the recent-searches list. */
export const igSearchParser: Parser = {
  id: 'ig_search',
  label: 'Searches',
  category: 'search',
  match: igPath(/logged_information\/recent_searches\/[^/]+\.json$/),
  parse(json, ctx) {
    const profiles = /profile_searches/.test(ctx.path);
    const recs = records(json);
    const events: EventInput[] = [];
    for (const r of recs) {
      let timestamp: number | undefined;
      let text: string | undefined;
      let details: [string, string][];
      if (Array.isArray(r.label_values)) {
        const f = fieldsOf(r);
        timestamp = recordTime(r) ?? firstTime(f);
        text = ownText(f, IG.searchQuery);
        details = fieldsToLines(f);
      } else if (profiles) {
        const e = sld(r);
        timestamp = e.time ?? recordTime(r);
        text = str(r.title) ?? e.value;
        details = objectLines(r);
      } else {
        timestamp = smd(r, 'Time').time ?? recordTime(r);
        text = smd(r, 'Search').text;
        details = smdLines(r);
      }
      if (timestamp === undefined) continue;
      events.push({
        type: 'search',
        category: 'search',
        timestamp,
        title: profiles ? 'Searched for a profile' : 'Searched Instagram',
        text,
        details,
        meta: { kind: profiles ? 'profile' : 'words' },
      });
    }
    return { events, records: recs.length };
  },
};

/**
 * Your own content: posts (kept twice, in posts.json and posts_1.json; merged by creation time),
 * stories, other content, reposts, profile photos, and "recently deleted" items Instagram still holds.
 */
export const igContentParser: Parser = {
  id: 'ig_content',
  label: 'Your posts and stories',
  category: 'posts',
  match: igPath(/your_instagram_activity\/media\/(posts|stories|other_content|recently_deleted_content|reposts|profile_photos)(_\d+)?\.json$/),
  parse(json, ctx) {
    const file = ctx.path.split('/').pop()!.replace(/(_\d+)?\.json$/i, '');
    const type =
      file === 'stories' ? 'story_posted' : file === 'recently_deleted_content' ? 'deleted_content' : file === 'reposts' ? 'repost' : file === 'profile_photos' ? 'profile_photo' : 'post';
    const recs = records(json);
    const events: EventInput[] = [];
    for (const r of recs) {
      if (Array.isArray(r.label_values)) {
        const f = fieldsOf(r);
        const timestamp = firstMs(...f.filter((x) => IG.creationTime.includes(x.label as never)).map((x) => x.time)) ?? recordTime(r) ?? firstTime(f);
        if (timestamp === undefined) continue;
        const lat = Number(ownText(f, IG.latitude));
        const lng = Number(ownText(f, IG.longitude));
        const hasPlace = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
        const device = ownText(f, IG.deviceName);
        events.push({
          type,
          category: 'posts',
          timestamp,
          title: TITLES[type],
          text: ownText(f, IG.caption) ?? ownText(f, IG.title),
          mediaUris: mediaOf(f),
          location: hasPlace ? { lat, lng } : undefined,
          device,
          details: fieldsToLines(f),
          meta: { ...(type === 'post' && file !== 'other_content' ? { dedupe: 'ig-post' } : {}), ...(hasPlace ? { hasPlace: true } : {}), ...(device ? { deviceName: device } : {}) },
        });
      } else {
        // Classic: { title, creation_timestamp, media: [ { uri, creation_timestamp } ] } or a bare media item.
        const timestamp = firstMs(r.creation_timestamp) ?? recordTime(r) ?? firstMs(...records(r.media).map((m) => m.creation_timestamp));
        if (timestamp === undefined) continue;
        events.push({
          type,
          category: 'posts',
          timestamp,
          title: TITLES[type],
          text: str(r.title) ?? str(records(r.media)[0]?.title),
          mediaUris: mediaOf([], r),
          details: objectLines(r),
          meta: type === 'post' && file !== 'other_content' ? { dedupe: 'ig-post' } : undefined,
        });
      }
    }
    return { events, records: recs.length };
  },
};

const TITLES: Record<string, string> = {
  post: 'Shared a post',
  story_posted: 'Shared a story',
  deleted_content: 'Deleted a post or story (still kept for now)',
  repost: 'Reposted something',
  profile_photo: 'Changed your profile photo',
};

/** Conversations with Meta AI, from messages/ai_conversations.json. Only the fact and time are shown. */
export const igAiChatsParser: Parser = {
  id: 'ig_ai_chats',
  label: 'Conversations with Meta AI',
  category: 'messages',
  match: igPath(/your_instagram_activity\/messages\/ai_conversations(_\d+)?\.json$/),
  parse(json) {
    const recs = records(json);
    const events: EventInput[] = [];
    for (const r of recs) {
      const timestamp = recordTime(r);
      if (timestamp === undefined) continue;
      events.push({ type: 'ai_conversation', category: 'messages', timestamp, title: 'A conversation with Meta AI', details: Array.isArray(r.label_values) ? fieldsToLines(fieldsOf(r)) : objectLines(r) });
    }
    return { events, records: recs.length };
  },
};

export const instagramActivityParsers = [igLikesParser, igCommentsParser, igSavedParser, igViewsParser, igLinksParser, igSearchParser, igContentParser, igAiChatsParser];
