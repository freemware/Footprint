import { postUrl } from '../engine/media';
import { BrowserTab, type RunOutcome } from './browserTab';
import { addHistory, get, latestReport, saveReport, set } from './store';
import { platform } from '../platforms/registry';
import type { CheckDef, ListRecipe, PlatformDef } from '../platforms/types';
import type { CheckResult, Job, JobKind, ListItem, ScanReport, SettingReading, Step } from '../shared/types';

/**
 * The work Footprint does on a platform: scans (read only), and changes the person approved
 * (fixes, untagging, moving posts to trash). One job runs at a time and its progress is kept in
 * storage, so every Footprint screen shows it live. Every change is checked afterwards.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let cancelFlag = false;
let running = false;

export const isRunning = () => running;
export const cancel = () => {
  cancelFlag = true;
};

interface Ctx {
  update: (patch: Partial<Job>) => Promise<void>;
  cancelled: () => boolean;
}

async function withJob<T>(kind: JobKind, platformId: string, total: number | undefined, work: (ctx: Ctx) => Promise<T>): Promise<T> {
  if (running) throw new Error('busy');
  running = true;
  cancelFlag = false;
  let job: Job = { id: `${Date.now()}`, kind, platform: platformId, status: 'running', progress: 0, message: '', startedAt: Date.now(), total };
  const update = async (patch: Partial<Job>) => {
    job = { ...job, ...patch };
    await set('job', job);
  };
  await update({});
  try {
    const out = await work({ update, cancelled: () => cancelFlag });
    if (job.status === 'running') await update({ status: cancelFlag ? 'cancelled' : 'done', progress: 1, endedAt: Date.now() });
    return out;
  } catch (e) {
    await update({ status: 'failed', endedAt: Date.now(), message: e instanceof Error ? e.message : String(e) });
    throw e;
  } finally {
    running = false;
  }
}

/** Platform tabs stay hidden for scans unless the person chose to watch. */
const openTab = async (_forceHidden = false) => BrowserTab.open(false);

const need = (id: string): PlatformDef => {
  const p = platform(id);
  if (!p || p.status !== 'available') throw new Error(`${id} isn't available yet`);
  return p;
};

const readingOf = (o: RunOutcome): SettingReading | undefined => {
  const last = o.results[o.results.length - 1];
  return last && last.ok ? last.value : undefined;
};

/** Read one setting. Reuses the open page when the previous check needed the same one. */
async function readCheck(tab: BrowserTab, check: CheckDef, samePage: boolean, cancelled: () => boolean): Promise<CheckResult & { stop?: 'signed_out' | 'security_check' | 'cancelled' }> {
  const steps: Step[] = [...(samePage ? [] : check.open), { op: 'read', ...check.read }];
  const out = await tab.run(steps, { cancelled, pace: 250 });
  if (out.ok) {
    const reading = readingOf(out)!;
    return { checkId: check.id, status: check.risky(reading.value) ? 'risk' : 'ok', reading };
  }
  const stop = out.reason === 'signed_out' || out.reason === 'security_check' || out.reason === 'cancelled' ? out.reason : undefined;
  return { checkId: check.id, status: 'unknown', problem: out.reason, outline: out.outline, failedStep: out.failedStep, stop };
}

export async function scan(platformId: string, trigger: ScanReport['trigger'] = 'manual'): Promise<ScanReport> {
  const p = need(platformId);
  return withJob('scan', platformId, p.checks.length, async (ctx) => {
    const tab = await openTab(trigger === 'autoscan');
    const report: ScanReport = { platform: platformId, at: Date.now(), trigger, results: [] };
    try {
      let prevOpen = '';
      for (const [i, check] of p.checks.entries()) {
        await ctx.update({ progress: i / p.checks.length, message: `Checking: ${check.title}` });
        const open = JSON.stringify(check.open);
        const r = await readCheck(tab, check, open === prevOpen && report.results[report.results.length - 1]?.status !== 'unknown', ctx.cancelled);
        prevOpen = open;
        if (r.stop === 'signed_out') {
          report.signedOut = true;
          break;
        }
        if (r.stop === 'security_check' || r.stop === 'cancelled') {
          report.stoppedBy = r.stop;
          break;
        }
        const { stop: _ignored, ...result } = r;
        report.results.push(result);
      }
    } finally {
      await tab.close();
    }
    await saveReport(report);
    await ctx.update({
      message: report.signedOut ? `Sign in to ${p.name} in this browser, then scan again.` : report.stoppedBy === 'security_check' ? `${p.name} asked for a security check. Finish it on ${p.name}, then scan again.` : 'Scan finished',
      error: report.signedOut ? 'signed_out' : report.stoppedBy === 'security_check' ? 'security_check' : undefined,
      ...(report.signedOut || report.stoppedBy === 'security_check' ? { status: 'failed' as const, endedAt: Date.now() } : {}),
    });
    return report;
  });
}

/** Make the approved changes, then read each setting again to confirm it took. */
export async function fix(platformId: string, checkIds: string[]): Promise<CheckResult[]> {
  const p = need(platformId);
  const checks = p.checks.filter((c) => checkIds.includes(c.id) && c.fix);
  return withJob('fix', platformId, checks.length, async (ctx) => {
    const tab = await openTab();
    const results: CheckResult[] = [];
    let done = 0;
    try {
      for (const [i, check] of checks.entries()) {
        if (ctx.cancelled()) break;
        await ctx.update({ progress: i / checks.length, message: `Changing: ${check.title}` });
        const change = await tab.run([...check.open, ...check.fix!.steps], { cancelled: ctx.cancelled, pace: 400 });
        if (!change.ok && (change.reason === 'signed_out' || change.reason === 'security_check')) {
          await ctx.update({ error: change.reason, status: 'failed', endedAt: Date.now(), message: change.reason === 'signed_out' ? `Sign in to ${p.name} in this browser, then try again.` : `${p.name} asked for a security check. Nothing else was changed.` });
          break;
        }
        // Check from a fresh page load: what the platform saved, not what the menu showed.
        const verify = await readCheck(tab, check, false, ctx.cancelled);
        const ok = verify.reading?.value === check.fix!.expect;
        if (ok) done++;
        results.push(verify);
        await addHistory({ at: Date.now(), platform: platformId, kind: 'fix', ok, summary: ok ? `${check.title}: changed to ${check.fix!.to}` : `${check.title}: couldn't change it` });
        await ctx.update({ done });
      }
    } finally {
      await tab.close();
    }
    // Keep the latest report in step with what was just checked.
    const latest = await latestReport(platformId);
    if (latest) {
      const now = Date.now();
      latest.results = latest.results.map((r) => {
        const fresh = results.find((x) => x.checkId === r.checkId);
        return fresh ? { ...fresh, checkedAt: now } : r;
      });
      const all = await get('reports');
      all[platformId] = [latest, ...(all[platformId] ?? []).slice(1)];
      await set('reports', all);
    }
    const job = await get('job');
    if (job?.status === 'running') await ctx.update({ message: `${done} of ${checks.length} changed and confirmed`, done });
    return results;
  });
}

type ListKind = 'tags' | 'posts';
const recipe = (p: PlatformDef, list: ListKind): ListRecipe => {
  const r = list === 'tags' ? p.tags : p.posts;
  if (!r) throw new Error(`${p.name} has no ${list} tool yet`);
  return r;
};
const sourceOf = (r: ListRecipe, id: string) => {
  const s = r.sources.find((x) => x.id === id);
  if (!s) throw new Error('Unknown list');
  return s;
};

export const listKey = (platformId: string, list: ListKind, source: string) => `${platformId}:${list}:${source}`;

async function saveList(key: string, value: import('../shared/types').SavedList) {
  const lists = await get('listResults');
  lists[key] = value;
  const [platformId,list,sourceId] = key.split(':');
  const sources = list === 'tags' ? platform(platformId!)?.tags?.sources : undefined;
  if(sourceId==='all' && sources) {
    const enriched = new Map(value.items.map(i=>[i.key,i]));
    for(const source of sources) {
      const entry=lists[`${platformId}:tags:${source.id}`];
      if(entry) entry.items=entry.items.map(i=>({...i,...enriched.get(i.key)}));
    }
  }
  if (sources && sources.length>1 && sourceId !== 'all') {
    const entries = sources.map(s=>lists[`${platformId}:tags:${s.id}`]);
    const union = new Map<string,ListItem>();
    for(const entry of entries) for(const item of entry?.items ?? []) union.set(item.key,{...union.get(item.key),...item});
    lists[`${platformId}:tags:all`] = {items:[...union.values()],at:Date.now(),complete:entries.every(e=>e?.complete),stopReason:entries.every(e=>e?.complete)?'end':'checkpoint'};
  }
  await set('listResults', lists);
}

async function collect(tab: BrowserTab, open: Step[], cancelled: () => boolean, limit = Infinity) {
  const opened = await tab.run(open, {cancelled,pace:300});
  const seen = new Map<string,ListItem>();
  if (!opened.ok) return {out:opened,items:[] as ListItem[],complete:false};
  let complete = false;
  let out = opened;
  for (let chunk=0; chunk<30 && !cancelled(); chunk++) {
    out = await tab.run([{op:'collect',maxScrolls:8,limit}],{cancelled});
    const result = out.results.at(-1);
    if (!out.ok || !result?.ok) break;
    for (const item of result.items ?? []) seen.set(item.key,item);
    complete = !!result.complete;
    if (complete || seen.size >= limit) break;
  }
  return {out,items:[...seen.values()],complete};
}

/** Read in chunks, save each chunk, and retain the worker at a pause for a true continuation. */
export async function findList(platformId: string, list: ListKind, sourceId: string, resume = false): Promise<ListItem[]> {
  const p = need(platformId);
  if(list==='tags' && sourceId==='all') {
    for(const source of p.tags!.sources) {
      if(resume && (await get('listResults'))[listKey(platformId,list,source.id)]?.complete) continue;
      await findList(platformId,list,source.id,resume);
      if(cancelFlag || (await get('job'))?.status==='failed') break;
    }
    return (await get('listResults'))[listKey(platformId,list,'all')]?.items ?? [];
  }
  const source = sourceOf(recipe(p, list), sourceId);
  const key = listKey(platformId,list,sourceId);
  return withJob(list === 'tags' ? 'find_tags' : 'find_posts', platformId, undefined, async ctx => {
    const cached = (await get('listResults'))[key];
    let tab = resume && cached?.workerTabId && cached.workerUrl ? await BrowserTab.resume(cached.workerTabId,cached.workerUrl) : null;
    const continuing = !!tab;
    // Close only our verified old worker when the person starts a fresh traversal.
    if (!resume && cached?.workerTabId && cached.workerUrl) await (await BrowserTab.resume(cached.workerTabId,cached.workerUrl))?.close();
    tab ??= await openTab();
    const found = new Map<string,ListItem>((continuing ? cached?.items ?? [] : []).map(i=>[i.key,i]));
    let keep = false;
    try {
      if (!continuing) {
        const opened = await tab.run(source.open,{cancelled:ctx.cancelled,pace:300});
        if (!opened.ok) throw new Error(opened.reason === 'signed_out' ? `Sign in to ${p.name}, then retry.` : `Could not open this list: ${opened.reason}. Saved results were kept.`);
      }
      let idle = 0;
      for (let chunk=0; chunk<20; chunk++) {
        if (ctx.cancelled()) break;
        const out = await tab.run([{op:'collect',maxScrolls:8}],{cancelled:ctx.cancelled});
        const result = out.results.at(-1);
        if (!out.ok || !result?.ok) {
          await ctx.update({error:out.reason, message:`Scanning paused: ${out.reason}. Saved discoveries are available.`,status:'failed',endedAt:Date.now()});
          return [...found.values()];
        }
        const before = found.size;
        for (const item of result.items ?? []) {
          const previous = found.get(item.key);
          found.set(item.key,{...previous,...item,thumbnail:item.thumbnail || previous?.thumbnail,postText:item.postText || previous?.postText});
        }
        idle = found.size > before ? 0 : idle+1;
        const items = [...found.values()];
        await saveList(key,{items,at:Date.now(),complete:!!result.complete,stopReason:result.complete?'end':'checkpoint',workerTabId:result.complete?undefined:tab.id,workerUrl:await tab.url()});
        await ctx.update({message:`${items.length} discovered · checking more ${source.label.toLowerCase()}…`});
        if (result.complete) {
          await ctx.update({items,message:`${items.length} discovered · reached the end of this Facebook list. Other tagged activity may be in another list.`});
          return items;
        }
        if (idle >= 4) break;
      }
      keep = true;
      await ctx.update({items:[...found.values()],message:`${found.size} saved · scan paused. Continue from this position to look for more.`});
      return [...found.values()];
    } finally { if (!keep) await tab.close(); }
  });
}

/** Load the actual post's visible text/poster in small, cancellable read-only batches. */
export async function loadPreviews(platformId:string,list:ListKind,sourceId:string) {
  const key = listKey(platformId,list,sourceId);
  return withJob('previews',platformId,undefined,async ctx=>{
    const cached = (await get('listResults'))[key];
    if (!cached) return;
    const items = [...cached.items];
    const pending = items.filter(i => i.url && !i.previewChecked && postUrl(i.url)).slice(0,12);
    const tab = await openTab();
    try {
      for (const [n,item] of pending.entries()) {
        if (ctx.cancelled()) break;
        await ctx.update({progress:n/pending.length,message:`Loading post preview ${n+1} of ${pending.length}`});
        const url = postUrl(item.url)!;
        // Do not follow off-platform redirects or login/security prompts.
        await tab.goto(url);
        if (!postUrl(await tab.url())) break;
        const result = await tab.step({op:'preview'});
        if (!result.ok) { await ctx.update({error:result.reason}); break; }
        const index = items.findIndex(i=>i.key===item.key);
        items[index] = {...item,...result.preview, thumbnail:result.preview?.thumbnail || item.thumbnail};
        await saveList(key,{...cached,items,at:Date.now()});
      }
      await ctx.update({message:'Post previews saved. Load more previews to continue.',items});
    } finally {await tab.close();}
  });
}

/** Remove tags from, or move to trash, exactly the rows the person ticked. Then count what's gone. */
export async function actOnList(platformId: string, list: ListKind, sourceId: string, keys: string[]): Promise<{ done: number; total: number }> {
  const p = need(platformId);
  const r = recipe(p, list);
  if(list==='tags' && sourceId==='all') {
    const cache = await get('listResults');
    const remaining = new Set(keys.slice(0,r.maxPerRun));
    let done=0;
    for(const source of r.sources) {
      const batch=(cache[listKey(platformId,list,source.id)]?.items ?? []).filter(i=>remaining.has(i.key)).map(i=>i.key);
      if(!batch.length) continue;
      const result=await actOnList(platformId,list,source.id,batch);
      done+=result.done; for(const key of batch) remaining.delete(key);
      if(cancelFlag || (await get('job'))?.status==='failed') break;
    }
    return {done,total:keys.length};
  }
  const source = sourceOf(r, sourceId);
  const archive = r.mode === 'archive';
  const chosen = keys.slice(0, r.maxPerRun);
  const kind = list === 'tags' ? 'untag' : 'trash_posts';
  return withJob(kind, platformId, chosen.length, async (ctx) => {
    const tab = await openTab();
    let stopped: string | undefined;
    try {
      for (let i = 0; i < chosen.length; i += r.batch) {
        if (ctx.cancelled()) break;
        const batch = chosen.slice(i, i + r.batch);
        await ctx.update({ progress: i / chosen.length, message: `${list === 'tags' ? 'Removing tags' : archive ? 'Archiving' : 'Moving to trash'}: ${i + 1}–${i + batch.length} of ${chosen.length}` });
        const steps: Step[] = [...source.open, { op: 'select', keys: batch }, { op: 'click', loc: r.action }, ...(r.confirm ? [{ op: 'click' as const, optional: true, loc: r.confirm }] : []), { op: 'sleep', ms: 2500 }];
        const out = await tab.run(steps, { cancelled: ctx.cancelled, pace: 300 });
        if (!out.ok) {
          stopped = out.reason;
          await ctx.update({ error: out.reason, outline: out.outline });
          break;
        }
        await sleep(3000);
      }
      // Count from a fresh list: rows that are gone were really changed.
      await ctx.update({ message: 'Checking what changed…', progress: 0.95 });
      const { items, out: verification } = await collect(tab, source.open, () => false);
      if (!verification.ok) throw new Error('Could not verify the refreshed list; no changes are confirmed');
      const left = new Set(items.map((x) => x.key));
      const done = chosen.filter((k) => !left.has(k)).length;
      await addHistory({ at: Date.now(), platform: platformId, kind, ok: done > 0 && !stopped, summary: list === 'tags' ? `Removed your tag from ${done} of ${chosen.length} ${source.label.toLowerCase()}` : archive ? `Archived ${done} of ${chosen.length} posts (restorable from Instagram)` : `Moved ${done} of ${chosen.length} posts to trash (recoverable for 30 days)` });
      const why = stopped === 'security_check' ? `${p.name} asked for a security check, so Footprint stopped.` : stopped === 'signed_out' ? `You're signed out of ${p.name}.` : stopped === 'cancelled' ? 'Stopped.' : stopped ? 'Footprint stopped when the page didn’t look as expected.' : '';
      const what = list === 'tags' ? `Removed your tag from ${done} of ${chosen.length}` : archive ? `Archived ${done} of ${chosen.length}` : `Moved ${done} of ${chosen.length} to trash`;
      await ctx.update({ done, items, message: `${what}${why ? `. ${why}` : ''}`, ...(stopped && stopped !== 'cancelled' ? { status: 'failed' as const, endedAt: Date.now() } : {}) });
      return { done, total: chosen.length };
    } finally {
      await tab.close();
    }
  });
}
