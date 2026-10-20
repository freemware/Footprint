import { Building2, Eye, FileQuestion, Megaphone, MousePointerClick, Radar, SlidersHorizontal, Upload, Users } from 'lucide-react';
import { BarList, Body, Card, ChipCloud, PageHeader, Section, StatTiles } from '../../components/report/Report';
import { PlanLinks } from '../../components/report/PlanLinks';
import { TABS, report } from '../../i18n/report';
import { igReport } from '../../i18n/instagram';
import { useInsights } from '../../insights/useInsights';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { groupColor } from '../../theme/tokens';
import { AdvertiserBrowser, Explainer } from '../tabs/AdsTab';

const R = igReport.ads;
const SETTING_IDS = Object.keys(R.settings);

/** Who has your information on Instagram, which ads it logged, and the ad settings on file. */
export function IgAdsTab() {
  const i = useInsights();
  const theme = useUiStore((s) => s.theme);
  const inspect = useUiStore((s) => s.inspect);
  const events = useDataStore((s) => s.events);
  const settings = useDataStore((s) => s.collections.settings);
  const adColor = groupColor('ads', theme);
  const actColor = groupColor('posts', theme);
  const ofType = (t: string) => events.filter((e) => e.type === t).reverse();
  const onFile = SETTING_IDS.filter((id) => typeof settings[id]?.value === 'boolean');

  return (
    <>
      <PageHeader
        tab="ads"
        icon={Megaphone}
        title={TABS.ads.title}
        lead={report.ads.lead}
        stats={[
          { value: i.ads.advertisers, label: R.stats.businesses, icon: Building2 },
          { value: i.ads.uploaded, label: R.stats.uploaded, icon: Upload, color: adColor },
          { value: i.ads.activity, label: R.stats.activity, icon: Radar, color: actColor },
          { value: i.ads.seen, label: R.stats.adsSeen, icon: Eye },
        ]}
      />
      <Body>
        {i.ads.advertisers > 0 && (
          <>
            <Section title="Two ways businesses reach you" lead={i.ads.both ? report.ads.both(i.ads.both) : undefined}>
              <div className="grid gap-4 md:grid-cols-2">
                <Explainer color={adColor} icon={Upload} value={i.ads.uploaded} title={report.ads.uploadedTitle} text={report.ads.uploadedText} />
                <Explainer color={actColor} icon={Radar} value={i.ads.activity} title={report.ads.activityTitle} text={report.ads.activityText} />
              </div>
            </Section>
            <Section title={R.listTitle} lead={R.listLead}>
              <AdvertiserBrowser adColor={adColor} actColor={actColor} />
            </Section>
          </>
        )}

        {(i.ads.seen > 0 || i.ads.clicked > 0) && (
          <Section title={R.adsTitle} lead={R.adsLead(i.ads.seen, i.ads.clicked)}>
            <div className="mb-4">
              <StatTiles
                items={[
                  { value: i.ads.seen, label: 'Ads you saw (recent)', icon: Eye, color: adColor },
                  { value: i.ads.clicked, label: 'Ads you clicked', icon: MousePointerClick, color: adColor },
                  { value: i.ads.topSeen.length, label: 'Different accounts', icon: Building2, color: adColor },
                ]}
              />
            </div>
            <Card title={R.topSeen} description={report.common.details} icon={Megaphone} hue={adColor}>
              <BarList items={i.ads.topSeen} color={adColor} avatars ranked onSelect={(name) => inspect({ title: name, events: ofType('ad_viewed').filter((e) => e.meta?.advertiser === name) })} />
            </Card>
            {i.instagram.notInterested > 0 && (
              <button type="button" onClick={() => inspect({ title: 'Not interested', events: ofType('not_interested') })} className="mt-3 text-[13px] font-medium text-accent hover:underline">
                {R.notInterested(i.instagram.notInterested)}
              </button>
            )}
          </Section>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {i.ads.categories.length > 0 && (
            <Section title={R.categoriesTitle(i.ads.categories.length)} lead={R.categoriesLead}>
              <Card icon={Users} hue={adColor} bodyClassName="p-5">
                <ChipCloud items={i.ads.categories} />
              </Card>
            </Section>
          )}
          {i.instagram.leadForms > 0 && (
            <Section title={R.formsTitle(i.instagram.leadForms)} lead={R.formsLead}>
              <Card icon={FileQuestion} hue={adColor} bodyClassName="p-5">
                <button type="button" onClick={() => inspect({ title: R.formsTitle(i.instagram.leadForms), events: ofType('lead_form') })} className="text-[14px] font-medium text-accent hover:underline">
                  {R.formsOpen}
                </button>
              </Card>
            </Section>
          )}
        </div>

        {onFile.length > 0 && (
          <Section title={R.settingsTitle}>
            <Card icon={SlidersHorizontal} hue={adColor}>
              <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-[minmax(160px,320px)_1fr]">
                {onFile.map((id) => {
                  const [label, yes, no] = R.settings[id]!;
                  return (
                    <div key={id} className="contents">
                      <dt className="text-ink-3">{label}</dt>
                      <dd className="text-ink">{settings[id]!.value ? yes : no}</dd>
                    </div>
                  );
                })}
              </dl>
            </Card>
          </Section>
        )}

        <div className="mb-14">
          <PlanLinks ids={['ig_other_businesses', 'ig_list_uploads', 'ig_ad_topics', 'ig_lead_forms', 'ig_browser_signal', 'ig_link_history']} />
        </div>
      </Body>
    </>
  );
}
