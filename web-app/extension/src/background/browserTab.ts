import { ext } from '../shared/ext';
import type { FailReason, PageOutline, Step, StepResult } from '../shared/types';

/**
 * Drives one platform tab: opens pages, makes sure the page helper is loaded, and runs recipe
 * steps one at a time. Each step is retried once if the page navigated underneath it.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RunContext {
  cancelled: () => boolean;
  /** Pause between steps, so the platform isn't rushed. */
  pace?: number;
}

export interface RunOutcome {
  ok: boolean;
  results: StepResult[];
  reason?: FailReason;
  failedStep?: number;
  outline?: PageOutline;
}

export class BrowserTab {
  private constructor(readonly id: number) {}

  /** Open a tab for the work. `watch` shows it so the person can follow along. */
  static async open(watch: boolean): Promise<BrowserTab> {
    const tab = await ext.tabs.create({ url: 'about:blank', active: watch });
    if (tab.id === undefined) throw new Error('Could not open a tab');
    return new BrowserTab(tab.id);
  }

  async close() {
    await ext.tabs.remove(this.id).catch(() => undefined);
  }

  async goto(url: string) {
    await ext.tabs.update(this.id, { url });
    await this.loaded();
  }

  /** Wait until the page has loaded, then a moment more for the platform to draw it. */
  async loaded(timeout = 25000) {
    const end = Date.now() + timeout;
    await sleep(300);
    for (;;) {
      const t = await ext.tabs.get(this.id).catch(() => null);
      if (!t) throw new Error('The tab was closed');
      if (t.status === 'complete' || Date.now() > end) break;
      await sleep(250);
    }
    await sleep(900);
  }

  private async send<T>(msg: unknown): Promise<T> {
    return (await ext.tabs.sendMessage(this.id, msg)) as T;
  }

  async inject() {
    const alive = await this.send<string>({ type: 'fp:ping' }).catch(() => null);
    if (alive === 'pong') return;
    await ext.scripting.executeScript({ target: { tabId: this.id }, files: ['content.js'] });
  }

  async outline(): Promise<PageOutline | undefined> {
    return this.send<PageOutline>({ type: 'fp:outline' }).catch(() => undefined);
  }

  /** After a click: if it started loading a new page, wait for that page. */
  private async settle() {
    await sleep(600);
    const t = await ext.tabs.get(this.id).catch(() => null);
    if (t?.status === 'loading') await this.loaded();
  }

  async step(step: Step): Promise<StepResult> {
    if (step.op === 'goto') {
      await this.goto(step.url);
      return { ok: true };
    }
    const action = step.op === 'click' || step.op === 'openSetting' || step.op === 'choose';
    for (let attempt = 0; attempt < 2; attempt++) {
      let sent = false;
      try {
        await this.inject();
        sent = true;
        const r = await this.send<StepResult | undefined>({ type: 'fp:step', step });
        if (r) {
          if (action && r.ok) await this.settle();
          return r;
        }
      } catch {
        // The page went away while the step ran. For a click that means it worked and a new
        // page is loading: never repeat a click. Anything else is retried on the new page.
        if (sent && action) {
          await this.loaded();
          return { ok: true };
        }
      }
      await this.loaded();
    }
    return { ok: false, reason: 'error', detail: 'The page stopped responding' };
  }

  async run(steps: Step[], ctx: RunContext): Promise<RunOutcome> {
    const results: StepResult[] = [];
    for (let i = 0; i < steps.length; i++) {
      if (ctx.cancelled()) return { ok: false, results, reason: 'cancelled', failedStep: i };
      const r = await this.step(steps[i]!);
      results.push(r);
      if (!r.ok) return { ok: false, results, reason: r.reason, failedStep: i, outline: r.reason === 'not_found' || r.reason === 'unreadable' ? await this.outline() : undefined };
      if (ctx.pace) await sleep(ctx.pace);
    }
    return { ok: true, results };
  }
}
