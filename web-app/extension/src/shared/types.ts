/**
 * Types shared by the extension's background controller, the page engine and the screens.
 *
 * The extension works the way a person would: it opens a platform's own pages in a tab, reads
 * what's on screen by its visible labels, and clicks only after the person approved the change.
 * It never sees passwords or sign-in cookies, and nothing it reads leaves the browser.
 */

/** Text patterns, matched case-insensitively. Several are alternatives (any may match). */
export type Pattern = string | string[];

/** How to find something on a page: by its role (button, link, switch …) and its visible name. */
export interface Locator {
  role?: string | string[];
  name?: Pattern;
  /** Only look inside the first match of this locator (e.g. a dialog). */
  within?: Locator;
}

export type Vocabulary = 'audience' | 'onoff';

/** One step of a recipe. Steps are plain data, so recipes can be updated without new code. */
export type Step =
  /** Open a page (handled by the background controller, not the page). */
  | { op: 'goto'; url: string }
  | { op: 'wait'; loc: Locator; timeout?: number }
  /** Click something. `optional` skips quietly when it isn't there. */
  | { op: 'click'; loc: Locator; optional?: boolean; timeout?: number }
  /** Read the current value of a setting shown next to its question. */
  | { op: 'read'; question: Pattern; vocab: Vocabulary; timeout?: number }
  /** Open the control next to a setting's question (its edit button, menu or switch). */
  | { op: 'openSetting'; question: Pattern; timeout?: number }
  /** Pick an option in the menu or dialog that just opened. */
  | { op: 'choose'; option: Pattern; optional?: boolean; timeout?: number }
  /** Gather the selectable items in a list (tagged posts, your posts), scrolling to load more. */
  | { op: 'collect'; maxScrolls?: number; limit?: number }
  /** Tick the items with these keys (from collect). */
  | { op: 'select'; keys: string[] }
  | { op: 'sleep'; ms: number };

export type StepResult =
  | { ok: true; value?: SettingReading; items?: ListItem[]; selected?: number; missing?: string[] }
  | { ok: false; reason: FailReason; detail?: string };

export type FailReason = 'not_found' | 'signed_out' | 'security_check' | 'unreadable' | 'cancelled' | 'error';

export interface SettingReading {
  /** Normalised value: an audience key, or true/false for on/off settings. */
  value: string | boolean;
  /** Exactly what the page showed, for display. */
  raw: string;
}

/** One row of a list on a platform's page (a post you're tagged in, a post of yours). */
export interface ListItem {
  /** Stable key for this row, from its text and position among identical rows. */
  key: string;
  text: string;
  /** ISO date (YYYY-MM-DD) when one could be read from the row or its heading. */
  date?: string;
}

/** What the page looked like when a step failed: control labels only, for problem reports. */
export interface PageOutline {
  path: string;
  controls: { role: string; name: string }[];
}

export type CheckStatus = 'risk' | 'ok' | 'unknown';

export interface CheckResult {
  checkId: string;
  status: CheckStatus;
  reading?: SettingReading;
  /** Why the check couldn't read the setting, when it couldn't. */
  problem?: FailReason;
  outline?: PageOutline;
  failedStep?: number;
  /** When this setting was last read, if later than the scan (it was re-read after a fix). */
  checkedAt?: number;
}

export interface ScanReport {
  platform: string;
  at: number;
  /** Signed out of the platform in this browser, so nothing could be read. */
  signedOut?: boolean;
  stoppedBy?: 'security_check' | 'cancelled';
  trigger: 'manual' | 'autoscan';
  results: CheckResult[];
}

export type JobKind = 'scan' | 'fix' | 'find_tags' | 'untag' | 'find_posts' | 'trash_posts';

/** The one task running at a time, shown live on every Footprint screen. */
export interface Job {
  id: string;
  kind: JobKind;
  platform: string;
  status: 'running' | 'done' | 'failed' | 'cancelled';
  /** 0–1 */
  progress: number;
  message: string;
  startedAt: number;
  endedAt?: number;
  /** Items found by find_tags / find_posts. */
  items?: ListItem[];
  /** For fix / untag / trash: how many were changed and how many were checked afterwards. */
  done?: number;
  total?: number;
  error?: FailReason;
  outline?: PageOutline;
}

/** One change Footprint made, kept on this device so people can see exactly what happened. */
export interface HistoryEntry {
  at: number;
  platform: string;
  kind: 'fix' | 'untag' | 'trash_posts';
  summary: string;
  ok: boolean;
}

export type Frequency = 'weekly' | 'monthly';

export interface AutoscanSettings {
  enabled: boolean;
  frequency: Frequency;
  lastRun?: number;
}

/**
 * The part of a scan the Footprint web app may see, so its privacy plan can say what each setting
 * is right now. Only setting readings cross: no page text, names, posts or anything else.
 */
export interface AppReport {
  platform: string;
  at: number;
  signedOut?: boolean;
  stoppedBy?: 'security_check' | 'cancelled';
  results: { checkId: string; status: CheckStatus; value?: string | boolean; raw?: string; at: number }[];
}

/** Turns a stored scan into what the app may see. Readings are short labels like "Only me". */
export function toAppReport(r: ScanReport): AppReport {
  return {
    platform: r.platform,
    at: r.at,
    signedOut: r.signedOut,
    stoppedBy: r.stoppedBy,
    results: r.results.map((c) => ({
      checkId: c.checkId,
      status: c.status,
      value: c.reading?.value,
      raw: c.reading?.raw?.slice(0, 60),
      at: c.checkedAt ?? r.at,
    })),
  };
}
