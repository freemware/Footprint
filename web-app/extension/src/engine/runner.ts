import type { Step, StepResult } from '../shared/types';
import { find, findOption, isChecked, listItems, looksLikeSecurityCheck, looksSignedOut, press, readSetting, settingControl } from './dom';

/**
 * Runs one recipe step inside a platform's page. Steps are run one at a time by the
 * background controller, so a page that reloads between steps is fine.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Keep trying until `fn` returns something, the page shows a problem, or time runs out. */
type Fail = Extract<StepResult, { ok: false }>;

async function until<T>(doc: Document, fn: () => T | null | undefined, timeout: number): Promise<T | Fail> {
  const end = Date.now() + timeout;
  for (;;) {
    if (looksSignedOut(doc)) return { ok: false, reason: 'signed_out' };
    if (looksLikeSecurityCheck(doc)) return { ok: false, reason: 'security_check' };
    const v = fn();
    if (v) return v;
    if (Date.now() >= end) return { ok: false, reason: 'not_found' };
    await sleep(200);
  }
}

const isFail = (v: unknown): v is Fail => typeof v === 'object' && v !== null && (v as StepResult).ok === false;

export interface RunOptions {
  /** Default wait for something to appear. */
  timeout?: number;
  /** Pause after a click so menus can open. */
  settle?: number;
}

export async function runStep(doc: Document, step: Step, opts: RunOptions = {}): Promise<StepResult> {
  const timeout = ('timeout' in step && step.timeout) || opts.timeout || 8000;
  const settle = opts.settle ?? 500;
  try {
    switch (step.op) {
      case 'goto':
        return { ok: false, reason: 'error', detail: 'goto runs in the background' };
      case 'sleep':
        await sleep(step.ms);
        return { ok: true };
      case 'wait': {
        const el = await until(doc, () => find(doc, step.loc), timeout);
        return isFail(el) ? el : { ok: true };
      }
      case 'click': {
        const el = await until(doc, () => find(doc, step.loc), step.optional ? Math.min(timeout, 1500) : timeout);
        if (isFail(el)) return step.optional && el.reason === 'not_found' ? { ok: true } : el;
        press(el);
        await sleep(settle);
        return { ok: true };
      }
      case 'read': {
        const r = await until(doc, () => readSetting(doc, step.question, step.vocab), timeout);
        return isFail(r) ? (r.reason === 'not_found' ? { ok: false, reason: 'unreadable' } : r) : { ok: true, value: r };
      }
      case 'openSetting': {
        const el = await until(doc, () => settingControl(doc, step.question), timeout);
        if (isFail(el)) return el;
        press(el);
        await sleep(settle);
        return { ok: true };
      }
      case 'choose': {
        const el = await until(doc, () => findOption(doc, step.option), step.optional ? Math.min(timeout, 1500) : timeout);
        if (isFail(el)) return step.optional && el.reason === 'not_found' ? { ok: true } : el;
        press(el);
        await sleep(settle);
        return { ok: true };
      }
      case 'collect': {
        const first = await until(doc, () => (listItems(doc).length ? true : null), timeout);
        if (isFail(first)) return first.reason === 'not_found' ? { ok: true, items: [] } : first;
        let still = 0;
        let count = listItems(doc).length;
        for (let i = 0; i < (step.maxScrolls ?? 20) && still < 2 && count < (step.limit ?? 500); i++) {
          doc.defaultView?.scrollTo(0, doc.body.scrollHeight);
          await sleep(1200);
          if (looksLikeSecurityCheck(doc)) return { ok: false, reason: 'security_check' };
          const now = listItems(doc).length;
          still = now > count ? 0 : still + 1;
          count = now;
        }
        return { ok: true, items: listItems(doc).slice(0, step.limit ?? 500).map((x) => x.item) };
      }
      case 'select': {
        const want = new Set(step.keys);
        let selected = 0;
        for (const { item, box } of listItems(doc)) {
          if (!want.has(item.key)) continue;
          want.delete(item.key);
          if (!isChecked(box)) press(box);
          selected++;
          await sleep(120);
        }
        return { ok: true, selected, missing: [...want] };
      }
    }
  } catch (e) {
    return { ok: false, reason: 'error', detail: e instanceof Error ? e.message : String(e) };
  }
}
