import { useEffect } from 'react';
import { TAB_ORDER } from '../i18n/report';
import { useUiStore } from '../store/uiStore';
import { useDataStore } from '../store/dataStore';

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/**
 * Keyboard shortcuts:
 *   ⌘K / Ctrl+K / "/"  search everything
 *   1–9                switch tab
 *   Esc                close the details panel
 */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUiStore.getState();
      const hasData = useDataStore.getState().source !== 'none';
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && hasData) {
        e.preventDefault();
        ui.setSearchOpen(!ui.searchOpen);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || ui.searchOpen) return;
      if (e.key === '/' && hasData) {
        e.preventDefault();
        ui.setSearchOpen(true);
        return;
      }
      if (e.key === 'Escape' && ui.inspectorOpen) {
        ui.closeInspector();
        return;
      }
      if (/^[0-9]$/.test(e.key) && hasData && !ui.inspectorOpen) {
        // 1–9 are the first nine tabs, 0 the tenth.
        const tab = TAB_ORDER[e.key === '0' ? 9 : Number(e.key) - 1];
        if (tab) ui.setView(tab);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
