import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/public-sans';
import './styles.css';
import { CalendarClock, LayoutDashboard, Radar } from 'lucide-react';
import { C, ago, when } from './copy';
import { Button, JobBar, Logo, Ring } from './parts';
import { useStatus, useStored, useSystemTheme } from './hooks';
import { call } from '../../src/shared/messages';

/**
 *   brand · Pro
 *   Facebook: ring · summary · last scanned
 *   [Scan now] [Open Footprint]
 *   live job · autoscan line · promise
 */
function Popup() {
  useSystemTheme();
  const reports = useStored('reports');
  const job = useStored('job');
  const autoscan = useStored('autoscan');
  const { pro, nextRun } = useStatus();
  const latest = reports.facebook?.[0];
  const r = reports.facebook?.find((x) => x.results.length > 0);
  const risk = r?.results.filter((x) => x.status === 'risk').length ?? 0;
  const ok = r?.results.filter((x) => x.status === 'ok').length ?? 0;
  const running = job?.status === 'running';
  const open = (view?: string) => {
    void call({ type: 'openDashboard', view });
    window.close();
  };

  return (
    <div className="w-[360px] space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Logo size={30} />
        <p className="display flex-1 text-[19px] font-semibold text-ink">{C.brand}</p>
        {pro && (
          <span className="rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ color: 'var(--plan)', background: 'color-mix(in oklab, var(--plan) 14%, transparent)' }}>
            Pro
          </span>
        )}
      </div>

      <div className="card flex items-center gap-4 p-4">
        <Ring ok={ok} total={r?.results.length ?? 0} size={60} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Facebook</p>
          <p className="text-[13px] text-ink-2">{latest?.signedOut ? 'Signed out in this browser' : latest?.stoppedBy ? 'Stopped at a Facebook security check' : r ? (risk ? `${risk} ${risk === 1 ? 'setting needs' : 'settings need'} attention` : 'All checked settings are private') : C.home.neverScanned}</p>
          {r && <p className="text-[12px] text-ink-3">Scanned {ago(r.at)}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => void call({ type: 'scan', platform: 'facebook' })} disabled={running}>
          <Radar className="size-4" aria-hidden /> {running && job?.kind === 'scan' ? C.scan.scanning : C.scan.scanNow}
        </Button>
        <Button variant="ghost" onClick={() => open(risk ? 'scan' : undefined)}>
          <LayoutDashboard className="size-4" aria-hidden /> Open
        </Button>
      </div>

      <JobBar compact />

      <button type="button" onClick={() => open('autoscans')} className="flex w-full items-center gap-2 rounded-xl px-1 text-left text-[13px] text-ink-2 hover:text-ink">
        <CalendarClock className="size-4 text-ink-3" aria-hidden />
        {autoscan.enabled ? `Autoscan ${autoscan.frequency === 'weekly' ? 'weekly' : 'monthly'} · next ${when(nextRun)}` : 'Autoscans are off'}
      </button>
      <p className="text-[12px] leading-relaxed text-ink-3">{C.promise}</p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
