import type { CSSProperties } from 'react';
import { ArrowRight, CalendarClock, Check, CircleDot, Lightbulb, Lock, Sparkles } from 'lucide-react';
import { PLATFORMS, platformsCopy as C, type PlatformInfo } from '../i18n/platforms';
import { useUiStore } from '../store/uiStore';
import { useDataStore } from '../store/dataStore';
import { useIsPro, usePro } from '../pro/usePro';

const STATUS_STYLE: Record<PlatformInfo['status'], { color: string; ink: string }> = {
  available: { color: 'var(--good)', ink: 'var(--good-ink)' },
  next: { color: 'var(--plan)', ink: 'var(--plan)' },
  planned: { color: 'var(--text-3)', ink: 'var(--text-2)' },
};

/**
 *   header band: title · lead · "first platform free" note
 *   platform cards (one per platform): status, depth meter, steps, options, timing, what you'll see
 *   tips for any export
 */
export function PlatformsPage() {
  const setView = useUiStore((s) => s.setView);
  const hasData = useDataStore((s) => s.source !== 'none');
  const pro = useIsPro();
  const openUpgrade = usePro((s) => s.openUpgrade);

  return (
    <main className="flex-1" style={{ '--tab': 'var(--plan)' } as CSSProperties}>
      <header className="tab-band border-b border-line">
        <div className="mx-auto max-w-[1240px] px-4 pt-10 pb-8 sm:px-6 sm:pt-12">
          <h1 className="display max-w-[20ch] text-[34px] font-semibold text-ink sm:text-[44px]">{C.title}</h1>
          <p className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-ink-2">{C.lead}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setView(hasData ? 'overview' : 'import')}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-ink hover:opacity-90"
            >
              {C.start} <ArrowRight className="size-4" aria-hidden />
            </button>
            {!pro && (
              <button type="button" onClick={openUpgrade} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong px-4 text-ink hover:bg-surface-2">
                <Sparkles className="size-4" style={{ color: 'var(--plan)' }} aria-hidden /> {C.freeNote}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-4 pt-10 pb-12 sm:px-6">
        <ul className="grid gap-4 lg:grid-cols-2">
          {PLATFORMS.map((p, i) => (
            <PlatformCard key={p.id} p={p} paid={i > 0 && !pro} />
          ))}
        </ul>

        <aside className="mt-10 flex gap-4 rounded-2xl border border-line bg-surface p-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-3 text-ink-2">
            <Lightbulb className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold text-ink">{C.tipsTitle}</h2>
            <ul className="mt-2 space-y-1.5 text-ink-2">
              {C.tips.map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-1 size-3.5 shrink-0 text-good" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-ink-3">{C.checked}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function PlatformCard({ p, paid }: { p: PlatformInfo; paid: boolean }) {
  const st = STATUS_STYLE[p.status];
  return (
    <li className="card flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-start gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="display text-[24px] font-semibold text-ink">{p.name}</h2>
          {p.note && <p className="mt-0.5 text-[13px] text-ink-3">{p.note}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ color: st.ink, background: `color-mix(in oklab, ${st.color} 14%, transparent)` }}>
            <CircleDot className="size-3" aria-hidden /> {C.status[p.status]}
          </span>
          {paid && (
            <span className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-ink-2">
              <Lock className="size-3" aria-hidden /> {C.pro}
            </span>
          )}
        </div>
      </div>

      <div className="grid flex-1 gap-5 p-5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">{C.depth}</p>
          <div className="mt-2 flex items-center gap-2" aria-label={`${p.depthLabel}: ${p.depth} of 5`}>
            <span className="flex gap-1" aria-hidden>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className="h-2 w-6 rounded-full" style={{ background: n <= p.depth ? 'var(--plan)' : 'var(--surface-3)' }} />
              ))}
            </span>
            <span className="text-[13px] font-medium text-ink">{p.depthLabel}</span>
          </div>

          <p className="mt-5 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">{C.how}</p>
          <ol className="mt-2 space-y-2">
            {p.steps.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="num mt-px grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-[12px] font-semibold text-ink">{i + 1}</span>
                <span className="leading-6 text-ink">{s}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">{C.choose}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {p.choose.map((c) => (
                <li key={c} className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[12px] text-ink">
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">{C.arrives}</p>
            <p className="mt-1.5 flex gap-2 text-ink-2">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden /> {p.arrives}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">{C.shows}</p>
            <ul className="mt-1.5 space-y-1 text-ink-2">
              {p.shows.map((s) => (
                <li key={s} className="flex gap-2">
                  <Check className="mt-1 size-3.5 shrink-0" style={{ color: 'var(--plan)' }} aria-hidden /> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </li>
  );
}
