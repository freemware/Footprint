import { Footprints, ShieldCheck } from 'lucide-react';
import { t } from '../../i18n/strings';

/** Privacy promise and data credits, at the end of every page. */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start justify-between gap-6 px-4 py-8 text-[13px] text-ink-3 sm:px-6">
        <div className="flex max-w-[56ch] gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
          <p>
            Footprint reads your Facebook or Instagram download inside this browser tab. Nothing is uploaded, stored on a server or shared, and
            closing the tab clears it.
          </p>
        </div>
        <div className="space-y-1 sm:text-right">
          <p className="flex items-center gap-1.5 sm:justify-end">
            <Footprints className="size-3.5" aria-hidden /> Footprint · {t.app.notAffiliated}
          </p>
          <p>Place names: GeoNames (CC BY 4.0). Map outlines: Natural Earth.</p>
        </div>
      </div>
    </footer>
  );
}
