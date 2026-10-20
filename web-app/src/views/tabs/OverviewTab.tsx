import { useMemo, type CSSProperties, type ReactNode } from 'react';
import type { EChartsOption } from 'echarts';
import { ArrowRight, Building2, CalendarRange, Check, Files, Footprints, LayoutGrid, ListChecks, TriangleAlert, type LucideIcon } from 'lucide-react';
import { usePlan, useTicked } from '../../advice/usePlan';
import { FIX_COPY, planCopy } from '../../i18n/advice';
import { AREA_ICONS } from './PlanTab';
import { Chart } from '../../components/charts/Chart';
import { Body, Card, PageHeader, Section, SplitBar } from '../../components/report/Report';
import { TAB_ICONS } from '../../components/shell/Header';
import { fmt, strings } from '../../i18n/strings';
import { TABS, TAB_HUE, report, type TabId } from '../../i18n/report';
import { useInsights } from '../../insights/useInsights';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { CHROME, GROUP_ORDER, groupColor, groupOf, type CategoryGroup } from '../../theme/tokens';

const R = report.overview;
const NOT_YOURS = ['session_updated', 'notification', 'message_received', 'logged', 'off_meta_activity', 'ad_viewed'];

/** The opening page: headline numbers, six plain-language findings, and the years at a glance. */
export function OverviewTab() {
  const i = useInsights();
  const theme = useUiStore((s) => s.theme);
  const setView = useUiStore((s) => s.setView);
  const c = (g: CategoryGroup) => groupColor(g, theme);
  const typeCount = (t: string) => i.byType.find((r) => r.key === t)?.count ?? 0;
  const start = i.accountCreated ?? i.range?.start;
  const yourActions = i.byType.filter((r) => !NOT_YOURS.includes(r.key)).reduce((s, r) => s + r.count, 0);

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
          { value: i.files.json + i.files.media, label: 'Files in your export', icon: Files, hint: fmt.bytes(i.files.bytes) },
        ]}
      />
      <Body>
        <PlanSummary />
        <Section title="Key findings" lead="Start here. Each card opens the part of your data it describes.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Finding tab="ads" title={R.findings.advertisers(i.ads.advertisers)} sub={R.findings.advertisersSub(i.ads.uploaded, i.ads.activity)} go={setView}>
              <SplitBar
                parts={[
                  { label: 'Uploaded a list', value: i.ads.uploaded, color: c('ads') },
                  { label: 'Shared activity', value: i.ads.activity, color: c('posts') },
                ]}
              />
            </Finding>

            <Finding tab="profile" title={R.findings.interests(i.ads.interests.length)} sub={R.findings.interestsSub} go={setView}>
              <ul className="flex flex-wrap gap-1.5">
                {sample(i.ads.interests, 6).map((x) => (
                  <li key={x} className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[12px] text-ink">
                    {x}
                  </li>
                ))}
                {i.ads.interests.length > 6 && <li className="self-center px-1 text-[12px] text-ink-3">+{fmt.number(i.ads.interests.length - 6)} more</li>}
              </ul>
            </Finding>

            <Finding tab="ads" title={R.findings.offMeta(i.ads.offMetaApps.length)} sub={R.findings.offMetaSub(i.ads.offMetaApps[0]?.label)} go={setView}>
              <MiniBars items={i.ads.offMetaApps.slice(0, 4)} color={c('ads')} />
            </Finding>

            <Finding tab="security" title={R.findings.places(i.security.places.length, i.security.countries.length)} sub={R.findings.placesSub(i.security.devices.length)} go={setView}>
              <MiniBars items={i.security.places.slice(0, 4)} color={c('security')} />
            </Finding>

            <Finding
              tab="activity"
              title={R.findings.logged(yourActions)}
              sub={R.findings.loggedSub(typeCount('reaction'), typeCount('search'), typeCount('item_viewed'))}
              go={setView}
            >
              <Spark values={i.activity.byMonth.counts} color={c('social')} />
            </Finding>

            <Finding tab="people" title={R.findings.messages(i.people.sent + i.people.received)} sub={R.findings.messagesSub(i.people.threads)} go={setView}>
              <SplitBar
                parts={[
                  { label: 'You sent', value: i.people.sent, color: c('messages') },
                  { label: 'You received', value: i.people.received, color: c('security') },
                ]}
              />
            </Finding>
          </div>
        </Section>

        <Section title={R.yearsTitle} lead={R.yearsNote}>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2" bodyClassName="h-[380px] p-4">
              <YearsChart />
            </Card>
            <Card title="What’s in your export" description="Share of all dated records, by kind">
              <GroupShares />
            </Card>
          </div>
        </Section>
      </Body>
    </>
  );
}

/** A whole-card button: tinted icon tile, headline finding, explanation, small visual, destination. */
export function Finding({ tab, title, sub, children, go }: { tab: TabId; title: string; sub: string; children: ReactNode; go: (t: TabId) => void }) {
  const Icon: LucideIcon = TAB_ICONS[tab];
  return (
    <button
      type="button"
      onClick={() => go(tab)}
      style={{ '--tab': TAB_HUE[tab] } as CSSProperties}
      className="card group flex h-full flex-col p-5 text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong"
    >
      <span className="tab-tile grid size-10 place-items-center rounded-xl">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="display mt-4 block text-[21px] font-semibold leading-snug text-ink">{title}</span>
      <span className="mt-2 block text-ink-2">{sub}</span>
      <span className="mt-5 block w-full">{children}</span>
      <span className="mt-auto flex items-center gap-1.5 border-t border-line pt-4 text-[13px] font-medium text-ink-2 transition-colors group-hover:text-ink">
        {TABS[tab].label}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--tab)' }} aria-hidden />
      </span>
    </button>
  );
}

export function MiniBars({ items, color }: { items: { key: string; label: string; count: number }[]; color: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <span className="block space-y-2">
      {items.map((it) => (
        <span key={it.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-[13px]">
          <span className="truncate text-ink">{it.label}</span>
          <span className="num text-ink-3">{fmt.number(it.count)}</span>
          <span className="col-span-2 mt-1 h-1 rounded-full bg-surface-3">
            <span className="block h-full rounded-full" style={{ width: `${(it.count / max) * 100}%`, background: color }} />
          </span>
        </span>
      ))}
    </span>
  );
}

export function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 300;
  const h = 56;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - (v / max) * (h - 6) - 3).toFixed(1)}`).join(' ');
  const id = `spark-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-14 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Evenly spread picks so the preview isn't just the "A"s. */
export const sample = (items: string[], k: number) =>
  items.length <= k ? items : Array.from({ length: k }, (_, i) => items[Math.floor((i * items.length) / k)]!);

export function GroupShares() {
  const events = useDataStore((s) => s.events);
  const theme = useUiStore((s) => s.theme);
  const inspect = useUiStore((s) => s.inspect);
  const rows = useMemo(() => {
    const m = new Map<CategoryGroup, number>();
    for (const e of events) m.set(groupOf(e), (m.get(groupOf(e)) ?? 0) + 1);
    return GROUP_ORDER.map((g) => ({ g, n: m.get(g) ?? 0 }))
      .filter((r) => r.n)
      .sort((a, b) => b.n - a.n);
  }, [events]);
  const total = Math.max(1, events.length);
  return (
    <ul className="-mx-2 space-y-0.5">
      {rows.map(({ g, n }) => (
        <li key={g}>
          <button
            type="button"
            onClick={() => inspect({ title: strings.groups[g], events: events.filter((e) => groupOf(e) === g).reverse() })}
            className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2"
          >
            <span className="size-2.5 rounded-sm" style={{ background: groupColor(g, theme) }} aria-hidden />
            <span className="truncate text-ink">{strings.groups[g]}</span>
            <span className="num text-[13px] text-ink-2">{fmt.percent(n / total)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function YearsChart() {
  const i = useInsights();
  const events = useDataStore((s) => s.events);
  const theme = useUiStore((s) => s.theme);
  const inspect = useUiStore((s) => s.inspect);
  const groups = GROUP_ORDER.filter((g) => i.byYear.series[g].some((v) => v > 0));

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 4, right: 8, top: 52, bottom: 4, containLabel: true },
      legend: { top: 0, left: 0, data: groups.map((g) => strings.groups[g]) },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, order: 'seriesDesc', valueFormatter: (v) => fmt.number(Number(v)) },
      xAxis: { type: 'category', data: i.byYear.years.map(String) },
      yAxis: { type: 'value', splitNumber: 4, axisLabel: { formatter: (v: number) => fmt.compact(v) } },
      series: groups.map((g, idx) => ({
        name: strings.groups[g],
        type: 'bar',
        stack: 'year',
        barMaxWidth: 64,
        itemStyle: { color: groupColor(g, theme), borderColor: CHROME[theme].surface, borderWidth: 1, borderRadius: idx === groups.length - 1 ? [6, 6, 0, 0] : 0 },
        emphasis: { focus: 'series' },
        data: i.byYear.series[g],
      })),
    }),
    [i.byYear, groups.join(','), theme],
  );

  return (
    <Chart
      option={option}
      ariaLabel="Records per year, by kind"
      onEvents={{
        click: (p: any) => {
          const year = i.byYear.years[p.dataIndex];
          const g = groups[p.seriesIndex];
          if (year === undefined || !g) return;
          inspect({
            title: `${strings.groups[g]} in ${year}`,
            events: events.filter((e) => new Date(e.timestamp).getFullYear() === year && groupOf(e) === g).reverse(),
          });
        },
      }}
    />
  );
}

/** The privacy plan at a glance: how many changes are open, the top three, and the way in. */
export function PlanSummary() {
  const plan = usePlan();
  const { ticked } = useTicked();
  const setView = useUiStore((s) => s.setView);
  const openDeepLink = useUiStore((s) => s.openDeepLink);
  if (!plan.all.length) return null;
  const open = plan.todo.filter((p) => !ticked[p.fix.id]);
  const done = plan.done.length + plan.all.filter((p) => p.status !== 'done' && ticked[p.fix.id]).length;
  const top = open.slice(0, 3);

  return (
    <section
      aria-label={planCopy.overview.title}
      className="card mb-14 grid gap-6 overflow-hidden p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:p-7"
      style={{ '--tab': 'var(--plan)', background: 'linear-gradient(135deg, color-mix(in oklab, var(--plan) 12%, var(--surface)) 0%, var(--surface) 60%)' } as CSSProperties}
    >
      <div className="flex flex-col">
        <span className="tab-tile grid size-11 place-items-center rounded-xl">
          <ListChecks className="size-5" aria-hidden />
        </span>
        <h2 className="display mt-4 text-[28px] font-semibold text-ink">{planCopy.overview.title}</h2>
        <p className="mt-2 text-[16px] text-ink-2">{planCopy.progress(open.length, done)}</p>
        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={() => setView('plan')}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-5 font-semibold hover:opacity-90"
            style={{ background: 'var(--plan)', color: 'var(--plan-ink)' }}
          >
            {planCopy.overview.cta}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <ol className="space-y-2">
        {top.length ? (
          top.map((p, idx) => {
            const Icon = AREA_ICONS[p.fix.area];
            return (
              <li key={p.fix.id}>
                <button
                  type="button"
                  onClick={() => openDeepLink({ kind: 'fix', id: p.fix.id })}
                  className="group flex w-full items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-left transition-colors hover:border-line-strong"
                >
                  <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-warning text-[12px] font-bold text-[#10151f]">{idx + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold text-ink">
                      <Icon className="size-4 shrink-0 text-ink-3" aria-hidden />
                      {FIX_COPY[p.fix.id]?.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[13px] text-ink-2">{FIX_COPY[p.fix.id]?.finding(p.evidence.vars, p.status)}</span>
                  </span>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </button>
              </li>
            );
          })
        ) : (
          <li className="flex items-center gap-2 rounded-xl border border-line bg-surface p-4 text-ink-2">
            <Check className="size-4 text-good" aria-hidden /> {planCopy.progress(0, done)}
          </li>
        )}
        {open.length > top.length && (
          <li className="flex items-center gap-1.5 px-1 pt-1 text-[13px] text-ink-3">
            <TriangleAlert className="size-3.5 text-warning" aria-hidden />
            {open.length - top.length} more in your plan
          </li>
        )}
      </ol>
    </section>
  );
}
