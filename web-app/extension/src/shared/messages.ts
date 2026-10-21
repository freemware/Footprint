import { ext } from './ext';
import type { AppReport, AutoscanSettings } from './types';

/** Requests from Footprint's screens (and the Footprint web app, through the bridge) to the background. */
export type Request =
  | { type: 'scan'; platform: string }
  | { type: 'fix'; platform: string; checks: string[] }
  | { type: 'find'; platform: string; list: 'tags' | 'posts'; source: string; resume?: boolean }
  | { type: 'previews'; platform: string; list: 'tags' | 'posts'; source: string }
  | { type: 'act'; platform: string; list: 'tags' | 'posts'; source: string; keys: string[] }
  | { type: 'cancel' }
  | { type: 'license'; key: string }
  | { type: 'removeLicense' }
  | { type: 'autoscan'; settings: AutoscanSettings }
  | { type: 'prefs'; watch: boolean }
  | { type: 'state' }
  /** The latest scan's setting readings, for the Footprint web app's plan. */
  | { type: 'report'; platform: string }
  | { type: 'openDashboard'; view?: string }
  | { type: 'clearAll' };

export interface Reply {
  ok: boolean;
  error?: 'pro' | 'busy' | 'unknown';
  pro?: boolean;
  nextRun?: number;
  report?: AppReport | null;
}

export const call = (req: Request): Promise<Reply> => ext.runtime.sendMessage(req) as Promise<Reply>;
