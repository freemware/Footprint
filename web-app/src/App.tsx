import { useEffect, type CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import { t } from './i18n/strings';
import { Header } from './components/shell/Header';
import { ErrorBoundary } from './components/shell/ErrorBoundary';
import { Footer } from './components/shell/Footer';
import { InspectorDrawer } from './components/shell/InspectorDrawer';
import { SearchPalette } from './components/shell/SearchPalette';
import { ImportScreen } from './views/ImportScreen';
import { PlatformsPage } from './views/PlatformsPage';
import { ExtensionPage } from './views/ExtensionPage';
import { UpgradeDialog } from './pro/UpgradeDialog';
import { useRestorePro } from './pro/usePro';
import { RawExplorer } from './views/RawExplorer';
import { OverviewTab } from './views/tabs/OverviewTab';
import { PlanTab } from './views/tabs/PlanTab';
import { AdsTab } from './views/tabs/AdsTab';
import { ProfileTab } from './views/tabs/ProfileTab';
import { SecurityTab } from './views/tabs/SecurityTab';
import { ActivityTab } from './views/tabs/ActivityTab';
import { PeopleTab } from './views/tabs/PeopleTab';
import { MediaTab } from './views/tabs/MediaTab';
import { TimelineTab } from './views/tabs/TimelineTab';
import { TAB_HUE } from './i18n/report';
import { useDataStore } from './store/dataStore';
import { useUiStore } from './store/uiStore';
import { useShortcuts } from './hooks/useShortcuts';
import { IgOverviewTab } from './views/instagram/IgOverviewTab';
import { IgAdsTab } from './views/instagram/IgAdsTab';
import { IgActivityTab } from './views/instagram/IgActivityTab';
import { IgPeopleTab } from './views/instagram/IgPeopleTab';
import { IgSecurityTab } from './views/instagram/IgSecurityTab';

const TAB_VIEWS = {
  overview: OverviewTab,
  plan: PlanTab,
  ads: AdsTab,
  profile: ProfileTab,
  security: SecurityTab,
  activity: ActivityTab,
  people: PeopleTab,
  media: MediaTab,
  timeline: TimelineTab,
  raw: RawExplorer,
};

/** Instagram asks different questions on these tabs (followers, not friends; no cities with logins). */
const INSTAGRAM_VIEWS: typeof TAB_VIEWS = {
  ...TAB_VIEWS,
  overview: IgOverviewTab,
  ads: IgAdsTab,
  security: IgSecurityTab,
  activity: IgActivityTab,
  people: IgPeopleTab,
};

/**
 *   ┌ sticky header: brand · search · privacy · theme ┐
 *   │ tabs                                             │
 *   ├ tab header band (tinted with the tab's hue) ─────┤
 *   │ page content                                     │
 *   └ footer ──────────────────────────────────────────┘
 *   details sheet and search palette open over the page.
 */
export default function App() {
  const theme = useUiStore((s) => s.theme);
  const view = useUiStore((s) => s.view);
  const hasData = useDataStore((s) => s.source !== 'none');
  const platform = useDataStore((s) => s.summary?.platform);
  const isDemo = useDataStore((s) => s.source === 'sample');
  const setView = useUiStore((s) => s.setView);
  useShortcuts();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  // Each tab starts at the top.
  // Braces matter: an effect must return nothing or a cleanup function, and some hosts
  // make scrollTo return a value, which React would later try to call.
  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [view]);

  useRestorePro();
  const showExtension = view === 'extension';
  const showPlatforms = view === 'platforms' || showExtension;
  const showImport = !showPlatforms && (view === 'import' || !hasData);
  const views = platform === 'instagram' ? INSTAGRAM_VIEWS : TAB_VIEWS;
  const Tab = showImport || showPlatforms ? null : views[view as keyof typeof TAB_VIEWS];

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      {isDemo && !showImport && !showPlatforms && (
        <div role="note" className="border-b border-line bg-accent-dim">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[13px] text-ink sm:px-6">
            <Sparkles className="size-4 shrink-0 text-accent" aria-hidden />
            <span className="min-w-0 flex-1">{t.demo.banner}</span>
            <button type="button" onClick={() => setView('import')} className="font-semibold text-accent hover:underline">
              {t.demo.useYours}
            </button>
          </div>
        </div>
      )}
      <ErrorBoundary key={view} onReset={() => setView(hasData ? 'overview' : 'import')}>
        {showExtension ? (
          <ExtensionPage />
        ) : showPlatforms ? (
          <PlatformsPage />
        ) : showImport ? (
          <ImportScreen />
        ) : (
          Tab && (
            <main key={view} className="flex-1" style={{ '--tab': TAB_HUE[view as keyof typeof TAB_HUE] } as CSSProperties}>
              <Tab />
            </main>
          )
        )}
      </ErrorBoundary>
      {!showImport && <Footer />}
      <InspectorDrawer />
      <SearchPalette />
      <UpgradeDialog />
    </div>
  );
}
