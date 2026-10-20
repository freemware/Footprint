import { fieldsToLines, fieldText, findField, firstTime, isLabelRecord, toFields } from '../importer/fields';
import { str } from '../importer/text';
import { toMs } from '../importer/time';
import { L, REACTIONS, titleTarget } from './labels';
import type { EventInput, Parser } from './types';
import { dataTexts, hasKey, isObj, mediaUris, objectLines, objs, pathIs, recordTime, records, uploadIps } from './util';

const normReaction = (v: string | undefined) => (v ? REACTIONS[v.toLowerCase()] ?? v.toLowerCase() : 'like');

/**
 * Likes and reactions. Pages of this file can use either format:
 * newer label_values records (Reaction / Name / URL fields) or older
 * { title, data: [{ reaction: { reaction, actor } }] } items. Detected per record.
 */
export const reactionsParser: Parser = {
  id: 'reactions',
  label: 'Likes and reactions',
  category: 'reactions',
  match: (path) => pathIs(path, /comments_and_reactions\/likes_and_reactions(_\d+)?\.json$/) || pathIs(path, /\/posts_and_comments(_\d+)?\.json$/),
  parse(json, ctx) {
    const recs = records(json, /^reactions(_v\d+)?$/);
    const events: EventInput[] = [];
    for (const r of recs) {
      if (isLabelRecord(r)) {
        const f = toFields(r.label_values);
        const timestamp = recordTime(r) ?? firstTime(f);
        if (timestamp === undefined) continue;
        const reaction = normReaction(fieldText(f, L.reaction));
        const target = fieldText(f, L.name);
        events.push({
          type: 'reaction',
          category: 'reactions',
          timestamp,
          title: target ? `Reacted (${reaction}) to ${target}` : `Reacted (${reaction})`,
          text: fieldText(f, L.title),
          people: target && target !== ctx.owner ? [target] : undefined,
          details: fieldsToLines(f),
          meta: { reaction },
        });
      } else {
        const timestamp = recordTime(r);
        if (timestamp === undefined) continue;
        const rx = objs(r.data).map((d) => (isObj(d.reaction) ? d.reaction : undefined)).find(Boolean);
        const reaction = normReaction(str(rx?.reaction));
        const title = str(r.title);
        const target = titleTarget(title, ctx.owner);
        events.push({
          type: 'reaction',
          category: 'reactions',
          timestamp,
          title: title ?? `Reacted (${reaction})`,
          people: target ? [target] : undefined,
          details: objectLines(r),
          meta: { reaction },
        });
      }
    }
    return { events, records: recs.length };
  },
};

/** Comments, including comments in groups (which add a `group` field). */
export const commentsParser: Parser = {
  id: 'comments',
  label: 'Comments',
  category: 'comments',
  match: (path, json) =>
    hasKey(json, /^(comments|group_comments)(_v\d+)?$/) || pathIs(path, /comments_and_reactions\/comments(_\d+)?\.json$/),
  parse(json, ctx) {
    const recs = records(json, /^(comments|group_comments)(_v\d+)?$/);
    const events: EventInput[] = [];
    for (const r of recs) {
      const timestamp = recordTime(r);
      if (timestamp === undefined) continue;
      const c = objs(r.data).map((d) => (isObj(d.comment) ? d.comment : undefined)).find(Boolean);
      const inGroupsFile = /groups\//.test(ctx.path);
      const group = str(c?.group);
      const title = str(r.title);
      const target = titleTarget(title, ctx.owner);
      events.push({
        type: group || inGroupsFile ? 'group_comment' : 'comment',
        category: group || inGroupsFile ? 'groups' : 'comments',
        timestamp,
        title: title ?? 'Comment',
        text: str(c?.comment),
        people: target ? [target] : undefined,
        mediaUris: mediaUris(r),
        details: objectLines(r),
        meta: group ? { group } : undefined,
      });
    }
    return { events, records: recs.length };
  },
};

/**
 * Your posts, posts in groups, and posts on other people's timelines.
 * Classic items: { timestamp, title, data: [{ post }], attachments: [{ data: [{ media | place | external_context }] }] }
 */
export const postsParser: Parser = {
  id: 'posts',
  label: 'Posts',
  category: 'posts',
  match: (path, json) =>
    hasKey(json, /^group_posts(_v\d+)?$/) ||
    pathIs(path, /posts\/your_posts.*\.json$/) ||
    pathIs(path, /posts\/posts_on_other_pages_and_profiles(_\d+)?\.json$/),
  parse(json) {
    const inGroups = hasKey(json, /^group_posts(_v\d+)?$/);
    const recs = records(json, /^(group_posts|wall_posts_sent_to_you|posts)(_v\d+)?$/);
    const events: EventInput[] = [];
    for (const r of recs) {
      if (isLabelRecord(r)) {
        const f = toFields(r.label_values);
        const timestamp = recordTime(r) ?? firstTime(f);
        if (timestamp === undefined) continue;
        events.push({
          type: 'post_on_other_profile',
          category: 'posts',
          timestamp,
          title: str((r as Record<string, unknown>).title) ?? fieldText(f, L.title) ?? 'Post on another profile',
          details: fieldsToLines(f),
        });
        continue;
      }
      const timestamp = recordTime(r);
      if (timestamp === undefined) continue;
      const place = objs(r.attachments)
        .flatMap((a) => objs(a.data))
        .map((d) => (isObj(d.place) ? d.place : undefined))
        .find(Boolean);
      const coord = isObj(place?.coordinate) ? place.coordinate : undefined;
      const ips = uploadIps(r);
      const title = str(r.title);
      events.push({
        type: inGroups ? 'group_post' : place ? 'check_in' : 'post',
        category: inGroups ? 'groups' : 'posts',
        timestamp,
        title: title ?? (inGroups ? 'Group post' : 'Post'),
        text: dataTexts(r, 'post').join('\n') || undefined,
        people: undefined,
        mediaUris: mediaUris(r),
        location:
          place || ips.length
            ? {
                city: str(place?.name),
                lat: typeof coord?.latitude === 'number' ? coord.latitude : undefined,
                lng: typeof coord?.longitude === 'number' ? coord.longitude : undefined,
                ip: ips[0],
              }
            : undefined,
        details: objectLines(r),
      });
    }
    return { events, records: recs.length };
  },
};

/** Photos and videos: albums, uncategorized photos, your videos. Each item carries EXIF with upload IP. */
export const mediaParser: Parser = {
  id: 'media',
  label: 'Photos and videos',
  category: 'media',
  match: (path, json) =>
    hasKey(json, /^(videos|other_photos)(_v\d+)?$/) ||
    (pathIs(path, /posts\/album\/[^/]+\.json$/) && isObj(json) && Array.isArray(json.photos)),
  parse(json) {
    const album = isObj(json) ? str(json.name) : undefined;
    const isVideo = hasKey(json, /^videos(_v\d+)?$/);
    const recs = isObj(json) && Array.isArray(json.photos) ? objs(json.photos) : records(json);
    const events: EventInput[] = [];
    for (const r of recs) {
      const timestamp = recordTime(r);
      const uri = str(r.uri);
      if (timestamp === undefined) continue;
      const ip = uploadIps(r)[0];
      let taken: number | undefined;
      JSON.stringify(r, (k, v) => {
        if (k === 'taken_timestamp' && taken === undefined) taken = toMs(v);
        return v;
      });
      events.push({
        type: isVideo ? 'video_upload' : 'photo_upload',
        category: 'media',
        timestamp,
        title: isVideo ? 'Uploaded a video' : album ? `Photo in album "${album}"` : 'Uploaded a photo',
        text: str(r.description) ?? str(r.title),
        mediaUris: uri ? [uri] : undefined,
        location: ip ? { ip } : undefined,
        details: objectLines(r),
        meta: { ...(album ? { album } : {}), ...(taken ? { taken } : {}) },
      });
    }
    return { events, records: recs.length };
  },
};

/** Search history: { timestamp, data: [{ text }], title }. */
export const searchParser: Parser = {
  id: 'searches',
  label: 'Search history',
  category: 'search',
  match: (path, json) => hasKey(json, /^searches(_v\d+)?$/) || pathIs(path, /search\/your_search_history(_\d+)?\.json$/),
  parse(json) {
    const recs = records(json, /^searches(_v\d+)?$/);
    const events: EventInput[] = [];
    for (const r of recs) {
      const timestamp = recordTime(r);
      if (timestamp === undefined) continue;
      const q = dataTexts(r, 'text')[0];
      events.push({
        type: 'search',
        category: 'search',
        timestamp,
        title: q ? `Searched “${q}”` : str(r.title) ?? 'Search',
        text: q,
        details: objectLines(r),
      });
    }
    return { events, records: recs.length };
  },
};

/** Events you responded to or were invited to. */
export const eventsParser: Parser = {
  id: 'events',
  label: 'Events',
  category: 'events',
  match: (_path, json) => hasKey(json, /^(event_responses|events_invited)(_v\d+)?$/),
  parse(json) {
    const events: EventInput[] = [];
    let count = 0;
    const push = (items: unknown, type: string, verb: string) => {
      for (const e of objs(items)) {
        count++;
        const timestamp = toMs(e.response_time) ?? toMs(e.start_timestamp);
        if (timestamp === undefined) continue;
        const name = str(e.name);
        events.push({
          type,
          category: 'events',
          timestamp,
          title: name ? `${verb}: ${name}` : verb,
          details: objectLines(e),
          meta: toMs(e.start_timestamp) ? { starts: toMs(e.start_timestamp)! } : undefined,
        });
      }
    };
    if (!isObj(json)) return {};
    for (const [k, v] of Object.entries(json)) {
      if (/^event_responses/.test(k) && isObj(v)) {
        push(v.events_joined, 'event_joined', 'Going');
        push(v.events_interested, 'event_interested', 'Interested');
        push(v.events_declined, 'event_declined', 'Declined');
      } else if (/^events_invited/.test(k)) push(v, 'event_invited', 'Invited');
    }
    return { events, records: count };
  },
};

/** Things Facebook logged you looking at: profiles visited, Marketplace items viewed, notifications. */
export const viewsParser: Parser = {
  id: 'views',
  label: 'Profile visits, items viewed, notifications',
  category: 'other',
  match: (path, json) =>
    pathIs(path, /interactions\/(profile_visits|items_viewed)(_\d+)?\.json$/) || hasKey(json, /^notifications(_v\d+)?$/),
  parse(json, ctx) {
    const recs = records(json, /^notifications(_v\d+)?$/);
    const kind = /profile_visits/.test(ctx.path) ? 'profile_visit' : /items_viewed/.test(ctx.path) ? 'item_viewed' : 'notification';
    const events: EventInput[] = [];
    for (const r of recs) {
      if (isLabelRecord(r)) {
        const f = toFields(r.label_values);
        const timestamp = recordTime(r) ?? firstTime(f);
        if (timestamp === undefined) continue;
        const name = fieldText(f, L.name);
        const item = fieldText(f, L.productName) ?? fieldText(f, L.title) ?? findField(f, L.title)?.title;
        events.push({
          type: kind,
          category: 'other',
          timestamp,
          title: kind === 'profile_visit' ? `Viewed ${name ?? 'a profile'}` : `Viewed on Marketplace: ${item ?? 'an item'}`,
          people: kind === 'profile_visit' && name ? [name] : undefined,
          details: fieldsToLines(f),
        });
      } else {
        const timestamp = recordTime(r);
        if (timestamp === undefined) continue;
        events.push({
          type: 'notification',
          category: 'other',
          timestamp,
          title: str(r.text) ?? 'Notification',
          details: objectLines(r),
          meta: typeof r.unread === 'boolean' ? { unread: r.unread } : undefined,
        });
      }
    }
    return { events, records: recs.length };
  },
};
