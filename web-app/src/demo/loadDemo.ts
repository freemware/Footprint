import { buildDataset, type Dataset, type SourceFile } from '../importer/pipeline';
import { deepFixText } from '../importer/text';
import { buildSyntheticExport } from './syntheticExport';

/**
 * The demo, loaded straight into the page: the invented export goes through the same
 * text-encoding fix and parsers as a real one, but without reading files, starting a
 * worker or drawing anything up front. Takes a fraction of a second, and works on hosts
 * that block workers or file access.
 */
export interface DemoSource {
  raw: Map<string, unknown>;
  media: Map<string, { hue: number; seed: number } | 'video'>;
}

export function loadDemo(): { dataset: Dataset; source: DemoSource } {
  const raw = new Map<string, unknown>();
  const media: DemoSource['media'] = new Map();
  const files: SourceFile[] = buildSyntheticExport().map((f) => {
    if (f.json !== undefined) {
      // Same as a real file: JSON text in, encoding fixed on the way out.
      const text = JSON.stringify(f.json);
      const json = deepFixText(JSON.parse(text));
      raw.set(f.path, json);
      return { path: f.path, size: text.length, json };
    }
    media.set(f.path, f.image ?? 'video');
    return { path: f.path, size: f.image ? 48_000 : 2_400_000 };
  });
  return { dataset: buildDataset(files, 'Demo export'), source: { raw, media } };
}

/** A small seeded random generator, so each demo photo always looks the same. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** An abstract landscape (sky, sun, layered hills) as SVG, so the gallery has pictures without anyone's photos. */
export function demoPicture(hue: number, seed: number): Blob {
  const W = 640;
  const H = 480;
  const r = rng(seed);
  const hills: string[] = [];
  for (let layer = 0; layer < 4; layer++) {
    const base = H * (0.45 + layer * 0.13);
    const amp = 18 + r() * 40;
    const freq = 0.004 + r() * 0.01;
    const phase = r() * 10;
    let d = `M0 ${H}`;
    for (let x = 0; x <= W; x += 16) d += ` L${x} ${(base + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1 + phase) * amp * 0.25).toFixed(1)}`;
    d += ` L${W} ${H} Z`;
    hills.push(`<path d="${d}" fill="hsl(${(hue + 150 + layer * 12) % 360} ${35 + layer * 8}% ${55 - layer * 11}%)"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><linearGradient id="s" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 60% ${70 + r() * 15}%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 70% ${80 + r() * 10}%)"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#s)"/>
<circle cx="${(W * (0.2 + r() * 0.6)).toFixed(0)}" cy="${(H * (0.18 + r() * 0.2)).toFixed(0)}" r="${(30 + r() * 40).toFixed(0)}" fill="hsl(${(hue + 180) % 360} 85% 92%)" fill-opacity="0.9"/>
${hills.join('\n')}
</svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}
