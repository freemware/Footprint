import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, ExternalLink, ShieldAlert, ShieldCheck, ShieldQuestion, Wand2 } from 'lucide-react';
import { C, ago } from './copy';
import { Button, Card, Dialog, JobBar, LinkButton, Pill, ProblemReport, ProGate, Ring } from './parts';
import { useStored } from './hooks';
import { call } from '../../src/shared/messages';
import { platform } from '../../src/platforms/registry';
import type { CheckDef } from '../../src/platforms/types';
import type { CheckResult } from '../../src/shared/types';

const IMPACT_ORDER = { high: 0, medium: 1, low: 2 } as const;

/** Facebook privacy scan: what's open now, and approve-to-fix. */
export function ScanView({ pro, focus, onKey, platformId = 'facebook' }: { pro: boolean; focus?: string; onKey: () => void; platformId?: string }) {
  const definition = platform(platformId)!;
  const reports = useStored('reports');
  const job = useStored('job');
  const latest = reports[platformId]?.[0];
  // A scan stopped by sign-out or a security check reads nothing; keep showing the last full one.
  const shown = reports[platformId]?.find((r) => r.results.length > 0);
  const report = latest;
  const running = job?.status === 'running';
  const [selected, setSelected] = useState<string[]>([]);
  const [approving, setApproving] = useState<string[] | null>(null);
  const [gate, setGate] = useState(false);

  const rows = useMemo(() => {
    const byId = new Map(shown?.results.map((r) => [r.checkId, r]) ?? []);
    return definition.checks
      .map((check) => ({ check, result: byId.get(check.id) }))
      .filter((x) => x.result)
      .sort((a, b) => IMPACT_ORDER[a.check.impact] - IMPACT_ORDER[b.check.impact]) as { check: CheckDef; result: CheckResult }[];
  }, [shown, definition]);
  const risk = rows.filter((r) => r.result.status === 'risk');
  const ok = rows.filter((r) => r.result.status === 'ok');
  const unknown = rows.filter((r) => r.result.status === 'unknown');
  const fixable = risk.filter((r) => r.check.fix).map((r) => r.check.id);

  const askFix = (ids: string[]) => {
    if (!pro) return setGate(true);
    setApproving(ids);
  };
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-1 basis-80">
          <h1 className="display text-[32px] font-semibold text-ink">{definition.name} privacy scan</h1>
          <p className="mt-2 max-w-[68ch] text-ink-2">{C.scan.lead.replaceAll('Facebook',definition.name)}</p>
          {shown && (
            <p className="mt-2 text-[13px] text-ink-3">
              {C.scan.last(ago(shown.at))}
              {shown.trigger === 'autoscan' ? ` · ${C.scan.autoscanNote}` : ''}
            </p>
          )}
        </div>
        <Button onClick={() => void call({ type: 'scan', platform: platformId })} disabled={running}>
          {running && job?.kind === 'scan' ? C.scan.scanning : report ? C.scan.scanAgain : C.scan.scanNow}
        </Button>
      </header>

      <JobBar />

      {report?.signedOut && (
        <Banner tone="risk" text={C.scan.signedOut}>
          <LinkButton href={definition.home} size="sm">
            {C.scan.openFacebook} <ExternalLink className="size-3.5" aria-hidden />
          </LinkButton>
        </Banner>
      )}
      {report?.stoppedBy === 'security_check' && <Banner tone="risk" text={C.scan.securityCheck} />}
      {gate && !pro && <ProGate onHaveKey={onKey} />}

      {!shown ? (
        !report && (
        <Card className="p-6">
          <p className="max-w-[60ch] text-ink-2">{C.scan.never}</p>
        </Card>
        )
      ) : rows.length > 0 ? (
        <>
          <Card className="flex flex-wrap items-center gap-5 p-5">
            <Ring ok={ok.length} total={rows.length} size={72} />
            <div className="min-w-0 flex-1 basis-56">
              <p className="display text-[22px] font-semibold text-ink">{unknown.length || rows.length < definition.checks.length ? `Scan incomplete · ${ok.length} private · ${unknown.length + definition.checks.length - rows.length} unread` : C.scan.summary(risk.length, ok.length, unknown.length)}</p>
              <p className="text-[13px] text-ink-3">{ok.length} of {rows.length} checked settings are private.</p>
            </div>
            {fixable.length > 0 && (
              <Button variant="fix" className="w-full sm:w-auto" onClick={() => askFix(selected.length ? selected : fixable)}>
                <Wand2 className="size-4" aria-hidden /> {selected.length ? C.scan.fixSelected(selected.length) : C.scan.fixAll(fixable.length)}
              </Button>
            )}
          </Card>

          {risk.length > 0 && (
            <Section icon={<ShieldAlert className="size-5" style={{ color: 'var(--warning)' }} aria-hidden />} title={C.scan.needs} hint={C.scan.needsHint}>
              {risk.map(({ check, result }) => (
                <CheckCard key={check.id} check={check} result={result} focus={focus === check.id} selected={selected.includes(check.id)} onSelect={check.fix ? () => toggle(check.id) : undefined} onFix={check.fix ? () => askFix([check.id]) : undefined} />
              ))}
            </Section>
          )}
          {unknown.length > 0 && (
            <Section icon={<ShieldQuestion className="size-5 text-ink-3" aria-hidden />} title={C.scan.unknown} hint={C.scan.unknownHint}>
              {unknown.map(({ check, result }) => (
                <CheckCard key={check.id} check={check} result={result} focus={focus === check.id} />
              ))}
            </Section>
          )}
          {ok.length > 0 && (
            <details className="group" open={!risk.length}>
              <summary className="flex cursor-pointer list-none items-center gap-2 py-2">
                <ShieldCheck className="size-5 text-good" aria-hidden />
                <span className="display text-[20px] font-semibold text-ink">{C.scan.fine}</span>
                <span className="num text-ink-3">{ok.length}</span>
                <ChevronDown className="size-4 text-ink-3 transition group-open:rotate-180" aria-hidden />
              </summary>
              <div className="mt-2 space-y-2">
                {ok.map(({ check, result }) => (
                  <CheckCard key={check.id} check={check} result={result} />
                ))}
              </div>
            </details>
          )}
        </>
      ) : null}

      {approving && (
        <Dialog
          title={C.approve.title(approving.length)}
          onClose={() => setApproving(null)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setApproving(null)}>
                {C.approve.cancel}
              </Button>
              <Button
                variant="fix"
                onClick={() => {
                  void call({ type: 'fix', platform: platformId, checks: approving });
                  setApproving(null);
                  setSelected([]);
                }}
              >
                {C.approve.confirm(approving.length)}
              </Button>
            </>
          }
        >
          <p className="text-ink-2">{C.approve.lead}</p>
          <ul className="space-y-2">
            {approving.map((id) => {
              const check = definition.checks.find((c) => c.id === id)!;
              const reading = shown?.results.find((r) => r.checkId === id)?.reading;
              const now = reading ? (check.display?.(reading.value) ?? reading.raw) : undefined;
              return (
                <li key={id} className="rounded-xl border border-line bg-surface-2 p-3">
                  <p className="font-semibold text-ink">{check.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[14px]">
                    <Pill tone="risk">{now ?? '?'}</Pill>
                    <ArrowRight className="size-4 text-ink-3" aria-label="changes to" />
                    <Pill tone="ok">{check.fix?.to}</Pill>
                  </p>
                  <p className="mt-2 text-[13px] text-ink-3">{check.limits}</p>
                </li>
              );
            })}
          </ul>
          <p className="text-[13px] text-ink-3">{C.approve.stopAnytime}</p>
        </Dialog>
      )}
    </div>
  );
}

function Banner({ tone, text, children }: { tone: 'risk'; text: string; children?: React.ReactNode }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border p-4" style={{ borderColor: tone === 'risk' ? 'color-mix(in oklab, var(--warning) 45%, transparent)' : undefined, background: 'color-mix(in oklab, var(--warning) 8%, transparent)' }}>
      <ShieldAlert className="size-5 shrink-0" style={{ color: 'var(--warning)' }} aria-hidden />
      <p className="min-w-0 flex-1 text-ink">{text}</p>
      {children}
    </div>
  );
}

function Section({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="display flex items-center gap-2 text-[20px] font-semibold text-ink">
          {icon} {title}
        </h2>
        <p className="text-[13px] text-ink-3">{hint}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function CheckCard({ check, result, focus, selected, onSelect, onFix }: { check: CheckDef; result: CheckResult; focus?: boolean; selected?: boolean; onSelect?: () => void; onFix?: () => void }) {
  const [open, setOpen] = useState(!!focus);
  const tone = result.status;
  return (
    <Card className={`p-4 ${focus ? 'ring-2 ring-accent' : ''}`}>
      <div className="flex flex-wrap items-start gap-3">
        {onSelect && <input type="checkbox" checked={!!selected} onChange={onSelect} aria-label={`Select ${check.title}`} className="mt-1.5 size-4 accent-[var(--plan)]" />}
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-[12px] font-semibold text-ink-3">{C.area[check.area]}</p>
          <h3 className="text-[16px] font-semibold text-ink">{check.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px]">
            {result.reading && (
              <>
                <span className="text-ink-3">{C.scan.now}:</span>
                <Pill tone={tone === 'risk' ? 'risk' : 'ok'}>{check.display?.(result.reading.value) ?? result.reading.raw}</Pill>
              </>
            )}
            {tone === 'risk' && check.fix && (
              <>
                <ArrowRight className="size-3.5 text-ink-3" aria-hidden />
                <span className="text-ink-3">{C.scan.to}:</span>
                <Pill tone="info">{check.fix.to}</Pill>
              </>
            )}
            {tone === 'risk' && !check.fix && <Pill tone="unknown">{C.scan.manualOnly}</Pill>}
            {tone === 'unknown' && result.problem && <span className="text-ink-3">{C.reason[result.problem]}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onFix && (
            <Button size="sm" variant="fix" onClick={onFix}>
              <Wand2 className="size-4" aria-hidden /> {C.scan.fixOne}
            </Button>
          )}
          {tone !== 'ok' && (
            <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? C.scan.hide : C.scan.howTo}
            </Button>
          )}
        </div>
      </div>
      {open && tone !== 'ok' && (
        <div className="mt-4 space-y-3 border-t border-line pt-4 text-[14px]">
          {!check.fix && tone === 'risk' && <p className="text-ink-2">{C.scan.manualOnlyHint}</p>}
          <div>
            <p className="font-semibold text-ink">{C.scan.why}</p>
            <p className="text-ink-2">{check.why}</p>
          </div>
          <ol className="space-y-1.5">
            {check.manual.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-[12px] font-semibold text-ink">{i + 1}</span>
                <span className="text-ink">{s}</span>
              </li>
            ))}
          </ol>
          <p className="rounded-xl bg-surface-2 p-3 text-ink-2">
            <span className="font-semibold text-ink">{C.scan.limits}: </span>
            {check.limits}
          </p>
          <LinkButton href={check.url} size="sm">
            {C.scan.openSetting} <ExternalLink className="size-3.5" aria-hidden />
          </LinkButton>
          {result.outline && <ProblemReport outline={result.outline} what={`read:${check.id}`} />}
        </div>
      )}
    </Card>
  );
}
