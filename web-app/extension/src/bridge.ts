import { ext } from './shared/ext';
import type { AppReport } from './shared/types';

/**
 * Runs only on the Footprint web app. It lets the app know the extension is installed, and
 * passes on a few requests:
 *   - open the extension's dashboard
 *   - use my Pro key here too
 *   - start a scan (scans only read settings; changes still need approval in the extension)
 *   - give me the latest scan's setting readings, so the app's plan can say what each setting is now
 * Only setting readings ("Only me", on/off) reach the page, never posts, names or messages.
 * Nothing leaves the browser: this is message passing between two parts of the same browser.
 */

const version = ext.runtime.getManifest().version;
document.documentElement.dataset.footprintExtension = version;
window.dispatchEvent(new CustomEvent('footprint-extension', { detail: { version } }));

const post = (msg: Record<string, unknown>) => window.postMessage({ source: 'footprint-extension', ...msg }, location.origin);
const PLATFORM = /^[a-z]{2,20}$/;

window.addEventListener('message', (e: MessageEvent) => {
  if (e.source !== window || e.origin !== location.origin) return;
  const d = e.data as { source?: string; type?: string; view?: string; key?: string; platform?: string };
  if (d?.source !== 'footprint-app') return;
  if (d.type === 'open') {
    void ext.runtime.sendMessage({ type: 'openDashboard', view: typeof d.view === 'string' ? d.view.slice(0, 40) : undefined, from: 'bridge' });
  } else if (d.type === 'license' && typeof d.key === 'string' && d.key.length < 2000) {
    void ext.runtime.sendMessage({ type: 'license', key: d.key, from: 'bridge' }).then((r: { ok?: boolean }) => post({ type: 'license', ok: !!r?.ok }));
  } else if (d.type === 'report' && typeof d.platform === 'string' && PLATFORM.test(d.platform)) {
    void ext.runtime
      .sendMessage({ type: 'report', platform: d.platform, from: 'bridge' })
      .then((r: { report?: AppReport | null }) => post({ type: 'report', platform: d.platform, report: r?.report ?? null }))
      .catch(() => post({ type: 'report', platform: d.platform, report: null }));
  } else if (d.type === 'scan' && typeof d.platform === 'string' && PLATFORM.test(d.platform)) {
    void ext.runtime
      .sendMessage({ type: 'scan', platform: d.platform, from: 'bridge' })
      .then((r: { ok?: boolean; error?: string }) => post({ type: 'scan', ok: !!r?.ok, error: r?.error }))
      .catch(() => post({ type: 'scan', ok: false, error: 'unknown' }));
  }
});

// Tell the app when a scan finishes or a job starts or stops, so it can refresh without polling.
ext.storage?.onChanged?.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.reports) post({ type: 'changed', what: 'reports' });
  if (changes.job) {
    const job = changes.job.newValue as { status?: string; kind?: string; progress?: number } | null | undefined;
    post({ type: 'job', running: job?.status === 'running', kind: job?.kind, progress: typeof job?.progress === 'number' ? job.progress : undefined });
  }
});
