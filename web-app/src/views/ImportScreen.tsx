import { useRef, useState, type DragEvent } from 'react';
import { AlertTriangle, FileArchive, FolderOpen, Loader2, Puzzle, Radio, ShieldCheck, Sparkles, Upload } from 'lucide-react';
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
      <div className="import-layout mx-auto grid max-w-[1440px] items-start gap-6 px-5 py-10 sm:px-10 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
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
    <section aria-label={t.importer.title} className="start-main">
      <h1 className="display max-w-[16ch] text-[44px] font-bold text-ink sm:text-[64px] xl:text-[72px]">Your digital life,<br/>a little lighter.</h1>
      <p className="mt-4 max-w-[60ch] text-[18px] text-ink-2">Explore what social platforms know about you. Choose what stays.</p>
      <ScanPath />
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="display text-[26px] font-semibold text-ink">Explore your data export</h2>
        <p className="mt-2 text-ink-2">Drop your ZIP or JSON files here. We’ll read them locally in your browser.</p>
        <div onDragOver={e=>{e.preventDefault();setOver(true);}} onDragLeave={()=>setOver(false)} onDrop={onDrop}
          className={`drop-zone mt-5 flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition ${over?'border-accent bg-accent-dim':'border-line-strong'}`}>
          <FileArchive className="size-9 text-accent" aria-hidden/>
          <p className="font-semibold text-ink">Drop your ZIP or JSON files here</p>
          <p className="text-[13px] text-ink-3">or choose files or a folder from your device</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={()=>filesRef.current?.click()} className={primaryBtn}><Upload className="size-4" aria-hidden/>Choose files</button>
            <button type="button" onClick={()=>folderRef.current?.click()} className={secondaryBtn}><FolderOpen className="size-4" aria-hidden/>Choose folder</button>
          </div>
          <input ref={filesRef} type="file" multiple accept=".zip,.json,application/zip,application/json" className="hidden" onChange={e=>start(filesFromInput(e.target.files)).then(()=>(e.target.value=''))}/>
          <input ref={folderRef} type="file" className="hidden" {...({webkitdirectory:'',directory:''} as Record<string,string>)} onChange={e=>start(filesFromInput(e.target.files)).then(()=>(e.target.value=''))}/>
        </div>
        {error && <div role="alert" className="mt-4 flex gap-2 rounded-xl bg-critical/10 p-4 text-critical"><AlertTriangle className="size-5 shrink-0"/><p>{t.importer.failed}: {error}</p></div>}
        <div className="sample-band mt-4 flex flex-wrap items-center gap-4 rounded-xl p-4" style={{background:'var(--peach-soft)'}}>
          <Sparkles className="size-7 shrink-0 text-[var(--peach-ink)]" aria-hidden/>
          <div className="min-w-0 flex-1 basis-52"><p className="font-semibold text-ink">Take a look around first</p><p className="mt-1 text-[13px] text-ink-2">Explore the app with sample data to see what you can do.</p></div>
          <button type="button" onClick={sample} className={secondaryBtn}>Try sample data</button>
        </div>
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
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-accent-dim p-5 sm:p-6">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-ink">
        <Puzzle className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="display text-[22px] font-semibold text-ink">Check your privacy settings</h2>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-accent">{ext.installed ? "Connected" : "Browser extension"}</span>
        </div>
        <p className="mt-1 text-ink-2">Check what’s visible on your social accounts, then choose what to change.</p>
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
  return <aside className="start-guide rounded-2xl border border-line bg-surface p-6 lg:p-7">
    <h2 className="display text-[30px] font-semibold text-ink">Start with your data</h2>
    <p className="mt-2 text-ink-2">It only takes a few minutes. Here’s how:</p>
    <ol className="mt-6 space-y-7">
      {[
        ['Download your Facebook or Instagram data','Go to your account settings and request a copy of your information.'],
        ['Choose JSON and all time','Choose JSON format and include all time in your export settings.'],
        ['Open it here. Your files stay on your device.','Drop your ZIP or JSON files on the left. Everything is processed locally in your browser.'],
      ].map(([title,text],i)=><li key={title} className="flex gap-4"><span className="num grid size-11 shrink-0 place-items-center rounded-full bg-accent-dim text-[19px] font-semibold text-accent">{i+1}</span><div><h3 className="text-[16px] font-semibold leading-snug text-ink">{title}</h3><p className="mt-2 leading-relaxed text-ink-2">{text}</p></div></li>)}
    </ol>
    <details className="mt-6 border-t border-line pt-4 text-[13px] text-ink-2"><summary className="cursor-pointer font-semibold text-accent">Show download instructions</summary><ol className="mt-3 list-decimal space-y-2 pl-5">{t.importer.howSteps.map(step=><li key={step}>{step}</li>)}</ol></details>
    <div className="mt-6 rounded-xl p-5" style={{background:'var(--mint-soft)'}}><h3 className="flex items-center gap-2 font-semibold text-ink"><ShieldCheck className="size-5 text-[var(--plan)]"/>You are in control</h3><p className="mt-2 leading-relaxed text-ink-2">Your files are processed locally. We don’t upload your export or share it with anyone. You decide what to explore and what to keep.</p></div>
    <button type="button" onClick={()=>useUiStore.getState().setView('platforms')} className="mt-5 text-[13px] font-semibold text-accent hover:underline">Which platforms work?</button>
  </aside>;
}

const primaryBtn =
  'inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-ink hover:opacity-90';
const secondaryBtn =
  'inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong px-5 font-medium text-ink hover:bg-surface-2';
