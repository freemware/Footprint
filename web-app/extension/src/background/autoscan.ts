import { ext, hasNotifications } from '../shared/ext';
import { get, latestReport, set } from './store';
import { available } from '../platforms/registry';
import { isPro } from './license';
import { isRunning, scan } from './jobs';
import type { AutoscanSettings, ScanReport } from '../shared/types';

/**
 * Autoscans: Footprint re-checks your settings on a schedule, while this browser is open and
 * you're signed in to the platform. It only reads. Anything that needs changing waits in the
 * extension for you to approve. Results never leave this device.
 */

const ALARM = 'footprint-autoscan';
const CATCH_UP = 'footprint-autoscan-catchup';
export const PERIOD_DAYS = { weekly: 7, monthly: 30 } as const;
const DAY = 86_400_000;

export async function schedule(settings?: AutoscanSettings) {
  const s = settings ?? (await get('autoscan'));
  await ext.alarms.clear(ALARM);
  await ext.alarms.clear(CATCH_UP);
  if (!s.enabled) return;
  const period = PERIOD_DAYS[s.frequency] * 24 * 60;
  const due = (s.lastRun ?? 0) + PERIOD_DAYS[s.frequency] * DAY;
  // Overdue (the browser was closed when it was due): run shortly after start-up.
  const delayInMinutes = Math.max(1, Math.round((due - Date.now()) / 60_000));
  await ext.alarms.create(ALARM, { delayInMinutes, periodInMinutes: period });
}

export const nextRun = async (): Promise<number | undefined> => (await ext.alarms.get(ALARM))?.scheduledTime;

/** New risks since the previous scan: settings that are open now but weren't before. */
export function newRisks(now: ScanReport, before?: ScanReport): string[] {
  const was = new Map(before?.results.map((r) => [r.checkId, r.status]) ?? []);
  return now.results.filter((r) => r.status === 'risk' && was.get(r.checkId) !== 'risk').map((r) => r.checkId);
}

export async function runAutoscan() {
  const s = await get('autoscan');
  if (!s.enabled || !(await isPro()) || isRunning()) return;
  let risks = 0;
  let fresh = 0;
  let unread = 0;
  let signedOut: string[] = [];
  for (const p of available()) {
    const before = await latestReport(p.id);
    const report = await scan(p.id, 'autoscan').catch(() => null);
    if (!report) continue;
    if (report.signedOut) signedOut = [...signedOut, p.name];
    risks += report.results.filter((r) => r.status === 'risk').length;
    fresh += newRisks(report, before).length;
    unread += report.results.filter(r=>r.status==='unknown').length + Math.max(0,p.checks.length-report.results.length);
  }
  await set('autoscan', { ...s, lastRun: Date.now() });
  await updateBadge();
  const title = 'Footprint autoscan';
  const message = signedOut.length
    ? `Couldn't scan ${signedOut.join(', ')}: you're signed out in this browser.`
    : fresh
      ? `${fresh} new ${fresh === 1 ? 'setting needs' : 'settings need'} attention. Open Footprint to review.`
      : risks
        ? `No new risks. ${risks} ${risks === 1 ? 'setting is' : 'settings are'} still open.`
        : unread ? `Scan incomplete: ${unread} settings could not be read. Open Footprint to review.` : 'All checked settings are private. Nice.';
  if (hasNotifications()) {
    await ext.notifications.create(`autoscan-${Date.now()}`, { type: 'basic', iconUrl: 'icons/icon-128.png', title, message }).catch(() => undefined);
  }
}

/** The toolbar badge shows how many settings still need attention. */
export async function updateBadge() {
  let risks = 0;
  for (const p of available()) risks += (await latestReport(p.id))?.results.filter((r) => r.status === 'risk').length ?? 0;
  await ext.action.setBadgeText({ text: risks ? String(risks) : '' });
  await ext.action.setBadgeBackgroundColor?.({ color: '#e0a000' });
}

export function listen() {
  ext.alarms.onAlarm.addListener((a) => {
    if (a.name === ALARM || a.name === CATCH_UP) void runAutoscan();
  });
}
