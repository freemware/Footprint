import { useEffect, useId, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, CreditCard, KeyRound, Loader2, Lock, Sparkles, X } from 'lucide-react';
import { PRO } from './config';
import { usePro } from './usePro';
import { proCopy as C } from '../i18n/pro';

/** Upgrade sheet: what Pro adds, where to buy it, and where to paste the license key. */
export function UpgradeDialog() {
  const open = usePro((s) => s.upgradeOpen);
  const close = usePro((s) => s.closeUpgrade);
  const license = usePro((s) => s.license);
  const activate = usePro((s) => s.activate);
  const deactivate = usePro((s) => s.deactivate);
  const claim = usePro((s) => s.claim);
  const savedKey = usePro((s) => s.key);
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();
  const inputId = useId();
  const [key, setKey] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'bad' | 'ok'>('idle');

  useEffect(() => {
    if (!open) return;
    setState('idle');
    setCopied(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState('checking');
    setState((await activate(key)) ? 'ok' : 'bad');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: 'var(--backdrop)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-title"
            initial={reduce ? false : { y: 12, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]"
          >
            <div className="flex items-start gap-3 border-b border-line p-5" style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--plan) 14%, var(--surface)), var(--surface))' }}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--plan)', color: 'var(--plan-ink)' }}>
                <Sparkles className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="upgrade-title" className="display text-[24px] font-semibold text-ink">
                  {license ? C.activeTitle : C.title}
                </h2>
                <p className="mt-1 text-ink-2">{license ? C.activeLead : C.lead}</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="grid size-9 place-items-center rounded-xl text-ink-3 hover:bg-surface-2 hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <ul className="space-y-2.5">
                {C.features.map((f) => (
                  <li key={f.title} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--plan)' }} aria-hidden />
                    <span>
                      <span className="font-semibold text-ink">{f.title}</span> <span className="text-ink-2">{f.text}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {!license && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="display text-[26px] font-semibold text-ink">{PRO.PRICE}</p>
                    <p className="text-[13px] text-ink-3">{PRO.PRICE_NOTE}</p>
                  </div>
                  {PRO.BUY_URL ? (
                    <a
                      href={PRO.BUY_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center gap-2 rounded-xl px-5 font-semibold hover:opacity-90"
                      style={{ background: 'var(--plan)', color: 'var(--plan-ink)' }}
                    >
                      <CreditCard className="size-4" aria-hidden /> {C.buy}
                    </a>
                  ) : (
                    <span className="rounded-xl border border-line-strong px-4 py-2.5 text-[13px] text-ink-2">{C.buySoon}</span>
                  )}
                  {PRO.BUY_URL && <p className="w-full text-[12px] text-ink-3">{C.stripeNote}</p>}
                </div>
              )}

              {claim !== 'idle' && claim !== 'done' && (
                <p role="status" className={`flex items-start gap-2 rounded-xl border p-3 text-[14px] ${claim === 'claiming' ? 'border-line text-ink-2' : 'border-critical/40 text-ink'}`}>
                  {claim === 'claiming' && <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden />}
                  {claim === 'claiming' ? C.claiming : claim === 'unpaid' ? C.claimUnpaid : C.claimFailed}
                </p>
              )}

              {license ? (
                <div className="space-y-3 rounded-xl border border-good/40 bg-good/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <Check className="size-4 text-good" aria-hidden /> {claim === 'done' ? C.okKey : C.activeOn}
                    </span>
                    <button type="button" onClick={deactivate} className="text-[13px] font-medium text-ink-2 hover:underline">
                      {C.remove}
                    </button>
                  </div>
                  {claim === 'done' && <p className="text-[13px] text-ink-2">{C.claimDone}</p>}
                  {savedKey && (
                    <div>
                      <p className="text-[12px] font-semibold text-ink-3">{C.yourKey}</p>
                      <div className="mt-1 flex gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[12px] text-ink">{savedKey}</code>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard?.writeText(savedKey).then(() => setCopied(true), () => setCopied(false));
                          }}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] font-medium text-ink hover:bg-surface-2"
                        >
                          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />} {copied ? C.copied : C.copy}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-2">
                  <label htmlFor={inputId} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                    <KeyRound className="size-3.5" aria-hidden /> {C.haveKey}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id={inputId}
                      value={key}
                      onChange={(e) => {
                        setKey(e.target.value);
                        setState('idle');
                      }}
                      placeholder="FP1.…"
                      autoComplete="off"
                      spellCheck={false}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 font-mono text-[13px] text-ink outline-none focus:border-accent"
                    />
                    <button type="submit" disabled={!key.trim() || state === 'checking'} className="h-11 rounded-xl border border-line-strong px-4 font-medium text-ink hover:bg-surface-2 disabled:opacity-50">
                      {state === 'checking' ? C.checking : C.activate}
                    </button>
                  </div>
                  {state === 'bad' && <p className="text-[13px] text-critical">{C.badKey}</p>}
                  {state === 'ok' && <p className="text-[13px] text-good">{C.okKey}</p>}
                </form>
              )}

              <p className="flex items-start gap-2 text-[12px] text-ink-3">
                <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {C.privacy}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small inline invitation to unlock, used wherever a Pro feature is locked. */
export function ProLock({ title, text, compact }: { title: string; text?: string; compact?: boolean }) {
  const openUpgrade = usePro((s) => s.openUpgrade);
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface-2 ${compact ? 'p-3' : 'p-5'}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: 'color-mix(in oklab, var(--plan) 18%, transparent)', color: 'var(--plan)' }}>
        <Lock className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-semibold text-ink">{title}</p>
        {text && <p className="mt-0.5 text-[13px] text-ink-2">{text}</p>}
      </div>
      <button type="button" onClick={openUpgrade} className="inline-flex h-10 items-center gap-2 rounded-xl px-4 font-semibold hover:opacity-90" style={{ background: 'var(--plan)', color: 'var(--plan-ink)' }}>
        <Sparkles className="size-4" aria-hidden /> {C.unlock}
      </button>
    </div>
  );
}
