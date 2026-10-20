import * as echarts from 'echarts/core';
import { BarChart, LineChart, HeatmapChart, TreemapChart, GraphChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  BrushComponent,
  ToolboxComponent,
  VisualMapComponent,
  MarkLineComponent,
  MarkPointComponent,
  AriaComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { CHROME, GROUP_ORDER, groupColor, type ThemeMode } from './tokens';

/*
 * Only the chart types we use are bundled, which keeps the download small.
 * Add new ones here when a panel needs them.
 */
echarts.use([
  BarChart,
  LineChart,
  HeatmapChart,
  TreemapChart,
  GraphChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  BrushComponent,
  ToolboxComponent,
  VisualMapComponent,
  MarkLineComponent,
  MarkPointComponent,
  AriaComponent,
  CanvasRenderer,
]);

const SANS = "'Public Sans Variable', ui-sans-serif, system-ui, sans-serif";
const MONO = SANS;

function buildTheme(mode: ThemeMode) {
  const c = CHROME[mode];
  const axis = {
    axisLine: { show: true, lineStyle: { color: c.border } },
    axisTick: { show: false },
    axisLabel: { color: c.text3, fontFamily: SANS, fontSize: 11 },
    splitLine: { show: true, lineStyle: { color: c.grid, width: 1 } },
    splitArea: { show: false },
    nameTextStyle: { color: c.text3, fontFamily: MONO, fontSize: 10 },
  };
  return {
    color: GROUP_ORDER.map((g) => groupColor(g, mode)),
    backgroundColor: 'transparent',
    textStyle: { fontFamily: SANS, color: c.text2 },
    grid: { left: 8, right: 8, top: 12, bottom: 8, containLabel: true },
    categoryAxis: { ...axis, splitLine: { show: false } },
    valueAxis: { ...axis, axisLine: { show: false } },
    timeAxis: { ...axis, splitLine: { show: false } },
    legend: {
      textStyle: { color: c.text2, fontFamily: SANS, fontSize: 12 },
      itemWidth: 10,
      itemHeight: 10,
      icon: 'roundRect',
      inactiveColor: c.text3,
    },
    tooltip: {
      backgroundColor: c.tooltip,
      borderColor: c.border,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: c.text, fontFamily: SANS, fontSize: 12 },
      extraCssText: 'border-radius:8px;box-shadow:0 8px 24px rgb(0 0 0 / 0.25);',
      axisPointer: {
        lineStyle: { color: c.text3, width: 1, type: 'dashed' },
        crossStyle: { color: c.text3 },
        shadowStyle: { color: 'rgba(127,127,127,0.08)' },
      },
    },
    dataZoom: {
      backgroundColor: 'transparent',
      borderColor: c.border,
      fillerColor: 'rgba(139,152,255,0.14)',
      handleStyle: { color: c.surface, borderColor: c.accent },
      moveHandleStyle: { color: c.border },
      textStyle: { color: c.text3, fontFamily: MONO, fontSize: 10 },
      dataBackground: { lineStyle: { color: c.border }, areaStyle: { color: c.grid } },
    },
    line: { symbol: 'none', lineStyle: { width: 2 }, smooth: false },
    bar: { itemStyle: { borderRadius: [4, 4, 0, 0] } },
  };
}

echarts.registerTheme('footprint-dark', buildTheme('dark'));
echarts.registerTheme('footprint-light', buildTheme('light'));

export const chartThemeName = (mode: ThemeMode) => `footprint-${mode}`;

export const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export { echarts, MONO, SANS };
