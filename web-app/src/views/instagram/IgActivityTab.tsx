import { useMemo } from 'react';
import { Activity, CalendarClock, Clock, Eye, Globe, Heart, ListOrdered, Search, Tv } from 'lucide-react';
import { DAYS, MonthBars, WeekHeatmap, hourLabel } from '../../components/report/ActivityCharts';
import { BarList, Body, Card, PageHeader, Personal, Section, StatTiles } from '../../components/report/Report';
import { PlanLinks } from '../../components/report/PlanLinks';
import { TABS, report, typeLabel } from '../../i18n/report';
import { igReport } from '../../i18n/instagram';
import { useInsights } from '../../insights/useInsights';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { groupColor } from '../../theme/tokens';

const R = igReport.activity;
/** Shown on the People and Logins tabs instead, or not something you did. */
const NOT_HERE = new Set(['message_sent', 'message_received', 'ai_conversation', 'session_updated', 'login', 'logout', 'logged', 'account_activity', 'privacy_changed']);
const WATCH_TYPES = ['story_viewed', 'video_watched', 'post_viewed', 'thread_post_viewed'];

/** What Instagram records about what you do and watch. */
export function IgActivityTab() {
  const i = useInsights();
  const g = i.instagram;
  const theme = useUiStore((s) => s.theme);
  const hide = useUiStore((s) => s.hidePersonal);
  const inspect = useUiStore((s) => s.inspect);
  const events = useDataStore((s) => s.events);
  const color = groupColor('social', theme);
  const browse = groupColor('search', theme);
  const yours = useMemo(() => events.filter((e) => !NOT_HERE.has(e.type)), [events]);
  const kinds = i.byType.filter((r) => !NOT_HERE.has(r.key)).map((r) => ({ ...r, label: typeLabel(r.key) }));
  const total = kinds.reduce((s, r) => s + r.count, 0);
  const ofType = (t: string) => events.filter((e) => e.type === t).reverse();
  const half = Math.ceil(Math.min(kinds.length, 16) / 2);
  const watched = WATCH_TYPES.map((t) => ({ key: t, label: typeLabel(t), count: i.byType.find((r) => r.key === t)?.count ?? 0 })).filter((r) => r.count);
  const masked = <T extends { key: string; label: string }>(items: T[], word: string) => (hide ? items.map((it, idx) => ({ ...it, label: `${word} ${idx + 1}` })) : items);

  return (
    <>
      <PageHeader
        tab="activity"
        icon={Activity}
        title={TABS.activity.title}
        lead={R.lead(total)}
        stats={[
          { value: total, label: R.stats.actions, icon: Activity },
          { value: g.likes, label: R.stats.likes, icon: Heart },
          { value: g.watched.total, label: R.stats.watched, icon: Eye },
          { value: g.links, label: R.stats.links, icon: Globe },
        ]}
      />
      <Body>
        <Section title={R.kindsTitle} lead={report.common.details}>
          <Card bodyClassName="p-5">
            <div className="grid gap-x-10 lg:grid-cols-2">
              <BarList items={kinds.slice(0, half)} color={color} limit={8} onSelect={(t) => inspect({ title: typeLabel(t), events: ofType(t) })} />
              <BarList items={kinds.slice(half)} color={color} limit={8} onSelect={(t) => inspect({ title: typeLabel(t), events: ofType(t) })} />
            </div>
          </Card>
        </Section>

        {g.watched.total > 0 && (
          <Section title={R.watchedTitle} lead={R.watchedLead}>
            <div className="mb-4">
              <StatTiles items={watched.map((w) => ({ value: w.count, label: w.label, icon: Tv, color: browse }))} />
            </div>
            {g.topWatched.length > 0 && (
              <Card title={R.topWatchedTitle} description={R.topWatchedLead} icon={Eye} hue={browse}>
                <BarList
                  items={masked(g.topWatched, 'Account')}
                  color={browse}
                  avatars={!hide}
                  ranked
                  onSelect={(account) => inspect({ title: hide ? 'Account' : account, events: events.filter((e) => WATCH_TYPES.includes(e.type) && e.meta?.account === account).reverse() })}
                />
              </Card>
            )}
          </Section>
        )}

        {g.links > 0 && (
          <Section title={R.linksTitle} lead={R.linksLead(g.links)}>
            <Card title={R.sitesTitle} description={report.common.details} icon={Globe} hue={browse}>
              <BarList
                items={masked(g.topSites, 'Website')}
                color={browse}
                ranked
                onSelect={(site) => inspect({ title: hide ? 'Website' : site, events: ofType('link_visited').filter((e) => e.meta?.domain === site) })}
              />
            </Card>
          </Section>
        )}

        <Section title={R.whenTitle} lead={i.activity.busiest ? R.whenLead(DAYS[i.activity.busiest.day]!, hourLabel(i.activity.busiest.hour)) : undefined}>
          <Card title="Your week, hour by hour" description={R.whenNote} icon={Clock} hue={color} bodyClassName="h-[300px] p-4">
            <WeekHeatmap heat={i.activity.heat} events={yours} ariaLabel="Activity by day of week and hour" />
          </Card>
        </Section>

        <Section title={R.overTimeTitle}>
          <Card title="Actions per month" description="Click a month to see what was recorded" icon={CalendarClock} hue={color} bodyClassName="h-[300px] p-4">
            <MonthBars months={i.activity.byMonth.months} counts={i.activity.byMonth.counts} color={color} events={yours} unit={(n) => `${n} actions`} ariaLabel="Your actions per month" />
          </Card>
        </Section>

        {i.activity.searches > 0 && (
          <Section title={R.searchesTitle(i.activity.searches)} lead={R.searchesLead}>
            <Card icon={Search} hue={browse} title="Most repeated" description={report.common.details}>
              <ol className="space-y-1.5">
                {i.activity.topSearches.map((s, idx) => (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => inspect({ title: hide ? 'Search' : s.label, events: ofType('search').filter((e) => e.text?.trim().toLowerCase() === s.key) })}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
                    >
                      <ListOrdered className="size-3.5 shrink-0 text-ink-3" aria-hidden />
                      <span className="num w-5 text-[12px] text-ink-3">{idx + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-ink">
                        <Personal hidden={hide}>{s.label}</Personal>
                      </span>
                      <span className="num text-[13px] text-ink-2">{report.common.times(s.count)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </Card>
          </Section>
        )}

        <div className="mb-14">
          <PlanLinks ids={['ig_link_history', 'ig_search_history', 'ig_recently_deleted', 'ig_post_details']} />
        </div>
      </Body>
    </>
  );
}
