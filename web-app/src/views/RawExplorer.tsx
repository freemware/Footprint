import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileJson, FileImage, File as FileIcon, FolderTree, Search } from 'lucide-react';
import { Panel, PanelEmpty } from '../components/panel/Panel';
import { Body, Empty, PageHeader } from '../components/report/Report';
import { TABS, report } from '../i18n/report';
import { JsonTree } from '../components/raw/JsonTree';
import { t, fmt } from '../i18n/strings';
import { readMedia, readRawFile } from '../importer/client';
import type { ImportedFile } from '../model/types';
import { useDataStore } from '../store/dataStore';
import { useUiStore } from '../store/uiStore';

type Status = 'parsed' | 'generic' | 'unparsed' | 'error';
const statusOf = (f: ImportedFile): Status =>
  f.error ? 'error' : f.parser && f.parser !== 'generic' ? 'parsed' : f.parser === 'generic' && (f.events ?? 0) > 0 ? 'generic' : 'unparsed';
const STATUS_STYLE: Record<Status, string> = {
  parsed: 'border-accent/50 text-accent',
  generic: 'border-line-strong text-ink-2',
  unparsed: 'border-line text-ink-3',
  error: 'border-critical/60 text-critical',
};
const STATUS_LABEL: Record<Status, string> = {
  parsed: t.raw.parsed,
  generic: t.raw.generic,
  unparsed: t.raw.unparsed,
  error: t.raw.error,
};

interface Dir {
  name: string;
  path: string;
  dirs: Map<string, Dir>;
  files: ImportedFile[];
  count: number;
}

function buildTree(files: ImportedFile[]): Dir {
  const root: Dir = { name: '', path: '', dirs: new Map(), files: [], count: 0 };
  for (const f of files) {
    const parts = f.path.split('/');
    let d = root;
    d.count++;
    for (const p of parts.slice(0, -1)) {
      if (!d.dirs.has(p)) d.dirs.set(p, { name: p, path: d.path ? `${d.path}/${p}` : p, dirs: new Map(), files: [], count: 0 });
      d = d.dirs.get(p)!;
      d.count++;
    }
    d.files.push(f);
  }
  return root;
}

/** Every file in the export, with what the importer made of it, and its exact contents. */
export function RawExplorer() {
  const summary = useDataStore((s) => s.summary);
  const source = useDataStore((s) => s.source);
  const [query, setQuery] = useState('');
  const [showMedia, setShowMedia] = useState(false);
  const [selected, setSelected] = useState<ImportedFile | null>(null);
  const deepLink = useUiStore((s) => s.deepLink);
  const clearDeepLink = useUiStore((s) => s.clearDeepLink);

  // Opened from search: select that file and filter the tree to it.
  useEffect(() => {
    if (deepLink?.kind !== 'file' || !summary) return;
    const f = summary.files.find((x) => x.path === deepLink.path);
    if (f) {
      setSelected(f);
      setQuery(f.path.split('/').pop() ?? '');
    }
    clearDeepLink();
  }, [deepLink, summary, clearDeepLink]);

  const files = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (summary?.files ?? []).filter((f) => (showMedia || f.kind === 'json') && (!q || f.path.toLowerCase().includes(q)));
  }, [summary, query, showMedia]);
  const tree = useMemo(() => buildTree(files), [files]);

  if (source !== 'export' || !summary)
    return (
      <>
        <PageHeader tab="raw" icon={FolderTree} title={TABS.raw.title} lead={report.raw.lead} />
        <Body>
          <div className="card mb-14">
            <Empty icon={FolderTree} title={t.empty.noData} hint={t.raw.unavailable} />
          </div>
        </Body>
      </>
    );

  return (
    <>
      <PageHeader tab="raw" icon={FolderTree} title={TABS.raw.title} lead={report.raw.lead} />
      <Body>
    <div className="mb-14 grid h-[calc(100dvh-180px)] min-h-[520px] grid-cols-1 gap-4 md:grid-cols-[minmax(260px,360px)_1fr]">
      <Panel id="raw-files" title="Files" count={files.length} status="live" draggable={false} flush>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-line px-2 py-1.5">
            <Search className="size-3.5 text-ink-3" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.raw.search}
              aria-label={t.raw.search}
              className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-ink-3"
            />
            <label className="label flex shrink-0 items-center gap-1 text-ink-3">
              <input type="checkbox" checked={showMedia} onChange={(e) => setShowMedia(e.target.checked)} className="accent-[var(--accent)]" />
              {t.raw.showMedia}
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1" role="tree" aria-label={t.raw.title}>
            <DirNode dir={tree} depth={0} selected={selected?.path} onSelect={setSelected} open={Boolean(query)} />
          </div>
        </div>
      </Panel>
      {selected ? <FileView file={selected} key={selected.path} /> : (
        <Panel id="raw-file" title="No file selected" draggable={false}>
          <PanelEmpty title={t.raw.pick} />
        </Panel>
      )}
    </div>
      </Body>
    </>
  );
}

function DirNode({ dir, depth, selected, onSelect, open: forceOpen }: { dir: Dir; depth: number; selected?: string; onSelect: (f: ImportedFile) => void; open: boolean }) {
  const [open, setOpen] = useState(depth === 0);
  const isOpen = open || forceOpen;
  const dirs = [...dir.dirs.values()].sort((a, b) => a.name.localeCompare(b.name));
  const files = [...dir.files].sort((a, b) => a.path.localeCompare(b.path));
  const body = (
    <>
      {dirs.map((d) => (
        <DirNode key={d.path} dir={d} depth={depth + 1} selected={selected} onSelect={onSelect} open={forceOpen} />
      ))}
      {files.map((f) => {
        const st = statusOf(f);
        const Icon = f.kind === 'json' ? FileJson : f.kind === 'media' ? FileImage : FileIcon;
        return (
          <button
            key={f.path}
            type="button"
            role="treeitem"
            aria-selected={selected === f.path}
            onClick={() => onSelect(f)}
            className={[
              'flex w-full items-center gap-1.5 py-0.5 pr-2 text-left text-xs hover:bg-surface-2',
              selected === f.path ? 'bg-accent-dim/40 text-ink' : 'text-ink-2',
            ].join(' ')}
            style={{ paddingLeft: depth * 12 + 22 }}
          >
            <Icon className="size-3.5 shrink-0 text-ink-3" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{f.path.split('/').pop()}</span>
            {f.kind === 'json' && (
              <span className={`shrink-0 rounded-full border px-1.5 text-[11px] ${STATUS_STYLE[st]}`}>{STATUS_LABEL[st]}</span>
            )}
          </button>
        );
      })}
    </>
  );
  if (depth === 0) return body;
  return (
    <div role="treeitem" aria-expanded={isOpen}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 py-0.5 pr-2 text-left text-xs text-ink hover:bg-surface-2"
        style={{ paddingLeft: depth * 12 - 4 }}
      >
        <ChevronRight className={`size-3 shrink-0 text-ink-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{dir.name}</span>
        <span className="num shrink-0 text-[10px] text-ink-3">{dir.count}</span>
      </button>
      {isOpen && <div role="group">{body}</div>}
    </div>
  );
}

function FileView({ file }: { file: ImportedFile }) {
  const events = useDataStore((s) => s.events);
  const inspect = useUiStore((s) => s.inspect);
  const [json, setJson] = useState<unknown>(undefined);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const st = statusOf(file);
  const fileEvents = useMemo(() => events.filter((e) => e.sourceFile === file.path), [events, file.path]);

  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    setLoading(true);
    (async () => {
      if (file.kind === 'json') {
        const v = await readRawFile(file.path);
        if (alive) setJson(v);
      } else if (file.kind === 'media') {
        const blob = await readMedia(file.path);
        if (blob && alive) {
          url = URL.createObjectURL(blob);
          setMediaUrl(url);
        }
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.path, file.kind]);

  return (
    <Panel
      id="raw-file"
      title={file.path.split('/').pop() ?? file.path}
      status={st === 'error' ? 'alert' : st === 'parsed' ? 'live' : 'idle'}
      draggable={false}
      flush
      actions={
        fileEvents.length > 0 ? (
          <button
            type="button"
            onClick={() => inspect({ title: file.path.split('/').pop() ?? file.path, subtitle: file.path, events: [...fileEvents].reverse() })}
            className="label rounded border border-line px-1.5 py-0.5 text-ink-2 hover:border-accent hover:text-accent"
          >
            {t.raw.showEvents} ({fmt.number(fileEvents.length)})
          </button>
        ) : undefined
      }
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-3 py-1.5 text-[11px] text-ink-3">
          <span className="font-mono text-ink-2">{file.path}</span>
          <span className="num">{fmt.bytes(file.size)}</span>
          {file.kind === 'json' && <span className={`rounded-full border px-1.5 text-[11px] ${STATUS_STYLE[st]}`}>{STATUS_LABEL[st]}</span>}
          {file.records !== undefined && (
            <span className="num">
              {fmt.number(file.records)} {t.raw.records}
            </span>
          )}
          {file.events !== undefined && (
            <span className="num">
              {fmt.number(file.events)} {t.raw.events}
            </span>
          )}
          {file.error && <span className="text-critical">{file.error}</span>}
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {loading ? (
            <span className="label text-ink-3">{t.raw.loading}</span>
          ) : file.kind === 'media' && mediaUrl ? (
            /\.(mp4|mov|webm)$/i.test(file.path) ? (
              <video src={mediaUrl} controls className="max-h-full max-w-full rounded" />
            ) : (
              <img src={mediaUrl} alt={file.path} className="max-h-full max-w-full rounded object-contain" />
            )
          ) : json !== undefined ? (
            <JsonTree value={json} />
          ) : (
            <PanelEmpty title={t.raw.unparsed} />
          )}
        </div>
      </div>
    </Panel>
  );
}
