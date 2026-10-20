import ReactEChartsCore from 'echarts-for-react/esm/core';
import type { EChartsOption } from 'echarts';
import { useEffect, useMemo, useRef } from 'react';
import { chartThemeName, echarts, prefersReducedMotion } from '../../theme/chartTheme';
import { useUiStore } from '../../store/uiStore';

type Handler = (params: any, chart: any) => void;

interface ChartProps {
  option: EChartsOption;
  /** Plain-language description read by screen readers. */
  ariaLabel: string;
  /** ECharts events, e.g. { click: ..., brushEnd: ... }. Every chart should handle at least `click`. */
  onEvents?: Record<string, Handler>;
  onReady?: (chart: any) => void;
  className?: string;
}

/**
 * The one way to render a chart. Applies the shared theme, turns off animation
 * for reduced-motion users, adds screen-reader text and fills its panel.
 */
export function Chart({ option, ariaLabel, onEvents, onReady, className }: ChartProps) {
  const theme = useUiStore((s) => s.theme);
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  // Panels resize when the grid measures itself, when dragged, or when the inspector opens.
  // Watch the container directly so the canvas always fills its panel.
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => chartRef.current?.resize());
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  const finalOption = useMemo<EChartsOption>(
    () => ({
      animation: !prefersReducedMotion(),
      animationDuration: 500,
      animationEasing: 'cubicOut',
      aria: { enabled: true, label: { description: ariaLabel } },
      ...option,
    }),
    [option, ariaLabel],
  );

  return (
    <div ref={box} role="img" aria-label={ariaLabel} className={className ?? 'h-full w-full'}>
      <ReactEChartsCore
        // Re-mount on theme change so ECharts picks up the new theme.
        key={theme}
        echarts={echarts}
        option={finalOption}
        theme={chartThemeName(theme)}
        notMerge
        lazyUpdate
        style={{ height: '100%', width: '100%' }}
        onEvents={onEvents}
        onChartReady={(chart: any) => {
          chartRef.current = chart;
          onReady?.(chart);
        }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
