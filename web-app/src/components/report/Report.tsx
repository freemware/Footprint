import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import { ChevronRight, Search, type LucideIcon } from 'lucide-react';
import { fmt } from '../../i18n/strings';
import { TAB_HUE, report, type TabId } from '../../i18n/report';

/* ------------------------------------------------------------------ page frame */

/**
 * Full-width band at the top of a tab, tinted with the tab's hue: icon, question-style title,
 * one-paragraph explanation, and optionally the tab's headline numbers.
 */
export function PageHeader({
  tab,
  icon: Icon,
  title,
  lead,
  stats,
  aside,
}: {
  tab: TabId;
  icon?: LucideIcon;
  title: string;
  lead?: ReactNode;
  stats?: StatItem[];
  aside?: ReactNode;
}) {
  return (
    <header className="tab-band border-b border-line" style={{ '--tab': TAB_HUE[tab] } as CSSProperties}>
      <div className="mx-auto max-w-[1240px] px-4 pt-10 pb-8 sm:px-6 sm:pt-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex max-w-[760px] gap-4">
            {Icon && (
              <span className="tab-tile mt-1 hidden size-12 shrink-0 place-items-center rounded-2xl sm:grid">
                <Icon className="size-6" aria-hidden />
              </span>
            )}
            <div>
              <h1 className="display text-[34px] font-semibold text-ink sm:text-[44px]">{title}</h1>
              {lead && <p className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-ink-2">{lead}</p>}
            </div>
          </div>
          {aside}
        </div>
        {stats && stats.length > 0 && (
          <div className="mt-8">
            <StatTiles items={stats} />
          </div>
        )}
      </div>
    </header>
  );
}

/** Page content below the header band. */
export function Body({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1240px] px-4 pt-10 pb-6 sm:px-6">{children}</div>;
}

/** A titled block of a page, separated by space rather than boxes. */
export function Section({ title, lead, aside, children, id }: { title: string; lead?: ReactNode; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mb-14 scroll-mt-32">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-[720px]">
          <h2 className="display text-[24px] font-semibold text-ink">{title}</h2>
          {lead && <p className="mt-1.5 max-w-[68ch] text-ink-2">{lead}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ cards */

/** Surface with an optional title row (icon, title, short description, actions). */
export function Card({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className = '',
  bodyClassName = 'p-5',
  hue,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  hue?: string;
}) {
  return (
    <div className={`card flex flex-col ${className}`} style={hue ? ({ '--tab': hue } as CSSProperties) : undefined}>
      {title && (
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          {Icon && (
            <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${hue ? 'tab-tile' : 'bg-surface-3 text-ink-2'}`}>
              <Icon className="size-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-tight text-ink">{title}</h3>
            {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <div className={`min-h-0 grow ${bodyClassName}`}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ numbers */

export interface StatItem {
  value: number | string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  color?: string;
}

/** Headline numbers as tiles. Numbers count up once when they first scroll into view. */
export function StatTiles({ items }: { items: StatItem[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="card px-4 py-4">
          <dt className="flex items-center gap-2 text-[13px] text-ink-2">
            {s.icon && <s.icon className="size-4" style={{ color: s.color ?? 'var(--tab, var(--accent))' }} aria-hidden />}
            {s.label}
          </dt>
          <dd className="display num mt-2 text-[30px] font-semibold leading-none text-ink">
            {typeof s.value === 'number' ? <CountUp value={s.value} /> : s.value}
          </dd>
          {s.hint && <dd className="mt-1.5 text-[12px] text-ink-3">{s.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Kept for simple inline number rows inside cards. */
export const Stats = StatTiles;

export function CountUp({ value, format = fmt.number }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce || !inView) {
      if (reduce) setShown(value);
      return;
    }
    const c = animate(0, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setShown(v) });
    return () => c.stop();
  }, [value, inView, reduce]);
  return <span ref={ref}>{format(Math.round(shown))}</span>;
}

/* ------------------------------------------------------------------ lists */

export interface BarItem {
  key: string;
  label: ReactNode;
  count: number;
  sub?: ReactNode;
  /** Plain text used for the initials avatar when the label is a component. */
  name?: string;
}

const initials = (s: string) =>
  s
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '·';

/**
 * Ranked list with a bar per row. The number is always printed, so color is never the
 * only cue. Rows are buttons (with a reveal-on-hover chevron) when `onSelect` is given.
 */
export function BarList({
  items,
  color = 'var(--accent)',
  limit = 8,
  onSelect,
  unit,
  avatars = false,
  ranked = false,
}: {
  items: BarItem[];
  color?: string;
  limit?: number;
  onSelect?: (key: string) => void;
  unit?: (n: number) => string;
  avatars?: boolean;
  ranked?: boolean;
}) {
  const [all, setAll] = useState(false);
  const max = Math.max(1, ...items.map((i) => i.count));
  const shown = all ? items : items.slice(0, limit);
  if (!items.length) return <Empty title={report.common.noData} />;
  return (
    <div>
      <ol className="-mx-2 space-y-0.5">
        {shown.map((it, idx) => {
          const body = (
            <span className="flex items-center gap-3">
              {ranked && <span className="num w-5 shrink-0 text-right text-[12px] text-ink-3">{idx + 1}</span>}
              {avatars && (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-ink-2" aria-hidden>
                  {initials(it.name ?? (typeof it.label === 'string' ? it.label : it.key))}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-ink">{it.label}</span>
                  <span className="num shrink-0 text-[13px] text-ink-2">{unit ? unit(it.count) : fmt.number(it.count)}</span>
                </span>
                <span className="mt-1.5 block h-1.5 rounded-full bg-surface-3">
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(2, (it.count / max) * 100)}%`, background: color }} />
                </span>
                {it.sub && <span className="mt-1 block text-[12px] text-ink-3">{it.sub}</span>}
              </span>
              {onSelect && (
                <ChevronRight className="size-4 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
              )}
            </span>
          );
          return (
            <li key={it.key}>
              {onSelect ? (
                <button type="button" onClick={() => onSelect(it.key)} className="group block w-full rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-2">
                  {body}
                </button>
              ) : (
                <div className="px-2 py-2">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
      {items.length > limit && (
        <button type="button" onClick={() => setAll(!all)} className="mt-3 text-[13px] font-medium text-accent hover:underline">
          {all ? 'Show fewer' : `Show all ${fmt.number(items.length)}`}
        </button>
      )}
    </div>
  );
}

/** A searchable cloud of short labels, e.g. interests. */
export function ChipCloud({ items, placeholder, limit = 80, initial = '' }: { items: string[]; placeholder?: string; limit?: number; initial?: string }) {
  const [q, setQ] = useState(initial);
  const [all, setAll] = useState(false);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => i.toLowerCase().includes(s)) : items;
  }, [items, q]);
  const shown = all || q ? filtered : filtered.slice(0, limit);
  return (
    <div>
      {placeholder && <SearchBox value={q} onChange={setQ} placeholder={placeholder} />}
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {shown.map((i) => (
          <li key={i} className="rounded-full border border-line bg-surface-2 px-3 py-1 text-[13px] text-ink">
            {i}
          </li>
        ))}
        {q && !filtered.length && <li className="text-ink-3">No matches for “{q}”.</li>}
      </ul>
      {!q && filtered.length > limit && (
        <button type="button" onClick={() => setAll(!all)} className="mt-3 text-[13px] font-medium text-accent hover:underline">
          {all ? 'Show fewer' : `Show all ${fmt.number(filtered.length)}`}
        </button>
      )}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  return (
    <label className="flex h-10 w-full max-w-sm items-center gap-2 rounded-xl border border-line bg-surface px-3 shadow-[var(--shadow-card)] transition-colors focus-within:border-accent">
      <Search className="size-4 shrink-0 text-ink-3" aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
      />
    </label>
  );
}

/* ------------------------------------------------------------------ small pieces */

/** Two- or three-part proportion bar with labels, e.g. sent vs received. */
export function SplitBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = Math.max(1, parts.reduce((s, p) => s + p.value, 0));
  return (
    <div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: p.color }} aria-hidden />
            {p.label} <span className="num font-medium text-ink">{fmt.number(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "See details" style link button. */
export function MoreLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group inline-flex items-center gap-1 text-[13px] font-medium text-accent">
      <span className="group-hover:underline">{children}</span>
      <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  );
}

/** Wrap a personal value (email, phone, ID) so it blurs when "hide personal details" is on. */
export function Personal({ hidden, children }: { hidden: boolean; children: ReactNode }) {
  return <span className={hidden ? 'blurred' : undefined}>{children}</span>;
}

/** Empty or not-available state: says what's missing, quietly. */
export function Empty({ title, hint, icon: Icon }: { title: string; hint?: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      {Icon && (
        <span className="grid size-10 place-items-center rounded-xl bg-surface-3 text-ink-3">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <p className="font-medium text-ink-2">{title}</p>
      {hint && <p className="max-w-[44ch] text-[13px] text-ink-3">{hint}</p>}
    </div>
  );
}

/** Segmented control for a small set of mutually exclusive options. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-surface p-0.5 shadow-[var(--shadow-card)]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-[10px] px-3 py-1.5 text-[13px] transition-colors ${value === o.id ? 'bg-accent font-medium text-accent-ink' : 'text-ink-2 hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
