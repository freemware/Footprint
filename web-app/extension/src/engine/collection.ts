import { findAll, isVisible, listItems, looksLikeSecurityCheck, looksSignedOut } from './dom';
import type { ListItem, StepResult } from '../shared/types';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Exact visible platform notices only. A post quoting "nothing to show" is not an end marker. */
export function atListEnd(doc: Document): boolean {
  return [...doc.querySelectorAll('span, p, h2, h3, [role="status"]')].some(e =>
    !e.closest('[role="article"], article, [role="listitem"], [role="row"], li') && isVisible(e) &&
    /^(no (more )?(activity|posts|results)( to show| found)?|nothing (else )?to show|you('?ve| have) reached the end|end of (your )?(activity|results)|you('?re| are) all caught up)[.!]?$/i.test(e.textContent?.trim() ?? '')
  );
}

export function scrollList(doc: Document) {
  const scrollers = new Set<Element>();
  if (doc.scrollingElement) scrollers.add(doc.scrollingElement);
  // Only scroll ancestors of activity rows, not unrelated chat/sidebar panels.
  for (const {box} of listItems(doc)) for (let e = box.parentElement; e; e = e.parentElement) {
    if (e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(doc.defaultView?.getComputedStyle(e).overflowY ?? '')) scrollers.add(e);
  }
  for (const e of scrollers) {
    const before = e.scrollTop;
    e.scrollTop = Math.min(e.scrollHeight, before + Math.max(400, e.clientHeight * .85));
    // Platforms listening for scroll events can react even when already at the bottom.
    e.dispatchEvent(new (doc.defaultView!.Event)('scroll', {bubbles:true}));
  }
}

/** A bounded chunk returns discoveries to the background for durable checkpoints and cancellation. */
export async function collectChunk(doc: Document, passes = 8, limit = Infinity, delay = 900): Promise<StepResult> {
  const seen = new Map<string, ListItem>();
  for (let pass = 0; pass < passes; pass++) {
    if (looksSignedOut(doc)) return {ok:false,reason:'signed_out'};
    if (looksLikeSecurityCheck(doc)) return {ok:false,reason:'security_check'};
    for (const {item} of listItems(doc)) seen.set(item.key, {...seen.get(item.key), ...item});
    const loading = findAll(doc, {role:'progressbar'}).length > 0 || !!doc.querySelector('[aria-busy="true"]');
    if (atListEnd(doc) && !loading) return {ok:true,items:[...seen.values()],complete:true,stopReason:'end'};
    if (seen.size >= limit) return {ok:true,items:[...seen.values()].slice(0,limit),complete:false,stopReason:'limit'};
    // Explicit pagination controls are preferred to guessing from a steady row count.
    const more = findAll(doc,{role:['button','link'],name:['^see more activity$','^load more$','^show more results$','^next page$']}).find(e => e.getAttribute('aria-disabled') !== 'true' && !e.hasAttribute('disabled') && !e.closest('[role="article"], article, [role="listitem"]'));
    if (more) (more as HTMLElement).click(); else scrollList(doc);
    await wait(delay);
  }
  for (const {item} of listItems(doc)) seen.set(item.key, {...seen.get(item.key), ...item});
  return {ok:true,items:[...seen.values()],complete:false,stopReason:'checkpoint'};
}
