import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/public-sans';
import './styles.css';
import { CalendarClock, History, Home, Radar, Settings, Sparkles, Tag, Trash2 } from 'lucide-react';
import { C } from './copy';
import { Logo } from './parts';
import { useHashView, useStatus, useSystemTheme } from './hooks';
import { ScanView } from './ScanView';
import { ListView } from './ListView';
import { AutoscanView, HistoryView, HomeView, SettingsView } from './OtherViews';

const NAV = [
  { id: 'home', label: C.nav.home, icon: Home },
  { id: 'scan', label: C.nav.scan, icon: Radar },
  { id: 'untag', label: C.nav.untag, icon: Tag },
  { id: 'cleanup', label: C.nav.cleanup, icon: Trash2 },
  { id: 'autoscans', label: C.nav.autoscans, icon: CalendarClock },
  { id: 'history', label: C.nav.history, icon: History },
  { id: 'settings', label: C.nav.settings, icon: Settings },
] as const;

/**
 *   sidebar: brand · views · promise          (top bar with scrolling tabs on small screens)
 *   main: the chosen view
 * Views are addressed by hash (#scan, #scan:future_posts) so the web app can open one directly.
 */
function Dashboard() {
  useSystemTheme();
  const [hash, go] = useHashView('home');
  const [view, focus] = hash.split(':') as [string, string | undefined];
  const { pro } = useStatus();
  const toKey = () => go('settings:key');

  return (
    <div className="min-h-full lg:flex">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-screen lg:w-[264px] lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-5 py-4 lg:py-6">
          <Logo size={34} />
          <div className="min-w-0 flex-1">
            <p className="display text-[20px] font-semibold text-ink">{C.brand}</p>
            <p className="text-[12px] text-ink-3">Privacy scans for your accounts</p>
          </div>
          {pro && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ color: 'var(--plan)', background: 'color-mix(in oklab, var(--plan) 14%, transparent)' }}>
              <Sparkles className="size-3" aria-hidden /> Pro
            </span>
          )}
        </div>
        <nav aria-label="Footprint" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {NAV.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={view === id ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium whitespace-nowrap transition ${view === id ? 'bg-accent-dim text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}
            >
              <Icon className={`size-4 ${view === id ? 'text-accent' : 'text-ink-3'}`} aria-hidden /> {label}
            </a>
          ))}
        </nav>
        <p className="hidden px-5 pt-4 text-[12px] leading-relaxed text-ink-3 lg:block">{C.promise}</p>
      </aside>
      <main className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-8">
        {view === 'scan' && <ScanView pro={pro} focus={focus} onKey={toKey} />}
        {view === 'untag' && <ListView key="tags" kind="tags" pro={pro} onKey={toKey} />}
        {view === 'cleanup' && <ListView key="posts" kind="posts" pro={pro} onKey={toKey} />}
        {view === 'autoscans' && <AutoscanViewWrap onKey={toKey} />}
        {view === 'history' && <HistoryView />}
        {view === 'settings' && <SettingsView pro={pro} focusKey={focus === 'key'} />}
        {!['scan', 'untag', 'cleanup', 'autoscans', 'history', 'settings'].includes(view) && <HomeView go={go} />}
      </main>
    </div>
  );
}

function AutoscanViewWrap({ onKey }: { onKey: () => void }) {
  const { pro, nextRun } = useStatus();
  return <AutoscanView pro={pro} nextRun={nextRun} onKey={onKey} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>,
);
