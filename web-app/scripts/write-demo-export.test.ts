/**
 * Writes the invented demo person's download to a folder as JSON files, for browser tests that need
 * to import a download the normal way (the in-app demo never mixes in live scan results).
 * Skipped unless DEMO_OUT is set:
 *
 *   DEMO_OUT=/tmp/demo-export npx vitest run scripts/write-demo-export.test.ts
 *   DEMO_OUT=/tmp/ig-demo DEMO_PLATFORM=instagram npx vitest run scripts/write-demo-export.test.ts
 *
 * Every value is synthetic (see src/demo/syntheticExport.ts). Media files are skipped.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSyntheticExport } from '../src/demo/syntheticExport';
import { buildSyntheticInstagram } from '../src/demo/syntheticInstagram';

const OUT = process.env.DEMO_OUT;
/** DEMO_PLATFORM=instagram writes the invented Instagram download instead. */
const BUILD = process.env.DEMO_PLATFORM === 'instagram' ? buildSyntheticInstagram : buildSyntheticExport;

describe.skipIf(!OUT)('write demo export', () => {
  it('writes every JSON file', () => {
    let n = 0;
    for (const f of BUILD()) {
      if (f.json === undefined) continue;
      const p = join(OUT!, f.path);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, JSON.stringify(f.json));
      n++;
    }
    expect(n).toBeGreaterThan(15);
  });
});
