import { fieldText, findField, toFields, type Field } from '../../importer/fields';
import { str } from '../../importer/text';
import { firstMs } from '../../importer/time';
import { IG } from '../labels';
import { isObj, objs, pathIs, records, type Obj } from '../util';

/**
 * Helpers for Instagram's three record shapes:
 *   label_values records   { timestamp, label_values: [ { label, value | href | timestamp_value | dict | vec | media } ] }
 *   string_map_data records { title, string_map_data: { "Search": { value }, "Time": { timestamp } } }
 *   string_list_data records { title, string_list_data: [ { href, value, timestamp } ] }
 * Every helper tolerates missing pieces and returns undefined rather than throwing.
 */

/** Instagram path test: case-insensitive, page suffixes (_1, _2) allowed by the caller's pattern. */
export const igPath = (re: RegExp) => (path: string) => pathIs(path, re);

/** Records in a file, with the label_values fields already normalized. */
export function labelRecords(json: unknown): { r: Obj; f: Field[] }[] {
  return records(json)
    .filter((r) => Array.isArray(r.label_values))
    .map((r) => ({ r, f: toFields(r.label_values) }));
}

/** One label_values record's fields. */
export const fieldsOf = (r: Obj): Field[] => toFields(r.label_values);

/** The account a viewed or liked item belongs to: the Owner's username, else the item's Title. */
export function ownerOf(f: Field[]): string | undefined {
  const owner = f.find((x) => !x.label && x.title && IG.owner.includes(x.title as never));
  return (owner && fieldText(owner.children, IG.username)) ?? ownText(f, IG.username) ?? ownText(f, IG.title);
}

/** fieldText without searching nested records. */
export function ownText(f: Field[], labels: readonly string[]) {
  return findField(f, labels, false)?.text;
}

/** A string_map_data entry's text or time. */
export function smd(r: Obj, key: string): { text?: string; time?: number } {
  const m = isObj(r.string_map_data) ? r.string_map_data[key] : undefined;
  if (!isObj(m)) return {};
  return { text: str(m.value) ?? str(m.href), time: firstMs(m.timestamp) };
}

/** The first string_list_data entry (follower lists, liked comments, profile searches). */
export function sld(r: Obj): { href?: string; value?: string; time?: number } {
  const e = objs(r.string_list_data)[0];
  if (!e) return {};
  return { href: str(e.href), value: str(e.value), time: firstMs(e.timestamp) };
}

/** All media file paths in a label record (the "Media" field) or a classic record. */
export function mediaOf(f: Field[], r?: Obj): string[] {
  const out = new Set<string>();
  const visit = (fs: Field[] | undefined) => fs?.forEach((x) => {
    x.media?.forEach((u) => out.add(u));
    visit(x.children);
    x.items?.forEach((it) => visit(it.children));
  });
  visit(f);
  if (r) {
    const uri = str(r.uri);
    if (uri && !/^https?:/i.test(uri)) out.add(uri);
    for (const m of objs(r.media)) {
      const u = str(m.uri);
      if (u && !/^https?:/i.test(u)) out.add(u);
    }
  }
  return [...out];
}

/** "https://www.example.com/a?b" → "example.com". Undefined for anything that isn't a web address. */
export function domainOf(href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    const u = new URL(href);
    return /^https?:$/.test(u.protocol) ? u.hostname.replace(/^www\./, '').toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

/** Plain "label: value" lines for a string_map_data record, for the inspector. */
export function smdLines(r: Obj): [string, string][] {
  const out: [string, string][] = [];
  if (!isObj(r.string_map_data)) return out;
  for (const [k, v] of Object.entries(r.string_map_data)) {
    if (!isObj(v)) continue;
    const text = str(v.value) ?? str(v.href);
    const t = firstMs(v.timestamp);
    if (text) out.push([k, text]);
    else if (t !== undefined) out.push([k, new Date(t).toISOString()]);
  }
  return out;
}
