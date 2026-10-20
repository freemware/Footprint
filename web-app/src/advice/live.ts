import type { LiveReading, LiveReport } from '../extension/useExtension';
import { byPriority, type Plan } from './plan';
import type { FixStatus, PlannedFix, Vars } from './types';

/**
 * One plan from two sources.
 *
 *   The data download says what Facebook collected, and what many settings were on the day it
 *   was made. The browser extension reads some of those settings live, on Facebook's own pages.
 *
 * For each fix the extension can read, the newer of the two wins: the card's status and the
 * values in its wording come from that source, and the card says which one it was. A fix the
 * download can't settle ("We can't tell") is settled by a live reading when there is one.
 * Pure: the same plan, scan and download date always give the same result.
 */

const AUDIENCES = ['public', 'friends_of_friends', 'friends', 'only_me', 'custom'];
const audienceOf = (r?: LiveReading) => (r && r.status !== 'unknown' && typeof r.value === 'string' && AUDIENCES.includes(r.value) ? r.value : undefined);
const boolOf = (r?: LiveReading) => (r && r.status !== 'unknown' && typeof r.value === 'boolean' ? r.value : undefined);
const wide = (a?: string) => a === 'public' || a === 'friends_of_friends';
/** The more open of two audiences, for one card that covers both (look-up by phone and email). */
const wider = (a?: string, b?: string) => {
  const rank = (x?: string) => (x === undefined ? -1 : x === 'public' ? 4 : x === 'friends_of_friends' ? 3 : x === 'friends' ? 2 : x === 'custom' ? 1 : 0);
  return rank(a) >= rank(b) ? a : b;
};

type Readings = Record<string, LiveReading | undefined>;
/** What a live scan says about one fix: its status and the values its wording needs. Null: nothing usable. */
type Merge = (r: Readings, vars: Vars) => { status: FixStatus; vars: Vars } | null;

/**
 * Per fix: which checks settle it, and how. Where the extension reads only part of what a fix
 * covers (look-up by name isn't read live), the rest still comes from the download.
 */
export const LIVE_MERGE: Record<string, { checks: string[]; merge: Merge }> = {
  two_factor: {
    checks: ['two_factor'],
    merge: (r, vars) => {
      const on = boolOf(r.two_factor);
      return on === undefined ? null : { status: on ? 'done' : 'needs_action', vars: { ...vars, state: r.two_factor!.raw } };
    },
  },
  login_alerts: {
    checks: ['login_alerts'],
    merge: (r, vars) => {
      const on = boolOf(r.login_alerts);
      return on === undefined ? null : { status: on ? 'done' : 'needs_action', vars };
    },
  },
  future_posts: {
    checks: ['future_posts'],
    merge: (r, vars) => {
      const a = audienceOf(r.future_posts);
      return a === undefined ? null : { status: wide(a) ? 'needs_action' : 'done', vars: { ...vars, audience: a } };
    },
  },
  lookup: {
    checks: ['lookup_phone', 'lookup_email'],
    merge: (r, vars) => {
      const emailPhone = wider(audienceOf(r.lookup_phone), audienceOf(r.lookup_email));
      if (emailPhone === undefined) return null;
      // Look-up by name and profile suggestions aren't read live; keep what the download said.
      const open = wide(emailPhone) || vars.byName === 'public' || vars.suggest === true;
      return { status: open ? 'needs_action' : 'done', vars: { ...vars, emailPhone } };
    },
  },
  friends_list: {
    checks: ['friends_list', 'friend_requests'],
    merge: (r, vars) => {
      const list = audienceOf(r.friends_list);
      const requests = audienceOf(r.friend_requests);
      if (list === undefined && requests === undefined) return null;
      const next = { ...vars, ...(list !== undefined ? { list } : {}), ...(requests !== undefined ? { requests } : {}) };
      const open = wide(next.list as string | undefined) || next.requests === 'public';
      return { status: open ? 'needs_action' : 'done', vars: next };
    },
  },
  other_businesses: {
    checks: ['other_businesses', 'ad_partners'],
    merge: (r, vars) => {
      // "Disconnect future activity" on means it's no longer linked to the account.
      const disconnected = boolOf(r.other_businesses);
      // "Use activity from ad partners" on means it's still used for ads.
      const partners = boolOf(r.ad_partners);
      if (disconnected === undefined && partners === undefined) return null;
      const next = { ...vars, ...(disconnected !== undefined ? { linked: !disconnected } : {}), ...(partners !== undefined ? { adsUseOff: !partners } : {}) };
      if (disconnected !== undefined) return { status: disconnected ? 'done' : 'needs_action', vars: next };
      // Only the ad-partners setting could be read: it can show a problem, but not settle the whole fix.
      return partners ? { status: 'needs_action', vars: next } : null;
    },
  },
};

export type FixSource =
  /** Read live by the extension on this date. */
  | { kind: 'live'; at: number; readings: LiveReading[] }
  /** From the data download (dated when the download's date is known). */
  | { kind: 'download'; at?: number }
  /** Neither source could say; the person has to look. */
  | { kind: 'none' };

export interface SourcedFix extends PlannedFix {
  source: FixSource;
  /** True when the extension can read this setting, so "Check live" is offered. */
  liveCheckable: boolean;
}

export interface SourcedPlan extends Omit<Plan, 'todo' | 'review' | 'done' | 'all'> {
  todo: SourcedFix[];
  review: SourcedFix[];
  done: SourcedFix[];
  all: SourcedFix[];
  /** The scan used, when one was. */
  live?: LiveReport;
  /** Fixes whose status came from the scan. */
  liveCount: number;
}

/** When the download was made: from Facebook's file name ("…-2026-10-14-…"), else the newest record. */
export function downloadDate(name?: string, newestRecord?: number): number | undefined {
  const m = name?.match(/(20\d{2})-(\d{2})-(\d{2})/);
  if (m) {
    const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
    if (!Number.isNaN(t)) return t;
  }
  return newestRecord;
}

/** Statuses the download can't settle are "none"; anything the download showed is "download". */
const downloadSource = (status: FixStatus, at?: number): FixSource => (status === 'review' ? { kind: 'none' } : { kind: 'download', at });

export function applyLive(plan: Plan, report: LiveReport | null | undefined, downloadAt?: number): SourcedPlan {
  // A scan that couldn't see the account (signed out) settles nothing.
  const usable = report && !report.signedOut ? report : undefined;
  const byCheck: Readings = {};
  for (const r of usable?.results ?? []) byCheck[r.checkId] = r;

  let liveCount = 0;
  const all: SourcedFix[] = plan.all.map((p) => {
    const rule = LIVE_MERGE[p.fix.id];
    const base: SourcedFix = { ...p, source: downloadSource(p.status, downloadAt), liveCheckable: !!rule };
    if (!rule || !usable) return base;
    const readings = rule.checks.map((c) => byCheck[c]).filter((r): r is LiveReading => !!r && r.status !== 'unknown');
    if (!readings.length) return base;
    const at = Math.max(...readings.map((r) => r.at));
    // The download is newer than the scan, and it could settle this fix: keep the download.
    if (downloadAt !== undefined && downloadAt > at && p.status !== 'review') return base;
    let merged: ReturnType<Merge>;
    try {
      merged = rule.merge(byCheck, p.evidence.vars);
    } catch {
      merged = null;
    }
    if (!merged) return base;
    liveCount++;
    return { ...p, status: merged.status, evidence: { ...p.evidence, vars: merged.vars }, source: { kind: 'live', at, readings }, liveCheckable: true };
  });

  const pick = (s: FixStatus) => all.filter((p) => p.status === s).sort(byPriority);
  return { todo: pick('needs_action'), review: pick('review'), done: pick('done'), all, live: usable, liveCount };
}
