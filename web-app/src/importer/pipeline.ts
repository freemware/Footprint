import type { ActivityEvent, Collections, ExportSummary, ImportWarning, ImportedFile } from '../model/types';
import { emptyCollections } from '../model/types';
import { pickParser } from '../parsers/registry';
import { isThread } from '../parsers/messages';
import { ownerFromProfile } from '../parsers/profile';
import { objs } from '../parsers/util';
import { extractSettings } from '../parsers/settings';
import { detectPlatform } from './platform';

export interface SourceFile {
  path: string;
  size: number;
  /** Parsed and text-fixed JSON; undefined for media and other non-JSON files. */
  json?: unknown;
  /** Set when the file looked like JSON but couldn't be parsed. */
  error?: string;
}

export interface Dataset {
  events: ActivityEvent[];
  collections: Collections;
  summary: ExportSummary;
}

const MEDIA = /\.(jpe?g|png|gif|webp|heic|mp4|mov|webm|m4a|mp3|aac|wav|ogg|pdf)$/i;
export const fileKind = (path: string): ImportedFile['kind'] =>
  /\.json$/i.test(path) ? 'json' : MEDIA.test(path) ? 'media' : /\.html?$/i.test(path) ? 'html' : 'other';

/**
 * Who owns this export? The profile file says so directly. If it's missing (partial export),
 * the owner is the person who appears in most message threads.
 */
export function detectOwner(files: SourceFile[]): string | undefined {
  for (const f of files) {
    const o = f.json !== undefined ? ownerFromProfile(f.json) : undefined;
    if (o) return o;
  }
  const counts = new Map<string, number>();
  let threads = 0;
  for (const f of files) {
    if (!isThread(f.json) || !/message_1\.json$/.test(f.path)) continue;
    threads++;
    for (const p of objs(f.json.participants)) {
      const n = typeof p.name === 'string' ? p.name : undefined;
      if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top && threads >= 2 && top[1] >= threads * 0.6 ? top[0] : undefined;
}

function mergeCollections(into: Collections, add: Partial<Collections> | undefined) {
  if (!add) return;
  if (add.owner && !into.owner) into.owner = add.owner;
  if (add.accountCreated && !into.accountCreated) into.accountCreated = add.accountCreated;
  if (add.lastLocation) into.lastLocation = add.lastLocation;
  if (add.advertisers) into.advertisers.push(...add.advertisers);
  if (add.adInterests) into.adInterests.push(...add.adInterests);
  if (add.adCategories) into.adCategories.push(...add.adCategories);
  if (add.offMetaApps) into.offMetaApps.push(...add.offMetaApps);
  if (add.facts) into.facts.push(...add.facts);
  if (add.settings) Object.assign(into.settings, add.settings);
  if (add.connectedApps) into.connectedApps.push(...add.connectedApps);
  if (add.jurisdiction) into.jurisdiction = add.jurisdiction;
}

/** The same login can be logged in several security files. Keep the most detailed copy. */
function dedupeSecurity(events: ActivityEvent[]): ActivityEvent[] {
  const best = new Map<string, ActivityEvent>();
  const out: ActivityEvent[] = [];
  const score = (e: ActivityEvent) => (e.location?.city ? 2 : 0) + (e.device ? 1 : 0);
  for (const e of events) {
    if (e.category !== 'security' || !/^(login|logout)$/.test(e.type)) {
      out.push(e);
      continue;
    }
    const key = `${e.type}|${Math.round(e.timestamp / 1000)}`;
    const prev = best.get(key);
    if (!prev || score(e) > score(prev)) best.set(key, e);
  }
  return out.concat([...best.values()]);
}

/**
 * Some records are kept twice in different shapes (Instagram lists each post in posts.json and
 * posts_1.json, and privacy changes in two security files). Parsers mark those with meta.dedupe
 * (a family name); copies in the same family within a few seconds of each other become one event
 * that keeps the most detailed fields of each. The two copies' times can differ by a second.
 */
const DEDUPE_WINDOW_MS = 5000;
function dedupeKeyed(events: ActivityEvent[]): ActivityEvent[] {
  const families = new Map<string, ActivityEvent[]>();
  const out: ActivityEvent[] = [];
  for (const e of events) {
    const key = typeof e.meta?.dedupe === 'string' ? e.meta.dedupe : undefined;
    if (!key) {
      out.push(e);
      continue;
    }
    const kept = families.get(key) ?? [];
    families.set(key, kept);
    const i = kept.findIndex((k) => Math.abs(k.timestamp - e.timestamp) <= DEDUPE_WINDOW_MS);
    if (i < 0) {
      kept.push(e);
      continue;
    }
    const prev = kept[i]!;
    kept[i] = {
      ...prev,
      // A record's own wording ("Switched to Private") beats a generic one ("Account privacy changed").
      title: (prev.meta?.weakTitle ? e.title : prev.title) ?? e.title ?? prev.title,
      text: prev.text ?? e.text,
      location: prev.location?.lat !== undefined ? prev.location : e.location ?? prev.location,
      device: prev.device ?? e.device,
      mediaUris: [...new Set([...(prev.mediaUris ?? []), ...(e.mediaUris ?? [])])],
      details: (prev.details?.length ?? 0) >= (e.details?.length ?? 0) ? prev.details : e.details,
      meta: { ...e.meta, ...prev.meta, weakTitle: !!prev.meta?.weakTitle && !!e.meta?.weakTitle },
    };
  }
  return out.concat([...families.values()].flat());
}

function detectWarnings(files: SourceFile[], parsed: ImportedFile[]): ImportWarning[] {
  const w: ImportWarning[] = [];
  const json = files.filter((f) => fileKind(f.path) === 'json');
  const html = files.filter((f) => fileKind(f.path) === 'html');
  if (!json.length && html.length) w.push('html_export');
  else if (!json.length) w.push('no_json');
  if (json.length && !parsed.some((p) => p.parser && p.parser !== 'generic')) w.push('not_facebook');
  if (parsed.some((p) => p.error)) w.push('parse_errors');
  return w;
}

/**
 * Turn every file of an export into one sorted event stream plus collections.
 * Pure and synchronous: runs in the import worker and in Node tests alike.
 */
export function buildDataset(files: SourceFile[], name?: string, onProgress?: (done: number, total: number) => void): Dataset {
  const started = Date.now();
  const owner = detectOwner(files);
  const collections = emptyCollections();
  collections.owner = owner;
  let events: ActivityEvent[] = [];
  const results: ImportedFile[] = [];
  let id = 0;

  files.forEach((f, i) => {
    const kind = fileKind(f.path);
    const result: ImportedFile = { path: f.path, size: f.size, kind };
    results.push(result);
    if (f.error) result.error = f.error;
    if (kind !== 'json' || f.json === undefined) return;
    const parser = pickParser(f.path, f.json);
    try {
      const out = parser.parse(f.json, { path: f.path, owner });
      result.parser = parser.id;
      result.records = out.records;
      result.events = out.events?.length ?? 0;
      mergeCollections(collections, out.collections);
      for (const e of out.events ?? []) events.push({ ...e, id: `e${id++}`, sourceFile: f.path });
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }
    // Current settings are read from their files in a separate pass, so a file can feed both.
    try {
      mergeCollections(collections, extractSettings(f.path, f.json));
    } catch {
      /* a settings file in an unexpected shape just isn't used for advice */
    }
    if (onProgress && i % 25 === 0) onProgress(i, files.length);
  });

  events = dedupeKeyed(dedupeSecurity(events)).sort((a, b) => a.timestamp - b.timestamp);
  const first = events[0]?.timestamp;
  const last = events[events.length - 1]?.timestamp;
  return {
    events,
    collections,
    summary: {
      name,
      fileCount: files.length,
      totalBytes: files.reduce((s, f) => s + f.size, 0),
      files: results,
      warnings: detectWarnings(files, results),
      platform: detectPlatform(files.map((f) => f.path)),
      dateRange: first !== undefined && last !== undefined ? { start: first, end: last } : undefined,
      durationMs: Date.now() - started,
    },
  };
}
