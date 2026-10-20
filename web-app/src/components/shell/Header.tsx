import { useEffect, useRef, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, Eye, EyeOff, FileArchive, FolderTree, Footprints, IdCard, Images, LayoutGrid, ListChecks, ListOrdered, Megaphone, Moon, Puzzle, Search, ShieldCheck, ShieldHalf, Sparkles, Sun, Upload, Users, X, type LucideIcon } from 'lucide-react';
import { extensionCopy } from '../../i18n/extension';
import { t } from '../../i18n/strings';
import { TABS, TAB_HUE, TAB_ORDER, type TabId } from '../../i18n/report';
import { useUiStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { useFilterStore } from '../../store/filterStore';
import { useIsPro, usePro } from '../../pro/usePro';

export const TAB_ICONS: Record<TabId, LucideIcon> = {
  overview: LayoutGrid,
  plan: ListChecks,
  ads: Megaphone,
  profile: IdCard,
  security: ShieldHalf,
  activity: Activity,
  people: Users,
  media: Images,
  timeline: ListOrdered,
  raw: FolderTree,
};

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Sticky app header: brand, search, privacy controls, theme; tab bar below once data is loaded. */
export function Header() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const hidePersonal = useUiStore((s) => s.hidePersonal);
  const togglePersonal = useUiStore((s) => s.togglePersonal);
  const source = useDataStore((s) => s.source);
  const summary = useDataStore((s) => s.summary);
  const clear = useDataStore((s) => s.clear);
  const clearFilters = useFilterStore((s) => s.clearAll);
  const hasData = source !== 'none';
  const isPro = useIsPro();
  const openUpgrade = usePro((st) => st.openUpgrade);

  const close = () => {
    clearFilters();
    clear();
    setView('import');
  };
  const iconBtn = 'grid size-9 place-items-center rounded-xl text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink';

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-surface/85 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/75">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6">
        <button type="button" onClick={() => setView(hasData ? 'overview' : 'import')} className="flex items-center gap-2.5" aria-label="Footprint home">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink">
            <Footprints className="size-5" aria-hidden />
          </span>
          <span className="hidden flex-col items-start leading-none sm:flex">
            <span className="display text-[19px] font-bold text-ink">Footprint</span>
            <span className="mt-0.5 text-[11px] text-ink-3">{t.app.tagline}</span>
          </span>
        </button>

        {hasData && (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-2 flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2 md:ml-6 md:max-w-sm"
            aria-label="Search everything"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="truncate text-[14px]">Search everything</span>
            <kbd className="ml-auto hidden shrink-0 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink-3 sm:block">
              {isMac ? '⌘' : 'Ctrl'} K
            </kbd>
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setView('extension')}
            className={`hidden h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium transition-colors md:flex ${view === 'extension' ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}
          >
            <Puzzle className="size-4" aria-hidden />
            {extensionCopy.nav}
          </button>
          <button
            type="button"
            onClick={() => setView('platforms')}
            className={`hidden h-9 items-center rounded-xl px-3 text-[13px] font-medium transition-colors lg:flex ${view === 'platforms' ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}
          >
            Platforms
          </button>
          <button
            type="button"
            onClick={openUpgrade}
            className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={isPro ? { color: 'var(--plan)', background: 'color-mix(in oklab, var(--plan) 14%, transparent)' } : { background: 'var(--plan)', color: 'var(--plan-ink)' }}
            title={isPro ? 'Footprint Pro is on' : 'Get Footprint Pro'}
          >
            <Sparkles className="size-4" aria-hidden />
            {isPro ? 'Pro' : 'Get Pro'}
          </button>
          {hasData ? (
            <span className="hidden h-9 max-w-56 items-center gap-1.5 rounded-xl border border-line pl-3 pr-1 text-[13px] text-ink-2 xl:flex">
              <FileArchive className="size-4 shrink-0 text-ink-3" aria-hidden />
              <span className="truncate" title={summary?.name}>
                {source === 'sample' ? t.topbar.sampleOn : summary?.name ?? t.sources.export}
              </span>
              <button type="button" onClick={close} aria-label={t.sources.close} title={t.sources.close} className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-surface-3 hover:text-ink">
                <X className="size-3.5" />
              </button>
            </span>
          ) : (
            view !== 'import' && (
              <button type="button" onClick={() => setView('import')} className="flex h-9 items-center gap-1.5 rounded-xl border border-accent px-3 text-[13px] font-medium text-accent hover:bg-accent-dim">
                <Upload className="size-4" />
                {t.sources.import}
              </button>
            )
          )}

          {hasData && (
            <button
              type="button"
              onClick={togglePersonal}
              aria-pressed={!hidePersonal}
              className={iconBtn}
              aria-label={hidePersonal ? 'Show personal details' : 'Hide personal details'}
              title={hidePersonal ? 'Show personal details (names, emails, searches and IDs are blurred)' : 'Blur names, emails, searches and IDs'}
            >
              {hidePersonal ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          )}

          <span className="grid size-9 place-items-center rounded-xl text-good" title={t.topbar.privacyTooltip} role="note" aria-label="Your data stays on this device">
            <ShieldCheck className="size-[18px]" aria-hidden />
          </span>

          <button
            type="button"
            onClick={toggleTheme}
            className={iconBtn}
            aria-label={theme === 'dark' ? t.topbar.themeToLight : t.topbar.themeToDark}
            title={theme === 'dark' ? t.topbar.themeToLight : t.topbar.themeToDark}
          >
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
        </div>
      </div>
      {hasData && (TAB_ORDER as string[]).includes(view) && <TabBar active={view as TabId} onSelect={setView} />}
    </header>
  );
}

function TabBar({ active, onSelect }: { active: TabId; onSelect: (t: TabId) => void }) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  // Keep the active tab in view on narrow screens where the bar scrolls sideways.
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  return (
    <nav aria-label="Sections" className="mx-auto max-w-[1240px] px-2 sm:px-4">
      <div role="tablist" className="flex gap-0.5 overflow-x-auto [scrollbar-width:none]">
        {TAB_ORDER.map((id, i) => {
          const Icon = TAB_ICONS[id];
          const on = id === active;
          return (
            <button
              key={id}
              ref={on ? activeRef : undefined}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onSelect(id)}
              title={`${TABS[id].label} (${i < 9 ? i + 1 : 0})`}
              style={{ '--tab': TAB_HUE[id] } as CSSProperties}
              className={[
                'relative flex h-12 shrink-0 items-center gap-2 px-3 text-[14px] transition-colors',
                on ? 'font-semibold text-ink' : 'text-ink-2 hover:text-ink',
              ].join(' ')}
            >
              <Icon className="size-4" style={{ color: on ? 'var(--tab)' : undefined }} aria-hidden />
              {TABS[id].label}
              {on && (
                <motion.span
                  layoutId="tab-underline"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
                  className="absolute inset-x-2 -bottom-px h-[3px] rounded-t-full"
                  style={{ background: 'var(--tab)' }}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
