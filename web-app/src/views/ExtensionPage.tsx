import { useEffect, useState, type CSSProperties } from 'react';
import { CalendarClock, Check, Download, Puzzle, Radar, ShieldCheck, Tag, Trash2, Wand2 } from 'lucide-react';
import { extensionCopy as C } from '../i18n/extension';
import { useExtension } from '../extension/useExtension';

const ICONS = { scan: Radar, fix: Wand2, untag: Tag, cleanup: Trash2, autoscans: CalendarClock } as const;
/** Where the packaged extension is offered until it's in the stores. */
export const EXTENSION_DOWNLOAD = './footprint-extension.zip';

/**
 *   header band: title · lead · installed status / get it
 *   what it does (5 cards, free/Pro)
 *   you stay in control · install steps per browser · platforms
 */
/** Is the packaged extension served next to the app? (Yes on Footprint's own site; not on preview hosts.) */
function useDownloadAvailable() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(EXTENSION_DOWNLOAD, { method: 'HEAD', cache: 'no-store' })
      .then((r) => alive && setOk(r.ok && !(r.headers.get('content-type') ?? '').includes('text/html')))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return ok;
}

export function ExtensionPage() {
  const ext = useExtension();
  const downloadable = useDownloadAvailable();
  return (
    <main className="flex-1" style={{ '--tab': 'var(--accent)' } as CSSProperties}>
      <header className="tab-band border-b border-line">
        <div className="mx-auto max-w-[1240px] px-4 pt-10 pb-8 sm:px-6 sm:pt-12">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent-dim text-accent">
            <Puzzle className="size-6" aria-hidden />
          </span>
          <h1 className="display mt-4 max-w-[20ch] text-[34px] font-semibold text-ink sm:text-[44px]">{C.title}</h1>
          <p className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-ink-2">{C.lead}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {ext.installed ? (
              <>
                <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-good/40 bg-good/10 px-4 font-medium text-ink">
                  <Check className="size-4 text-good" aria-hidden /> {C.installed(ext.version!)}
                </span>
                <button type="button" onClick={() => ext.open('scan')} className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-ink hover:opacity-90">
                  {C.open}
                </button>
              </>
            ) : (
              <a href="#install" className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-ink hover:opacity-90">
                {C.install}
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] space-y-12 px-4 pt-10 pb-12 sm:px-6">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {C.features.map((f) => {
            const Icon = ICONS[f.id as keyof typeof ICONS];
            return (
              <li key={f.id} className="card p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-accent-dim text-accent">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h2 className="min-w-0 flex-1 text-[17px] font-semibold text-ink">{f.title}</h2>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
                    style={f.pro ? { color: 'var(--plan)', background: 'color-mix(in oklab, var(--plan) 14%, transparent)' } : { color: 'var(--good-ink)', background: 'color-mix(in oklab, var(--good) 14%, transparent)' }}
                  >
                    {f.pro ? C.pro : C.free}
                  </span>
                </div>
                <p className="mt-3 text-ink-2">{f.text}</p>
              </li>
            );
          })}
        </ul>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="display flex items-center gap-2 text-[24px] font-semibold text-ink">
              <ShieldCheck className="size-6 text-good" aria-hidden /> {C.controlTitle}
            </h2>
            <ul className="mt-4 space-y-2.5 text-ink-2">
              {C.control.map((c) => (
                <li key={c} className="flex gap-2.5">
                  <Check className="mt-1 size-4 shrink-0 text-good" aria-hidden /> {c}
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-xl bg-surface-2 p-3 text-[13px] text-ink-3">{C.terms}</p>
          </div>

          <div id="install" className="card scroll-mt-24 p-6">
            <h2 className="display text-[24px] font-semibold text-ink">{C.installTitle}</h2>
            <div className="mt-4 space-y-6">
              {C.browsers.map((b) => (
                <div key={b.name}>
                  <h3 className="font-semibold text-ink">{b.name}</h3>
                  <ol className="mt-2 space-y-2">
                    {b.steps.map((s, i) => (
                      <li key={s} className="flex gap-3">
                        <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-[12px] font-semibold text-ink">{i + 1}</span>
                        <span className="leading-6 text-ink">{s}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-2 text-[13px] text-ink-3">{b.note}</p>
                </div>
              ))}
              {downloadable ? (
                <a href={EXTENSION_DOWNLOAD} download className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong px-4 font-semibold text-ink hover:bg-surface-2">
                  <Download className="size-4" aria-hidden /> {C.download}
                </a>
              ) : (
                <p className="rounded-xl bg-surface-2 p-3 text-[13px] text-ink-2">{C.downloadSoon}</p>
              )}
            </div>
          </div>
        </section>

        <section className="card flex flex-wrap items-center gap-4 p-6">
          <div className="min-w-0 flex-1 basis-72">
            <h2 className="display text-[22px] font-semibold text-ink">{C.platformsTitle}</h2>
            <p className="mt-1 text-ink-2">{C.platformsNow}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
