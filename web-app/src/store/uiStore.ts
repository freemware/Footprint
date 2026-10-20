import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { ActivityEvent } from '../model/types';
import type { ThemeMode } from '../theme/tokens';
import type { TabId } from '../i18n/report';

export type ViewId = TabId | 'import' | 'platforms' | 'extension';

export type DeepLink =
  | { kind: 'advertiser'; query: string }
  | { kind: 'interest'; query: string }
  | { kind: 'file'; path: string }
  | { kind: 'media'; path: string }
  | { kind: 'fix'; id: string };

export interface InspectorContent {
  title: string;
  subtitle?: string;
  events: ActivityEvent[];
}

interface UiStore {
  theme: ThemeMode;
  view: ViewId;
  /** Blur emails, phone numbers and IDs so the screen can be shared. On by default. */
  hidePersonal: boolean;
  inspector: InspectorContent | null;
  inspectorOpen: boolean;
  searchOpen: boolean;
  /** Set by search to pre-fill a tab's own search box or selection when it opens. */
  deepLink: DeepLink | null;
  setSearchOpen: (open: boolean) => void;
  openDeepLink: (link: DeepLink) => void;
  clearDeepLink: () => void;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  setView: (v: ViewId) => void;
  togglePersonal: () => void;
  inspect: (c: InspectorContent) => void;
  closeInspector: () => void;
}

/** localStorage can be blocked (private mode, strict settings). Preferences then simply aren't remembered. */
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
      /* ignore */
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

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      view: 'overview',
      hidePersonal: true,
      inspector: null,
      inspectorOpen: false,
      searchOpen: false,
      deepLink: null,
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      openDeepLink: (deepLink) =>
        set({
          deepLink,
          searchOpen: false,
          inspectorOpen: false,
          view: deepLink.kind === 'advertiser' ? 'ads' : deepLink.kind === 'interest' ? 'profile' : deepLink.kind === 'file' ? 'raw' : deepLink.kind === 'fix' ? 'plan' : 'media',
        }),
      clearDeepLink: () => set({ deepLink: null }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setView: (view) => set({ view, inspectorOpen: false }),
      togglePersonal: () => set((s) => ({ hidePersonal: !s.hidePersonal })),
      inspect: (inspector) => set({ inspector, inspectorOpen: true, searchOpen: false }),
      closeInspector: () => set({ inspectorOpen: false }),
    }),
    {
      name: 'footprint-ui',
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      // Only appearance is remembered. Never any export data.
      partialize: (s) => ({ theme: s.theme }),
    },
  ),
);
