import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { useDataStore } from '../store/dataStore';
import { useInsights } from '../insights/useInsights';
import { buildPlan, fixesFor } from './plan';
import { applyLive, downloadDate, type SourcedPlan } from './live';
import { useLiveReport } from '../extension/useExtension';

/**
 * The privacy plan for the loaded export, with live readings from the browser extension merged in
 * when it has scanned. Recomputed only when a new export is loaded or a new scan arrives.
 */
export function usePlan(): SourcedPlan {
  const insights = useInsights();
  const collections = useDataStore((s) => s.collections);
  const summary = useDataStore((s) => s.summary);
  const isDemo = useDataStore((s) => s.source === 'sample');
  const live = useLiveReport('facebook');
  const platform = summary?.platform;
  const base = useMemo(() => buildPlan({ insights, collections }, fixesFor(platform)), [insights, collections, platform]);
  const at = downloadDate(summary?.name, summary?.dateRange?.end);
  // The demo is an invented person: never mix a real scan into it.
  return useMemo(() => applyLive(base, isDemo ? undefined : live, at), [base, live, at, isDemo]);
}

const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* not remembered, that's all */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

interface TickStore {
  /** Fix id → when the person ticked "I did this". Holds no export data. */
  ticked: Record<string, number>;
  /** Ticks made while exploring the demo; never saved. */
  demo: Record<string, number>;
  toggle: (id: string, demo: boolean) => void;
  clear: () => void;
}

/**
 * "I did this" ticks. Only fix ids and dates are saved, in this browser, so the plan
 * remembers progress between visits without keeping any of the export.
 */
export const useTicks = create<TickStore>()(
  persist(
    (set) => ({
      ticked: {},
      demo: {},
      toggle: (id, demo) =>
        set((s) => {
          const key = demo ? 'demo' : 'ticked';
          const next = { ...s[key] };
          if (next[id]) delete next[id];
          else next[id] = Date.now();
          return { [key]: next } as Partial<TickStore>;
        }),
      clear: () => set({ ticked: {}, demo: {} }),
    }),
    {
      name: 'footprint-plan',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ ticked: s.ticked }),
    },
  ),
);

/** Ticks for the data on screen: the demo's are separate and forgotten on reload. */
export function useTicked() {
  const isDemo = useDataStore((s) => s.source === 'sample');
  const ticked = useTicks((s) => (isDemo ? s.demo : s.ticked));
  const toggle = useTicks((s) => s.toggle);
  return { ticked, toggle: (id: string) => toggle(id, isDemo) };
}
