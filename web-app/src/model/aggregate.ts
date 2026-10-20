import type { ActivityEvent } from './types';
import { GROUP_ORDER, groupOf, type CategoryGroup } from '../theme/tokens';

/** Start of the month (local time) for a timestamp. */
export const monthStart = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};
const nextMonth = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
};
export const monthEnd = (ms: number) => nextMonth(monthStart(ms)) - 1;

/** Continuous list of month starts covering [from, to], so empty months show as gaps, not skipped. */
export function monthRange(from: number, to: number): number[] {
  const out: number[] = [];
  for (let m = monthStart(from); m <= to; m = nextMonth(m)) out.push(m);
  return out;
}

export interface MonthlyByGroup {
  months: number[];
  series: Record<CategoryGroup, number[]>;
  totals: number[];
}

export function countByMonthByGroup(events: ActivityEvent[], from?: number, to?: number): MonthlyByGroup {
  const empty = () => Object.fromEntries(GROUP_ORDER.map((g) => [g, [] as number[]])) as Record<CategoryGroup, number[]>;
  if (!events.length && (from === undefined || to === undefined)) return { months: [], series: empty(), totals: [] };
  const lo = from ?? events[0]!.timestamp;
  const hi = to ?? events[events.length - 1]!.timestamp;
  const months = monthRange(lo, hi);
  const index = new Map(months.map((m, i) => [m, i]));
  const series = Object.fromEntries(GROUP_ORDER.map((g) => [g, new Array(months.length).fill(0)])) as Record<
    CategoryGroup,
    number[]
  >;
  const totals = new Array(months.length).fill(0);
  for (const e of events) {
    const i = index.get(monthStart(e.timestamp));
    if (i === undefined) continue;
    const s = series[groupOf(e)];
    s[i] = (s[i] ?? 0) + 1;
    totals[i]++;
  }
  return { months, series, totals };
}

/** 7 x 24 grid: [hour, weekday(0=Mon), count]. Local time. */
export function weekdayHourMatrix(events: ActivityEvent[]): [number, number, number][] {
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const e of events) {
    const d = new Date(e.timestamp);
    const wd = (d.getDay() + 6) % 7;
    grid[wd]![d.getHours()]++;
  }
  const out: [number, number, number][] = [];
  grid.forEach((row, wd) => row.forEach((n: number, h: number) => out.push([h, wd, n])));
  return out;
}

export function countWhere(events: ActivityEvent[], pred: (e: ActivityEvent) => boolean) {
  let n = 0;
  for (const e of events) if (pred(e)) n++;
  return n;
}

/** Counts per calendar year, for KPI sparklines and year-over-year deltas. */
export function yearlyCounts(events: ActivityEvent[], pred: (e: ActivityEvent) => boolean): { years: number[]; counts: number[] } {
  const map = new Map<number, number>();
  for (const e of events) if (pred(e)) {
    const y = new Date(e.timestamp).getFullYear();
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  if (!map.size) return { years: [], counts: [] };
  const ys = [...map.keys()];
  const years: number[] = [];
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) years.push(y);
  return { years, counts: years.map((y) => map.get(y) ?? 0) };
}
