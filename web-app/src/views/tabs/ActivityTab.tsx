import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Activity, CalendarClock, Clock, Eye, ListOrdered, Search, ShoppingBag, UserSearch } from 'lucide-react';
import { Chart } from '../../components/charts/Chart';
import { BarList, Body, Card, PageHeader, Personal, Section } from '../../components/report/Report';
import { PlanLinks } from '../../components/report/PlanLinks';
import { fmt } from '../../i18n/strings';
import { TABS, report, typeLabel } from '../../i18n/report';
import { useInsights } from '../../insights/useInsights';
import { monthEnd } from '../../model/aggregate';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { CHROME, SEQUENTIAL, groupColor } from '../../theme/tokens';

const R = report.activity;
const DAYS = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(new Date(2024, 0, 1 + i)));
const SHORT_DAYS = DAYS.map((d) => d.slice(0, 3));
const hourLabel = (h: number) => new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(new Date(2024, 0, 1, h));
/** Shown on the People and Security tabs instead, or not something you did. */
const NOT_HERE = new Set(['message_sent', 'message_received', 'session_updated', 'session_started', 'login', 'logout', 'logged']);

export function ActivityTab() {
  const i = useInsights();
  const theme = useUiStore((s) => s.theme);
  const hide = useUiStore((s) => s.hidePersonal);
  const inspect = useUiStore((s) => s.inspect);
  const events = useDataStore((s) => s.events);
  const color = groupColor('social', theme);
  const browse = groupColor('search', theme);
  const kinds = i.byType.filter((r) => !NOT_HERE.has(r.key)).map((r) => ({ ...r, label: typeLabel(r.key) }));
  const total = kinds.reduce((s, r) => s + r.count, 0);
  const max = Math.max(1, ...i.activity.heat.map((c) => c[2]));
  const counts = i.activity.byMonth.counts;
  const peak = counts.indexOf(Math.max(...counts));
  const avg = counts.length ? counts.reduce((s, n) => s + n, 0) / counts.length : 0;

  const heatOption = useMemo<EChartsOption>(
    () => ({
      grid: { left: 4, right: 4, top: 4, bottom: 4, containLabel: true },
      tooltip: {
        formatter: (p: any) => {
          const [h, d, n] = p.data as [number, number, number];
          return `${DAYS[d]}, ${hourLabel(h)}<br/><b>${fmt.number(n)}</b> actions`;
        },
      },
      xAxis: { type: 'category', data: Array.from({ length: 24 }, (_, h) => hourLabel(h)), axisLine: { show: false }, axisLabel: { interval: 3 } },
      yAxis: { type: 'category', data: SHORT_DAYS, inverse: true, axisLine: { show: false }, splitLine: { show: false } },
      visualMap: { show: false, min: 0, max, inRange: { color: SEQUENTIAL[theme] } },
      series: [
        {
          type: 'heatmap',
          data: i.activity.heat,
          itemStyle: { borderColor: CHROME[theme].surface, borderWidth: 3, borderRadius: 5 },
          emphasis: { itemStyle: { borderColor: CHROME[theme].accent, borderWidth: 2 } },
        },
      ],
    }),
    [i.activity.heat, max, theme],
  );

  const monthOption = useMemo<EChartsOption>(
    () => ({
      grid: { left: 4, right: 8, top: 28, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => `${fmt.number(Number(v))} actions` },
      xAxis: { type: 'category', data: i.activity.byMonth.months.map((m) => fmt.month(m)) },
      yAxis: { type: 'value', splitNumber: 3, axisLabel: { formatter: (v: number) => fmt.compact(v) } },
      series: [
        {
          type: 'bar',
          data: counts,
          barMaxWidth: 16,
          itemStyle: { color, borderRadius: [4, 4, 0, 0] },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: CHROME[theme].text3, type: 'dashed' },
            label: { color: CHROME[theme].text3, formatter: `Monthly average ${fmt.number(Math.round(avg))}`, position: 'insideEndTop', fontSize: 11 },
            data: [{ yAxis: avg }],
          },
          markPoint:
            peak >= 0
              ? {
                  symbol: 'roundRect',
                  symbolSize: [86, 22],
                  symbolOffset: [0, -16],
                  itemStyle: { color: CHROME[theme].tooltip, borderColor: CHROME[theme].border, borderWidth: 1 },
                  label: { color: CHROME[theme].text, fontSize: 11, formatter: 'Busiest month' },
                  data: [{ name: 'peak', coord: [peak, counts[peak]!] }],
                }
              : undefined,
        },
      ],
    }),
    [i.activity.byMonth, color, theme, peak, avg, counts],
  );

  const ofType = (t: string) => events.filter((e) => e.type === t).reverse();

  return (
    <>
      <PageHeader
        tab="activity"
        icon={Activity}
        title={TABS.activity.title}
        lead={R.lead(total)}
        stats={[
          { value: total, label: 'Actions recorded', icon: Activity },
          { value: i.activity.searches, label: 'Searches saved', icon: Search },
          { value: i.activity.profileVisits, label: 'Profiles you viewed', icon: UserSearch },
          { value: i.activity.itemsViewed, label: 'Marketplace items viewed', icon: ShoppingBag },
        ]}
      />
      <Body>
        <Section title={R.kindsTitle} lead={report.common.details}>
          <Card bodyClassName="p-5">
            <div className="grid gap-x-10 lg:grid-cols-2">
              <BarList items={kinds.slice(0, Math.ceil(Math.min(kinds.length, 16) / 2))} color={color} limit={8} onSelect={(t) => inspect({ title: typeLabel(t), events: ofType(t) })} />
              <BarList items={kinds.slice(Math.ceil(Math.min(kinds.length, 16) / 2))} color={color} limit={8} onSelect={(t) => inspect({ title: typeLabel(t), events: ofType(t) })} />
            </div>
          </Card>
        </Section>

        <Section title={R.whenTitle} lead={i.activity.busiest ? R.whenLead(DAYS[i.activity.busiest.day]!, hourLabel(i.activity.busiest.hour)) : undefined}>
          <Card title="Your week, hour by hour" description={R.whenNote} icon={Clock} hue={color} bodyClassName="h-[300px] p-4">
            <Chart
              option={heatOption}
              ariaLabel="Activity by day of week and hour"
              onEvents={{
                click: (p: any) => {
                  const [h, d] = p.data as [number, number, number];
                  inspect({
                    title: `${DAYS[d]}, ${hourLabel(h)}`,
                    events: events
                      .filter((e) => {
                        const dt = new Date(e.timestamp);
                        return dt.getHours() === h && (dt.getDay() + 6) % 7 === d && !NOT_HERE.has(e.type) && e.type !== 'notification';
                      })
                      .reverse(),
                  });
                },
              }}
            />
          </Card>
        </Section>

        <Section title={R.overTimeTitle}>
          <Card title="Actions per month" description="Click a month to see what was recorded" icon={CalendarClock} hue={color} bodyClassName="h-[300px] p-4">
            <Chart
              option={monthOption}
              ariaLabel="Your actions per month"
              onEvents={{
                click: (p: any) => {
                  const m = i.activity.byMonth.months[p.dataIndex];
                  if (m === undefined) return;
                  inspect({ title: fmt.month(m), events: events.filter((e) => e.timestamp >= m && e.timestamp <= monthEnd(m) && !NOT_HERE.has(e.type)).reverse() });
                },
              }}
            />
          </Card>
        </Section>

        <Section title={R.lookupsTitle} lead={R.lookupsLead}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={R.searchesTitle(i.activity.searches)} description="Your most repeated searches" icon={Search} hue={browse}>
              <BarList
                items={i.activity.topSearches.map((r) => ({ ...r, label: <Personal hidden={hide}>{r.label}</Personal> }))}
                color={browse}
                ranked
                unit={report.common.times}
                onSelect={(q) => inspect({ title: `“${q}”`, events: ofType('search').filter((e) => e.text?.trim().toLowerCase() === q) })}
              />
            </Card>
            <Card title={R.visitsTitle(i.activity.profileVisits)} description="The profiles you opened most" icon={Eye} hue={browse}>
              <BarList
                items={i.activity.topVisited.map((r) => ({ ...r, name: hide ? ' ' : r.label, label: <Personal hidden={hide}>{r.label}</Personal> }))}
                color={browse}
                avatars
                unit={report.common.times}
                onSelect={(name) => inspect({ title: name, events: ofType('profile_visit').filter((e) => e.people?.[0] === name) })}
              />
            </Card>
          </div>
        </Section>

        <div className="mb-14 flex flex-col gap-3">
          <PlanLinks ids={['search_history', 'old_posts', 'future_posts']} />
          <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
            <ListOrdered className="size-4" aria-hidden /> Every individual record is in the Timeline tab.
          </p>
        </div>
      </Body>
    </>
  );
}
