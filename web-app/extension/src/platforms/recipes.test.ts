import { describe, expect, it } from 'vitest';
import { PLATFORMS } from './registry';
import { FACEBOOK } from './facebook';
import { newRisks } from '../background/autoscan';
import type { ScanReport } from '../shared/types';

describe('platform recipes', () => {
  it('lists every requested platform, Facebook first and available', () => {
    expect(PLATFORMS.map((p) => p.id)).toEqual(['facebook', 'instagram', 'linkedin', 'x', 'tiktok', 'snapchat', 'venmo']);
    expect(PLATFORMS.filter((p) => p.status === 'available').map((p) => p.id)).toEqual(['facebook']);
    for (const p of PLATFORMS.filter((x) => x.status === 'coming')) expect(p.planned?.length).toBeGreaterThan(0);
  });

  it('every Facebook check opens a page, reads a value and explains itself', () => {
    const ids = new Set<string>();
    for (const c of FACEBOOK.checks) {
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
      expect(c.open[0]?.op).toBe('goto');
      expect(c.why.length, c.id).toBeGreaterThan(10);
      expect(c.limits.length, c.id).toBeGreaterThan(10);
      expect(c.manual.length, c.id).toBeGreaterThan(0);
      expect(c.url).toMatch(/^https:\/\/(www\.facebook\.com|accountscenter\.facebook\.com)/);
    }
  });

  it('every fix lands on a value the scan counts as safe', () => {
    for (const c of FACEBOOK.checks.filter((x) => x.fix)) expect(c.risky(c.fix!.expect), c.id).toBe(false);
  });

  it('never uses permanent delete for posts', () => {
    const names = JSON.stringify([FACEBOOK.posts?.action, FACEBOOK.posts?.confirm]);
    expect(names).toMatch(/trash/);
    expect(names).not.toMatch(/delete/i);
    expect(FACEBOOK.posts!.maxPerRun).toBeLessThanOrEqual(100);
    expect(FACEBOOK.tags!.maxPerRun).toBeLessThanOrEqual(100);
  });

  it('two-factor is never changed automatically', () => {
    expect(FACEBOOK.checks.find((c) => c.id === 'two_factor')?.fix).toBeUndefined();
  });
});

describe('autoscan comparisons', () => {
  const report = (risks: string[], ok: string[] = []): ScanReport => ({
    platform: 'facebook',
    at: 0,
    trigger: 'autoscan',
    results: [...risks.map((checkId) => ({ checkId, status: 'risk' as const })), ...ok.map((checkId) => ({ checkId, status: 'ok' as const }))],
  });
  it('reports only settings that became risky since last time', () => {
    expect(newRisks(report(['a', 'b']), report(['a'], ['b']))).toEqual(['b']);
    expect(newRisks(report(['a']))).toEqual(['a']);
    expect(newRisks(report([], ['a']), report(['a']))).toEqual([]);
  });
});
