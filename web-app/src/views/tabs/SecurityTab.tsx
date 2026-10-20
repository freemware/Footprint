import { lazy, Suspense, useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Fingerprint, Globe2, KeyRound, Laptop, LogIn, MapPin, MonitorSmartphone, ShieldHalf, Smartphone } from 'lucide-react';
import { Chart } from '../../components/charts/Chart';
import { BarList, Body, Card, PageHeader, Personal, Section } from '../../components/report/Report';
import { PlanLinks } from '../../components/report/PlanLinks';
import { fmt } from '../../i18n/strings';
import { TABS, report } from '../../i18n/report';
import { useInsights } from '../../insights/useInsights';
import { monthEnd } from '../../model/aggregate';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { CHROME, groupColor } from '../../theme/tokens';

// The map, its country outlines and city lists load only when this tab is opened.
const LoginMap = lazy(() => import('../../components/map/LoginMap'));

const R = report.security;
/** Settings worth showing as-is; repeated per-record history lines are summarized instead. */
const KEY_SETTINGS = /two-factor_authentication|your_account_password_information|information_about_your_last_login|login_alerts_settings/;

export function SecurityTab() {
  const i = useInsights();
  const theme = useUiStore((s) => s.theme);
  const hide = useUiStore((s) => s.hidePersonal);
  const inspect = useUiStore((s) => s.inspect);
  const events = useDataStore((s) => s.events);
  const color = groupColor('security', theme);
  const sec = useMemo(() => events.filter((e) => e.category === 'security'), [events]);
  const isDate = (v: string) => /^\d{4}-\d\d-\d\dT/.test(v);
  // Some nested rows carry a date under a non-date label; those read as nonsense, so skip them.
  const settings = i.security.facts.filter((f) => KEY_SETTINGS.test(f.source) && !/#\d/.test(f.label) && (!isDate(f.value) || /time|date/i.test(f.label)));
  const peak = i.security.byMonth.counts.indexOf(Math.max(...i.security.byMonth.counts));

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 4, right: 8, top: 28, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => report.common.records(Number(v)) },
      xAxis: { type: 'category', data: i.security.byMonth.months.map((m) => fmt.month(m)) },
      yAxis: { type: 'value', splitNumber: 3 },
      series: [
        {
          type: 'bar',
          name: 'Records',
          data: i.security.byMonth.counts.map((v, idx) => ({ value: v, itemStyle: { opacity: idx === peak ? 1 : 0.75 } })),
          barMaxWidth: 16,
          itemStyle: { color, borderRadius: [4, 4, 0, 0] },
          emphasis: { itemStyle: { color: CHROME[theme].accent } },
          markPoint:
            peak >= 0
              ? {
                  symbol: 'roundRect',
                  symbolSize: [86, 22],
                  symbolOffset: [0, -16],
                  itemStyle: { color: CHROME[theme].tooltip, borderColor: CHROME[theme].border, borderWidth: 1 },
                  label: { color: CHROME[theme].text, fontSize: 11, formatter: 'Busiest month' },
                  data: [{ name: 'peak', coord: [peak, i.security.byMonth.counts[peak]!] }],
                }
              : undefined,
        },
      ],
    }),
    [i.security.byMonth, color, theme, peak],
  );

  const placeOf = (e: (typeof sec)[number]) => [e.location?.city, e.location?.country].filter(Boolean).join(', ');

  return (
    <>
      <PageHeader
        tab="security"
        icon={ShieldHalf}
        title={TABS.security.title}
        lead={R.lead(i.security.recordedTimes)}
        stats={[
          { value: i.security.logins, label: R.stats.logins, icon: LogIn },
          { value: i.security.places.length, label: R.stats.places, icon: MapPin },
          { value: i.security.countries.length, label: R.stats.countries, icon: Globe2 },
          { value: i.security.devices.length, label: R.stats.devices, icon: MonitorSmartphone },
        ]}
      />
      <Body>
        <Section title={R.placesTitle} lead="Drag to move around, scroll or use the buttons to zoom, and click a dot to see every record from that place.">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card bodyClassName="h-[460px] overflow-hidden rounded-2xl">
              <Suspense fallback={<div className="grid h-full place-items-center text-ink-3">Loading map…</div>}>
                <LoginMap events={sec} lastLocation={i.profile.lastLocation} hidden={hide} />
              </Suspense>
            </Card>
            <Card title="Places, most used first" description="Each time your account was used there" icon={MapPin} hue={color} bodyClassName="max-h-[396px] overflow-y-auto p-5">
              <BarList
                items={i.security.places}
                color={color}
                limit={12}
                ranked
                unit={report.common.times}
                onSelect={(place) => inspect({ title: place, events: sec.filter((e) => placeOf(e) === place).reverse() })}
              />
            </Card>
          </div>
          <p className="mt-3 text-[13px] text-ink-3">{R.note}</p>
        </Section>

        <Section title="Devices and when they were used">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <Card title={R.devicesTitle} icon={MonitorSmartphone} hue={color}>
              <BarList
                items={i.security.devices}
                color={color}
                unit={report.common.times}
                onSelect={(d) => inspect({ title: d, events: sec.filter((e) => e.device === d).reverse() })}
              />
            </Card>
            <Card title={R.overTimeTitle} description="Click a month to see its records" icon={Fingerprint} hue={color} bodyClassName="h-[320px] p-4">
              <Chart
                option={option}
                ariaLabel="Account activity records per month"
                onEvents={{
                  click: (p: any) => {
                    const m = i.security.byMonth.months[p.dataIndex];
                    if (m === undefined) return;
                    inspect({ title: fmt.month(m), events: sec.filter((e) => e.timestamp >= m && e.timestamp <= monthEnd(m)).reverse() });
                  },
                }}
              />
            </Card>
          </div>
        </Section>

        {i.security.sessions.length > 0 && (
          <Section title={R.sessionsTitle} lead={R.sessionsLead}>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {i.security.sessions.map((s) => {
                const Icon = /iPhone|Android|iPad/.test(s.device ?? '') ? Smartphone : Laptop;
                const last = typeof s.meta?.lastActive === 'number' ? s.meta.lastActive : undefined;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => inspect({ title: s.device ?? 'Session', events: [s] })}
                      className="card group flex w-full items-start gap-3 p-4 text-left transition-colors hover:border-line-strong"
                      style={{ '--tab': color } as React.CSSProperties}
                    >
                      <span className="tab-tile grid size-10 shrink-0 place-items-center rounded-xl">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{s.device ?? 'Unknown device'}</span>
                        <span className="block truncate text-[13px] text-ink-2">
                          <Personal hidden={hide}>{s.location?.city ?? '—'}</Personal>
                        </span>
                        <span className="mt-1.5 block text-[12px] text-ink-3">
                          {R.started} {fmt.date(s.timestamp)}
                          {last ? ` · ${R.lastActive} ${fmt.date(last)}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {settings.length > 0 && (
          <Section title={R.settingsTitle}>
            <Card icon={KeyRound} title="Password, sign-in alerts and two-factor" hue={color}>
              <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-[minmax(160px,260px)_1fr]">
                {settings.map((f, idx) => (
                  <div key={idx} className="contents">
                    <dt className="text-ink-3">{f.label}</dt>
                    <dd className="break-words text-ink">
                      <Personal hidden={hide && !!f.sensitive}>{isDate(f.value) ? fmt.dateTime(Date.parse(f.value)) : f.value}</Personal>
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </Section>
        )}

        <div className="mb-14">
          <PlanLinks ids={['two_factor', 'sessions', 'login_alerts', 'location']} />
        </div>
      </Body>
    </>
  );
}
