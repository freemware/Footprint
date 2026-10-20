import type { CSSProperties } from 'react';
import { Check, ChevronRight, CircleDashed, ListChecks, TriangleAlert } from 'lucide-react';
import { usePlan, useTicked } from '../../advice/usePlan';
import { planItem } from '../../advice/plan';
import { FIX_COPY, planCopy } from '../../i18n/advice';
import { useUiStore } from '../../store/uiStore';

const ICON = { needs_action: TriangleAlert, review: CircleDashed, done: Check } as const;
const COLOR = { needs_action: 'var(--warning)', review: 'var(--text-3)', done: 'var(--good)' } as const;

/**
 * "Make this more private": the privacy-plan steps related to what a tab shows.
 * Replaces free-text tips so advice lives in one place (the fix catalog).
 * Renders nothing when none of the fixes apply to this export.
 */
export function PlanLinks({ ids }: { ids: string[] }) {
  const plan = usePlan();
  const { ticked } = useTicked();
  const openDeepLink = useUiStore((s) => s.openDeepLink);
  const items = ids.map((id) => planItem(plan, id)).filter((p): p is NonNullable<typeof p> => !!p && !!FIX_COPY[p.fix.id]);
  if (!items.length) return null;

  return (
    <aside className="card overflow-hidden" style={{ '--tab': 'var(--plan)' } as CSSProperties}>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="tab-tile grid size-8 place-items-center rounded-lg">
          <ListChecks className="size-4" aria-hidden />
        </span>
        <h3 className="font-semibold text-ink">{planCopy.labels.makePrivate}</h3>
      </div>
      <ul className="divide-y divide-line">
        {items.map((p) => {
          const status = ticked[p.fix.id] ? 'done' : p.status;
          const Icon = ICON[status];
          return (
            <li key={p.fix.id}>
              <button
                type="button"
                onClick={() => openDeepLink({ kind: 'fix', id: p.fix.id })}
                className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2"
              >
                <Icon className="size-4 shrink-0" style={{ color: COLOR[status] }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">{FIX_COPY[p.fix.id]!.title}</span>
                  <span className="block text-[13px] text-ink-3">{ticked[p.fix.id] ? planCopy.labels.markedDone : planCopy.labels.status[p.status]}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
