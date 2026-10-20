import { lazy, Suspense, useMemo } from 'react';
import { Fingerprint, Globe2, KeyRound, Lock, MapPin, MonitorSmartphone, ShieldHalf } from 'lucide-react';
import { MonthBars } from '../../components/report/ActivityCharts';
import { BarList, Body, Card, PageHeader, Personal, Section } from '../../components/report/Report';
import { PlanLinks } from '../../components/report/PlanLinks';
import { fmt } from '../../i18n/strings';
import { TABS, report } from '../../i18n/report';
import { igReport } from '../../i18n/instagram';
import { useInsights } from '../../insights/useInsights';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { groupColor } from '../../theme/tokens';

// The map and its country outlines load only when this tab is opened.
const LoginMap = lazy(() => import('../../components/map/LoginMap'));
const R = igReport.security;
/** Account facts worth showing as-is (login and logout times, contact syncing …). */
const SHOW = /login|logout|contact|country code|email address was changed|password/i;

/** Where and how the Instagram account is used: devices, internet addresses, privacy changes, last location. */
export function IgSecurityTab() {
  const i = useInsights();
  const theme = useUiStore((s) => s.theme);
  const hide = useUiStore((s) => s.hidePersonal);
  const inspect = useUiStore((s) => s.inspect);
  const events = useDataStore((s) => s.events);
  const color = groupColor('security', theme);
  const sec = useMemo(() => events.filter((e) => e.category === 'security'), [events]);
  const ips = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of sec) if (e.location?.ip) m.set(e.location.ip, (m.get(e.location.ip) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([key, count], idx) => ({ key, label: <Personal hidden={hide}>{key}</Personal>, name: hide ? `Address ${idx + 1}` : key, count }));
  }, [sec, hide]);
  const privacy = sec.filter((e) => e.type === 'privacy_changed').reverse();
  const facts = i.security.facts.filter((f) => SHOW.test(f.label));
  const isDate = (v: string) => /^\d{4}-\d\d-\d\d/.test(v);

  return (
    <>
      <PageHeader
        tab="security"
        icon={ShieldHalf}
        title={TABS.security.title}
        lead={R.lead(i.security.recordedTimes)}
        stats={[
          { value: i.security.recordedTimes, label: R.stats.records, icon: Fingerprint },
          { value: i.security.devices.length, label: R.stats.devices, icon: MonitorSmartphone },
          { value: ips.length, label: R.stats.ips, icon: Globe2 },
          { value: privacy.length, label: R.stats.privacy, icon: Lock },
        ]}
      />
      <Body>
        <Section title={R.mapTitle} lead={R.mapLead}>
          {i.profile.lastLocation ? (
            <Card bodyClassName="h-[420px] overflow-hidden rounded-2xl">
              <Suspense fallback={<div className="grid h-full place-items-center text-ink-3">Loading map…</div>}>
                <LoginMap events={[]} lastLocation={i.profile.lastLocation} hidden={hide} />
              </Suspense>
            </Card>
          ) : (
            <Card icon={MapPin} hue={color}>
              <p className="text-ink-3">{R.noMap}</p>
            </Card>
          )}
        </Section>

        <Section title="Devices and when they were used">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <Card title={R.devicesTitle} icon={MonitorSmartphone} hue={color}>
              <BarList items={i.security.devices} color={color} unit={report.common.times} onSelect={(d) => inspect({ title: d, events: sec.filter((e) => e.device === d).reverse() })} />
            </Card>
            <Card title={R.overTimeTitle} description="Click a month to see its records" icon={Fingerprint} hue={color} bodyClassName="h-[320px] p-4">
              <MonthBars months={i.security.byMonth.months} counts={i.security.byMonth.counts} color={color} events={sec} unit={(n) => report.common.records(n)} ariaLabel="Account activity records per month" />
            </Card>
          </div>
          <p className="mt-3 text-[13px] text-ink-3">{R.note(i.security.logins)}</p>
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          {ips.length > 0 && (
            <Section title={R.ipsTitle} lead={R.ipsLead}>
              <Card icon={Globe2} hue={color} bodyClassName="max-h-[340px] overflow-y-auto p-5">
                <BarList items={ips} color={color} unit={report.common.times} onSelect={(ip) => inspect({ title: hide ? 'Internet address' : ip, events: sec.filter((e) => e.location?.ip === ip).reverse() })} />
              </Card>
            </Section>
          )}
          {privacy.length > 0 && (
            <Section title={R.privacyTitle}>
              <Card icon={Lock} hue={color}>
                <ul className="space-y-2">
                  {privacy.map((e) => (
                    <li key={e.id}>
                      <button type="button" onClick={() => inspect({ title: e.title ?? 'Privacy change', events: [e] })} className="flex w-full justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2">
                        <span className="text-ink">{e.title}</span>
                        <span className="text-[13px] text-ink-3">{fmt.date(e.timestamp)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>
          )}
        </div>

        {facts.length > 0 && (
          <Section title={R.detailsTitle}>
            <Card icon={KeyRound} hue={color}>
              <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-[minmax(160px,320px)_1fr]">
                {facts.map((f, idx) => (
                  <div key={idx} className="contents">
                    <dt className="text-ink-3">{f.label}</dt>
                    <dd className="break-words text-ink">
                      <Personal hidden={hide && !!f.sensitive}>{f.time !== undefined ? fmt.dateTime(f.time) : isDate(f.value) ? fmt.date(Date.parse(f.value)) : f.value}</Personal>
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </Section>
        )}

        <div className="mb-14">
          <PlanLinks ids={['ig_two_factor', 'ig_sessions', 'ig_location']} />
        </div>
      </Body>
    </>
  );
}
