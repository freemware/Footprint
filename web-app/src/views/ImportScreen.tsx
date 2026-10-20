import { useRef, useState, type DragEvent } from 'react';
import { AlertTriangle, FileArchive, FolderOpen, Link2, Loader2, Puzzle, Radio, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { extensionCopy as E } from '../i18n/extension';
import { useExtension, useLiveReport } from '../extension/useExtension';
import { platformName } from '../i18n/platform';
import { t, fmt } from '../i18n/strings';
import { useDataStore } from '../store/dataStore';
import { useFilterStore } from '../store/filterStore';
import { useUiStore } from '../store/uiStore';
import { filesFromDrop, filesFromInput, type ImportInput } from '../importer/client';
import type { ExportSummary } from '../model/types';
import { Stats } from '../components/report/Report';

/** First screen: drop the export, watch it import, see what was found. */
export function ImportScreen() {
  const importing = useDataStore((s) => s.importing);
  const source = useDataStore((s) => s.source);
  const summary = useDataStore((s) => s.summary);
  const showSummary = source === 'export' && summary && !importing;

  return (
    <main className="flex-1">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>{importing ? <ImportProgress /> : showSummary ? <ImportSummary summary={summary} /> : <DropZone />}</div>
        <HowTo />
      </div>
    </main>
  );
}

function DropZone() {
  const importFiles = useDataStore((s) => s.importFiles);
  const error = useDataStore((s) => s.importError);
  const loadDemo = useDataStore((s) => s.loadDemo);
  const clearFilters = useFilterStore((s) => s.clearAll);
  const setView = useUiStore((s) => s.setView);
  const [over, setOver] = useState(false);
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const start = async (inputs: ImportInput[]) => {
    if (!inputs.length) return;
    clearFilters();
    // Stay on this screen so the summary shows when the import finishes.
    setView('import');
    await importFiles(inputs);
  };
  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    await start(await filesFromDrop(e.dataTransfer));
  };
  /** The demo is an invented export run through the same importer, so every tab works. */
  const sample = async () => {
    clearFilters();
    if (await loadDemo()) setView('overview');
  };

  return (
    <section aria-label={t.importer.title}>
      <h1 className="display max-w-[16ch] text-[44px] font-semibold text-ink sm:text-[60px]">{E.start.title}</h1>
      <p className="mt-4 max-w-[60ch] text-[18px] text-ink-2">{E.start.lead}</p>

      <ScanPath />

      <p className="mt-4 flex max-w-[70ch] items-start gap-2 text-[14px] text-ink-2">
        <Link2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        {E.start.together}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-accent-dim text-accent">
          <Upload className="size-4" aria-hidden />
        </span>
        <h2 className="display text-[22px] font-semibold text-ink">{E.start.exportTitle}</h2>
        <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-[12px] font-semibold text-ink-2">{E.start.exportBadge}</span>
      </div>
      <p className="mt-1 flex max-w-[64ch] items-start gap-2 text-ink-2">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
        {E.start.exportText} {E.start.exportPrivacy}
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={[
          'mt-4 flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          over ? 'border-accent bg-accent-dim' : 'border-line-strong bg-surface',
        ].join(' ')}
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-accent-dim text-accent">
          <Upload className="size-6" aria-hidden />
        </span>
        <div>
          <div className="display text-[24px] font-semibold text-ink">{t.importer.drop}</div>
          <div className="mt-1 text-ink-3">{t.importer.dropHint}</div>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => filesRef.current?.click()} className={primaryBtn}>
            <FileArchive className="size-4" aria-hidden />
            {t.importer.chooseFiles}
          </button>
          <button type="button" onClick={() => folderRef.current?.click()} className={secondaryBtn}>
            <FolderOpen className="size-4" aria-hidden />
            {t.importer.chooseFolder}
          </button>
        </div>
        <input
          ref={filesRef}
          type="file"
          multiple
          accept=".zip,.json,application/zip,application/json"
          className="hidden"
          onChange={(e) => start(filesFromInput(e.target.files)).then(() => (e.target.value = ''))}
        />
        <input
          ref={folderRef}
          type="file"
          className="hidden"
          {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          onChange={(e) => start(filesFromInput(e.target.files)).then(() => (e.target.value = ''))}
        />
      </div>

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl border border-critical/50 bg-critical/10 p-4 text-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-critical" aria-hidden />
          <span>
            <b>{t.importer.failed}.</b> {error}
          </span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-surface p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-dim text-accent">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <p className="font-semibold text-ink">{t.importer.demoTitle}</p>
          <p className="mt-0.5 text-[13px] text-ink-2">{t.importer.demoText}</p>
        </div>
        <button type="button" onClick={sample} className={secondaryBtn}>
          {t.importer.trySample}
        </button>
      </div>
    </section>
  );
}

/** The live path: the browser extension reads settings as they are right now. */
function ScanPath() {
  const ext = useExtension();
  const last = useLiveReport('facebook');
  const setView = useUiStore((s) => s.setView);
  const open = last?.results.filter((r) => r.status === 'risk').length ?? 0;
  return (
    <div className="mt-8 flex flex-wrap items-center gap-4 rounded-3xl border border-accent/40 bg-accent-dim p-5 sm:p-6">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-ink">
        <Puzzle className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="display text-[22px] font-semibold text-ink">{E.start.scanTitle}</h2>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-accent">{E.start.scanBadge}</span>
        </div>
        <p className="mt-1 text-ink-2">{E.start.scanText}</p>
        {last && (
          <p className="mt-2 text-[14px] font-medium text-ink" aria-live="polite">
            {last.signedOut ? E.start.lastScanSignedOut(fmt.date(last.at)) : E.start.lastScan(fmt.date(last.at), open)}
          </p>
        )}
      </div>
      {ext.installed ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => ext.scan()} disabled={ext.running} className={`${primaryBtn} disabled:opacity-60`}>
            {ext.running ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Radio className="size-4" aria-hidden />}
            {ext.running ? E.live.scanning : last ? E.live.scanAgain : E.live.scanNow}
          </button>
          {last && (
            <button type="button" onClick={() => ext.open('scan')} className={secondaryBtn}>
              {E.start.seeResults}
            </button>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setView('extension')} className={primaryBtn}>
          {E.install}
        </button>
      )}
    </div>
  );
}

function ImportProgress() {
  const p = useDataStore((s) => s.progress);
  const pct = p && p.total ? Math.min(1, p.done / p.total) : 0;
  return (
    <section aria-live="polite">
      <h1 className="display text-[44px] font-semibold text-ink">{p ? t.importer.phase[p.phase] : t.importer.phase.listing}…</h1>
      <p className="mt-3 text-ink-2">{p ? `${fmt.number(p.done)} of ${fmt.number(p.total)} files` : ''}</p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct * 100)}
        className="mt-8 h-3 overflow-hidden rounded-full bg-surface-3"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="mt-3 truncate font-mono text-[12px] text-ink-3">{p?.current ?? ' '}</div>
    </section>
  );
}

function ImportSummary({ summary }: { summary: ExportSummary }) {
  const events = useDataStore((s) => s.events);
  const collections = useDataStore((s) => s.collections);
  const clear = useDataStore((s) => s.clear);
  const setView = useUiStore((s) => s.setView);
  const json = summary.files.filter((f) => f.kind === 'json');
  const understood = json.filter((f) => f.parser && f.parser !== 'generic').length;
  const timelineOnly = json.filter((f) => f.parser === 'generic' && (f.events ?? 0) > 0).length;
  const rawOnly = json.length - understood - timelineOnly;
  const media = summary.files.filter((f) => f.kind === 'media').length;
  const errors = summary.files.filter((f) => f.error);

  return (
    <section>
      <h1 className="display text-[44px] font-semibold text-ink sm:text-[56px]">Your data is ready</h1>
      {summary.dateRange && (
        <p className="mt-4 text-[17px] text-ink-2">
          It covers {fmt.date(summary.dateRange.start)} to {fmt.date(summary.dateRange.end)} and was read in{' '}
          {fmt.number(Math.max(1, Math.round((summary.durationMs ?? 0) / 100) / 10))} seconds, without leaving this device.
        </p>
      )}

      <div className="mt-8">
        <Stats
          items={[
            { value: events.length, label: 'records with a date' },
            { value: new Set(collections.advertisers.map((a) => a.name)).size, label: 'businesses with your information' },
            { value: collections.adInterests.length + collections.adCategories.length, label: `interests and categories ${platformName()} picked for you` },
            { value: collections.facts.length, label: 'other details about you' },
          ]}
        />
      </div>

      {summary.warnings.map((w) => (
        <div key={w} role="alert" className="mt-6 flex items-start gap-2 rounded-2xl border border-warning/50 bg-warning/10 p-4 text-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span>{t.importer.warnings[w]}</span>
        </div>
      ))}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setView('overview')} className={primaryBtn}>
          See what {platformName()} has on you
        </button>
        <button type="button" onClick={clear} title={t.importer.unloadHint} className={secondaryBtn}>
          {t.importer.unload}
        </button>
      </div>

      <details className="mt-10 rounded-2xl border border-line bg-surface p-5 text-ink-2">
        <summary className="cursor-pointer font-medium text-ink">What was read</summary>
        <ul className="mt-3 space-y-1">
          <li>
            {fmt.number(json.length)} data files and {fmt.number(media)} photos and videos ({fmt.bytes(summary.totalBytes)}).
          </li>
          <li>{fmt.number(understood)} files were fully understood.</li>
          <li>{fmt.number(timelineOnly)} more were added to the timeline.</li>
          <li>{fmt.number(rawOnly)} hold settings without dates; you can read them under All files.</li>
          {errors.length > 0 && (
            <li className="text-critical">
              {fmt.number(errors.length)} could not be read: {errors.map((f) => f.path).join(', ')}
            </li>
          )}
        </ul>
      </details>
    </section>
  );
}

function HowTo() {
  return (
    <aside className="h-fit rounded-2xl border border-line bg-surface p-6">
      <h2 className="display text-[22px] font-semibold text-ink">{t.importer.howTitle}</h2>
      <ol className="mt-4 space-y-4 text-ink-2">
        {t.importer.howSteps.map((s, i) => (
          <li key={s} className="flex gap-3">
            <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-surface-3 text-[13px] font-semibold text-ink">{i + 1}</span>
            <span className="leading-6">{s}</span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => useUiStore.getState().setView('platforms')} className="mt-5 text-[13px] font-medium text-accent hover:underline">
        Which other platforms work? →
      </button>
      <p className="mt-4 border-t border-line pt-4 text-[13px] text-ink-3">{t.app.notAffiliated}</p>
    </aside>
  );
}

const primaryBtn =
  'inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-ink hover:opacity-90';
const secondaryBtn =
  'inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong px-5 font-medium text-ink hover:bg-surface-2';
