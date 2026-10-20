import { Fragment, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import type { ActivityEvent } from '../../model/types';
import { t, fmt } from '../../i18n/strings';
import { useUiStore } from '../../store/uiStore';
import { groupColor, groupOf } from '../../theme/tokens';
import { report, typeLabel } from '../../i18n/report';

const MAX_ROWS = 300;

/** Right-hand drawer showing the records behind whatever was clicked. */
export function InspectorDrawer() {
  const open = useUiStore((s) => s.inspectorOpen);
  const content = useUiStore((s) => s.inspector);
  const close = useUiStore((s) => s.closeInspector);
  const theme = useUiStore((s) => s.theme);
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-40"
          style={{ background: 'var(--backdrop)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          onClick={close}
          aria-hidden
        />
      )}
      {open && (
        <motion.aside
          key="sheet"
          role="dialog"
          aria-modal="true"
          aria-label={t.inspector.title}
          initial={reduce ? false : { x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { x: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-[var(--shadow-pop)] sm:inset-y-2 sm:right-2 sm:w-[460px] sm:rounded-2xl"
        >
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-5">
            <h2 className="truncate font-semibold text-ink">
              {t.inspector.title}
              {content && <span className="num ml-2 font-normal text-ink-3">{report.common.records(content.events.length)}</span>}
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label={t.inspector.close}
              title={`${t.inspector.close} (Esc)`}
              autoFocus
              className="ml-auto grid size-9 place-items-center rounded-xl text-ink-3 hover:bg-surface-3 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </header>

          {!content ? (
            <p className="p-4 text-xs text-ink-3">{t.inspector.nothing}</p>
          ) : (
            <>
              <div className="border-b border-line px-5 py-4">
                <div className="display text-[22px] font-semibold leading-tight text-ink">{content.title}</div>
                {content.subtitle && <div className="num mt-0.5 text-[13px] text-ink-3">{content.subtitle}</div>}
              </div>
              <ol className="min-h-0 flex-1 overflow-y-auto">
                {content.events.slice(0, MAX_ROWS).map((e) => (
                  <Row key={e.id} e={e} theme={theme} startOpen={content.events.length === 1} />
                ))}
                {content.events.length > MAX_ROWS && (
                  <li className="px-4 py-3 text-[13px] text-ink-3">
                    + {fmt.number(content.events.length - MAX_ROWS)} {t.inspector.records}
                  </li>
                )}
              </ol>
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/** One record. Expands to show every field Facebook stored for it. */
function Row({ e, theme, startOpen }: { e: ActivityEvent; theme: 'dark' | 'light'; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const hasMore = Boolean(e.details?.length || e.text || e.location || e.device);
  return (
    <li className="border-b border-line/60">
      <button
        type="button"
        onClick={() => hasMore && setOpen(!open)}
        aria-expanded={hasMore ? open : undefined}
        className="flex w-full gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: groupColor(groupOf(e), theme) }} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="num text-[12px] text-ink-3">{fmt.dateTime(e.timestamp)} · {typeLabel(e.type)}</div>
          <div className={`text-[14px] text-ink ${open ? 'break-words' : 'truncate'}`}>{e.title ?? typeLabel(e.type)}</div>
          {e.text && !open && <div className="truncate text-[13px] text-ink-2">{e.text}</div>}
        </div>
        {hasMore && <ChevronRight className={`mt-1 size-3 shrink-0 text-ink-3 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden />}
      </button>
      {open && (
        <div className="space-y-3 px-5 pb-4 pl-[38px]">
          {e.text && <p className="whitespace-pre-wrap break-words rounded-lg bg-surface-2 p-3 text-[13px] text-ink">{e.text}</p>}
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-1 text-[12px]">
            {e.device && (
              <>
                <dt className="text-ink-3">Device</dt>
                <dd className="break-words text-ink-2">{e.device}</dd>
              </>
            )}
            {e.location &&
              !e.details?.length &&
              Object.entries(e.location)
                .filter(([, v]) => v !== undefined && v !== '')
                .map(([k, v]) => (
                  <Fragment key={k}>
                    <dt className="text-ink-3">{k}</dt>
                    <dd className="num break-words text-ink-2">{String(v)}</dd>
                  </Fragment>
                ))}
            {e.details?.map(([k, v], i) => (
              <Fragment key={i}>
                <dt className="truncate text-ink-3" title={k}>{k}</dt>
                <dd className="break-all text-ink-2">{v}</dd>
              </Fragment>
            ))}
          </dl>
          <div className="truncate font-mono text-[10px] text-ink-3" title={t.inspector.source}>
            {e.sourceFile}
          </div>
        </div>
      )}
    </li>
  );
}
