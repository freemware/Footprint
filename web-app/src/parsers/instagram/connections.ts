import { fieldsToLines, firstTime } from '../../importer/fields';
import { str } from '../../importer/text';
import { IG } from '../labels';
import type { EventInput, Parser } from '../types';
import { objectLines, recordTime, records } from '../util';
import { fieldsOf, igPath, ownText, sld } from './shared';

/**
 * connections/followers_and_following and the Threads lists. Three shapes appear:
 *   followers_1.json      [ { string_list_data: [ { value: username, href, timestamp } ] } ]
 *   following.json        { relationships_following: [ { title: username, string_list_data: [ { href, timestamp } ] } ] }
 *   close_friends.json …  [ { timestamp, label_values: [ Name, URL, Username ] } ]
 */
const LISTS: { file: RegExp; type: string; title: (who: string) => string }[] = [
  { file: /followers_and_following\/followers(_\d+)?\.json$/, type: 'follower_added', title: (w) => `${w} followed you` },
  { file: /followers_and_following\/following(_\d+)?\.json$/, type: 'followed', title: (w) => `You followed ${w}` },
  { file: /followers_and_following\/close_friends(_\d+)?\.json$/, type: 'close_friend', title: (w) => `Added ${w} to Close Friends` },
  { file: /followers_and_following\/hide_story_from(_\d+)?\.json$/, type: 'story_hidden_from', title: (w) => `Hid your stories from ${w}` },
  { file: /followers_and_following\/pending_follow_requests(_\d+)?\.json$/, type: 'follow_request_sent', title: (w) => `Asked to follow ${w} (still pending)` },
  { file: /followers_and_following\/recent_follow_requests(_\d+)?\.json$/, type: 'follow_request_sent', title: (w) => `Asked to follow ${w}` },
  { file: /followers_and_following\/recently_unfollowed_profiles(_\d+)?\.json$/, type: 'unfollowed', title: (w) => `Unfollowed ${w}` },
  { file: /followers_and_following\/removed_suggestions(_\d+)?\.json$/, type: 'suggestion_removed', title: (w) => `Dismissed ${w} from suggestions` },
  { file: /followers_and_following\/(restricted_profiles|blocked_profiles)(_\d+)?\.json$/, type: 'restricted', title: (w) => `Restricted or blocked ${w}` },
  { file: /your_instagram_activity\/threads\/followers(_\d+)?\.json$/, type: 'threads_follower', title: (w) => `${w} followed you on Threads` },
  { file: /your_instagram_activity\/threads\/(recently_unfollowed_profiles|following)(_\d+)?\.json$/, type: 'threads_follow_change', title: (w) => `Threads: ${w}` },
];

export const igConnectionsParser: Parser = {
  id: 'ig_connections',
  label: 'Followers and following',
  category: 'connections',
  match: (path) => LISTS.some((l) => igPath(l.file)(path)),
  parse(json, ctx) {
    const list = LISTS.find((l) => igPath(l.file)(ctx.path))!;
    const recs = records(json);
    const events: EventInput[] = [];
    for (const r of recs) {
      let who: string | undefined;
      let timestamp: number | undefined;
      let details: [string, string][];
      if (Array.isArray(r.label_values)) {
        const f = fieldsOf(r);
        who = ownText(f, IG.username) ?? ownText(f, IG.name);
        timestamp = recordTime(r) ?? firstTime(f);
        details = fieldsToLines(f);
      } else {
        const e = sld(r);
        who = e.value ?? str(r.title);
        timestamp = e.time ?? recordTime(r);
        details = objectLines(r);
      }
      if (timestamp === undefined) continue;
      events.push({ type: list.type, category: 'connections', timestamp, title: who ? list.title(who) : list.title('someone'), people: who ? [who] : undefined, details });
    }
    return { events, records: recs.length };
  },
};

export const instagramConnectionParsers = [igConnectionsParser];
