/**
 * Turn any Facebook time value into milliseconds since epoch, or undefined.
 *
 * - Most fields are Unix seconds; `timestamp_ms` is milliseconds; `timestamp_value` mixes both.
 *   Units are therefore decided by magnitude, not by field name.
 * - 0 (and other tiny values) means "not set", e.g. an event with no end time.
 * - Anything outside 1990–2100 is treated as not a real date.
 */
const MIN = Date.UTC(1990, 0, 1);
const MAX = Date.UTC(2100, 0, 1);

export function toMs(v: unknown): number | undefined {
  let n: number;
  if (typeof v === 'number') n = v;
  else if (typeof v === 'string' && /^\d{9,16}$/.test(v.trim())) n = Number(v);
  else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) n = Date.parse(v);
  else return undefined;
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (n < 1e11) n *= 1000; // seconds
  else if (n > 1e14) n /= 1000; // microseconds
  n = Math.round(n);
  return n >= MIN && n <= MAX ? n : undefined;
}

/** First valid time among several candidate values. */
export const firstMs = (...vals: unknown[]) => {
  for (const v of vals) {
    const t = toMs(v);
    if (t !== undefined) return t;
  }
  return undefined;
};
