import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Chart } from '../charts/Chart';
import { fmt } from '../../i18n/strings';
import type { ActivityEvent } from '../../model/types';
import { monthEnd } from '../../model/aggregate';
import { useUiStore } from '../../store/uiStore';
import { CHROME, SEQUENTIAL } from '../../theme/tokens';

/** Weekday names and hour labels in the reader's language. */
export const DAYS = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(new Date(2024, 0, 1 + i)));
const SHORT_DAYS = DAYS.map((d) => d.slice(0, 3));
export const hourLabel = (h: number) => new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(new Date(2024, 0, 1, h));

/** Day × hour heatmap. Clicking a square opens the records from that hour of the week. */
export function WeekHeatmap({ heat, events, ariaLabel }: { heat: [number, number, number][]; events: ActivityEvent[]; ariaLabel: string }) {
  const theme = useUiStore((s) => s.theme);
  const inspect = useUiStore((s) => s.inspect);
  const max = Math.max(1, ...heat.map((c) => c[2]));
  const option = useMemo<EChartsOption>(
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
          data: heat,
          itemStyle: { borderColor: CHROME[theme].surface, borderWidth: 3, borderRadius: 5 },
          emphasis: { itemStyle: { borderColor: CHROME[theme].accent, borderWidth: 2 } },
        },
      ],
    }),
    [heat, max, theme],
  );
  return (
    <Chart
      option={option}
      ariaLabel={ariaLabel}
      onEvents={{
        click: (p: any) => {
          const [h, d] = p.data as [number, number, number];
          inspect({
            title: `${DAYS[d]}, ${hourLabel(h)}`,
            events: events
              .filter((e) => {
                const dt = new Date(e.timestamp);
                return dt.getHours() === h && (dt.getDay() + 6) % 7 === d;
              })
              .reverse(),
          });
        },
      }}
    />
  );
}

/** Records per month as bars, with the monthly average and the busiest month marked. Click a month to see it. */
export function MonthBars({
  months,
  counts,
  color,
  events,
  unit,
  ariaLabel,
}: {
  months: number[];
  counts: number[];
  color: string;
  events: ActivityEvent[];
  unit: (n: number) => string;
  ariaLabel: string;
}) {
  const theme = useUiStore((s) => s.theme);
  const inspect = useUiStore((s) => s.inspect);
  const peak = counts.indexOf(Math.max(...counts));
  const avg = counts.length ? counts.reduce((s, n) => s + n, 0) / counts.length : 0;
  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 4, right: 8, top: 28, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => unit(Number(v)) },
      xAxis: { type: 'category', data: months.map((m) => fmt.month(m)) },
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
    [months, counts, color, theme, peak, avg, unit],
  );
  return (
    <Chart
      option={option}
      ariaLabel={ariaLabel}
      onEvents={{
        click: (p: any) => {
          const m = months[p.dataIndex];
          if (m === undefined) return;
          inspect({ title: fmt.month(m), events: events.filter((e) => e.timestamp >= m && e.timestamp <= monthEnd(m)).reverse() });
        },
      }}
    />
  );
}
