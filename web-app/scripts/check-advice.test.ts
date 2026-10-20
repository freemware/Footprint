/**
 * Prints which settings a real export records and the privacy plan it produces:
 * setting ids, yes/no/audience values and fix statuses only, never names or content.
 * Skipped unless FB_EXPORT is set.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDataset, fileKind, type SourceFile } from '../src/importer/pipeline';
import { deepFixText } from '../src/importer/text';
import { buildInsights } from '../src/insights/insights';
import { buildPlan } from '../src/advice/plan';

const ROOT = process.env.FB_EXPORT;
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

describe.skipIf(!ROOT)('privacy plan on a real export', () => {
  it('reads settings and builds a plan', () => {
    const files: SourceFile[] = walk(ROOT!).map((p) => {
      const path = relative(ROOT!, p).split('\\').join('/');
      const size = statSync(p).size;
      return fileKind(path) === 'json' ? { path, size, json: deepFixText(JSON.parse(readFileSync(p, 'utf8'))) } : { path, size };
    });
    const d = buildDataset(files);
    const insights = buildInsights(d.events, d.collections, d.summary);
    const s = d.collections.settings;
    const plan = buildPlan({ insights, collections: d.collections });
    const kinds = (v: unknown) => (typeof v === 'boolean' || ['public', 'friends_of_friends', 'friends', 'only_me', 'custom'].includes(String(v)) ? v : typeof v);
    console.log(JSON.stringify({
      known: Object.fromEntries(Object.values(s).filter((x) => !x.id.includes(':')).map((x) => [x.id, kinds(x.value)])),
      fields: Object.values(s).filter((x) => x.id.startsWith('field:')).length,
      raw: Object.values(s).filter((x) => x.id.startsWith('raw:')).length,
      jurisdiction: d.collections.jurisdiction?.slice(0, 2),
      apps: d.collections.connectedApps.length,
      plan: { todo: plan.todo.map((p) => p.fix.id), review: plan.review.map((p) => p.fix.id), done: plan.done.map((p) => p.fix.id) },
    }, null, 1));
    expect(plan.all.length).toBeGreaterThan(0);
  });
});
