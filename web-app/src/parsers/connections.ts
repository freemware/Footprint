import { str } from '../importer/text';
import type { Category } from '../model/types';
import type { EventInput, Parser } from './types';
import { dataTexts, hasKey, objectLines, pathIs, recordTime, records } from './util';

/**
 * Factory for the many "list of { name, timestamp }" files
 * (friends, removed friends, requests, follows, page likes …).
 * A file matches by its wrapper key (e.g. friends_v2) or, failing that, its file name.
 */
function nameList(opts: {
  id: string;
  label: string;
  category: Category;
  type: string;
  key: RegExp;
  file: RegExp;
  /** Whether the name is a person (feeds the people filter) or a page/group. */
  person: boolean;
  /** Display title. `recordTitle` is Facebook's own sentence for the record, when present. */
  title: (name: string, recordTitle?: string) => string;
}): Parser {
  return {
    id: opts.id,
    label: opts.label,
    category: opts.category,
    match: (path, json) => hasKey(json, opts.key) || (pathIs(path, opts.file) && Array.isArray(json)),
    parse(json) {
      const recs = records(json, opts.key);
      const events: EventInput[] = [];
      for (const r of recs) {
        const name = str(r.name) ?? dataTexts(r, 'name')[0] ?? str(r.title);
        const timestamp = recordTime(r);
        if (timestamp === undefined) continue;
        events.push({
          type: opts.type,
          category: opts.category,
          timestamp,
          title: name ? opts.title(name, str(r.title)) : str(r.title) ?? opts.label,
          people: opts.person && name ? [name] : undefined,
          details: objectLines(r),
          meta: name && !opts.person ? { target: name } : undefined,
        });
      }
      return { events, records: recs.length };
    },
  };
}

export const connectionParsers: Parser[] = [
  nameList({
    id: 'friends',
    label: 'Friends',
    category: 'connections',
    type: 'friend_added',
    key: /^friends(_v\d+)?$/,
    file: /\/your_friends(_\d+)?\.json$/,
    person: true,
    title: (n) => `Became friends with ${n}`,
  }),
  nameList({
    id: 'removed_friends',
    label: 'Removed friends',
    category: 'connections',
    type: 'friend_removed',
    key: /^deleted_friends(_v\d+)?$/,
    file: /\/removed_friends(_\d+)?\.json$/,
    person: true,
    title: (n) => `Removed ${n} as a friend`,
  }),
  nameList({
    id: 'sent_friend_requests',
    label: 'Sent friend requests',
    category: 'connections',
    type: 'friend_request_sent',
    key: /^sent_requests(_v\d+)?$/,
    file: /\/sent_friend_requests(_\d+)?\.json$/,
    person: true,
    title: (n) => `Sent a friend request to ${n}`,
  }),
  nameList({
    id: 'received_friend_requests',
    label: 'Received friend requests',
    category: 'connections',
    type: 'friend_request_received',
    key: /^received_requests(_v\d+)?$/,
    file: /\/received_friend_requests(_\d+)?\.json$/,
    person: true,
    title: (n) => `Friend request from ${n}`,
  }),
  nameList({
    id: 'rejected_friend_requests',
    label: 'Rejected friend requests',
    category: 'connections',
    type: 'friend_request_rejected',
    key: /^rejected_requests(_v\d+)?$/,
    file: /\/rejected_friend_requests(_\d+)?\.json$/,
    person: true,
    title: (n) => `Declined a friend request from ${n}`,
  }),
  nameList({
    id: 'following',
    label: "Who you've followed",
    category: 'connections',
    type: 'followed',
    key: /^following(_v\d+)?$/,
    file: /\/who_you've_followed(_\d+)?\.json$/,
    person: true,
    title: (n) => `Followed ${n}`,
  }),
  nameList({
    id: 'page_likes',
    label: "Pages you've liked",
    category: 'pages',
    type: 'page_liked',
    key: /^page_likes(_v\d+)?$/,
    file: /\/pages_you've_liked(_\d+)?\.json$/,
    person: false,
    title: (n) => `Liked the page ${n}`,
  }),
  nameList({
    id: 'pages_followed',
    label: 'Pages and profiles you follow',
    category: 'pages',
    type: 'page_followed',
    key: /^pages_followed(_v\d+)?$/,
    file: /\/pages_and_profiles_you_follow(_\d+)?\.json$/,
    person: false,
    title: (n) => `Followed ${n}`,
  }),
  nameList({
    id: 'pages_unfollowed',
    label: "Pages and profiles you've unfollowed",
    category: 'pages',
    type: 'page_unfollowed',
    key: /^pages_unfollowed(_v\d+)?$/,
    file: /\/pages_and_profiles_you've_unfollowed(_\d+)?\.json$/,
    person: false,
    title: (n) => `Unfollowed ${n}`,
  }),
  nameList({
    id: 'groups_joined',
    label: 'Group membership activity',
    category: 'groups',
    type: 'group_membership',
    key: /^groups_joined(_v\d+)?$/,
    file: /\/your_group_membership_activity(_\d+)?\.json$/,
    person: false,
    title: (n, t) => t ?? n,
  }),
  nameList({
    id: 'saved_items',
    label: 'Saved items',
    category: 'other',
    type: 'item_saved',
    key: /^saves(_v\d+)?$/,
    file: /\/your_saved_items(_\d+)?\.json$/,
    person: false,
    title: (n, t) => t ?? n,
  }),
];
