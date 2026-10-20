import { create } from 'zustand';
import type { ActivityEvent, Collections, ExportSummary } from '../model/types';
import { emptyCollections } from '../model/types';
import { loadDemo as buildDemo } from '../demo/loadDemo';
import { importExport, shutdownImporter, setDemoSource, type ImportInput, type ImportProgress } from '../importer/client';
import { setActivePlatform } from '../i18n/platform';

/**
 * The single source of truth for loaded data. It lives only in this tab's memory
 * (later, optionally, in this browser's IndexedDB). It is never sent anywhere.
 */
interface DataStore {
  events: ActivityEvent[];
  collections: Collections;
  summary: ExportSummary | null;
  /** 'sample' marks generated preview data so it's never mistaken for a real export. */
  source: 'none' | 'sample' | 'export';
  importing: boolean;
  progress: ImportProgress | null;
  importError: string | null;
  load: (events: ActivityEvent[], summary: ExportSummary, source: 'sample' | 'export', collections?: Collections) => void;
  /** Import files through the worker. `sample` marks the invented demo export. */
  importFiles: (inputs: ImportInput[], source?: 'export' | 'sample') => Promise<boolean>;
  /** Load the invented demo export straight into the page (no files, no worker). */
  loadDemo: () => Promise<boolean>;
  /** Show an import error that happened before the importer ran (e.g. building the demo). */
  fail: (message: string) => void;
  clear: () => void;
}

export const useDataStore = create<DataStore>((set, get) => ({
  events: [],
  collections: emptyCollections(),
  summary: null,
  source: 'none',
  importing: false,
  progress: null,
  importError: null,

  load: (events, summary, source, collections = emptyCollections()) => {
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    setActivePlatform(summary.platform);
    set({ events: sorted, summary, source, collections, importError: null });
  },

  importFiles: async (inputs, source = 'export') => {
    if (!inputs.length || get().importing) return false;
    set({ importing: true, importError: null, progress: { phase: 'listing', done: 0, total: inputs.length } });
    try {
      setDemoSource(null);
      const { events, collections, summary } = await importExport(inputs, (progress) => set({ progress }));
      // Wording follows the platform; set it before the screens re-render with the new data.
      setActivePlatform(summary.platform);
      set({ events, collections, summary, source, importing: false, progress: null });
      return true;
    } catch (e) {
      set({
        importing: false,
        progress: null,
        importError: e instanceof Error ? e.message : 'The files could not be read.',
      });
      return false;
    }
  },

  loadDemo: async () => {
    if (get().importing) return false;
    try {
      // One synchronous step (a few hundred milliseconds): no timers, no extra files, no worker.
      const { dataset, source } = buildDemo();
      setDemoSource(source);
      setActivePlatform(dataset.summary.platform);
      set({ ...dataset, source: 'sample', importing: false, progress: null, importError: null });
      return true;
    } catch (e) {
      set({ importing: false, progress: null, importError: `The demo could not be loaded: ${e instanceof Error ? e.message : String(e)}` });
      return false;
    }
  },

  fail: (message) => set({ importing: false, progress: null, importError: message }),

  clear: () => {
    shutdownImporter();
    setActivePlatform('facebook');
    set({ events: [], collections: emptyCollections(), summary: null, source: 'none', importError: null });
  },
}));
