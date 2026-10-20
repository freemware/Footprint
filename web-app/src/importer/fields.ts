import { str } from './text';
import { toMs } from './time';

/**
 * Normalized form of Facebook's newer `label_values` records, e.g.
 *   { label: "Time", timestamp_value: 1700000000 }
 *   { label: "Events", vec: [ { dict: [ ...label_values ] } ] }
 *   { label: "Details", dict: [ ...label_values ], title: "..." }
 * Nesting is recursive. Order is preserved, because labels are localized display
 * text and position is the fallback when a label isn't recognized.
 */
export interface Field {
  label: string;
  text?: string;
  href?: string;
  time?: number;
  title?: string;
  /** From `vec`: a list of values or nested records. */
  items?: Field[];
  /** From `dict`: a nested record. */
  children?: Field[];
  /** From `media`: file paths inside the export (Instagram keeps post media here). */
  media?: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function toFields(labelValues: unknown): Field[] {
  if (!Array.isArray(labelValues)) return [];
  const out: Field[] = [];
  for (const node of labelValues) {
    if (!isObj(node)) continue;
    const f: Field = { label: typeof node.label === 'string' ? node.label : '' };
    const text = str(node.value);
    if (text !== undefined) f.text = text;
    const href = str(node.href);
    if (href !== undefined) f.href = href;
    const time = toMs(node.timestamp_value);
    if (time !== undefined) f.time = time;
    const title = str(node.title);
    if (title !== undefined) f.title = title;
    if (Array.isArray(node.dict)) f.children = toFields(node.dict);
    if (Array.isArray(node.media)) {
      const uris = node.media.map((m) => (isObj(m) ? str(m.uri) : undefined)).filter((u): u is string => !!u && !/^https?:/i.test(u));
      if (uris.length) f.media = uris;
    }
    if (Array.isArray(node.vec)) {
      f.items = node.vec.filter(isObj).map((v) =>
        Array.isArray(v.dict)
          ? { label: '', children: toFields(v.dict) }
          : toFields([{ ...v, label: '' }])[0] ?? { label: '' },
      );
    }
    out.push(f);
  }
  return out;
}

/** Is this object a label_values record? */
export const isLabelRecord = (v: unknown): v is { label_values: unknown[] } =>
  isObj(v) && Array.isArray(v.label_values);

/** Find a field by any of its known labels (all languages), searching nested records too. */
export function findField(fields: Field[] | undefined, labels: readonly string[], deep = true): Field | undefined {
  if (!fields) return undefined;
  for (const f of fields) if (labels.includes(f.label)) return f;
  if (deep)
    for (const f of fields) {
      const hit =
        findField(f.children, labels, true) ??
        f.items?.reduce<Field | undefined>((found, it) => found ?? findField(it.children, labels, true), undefined);
      if (hit) return hit;
    }
  return undefined;
}

export const fieldText = (fields: Field[] | undefined, labels: readonly string[]) => findField(fields, labels)?.text;

/** First time value anywhere in the record, in order. Language-independent fallback for "when". */
export function firstTime(fields: Field[] | undefined): number | undefined {
  if (!fields) return undefined;
  for (const f of fields) {
    if (f.time !== undefined) return f.time;
    const t = firstTime(f.children) ?? firstTime(f.items);
    if (t !== undefined) return t;
  }
  return undefined;
}

/** First text value anywhere in the record, in order. */
export function firstText(fields: Field[] | undefined): string | undefined {
  if (!fields) return undefined;
  for (const f of fields) {
    if (f.text !== undefined) return f.text;
    const t = firstText(f.children) ?? firstText(f.items);
    if (t !== undefined) return t;
  }
  return undefined;
}

/** Flatten to "label: value" lines for display in the inspector and raw views. */
export function fieldsToLines(fields: Field[] | undefined, prefix = ''): [string, string][] {
  const out: [string, string][] = [];
  for (const f of fields ?? []) {
    const label = [prefix, f.label || f.title].filter(Boolean).join(' › ');
    const value = f.text ?? f.href ?? (f.time !== undefined ? new Date(f.time).toISOString() : undefined);
    if (value !== undefined) out.push([label, value]);
    if (f.children) out.push(...fieldsToLines(f.children, label));
    f.items?.forEach((it) => {
      const v = it.text ?? it.href ?? (it.time !== undefined ? new Date(it.time).toISOString() : undefined);
      if (v !== undefined) out.push([label, v]);
      if (it.children) out.push(...fieldsToLines(it.children, label));
    });
  }
  return out;
}
