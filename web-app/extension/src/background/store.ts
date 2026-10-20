import { ext } from '../shared/ext';
import type { AutoscanSettings, HistoryEntry, Job, ScanReport } from '../shared/types';

/**
 * Everything the extension keeps lives in this browser's extension storage, on this device.
 * Nothing is synced or uploaded. "Delete all Footprint data" removes all of it.
 */
export interface Stored {
  license: string;
  reports: Record<string, ScanReport[]>;
  job: Job | null;
  history: HistoryEntry[];
  autoscan: AutoscanSettings;
  prefs: { watch: boolean };
}

export const DEFAULTS: Stored = {
  license: '',
  reports: {},
  job: null,
  history: [],
  autoscan: { enabled: false, frequency: 'monthly' },
  prefs: { watch: true },
};

export async function get<K extends keyof Stored>(key: K): Promise<Stored[K]> {
  const got = await ext.storage.local.get(key);
  return (got[key] as Stored[K] | undefined) ?? structuredClone(DEFAULTS[key]);
}

export async function set<K extends keyof Stored>(key: K, value: Stored[K]): Promise<void> {
  await ext.storage.local.set({ [key]: value });
}

export async function latestReport(platform: string): Promise<ScanReport | undefined> {
  return (await get('reports'))[platform]?.[0];
}

export async function saveReport(report: ScanReport) {
  const all = await get('reports');
  all[report.platform] = [report, ...(all[report.platform] ?? [])].slice(0, 12);
  await set('reports', all);
}

export async function addHistory(entry: HistoryEntry) {
  await set('history', [entry, ...(await get('history'))].slice(0, 200));
}

export async function clearAll() {
  await ext.storage.local.clear();
}
