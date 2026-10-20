import { str } from '../importer/text';
import { toMs } from '../importer/time';
import { UNKNOWN_PEOPLE } from './labels';
import type { EventInput, Parser } from './types';
import { isObj, mediaUris, objs } from './util';

/** Is this JSON a Messenger thread (any folder: inbox, filtered_threads, e2ee_cutover …)? */
export const isThread = (json: unknown): json is { participants: unknown[]; messages: unknown[] } =>
  isObj(json) && Array.isArray(json.participants) && Array.isArray(json.messages);

/** Folder a thread lives in: inbox, filtered_threads, archived_threads, message_requests, e2ee_cutover … */
const boxOf = (path: string) => {
  const parts = path.split('/');
  const i = parts.indexOf('messages');
  return i >= 0 && parts[i + 2] ? parts[i + 1]! : 'inbox';
};

const personName = (v: unknown) => {
  const n = str(v);
  return n && !UNKNOWN_PEOPLE.has(n) ? n : 'Unknown';
};

/**
 * One event per message. Threads split across message_1.json, message_2.json … are each
 * parsed as they come; the events simply add up, so no merging step is needed.
 */
export const messagesParser: Parser = {
  id: 'messages',
  label: 'Messages',
  category: 'messages',
  match: (_path, json) => isThread(json),
  parse(json, ctx) {
    if (!isThread(json)) return {};
    const box = boxOf(ctx.path);
    const participants = objs(json.participants).map((p) => personName(p.name));
    const others = participants.filter((p) => p !== ctx.owner);
    const isGroup = others.length > 1;
    const threadTitle = str((json as Record<string, unknown>).title) ?? others.join(', ');
    const thread = ctx.path.split('/').slice(0, -1).join('/');
    const events: EventInput[] = [];
    const msgs = objs(json.messages);

    for (const m of msgs) {
      const timestamp = toMs(m.timestamp_ms) ?? toMs(m.timestamp);
      if (timestamp === undefined) continue;
      const sender = personName(m.sender_name);
      const sent = ctx.owner !== undefined && sender === ctx.owner;
      const content = str(m.content);
      const media = mediaUris(m);
      const kind = content ? 'text' : media.length ? 'media' : m.share ? 'link' : m.sticker ? 'sticker' : m.call_duration !== undefined ? 'call' : 'other';
      events.push({
        type: sent ? 'message_sent' : 'message_received',
        category: 'messages',
        timestamp,
        title: sent
          ? isGroup
            ? `Message in ${threadTitle}`
            : `Message to ${others[0] ?? threadTitle}`
          : isGroup
            ? `${sender} in ${threadTitle}`
            : `Message from ${sender}`,
        text: content,
        // The other person in 1:1 chats; the sender for group messages you received.
        people: sent ? (isGroup ? undefined : others.slice(0, 1)) : [sender],
        mediaUris: media.length ? media : undefined,
        meta: {
          box,
          thread,
          kind,
          group: isGroup,
          ...(m.is_unsent === true ? { unsent: true } : {}),
        },
      });
    }
    return { events, records: msgs.length };
  },
};
