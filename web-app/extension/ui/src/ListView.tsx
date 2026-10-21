import { useMemo, useState } from 'react';
import { Search, Tag, Trash2 } from 'lucide-react';
import { C } from './copy';
import { Button, Card, Dialog, JobBar, ProblemReport, ProGate } from './parts';
import { useStored } from './hooks';
import { call } from '../../src/shared/messages';
import { platform as platformOf } from '../../src/platforms/registry';
import { ext } from '../../src/shared/ext';
import { PostCard } from './PostCard';


type Kind = 'tags' | 'posts';

/** Untag yourself, or move old posts to trash: find → tick → approve → done, counted afterwards. */
export function ListView({ kind, pro, onKey, platformId = 'facebook' }: { kind: Kind; pro: boolean; onKey: () => void; platformId?: string }) {
  const platform = platformOf(platformId)!;
  const recipe = (kind === 'tags' ? platform.tags : platform.posts)!;
  const baseCopy = kind === 'tags' ? C.untag : C.cleanup;
  const copy = kind === 'posts' && recipe.mode === 'archive' ? {
    ...baseCopy,
    title: 'Archive old posts',
    lead: 'Review your posts and choose which to archive. You can restore them on Instagram.',
    act: (n: number) => `Archive ${n} posts`,
    confirmTitle: (n: number) => `Archive ${n} posts?`,
    confirmText: 'These posts will be hidden in your Instagram archive. You can show them again from Instagram.',
  } : baseCopy;
  const job = useStored('job');
  const sources = useStored('listSources');
  const lists = useStored('listResults');
  const reviews = useStored('listReviews');
  const sourceOptions = kind==='tags' && recipe.sources.length>1 ? [{id:'all',label:'All tagged posts, photos & videos'},...recipe.sources] : recipe.sources;
  const source = sources[`${platformId}:${kind}`] ?? sourceOptions[0]!.id;
  const cacheKey = `${platformId}:${kind}:${source}`;
  const cached = lists[cacheKey];
  const items = cached?.items ?? null;
  const setSource = (value:string) => {setTicked([]); void ext.storage.local.set({listSources:{...sources,[`${platformId}:${kind}`]:value}});};
  const [unreviewed,setUnreviewed] = useState(false);
  const [error,setError] = useState('');
  const [ticked, setTicked] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear() - 5));
  const [confirming, setConfirming] = useState(false);
  const findKind = kind === 'tags' ? 'find_tags' : 'find_posts';
  const running = job?.status === 'running';

  const shown = useMemo(() => (items ?? []).filter((i) => (!filter || `${i.text} ${i.postText ?? ''}`.toLowerCase().includes(filter.toLowerCase())) && (!unreviewed || !reviews[`${cacheKey}:${i.key}`])), [items, filter, unreviewed, reviews, cacheKey]);
  const years = useMemo(() => {
    const ys = new Set((items ?? []).map((i) => i.date?.slice(0, 4)).filter(Boolean) as string[]);
    const now = new Date().getFullYear();
    for (let y = now; y >= now - 15; y--) ys.add(String(y));
    return [...ys].sort().reverse();
  }, [items]);
  const toggle = (k: string) => setTicked((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]));
  const capped = ticked.slice(0, recipe.maxPerRun);
  const failed = job?.kind === findKind && job.status === 'failed';

  const request = async (resume=false) => {
    setTicked([]);setError('');
    const result = await call({type:'find',platform:platformId,list:kind,source,resume});
    if (!result.ok) setError(`Could not start: ${result.error}. Please retry.`);
  };
  const exportList = () => {
    const blob = new Blob([JSON.stringify({platform:platformId,source,...cached,coverage:recipe.sources.map(s=>({source:s.label,count:lists[`${platformId}:${kind}:${s.id}`]?.items.length ?? 0,complete:lists[`${platformId}:${kind}:${s.id}`]?.complete ?? false}))}, (key,value)=>key.startsWith('worker')?undefined:value,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`footprint-${platformId}-${source}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
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
          {sourceOptions.length > 1 && (
            <label className="flex min-w-0 flex-1 basis-60 flex-col gap-1 text-[13px] font-semibold text-ink-2">
              {C.untag.which}
              <select value={source} onChange={(e) => setSource(e.target.value)} className="h-11 rounded-xl border border-line bg-surface px-3 text-[14px] font-normal text-ink">
                {sourceOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Button onClick={()=>void request(false)} disabled={running}>
            <Search className="size-4" aria-hidden /> {running && job?.kind === findKind ? copy.finding : copy.find}
          </Button>
        </Card>
      )}

      <JobBar />
      {error && <p role="alert" className="text-critical">{error}</p>}
      {cached && <div className="coverage-strip flex flex-wrap items-center gap-3 rounded-2xl p-5" style={{background:cached.complete?'var(--mint-soft)':'var(--peach-soft)'}}>
        <div className="min-w-0 flex-1 basis-64"><p className="font-semibold text-ink">{cached.complete?'Reached the end of this list':'More posts may be waiting'}</p><p className="mt-1 text-[13px] text-ink-2">{cached.items.length} saved · {new Date(cached.at).toLocaleString()}. {cached.complete?(source==='all'?'Both supported lists reached their end. Facebook may still withhold content.':'Check the other tagged lists too.'):'Continue scanning without losing your discoveries. Facebook may withhold older activity.'}</p></div>
        {!cached.complete && <Button onClick={()=>void request(true)} disabled={running}>Continue scan</Button>}
        <Button variant="ghost" onClick={exportList}>Export inventory</Button>
      </div>}
      {source==='all' && cached && <ul className="flex flex-wrap gap-3 text-[13px] text-ink-2">{recipe.sources.map(s=><li key={s.id} className="rounded-xl border border-line bg-surface px-3 py-2">{s.label}: {lists[`${platformId}:${kind}:${s.id}`]?.items.length ?? 0} · {lists[`${platformId}:${kind}:${s.id}`]?.complete?'End reached':'Not finished'}</li>)}</ul>}
      {kind==='tags' && <p className="text-[13px] text-ink-2">“All tagged posts, photos & videos” scans both Facebook activity lists and combines their discoveries. Each list keeps its own progress. Reaching one list’s end does not prove that Facebook exposed all historical tags.</p>}
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
              <Button size="sm" variant="quiet" onClick={() => setTicked(shown.filter(i=>!reviews[`${cacheKey}:${i.key}`]).map((i) => i.key))}>
                {C.scan.selectAll}
              </Button>
              <Button size="sm" variant="quiet" onClick={() => setTicked([])}>
                Clear
              </Button>
              <label className="flex items-center gap-2"><input type="checkbox" checked={unreviewed} onChange={e=>setUnreviewed(e.target.checked)}/>Needs review only</label>
              <Button size="sm" variant="ghost" disabled={running || !items.some(i=>i.url && !i.previewChecked)} onClick={()=>void call({type:'previews',platform:platformId,list:kind,source})}>Load post previews</Button>
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
          <ul className="grid gap-4 p-4 sm:grid-cols-2">
            {shown.map(i=><li key={i.key}><PostCard item={i} selected={ticked.includes(i.key)} kept={!!reviews[`${cacheKey}:${i.key}`]} onSelect={()=>toggle(i.key)} onKeep={()=>{setTicked(t=>t.filter(k=>k!==i.key));void ext.storage.local.set({listReviews:{...reviews,[`${cacheKey}:${i.key}`]:!reviews[`${cacheKey}:${i.key}`]}});}}/></li>)}
          </ul>
          {items.length > 0 && !shown.length && <p className="p-5 text-ink-2">No posts match these filters.</p>}
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
                  void call({ type: 'act', platform: platformId, list: kind, source, keys: capped });
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
