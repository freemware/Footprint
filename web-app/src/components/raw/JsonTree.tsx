import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { t } from '../../i18n/strings';
import { toMs } from '../../importer/time';

const PAGE = 50;
const TIME_KEY = /timestamp|_time$|^time$/i;

/**
 * Collapsible JSON viewer. Children render only when expanded, and long arrays
 * page in 50 at a time, so even the largest export files stay fast.
 */
export function JsonTree({ value, defaultDepth = 1 }: { value: unknown; defaultDepth?: number }) {
  return (
    <div className="font-mono text-[11.5px] leading-5" role="tree">
      <Node name={null} value={value} depth={0} defaultDepth={defaultDepth} />
    </div>
  );
}

function Node({ name, value, depth, defaultDepth }: { name: string | null; value: unknown; depth: number; defaultDepth: number }) {
  const isArr = Array.isArray(value);
  const isObj = !!value && typeof value === 'object';
  const [open, setOpen] = useState(depth < defaultDepth);
  const [shown, setShown] = useState(PAGE);
  const key =
    name !== null ? (
      <span className="text-ink-2">
        {name}
        <span className="text-ink-3">: </span>
      </span>
    ) : null;

  if (!isObj) return <div style={{ paddingLeft: depth * 14 }}>{key}<Leaf name={name} value={value} /></div>;

  // Facebook's { label, value | href | timestamp_value } pairs read best as one line.
  const pair = labelPair(value);
  if (pair)
    return (
      <div style={{ paddingLeft: depth * 14 + 14 }} className="break-words">
        <span className="text-ink-2">{pair.label || '—'}</span>
        <span className="text-ink-3">: </span>
        <Leaf name={pair.isTime ? 'timestamp' : null} value={pair.value} />
        {pair.href && pair.href !== pair.value && <span className="ml-2 text-ink-3">{pair.href}</span>}
      </div>
    );

  const entries: [string, unknown][] = isArr ? (value as unknown[]).map((v, i) => [String(i), v]) : Object.entries(value as object);
  const summary = isArr ? `[${entries.length}]` : `{${entries.length}}`;
  return (
    <div role="treeitem" aria-expanded={open}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-0.5 rounded-sm text-left hover:bg-surface-2"
        style={{ paddingLeft: depth * 14 }}
      >
        <ChevronRight className={`size-3 shrink-0 text-ink-3 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden />
        {key}
        <span className="text-ink-3">{summary}</span>
        {!open && !isArr && <Preview entries={entries} />}
      </button>
      {open && (
        <div role="group">
          {entries.slice(0, shown).map(([k, v]) => (
            <Node key={k} name={k} value={v} depth={depth + 1} defaultDepth={defaultDepth} />
          ))}
          {entries.length > shown && (
            <button
              type="button"
              onClick={() => setShown(shown + PAGE * 4)}
              className="label my-0.5 text-accent hover:underline"
              style={{ paddingLeft: (depth + 1) * 14 + 14 }}
            >
              {t.raw.showMore} (+{entries.length - shown} {t.raw.more})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function labelPair(v: unknown): { label: string; value: unknown; href?: string; isTime: boolean } | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.label !== 'string' || 'vec' in o || 'dict' in o) return undefined;
  if ('timestamp_value' in o) return { label: o.label, value: o.timestamp_value, isTime: true };
  if ('value' in o) return { label: o.label, value: o.value, href: typeof o.href === 'string' ? o.href : undefined, isTime: false };
  if ('href' in o) return { label: o.label, value: o.href, isTime: false };
  return undefined;
}

/** One-line preview shown while collapsed: label/value pairs if present, else the first scalar fields. */
function Preview({ entries }: { entries: [string, unknown][] }) {
  const lv = entries.find(([k]) => k === 'label_values')?.[1];
  if (Array.isArray(lv)) {
    const bits = lv
      .map(labelPair)
      .filter((p): p is NonNullable<typeof p> => !!p && !p.isTime && typeof p.value === 'string')
      .slice(0, 3)
      .map((p) => `${p.label}: ${String(p.value).slice(0, 40)}`);
    if (bits.length) return <span className="ml-2 truncate text-ink-3">{bits.join(' · ')}</span>;
  }
  const bits = entries
    .filter(([, v]) => v === null || typeof v !== 'object')
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v.slice(0, 24)}${v.length > 24 ? '…' : ''}"` : String(v)}`);
  return bits.length ? <span className="ml-2 truncate text-ink-3">{bits.join(', ')}</span> : null;
}

function Leaf({ name, value }: { name: string | null; value: unknown }) {
  const [full, setFull] = useState(false);
  if (typeof value === 'string') {
    const long = value.length > 240;
    return (
      <span className="break-words text-[var(--cat-social)]">
        "{long && !full ? `${value.slice(0, 240)}…` : value}"
        {long && (
          <button type="button" onClick={() => setFull(!full)} className="ml-1 text-accent hover:underline">
            {full ? '−' : '+'}
          </button>
        )}
      </span>
    );
  }
  if (typeof value === 'number') {
    const when = name && TIME_KEY.test(name) ? toMs(value) : undefined;
    return (
      <span className="text-[var(--cat-posts)]">
        {value}
        {when !== undefined && <span className="ml-2 text-ink-3">{new Date(when).toLocaleString()}</span>}
      </span>
    );
  }
  return <span className="text-[var(--cat-security)]">{String(value)}</span>;
}
