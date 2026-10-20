import * as Comlink from 'comlink';
import ImportWorker from './import.worker.ts?worker&inline';
import type { ImportApi, ImportInput, ImportProgress } from './importApi';
import type { Dataset } from './pipeline';
import { demoPicture, type DemoSource } from '../demo/loadDemo';

export type { ImportInput, ImportProgress };

/** Same methods whether the importer runs in a worker (via Comlink) or on the page. */
type Api = { [K in keyof ImportApi]: (...args: Parameters<ImportApi[K]>) => Promise<Awaited<ReturnType<ImportApi[K]>>> };

let worker: Worker | null = null;
let apiPromise: Promise<Api> | null = null;
/** Set once workers have failed here, so later imports don't wait for them again. */
let noWorkers = false;

/** Resolves once the worker answers; rejects if it fails to load or stays silent. */
function startWorker(make: () => Worker): Promise<Api> {
  return new Promise((resolve, reject) => {
    let w: Worker;
    try {
      w = make();
    } catch (e) {
      reject(e);
      return;
    }
    const fail = (why: unknown) => {
      w.terminate();
      reject(why instanceof Error ? why : new Error('The background reader could not start'));
    };
    const timer = setTimeout(() => fail(new Error('The background reader did not answer')), 6000);
    w.addEventListener('error', (e) => {
      clearTimeout(timer);
      fail(new Error(e.message || 'The background reader failed to load'));
    });
    const remote = Comlink.wrap<ImportApi>(w);
    remote.ping().then(() => {
      clearTimeout(timer);
      worker = w;
      resolve(remote as unknown as Api);
    }, (e) => {
      clearTimeout(timer);
      fail(e);
    });
  });
}

/**
 * The importer, started the best way this page allows:
 * 1. a background worker (normal case);
 * 2. on the page itself, for hosts that allow no workers (slower, but works everywhere).
 */
function getApi(): Promise<Api> {
  apiPromise ??= (async () => {
    if (noWorkers) return (await import('./importApi')).api as Api;
    try {
      // The worker's code ships inside the app and starts from a blob: URL, so it works
      // even where the page may not load separate script files.
      return await startWorker(() => new ImportWorker({ name: 'import' }));
    } catch {
      /* fall back to the page */
    }
    noWorkers = true;
    const { api } = await import('./importApi');
    return api as Api;
  })();
  return apiPromise;
}

export async function importExport(inputs: ImportInput[], onProgress: (p: ImportProgress) => void): Promise<Dataset> {
  const api = await getApi();
  return api.importFiles(inputs, worker ? Comlink.proxy(onProgress) : onProgress);
}

/** When the demo is loaded, its files are served from memory on the page instead. */
let demo: DemoSource | null = null;
export function setDemoSource(source: DemoSource | null) {
  shutdownImporter();
  demo = source;
}
const demoMedia = async (path: string): Promise<Blob | undefined> => {
  const m = demo?.media.get(path);
  if (!m || m === 'video') return undefined;
  return demoPicture(m.hue, m.seed);
};

export const readRawFile = async (path: string) => (demo ? demo.raw.get(path) : (await getApi()).getRawFile(path));
export const readMedia = async (path: string) => (demo ? demoMedia(path) : (await getApi()).getMedia(path));
export const readThumb = async (path: string, size?: number) => (demo ? demoMedia(path) : (await getApi()).getThumb(path, size));

/** Stop the importer, which frees all memory held for the raw view and media. */
export function shutdownImporter() {
  demo = null;
  if (worker) worker.terminate();
  else void apiPromise?.then((a) => a.reset()).catch(() => undefined);
  worker = null;
  apiPromise = null;
}

/**
 * Collect files from a drag-and-drop, including whole folders.
 * Folder contents keep their relative paths so the export's structure survives.
 */
export async function filesFromDrop(dt: DataTransfer): Promise<ImportInput[]> {
  const entries = [...dt.items]
    .filter((i) => i.kind === 'file')
    .map((i) => i.webkitGetAsEntry?.())
    .filter((e): e is FileSystemEntry => !!e);
  if (!entries.length) return [...dt.files].map((file) => ({ file }));

  const out: ImportInput[] = [];
  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      out.push({ file, path: prefix + entry.name });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      // readEntries returns results in batches; keep reading until it returns nothing.
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        if (!batch.length) break;
        for (const child of batch) await walk(child, `${prefix}${entry.name}/`);
      }
    }
  };
  for (const e of entries) await walk(e, '');
  return out;
}

/** Files from <input type="file">, with folder-relative paths when a folder was picked. */
export const filesFromInput = (list: FileList | null): ImportInput[] =>
  [...(list ?? [])].map((file) => ({ file, path: file.webkitRelativePath || undefined }));
