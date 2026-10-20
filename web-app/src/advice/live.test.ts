import { describe, expect, it } from 'vitest';
import { FACEBOOK_FIXES } from './facebook';
import { applyLive, downloadDate } from './live';
import { byPriority, type Plan } from './plan';
import type { FixStatus, PlannedFix, Vars } from './types';
import type { LiveReport } from '../extension/useExtension';

const fix = (id: string) => FACEBOOK_FIXES.find((f) => f.id === id)!;
const item = (id: string, status: FixStatus, vars: Vars = {}): PlannedFix => ({ fix: fix(id), status, evidence: { vars } });
const plan = (...items: PlannedFix[]): Plan => {
  const by = (s: FixStatus) => items.filter((p) => p.status === s).sort(byPriority);
  return { todo: by('needs_action'), review: by('review'), done: by('done'), all: items };
};

const OCT_14 = Date.UTC(2026, 9, 14, 12);
const OCT_20 = Date.UTC(2026, 9, 20, 12);
const scan = (results: LiveReport['results'], extra: Partial<LiveReport> = {}): LiveReport => ({ platform: 'facebook', at: OCT_20, results, ...extra });

describe('downloadDate', () => {
  it('reads the date from Facebook’s file name', () => {
    expect(downloadDate('facebook-someone-2026-10-14-abc123.zip')).toBe(OCT_14);
  });
  it('falls back to the newest record, or nothing', () => {
    expect(downloadDate('export.zip', 123)).toBe(123);
    expect(downloadDate(undefined, undefined)).toBeUndefined();
  });
});

describe('applyLive', () => {
  it('keeps the download plan unchanged without a scan, and labels each source', () => {
    const p = applyLive(plan(item('two_factor', 'needs_action'), item('sessions', 'review')), null, OCT_14);
    expect(p.todo.map((x) => x.fix.id)).toEqual(['two_factor']);
    expect(p.todo[0]!.source).toEqual({ kind: 'download', at: OCT_14 });
    expect(p.review[0]!.source).toEqual({ kind: 'none' });
    expect(p.todo[0]!.liveCheckable).toBe(true);
    expect(p.review[0]!.liveCheckable).toBe(false);
    expect(p.liveCount).toBe(0);
  });

  it('a newer live reading wins and moves the card to the right section', () => {
    const p = applyLive(
      plan(item('two_factor', 'needs_action')),
      scan([{ checkId: 'two_factor', status: 'ok', value: true, raw: 'On', at: OCT_20 }]),
      OCT_14,
    );
    expect(p.todo).toHaveLength(0);
    expect(p.done[0]!.fix.id).toBe('two_factor');
    expect(p.done[0]!.source).toMatchObject({ kind: 'live', at: OCT_20 });
    expect(p.done[0]!.evidence.vars.state).toBe('On');
    expect(p.liveCount).toBe(1);
  });

  it('settles what the download couldn’t tell', () => {
    const p = applyLive(plan(item('login_alerts', 'review')), scan([{ checkId: 'login_alerts', status: 'risk', value: false, at: OCT_20 }]), OCT_14);
    expect(p.todo[0]!.fix.id).toBe('login_alerts');
    expect(p.todo[0]!.source.kind).toBe('live');
  });

  it('keeps a newer download over an older scan', () => {
    const old = Date.UTC(2026, 8, 1);
    const p = applyLive(plan(item('future_posts', 'done', { audience: 'friends' })), scan([{ checkId: 'future_posts', status: 'risk', value: 'public', at: old }], { at: old }), OCT_14);
    expect(p.done[0]!.source.kind).toBe('download');
    expect(p.done[0]!.evidence.vars.audience).toBe('friends');
  });

  it('updates the wording values, so the card never contradicts its status', () => {
    const p = applyLive(plan(item('future_posts', 'done', { audience: 'friends', posts: 12 })), scan([{ checkId: 'future_posts', status: 'risk', value: 'public', raw: 'Public', at: OCT_20 }]), OCT_14);
    expect(p.todo[0]!.evidence.vars).toEqual({ audience: 'public', posts: 12 });
  });

  it('uses the more open of phone and email look-up, and keeps look-up by name from the download', () => {
    const readings: LiveReport['results'] = [
      { checkId: 'lookup_phone', status: 'ok', value: 'only_me', at: OCT_20 },
      { checkId: 'lookup_email', status: 'ok', value: 'friends', at: OCT_20 },
    ];
    const closed = applyLive(plan(item('lookup', 'needs_action', { emailPhone: 'public', byName: 'friends', suggest: false })), scan(readings), OCT_14);
    expect(closed.done[0]!.evidence.vars.emailPhone).toBe('friends');
    // Look-up by name isn't read live, so a public name look-up in the download keeps it open.
    const byName = applyLive(plan(item('lookup', 'needs_action', { emailPhone: 'public', byName: 'public', suggest: false })), scan(readings), OCT_14);
    expect(byName.todo[0]!.fix.id).toBe('lookup');
  });

  it('ignores unreadable checks and signed-out scans', () => {
    const unknown = applyLive(plan(item('two_factor', 'review')), scan([{ checkId: 'two_factor', status: 'unknown', at: OCT_20 }]), OCT_14);
    expect(unknown.review[0]!.source.kind).toBe('none');
    const signedOut = applyLive(plan(item('two_factor', 'review')), scan([{ checkId: 'two_factor', status: 'ok', value: true, at: OCT_20 }], { signedOut: true }), OCT_14);
    expect(signedOut.review[0]!.source.kind).toBe('none');
    expect(signedOut.live).toBeUndefined();
  });

  it('activity from other businesses: disconnecting settles it; ad partners alone can only flag it', () => {
    const disc = applyLive(plan(item('other_businesses', 'needs_action', { apps: 3, linked: true })), scan([{ checkId: 'other_businesses', status: 'ok', value: true, at: OCT_20 }]), OCT_14);
    expect(disc.done[0]!.evidence.vars.linked).toBe(false);
    const partnersOk = applyLive(plan(item('other_businesses', 'review', { apps: 3 })), scan([{ checkId: 'ad_partners', status: 'ok', value: false, at: OCT_20 }]), OCT_14);
    expect(partnersOk.review[0]!.source.kind).toBe('none');
    const partnersOn = applyLive(plan(item('other_businesses', 'review', { apps: 3 })), scan([{ checkId: 'ad_partners', status: 'risk', value: true, at: OCT_20 }]), OCT_14);
    expect(partnersOn.todo[0]!.evidence.vars.adsUseOff).toBe(false);
  });

  it('keeps the plan’s priority order after cards move', () => {
    const p = applyLive(
      plan(item('friends_list', 'needs_action', { list: 'public' }), item('two_factor', 'review')),
      scan([{ checkId: 'two_factor', status: 'risk', value: false, at: OCT_20 }]),
      OCT_14,
    );
    expect(p.todo.map((x) => x.fix.id)).toEqual(['two_factor', 'friends_list']);
  });
});
