import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AppWindow,
  Check,
  ChevronDown,
  CircleDashed,
  Clock,
  Contact,
  Eye,
  ExternalLink,
  FileArchive,
  History,
  Info,
  KeyRound,
  ListChecks,
  MapPin,
  Megaphone,
  Loader2,
  Puzzle,
  Radar,
  Radio,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { Body, Empty, PageHeader, Section } from '../../components/report/Report';
import { FIX_COPY, monthName, planCopy } from '../../i18n/advice';
import { TABS, TAB_HUE } from '../../i18n/report';
import { usePlan, useTicked } from '../../advice/usePlan';
import { useUnlocked } from '../../pro/usePro';
import { ProLock } from '../../pro/UpgradeDialog';
import { PRO } from '../../pro/config';
import { proCopy as P } from '../../i18n/pro';
import type { FixArea } from '../../advice/types';
import type { FixSource, SourcedFix, SourcedPlan } from '../../advice/live';
import { fmt } from '../../i18n/strings';
import { useUiStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { EXTENSION_CHECK, useExtension, useLiveReport, type LiveReading } from '../../extension/useExtension';
import { extensionCopy } from '../../i18n/extension';

const L = extensionCopy.live;

const C = planCopy;

export const AREA_ICONS: Record<FixArea, LucideIcon> = {
  security: KeyRound,
  tracking: Radar,
  ads: Megaphone,
  visibility: Eye,
  contacts: Contact,
  location: MapPin,
  apps: AppWindow,
  history: History,
};

const STATUS_STYLE = {
  needs_action: { color: 'var(--warning)', ink: 'var(--warning-ink)', icon: TriangleAlert },
  review: { color: 'var(--text-3)', ink: 'var(--text-2)', icon: CircleDashed },
  done: { color: 'var(--good)', ink: 'var(--good-ink)', icon: Check },
} as const;

/**
 *   header band: title · lead · progress meter
 *   ── Change these ─────────── fix cards (first one open)
 *   ── Also worth checking ──── fix cards (closed)
 *   ── Already private ──────── compact rows
 *   note: menus move · ticks stay in this browser
 */
export function PlanTab() {
  const plan = usePlan();
  const { ticked } = useTicked();
  const deepLink = useUiStore((s) => s.deepLink);
  const clearDeepLink = useUiStore((s) => s.clearDeepLink);
  const source = useDataStore((s) => s.source);
  const [focus, setFocus] = useState<string | undefined>(deepLink?.kind === 'fix' ? deepLink.id : undefined);

  useEffect(() => {
    if (deepLink?.kind !== 'fix') return;
    setFocus(deepLink.id);
    clearDeepLink();
    // Wait for the cards to render, then bring the requested one into view.
    requestAnimationFrame(() => document.getElementById(`fix-${deepLink.id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }, [deepLink, clearDeepLink]);

  const open = plan.todo.filter((p) => !ticked[p.fix.id]);
  const doneCount = plan.done.length + plan.todo.filter((p) => ticked[p.fix.id]).length + plan.review.filter((p) => ticked[p.fix.id]).length;
  const checked = plan.all[0]?.fix.verified;

  return (
    <>
      <PageHeader
        tab="plan"
        icon={ListChecks}
        title={TABS.plan.title}
        lead={C.lead}
        aside={plan.all.length > 0 ? <Meter open={open.length} review={plan.review.filter((p) => !ticked[p.fix.id]).length} done={doneCount} /> : undefined}
      />
      <Body>
        {plan.all.length > 0 && <PlanAccess plan={plan} />}
        {plan.all.length > 0 && <LiveStrip plan={plan} />}
        {!plan.all.length ? (
          <Empty icon={ListChecks} title={C.labels.noPlan} />
        ) : (
          <>
            {plan.todo.length > 0 && (
              <Section title={C.sections.todo} lead={C.sections.todoHint}>
                <ol className="space-y-3">
                  {plan.todo.map((p, idx) => (
                    <FixCard key={p.fix.id} item={p} initiallyOpen={focus ? focus === p.fix.id : idx === 0} number={idx + 1} />
                  ))}
                </ol>
              </Section>
            )}
            {plan.review.length > 0 && (
              <Section title={C.sections.review} lead={C.sections.reviewHint}>
                <ol className="space-y-3">
                  {plan.review.map((p) => (
                    <FixCard key={p.fix.id} item={p} initiallyOpen={focus === p.fix.id} />
                  ))}
                </ol>
              </Section>
            )}
            {plan.done.length > 0 && (
              <Section title={C.sections.done} lead={C.sections.doneHint}>
                <ul className="grid gap-3 md:grid-cols-2">
                  {plan.done.map((p) => (
                    <DoneRow key={p.fix.id} item={p} highlight={focus === p.fix.id} />
                  ))}
                </ul>
              </Section>
            )}
            <aside className="flex max-w-[90ch] gap-3 rounded-2xl border border-line bg-surface-2 p-5 text-[13px] text-ink-2">
              <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
              <p>
                {C.labels.menusMove} {checked && `${C.labels.checked(monthName(checked))}.`} {source === 'export' ? C.labels.tickedNote : ''}
              </p>
            </aside>
          </>
        )}
      </Body>
    </>
  );
}

/** Progress as one segmented bar: done (green), still open (amber), worth checking (grey). */
function Meter({ open, review, done }: { open: number; review: number; done: number }) {
  const total = Math.max(1, open + review + done);
  const parts = [
    { n: done, color: 'var(--good)', label: C.labels.status.done },
    { n: open, color: 'var(--warning)', label: C.labels.status.needs_action },
    { n: review, color: 'var(--border-strong)', label: C.labels.status.review },
  ];
  return (
    <div className="card w-full max-w-[360px] p-5 sm:w-[340px]">
      <p className="display text-[22px] font-semibold leading-tight text-ink">{C.progress(open, done)}</p>
      <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
        {parts.map((p) => p.n > 0 && <div key={p.label} style={{ width: `${(p.n / total) * 100}%`, background: p.color }} />)}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: p.color }} aria-hidden />
            {p.label} <span className="num font-semibold text-ink">{p.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span title={title} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[12px] text-ink-2">
      {children}
    </span>
  );
}

function FixCard({ item, initiallyOpen, number }: { item: SourcedFix; initiallyOpen?: boolean; number?: number }) {
  const { fix, status, evidence, source } = item;
  const copy = FIX_COPY[fix.id];
  const [open, setOpen] = useState(!!initiallyOpen);
  const ext = useExtension();
  const { ticked, toggle } = useTicked();
  const setView = useUiStore((s) => s.setView);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLLIElement>(null);
  const unlocked = useUnlocked();
  useEffect(() => {
    if (initiallyOpen) setOpen(true);
  }, [initiallyOpen]);
  if (!copy) return null;

  // A tick is the person's word; a newer live reading that shows it still open takes over.
  const tickedAt = ticked[fix.id];
  const isTicked = !!tickedAt && !(source.kind === 'live' && status === 'needs_action' && source.at > tickedAt);
  const locked = !unlocked && !PRO.FREE_FIXES.includes(fix.id);
  const st = isTicked ? STATUS_STYLE.done : STATUS_STYLE[status];
  const AreaIcon = AREA_ICONS[fix.area];
  const bodyId = `fix-${fix.id}-body`;

  return (
    <li id={`fix-${fix.id}`} ref={ref} className="card scroll-mt-32 overflow-hidden" style={{ '--tab': TAB_HUE.plan, borderLeft: `3px solid ${st.color}` } as CSSProperties}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={bodyId} className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-surface-2/60">
        <span className="tab-tile relative mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl">
          <AreaIcon className="size-5" aria-hidden />
          {number !== undefined && !isTicked && (
            <span className="num absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full bg-warning text-[11px] font-bold text-[#10151f]">{number}</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`display text-[20px] font-semibold leading-snug ${isTicked ? 'text-ink-2 line-through decoration-1' : 'text-ink'}`}>{copy.title}</span>
          </span>
          <span className="mt-1.5 block max-w-[80ch] text-ink-2">{copy.finding(evidence.vars, status)}</span>
          <span className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium" style={{ color: st.ink, background: `color-mix(in oklab, ${st.color} 14%, transparent)` }}>
              <st.icon className="size-3.5" aria-hidden />
              {isTicked ? C.labels.markedDone : C.labels.status[status]}
            </span>
            <SourceChip source={source} />
            <Chip>{C.labels.impact[fix.impact]}</Chip>
            <Chip>
              <Clock className="size-3" aria-hidden />
              {C.labels.effort[fix.effort]}
            </Chip>
          </span>
        </span>
        <ChevronDown className={`mt-2 size-5 shrink-0 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-6 border-t border-line px-5 py-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div>
                <h4 className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">{C.labels.how}</h4>
                {locked ? (
                  <div className="mt-3 space-y-3">
                    {/* A glimpse of the steps' shape, not their text. */}
                    <ol className="space-y-2 select-none" aria-hidden>
                      {copy.steps[0]!.steps.slice(0, 3).map((_, si) => (
                        <li key={si} className="flex items-center gap-3">
                          <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-[12px] font-semibold text-ink-3">{si + 1}</span>
                          <span className="h-3 flex-1 rounded-full bg-surface-3" style={{ maxWidth: `${90 - si * 18}%` }} />
                        </li>
                      ))}
                    </ol>
                    <ProLock compact title={P.planLockedTitle} text={P.planLockedText} />
                  </div>
                ) : (
                <div className="mt-3 space-y-4">
                  {!unlocked && PRO.FREE_FIXES.includes(fix.id) && <p className="text-[12px] font-medium" style={{ color: 'var(--plan)' }}>{P.planPreviewNote}</p>}
                  {copy.steps.map((g, gi) => (
                    <div key={gi}>
                      {g.where && <p className="mb-2 text-[13px] font-semibold text-ink">{g.where}</p>}
                      <ol className="space-y-2">
                        {g.steps.map((s, si) => (
                          <li key={si} className="flex gap-3">
                            <span className="num mt-px grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-[12px] font-semibold text-ink">{si + 1}</span>
                            <span className="leading-6 text-ink">{s}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[12px] font-semibold tracking-wide text-ink-3 uppercase">{C.labels.why}</h4>
                  <p className="mt-1.5 text-ink-2">{copy.why}</p>
                </div>
                <div className="rounded-xl border border-line bg-surface-2 p-4">
                  <h4 className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">
                    <ShieldCheck className="size-3.5" aria-hidden />
                    {C.labels.limits}
                  </h4>
                  <p className="mt-1.5 text-ink-2">{copy.limits}</p>
                </div>
                {source.kind === 'live' && <LiveReadings readings={source.readings} />}
                <p className="text-[12px] text-ink-3">{C.labels.checked(monthName(fix.verified))}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/50 px-5 py-4">
              {fix.url && !locked && (
                <a
                  href={fix.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-xl px-4 font-semibold hover:opacity-90"
                  style={{ background: 'var(--plan)', color: 'var(--plan-ink)' }}
                >
                  {C.labels.open}
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              )}
              {source.kind === 'none' && item.liveCheckable && ext.installed && (
                <button
                  type="button"
                  onClick={() => ext.scan()}
                  disabled={ext.running}
                  title={L.sourceNoneHint}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong px-4 font-medium text-ink hover:bg-surface-2 disabled:opacity-60"
                >
                  {ext.running ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Radio className="size-4" aria-hidden />}
                  {ext.running ? L.scanning : L.checkLive}
                </button>
              )}
              {status !== 'done' && EXTENSION_CHECK[fix.id] && (
                <button
                  type="button"
                  onClick={() => {
                    const target = EXTENSION_CHECK[fix.id]!;
                    if (ext.installed) ext.open(target === 'cleanup' ? 'cleanup' : `scan:${target}`);
                    else setView('extension');
                  }}
                  title={extensionCopy.plan.fixWithHint}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong px-4 font-medium text-ink hover:bg-surface-2"
                >
                  <Puzzle className="size-4" aria-hidden />
                  {extensionCopy.plan.fixWith}
                </button>
              )}
              {status !== 'done' && (
                <button
                  type="button"
                  onClick={() => toggle(fix.id)}
                  aria-pressed={isTicked}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 font-medium transition-colors ${isTicked ? 'border-good/50 text-good' : 'border-line-strong text-ink hover:bg-surface-2'}`}
                >
                  <Check className="size-4" aria-hidden />
                  {isTicked ? `${C.labels.markedDone} · ${C.labels.undo}` : C.labels.markDone}
                </button>
              )}
              {evidence.tab && (
                <button type="button" onClick={() => setView(evidence.tab!)} className="ml-auto text-[13px] font-medium text-accent hover:underline">
                  {C.labels.evidence}: {TABS[evidence.tab].label}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function DoneRow({ item, highlight }: { item: SourcedFix; highlight?: boolean }) {
  const copy = FIX_COPY[item.fix.id];
  if (!copy) return null;
  const Icon = AREA_ICONS[item.fix.area];
  return (
    <li id={`fix-${item.fix.id}`} className={`card flex scroll-mt-32 gap-3 p-4 ${highlight ? 'ring-2 ring-good/60' : ''}`}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-good/15 text-good">
        <Check className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-semibold text-ink">
          <Icon className="size-3.5 text-ink-3" aria-hidden />
          {copy.title}
        </p>
        <p className="mt-0.5 text-[13px] text-ink-2">{copy.finding(item.evidence.vars, item.status)}</p>
        <p className="mt-2">
          <SourceChip source={item.source} />
        </p>
      </div>
    </li>
  );
}

/** Above the plan: what Pro unlocks (free users), or a note that the demo shows everything. */
function PlanAccess({ plan }: { plan: SourcedPlan }) {
  const unlocked = useUnlocked();
  const demo = useDataStore((s) => s.source === 'sample');
  if (demo)
    return (
      <p className="mb-8 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-3 text-[13px] text-ink-2">
        <Info className="size-4 shrink-0 text-ink-3" aria-hidden /> {P.demoNote}
      </p>
    );
  if (unlocked) return null;
  const locked = [...plan.todo, ...plan.review].filter((p) => !PRO.FREE_FIXES.includes(p.fix.id)).length;
  if (!locked) return null;
  return (
    <div className="mb-10">
      <ProLock title={P.planBanner(locked)} text={P.planLockedText} />
    </div>
  );
}

/** Where this card's answer came from: read live by the extension, the download, or neither. */
function SourceChip({ source }: { source: FixSource }) {
  if (source.kind === 'live')
    return (
      <span title={L.sourceLiveHint} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium" style={{ borderColor: 'color-mix(in oklab, var(--plan) 45%, transparent)', color: 'var(--plan)' }}>
        <Radio className="size-3" aria-hidden />
        {L.sourceLive(fmt.date(source.at))}
      </span>
    );
  if (source.kind === 'download')
    return (
      <Chip title={L.sourceDownloadHint}>
        <FileArchive className="size-3" aria-hidden />
        {L.sourceDownload(source.at !== undefined ? fmt.date(source.at) : undefined)}
      </Chip>
    );
  return (
    <Chip title={L.sourceNoneHint}>
      <CircleDashed className="size-3" aria-hidden />
      {L.sourceNone}
    </Chip>
  );
}

const readingText = (r: LiveReading) => (typeof r.value === 'boolean' && !r.raw ? (r.value ? L.on : L.off) : r.raw ?? (typeof r.value === 'boolean' ? (r.value ? L.on : L.off) : String(r.value ?? '')));

/** Exactly what the extension read, setting by setting, so the person can see the evidence. */
function LiveReadings({ readings }: { readings: LiveReading[] }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <h4 className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-ink-3 uppercase">
        <Radio className="size-3.5" aria-hidden />
        {L.sawTitle}
      </h4>
      <dl className="mt-2 space-y-1.5 text-[13px]">
        {readings.map((r) => (
          <div key={r.checkId} className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-ink-2">{L.checks[r.checkId] ?? r.checkId}</dt>
            <dd className="font-medium" style={{ color: r.status === 'risk' ? 'var(--warning-ink)' : 'var(--good-ink)' }}>
              {readingText(r)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Above the plan: says plainly what each source covers, and offers the live check.
 * The download shows what was collected; the extension shows what settings are right now.
 */
function LiveStrip({ plan }: { plan: SourcedPlan }) {
  const ext = useExtension();
  const setView = useUiStore((s) => s.setView);
  const demo = useDataStore((s) => s.source === 'sample');
  const lastScan = useLiveReport('facebook');
  if (demo) return null;
  const checkable = plan.all.filter((p) => p.liveCheckable).length;
  if (!checkable) return null;

  let text: string;
  let action: ReactNode = null;
  const btn = 'inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 font-semibold hover:opacity-90 disabled:opacity-60';
  const style = { background: 'var(--plan)', color: 'var(--plan-ink)' };
  if (!ext.installed) {
    text = L.stripNoExtension(checkable);
    action = (
      <button type="button" onClick={() => setView('extension')} className={btn} style={style}>
        <Puzzle className="size-4" aria-hidden /> {L.getExtension}
      </button>
    );
  } else {
    const scanBtn = (label: string) => (
      <button type="button" onClick={() => ext.scan()} disabled={ext.running} className={btn} style={style}>
        {ext.running ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Radio className="size-4" aria-hidden />}
        {ext.running ? L.scanning : label}
      </button>
    );
    if (ext.running) text = L.stripRunning;
    else if (ext.scanError === 'busy') text = L.stripBusy;
    else if (plan.live && plan.liveCount > 0) text = L.stripDone(plan.liveCount, fmt.date(plan.live.at));
    else if (plan.live) text = L.stripNoneMatched(fmt.date(plan.live.at));
    else if (lastScan?.signedOut) text = L.stripSignedOut;
    else text = L.stripNoScan(checkable);
    action = scanBtn(plan.live ? L.scanAgain : L.scanNow);
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface-2 p-4 sm:p-5" aria-live="polite">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: 'color-mix(in oklab, var(--plan) 16%, transparent)', color: 'var(--plan)' }}>
        <Radio className="size-5" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 basis-72 text-[14px] text-ink-2">{text}</p>
      {action}
    </div>
  );
}
