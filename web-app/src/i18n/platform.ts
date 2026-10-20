import type { Platform } from '../model/types';

/**
 * Which platform's download is on screen, for wording. Set by the data store when a download
 * loads; read by the copy objects below. Facebook is the default (and the demo's platform).
 *
 * Shared screens read their wording through `byPlatform(facebookCopy, { instagram: overrides })`.
 * Overrides are written by hand for each sentence that differs. Nothing is find-and-replaced,
 * because many Facebook sentences describe Facebook-only features and would be wrong if renamed.
 * A test checks that no Facebook-only wording reaches an Instagram screen.
 */

let current: Platform = 'facebook';

export const activePlatform = (): Platform => current;
export const setActivePlatform = (p: Platform | undefined) => {
  current = p ?? 'facebook';
};

const NAMES: Record<Platform, string> = { facebook: 'Facebook', instagram: 'Instagram' };
/** "Facebook" or "Instagram", for the few sentences that only need the name. */
export const platformName = () => NAMES[current];

/** Like Partial, all the way down. Wording can differ, so literal strings widen to string. */
export type DeepPartial<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => R extends string ? string : R
    : T extends readonly unknown[]
      ? T
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;

const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * A view of `base` that shows `overrides[platform]` wherever an override exists. Nested objects come
 * back as views too, so code that keeps a reference (`const R = report.profile` at start-up, before
 * any download is loaded) still follows the platform that is on screen later.
 */
export function byPlatform<T extends object>(base: T, overrides: Partial<Record<Platform, DeepPartial<T>>>): T {
  return layer(base, (p) => overrides[p] as Record<string, unknown> | undefined);
}

type Lookup = (p: Platform) => Record<string, unknown> | undefined;

function layer<T extends object>(base: T, over: Lookup): T {
  const nested = new Map<string, unknown>();
  return new Proxy(base, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver) as unknown;
      if (typeof key !== 'string') return value;
      const o = over(current);
      if (o && key in o && !isPlain(o[key])) return o[key];
      // A nested object that some platform overrides: hand out a view that resolves on every read.
      if (isPlain(value) && PLATFORMS.some((p) => isPlain(over(p)?.[key]))) {
        if (!nested.has(key)) nested.set(key, layer(value, (p) => over(p)?.[key] as Record<string, unknown> | undefined));
        return nested.get(key);
      }
      if (o && key in o) return o[key];
      return value;
    },
    // Object.keys / spreads see the base shape, so lists of keys stay the same on every platform.
    ownKeys: (target) => Reflect.ownKeys(target),
  });
}

const PLATFORMS: Platform[] = ['facebook', 'instagram'];
