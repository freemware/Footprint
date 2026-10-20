import { useCallback, useEffect, useState } from 'react';
import { ext } from '../../src/shared/ext';
import { call } from '../../src/shared/messages';
import { DEFAULTS, type Stored } from '../../src/background/store';

/** A value from the extension's storage that stays live as the background updates it. */
export function useStored<K extends keyof Stored>(key: K): Stored[K] {
  const [value, setValue] = useState<Stored[K]>(DEFAULTS[key]);
  useEffect(() => {
    let alive = true;
    void ext.storage.local.get(key).then((r) => alive && setValue((r[key] as Stored[K] | undefined) ?? DEFAULTS[key]));
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && key in changes) setValue((changes[key]!.newValue as Stored[K] | undefined) ?? DEFAULTS[key]);
    };
    ext.storage.onChanged.addListener(onChange);
    return () => {
      alive = false;
      ext.storage.onChanged.removeListener(onChange);
    };
  }, [key]);
  return value;
}

/** Pro status and the next autoscan, refreshed when the license or schedule changes. */
export function useStatus() {
  const license = useStored('license');
  const autoscan = useStored('autoscan');
  const [state, setState] = useState<{ pro: boolean; nextRun?: number; ready: boolean }>({ pro: false, ready: false });
  const refresh = useCallback(() => {
    void call({ type: 'state' }).then((r) => setState({ pro: !!r?.pro, nextRun: r?.nextRun, ready: true }));
  }, []);
  useEffect(refresh, [refresh, license, autoscan]);
  return { ...state, refresh };
}

/** Follow the system's light or dark setting. */
export function useSystemTheme() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      document.documentElement.dataset.theme = mq.matches ? 'light' : 'dark';
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
}

/** The dashboard's current view, from the address (#scan, #untag …). */
export function useHashView(fallback: string): [string, (v: string) => void] {
  const read = () => decodeURIComponent(location.hash.slice(1)) || fallback;
  const [view, setView] = useState(read);
  useEffect(() => {
    const on = () => setView(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  });
  return [
    view,
    (v: string) => {
      location.hash = v;
    },
  ];
}
