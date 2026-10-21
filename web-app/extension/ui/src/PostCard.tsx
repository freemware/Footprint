import { useState } from 'react';
import { ExternalLink, ImageOff, Check, Maximize2 } from 'lucide-react';
import { Dialog, Button } from './parts';
import { postUrl, mediaUrl } from '../../src/engine/media';
import type { ListItem } from '../../src/shared/types';

/** A readable local snapshot. The original stays on Facebook; no embedded scripts or trackers. */
export function PostCard({item, selected, kept, onSelect, onKeep}: {item:ListItem; selected:boolean; kept:boolean; onSelect:()=>void; onKeep:()=>void}) {
  const [broken,setBroken] = useState(false);
  const [expanded,setExpanded] = useState(false);
  const image = mediaUrl(item.thumbnail);
  const url = postUrl(item.url);
  const content = <>
    {image && !broken ? <img src={image} alt="Preview of the tagged post" loading="lazy" referrerPolicy="no-referrer" onError={()=>setBroken(true)} className="h-full w-full object-contain"/> : <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-ink-3"><ImageOff className="size-7"/><span className="text-[13px]">{broken?'Preview expired':'No image provided'}</span></div>}
  </>;
  return <article className={`post-card overflow-hidden rounded-2xl border bg-surface transition ${selected?'border-accent ring-2 ring-accent/20':'border-line'}`}>
    <div className="relative h-52 bg-surface-2">
      <button type="button" onClick={()=>setExpanded(true)} aria-label={`Expand post: ${item.text}`} className="h-full w-full">{content}</button>
      <label className="absolute left-3 top-3 flex cursor-pointer items-center gap-2 rounded-lg bg-surface px-2.5 py-2 shadow-sm"><input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${item.text}`} className="size-4 accent-[var(--accent)]"/><span className="text-[12px] font-semibold">Select</span></label>
      <button type="button" onClick={()=>setExpanded(true)} aria-label="Expand post preview" className="absolute bottom-3 right-3 rounded-lg bg-surface p-2 text-ink"><Maximize2 className="size-4"/></button>
    </div>
    <div className="space-y-3 p-4">
      <p className="text-[12px] font-medium text-ink-3">{item.date || 'Date not provided'}{item.author?` · ${item.author}`:''}</p>
      <p className="line-clamp-3 text-[14px] font-medium leading-relaxed text-ink">{item.postText || item.text}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">View original <ExternalLink className="size-3.5"/></a> : <span className="text-[12px] text-ink-3">Facebook did not expose a post link</span>}
        <button type="button" onClick={onKeep} aria-pressed={kept} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium text-[var(--plan)] hover:bg-surface-2"><Check className="size-3.5"/>{kept?'Keeping':'Keep'}</button>
      </div>
    </div>
    {expanded && <Dialog title="Tagged post" onClose={()=>setExpanded(false)} actions={<Button variant="ghost" onClick={()=>setExpanded(false)}>Close</Button>}>
      <div className="h-72 overflow-hidden rounded-xl bg-surface-2">{content}</div>
      <p className="whitespace-pre-wrap text-ink">{item.postText || item.text}</p>
      <p className="text-[12px] text-ink-3">This is a saved preview. Open the original for current comments, audience, and video playback.</p>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent">Open original post</a>}
    </Dialog>}
  </article>;
}
