import { useEffect, useMemo, useRef, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { CalendarArrowDown, CalendarArrowUp, Hash, ListOrdered, Shapes, X } from 'lucide-react';
import { Chart } from '../../components/charts/Chart';
import { Body, Card, PageHeader, SearchBox } from '../../components/report/Report';
import { fmt, strings } from '../../i18n/strings';
import { TABS, report, typeLabel } from '../../i18n/report';
import { countByMonthByGroup, monthEnd, monthStart } from '../../model/aggregate';
import type { ActivityEvent } from '../../model/types';
import { useDataStore } from '../../store/dataStore';
import { useInsights } from '../../insights/useInsights';
import { useFilterStore } from '../../store/filterStore';
import { useUiStore } from '../../store/uiStore';
import { CHROME, GROUP_ORDER, groupColor, groupOf, type CategoryGroup } from '../../theme/tokens';

const R = report.timeline;
const PAGE = 100;

/** Every dated record: a brushable chart over the whole history, kind filters, search, and the list. */
export function TimelineTab() {
  const i = useInsights();
  const all = useDataStore((s) => s.events);
  const theme = useUiStore((s) => s.theme);
  const inspect = useUiStore((s) => s.inspect);
  const dateRange = useFilterStore((s) => s.filters.dateRange);
  const setDateRange = useFilterStore((s) => s.setDateRange);
  const [groups, setGroups] = useState<Set<CategoryGroup>>(new Set());
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const byKind = useMemo(() => (groups.size ? all.filter((e) => groups.has(groupOf(e))) : all), [all, groups]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return byKind.filter(
      (e) =>
        (!dateRange || (e.timestamp >= dateRange[0] && e.timestamp <= dateRange[1])) &&
        (!s || `${e.title ?? ''} ${e.text ?? ''}`.toLowerCase().includes(s)),
    );
  }, [byKind, dateRange, q]);
  useEffect(() => {
    setLimit(PAGE);
  }, [groups, q, dateRange]);

  const toggle = (g: CategoryGroup) =>
    setGroups((cur) => {
      const next = new Set(cur);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  const present = GROUP_ORDER.filter((g) => all.some((e) => groupOf(e) === g));

  const rows: ActivityEvent[] = [];
  for (let i = shown.length - 1; i >= 0 && rows.length < limit; i--) rows.push(shown[i]!);

  return (
    <>
      <PageHeader
        tab="timeline"
        icon={ListOrdered}
        title={TABS.timeline.title}
        lead={R.lead}
        stats={[
          { value: all.length, label: 'Dated records', icon: Hash },
          { value: all[0] ? fmt.month(all[0].timestamp) : '—', label: 'Oldest record', icon: CalendarArrowUp },
          { value: all.length ? fmt.month(all[all.length - 1]!.timestamp) : '—', label: 'Newest record', icon: CalendarArrowDown },
          { value: present.length, label: 'Kinds of activity', icon: Shapes },
        ]}
      />
      <Body>
      <Card className="mb-6" bodyClassName="p-4">
        <TimelineChart events={byKind} span={all} start={i.chartStart} />
        {i.beforeChart > 0 && (
          <p className="mt-2 text-[12px] text-ink-3">
            {R.olderNote(i.beforeChart, i.chartStart ? fmt.month(i.chartStart) : '')}
          </p>
        )}
        {dateRange && (
          <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-2">
            Showing {fmt.date(dateRange[0])} – {fmt.date(dateRange[1])}
            <button
              type="button"
              onClick={() => setDateRange(undefined)}
              className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-ink hover:border-line-strong"
            >
              <X className="size-3" aria-hidden /> Show all dates
            </button>
          </div>
        )}
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Kinds of activity">
        <button
          type="button"
          onClick={() => setGroups(new Set())}
          aria-pressed={groups.size === 0}
          className={`rounded-full border px-3 py-1 text-[13px] ${groups.size === 0 ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-2 hover:text-ink'}`}
        >
          {R.allKinds}
        </button>
        {present.map((g) => {
          const on = groups.has(g);
          return (
            <button
              key={g}
              type="button"
              onClick={() => toggle(g)}
              aria-pressed={on}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] ${on ? 'border-ink-2 bg-surface-3 text-ink' : 'border-line text-ink-2 hover:text-ink'}`}
            >
              <span className="size-2.5 rounded-sm" style={{ background: groupColor(g, theme) }} aria-hidden />
              {strings.groups[g]}
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={q} onChange={setQ} placeholder={R.search} />
        <span className="text-[13px] text-ink-3">{R.shown(rows.length, shown.length)}</span>
      </div>

      <Card className="mb-14" bodyClassName="p-0">
        <ol className="divide-y divide-line">
          {rows.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => inspect({ title: e.title ?? typeLabel(e.type), subtitle: fmt.dateTime(e.timestamp), events: [e] })}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 px-5 py-3 text-left hover:bg-surface-2 sm:grid-cols-[180px_auto_minmax(0,1fr)]"
              >
                <span className="num text-[13px] text-ink-3">{fmt.dateTime(e.timestamp)}</span>
                <span className="mt-1.5 hidden size-2.5 rounded-sm sm:block" style={{ background: groupColor(groupOf(e), theme) }} aria-hidden />
                <span className="col-span-2 min-w-0 sm:col-span-1">
                  <span className="block truncate text-ink">{e.title ?? typeLabel(e.type)}</span>
                  {e.text && <span className="block truncate text-[13px] text-ink-2">{e.text}</span>}
                  <span className="block text-[12px] text-ink-3">{typeLabel(e.type)}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        {shown.length > rows.length && (
          <div className="border-t border-line p-3 text-center">
            <button type="button" onClick={() => setLimit(limit + PAGE * 3)} className="text-[13px] font-medium text-accent hover:underline">
              {R.more}
            </button>
          </div>
        )}
      </Card>
      </Body>
    </>
  );
}

function TimelineChart({ events, span, start }: { events: ActivityEvent[]; span: ActivityEvent[]; start?: number }) {
  const theme = useUiStore((s) => s.theme);
  const dateRange = useFilterStore((s) => s.filters.dateRange);
  const setDateRange = useFilterStore((s) => s.setDateRange);
  const chartRef = useRef<any>(null);
  const first = start ?? span[0]?.timestamp;
  const last = span[span.length - 1]?.timestamp;
  const data = useMemo(() => (first !== undefined && last !== undefined ? countByMonthByGroup(events, first, last) : null), [events, first, last]);
  const groups = data ? GROUP_ORDER.filter((g) => data.series[g].some((v) => v > 0)) : [];

  const option = useMemo<EChartsOption | null>(() => {
    if (!data) return null;
    return {
      grid: { left: 4, right: 8, top: 12, bottom: 4, containLabel: true },
      xAxis: { type: 'category', data: data.months.map((m) => fmt.month(m)), axisLabel: { hideOverlap: true } },
      yAxis: { type: 'value', splitNumber: 3, axisLabel: { formatter: (v: number) => fmt.compact(v) } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, order: 'seriesDesc', valueFormatter: (v) => fmt.number(Number(v)) },
      brush: {
        xAxisIndex: 0,
        brushType: 'lineX',
        brushMode: 'single',
        transformable: true,
        throttleType: 'debounce',
        throttleDelay: 200,
        brushStyle: { color: 'rgba(139,152,255,0.14)', borderColor: CHROME[theme].accent, borderWidth: 1 },
        outOfBrush: { colorAlpha: 0.25 },
      },
      toolbox: { show: false },
      series: groups.map((g) => ({
        name: strings.groups[g],
        type: 'bar' as const,
        stack: 'all',
        barCategoryGap: '20%',
        itemStyle: { color: groupColor(g, theme) },
        data: data.series[g],
      })),
    };
  }, [data, groups.join(','), theme]);

  // Keep the drawn selection in sync when the range is cleared or set elsewhere.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data) return;
    if (!dateRange) chart.dispatchAction({ type: 'brush', areas: [] });
    else {
      const a = data.months.findIndex((m) => m >= monthStart(dateRange[0]));
      let b = data.months.findIndex((m) => m > dateRange[1]);
      b = b === -1 ? data.months.length - 1 : b - 1;
      if (a >= 0 && b >= a) chart.dispatchAction({ type: 'brush', areas: [{ brushType: 'lineX', xAxisIndex: 0, coordRange: [a, b] }] });
    }
  }, [dateRange, data]);

  if (!option || !data) return null;
  return (
    <div className="h-[200px]">
      <Chart
        option={option}
        ariaLabel="Records per month across your whole history. Drag to pick a period."
        onReady={(chart) => {
          chartRef.current = chart;
          chart.dispatchAction({ type: 'takeGlobalCursor', key: 'brush', brushOption: { brushType: 'lineX', brushMode: 'single' } });
        }}
        onEvents={{
          brushEnd: (params: any) => {
            const range = params.areas?.[0]?.coordRange as [number, number] | undefined;
            if (!range) return setDateRange(undefined);
            const s = data.months[Math.max(0, Math.round(range[0]))];
            const e = data.months[Math.min(data.months.length - 1, Math.round(range[1]))];
            if (s !== undefined && e !== undefined) setDateRange([s, monthEnd(e)]);
          },
          click: (p: any) => {
            const m = data.months[p.dataIndex];
            if (m !== undefined) setDateRange([m, monthEnd(m)]);
          },
        }}
      />
    </div>
  );
}
