import { create } from 'zustand';
import type { ActivityEvent, Category, FilterState } from '../model/types';

type ListKey = 'categories' | 'people' | 'countries' | 'devices';

interface FilterStore {
  filters: FilterState;
  setDateRange: (range?: [number, number]) => void;
  /** Add the value if absent, remove it if present. Used by every clickable chart element. */
  toggle: <K extends ListKey>(key: K, value: NonNullable<FilterState[K]>[number]) => void;
  remove: <K extends ListKey>(key: K, value: NonNullable<FilterState[K]>[number]) => void;
  setSearchText: (text?: string) => void;
  clearAll: () => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  filters: {},
  setDateRange: (dateRange) => set((s) => ({ filters: { ...s.filters, dateRange } })),
  toggle: (key, value) =>
    set((s) => {
      const current = (s.filters[key] ?? []) as (typeof value)[];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { filters: { ...s.filters, [key]: next.length ? next : undefined } };
    }),
  remove: (key, value) =>
    set((s) => {
      const next = ((s.filters[key] ?? []) as (typeof value)[]).filter((v) => v !== value);
      return { filters: { ...s.filters, [key]: next.length ? next : undefined } };
    }),
  setSearchText: (searchText) => set((s) => ({ filters: { ...s.filters, searchText: searchText || undefined } })),
  clearAll: () => set({ filters: {} }),
}));

export const hasActiveFilters = (f: FilterState) =>
  Boolean(
    f.dateRange || f.categories?.length || f.people?.length || f.countries?.length || f.devices?.length || f.searchText,
  );

/**
 * Apply the global filters to the event stream.
 * `ignore` lets a panel skip its own dimension, so e.g. the master timeline
 * still shows the full history while a date range is selected.
 */
export function applyFilters(
  events: ActivityEvent[],
  f: FilterState,
  ignore: (keyof FilterState)[] = [],
): ActivityEvent[] {
  if (!hasActiveFilters(f)) return events;
  const use = (k: keyof FilterState) => !ignore.includes(k);
  const cats = use('categories') && f.categories?.length ? new Set<Category>(f.categories) : null;
  const people = use('people') && f.people?.length ? new Set(f.people) : null;
  const countries = use('countries') && f.countries?.length ? new Set(f.countries) : null;
  const devices = use('devices') && f.devices?.length ? new Set(f.devices) : null;
  const range = use('dateRange') ? f.dateRange : undefined;
  const q = use('searchText') && f.searchText ? f.searchText.toLocaleLowerCase() : null;

  return events.filter((e) => {
    if (range && (e.timestamp < range[0] || e.timestamp > range[1])) return false;
    if (cats && !cats.has(e.category)) return false;
    if (people && !e.people?.some((p) => people.has(p))) return false;
    if (countries && !(e.location?.country && countries.has(e.location.country))) return false;
    if (devices && !(e.device && devices.has(e.device))) return false;
    if (q && !`${e.title ?? ''} ${e.text ?? ''}`.toLocaleLowerCase().includes(q)) return false;
    return true;
  });
}
