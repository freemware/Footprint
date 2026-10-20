/**
 * Facebook writes UTF-8 text as if each byte were a Latin-1 character, so "é" arrives as "Ã©"
 * and emoji arrive as four junk characters. This re-decodes those strings.
 *
 * Strict decoding matters: a few genuine Latin-1 strings are not valid UTF-8 once re-encoded,
 * and a lenient decoder would silently replace characters in them. Those are left untouched.
 */
const strict = new TextDecoder('utf-8', { fatal: true });
const HAS_HIGH = /[\u0080-ÿ]/;

export function fixText(s: string): string {
  if (!HAS_HIGH.test(s)) return s; // plain ASCII: nothing to fix
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 0xff) return s; // already real Unicode, not mojibake
    bytes[i] = c;
  }
  try {
    return strict.decode(bytes);
  } catch {
    return s; // not valid UTF-8: keep as-is
  }
}

/** Fix every string (keys included) in a parsed JSON value. Returns a new value. */
export function deepFixText(value: unknown): unknown {
  if (typeof value === 'string') return fixText(value);
  if (Array.isArray(value)) return value.map(deepFixText);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[fixText(k)] = deepFixText(v);
    return out;
  }
  return value;
}

/** Facebook uses placeholder strings for "nothing here". Treat them as empty. */
const PLACEHOLDERS = new Set(['', 'no data', 'none', 'n/a', 'null', 'undefined']);
export const isBlank = (s: unknown): boolean =>
  s === undefined || s === null || (typeof s === 'string' && PLACEHOLDERS.has(s.trim().toLowerCase()));

export const str = (v: unknown): string | undefined => (typeof v === 'string' && !isBlank(v) ? v : undefined);
