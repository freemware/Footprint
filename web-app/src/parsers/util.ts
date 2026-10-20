import { firstMs } from '../importer/time';
import { str } from '../importer/text';

export type Obj = Record<string, unknown>;
export const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const objs = (v: unknown): Obj[] => arr(v).filter(isObj);

/**
 * Records in a file, whatever the wrapper:
 *   [ ... ]                       → the array
 *   { "friends_v2": [ ... ] }     → the inner array (any single-array wrapper key)
 *   { "label_values": [ ... ] }   → [ the object ]  (one label record)
 */
export function records(json: unknown, key?: string | RegExp): Obj[] {
  if (Array.isArray(json)) return objs(json);
  if (!isObj(json)) return [];
  if (Array.isArray(json.label_values)) return [json];
  const keys = Object.keys(json);
  if (key) {
    const k = typeof key === 'string' ? key : keys.find((x) => key.test(x));
    return k ? objs(json[k]) : [];
  }
  const arrays = keys.filter((k) => Array.isArray(json[k]));
  return arrays.length === 1 ? objs(json[arrays[0]!]) : [];
}

/** Does the object have this wrapper key (exactly, or matching a pattern like /^friends(_v\d+)?$/)? */
export const hasKey = (json: unknown, key: RegExp) => isObj(json) && Object.keys(json).some((k) => key.test(k));

/** Matches a path ending, ignoring Facebook's page suffixes (_1, _2 …). */
export const pathIs = (path: string, re: RegExp) => re.test(path.toLowerCase());

/** Record-level time from any of the usual keys. */
export const recordTime = (r: Obj) =>
  firstMs(r.timestamp, r.timestamp_ms, r.creation_timestamp, r.created_timestamp, r.start_timestamp, r.time);

/** Collect `data[].X` string values, e.g. data[].post or data[].name. */
export function dataTexts(r: Obj, key: string): string[] {
  const out: string[] = [];
  for (const d of objs(r.data)) {
    const v = str(d[key]);
    if (v) out.push(v);
  }
  return out;
}

/** All `uri` values under attachments / media, for media thumbnails later. */
export function mediaUris(r: Obj): string[] {
  const out: string[] = [];
  const visit = (v: unknown, depth: number) => {
    if (depth > 6) return;
    if (Array.isArray(v)) v.forEach((x) => visit(x, depth + 1));
    else if (isObj(v)) {
      const uri = str(v.uri);
      if (uri && !/^https?:/i.test(uri)) out.push(uri);
      for (const k of ['attachments', 'data', 'media', 'photos', 'videos', 'gifs', 'audio_files', 'files', 'sticker'])
        if (k in v) visit(v[k], depth + 1);
    }
  };
  visit(r, 0);
  return [...new Set(out)];
}

/** Upload IPs embedded in photo/video EXIF data. */
export function uploadIps(r: Obj): string[] {
  const out = new Set<string>();
  const visit = (v: unknown, depth: number) => {
    if (depth > 8) return;
    if (Array.isArray(v)) v.forEach((x) => visit(x, depth + 1));
    else if (isObj(v)) {
      const ip = str(v.upload_ip);
      if (ip) out.add(ip);
      Object.values(v).forEach((x) => visit(x, depth + 1));
    }
  };
  visit(r, 0);
  return [...out];
}

/** "your_search_history" → "Your search history" */
export const humanize = (path: string) => {
  const stem = (path.split('/').pop() ?? path).replace(/\.json$/i, '').replace(/_\d+$/, '').replace(/_/g, ' ');
  return stem.charAt(0).toUpperCase() + stem.slice(1);
};

/** Plain key/value lines for a classic (non label_values) record, for the inspector. */
export function objectLines(r: unknown, prefix = '', depth = 0): [string, string][] {
  const out: [string, string][] = [];
  if (depth > 5) return out;
  if (Array.isArray(r)) r.forEach((x) => out.push(...objectLines(x, prefix, depth + 1)));
  else if (isObj(r))
    for (const [k, v] of Object.entries(r)) {
      const label = prefix ? `${prefix} › ${k}` : k;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        if (v !== '' && v !== 0) out.push([label, String(v)]);
      } else out.push(...objectLines(v, label, depth + 1));
    }
  return out.slice(0, 60);
}
