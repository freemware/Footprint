import { useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import { buildInsights } from './insights';

/** Insights for the loaded export, recomputed only when a new export is loaded. */
export function useInsights() {
  const events = useDataStore((s) => s.events);
  const collections = useDataStore((s) => s.collections);
  const summary = useDataStore((s) => s.summary);
  return useMemo(() => buildInsights(events, collections, summary), [events, collections, summary]);
}
