import { CalendarRange, Eye, Building2, Footprints, LayoutGrid } from 'lucide-react';
import { Body, Card, PageHeader, Section, SplitBar } from '../../components/report/Report';
import { fmt } from '../../i18n/strings';
import { TABS, report } from '../../i18n/report';
import { igReport } from '../../i18n/instagram';
import { useInsights } from '../../insights/useInsights';
import { useUiStore } from '../../store/uiStore';
import { groupColor, type CategoryGroup } from '../../theme/tokens';
import { Finding, GroupShares, MiniBars, PlanSummary, sample, YearsChart } from '../tabs/OverviewTab';

const R = igReport.overview;

/** Instagram's opening page: headline numbers, six findings, and the years at a glance. */
export function IgOverviewTab() {
  const i = useInsights();
  const g = i.instagram;
  const theme = useUiStore((s) => s.theme);
  const hide = useUiStore((s) => s.hidePersonal);
  const setView = useUiStore((s) => s.setView);
  const c = (x: CategoryGroup) => groupColor(x, theme);
  const start = i.accountCreated ?? i.range?.start;
  const watchedParts = [
    { key: 'stories', label: R.watchedParts.stories, count: g.watched.stories },
    { key: 'videos', label: R.watchedParts.videos, count: g.watched.videos },
    { key: 'posts', label: R.watchedParts.posts, count: g.watched.posts },
    { key: 'threads', label: R.watchedParts.threads, count: g.watched.threads },
  ].filter((p) => p.count > 0);
  // Websites you opened are as personal as searches: blurred with the other personal details.
  const sites = g.topSites.slice(0, 4).map((s, idx) => (hide ? { ...s, label: `Website ${idx + 1}` } : s));

  return (
    <>
      <PageHeader
        tab="overview"
        icon={LayoutGrid}
        title={TABS.overview.title}
        lead={start !== undefined ? R.lead(i.years, fmt.month(start), i.files.json + i.files.media) : undefined}
        stats={[
          { value: `${i.years.toFixed(1)} yrs`, label: 'Of history', icon: CalendarRange, hint: start ? `Since ${fmt.month(start)}` : undefined },
          { value: i.totalEvents, label: 'Records with a date', icon: Footprints },
          { value: i.ads.advertisers, label: 'Businesses with your info', icon: Building2 },
          { value: g.watched.total, label: 'Things you looked at', icon: Eye },
        ]}
      />
      <Body>
        <PlanSummary />
        <Section title="Key findings" lead="Start here. Each card opens the part of your data it describes.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {i.ads.advertisers > 0 && (
              <Finding tab="ads" title={R.findings.advertisers(i.ads.advertisers)} sub={R.findings.advertisersSub(i.ads.uploaded, i.ads.activity)} go={setView}>
                <SplitBar
                  parts={[
                    { label: 'Uploaded a list', value: i.ads.uploaded, color: c('ads') },
                    { label: 'From your activity', value: i.ads.activity, color: c('posts') },
                  ]}
                />
              </Finding>
            )}

            {g.watched.total > 0 && (
              <Finding tab="activity" title={R.findings.watched(g.watched.total)} sub={R.findings.watchedSub} go={setView}>
                <MiniBars items={watchedParts} color={c('search')} />
              </Finding>
            )}

            {g.links > 0 && (
              <Finding tab="activity" title={R.findings.links(g.links)} sub={R.findings.linksSub(g.topSites.length)} go={setView}>
                <MiniBars items={sites} color={c('search')} />
              </Finding>
            )}

            {(g.followers > 0 || g.following > 0) && (
              <Finding tab="people" title={R.findings.follows(g.followers, g.following)} sub={R.findings.followsSub(g.mutual, g.closeFriends)} go={setView}>
                <SplitBar
                  parts={[
                    { label: 'Follow each other', value: g.mutual, color: c('communities') },
                    { label: 'Only you follow them', value: Math.max(0, g.following - g.mutual), color: c('messages') },
                    { label: 'Only they follow you', value: Math.max(0, g.followers - g.mutual), color: c('posts') },
                  ]}
                />
              </Finding>
            )}

            {i.people.sent + i.people.received > 0 && (
              <Finding tab="people" title={R.findings.messages(i.people.sent + i.people.received)} sub={R.findings.messagesSub(i.people.threads)} go={setView}>
                <SplitBar
                  parts={[
                    { label: 'You sent', value: i.people.sent, color: c('messages') },
                    { label: 'You received', value: i.people.received, color: c('security') },
                  ]}
                />
              </Finding>
            )}

            {i.ads.categories.length > 0 && (
              <Finding tab="profile" title={R.findings.categories(i.ads.categories.length)} sub={R.findings.categoriesSub} go={setView}>
                <ul className="flex flex-wrap gap-1.5">
                  {sample(i.ads.categories, 6).map((x) => (
                    <li key={x} className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[12px] text-ink">
                      {x}
                    </li>
                  ))}
                  {i.ads.categories.length > 6 && <li className="self-center px-1 text-[12px] text-ink-3">+{fmt.number(i.ads.categories.length - 6)} more</li>}
                </ul>
              </Finding>
            )}
          </div>
        </Section>

        <Section title={report.overview.yearsTitle} lead={report.overview.yearsNote}>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2" bodyClassName="h-[380px] p-4">
              <YearsChart />
            </Card>
            <Card title="What’s in your download" description="Share of all dated records, by kind">
              <GroupShares />
            </Card>
          </div>
        </Section>
      </Body>
    </>
  );
}
