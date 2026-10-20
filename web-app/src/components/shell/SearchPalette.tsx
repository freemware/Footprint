import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { platformName } from '../../i18n/platform';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Building2, CornerDownLeft, FileJson, Hash, Search, Sparkles, User, type LucideIcon } from 'lucide-react';
import { fmt } from '../../i18n/strings';
import { TABS, TAB_ORDER, typeLabel } from '../../i18n/report';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { useInsights } from '../../insights/useInsights';
import { TAB_ICONS } from './Header';

interface Result {
  id: string;
  group: string;
  icon: LucideIcon;
  title: ReactNode;
  sub?: string;
  run: () => void;
}

const PER_GROUP = 5;
const norm = (s: string) => s.toLocaleLowerCase();

/** Highlight the matched part of a label. */
function Mark({ text, q }: { text: string; q: string }) {
  const i = norm(text).indexOf(q);
  if (!q || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-accent-dim px-0.5 text-ink">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** Ranked matches: names that start with the query first, then names that contain it. */
function find<T>(items: T[], q: string, key: (t: T) => string, limit: number): { hits: T[]; total: number } {
  const starts: T[] = [];
  const contains: T[] = [];
  for (const it of items) {
    const k = norm(key(it));
    if (k.startsWith(q)) starts.push(it);
    else if (k.includes(q)) contains.push(it);
  }
  return { hits: [...starts, ...contains].slice(0, limit), total: starts.length + contains.length };
}

/** Search everything (⌘K / Ctrl+K / "/"). */
export function SearchPalette() {
  const open = useUiStore((s) => s.searchOpen);
  const setOpen = useUiStore((s) => s.setSearchOpen);
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[10vh]"
          style={{ background: 'var(--backdrop)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search everything"
            initial={reduce ? false : { y: -8, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: -8, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="flex max-h-[72vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-pop)]"
          >
            <Palette onClose={() => setOpen(false)} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const q = norm(useDeferredValue(query).trim());
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const events = useDataStore((s) => s.events);
  const summary = useDataStore((s) => s.summary);
  const i = useInsights();
  const setView = useUiStore((s) => s.setView);
  const inspect = useUiStore((s) => s.inspect);
  const openDeepLink = useUiStore((s) => s.openDeepLink);

  // People: everyone who appears in any record, most-mentioned first.
  const people = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) for (const p of e.people ?? []) m.set(p, (m.get(p) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [events]);
  const haystack = useMemo(() => events.map((e) => norm(`${e.title ?? ''} ${e.text ?? ''}`)), [events]);

  const results = useMemo<Result[]>(() => {
    const out: Result[] = [];
    const tabs = TAB_ORDER.filter((t) => !q || norm(`${TABS[t].label} ${TABS[t].title}`).includes(q));
    for (const t of tabs.slice(0, q ? 3 : TAB_ORDER.length))
      out.push({ id: `tab:${t}`, group: 'Go to', icon: TAB_ICONS[t], title: TABS[t].label, sub: TABS[t].title, run: () => setView(t) });
    if (!q) return out;

    const ppl = find(people, q, (p) => p[0], PER_GROUP);
    for (const [name, n] of ppl.hits)
      out.push({
        id: `p:${name}`,
        group: 'People',
        icon: User,
        title: <Mark text={name} q={q} />,
        sub: `${fmt.number(n)} records`,
        run: () => inspect({ title: name, events: events.filter((e) => e.people?.includes(name)).reverse() }),
      });

    const recIdx: number[] = [];
    for (let k = haystack.length - 1; k >= 0; k--) if (haystack[k]!.includes(q)) recIdx.push(k);
    for (const k of recIdx.slice(0, PER_GROUP)) {
      const e = events[k]!;
      out.push({
        id: `r:${e.id}`,
        group: 'Records',
        icon: Hash,
        title: <Mark text={e.title ?? typeLabel(e.type)} q={q} />,
        sub: `${typeLabel(e.type)} · ${fmt.date(e.timestamp)}`,
        run: () => inspect({ title: e.title ?? typeLabel(e.type), subtitle: fmt.dateTime(e.timestamp), events: [e] }),
      });
    }
    if (recIdx.length > PER_GROUP)
      out.push({
        id: 'r:all',
        group: 'Records',
        icon: Search,
        title: `Show all ${fmt.number(recIdx.length)} matching records`,
        run: () => inspect({ title: `“${query.trim()}”`, subtitle: `${fmt.number(recIdx.length)} matching records`, events: recIdx.map((k) => events[k]!) }),
      });

    const biz = find(i.ads.names, q, (a) => a.name, PER_GROUP);
    for (const a of biz.hits)
      out.push({
        id: `b:${a.name}`,
        group: 'Businesses with your information',
        icon: Building2,
        title: <Mark text={a.name} q={q} />,
        sub: [a.uploaded && 'Uploaded a list with your details', a.activity && 'Shared your activity'].filter(Boolean).join(' · '),
        run: () => openDeepLink({ kind: 'advertiser', query: a.name }),
      });

    const ints = find([...i.ads.interests, ...i.ads.categories], q, (s) => s, PER_GROUP);
    for (const s of ints.hits)
      out.push({ id: `i:${s}`, group: `Interests and categories ${platformName()} picked`, icon: Sparkles, title: <Mark text={s} q={q} />, run: () => openDeepLink({ kind: 'interest', query: s }) });

    const files = find(summary?.files ?? [], q, (f) => f.path, PER_GROUP);
    for (const f of files.hits)
      out.push({
        id: `f:${f.path}`,
        group: 'Files',
        icon: FileJson,
        title: <Mark text={f.path.split('/').pop() ?? f.path} q={q} />,
        sub: f.path,
        run: () => openDeepLink({ kind: f.kind === 'media' ? 'media' : 'file', path: f.path }),
      });
    return out;
  }, [q, people, haystack, events, i, summary, query, setView, inspect, openDeepLink]);

  useEffect(() => {
    setActive(0);
  }, [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (r?: Result) => {
    if (!r) return;
    onClose();
    r.run();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup = '';
  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-5 shrink-0 text-ink-3" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search people, businesses, interests, messages, files…"
          aria-label="Search everything"
          aria-controls="search-results"
          aria-activedescendant={results[active] ? `sr-${active}` : undefined}
          className="h-14 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
        />
        <kbd className="shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[11px] text-ink-3">Esc</kbd>
      </div>
      <div ref={listRef} id="search-results" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
        {q && results.length <= TAB_ORDER.length && !results.some((r) => !r.id.startsWith('tab:')) && (
          <p className="px-3 py-8 text-center text-ink-3">Nothing in your export matches “{query.trim()}”.</p>
        )}
        {results.map((r, idx) => {
          const header = r.group !== lastGroup ? r.group : null;
          lastGroup = r.group;
          const on = idx === active;
          return (
            <div key={r.id}>
              {header && <div className="px-3 pt-3 pb-1 text-[12px] font-medium text-ink-3">{header}</div>}
              <button
                type="button"
                id={`sr-${idx}`}
                role="option"
                aria-selected={on}
                data-idx={idx}
                onMouseMove={() => setActive(idx)}
                onClick={() => choose(r)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${on ? 'bg-surface-3' : ''}`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-2">
                  <r.icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">{r.title}</span>
                  {r.sub && <span className="block truncate text-[12px] text-ink-3">{r.sub}</span>}
                </span>
                {on && <CornerDownLeft className="size-4 shrink-0 text-ink-3" aria-hidden />}
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[12px] text-ink-3">
        <span>
          <kbd className="font-sans">↑↓</kbd> to move
        </span>
        <span>
          <kbd className="font-sans">Enter</kbd> to open
        </span>
        <span className="ml-auto">Searches only what’s on this device</span>
      </div>
    </>
  );
}
