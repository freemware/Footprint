import { FACEBOOK_FIXES } from './facebook';
import { INSTAGRAM_FIXES } from './instagram';
import type { Platform } from '../model/types';
import type { AdviceInput, FixStatus, PlannedFix, PrivacyFix } from './types';

export interface Plan {
  /** Changes the export shows are still open, most important first. */
  todo: PlannedFix[];
  /** Worth checking: the export can't tell, or the data can only be reduced. */
  review: PlannedFix[];
  /** Already private according to the export. */
  done: PlannedFix[];
  all: PlannedFix[];
}

const IMPACT = { high: 0, medium: 1, low: 2 } as const;
const EFFORT = { quick: 0, longer: 1 } as const;
const AREA = { security: 0, tracking: 1, ads: 2, visibility: 3, contacts: 4, location: 5, apps: 6, history: 7 } as const;

const appliesHere = (fix: PrivacyFix, jurisdiction?: string) =>
  !fix.regions || !jurisdiction || fix.regions.some((r) => jurisdiction === r || jurisdiction.startsWith(`${r}_`));

/** Most important first: impact, then quickest, then area (security before cleanup). */
export const byPriority = (a: PlannedFix, b: PlannedFix) =>
  IMPACT[a.fix.impact] - IMPACT[b.fix.impact] || EFFORT[a.fix.effort] - EFFORT[b.fix.effort] || AREA[a.fix.area] - AREA[b.fix.area];

/** Pure: the same export always gives the same plan. */
export function buildPlan(input: AdviceInput, fixes: PrivacyFix[] = FACEBOOK_FIXES): Plan {
  const all: PlannedFix[] = [];
  for (const fix of fixes) {
    if (!appliesHere(fix, input.collections.jurisdiction)) continue;
    let evidence;
    let status: FixStatus;
    try {
      evidence = fix.evidence(input);
      if (!evidence) continue;
      status = fix.status(input, evidence);
    } catch {
      continue; // a fix that can't read this export is left out, never breaks the plan
    }
    all.push({ fix, status, evidence });
  }
  const by = (s: FixStatus) => all.filter((p) => p.status === s).sort(byPriority);
  return { todo: by('needs_action'), review: by('review'), done: by('done'), all };
}

/** The fix catalog for a platform's download. */
export const fixesFor = (platform: Platform | undefined): PrivacyFix[] => (platform === 'instagram' ? INSTAGRAM_FIXES : FACEBOOK_FIXES);

/** The plan item for a fix id, for "Make this more private" links from other tabs. */
export const planItem = (plan: Plan, id: string) => plan.all.find((p) => p.fix.id === id);
