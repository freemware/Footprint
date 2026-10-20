import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Talks to the Footprint browser extension, when it's installed, through its small bridge.
 *
 * What crosses, and which way:
 *   app → extension: "open your dashboard", "use this Pro key", "start a scan" (scans only read)
 *   extension → app: the latest scan's setting readings ("Only me", on/off) and whether a job is running
 * Nothing from the data download is ever sent to the extension, and nothing leaves the browser.
 * The app keeps scan readings in memory only; the extension is where they are stored.
 */

/** One setting the extension read on the platform's own pages. */
export interface LiveReading {
  checkId: string;
  status: 'risk' | 'ok' | 'unknown';
  value?: string | boolean;
  /** Exactly what the page showed, e.g. "Only me". */
  raw?: string;
  /** When it was read. */
  at: number;
}

export interface LiveReport {
  platform: string;
  at: number;
  signedOut?: boolean;
  stoppedBy?: 'security_check' | 'cancelled';
  results: LiveReading[];
}

interface ExtensionState {
  version?: string;
  /** Latest scan per platform, as the extension holds it. Undefined: not asked yet. Null: no scan yet. */
  reports: Record<string, LiveReport | null | undefined>;
  running: boolean;
  /** Set when a scan the app asked for couldn't start (e.g. another job is running). */
  scanError?: string;
}

const useExtState = create<ExtensionState>(() => ({ reports: {}, running: false }));

const readVersion = () => (typeof document !== 'undefined' ? document.documentElement.dataset.footprintExtension : undefined);
const send = (msg: Record<string, unknown>) => window.postMessage({ source: 'footprint-app', ...msg }, window.location.origin);

/** Light shape check: the page only ever accepts well-formed readings. */
function cleanReport(r: unknown): LiveReport | null {
  if (!r || typeof r !== 'object') return null;
  const o = r as Partial<LiveReport>;
  if (typeof o.platform !== 'string' || typeof o.at !== 'number' || !Array.isArray(o.results)) return null;
  const results = o.results
    .filter((x): x is LiveReading => !!x && typeof x.checkId === 'string' && ['risk', 'ok', 'unknown'].includes(x.status))
    .map((x) => ({ checkId: x.checkId, status: x.status, value: x.value, raw: typeof x.raw === 'string' ? x.raw.slice(0, 60) : undefined, at: typeof x.at === 'number' ? x.at : o.at! }));
  return { platform: o.platform, at: o.at, signedOut: !!o.signedOut, stoppedBy: o.stoppedBy, results };
}

let listening = false;
/** One listener for the whole app, started the first time any screen uses the extension. */
function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  const onVersion = () => {
    const v = readVersion();
    if (v && v !== useExtState.getState().version) {
      useExtState.setState({ version: v });
      requestReport('facebook');
    }
  };
  window.addEventListener('footprint-extension', onVersion);
  // The bridge runs at page start; check again in case it ran before this listener.
  onVersion();
  window.setTimeout(onVersion, 600);

  window.addEventListener('message', (e: MessageEvent) => {
    if (e.source !== window || e.origin !== window.location.origin) return;
    const d = e.data as { source?: string; type?: string; platform?: string; report?: unknown; running?: boolean; ok?: boolean; error?: string };
    if (d?.source !== 'footprint-extension') return;
    if (d.type === 'report' && typeof d.platform === 'string') {
      useExtState.setState((s) => ({ reports: { ...s.reports, [d.platform!]: cleanReport(d.report) } }));
    } else if (d.type === 'changed') {
      requestReport('facebook');
    } else if (d.type === 'job') {
      useExtState.setState({ running: !!d.running });
    } else if (d.type === 'scan') {
      useExtState.setState({ running: !!d.ok || useExtState.getState().running, scanError: d.ok ? undefined : d.error ?? 'unknown' });
    }
  });
}

function requestReport(platform: string) {
  send({ type: 'report', platform });
}

export function useExtension() {
  useEffect(listen, []);
  const version = useExtState((s) => s.version);
  const running = useExtState((s) => s.running);
  const scanError = useExtState((s) => s.scanError);
  return {
    installed: !!version,
    version,
    /** A scan or change is running in the extension right now. */
    running,
    scanError,
    /** Open the extension's dashboard, e.g. at "scan" or "scan:future_posts". */
    open: (view?: string) => send({ type: 'open', view }),
    /** Start a read-only scan. Results arrive by themselves when it finishes. */
    scan: (platform = 'facebook') => {
      useExtState.setState({ scanError: undefined, running: true });
      send({ type: 'scan', platform });
    },
    refresh: (platform = 'facebook') => requestReport(platform),
    /** Hand the Pro key to the extension so Pro works there too. */
    shareLicense: (key: string) =>
      new Promise<boolean>((resolve) => {
        const on = (e: MessageEvent) => {
          if (e.source === window && e.data?.source === 'footprint-extension' && e.data.type === 'license') {
            window.removeEventListener('message', on);
            resolve(!!e.data.ok);
          }
        };
        window.addEventListener('message', on);
        send({ type: 'license', key });
        window.setTimeout(() => resolve(false), 4000);
      }),
  };
}

/** The latest settings scan from the extension, or null/undefined when there is none. */
export function useLiveReport(platform = 'facebook') {
  useEffect(listen, []);
  return useExtState((s) => s.reports[platform]);
}

/** Plan fixes the extension can check (and often make) for you, mapped to its checks. */
export const EXTENSION_CHECK: Record<string, string> = {
  two_factor: 'two_factor',
  login_alerts: 'login_alerts',
  future_posts: 'future_posts',
  lookup: 'lookup_phone',
  friends_list: 'friends_list',
  other_businesses: 'other_businesses',
  old_posts: 'cleanup',
};

/**
 * Every extension check whose reading settles a plan fix. A fix is "private" live only when all
 * of its checks that could be read are private; any open one means it still needs changing.
 */
export const FIX_LIVE_CHECKS: Record<string, string[]> = {
  two_factor: ['two_factor'],
  login_alerts: ['login_alerts'],
  future_posts: ['future_posts'],
  lookup: ['lookup_phone', 'lookup_email'],
  friends_list: ['friends_list', 'friend_requests'],
  other_businesses: ['other_businesses', 'ad_partners'],
};

/** For tests: forget everything the app has heard from the extension. */
export const resetExtensionState = () => useExtState.setState({ version: undefined, reports: {}, running: false, scanError: undefined });
