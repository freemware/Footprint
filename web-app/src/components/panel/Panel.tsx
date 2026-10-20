import type { ReactNode } from 'react';
import { fmt } from '../../i18n/strings';

export type PanelStatus = 'idle' | 'live' | 'warning' | 'alert';

interface PanelProps {
  id: string;
  title: string;
  /** Headline count shown after the title. */
  count?: number;
  status?: PanelStatus;
  /** Extra header controls. */
  actions?: ReactNode;
  children: ReactNode;
  /** Remove body padding for edge-to-edge content. */
  flush?: boolean;
  /** Kept for compatibility; panels are no longer draggable. */
  draggable?: boolean;
}

const DOT: Record<PanelStatus, string> = {
  idle: 'bg-ink-3',
  live: 'bg-accent',
  warning: 'bg-warning',
  alert: 'bg-critical',
};

/** Framed area with a title bar, used where content needs its own scrolling region (the file explorer). */
export function Panel({ id, title, count, status = 'idle', actions, children, flush }: PanelProps) {
  return (
    <section aria-label={title} data-panel-id={id} className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
        <span className={`size-2 shrink-0 rounded-full ${DOT[status]}`} aria-hidden />
        <h2 className="truncate font-semibold text-ink">
          {title}
          {count !== undefined && <span className="num ml-2 font-normal text-ink-3">{fmt.number(count)}</span>}
        </h2>
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </header>
      <div className={`relative min-h-0 flex-1 ${flush ? '' : 'p-4'}`}>{children}</div>
    </section>
  );
}

/** Consistent empty state. */
export function PanelEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
      <div className="font-medium text-ink-2">{title}</div>
      {hint && <div className="max-w-[36ch] text-[13px] text-ink-3">{hint}</div>}
    </div>
  );
}
