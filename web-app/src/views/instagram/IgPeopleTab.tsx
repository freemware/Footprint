import type { CSSProperties } from 'react';
import { Bot, Inbox, MailQuestion, MessagesSquare, Star, UserCheck, UserPlus, Users } from 'lucide-react';
import { BarList, Body, Card, PageHeader, Personal, Section, SplitBar } from '../../components/report/Report';
import { PlanLinks } from '../../components/report/PlanLinks';
import { fmt } from '../../i18n/strings';
import { TABS, report } from '../../i18n/report';
import { igReport } from '../../i18n/instagram';
import { useInsights } from '../../insights/useInsights';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';
import { groupColor } from '../../theme/tokens';

const R = igReport.people;
const LIST_TYPES = Object.keys(R.lists);
const BOX_ICON: Record<string, typeof Inbox> = { inbox: Inbox, message_requests: MailQuestion };
const humanBox = (b: string) => R.boxes[b]?.[0] ?? b.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Followers and following, the lists Instagram keeps about your connections, and your messages. */
export function IgPeopleTab() {
  const i = useInsights();
  const g = i.instagram;
  const theme = useUiStore((s) => s.theme);
  const hide = useUiStore((s) => s.hidePersonal);
  const inspect = useUiStore((s) => s.inspect);
  const events = useDataStore((s) => s.events);
  const msgColor = groupColor('messages', theme);
  const followColor = groupColor('communities', theme);
  const ofType = (t: string) => events.filter((e) => e.type === t).reverse();
  const lists = LIST_TYPES.map((t) => ({ key: t, label: R.lists[t]!, count: i.byType.find((r) => r.key === t)?.count ?? 0 })).filter((l) => l.count);
  const forPerson = (name: string) => events.filter((e) => e.people?.includes(name) && e.category !== 'connections').reverse();

  return (
    <>
      <PageHeader
        tab="people"
        icon={Users}
        title={TABS.people.title}
        lead={R.lead}
        stats={[
          { value: g.followers, label: R.stats.followers, icon: UserCheck },
          { value: g.following, label: R.stats.following, icon: UserPlus },
          { value: g.mutual, label: R.stats.mutual, icon: Users },
          { value: g.closeFriends, label: R.stats.closeFriends, icon: Star },
        ]}
      />
      <Body>
        {(g.followers > 0 || g.following > 0) && (
          <Section title={R.followTitle} lead={R.followLead(g.mutual)}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <Card title="How your follows overlap" icon={Users} hue={followColor} bodyClassName="p-5">
                <SplitBar
                  parts={[
                    { label: R.followParts.mutual, value: g.mutual, color: followColor },
                    { label: R.followParts.youOnly, value: Math.max(0, g.following - g.mutual), color: msgColor },
                    { label: R.followParts.themOnly, value: Math.max(0, g.followers - g.mutual), color: groupColor('posts', theme) },
                  ]}
                />
                <div className="mt-5 flex flex-wrap gap-3 text-[13px]">
                  <button type="button" className="font-medium text-accent hover:underline" onClick={() => inspect({ title: R.stats.followers, events: ofType('follower_added') })}>
                    {R.stats.followers}: {fmt.number(g.followers)}
                  </button>
                  <button type="button" className="font-medium text-accent hover:underline" onClick={() => inspect({ title: R.stats.following, events: ofType('followed') })}>
                    {R.stats.following}: {fmt.number(g.following)}
                  </button>
                </div>
              </Card>
              {lists.length > 0 && (
                <Card title={R.listsTitle} description={report.common.details} icon={UserCheck} hue={followColor}>
                  <BarList items={lists} color={followColor} onSelect={(t) => inspect({ title: R.lists[t]!, events: ofType(t) })} />
                </Card>
              )}
            </div>
          </Section>
        )}

        {i.people.top.length > 0 && (
          <Section title={R.topTitle} lead={R.topLead}>
            <Card bodyClassName="max-h-[404px] overflow-y-auto p-5">
              <BarList
                items={i.people.top.map((p) => ({
                  key: p.key,
                  name: hide ? ' ' : p.label,
                  label: <Personal hidden={hide}>{p.label}</Personal>,
                  count: p.count,
                  sub: [
                    p.messages && `${fmt.number(p.messages)} ${p.messages === 1 ? 'message' : 'messages'}`,
                    p.reactions && `${fmt.number(p.reactions)} ${p.reactions === 1 ? 'like' : 'likes'}`,
                    p.comments && `${fmt.number(p.comments)} ${p.comments === 1 ? 'comment' : 'comments'}`,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                }))}
                color={msgColor}
                limit={10}
                avatars
                ranked
                onSelect={(name) => inspect({ title: hide ? 'Person' : name, events: forPerson(name) })}
              />
            </Card>
          </Section>
        )}

        {i.people.sent + i.people.received > 0 && (
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
                const Icon = BOX_ICON[b.key] ?? MessagesSquare;
                return (
                  <li key={b.key}>
                    <button
                      type="button"
                      style={{ '--tab': msgColor } as CSSProperties}
                      className="card group flex h-full w-full flex-col p-5 text-left transition-colors hover:border-line-strong"
                      onClick={() => inspect({ title: humanBox(b.key), events: events.filter((e) => e.category === 'messages' && e.meta?.box === b.key).reverse() })}
                    >
                      <span className="flex w-full items-center gap-3">
                        <span className="tab-tile grid size-10 place-items-center rounded-xl">
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-ink">{humanBox(b.key)}</span>
                          <span className="block text-[12px] text-ink-3">{R.conversations(Number(b.sub))}</span>
                        </span>
                        <span className="display num text-[26px] font-semibold text-ink">{fmt.number(b.count)}</span>
                      </span>
                      {R.boxes[b.key] && <span className="mt-3 block text-ink-2">{R.boxes[b.key]![1]}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            {g.aiChats > 0 && (
              <button type="button" onClick={() => inspect({ title: 'Meta AI', events: ofType('ai_conversation') })} className="mt-4 flex items-center gap-2 text-[14px] font-medium text-accent hover:underline">
                <Bot className="size-4" aria-hidden /> {R.aiChats(g.aiChats)}
              </button>
            )}
          </Section>
        )}

        <div className="mb-14">
          <PlanLinks ids={['ig_private_account', 'ig_contact_upload']} />
        </div>
      </Body>
    </>
  );
}
