import { fieldsToLines, firstText, firstTime, isLabelRecord, toFields } from '../importer/fields';
import { str } from '../importer/text';
import type { Category } from '../model/types';
import type { EventInput, Parser } from './types';
import { dataTexts, humanize, isObj, objectLines, recordTime, records } from './util';

/** Folder → category, for files no specific parser understands. */
export function categoryForPath(path: string): Category {
  const p = path.toLowerCase();
  if (p.includes('/messages/')) return 'messages';
  if (p.includes('/groups/')) return 'groups';
  if (p.includes('/events/')) return 'events';
  if (p.includes('/pages/')) return 'pages';
  if (p.includes('/posts/') || p.includes('/stories/')) return 'posts';
  if (p.includes('comments_and_reactions/')) return 'reactions';
  if (p.includes('/search/')) return 'search';
  if (p.startsWith('ads_information/')) return 'ads';
  if (p.startsWith('apps_and_websites_off_of_facebook/')) return 'off_meta';
  if (p.startsWith('connections/')) return 'connections';
  if (p.startsWith('security_and_login_information/')) return 'security';
  if (p.startsWith('personal_information/')) return 'profile';
  if (p.includes('/location/')) return 'location';
  return 'other';
}

/**
 * Fallback for every other JSON file: any record with a time becomes a timeline event,
 * titled after the file, so all logged activity appears somewhere even before a
 * dedicated parser exists. Files without times stay available in the raw data view.
 */
export const genericParser: Parser = {
  id: 'generic',
  label: 'Other logged activity',
  category: 'other',
  match: () => true,
  parse(json, ctx) {
    const recs = records(json);
    const list = recs.length ? recs : isObj(json) ? [json] : [];
    const category = categoryForPath(ctx.path);
    const kind = humanize(ctx.path);
    const events: EventInput[] = [];
    for (const r of list) {
      const fields = isLabelRecord(r) ? toFields(r.label_values) : undefined;
      // Only the record's own time counts here; nested times (e.g. "end time") would scatter noise.
      const timestamp = recordTime(r) ?? (fields ? firstTime(fields.filter((f) => !f.children && !f.items)) : undefined);
      if (timestamp === undefined) continue;
      const title = str(r.title) ?? str(r.name) ?? dataTexts(r, 'name')[0] ?? (fields ? firstText(fields) : undefined);
      events.push({
        type: 'logged',
        category,
        timestamp,
        title: title ? `${kind}: ${title}` : kind,
        details: fields ? fieldsToLines(fields) : objectLines(r),
        meta: { kind },
      });
    }
    return { events, records: list.length };
  },
};
