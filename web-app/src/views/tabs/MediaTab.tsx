import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Film, Globe, ImageOff, Images, MessageSquare, Play, X } from 'lucide-react';
import { Body, Empty, PageHeader, Personal, Segmented } from '../../components/report/Report';
import { PlanLinks } from '../../components/report/PlanLinks';
import { fmt } from '../../i18n/strings';
import { TABS, report } from '../../i18n/report';
import { useInsights } from '../../insights/useInsights';
import type { MediaEntry } from '../../insights/insights';
import { readMedia, readThumb } from '../../importer/client';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';

const R = report.media;
type Filter = 'all' | 'post' | 'message' | 'video';

/** Object URL for a blob loaded from the import worker; revoked when the component unmounts. */
function useBlobUrl(load: () => Promise<Blob | undefined>, active: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    let made: string | null = null;
    load()
      .then((b) => {
        if (!alive) return;
        if (!b) return setFailed(true);
        made = URL.createObjectURL(b);
        setUrl(made);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return { url, failed };
}

export function MediaTab() {
  const i = useInsights();
  const source = useDataStore((s) => s.source);
  const deepLink = useUiStore((s) => s.deepLink);
  const clearDeepLink = useUiStore((s) => s.clearDeepLink);
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<number | null>(null);

  const items = useMemo(
    () =>
      i.media.items.filter((m) =>
        filter === 'all' ? true : filter === 'video' ? m.kind === 'video' : filter === 'message' ? m.source === 'message' : m.source === 'post',
      ),
    [i.media.items, filter],
  );

  // Opened from search: jump straight to that file.
  useEffect(() => {
    if (deepLink?.kind !== 'media') return;
    const idx = i.media.items.findIndex((m) => m.path === deepLink.path);
    if (idx >= 0) {
      setFilter('all');
      setOpen(idx);
    }
    clearDeepLink();
  }, [deepLink, i.media.items, clearDeepLink]);

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: { m: MediaEntry; idx: number }[] }[] = [];
    items.forEach((m, idx) => {
      const label = m.timestamp ? fmt.month(m.timestamp) : R.undated;
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push({ m, idx });
      else out.push({ key: `${label}-${idx}`, label, items: [{ m, idx }] });
    });
    return out;
  }, [items]);

  return (
    <>
      <PageHeader
        tab="media"
        icon={Images}
        title={TABS.media.title}
        lead={R.lead(i.media.photos, i.media.videos)}
        stats={[
          { value: i.media.photos, label: R.stats.photos, icon: Images },
          { value: i.media.videos, label: R.stats.videos, icon: Film },
          { value: i.media.inMessages, label: R.stats.messages, icon: MessageSquare },
          { value: i.media.withIp, label: R.stats.ip, icon: Globe, hint: R.ipHint },
        ]}
      />
      <Body>
        {!i.media.items.length ? (
          <div className="card mb-14">
            <Empty icon={ImageOff} title={R.none} hint={source === 'sample' ? R.sampleHint : R.noneHint} />
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <Segmented
                label="Show"
                value={filter}
                onChange={(f) => setFilter(f)}
                options={(['all', 'post', 'message', 'video'] as Filter[]).map((id) => ({ id, label: R.filters[id] }))}
              />
              <span className="text-[13px] text-ink-3">{report.common.items(items.length)}</span>
            </div>
            {groups.map((g) => (
              <section key={g.key} className="mb-10">
                <h2 className="sticky top-[113px] z-10 -mx-2 mb-3 flex items-baseline gap-2 bg-bg/90 px-2 py-2 backdrop-blur">
                  <span className="display text-[20px] font-semibold text-ink">{g.label}</span>
                  <span className="num text-[13px] text-ink-3">{g.items.length}</span>
                </h2>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {g.items.map(({ m, idx }) => (
                    <li key={m.path}>
                      <Thumb m={m} onOpen={() => setOpen(idx)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <div className="mb-14">
              <PlanLinks ids={['photo_metadata', 'old_posts', 'location']} />
            </div>
          </>
        )}
      </Body>
      <Lightbox items={items} index={open} onIndex={setOpen} />
    </>
  );
}

function Thumb({ m, onOpen }: { m: MediaEntry; onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const inView = useInView(ref, { once: true, margin: '400px 0px' });
  const isVideo = m.kind === 'video';
  const { url, failed } = useBlobUrl(() => (isVideo ? readMedia(m.path) : readThumb(m.path, 320)), inView);
  const label = `${isVideo ? 'Video' : 'Photo'}${m.timestamp ? `, ${fmt.date(m.timestamp)}` : ''}${m.context ? `, ${m.context}` : ''}`;

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label={label}
      title={m.context}
      className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-surface-3 outline-offset-2"
    >
      {url && !isVideo && <img src={url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />}
      {isVideo && (
        // Designed placeholder underneath: shows when the browser can't draw a preview frame.
        <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-surface-3 to-surface-2 text-ink-3" aria-hidden>
          <Film className="size-7" />
        </span>
      )}
      {url && isVideo && <video src={`${url}#t=0.1`} muted playsInline preload="metadata" className="relative size-full object-cover" aria-hidden />}
      {!url && !failed && !isVideo && <span className="absolute inset-0 animate-pulse bg-surface-2" aria-hidden />}
      {failed && (
        <span className="absolute inset-0 grid place-items-center text-ink-3">
          <ImageOff className="size-5" aria-hidden />
        </span>
      )}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      {isVideo && (
        <span className="absolute right-1.5 bottom-1.5 grid size-7 place-items-center rounded-full bg-black/60 text-white">
          <Play className="size-3.5 fill-current" aria-hidden />
        </span>
      )}
      {m.source === 'message' && (
        <span className="absolute top-1.5 left-1.5 grid size-6 place-items-center rounded-full bg-black/55 text-white" title="From a message">
          <MessageSquare className="size-3" aria-hidden />
        </span>
      )}
    </button>
  );
}

function Lightbox({ items, index, onIndex }: { items: MediaEntry[]; index: number | null; onIndex: (i: number | null) => void }) {
  const reduce = useReducedMotion();
  const hide = useUiStore((s) => s.hidePersonal);
  const inspect = useUiStore((s) => s.inspect);
  const m = index !== null ? items[index] : undefined;
  const go = useCallback((d: number) => index !== null && onIndex(Math.min(items.length - 1, Math.max(0, index + d))), [index, items.length, onIndex]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onIndex(null);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [index, go, onIndex]);

  return (
    <AnimatePresence>
      {m && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 lg:flex-row"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 sm:p-10" onClick={(e) => e.target === e.currentTarget && onIndex(null)}>
            <FullMedia key={m.path} m={m} />
            <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label={R.viewer.prev} className="absolute left-3 grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 disabled:opacity-30">
              <ChevronLeft className="size-6" />
            </button>
            <button type="button" onClick={() => go(1)} disabled={index === items.length - 1} aria-label={R.viewer.next} className="absolute right-3 grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 disabled:opacity-30">
              <ChevronRight className="size-6" />
            </button>
            <span className="num absolute top-4 left-4 rounded-full bg-white/10 px-3 py-1 text-[13px] text-white/80">
              {(index ?? 0) + 1} / {items.length}
            </span>
          </div>
          <aside className="max-h-[42vh] w-full shrink-0 overflow-y-auto bg-surface p-6 lg:max-h-none lg:w-[360px]">
            <div className="flex items-start justify-between gap-3">
              <h2 className="display text-[22px] font-semibold leading-tight text-ink">{m.kind === 'video' ? 'Video' : 'Photo'}</h2>
              <button type="button" onClick={() => onIndex(null)} autoFocus aria-label={R.viewer.close} className="grid size-9 place-items-center rounded-xl text-ink-3 hover:bg-surface-3 hover:text-ink">
                <X className="size-5" />
              </button>
            </div>
            <dl className="mt-5 space-y-4">
              {m.context && <Meta label={R.viewer.from} value={<Personal hidden={hide}>{m.context}</Personal>} />}
              {m.timestamp && <Meta label={R.viewer.uploaded} value={fmt.dateTime(m.timestamp)} />}
              {m.taken && <Meta label={R.viewer.taken} value={fmt.dateTime(m.taken)} />}
              {m.album && <Meta label={R.viewer.album} value={m.album} />}
              {m.uploadIp && (
                <Meta
                  label={R.viewer.ip}
                  value={
                    <>
                      <Personal hidden={hide}>
                        <span className="num">{m.uploadIp}</span>
                      </Personal>
                      <span className="mt-1 block text-[12px] text-ink-3">{R.ipHint}</span>
                    </>
                  }
                />
              )}
              <Meta label={R.viewer.file} value={<span className="break-all text-[12px] text-ink-3">{m.path.split('/').pop()} · {fmt.bytes(m.size)}</span>} />
            </dl>
            {m.event && (
              <button
                type="button"
                onClick={() => {
                  const e = m.event!;
                  onIndex(null);
                  inspect({ title: e.title ?? 'Record', subtitle: fmt.dateTime(e.timestamp), events: [e] });
                }}
                className="mt-6 inline-flex h-10 items-center rounded-xl border border-line-strong px-4 font-medium text-ink hover:bg-surface-2"
              >
                {R.viewer.open}
              </button>
            )}
          </aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FullMedia({ m }: { m: MediaEntry }) {
  const { url, failed } = useBlobUrl(() => readMedia(m.path), true);
  if (failed) return <ImageOff className="size-10 text-white/50" aria-label="Could not open this file" />;
  if (!url) return <span className="size-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80" aria-label="Loading" />;
  return m.kind === 'video' ? (
    <video src={url} controls autoPlay className="max-h-full max-w-full rounded-lg" />
  ) : (
    <img src={url} alt={m.context ?? 'Photo'} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}
