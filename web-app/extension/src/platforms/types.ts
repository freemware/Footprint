import type { Locator, Pattern, Step, Vocabulary } from '../shared/types';

export type CheckArea = 'security' | 'visibility' | 'tracking' | 'ads' | 'tagging';

/** One setting the scan reads, and (when it can) how to change it after approval. */
export interface CheckDef {
  id: string;
  /** Plain-language title, e.g. "Who can see your future posts". */
  title: string;
  area: CheckArea;
  impact: 'high' | 'medium' | 'low';
  /** Why it matters, one sentence. */
  why: string;
  /** Honest limits: what changing it does and doesn't do. */
  limits: string;
  /** Steps to do it by hand, shown when the setting can't be read or changed automatically. */
  manual: string[];
  /** Platform page for the setting, opened as a plain link. */
  url: string;
  /** Steps that open the page showing the setting. Checks with identical `open` share a page load. */
  open: Step[];
  read: { question: Pattern; vocab: Vocabulary };
  /** How to show a value, when the page's own word would confuse (e.g. Connected / Disconnected). */
  display?: (value: string | boolean) => string;
  /** Is the value read from the page a risk? */
  risky: (value: string | boolean) => boolean;
  /** Present when Footprint can make the change after the person approves it. */
  fix?: {
    /** What will change, shown in the approval preview, e.g. "Friends". */
    to: string;
    steps: Step[];
    /** The value expected afterwards, used to confirm the change took. */
    expect: string | boolean;
  };
}

/** A list Footprint can act on in bulk: posts you're tagged in, your old posts. */
export interface ListSource {
  id: string;
  label: string;
  open: Step[];
}

export interface ListRecipe {
  sources: ListSource[];
  /** The button that acts on the ticked rows, then an optional confirmation in a dialog. */
  action: Locator;
  confirm?: Locator;
  /** Rows per round; platforms cap how many can be ticked at once. */
  batch: number;
  /** Most rows changed in one run, to stay well inside platform limits. */
  maxPerRun: number;
}

export interface PlatformDef {
  id: string;
  name: string;
  status: 'available' | 'coming';
  /** Short letters for the logo tile. */
  mark: string;
  /** Sites the extension may open for this platform (also its host permissions). */
  hosts: string[];
  home: string;
  checks: CheckDef[];
  tags?: ListRecipe;
  posts?: ListRecipe;
  /** What it will cover, for platforms that are coming. */
  planned?: string[];
}

export const p = (...alts: string[]): Pattern => alts;
