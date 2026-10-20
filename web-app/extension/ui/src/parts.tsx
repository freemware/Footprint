import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Check, Copy, Loader2, Lock, Sparkles, Square, X } from 'lucide-react';
import { C, APP_URL } from './copy';
import { call } from '../../src/shared/messages';
import type { Job, PageOutline } from '../../src/shared/types';
import { useStored } from './hooks';

type Variant = 'primary' | 'fix' | 'ghost' | 'quiet' | 'danger';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:opacity-90',
  fix: 'bg-[var(--plan)] text-[var(--plan-ink)] hover:opacity-90',
  ghost: 'border border-line-strong text-ink hover:bg-surface-2',
  quiet: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'border border-critical/50 text-critical hover:bg-critical/10',
};

export function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${size === 'sm' ? 'h-9 px-3 text-[13px]' : 'h-11 px-4 text-[14px]'} ${VARIANT[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function LinkButton({ href, children, variant = 'ghost', size = 'md' }: { href: string; children: ReactNode; variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition ${size === 'sm' ? 'h-9 px-3 text-[13px]' : 'h-11 px-4 text-[14px]'} ${VARIANT[variant]}`}>
      {children}
    </a>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Logo({ size = 32 }: { size?: number }) {
  return <img src="icons/icon-128.png" width={size} height={size} alt="" className="rounded-[9px]" />;
}

export function PlatformMark({ mark, muted }: { mark: string; muted?: boolean }) {
  return (
    <span className={`display grid size-11 shrink-0 place-items-center rounded-xl text-[18px] font-bold ${muted ? 'bg-surface-3 text-ink-3' : 'bg-accent-dim text-accent'}`} aria-hidden>
      {mark}
    </span>
  );
}

export function Pill({ tone, children }: { tone: 'risk' | 'ok' | 'unknown' | 'info'; children: ReactNode }) {
  const style =
    tone === 'risk'
      ? { color: 'var(--warning-ink)', background: 'color-mix(in oklab, var(--warning) 16%, transparent)' }
      : tone === 'ok'
        ? { color: 'var(--good-ink)', background: 'color-mix(in oklab, var(--good) 14%, transparent)' }
        : tone === 'info'
          ? { color: 'var(--plan)', background: 'color-mix(in oklab, var(--plan) 14%, transparent)' }
          : { color: 'var(--text-2)', background: 'var(--surface-3)' };
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap" style={style}>
      {children}
    </span>
  );
}

/** A modal that asks before anything changes. */
export function Dialog({ title, children, onClose, actions }: { title: string; children: ReactNode; onClose: () => void; actions: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => {
      window.removeEventListener('keydown', k);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'var(--backdrop)' }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dlg-title" className="max-h-[90vh] w-full max-w-[540px] overflow-y-auto rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]">
        <div className="flex items-start gap-3 border-b border-line p-5">
          <h2 id="dlg-title" className="display flex-1 text-[22px] font-semibold text-ink">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-xl text-ink-3 hover:bg-surface-2 hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">{children}</div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2 p-4">{actions}</div>
      </div>
    </div>
  );
}

const KIND_LABEL: Record<Job['kind'], string> = {
  scan: 'Scanning Facebook',
  fix: 'Making approved changes',
  find_tags: 'Finding posts you’re tagged in',
  untag: 'Removing your tags',
  find_posts: 'Finding your posts',
  trash_posts: 'Moving posts to trash',
};

/** Live progress of whatever Footprint is doing, with a Stop button. */
export function JobBar({ compact }: { compact?: boolean }) {
  const job = useStored('job');
  if (!job || (job.status !== 'running' && Date.now() - (job.endedAt ?? 0) > 120_000)) return null;
  const running = job.status === 'running';
  const pct = Math.round((running ? job.progress : 1) * 100);
  return (
    <div role="status" aria-live="polite" className={`rounded-2xl border p-4 ${running ? 'border-accent/40 bg-accent-dim' : job.status === 'done' && !job.error ? 'border-good/40 bg-good/10' : 'border-line bg-surface-2'}`}>
      <div className="flex items-center gap-3">
        {running ? <Loader2 className="size-5 shrink-0 animate-spin text-accent" aria-hidden /> : job.status === 'done' && !job.error ? <Check className="size-5 shrink-0 text-good" aria-hidden /> : <Square className="size-4 shrink-0 text-ink-3" aria-hidden />}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-ink-3">{running ? C.job.working : `${KIND_LABEL[job.kind]} · ${C.job[job.status]}`}</p>
          <p className="font-semibold text-ink">{running ? KIND_LABEL[job.kind] : job.message || C.job[job.status]}</p>
          {!compact && running && job.message && <p className="truncate text-[13px] text-ink-2">{job.message}</p>}
        </div>
        {running && (
          <Button size="sm" variant="ghost" onClick={() => void call({ type: 'cancel' })}>
            {C.job.stop}
          </Button>
        )}
      </div>
      {running && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(4, pct)}%` }} />
        </div>
      )}
      {compact && running && job.message && <p className="mt-2 text-[12px] text-ink-2">{job.message}</p>}
    </div>
  );
}

/** Shown where a Pro feature is locked. */
export function ProGate({ onHaveKey }: { onHaveKey: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-surface-2 p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: 'color-mix(in oklab, var(--plan) 18%, transparent)', color: 'var(--plan)' }}>
        <Lock className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-60">
        <p className="font-semibold text-ink">{C.pro.title}</p>
        <p className="text-[13px] text-ink-2">{C.pro.text}</p>
      </div>
      <div className="flex gap-2">
        <LinkButton href={APP_URL} variant="fix" size="sm">
          <Sparkles className="size-4" aria-hidden /> {C.pro.cta}
        </LinkButton>
        <Button size="sm" variant="ghost" onClick={onHaveKey}>
          {C.pro.have}
        </Button>
      </div>
    </div>
  );
}

/** Problem report: the page's control labels only, for fixing recipes when platforms change. */
export function ProblemReport({ outline, what }: { outline: PageOutline; what: string }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify({ footprint: 'problem-report', what, page: outline.path, controls: outline.controls }, null, 1);
  return (
    <details className="rounded-xl border border-line bg-surface-2 p-3 text-[13px]">
      <summary className="cursor-pointer font-semibold text-ink">{C.problem.title}</summary>
      <p className="mt-2 text-ink-2">{C.problem.text}</p>
      <textarea readOnly value={text} className="mt-2 h-32 w-full rounded-lg border border-line bg-surface p-2 font-mono text-[11px] text-ink-2" aria-label={C.problem.title} />
      <Button
        size="sm"
        variant="ghost"
        className="mt-2"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => setCopied(true));
        }}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copied ? C.problem.copied : C.problem.copy}
      </Button>
    </details>
  );
}

/** Ring showing how many checked settings are private. */
export function Ring({ ok, total, size = 64 }: { ok: number; total: number; size?: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const frac = total ? ok / total : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${ok} of ${total} settings private`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={frac === 1 ? 'var(--plan)' : 'var(--accent)'} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset .6s' }} />
      <text x="32" y="37" textAnchor="middle" className="num" style={{ fill: 'var(--text)', font: '700 15px var(--font-display)' }}>
        {total ? `${ok}/${total}` : '–'}
      </text>
    </svg>
  );
}
