import { ext } from './shared/ext';
import { runStep } from './engine/runner';
import { looksLikeSecurityCheck, looksSignedOut, outline } from './engine/dom';
import type { Step } from './shared/types';

/**
 * Injected into a platform's page only while Footprint is running a scan or an approved change.
 * It reads labels and presses controls as instructed, one step at a time, and reports back to
 * the extension. It never reads passwords or cookies and never sends anything off the device.
 */

type Msg = { type: 'fp:ping' } | { type: 'fp:step'; step: Step } | { type: 'fp:state' } | { type: 'fp:outline' };

const w = window as unknown as { __footprintContent?: boolean };
if (!w.__footprintContent) {
  w.__footprintContent = true;
  ext.runtime.onMessage.addListener((msg: Msg, _sender, reply) => {
    switch (msg?.type) {
      case 'fp:ping':
        reply('pong');
        return false;
      case 'fp:state':
        reply({ signedOut: looksSignedOut(document), securityCheck: looksLikeSecurityCheck(document), path: location.pathname });
        return false;
      case 'fp:outline':
        reply(outline(document));
        return false;
      case 'fp:step':
        // Reply straight after a click; the controller waits, so a page that starts loading can't swallow the answer.
        void runStep(document, msg.step, { settle: 0 }).then(reply);
        return true;
      default:
        return false;
    }
  });
}
