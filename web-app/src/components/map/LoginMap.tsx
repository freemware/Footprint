/**
 * World map of where the account was used. Fully offline: country outlines are bundled
 * (Natural Earth via world-atlas) and places are looked up in the bundled GeoNames lists.
 * This module is loaded only when the map is shown.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { report } from '../../i18n/report';
import type { EChartsOption } from 'echarts';
import { GeoComponent } from 'echarts/components';
import { EffectScatterChart } from 'echarts/charts';
import { feature } from 'topojson-client';
import type { FeatureCollection } from 'geojson';
import { Maximize, Minus, Plus, Scan } from 'lucide-react';
import world from 'world-atlas/countries-110m.json';
import { Chart } from '../charts/Chart';
import { echarts } from '../../theme/chartTheme';
import { fmt } from '../../i18n/strings';
import { geocode } from '../../geo/geocode';
import type { ActivityEvent, Collections } from '../../model/types';
import { useUiStore } from '../../store/uiStore';
import { CHROME, groupColor } from '../../theme/tokens';

echarts.use([GeoComponent, EffectScatterChart]);
if (!echarts.getMap('world')) {
  const topo = world as unknown as Parameters<typeof feature>[0] & { objects: { countries: Parameters<typeof feature>[1] } };
  const geo = feature(topo, topo.objects.countries) as unknown as FeatureCollection;
  // Antarctica takes a lot of room and never has logins.
  geo.features = geo.features.filter((f) => f.id !== '010');
  // Shapes that cross the date line (Russia, Fiji) would draw lines across the whole map.
  // Unwrap their longitudes so each ring stays continuous.
  const unwrap = (ring: number[][]) => {
    let shift = 0;
    return ring.map((pt, i) => {
      if (i > 0) {
        const prev = ring[i - 1]![0]! + shift;
        const d = pt[0]! + shift - prev;
        if (d > 180) shift -= 360;
        else if (d < -180) shift += 360;
      }
      return [pt[0]! + shift, pt[1]!];
    });
  };
  for (const f of geo.features) {
    const g = f.geometry as { type: string; coordinates: number[][][] | number[][][][] };
    if (g.type === 'Polygon') g.coordinates = (g.coordinates as number[][][]).map(unwrap);
    else if (g.type === 'MultiPolygon') g.coordinates = (g.coordinates as number[][][][]).map((poly) => poly.map(unwrap));
  }
  echarts.registerMap('world', geo as never);
}

interface Place {
  key: string;
  city: string;
  region?: string;
  country?: string;
  countryCode: string;
  events: ActivityEvent[];
  first: number;
  last: number;
  lat?: number;
  lng?: number;
  approximate?: boolean;
}

export default function LoginMap({ events, lastLocation, hidden }: { events: ActivityEvent[]; lastLocation?: Collections['lastLocation']; hidden: boolean }) {
  const theme = useUiStore((s) => s.theme);
  const inspect = useUiStore((s) => s.inspect);
  const chartRef = useRef<any>(null);

  // Group account records by place.
  const grouped = useMemo(() => {
    const m = new Map<string, Place>();
    for (const e of events) {
      const l = e.location;
      if (!l?.city || !l.countryCode) continue;
      const key = `${l.city}|${l.region ?? ''}|${l.countryCode}`;
      const p = m.get(key) ?? { key, city: l.city, region: l.region, country: l.country, countryCode: l.countryCode, events: [], first: e.timestamp, last: e.timestamp };
      p.events.push(e);
      p.first = Math.min(p.first, e.timestamp);
      p.last = Math.max(p.last, e.timestamp);
      m.set(key, p);
    }
    return [...m.values()].sort((a, b) => b.events.length - a.events.length);
  }, [events]);

  const [found, setPlaces] = useState<Place[] | null>(null);
  // Places whose city wasn't in the offline place list can only be drawn at the middle of their
  // country, which isn't where the account was used. They stay off the map unless asked for.
  const [showApprox, setShowApprox] = useState(false);
  const approxCount = (found ?? []).filter((p) => p.approximate).length;
  const places = useMemo(() => (found === null ? null : found.filter((p) => showApprox || !p.approximate)), [found, showApprox]);
  useEffect(() => {
    let alive = true;
    geocode(grouped.map((p) => ({ city: p.city, region: p.region, countryCode: p.countryCode }))).then((hits) => {
      if (!alive) return;
      setPlaces(grouped.map((p, i) => (hits[i] ? { ...p, ...hits[i]! } : p)).filter((p) => p.lat !== undefined));
    });
    return () => {
      alive = false;
    };
  }, [grouped]);

  // Initial view: fit the places, with some room around them.
  const fit = useMemo(() => {
    const pts = (places ?? []).filter((p) => !p.approximate);
    if (lastLocation) pts.push({ lat: lastLocation.lat, lng: lastLocation.lng } as Place);
    if (!pts.length) return { center: [10, 25] as [number, number], zoom: 1 };
    const lats = pts.map((p) => p.lat!);
    const lngs = pts.map((p) => p.lng!);
    const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    const span = Math.max((maxLng - minLng) * 1.4, (maxLat - minLat) * 2.4, 6);
    return { center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2] as [number, number], zoom: Math.min(30, Math.max(1, 300 / span)) };
  }, [places, lastLocation]);

  const color = groupColor('security', theme);
  const pinColor = groupColor('posts', theme);
  const c = CHROME[theme];
  const max = Math.max(1, ...(places ?? []).map((p) => p.events.length));
  const size = (n: number) => 7 + Math.sqrt(n / max) * 26;

  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => {
          const d = p.data?.place as Place | undefined;
          if (!d) return p.name ?? '';
          const where = [d.city, d.region, d.country].filter(Boolean).join(', ');
          return `<b>${hidden ? '••••' : where}</b><br/>${fmt.number(d.events.length)} records<br/><span style="opacity:.7">${fmt.date(d.first)} – ${fmt.date(d.last)}${d.approximate ? '<br/>City not found; shown at country level' : ''}</span>`;
        },
      },
      geo: {
        map: 'world',
        roam: true,
        center: fit.center,
        zoom: fit.zoom,
        scaleLimit: { min: 1, max: 60 },
        itemStyle: { areaColor: theme === 'dark' ? '#1f2837' : '#e3e8f0', borderColor: theme === 'dark' ? '#33405a' : '#c3ccda', borderWidth: 0.6 },
        emphasis: { disabled: true },
        select: { disabled: true },
        tooltip: { show: false },
      },
      series: [
        {
          name: 'Places',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: (places ?? []).slice(1).map((p) => ({ name: p.city, value: [p.lng!, p.lat!, p.events.length], place: p, symbolSize: size(p.events.length) })),
          itemStyle: { color, opacity: 0.85, borderColor: c.surface, borderWidth: 1.5 },
          emphasis: { scale: 1.15, itemStyle: { borderColor: c.text } },
        },
        {
          // The most used place pulses gently so the eye lands there first.
          name: 'Most used',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          rippleEffect: { scale: 2.6, brushType: 'stroke', number: 2 },
          showEffectOn: 'render',
          data: (places ?? []).slice(0, 1).map((p) => ({ name: p.city, value: [p.lng!, p.lat!, p.events.length], place: p, symbolSize: size(p.events.length) })),
          itemStyle: { color, borderColor: c.surface, borderWidth: 1.5 },
          zlevel: 1,
        },
        ...(lastLocation
          ? [
              {
                name: 'Last location',
                type: 'scatter' as const,
                coordinateSystem: 'geo' as const,
                symbol: 'pin',
                symbolSize: 30,
                itemStyle: { color: pinColor, borderColor: c.surface, borderWidth: 1 },
                tooltip: { formatter: () => `<b>${report.profile.lastLocation}</b>${lastLocation.time ? `<br/>${fmt.dateTime(lastLocation.time)}` : ''}` },
                data: [{ name: 'Last location', value: [lastLocation.lng, lastLocation.lat] }],
              },
            ]
          : []),
      ],
    }),
    [places, fit, color, pinColor, c, theme, hidden, lastLocation, max],
  );

  const zoomBy = (f: number) => {
    const chart = chartRef.current;
    if (!chart) return;
    const geo = chart.getOption().geo?.[0];
    chart.setOption({ geo: { zoom: Math.min(60, Math.max(1, (geo?.zoom ?? 1) * f)) } });
  };
  const setView = (center: [number, number], zoom: number) => chartRef.current?.setOption({ geo: { center, zoom } });

  const btn = 'grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-3 hover:text-ink';
  return (
    <div className="relative h-full">
      {places === null ? (
        <div className="grid h-full place-items-center text-ink-3">Placing your locations…</div>
      ) : (
        <Chart
          option={option}
          ariaLabel={`Map of ${places.length} places where your account was used${approxCount && !showApprox ? `; ${approxCount} more could only be matched to a country and aren't shown` : ''}`}
          onReady={(chart) => (chartRef.current = chart)}
          onEvents={{
            click: (p: any) => {
              const d = p.data?.place as Place | undefined;
              if (d) inspect({ title: hidden ? 'Place' : [d.city, d.country].filter(Boolean).join(', '), events: [...d.events].reverse() });
            },
          }}
        />
      )}
      <div className="absolute top-3 right-3 flex flex-col gap-1 rounded-xl border border-line bg-surface/90 p-1 shadow-[var(--shadow-card)] backdrop-blur">
        <button type="button" className={btn} onClick={() => zoomBy(1.6)} aria-label="Zoom in" title="Zoom in">
          <Plus className="size-4" />
        </button>
        <button type="button" className={btn} onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out" title="Zoom out">
          <Minus className="size-4" />
        </button>
        <button type="button" className={btn} onClick={() => setView(fit.center, fit.zoom)} aria-label="Fit your places" title="Fit your places">
          <Scan className="size-4" />
        </button>
        <button type="button" className={btn} onClick={() => setView([10, 25], 1)} aria-label="Whole world" title="Whole world">
          <Maximize className="size-4" />
        </button>
      </div>
      <ul className="pointer-events-none absolute bottom-3 left-3 flex max-w-[calc(100%-5rem)] flex-wrap gap-3 rounded-xl border border-line bg-surface/90 px-3 py-2 text-[12px] text-ink-2 backdrop-blur">
        {(found?.length ?? 0) > 0 && (
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden />
            Account used here (bigger = more often)
          </li>
        )}
        {lastLocation && (
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: pinColor }} aria-hidden />
            {report.profile.lastLocation}
          </li>
        )}
        {approxCount > 0 && (
          <li className="pointer-events-auto flex items-center gap-1.5">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" checked={showApprox} onChange={(e) => setShowApprox(e.target.checked)} className="size-3.5 accent-[var(--accent)]" />
              {approxCount === 1 ? 'Show 1 place' : `Show ${approxCount} places`} we could only match to a country
            </label>
          </li>
        )}
      </ul>
    </div>
  );
}
