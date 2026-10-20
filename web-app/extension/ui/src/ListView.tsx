import { useEffect, useMemo, useState } from 'react';
import { Search, Tag, Trash2 } from 'lucide-react';
import { C } from './copy';
import { Button, Card, Dialog, JobBar, ProblemReport, ProGate } from './parts';
import { useStored } from './hooks';
import { call } from '../../src/shared/messages';
import { FACEBOOK } from '../../src/platforms/facebook';
import type { ListItem } from '../../src/shared/types';

type Kind = 'tags' | 'posts';

/** Untag yourself, or move old posts to trash: find → tick → approve → done, counted afterwards. */
export function ListView({ kind, pro, onKey }: { kind: Kind; pro: boolean; onKey: () => void }) {
  const recipe = kind === 'tags' ? FACEBOOK.tags! : FACEBOOK.posts!;
  const copy = kind === 'tags' ? C.untag : C.cleanup;
  const job = useStored('job');
  const [source, setSource] = useState(recipe.sources[0]!.id);
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [ticked, setTicked] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear() - 5));
  const [confirming, setConfirming] = useState(false);
  const findKind = kind === 'tags' ? 'find_tags' : 'find_posts';
  const actKind = kind === 'tags' ? 'untag' : 'trash_posts';
  const running = job?.status === 'running';

  // Pick up what the background found, and refresh the list after acting on it.
  useEffect(() => {
    if (!job || job.platform !== 'facebook' || job.status === 'running') return;
    if (job.kind === findKind && job.items) setItems(job.items);
    if (job.kind === actKind && job.items) {
      setItems(job.items);
      setTicked([]);
    }
  }, [job, findKind, actKind]);

  const shown = useMemo(() => (items ?? []).filter((i) => !filter || i.text.toLowerCase().includes(filter.toLowerCase())), [items, filter]);
  const years = useMemo(() => {
    const ys = new Set((items ?? []).map((i) => i.date?.slice(0, 4)).filter(Boolean) as string[]);
    const now = new Date().getFullYear();
    for (let y = now; y >= now - 15; y--) ys.add(String(y));
    return [...ys].sort().reverse();
  }, [items]);
  const toggle = (k: string) => setTicked((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]));
  const capped = ticked.slice(0, recipe.maxPerRun);
  const failed = job?.kind === findKind && job.status === 'failed';

  const find = () => {
    setItems(null);
    setTicked([]);
    void call({ type: 'find', platform: 'facebook', list: kind, source });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="display text-[32px] font-semibold text-ink">{copy.title}</h1>
        <p className="mt-2 max-w-[68ch] text-ink-2">{copy.lead}</p>
      </header>

      {!pro ? (
        <ProGate onHaveKey={onKey} />
      ) : (
        <Card className="flex flex-wrap items-end gap-3 p-4">
          {recipe.sources.length > 1 && (
            <label className="flex min-w-0 flex-1 basis-60 flex-col gap-1 text-[13px] font-semibold text-ink-2">
              {C.untag.which}
              <select value={source} onChange={(e) => setSource(e.target.value)} className="h-11 rounded-xl border border-line bg-surface px-3 text-[14px] font-normal text-ink">
                {recipe.sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Button onClick={find} disabled={running}>
            <Search className="size-4" aria-hidden /> {running && job?.kind === findKind ? copy.finding : copy.find}
          </Button>
        </Card>
      )}

      <JobBar />
      {failed && job.outline && <ProblemReport outline={job.outline} what={`${findKind}:${source}`} />}

      {items && pro && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
            <p className="min-w-0 flex-1 basis-56 font-semibold text-ink">{items.length ? (kind === 'tags' ? C.untag.found(items.length) : `${items.length} posts found.`) : copy.none}</p>
            {items.length > 0 && (
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter" aria-label="Filter the list" className="h-9 w-44 rounded-lg border border-line bg-surface px-3 text-[13px] text-ink" />
            )}
          </div>
          {items.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-4 py-3 text-[13px]">
              <Button size="sm" variant="quiet" onClick={() => setTicked(shown.map((i) => i.key))}>
                {C.scan.selectAll}
              </Button>
              <Button size="sm" variant="quiet" onClick={() => setTicked([])}>
                Clear
              </Button>
              {kind === 'posts' && (
                <span className="ml-auto flex items-center gap-2">
                  <label htmlFor="older" className="text-ink-2">
                    {C.cleanup.olderThan}
                  </label>
                  <select id="older" value={year} onChange={(e) => setYear(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2 text-ink">
                    {years.map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                  <Button size="sm" variant="ghost" onClick={() => setTicked(items.filter((i) => i.date && i.date < `${year}-01-01`).map((i) => i.key))}>
                    {C.cleanup.selectOlder}
                  </Button>
                </span>
              )}
            </div>
          )}
          <ul className="max-h-[480px] divide-y divide-line overflow-y-auto">
            {shown.map((i) => (
              <li key={i.key}>
                <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-surface-2">
                  <input type="checkbox" checked={ticked.includes(i.key)} onChange={() => toggle(i.key)} className="mt-1 size-4 accent-[var(--plan)]" />
                  <span className="min-w-0 flex-1 text-ink">{i.text}</span>
                  <span className="num shrink-0 text-[12px] text-ink-3">{i.date ?? C.cleanup.noDate}</span>
                </label>
              </li>
            ))}
          </ul>
          {items.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-t border-line p-4">
              <p className="min-w-0 flex-1 text-[13px] text-ink-3">{C.untag.limit(recipe.maxPerRun)}</p>
              <Button variant={kind === 'tags' ? 'fix' : 'danger'} disabled={!ticked.length || running} onClick={() => setConfirming(true)}>
                {kind === 'tags' ? <Tag className="size-4" aria-hidden /> : <Trash2 className="size-4" aria-hidden />} {copy.act(capped.length)}
              </Button>
            </div>
          )}
        </Card>
      )}

      {confirming && (
        <Dialog
          title={copy.confirmTitle(capped.length)}
          onClose={() => setConfirming(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                {C.approve.cancel}
              </Button>
              <Button
                variant={kind === 'tags' ? 'fix' : 'danger'}
                onClick={() => {
                  void call({ type: 'act', platform: 'facebook', list: kind, source, keys: capped });
                  setConfirming(false);
                }}
              >
                {copy.act(capped.length)}
              </Button>
            </>
          }
        >
          <p className="text-ink-2">{copy.confirmText}</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line bg-surface-2 p-3 text-[13px] text-ink-2">
            {(items ?? [])
              .filter((i) => capped.includes(i.key))
              .map((i) => (
                <li key={i.key} className="truncate">
                  {i.text}
                </li>
              ))}
          </ul>
          <p className="text-[13px] text-ink-3">{C.approve.stopAnytime}</p>
        </Dialog>
      )}
    </div>
  );
}
