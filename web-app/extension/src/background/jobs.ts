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
const openTab = async (forceHidden = false) => BrowserTab.open(forceHidden ? false : (await get('prefs')).watch);

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

async function collect(tab: BrowserTab, open: Step[], cancelled: () => boolean, limit = 500) {
  const out = await tab.run([...open, { op: 'collect', limit }], { cancelled, pace: 300 });
  const last = out.results[out.results.length - 1];
  return { out, items: out.ok && last?.ok ? (last.items ?? []) : [] };
}

/** List the rows (tagged posts, your posts) so the person can choose what to change. Read only. */
export async function findList(platformId: string, list: ListKind, sourceId: string): Promise<ListItem[]> {
  const p = need(platformId);
  const source = sourceOf(recipe(p, list), sourceId);
  return withJob(list === 'tags' ? 'find_tags' : 'find_posts', platformId, undefined, async (ctx) => {
    await ctx.update({ message: `Looking through ${source.label.toLowerCase()}…` });
    const tab = await openTab();
    try {
      const { out, items } = await collect(tab, source.open, ctx.cancelled);
      if (!out.ok && out.reason !== 'cancelled') {
        await ctx.update({ status: 'failed', error: out.reason, outline: out.outline, endedAt: Date.now(), message: out.reason === 'signed_out' ? `Sign in to ${p.name} in this browser, then try again.` : `Couldn't open ${source.label.toLowerCase()} on ${p.name}.` });
        return [];
      }
      await ctx.update({ items, message: `Found ${items.length}` });
      return items;
    } finally {
      await tab.close();
    }
  });
}

/** Remove tags from, or move to trash, exactly the rows the person ticked. Then count what's gone. */
export async function actOnList(platformId: string, list: ListKind, sourceId: string, keys: string[]): Promise<{ done: number; total: number }> {
  const p = need(platformId);
  const r = recipe(p, list);
  const source = sourceOf(r, sourceId);
  const chosen = keys.slice(0, r.maxPerRun);
  const kind = list === 'tags' ? 'untag' : 'trash_posts';
  return withJob(kind, platformId, chosen.length, async (ctx) => {
    const tab = await openTab();
    let stopped: string | undefined;
    try {
      for (let i = 0; i < chosen.length; i += r.batch) {
        if (ctx.cancelled()) break;
        const batch = chosen.slice(i, i + r.batch);
        await ctx.update({ progress: i / chosen.length, message: `${list === 'tags' ? 'Removing tags' : 'Moving to trash'}: ${i + 1}–${i + batch.length} of ${chosen.length}` });
        const steps: Step[] = [...source.open, { op: 'collect', limit: 500 }, { op: 'select', keys: batch }, { op: 'click', loc: r.action }, ...(r.confirm ? [{ op: 'click' as const, optional: true, loc: r.confirm }] : []), { op: 'sleep', ms: 2500 }];
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
      const { items } = await collect(tab, source.open, () => false);
      const left = new Set(items.map((x) => x.key));
      const done = chosen.filter((k) => !left.has(k)).length;
      await addHistory({ at: Date.now(), platform: platformId, kind, ok: done > 0 && !stopped, summary: list === 'tags' ? `Removed your tag from ${done} of ${chosen.length} ${source.label.toLowerCase()}` : `Moved ${done} of ${chosen.length} posts to trash (recoverable for 30 days)` });
      const why = stopped === 'security_check' ? `${p.name} asked for a security check, so Footprint stopped.` : stopped === 'signed_out' ? `You're signed out of ${p.name}.` : stopped === 'cancelled' ? 'Stopped.' : stopped ? 'Footprint stopped when the page didn’t look as expected.' : '';
      const what = list === 'tags' ? `Removed your tag from ${done} of ${chosen.length}` : `Moved ${done} of ${chosen.length} to trash`;
      await ctx.update({ done, items, message: `${what}${why ? `. ${why}` : ''}`, ...(stopped && stopped !== 'cancelled' ? { status: 'failed' as const, endedAt: Date.now() } : {}) });
      return { done, total: chosen.length };
    } finally {
      await tab.close();
    }
  });
}
