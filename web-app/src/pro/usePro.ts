import { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { useDataStore } from '../store/dataStore';
import { verifyLicense, type LicensePayload } from './license';
import { PRO } from './config';

export type ClaimState = 'idle' | 'claiming' | 'done' | 'failed' | 'unpaid';

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
      /* not remembered on this device, that's all */
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

interface ProStore {
  /** The license key as entered. The only thing saved; it holds nothing about the person's data. */
  key: string;
  license: LicensePayload | null;
  checked: boolean;
  upgradeOpen: boolean;
  /** Progress of collecting a key after Stripe checkout. */
  claim: ClaimState;
  /** Collect the key for a finished Stripe checkout. */
  claimSession: (sessionId: string) => Promise<void>;
  /** Check a key; keeps it when genuine. Returns whether it worked. */
  activate: (key: string) => Promise<boolean>;
  deactivate: () => void;
  /** Re-check the saved key when the app starts. */
  restore: () => Promise<void>;
  openUpgrade: () => void;
  closeUpgrade: () => void;
}

export const usePro = create<ProStore>()(
  persist(
    (set, get) => ({
      key: '',
      license: null,
      checked: false,
      upgradeOpen: false,
      claim: 'idle',
      claimSession: async (sessionId) => {
        set({ claim: 'claiming', upgradeOpen: true });
        try {
          const res = await fetch(`${PRO.LICENSE_API}/license?session_id=${encodeURIComponent(sessionId)}`, {
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
          });
          if (res.status === 402) {
            set({ claim: 'unpaid' });
            return;
          }
          const body = (await res.json().catch(() => null)) as { key?: string } | null;
          const ok = !!body?.key && (await get().activate(body.key));
          if (ok) clearSessionFromUrl();
          set({ claim: ok ? 'done' : 'failed' });
        } catch {
          set({ claim: 'failed' });
        }
      },
      activate: async (key) => {
        const license = await verifyLicense(key);
        if (license) set({ key: key.trim(), license, checked: true });
        return !!license;
      },
      deactivate: () => set({ key: '', license: null }),
      restore: async () => {
        const key = get().key;
        set({ license: key ? await verifyLicense(key) : null, checked: true });
      },
      openUpgrade: () => set({ upgradeOpen: true }),
      closeUpgrade: () => set({ upgradeOpen: false }),
    }),
    {
      name: 'footprint-pro',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ key: s.key }),
    },
  ),
);

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

/** A Stripe checkout session id in the address bar, if the buyer just came back from paying. */
export function sessionFromUrl(): string | null {
  try {
    const id = new URL(window.location.href).searchParams.get('session_id');
    return id && SESSION_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Remove the session id once the key is saved, so it isn't bookmarked or shared. */
function clearSessionFromUrl() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('session_id')) return;
    url.searchParams.delete('session_id');
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    /* ignore */
  }
}

/** Check the saved license once when the app starts, and collect a key after Stripe checkout. */
export function useRestorePro() {
  const restore = usePro((s) => s.restore);
  const claimSession = usePro((s) => s.claimSession);
  useEffect(() => {
    void restore().then(() => {
      const id = sessionFromUrl();
      if (id && PRO.LICENSE_API && !usePro.getState().license) void claimSession(id);
      else if (id) clearSessionFromUrl();
    });
  }, [restore, claimSession]);
}

/** Is Pro active? */
export const useIsPro = () => usePro((s) => !!s.license);

/**
 * Are Pro features open right now? Yes with a license, and always in the demo,
 * so people can see everything Pro includes before buying.
 */
export function useUnlocked() {
  const pro = useIsPro();
  const demo = useDataStore((s) => s.source === 'sample');
  return pro || demo;
}
