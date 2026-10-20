import { useMemo } from 'react';
import type { FilterState } from '../model/types';
import { useDataStore } from './dataStore';
import { applyFilters, useFilterStore } from './filterStore';

/**
 * Events after the global filters. Pass `ignore` for dimensions a panel controls
 * itself (the master timeline ignores dateRange so you can still see the whole history).
 */
export function useFilteredEvents(ignore: (keyof FilterState)[] = []) {
  const events = useDataStore((s) => s.events);
  const filters = useFilterStore((s) => s.filters);
  const ignoreKey = ignore.join(',');
  return useMemo(() => applyFilters(events, filters, ignore), [events, filters, ignoreKey]);
}
