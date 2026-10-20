import type { Collections } from '../model/types';
import type { Insights } from '../insights/insights';

/** What the plan is computed from: the same insights the tabs show, plus collections (settings). */
export interface AdviceInput {
  insights: Insights;
  collections: Collections;
}

export type FixArea = 'security' | 'tracking' | 'ads' | 'visibility' | 'contacts' | 'location' | 'apps' | 'history';

/**
 * needs_action: the export shows the setting is open, change it
 * review: worth doing, but the export can't say whether it's done (or it can only be reduced)
 * done: the export shows it's already private
 */
export type FixStatus = 'needs_action' | 'review' | 'done';

/** Numbers and names from this export, used in the fix's wording. */
export type Vars = Record<string, string | number | string[] | boolean | undefined>;

export interface Evidence {
  vars: Vars;
  /** Tab that shows the records behind the finding, for "See the evidence". */
  tab?: 'overview' | 'ads' | 'profile' | 'security' | 'activity' | 'people' | 'media' | 'timeline';
}

export interface PrivacyFix {
  id: string;
  platform: 'facebook' | 'instagram';
  area: FixArea;
  impact: 'high' | 'medium' | 'low';
  effort: 'quick' | 'longer';
  /** Null: nothing in this export makes the fix relevant. */
  evidence(input: AdviceInput): Evidence | null;
  status(input: AdviceInput, evidence: Evidence): FixStatus;
  /** Meta's own page for the setting, opened as a plain link. Never carries user data. */
  url?: string;
  /** Privacy jurisdictions where the fix applies (prefix match, e.g. "US"); omitted = everywhere. */
  regions?: string[];
  /** Month the steps were last checked against Facebook, 'YYYY-MM'. */
  verified: string;
}

export interface PlannedFix {
  fix: PrivacyFix;
  status: FixStatus;
  evidence: Evidence;
}
