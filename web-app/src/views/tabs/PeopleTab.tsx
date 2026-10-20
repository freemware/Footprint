import { useMemo, type CSSProperties } from 'react';
import type { EChartsOption } from 'echarts';
import { Chart } from '../../components/charts/Chart';
import { BarList, Body, Card, PageHeader, Personal, Section, SplitBar } from '../../components/report/Report';
import { PlanLinks } from '../../components/report/PlanLinks';
import { Archive, Filter, Inbox, Lock, MailQuestion, MessageSquare, UserCheck, UserMinus, UserPlus, Users } from 'lucide-react';
import { fmt } from '../../i18n/strings';
import { BOX_LABEL, TABS, report } from '../../i18n/report';
import { useInsights } from '../../insights/useInsights';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { groupColor } from '../../theme/tokens';

const R = report.people;

export function PeopleTab() {
  const i = useInsights();
  const theme = useUiStore((s) => s.theme);
  const hide = useUiStore((s) => s.hidePersonal);
  const inspect = useUiStore((s) => s.inspect);
  const events = useDataStore((s) => s.events);
  const friendColor = groupColor('communities', theme);
  const msgColor = groupColor('messages', theme);
  const removedColor = groupColor('ads', theme);
  const fy = i.people.friendsByYear;

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 4, right: 8, top: 36, bottom: 4, containLabel: true },
      legend: { top: 0, left: 0 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: fy.years.map(String) },
      yAxis: { type: 'value', splitNumber: 3 },
      series: [
        { name: R.added, type: 'bar', data: fy.added, barMaxWidth: 28, itemStyle: { color: friendColor, borderRadius: [4, 4, 0, 0] } },
        { name: R.removedLabel, type: 'bar', data: fy.removed, barMaxWidth: 28, itemStyle: { color: removedColor, borderRadius: [4, 4, 0, 0] } },
      ],
      barGap: '12%',
    }),
    [fy, friendColor, removedColor],
  );

  const forPerson = (name: string) =>
    events.filter((e) => e.people?.includes(name) && (e.category === 'messages' || e.type === 'reaction' || e.type === 'comment')).reverse();

  const boxIcon: Record<string, typeof Inbox> = { inbox: Inbox, filtered_threads: Filter, message_requests: MailQuestion, archived_threads: Archive, e2ee_cutover: Lock };

  return (
    <>
      <PageHeader
        tab="people"
        icon={Users}
        title={TABS.people.title}
        lead={R.lead}
        stats={[
          { value: i.people.friends, label: R.stats.friends, icon: UserPlus },
          { value: i.people.removed, label: R.stats.removed, icon: UserMinus },
          { value: i.people.following, label: R.stats.following, icon: UserCheck },
          { value: i.people.sent + i.people.received, label: 'Messages stored', icon: MessageSquare },
        ]}
      />
      <Body>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Section title={R.friendsTitle} lead={`You also declined ${fmt.number(i.people.requestsDeclined)} friend requests and sent ${fmt.number(i.people.requestsSent)}.`}>
            <Card title="Friends over the years" description="Click a bar to see who" icon={UserPlus} hue={friendColor} bodyClassName="h-[340px] p-4">
              <Chart
                option={option}
                ariaLabel="Friends added and removed per year"
                onEvents={{
                  click: (p: any) => {
                    const year = fy.years[p.dataIndex];
                    const type = p.seriesIndex === 0 ? 'friend_added' : 'friend_removed';
                    if (year === undefined) return;
                    inspect({
                      title: `${p.seriesIndex === 0 ? R.added : R.removedLabel} in ${year}`,
                      events: events.filter((e) => e.type === type && new Date(e.timestamp).getFullYear() === year).reverse(),
                    });
                  },
                }}
              />
            </Card>
          </Section>

          <Section title={R.topTitle} lead={R.topLead}>
            <Card bodyClassName="max-h-[404px] overflow-y-auto p-5">
              <BarList
                items={i.people.top.map((p) => ({
                  key: p.key,
                  name: hide ? ' ' : p.label,
                  label: <Personal hidden={hide}>{p.label}</Personal>,
                  count: p.count,
                  sub: [
                    p.messages && `${fmt.number(p.messages)} ${R.msgShort[p.messages === 1 ? 0 : 1]}`,
                    p.reactions && `${fmt.number(p.reactions)} ${R.likesShort[p.reactions === 1 ? 0 : 1]}`,
                    p.comments && `${fmt.number(p.comments)} ${R.commentsShort[p.comments === 1 ? 0 : 1]}`,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                }))}
                color={msgColor}
                limit={10}
                avatars
                ranked
                onSelect={(name) => inspect({ title: name, events: forPerson(name) })}
              />
            </Card>
          </Section>
        </div>

        <Section title={R.messagesTitle(i.people.sent + i.people.received)} lead={R.messagesLead(i.people.sent, i.people.received)}>
          <div className="mb-6 max-w-xl">
            <SplitBar
              parts={[
                { label: 'You sent', value: i.people.sent, color: msgColor },
                { label: 'You received', value: i.people.received, color: groupColor('security', theme) },
              ]}
            />
          </div>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {i.people.boxes.map((b) => {
              const Icon = boxIcon[b.key] ?? Inbox;
              return (
                <li key={b.key}>
                  <button
                    type="button"
                    style={{ '--tab': msgColor } as CSSProperties}
                    className="card group flex h-full w-full flex-col p-5 text-left transition-colors hover:border-line-strong"
                    onClick={() => inspect({ title: BOX_LABEL(b.key), events: events.filter((e) => e.category === 'messages' && e.meta?.box === b.key).reverse() })}
                  >
                    <span className="flex w-full items-center gap-3">
                      <span className="tab-tile grid size-10 place-items-center rounded-xl">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">{BOX_LABEL(b.key)}</span>
                        <span className="block text-[12px] text-ink-3">{R.conversations(Number(b.sub))}</span>
                      </span>
                      <span className="display num text-[26px] font-semibold text-ink">{fmt.number(b.count)}</span>
                    </span>
                    <span className="mt-3 block text-ink-2">{R.boxes[b.key]?.[1]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>

        <div className="mb-14">
          <PlanLinks ids={['friends_list', 'contact_upload', 'lookup']} />
        </div>
      </Body>
    </>
  );
}
