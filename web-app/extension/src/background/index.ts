import { ext } from '../shared/ext';
import type { Reply, Request } from '../shared/messages';
import { actOnList, cancel, findList, fix, isRunning, scan } from './jobs';
import { activate, isPro } from './license';
import { listen, nextRun, schedule, updateBadge } from './autoscan';
import { clearAll, get, latestReport, set } from './store';
import { toAppReport } from '../shared/types';

/**
 * Footprint's background controller. It acts only when the person asks from a Footprint screen
 * (or on the autoscan schedule they turned on), and changes things only after they approved them.
 */

listen();

ext.runtime.onInstalled.addListener(() => {
  void schedule();
  void updateBadge();
});
ext.runtime.onStartup.addListener(() => {
  void schedule();
  void updateBadge();
  // A job can't survive the browser closing; don't leave it looking busy.
  void get('job').then((j) => (j?.status === 'running' ? set('job', { ...j, status: 'failed', message: 'Stopped when the browser closed.', endedAt: Date.now() }) : undefined));
});

const PRO_ONLY: Request['type'][] = ['fix', 'act'];
const APP_ALLOWED: Request['type'][] = ['openDashboard', 'license', 'state', 'scan', 'report'];

async function handle(req: Request, fromApp: boolean): Promise<Reply> {
  // The Footprint web app may open the dashboard, hand over a license key, start a read-only scan
  // and read the latest scan's setting readings. Changes still need approval in the extension.
  if (fromApp && !APP_ALLOWED.includes(req.type)) return { ok: false, error: 'unknown' };
  if (PRO_ONLY.includes(req.type) && !(await isPro())) return { ok: false, error: 'pro' };
  const background = (p: Promise<unknown>) => {
    p.then(() => updateBadge()).catch(() => undefined);
  };
  if (['scan', 'fix', 'find', 'act'].includes(req.type) && isRunning()) return { ok: false, error: 'busy' };

  switch (req.type) {
    case 'scan':
      background(scan(req.platform));
      return { ok: true };
    case 'fix':
      background(fix(req.platform, req.checks));
      return { ok: true };
    case 'find':
      background(findList(req.platform, req.list, req.source));
      return { ok: true };
    case 'act':
      background(actOnList(req.platform, req.list, req.source, req.keys));
      return { ok: true };
    case 'cancel':
      cancel();
      return { ok: true };
    case 'license':
      return { ok: await activate(req.key), pro: await isPro() };
    case 'removeLicense':
      await set('license', '');
      await set('autoscan', { ...(await get('autoscan')), enabled: false });
      await schedule();
      return { ok: true, pro: false };
    case 'autoscan':
      if (req.settings.enabled && !(await isPro())) return { ok: false, error: 'pro' };
      await set('autoscan', req.settings);
      await schedule(req.settings);
      return { ok: true, nextRun: await nextRun() };
    case 'prefs':
      await set('prefs', { watch: req.watch });
      return { ok: true };
    case 'state':
      return { ok: true, pro: await isPro(), nextRun: await nextRun() };
    case 'report': {
      const r = await latestReport(req.platform);
      return { ok: true, report: r ? toAppReport(r) : null };
    }
    case 'openDashboard':
      await ext.tabs.create({ url: ext.runtime.getURL(`dashboard.html${req.view ? `#${req.view}` : ''}`) });
      return { ok: true };
    case 'clearAll':
      cancel();
      await clearAll();
      await schedule();
      await updateBadge();
      return { ok: true };
    default:
      return { ok: false, error: 'unknown' };
  }
}

ext.runtime.onMessage.addListener((req: Request, sender, reply) => {
  // Only Footprint's own pages, and the bridge on the Footprint web app, talk to the controller.
  if (sender.id !== ext.runtime.id) return false;
  const fromApp = !!sender.tab && !sender.url?.startsWith(ext.runtime.getURL(''));
  if (fromApp && (req as { from?: string }).from !== 'bridge') return false;
  void handle(req, fromApp).then(reply, () => reply({ ok: false, error: 'unknown' }));
  return true;
});
