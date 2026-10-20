import { useEffect, useState } from 'react';
import { Cpu, FileText, Gauge, IdCard, MemoryStick, Sparkles, Users, Wand2, type LucideIcon } from 'lucide-react';
import { Body, Card, ChipCloud, PageHeader, Personal, Section } from '../../components/report/Report';
import { PlanLinks } from '../../components/report/PlanLinks';
import { fmt } from '../../i18n/strings';
import { TABS, report } from '../../i18n/report';
import { useInsights } from '../../insights/useInsights';
import type { Fact } from '../../model/types';
import { useUiStore } from '../../store/uiStore';
import { humanize } from '../../parsers/util';

const R = report.profile;
const TIME_LABEL = /(^|›\s*)(last )?(updated? time|update time|creation time|last updated time|time)$/i;
const NOISE = /usage explanation|^fbid$/i;

/** Drop timestamps-as-text and exact duplicates; keep the order Facebook used. */
const tidy = (facts: Fact[]) => {
  const seen = new Set<string>();
  return facts.filter((f) => {
    const k = `${f.label}|${f.value}`;
    if (TIME_LABEL.test(f.label) || NOISE.test(f.label) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/** "en, es, fr" → "English, Spanish, French" in the reader's language. */
function languageNames(v: string): string {
  if (!/^[a-z]{2,3}(_[A-Z]{2})?(,\s*[a-z]{2,3}(_[A-Z]{2})?)*$/.test(v.trim())) return v;
  try {
    const dn = new Intl.DisplayNames(undefined, { type: 'language' });
    return v
      .split(',')
      .map((c) => dn.of(c.trim().replace('_', '-')) ?? c.trim())
      .join(', ');
  } catch {
    return v;
  }
}

const stem = (path: string) => (path.split('/').pop() ?? path).replace(/(_\d+)?\.json$/i, '');

export function ProfileTab() {
  const i = useInsights();
  const hide = useUiStore((s) => s.hidePersonal);
  const deepLink = useUiStore((s) => s.deepLink);
  const clearDeepLink = useUiStore((s) => s.clearDeepLink);
  const openDeepLink = useUiStore((s) => s.openDeepLink);
  const [interestQuery, setInterestQuery] = useState<string | null>(null);

  // Opened from search: filter the interests to that one and scroll to them.
  useEffect(() => {
    if (deepLink?.kind !== 'interest') return;
    setInterestQuery(deepLink.query);
    clearDeepLink();
    requestAnimationFrame(() => document.getElementById('interests')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [deepLink, clearDeepLink]);

  const guessCards = i.profile.guesses
    .map((g) => {
      const facts = tidy(g.facts);
      const explanation = g.facts.find((f) => /usage explanation/i.test(f.label))?.value;
      return { title: R.guessTitles[stem(g.source)] ?? humanize(g.source), values: facts.map((f) => languageNames(f.value)), explanation, source: g.source };
    })
    .filter((g) => g.values.length)
    // Short answers first; long lists get the full width.
    .sort((a, b) => a.values.length - b.values.length);
  const location = tidy(i.profile.locationFacts.filter((f) => !/coordinate|last_location/i.test(f.label)));
  const hue = 'var(--cat-communities)';
  const hasHardware = i.profile.hardware.gpus.length + i.profile.hardware.ram.length + i.profile.hardware.cores.length > 0;

  return (
    <>
      <PageHeader
        tab="profile"
        icon={IdCard}
        title={TABS.profile.title}
        lead={R.lead}
        stats={[
          // Instagram downloads list categories but no interest topics; leave out a tile that would always read 0.
          ...(i.ads.interests.length ? [{ value: i.ads.interests.length, label: 'Interests picked for you', icon: Sparkles }] : []),
          { value: i.ads.categories.length, label: 'Audience groups you’re in', icon: Users },
          { value: guessCards.length, label: R.inferredStat, icon: Wand2 },
          { value: i.profile.deviceFacts.length, label: 'Device details recorded', icon: Cpu },
        ]}
      />
      <Body>
        {guessCards.length > 0 && (
          <Section title={R.guessesTitle} lead={R.inferredLead}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {guessCards.map((g) => (
                <Card key={g.title} hue={hue} className={g.values.length > 6 ? 'md:col-span-2 xl:col-span-3' : ''} bodyClassName="p-5">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
                    <span className="tab-tile grid size-7 place-items-center rounded-lg">
                      <Wand2 className="size-3.5" aria-hidden />
                    </span>
                    {g.title}
                    <span className="ml-auto shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-3">{R.inferredBadge}</span>
                  </div>
                  {g.values.length <= 2 ? (
                    <p className="display mt-4 text-[28px] font-semibold leading-tight text-ink">{g.values.join(', ')}</p>
                  ) : (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {g.values.map((v) => (
                        <li key={v} className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[13px] text-ink">
                          {v}
                        </li>
                      ))}
                    </ul>
                  )}
                  {g.explanation && <p className="mt-4 border-t border-line pt-3 text-[13px] text-ink-3">{g.explanation}</p>}
                  <button
                    type="button"
                    onClick={() => openDeepLink({ kind: 'file', path: g.source })}
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
                  >
                    <FileText className="size-3.5" aria-hidden />
                    {R.fromFile}
                  </button>
                </Card>
              ))}
            </div>
          </Section>
        )}

        {(i.ads.interests.length > 0 || i.ads.categories.length > 0) && (
        <Section id="interests" title={i.ads.interests.length ? R.interestsTitle(i.ads.interests.length) : R.categoriesTitle} lead={R.interestsLead}>
          {i.ads.interests.length > 0 && (
          <Card bodyClassName="p-5">
            <ChipCloud key={interestQuery ?? ''} items={i.ads.interests} placeholder={R.filterInterests} initial={interestQuery ?? ''} />
          </Card>
          )}
          {i.ads.categories.length > 0 && (
            <Card className={i.ads.interests.length ? 'mt-4' : ''} title={R.categoriesTitle} description="Advertisers can target these groups too" icon={Users} hue={hue}>
              <ChipCloud key={`c-${interestQuery ?? ''}`} items={i.ads.categories} initial={interestQuery && i.ads.categories.includes(interestQuery) ? interestQuery : ''} />
            </Card>
          )}
        </Section>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title={R.aboutTitle} lead={hide ? R.hiddenNote : R.aboutLead}>
            <Card>
              <FactList facts={tidy(i.profile.about)} hide={hide} />
            </Card>
          </Section>

          {location.length > 0 && (
            <Section title={R.locationTitle} lead={R.locationLead}>
              <Card>
                <FactList facts={location} hide={hide} />
                {i.profile.lastLocation && (
                  <p className="mt-4 border-t border-line pt-3 text-[13px] text-ink-2">
                    {R.lastLocation}{i.profile.lastLocation.time ? ` (${fmt.date(i.profile.lastLocation.time)})` : ''}:{' '}
                    <Personal hidden={hide}>
                      <span className="num text-ink">
                        {i.profile.lastLocation.lat.toFixed(3)}, {i.profile.lastLocation.lng.toFixed(3)}
                      </span>
                    </Personal>
                  </p>
                )}
              </Card>
            </Section>
          )}
        </div>

        {(hasHardware || i.profile.deviceFacts.length > 0) && (
          <Section title={R.devicesTitle} lead={R.devicesLead(i.profile.hardware.gpus.length)}>
            {hasHardware && (
              <div className="mb-4 grid gap-4 md:grid-cols-3">
                <HardwareCard title={R.gpus} icon={Cpu} items={i.profile.hardware.gpus} />
                <HardwareCard title={R.ram} icon={MemoryStick} items={i.profile.hardware.ram} />
                <HardwareCard title={R.cores} icon={Gauge} items={i.profile.hardware.cores} />
              </div>
            )}
            <p className="text-ink-2">{R.deviceIds(i.profile.deviceFacts.length)}</p>
          </Section>
        )}

        <div className="mb-14">
          <PlanLinks ids={['public_details', 'lookup', 'ad_profile_info', 'ad_topics', 'contact_upload', 'location', 'ig_contact_upload', 'ig_ad_topics', 'ig_location', 'ig_private_account']} />
        </div>
      </Body>
    </>
  );
}

function FactList({ facts, hide }: { facts: Fact[]; hide: boolean }) {
  if (!facts.length) return <p className="text-ink-3">{report.common.noData}</p>;
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[minmax(140px,220px)_1fr]">
      {facts.map((f, idx) => (
        <div key={idx} className="contents">
          <dt className="text-ink-3">{f.label}</dt>
          <dd className="break-words text-ink">
            <Personal hidden={hide && !!f.sensitive}>{f.value}</Personal>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function HardwareCard({ title, items, icon }: { title: string; items: string[]; icon: LucideIcon }) {
  return (
    <Card title={title} icon={icon} hue="var(--cat-communities)">
      {items.length ? (
        <ul className="space-y-1.5">
          {items.map((v) => (
            <li key={v} className="break-words text-ink">
              {v}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-3">{report.common.noData}</p>
      )}
    </Card>
  );
}
