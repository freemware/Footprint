/**
 * The importer: reads ZIPs, folders or JSON files, fixes text encoding, runs the parsers.
 * Normally runs inside a Web Worker (import.worker.ts) so the page stays responsive; where a
 * browser or host page won't start workers, the same code runs on the page instead.
 * Everything stays in this browser tab's memory; nothing is sent anywhere.
 */
import { BlobReader, Uint8ArrayWriter, ZipReader, configure, type FileEntry } from '@zip.js/zip.js';
import { buildDataset, fileKind, type Dataset, type SourceFile } from './pipeline';
import { deepFixText } from './text';
import { isJunk, stripCommonRoot } from './paths';

// zip.js would otherwise start its own workers from blob URLs; we're already in a worker.
configure({ useWebWorkers: false });

export interface ImportInput {
  file: File;
  /** Path relative to the chosen folder, for folder imports. */
  path?: string;
}

export interface ImportProgress {
  phase: 'listing' | 'reading' | 'parsing' | 'done';
  done: number;
  total: number;
  current?: string;
}

interface Item {
  path: string;
  size: number;
  read: () => Promise<Uint8Array>;
  blob: () => Promise<Blob>;
}

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  json: 'application/json',
};
const mimeOf = (p: string) => MIME[p.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';

/** State kept for the raw data explorer and media previews. Replaced on every import. */
let docs = new Map<string, unknown>();
let items = new Map<string, Item>();
let thumbs = new Map<string, Promise<Blob | undefined>>();
let readers: ZipReader<unknown>[] = [];

const isZip = (f: File) => /\.zip$/i.test(f.name) || f.type === 'application/zip' || f.type === 'application/x-zip-compressed';
const decoder = new TextDecoder('utf-8');

async function listItems(inputs: ImportInput[], progress: (p: ImportProgress) => void): Promise<Item[]> {
  const out: Item[] = [];
  for (const [i, input] of inputs.entries()) {
    progress({ phase: 'listing', done: i, total: inputs.length, current: input.file.name });
    if (isZip(input.file)) {
      const reader = new ZipReader(new BlobReader(input.file));
      readers.push(reader);
      for (const entry of await reader.getEntries()) {
        if (entry.directory) continue;
        const fe = entry as FileEntry;
        out.push({
          path: fe.filename,
          size: fe.uncompressedSize,
          read: () => fe.getData(new Uint8ArrayWriter()),
          blob: async () => new Blob([await fe.getData(new Uint8ArrayWriter())], { type: mimeOf(fe.filename) }),
        });
      }
    } else {
      const file = input.file;
      out.push({
        path: input.path || file.name,
        size: file.size,
        read: async () => new Uint8Array(await file.arrayBuffer()),
        blob: async () => file,
      });
    }
  }
  return out.filter((it) => !isJunk(it.path));
}

export const api = {
  /** Answers immediately, so the page can tell the worker started. */
  async ping(): Promise<true> {
    return true;
  },

  async importFiles(inputs: ImportInput[], onProgress: (p: ImportProgress) => void): Promise<Dataset> {
    await api.reset();
    const name = inputs.length === 1 ? inputs[0]!.file.name : inputs[0]?.path?.split('/')[0] || `${inputs.length} files`;
    const raw = await listItems(inputs, onProgress);
    const rel = stripCommonRoot(raw.map((r) => r.path));

    const files: SourceFile[] = [];
    const total = raw.length;
    let done = 0;
    for (const it of raw) {
      const path = rel(it.path);
      if (items.has(path)) continue; // the same file in two ZIP parts
      items.set(path, { ...it, path });
      if (fileKind(path) === 'json') {
        try {
          const json = deepFixText(JSON.parse(decoder.decode(await it.read())));
          docs.set(path, json);
          files.push({ path, size: it.size, json });
        } catch (e) {
          files.push({ path, size: it.size, error: e instanceof Error ? e.message : 'Could not read this file' });
        }
      } else files.push({ path, size: it.size });
      done++;
      if (done % 10 === 0 || done === total) onProgress({ phase: 'reading', done, total, current: path });
    }

    onProgress({ phase: 'parsing', done: 0, total: files.length });
    const dataset = buildDataset(files, name, (d, t) => onProgress({ phase: 'parsing', done: d, total: t }));
    onProgress({ phase: 'done', done: total, total });
    return dataset;
  },

  /** The fixed JSON of one file, for the raw data explorer. */
  async getRawFile(path: string): Promise<unknown> {
    return docs.get(path);
  },

  /** A media file (photo, video …) from the export, for previews. */
  async getMedia(path: string): Promise<Blob | undefined> {
    return items.get(path)?.blob();
  },

  /**
   * A small JPEG preview of a photo, made once and cached. Falls back to the original
   * file where the browser can't draw off-screen. Videos return undefined.
   */
  async getThumb(path: string, size = 320): Promise<Blob | undefined> {
    const key = `${path}@${size}`;
    if (!thumbs.has(key)) thumbs.set(key, makeThumb(path, size));
    return thumbs.get(key)!;
  },

  /** Drop everything from memory. */
  async reset() {
    await Promise.all(readers.map((r) => r.close().catch(() => undefined)));
    readers = [];
    docs = new Map();
    items = new Map();
    thumbs = new Map();
  },
};

async function makeThumb(path: string, size: number): Promise<Blob | undefined> {
  const it = items.get(path);
  if (!it || !/\.(jpe?g|png|gif|webp)$/i.test(path)) return undefined;
  const blob = await it.blob();
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') return blob;
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, size / Math.min(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = new OffscreenCanvas(w, h);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 });
  } catch {
    return blob;
  }
}

export type ImportApi = typeof api;
