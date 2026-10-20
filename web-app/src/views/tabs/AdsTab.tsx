import { useEffect, useMemo, useState } from 'react';
import { AppWindow, Building2, Eye, EyeOff, ListChecks, Megaphone, MousePointerClick, Radar, Upload } from 'lucide-react';
import { BarList, Body, Card, PageHeader, SearchBox, Section, Segmented, StatTiles } from '../../components/report/Report';
import { PlanLinks } from '../../components/report/PlanLinks';
import { fmt } from '../../i18n/strings';
import { TABS, offMetaLabel, report } from '../../i18n/report';
import { useInsights } from '../../insights/useInsights';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { groupColor } from '../../theme/tokens';

const R = report.ads;
const PAGE = 48;

export function AdsTab() {
  const i = useInsights();
  const theme = useUiStore((s) => s.theme);
  const inspect = useUiStore((s) => s.inspect);
  const events = useDataStore((s) => s.events);
  const adColor = groupColor('ads', theme);
  const actColor = groupColor('posts', theme);

  return (
    <>
      <PageHeader
        tab="ads"
        icon={Megaphone}
        title={TABS.ads.title}
        lead={R.lead}
        stats={[
          { value: i.ads.advertisers, label: 'Businesses with your info', icon: Building2 },
          { value: i.ads.uploaded, label: 'Uploaded a list with your details', icon: Upload, color: adColor },
          { value: i.ads.activity, label: 'Shared your activity', icon: Radar, color: actColor },
          { value: i.ads.offMetaApps.length, label: 'Apps & sites reporting on you', icon: AppWindow },
        ]}
      />
      <Body>
        <Section title="Two ways businesses reach you" lead={R.both(i.ads.both)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Explainer color={adColor} icon={Upload} value={i.ads.uploaded} title={R.uploadedTitle} text={R.uploadedText} />
            <Explainer color={actColor} icon={Radar} value={i.ads.activity} title={R.activityTitle} text={R.activityText} />
          </div>
        </Section>

        <Section title="Every business with your information" lead="Search the full list. A square means they uploaded a list with your details; a circle means they shared your activity.">
          <AdvertiserBrowser adColor={adColor} actColor={actColor} />
        </Section>

        <Section title={R.offTitle} lead={R.offLead(i.ads.offMetaEvents)}>
          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <Card title="Companies that sent reports" description={report.common.details} icon={AppWindow} hue={adColor}>
              <BarList
                items={i.ads.offMetaApps}
                color={adColor}
                limit={8}
                avatars
                unit={(n) => report.common.records(n)}
                onSelect={(app) =>
                  inspect({ title: app, subtitle: R.offTitle, events: events.filter((e) => e.type === 'off_meta_activity' && e.meta?.app === app).reverse() })
                }
              />
            </Card>
            <Card title={R.offKinds} description="What those reports said you did" icon={ListChecks} hue={actColor}>
              <BarList
                items={i.ads.offMetaByCode.map((r) => ({ ...r, label: offMetaLabel(r.key) }))}
                color={actColor}
                onSelect={(code) => inspect({ title: offMetaLabel(code), events: events.filter((e) => e.type === 'off_meta_activity' && e.meta?.event === code).reverse() })}
              />
            </Card>
          </div>
        </Section>

        <Section title={R.adsTitle} lead={R.adsLead(i.ads.seen, i.ads.clicked, i.ads.hidden)}>
          <div className="mb-4">
            <StatTiles
              items={[
                { value: i.ads.seen, label: 'Ads you saw (recent)', icon: Eye, color: adColor },
                { value: i.ads.clicked, label: 'Ads you clicked', icon: MousePointerClick, color: adColor },
                { value: i.ads.hidden, label: 'Ads you hid', icon: EyeOff, color: adColor },
                { value: i.ads.topSeen.length, label: 'Different advertisers seen', icon: Building2, color: adColor },
              ]}
            />
          </div>
          <Card title={R.topSeen} description={report.common.details} icon={Megaphone} hue={adColor}>
            <BarList
              items={i.ads.topSeen}
              color={adColor}
              avatars
              ranked
              onSelect={(name) => inspect({ title: name, events: events.filter((e) => e.type === 'ad_viewed' && e.meta?.advertiser === name).reverse() })}
            />
          </Card>
        </Section>

        <div className="mb-14">
          <PlanLinks ids={['other_businesses', 'ads_off_meta', 'list_uploads', 'ad_topics', 'connected_apps', 'browser_signal']} />
        </div>
      </Body>
    </>
  );
}

export function Explainer({ color, icon: Icon, value, title, text }: { color: string; icon: typeof Upload; value: number; title: string; text: string }) {
  return (
    <Card hue={color} bodyClassName="p-6">
      <div className="flex items-center gap-3">
        <span className="tab-tile grid size-11 place-items-center rounded-xl">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="display num text-[38px] font-semibold leading-none text-ink">{fmt.number(value)}</span>
      </div>
      <h3 className="mt-4 text-[16px] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-ink-2">{text}</p>
    </Card>
  );
}

type Filter = 'all' | 'uploaded' | 'activity';

export function AdvertiserBrowser({ adColor, actColor }: { adColor: string; actColor: string }) {
  const i = useInsights();
  const deepLink = useUiStore((s) => s.deepLink);
  const clearDeepLink = useUiStore((s) => s.clearDeepLink);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE);

  // Opened from search: show that business.
  useEffect(() => {
    if (deepLink?.kind !== 'advertiser') return;
    setQ(deepLink.query);
    setFilter('all');
    clearDeepLink();
  }, [deepLink, clearDeepLink]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return i.ads.names.filter((a) => (filter === 'all' || (filter === 'uploaded' ? a.uploaded : a.activity)) && (!s || a.name.toLowerCase().includes(s)));
  }, [i.ads.names, q, filter]);

  return (
    <Card bodyClassName="p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setLimit(PAGE);
          }}
          placeholder={R.searchList}
        />
        <Segmented
          label="Filter businesses"
          value={filter}
          onChange={(f) => {
            setFilter(f);
            setLimit(PAGE);
          }}
          options={[
            { id: 'all', label: <>{R.filterAll} <span className="num opacity-70">{fmt.compact(i.ads.advertisers)}</span></> },
            { id: 'uploaded', label: <>{R.filterUploaded} <span className="num opacity-70">{fmt.compact(i.ads.uploaded)}</span></> },
            { id: 'activity', label: <>{R.filterActivity} <span className="num opacity-70">{fmt.compact(i.ads.activity)}</span></> },
          ]}
        />
        <span className="ml-auto text-[13px] text-ink-3">{R.showing(Math.min(limit, list.length), list.length)}</span>
      </div>
      {list.length ? (
        <ul className="grid gap-x-6 px-5 py-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.slice(0, limit).map((a) => (
            <li key={a.name} className="flex items-center gap-2.5 border-b border-line/60 py-2 text-[14px]">
              <span className="flex w-5 shrink-0 gap-0.5" aria-label={[a.uploaded && R.filterUploaded, a.activity && R.filterActivity].filter(Boolean).join(', ')}>
                {a.uploaded && <span className="size-2 rounded-[2px]" style={{ background: adColor }} title={R.filterUploaded} />}
                {a.activity && <span className="size-2 rounded-full" style={{ background: actColor }} title={R.filterActivity} />}
              </span>
              <span className="truncate text-ink" title={a.name}>
                {a.name}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-10 text-center text-ink-3">No business matches “{q}”.</p>
      )}
      {list.length > limit && (
        <div className="border-t border-line px-5 py-3">
          <button type="button" onClick={() => setLimit(limit + PAGE * 3)} className="text-[13px] font-medium text-accent hover:underline">
            {R.showMore}
          </button>
        </div>
      )}
    </Card>
  );
}
