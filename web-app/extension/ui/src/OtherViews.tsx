import { useState, type FormEvent } from 'react';
import { CalendarClock, Check, ExternalLink, KeyRound, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react';
import { C, APP_URL, ago, when } from './copy';
import { Button, Card, LinkButton, PlatformMark, Pill, ProGate, Ring } from './parts';
import { useStored } from './hooks';
import { call } from '../../src/shared/messages';
import { PLATFORMS } from '../../src/platforms/registry';
import type { Frequency } from '../../src/shared/types';

export function HomeView({ onChoosePlatform }: { go: (v: string) => void; onChoosePlatform: (id:string)=>void }) {
  const reports = useStored('reports');
  return (
    <div className="space-y-6">
      <header>
        <h1 className="display text-[32px] font-semibold text-ink">{C.home.title}</h1>
        <p className="mt-2 max-w-[68ch] text-ink-2">{C.home.lead}</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PLATFORMS.map((p) => {
          const latest = reports[p.id]?.[0];
          const r = reports[p.id]?.find((x) => x.results.length > 0);
          const risk = r?.results.filter((x) => x.status === 'risk').length ?? 0;
          const ok = r?.results.filter((x) => x.status === 'ok').length ?? 0;
          const ready = p.status === 'available';
          return (
            <li key={p.id}>
              <Card className={`flex h-full flex-col gap-3 p-5 ${ready ? '' : 'opacity-90'}`}>
                <div className="flex items-center gap-3">
                  <PlatformMark mark={p.mark} muted={!ready} />
                  <div className="min-w-0 flex-1">
                    <p className="display text-[20px] font-semibold text-ink">{p.name}</p>
                    <Pill tone={ready ? 'info' : 'unknown'}>{ready ? C.home.available : C.home.coming}</Pill>
                  </div>
                  {ready && r && <Ring ok={ok} total={r.results.length} size={52} />}
                </div>
                {ready ? (
                  <>
                    <p className="text-[14px] text-ink-2">
                      {latest?.signedOut ? 'Signed out in this browser · ' : latest?.stoppedBy === 'security_check' ? 'Last scan stopped at a security check · ' : ''}
                      {r ? `${risk ? `${risk} to look at` : r.results.some(x=>x.status==='unknown') ? 'Scan incomplete' : 'All checked settings private'} · scanned ${ago(r.at)}` : latest ? '' : C.home.neverScanned}
                    </p>
                    <Button className="mt-auto" onClick={() => onChoosePlatform(p.id)}>
                      {C.home.openScan}
                    </Button>
                  </>
                ) : (
                  <div className="text-[13px] text-ink-2">
                    <p className="font-semibold text-ink-3">{C.home.willCover}</p>
                    <ul className="mt-1 space-y-0.5">
                      {p.planned?.map((x) => (
                        <li key={x}>· {x}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <div className="min-w-0 flex-1 basis-72">
          <p className="display text-[20px] font-semibold text-ink">{C.home.exportTitle}</p>
          <p className="text-ink-2">{C.home.exportText}</p>
        </div>
        <LinkButton href={APP_URL}>
          {C.home.exportCta} <ExternalLink className="size-4" aria-hidden />
        </LinkButton>
      </Card>
    </div>
  );
}

export function AutoscanView({ pro, nextRun, onKey }: { pro: boolean; nextRun?: number; onKey: () => void }) {
  const s = useStored('autoscan');
  const save = (patch: Partial<typeof s>) => void call({ type: 'autoscan', settings: { ...s, ...patch } });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="display text-[32px] font-semibold text-ink">{C.autoscans.title}</h1>
        <p className="mt-2 max-w-[68ch] text-ink-2">{C.autoscans.lead}</p>
      </header>
      {!pro && <ProGate onHaveKey={onKey} />}
      <Card className="space-y-5 p-5">
        <label className="flex items-center justify-between gap-4">
          <span className="font-semibold text-ink">{C.autoscans.toggle}</span>
          <button
            type="button"
            role="switch"
            aria-checked={s.enabled}
            disabled={!pro}
            onClick={() => save({ enabled: !s.enabled })}
            className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50 ${s.enabled ? 'bg-[var(--plan)]' : 'bg-surface-3'}`}
          >
            <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${s.enabled ? 'left-7' : 'left-1'}`} />
          </button>
        </label>
        <fieldset className="flex flex-wrap gap-2" disabled={!pro || !s.enabled}>
          <legend className="sr-only">How often</legend>
          {(['weekly', 'monthly'] as Frequency[]).map((f) => (
            <label key={f} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 ${s.frequency === f ? 'border-accent bg-accent-dim text-ink' : 'border-line text-ink-2'} ${!pro || !s.enabled ? 'opacity-50' : ''}`}>
              <input type="radio" name="freq" checked={s.frequency === f} onChange={() => save({ frequency: f })} className="accent-[var(--accent)]" />
              {C.autoscans[f]}
            </label>
          ))}
        </fieldset>
        {s.enabled && (
          <p className="flex items-center gap-2 text-ink-2">
            <CalendarClock className="size-4 text-ink-3" aria-hidden /> {C.autoscans.next(when(nextRun))}
            {s.lastRun ? ` · ${C.autoscans.lastRun(ago(s.lastRun))}` : ''}
          </p>
        )}
      </Card>
      <Card className="p-5">
        <ul className="space-y-2 text-ink-2">
          {C.autoscans.how.map((h) => (
            <li key={h} className="flex gap-2">
              <Check className="mt-1 size-4 shrink-0" style={{ color: 'var(--plan)' }} aria-hidden /> {h}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function HistoryView() {
  const history = useStored('history');
  return (
    <div className="space-y-6">
      <header>
        <h1 className="display text-[32px] font-semibold text-ink">{C.history.title}</h1>
        <p className="mt-2 max-w-[68ch] text-ink-2">{C.history.lead}</p>
      </header>
      <Card className="divide-y divide-line">
        {history.length === 0 && <p className="p-5 text-ink-3">{C.history.none}</p>}
        {history.map((h) => (
          <div key={`${h.at}-${h.summary}`} className="flex items-start gap-3 p-4">
            {h.ok ? <Check className="mt-0.5 size-4 shrink-0 text-good" aria-label="Done" /> : <X className="mt-0.5 size-4 shrink-0 text-critical" aria-label="Not done" />}
            <p className="min-w-0 flex-1 text-ink">{h.summary}</p>
            <span className="shrink-0 text-[12px] text-ink-3">{new Date(h.at).toLocaleString()}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function SettingsView({ pro, focusKey }: { pro: boolean; focusKey?: boolean }) {
  const prefs = useStored('prefs');
  const [key, setKey] = useState('');
  const [bad, setBad] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await call({ type: 'license', key });
    setBad(!r.ok);
    if (r.ok) setKey('');
  };
  return (
    <div className="space-y-6">
      <header>
        <h1 className="display text-[32px] font-semibold text-ink">{C.settings.title}</h1>
      </header>

      <Card className="space-y-4 p-5">
        <h2 className="display flex items-center gap-2 text-[20px] font-semibold text-ink">
          <Sparkles className="size-5" style={{ color: 'var(--plan)' }} aria-hidden /> {C.settings.proTitle}
        </h2>
        {pro ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-ink">
              <Check className="size-4 text-good" aria-hidden /> {C.settings.proOn}
            </p>
            <Button size="sm" variant="quiet" onClick={() => void call({ type: 'removeLicense' })}>
              {C.settings.remove}
            </Button>
          </div>
        ) : (
          <>
            <p className="text-ink-2">{C.settings.proOff}</p>
            <form onSubmit={submit} className="space-y-2">
              <label htmlFor="key" className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                <KeyRound className="size-3.5" aria-hidden /> {C.settings.keyLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                <input id="key" autoFocus={focusKey} value={key} onChange={(e) => setKey(e.target.value)} placeholder="FP1.…" spellCheck={false} autoComplete="off" className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 font-mono text-[13px] text-ink" />
                <Button type="submit" variant="ghost" disabled={!key.trim()}>
                  {C.settings.activate}
                </Button>
              </div>
              {bad && <p className="text-[13px] text-critical">{C.settings.bad}</p>}
            </form>
            <LinkButton href={APP_URL} variant="fix" size="sm">
              {C.settings.getPro}
            </LinkButton>
          </>
        )}
      </Card>

      <Card className="p-5">
        <label className="flex items-start justify-between gap-4">
          <span>
            <span className="font-semibold text-ink">{C.settings.watch}</span>
            <span className="mt-1 block text-[13px] text-ink-3">{C.settings.watchHint}</span>
          </span>
          <input type="checkbox" checked={prefs.watch} onChange={(e) => void call({ type: 'prefs', watch: e.target.checked })} className="mt-1 size-5 accent-[var(--accent)]" />
        </label>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="display flex items-center gap-2 text-[20px] font-semibold text-ink">
          <ShieldCheck className="size-5 text-good" aria-hidden /> {C.settings.privacyTitle}
        </h2>
        <ul className="space-y-2 text-ink-2">
          {C.settings.privacy.map((x) => (
            <li key={x} className="flex gap-2">
              <Check className="mt-1 size-4 shrink-0 text-good" aria-hidden /> {x}
            </li>
          ))}
        </ul>
        <p className="rounded-xl bg-surface-2 p-3 text-[13px] text-ink-3">{C.settings.terms}</p>
      </Card>

      <Card className="flex flex-wrap items-center gap-4 p-5">
        <div className="min-w-0 flex-1 basis-64">
          <h2 className="font-semibold text-ink">{C.settings.deleteTitle}</h2>
          <p className="text-[13px] text-ink-3">{C.settings.deleteText}</p>
        </div>
        <Button variant="danger" onClick={() => window.confirm(C.settings.deleteConfirm) && void call({ type: 'clearAll' })}>
          <Trash2 className="size-4" aria-hidden /> {C.settings.deleteCta}
        </Button>
      </Card>
    </div>
  );
}
