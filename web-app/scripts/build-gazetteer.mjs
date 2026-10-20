/**
 * Builds the offline city lookup used by the login map: one small text file per country in
 * src/geo/cities/<CC>.txt, so the app only ever loads the countries that appear in an export.
 *
 *   node scripts/build-gazetteer.mjs
 *
 * Source: all-the-cities (GeoNames data, CC BY 4.0, https://www.geonames.org), places with
 * at least 1,000 inhabitants. Each line: name \t admin code \t lat \t lng \t population,
 * most populous first, so the first name match is the likeliest one.
 */
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const cities = require('all-the-cities');
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'geo', 'cities');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const byCountry = new Map();
for (const c of cities) {
  if (!c.country || !c.name) continue;
  if (!byCountry.has(c.country)) byCountry.set(c.country, []);
  byCountry.get(c.country).push(c);
}

let total = 0;
for (const [cc, list] of byCountry) {
  list.sort((a, b) => b.population - a.population);
  const lines = list.map((c) => {
    const [lng, lat] = c.loc.coordinates;
    return [c.name.replace(/\t/g, ' '), c.adminCode, lat.toFixed(3), lng.toFixed(3), c.population].join('\t');
  });
  writeFileSync(join(out, `${cc}.txt`), lines.join('\n'));
  total += lines.length;
}
console.log(`Wrote ${byCountry.size} country files, ${total} places.`);
