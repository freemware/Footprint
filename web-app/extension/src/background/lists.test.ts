import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(()=>({data:{} as Record<string,unknown>,writes:[] as unknown[]}));
const worker = vi.hoisted(()=>({id:7,run:vi.fn(),close:vi.fn(),url:vi.fn(),goto:vi.fn(),step:vi.fn()}));
const tabs = vi.hoisted(()=>({open:vi.fn(),resume:vi.fn()}));
vi.mock('./browserTab',()=>({BrowserTab:tabs}));
vi.mock('./store',()=>({
 get:async(k:string)=>state.data[k] ?? {},
 set:async(k:string,v:unknown)=>{state.data[k]=structuredClone(v);state.writes.push({key:k,value:structuredClone(v)});},
 addHistory:vi.fn(),latestReport:vi.fn(),saveReport:vi.fn(),
}));
import { findList, loadPreviews } from './jobs';
import { FACEBOOK } from '../platforms/facebook';
const source=FACEBOOK.tags!.sources[0]!.id;
const key=`facebook:tags:${source}`;
const row={key:'post-1',text:'Tagged photo',url:'https://www.facebook.com/person/posts/123'};
const result=(complete=false)=>({ok:true,results:[{ok:true,items:[row],complete}]});

beforeEach(()=>{
 state.data={listResults:{}};state.writes=[];vi.clearAllMocks();
 tabs.open.mockResolvedValue(worker);tabs.resume.mockResolvedValue(worker);
 worker.url.mockResolvedValue('https://www.facebook.com/me/allactivity');
 worker.run.mockImplementation(async(steps)=>steps[0]?.op==='goto'?{ok:true,results:[]} : result());
});
describe('durable tagged list jobs',()=>{
 it('saves partial discoveries each chunk, then continues the existing tab without reopening the list',async()=>{
   await findList('facebook','tags',source);
   expect(state.writes.filter((x:any)=>x.key==='listResults').length).toBeGreaterThan(1);
   expect((state.data.listResults as any)[key]).toMatchObject({items:[row],complete:false,workerTabId:7});
   expect(worker.close).not.toHaveBeenCalled();
   worker.run.mockClear();worker.run.mockResolvedValue(result(true));
   await findList('facebook','tags',source,true);
   expect(tabs.resume).toHaveBeenCalledWith(7,'https://www.facebook.com/me/allactivity');
   expect(worker.run.mock.calls[0]![0][0].op).toBe('collect');
   expect((state.data.listResults as any)[key]).toMatchObject({complete:true,items:[row]});
   expect(worker.close).toHaveBeenCalledOnce();
 });
 it('scans and deduplicates both tagged sources before reporting their combined end',async()=>{
   worker.run.mockImplementation(async(steps)=>steps[0]?.op==='goto'?{ok:true,results:[]}:result(true));
   await findList('facebook','tags','all');
   expect(tabs.open).toHaveBeenCalledTimes(FACEBOOK.tags!.sources.length);
   expect((state.data.listResults as any)['facebook:tags:all']).toMatchObject({items:[row],complete:true});
 });
 it('does not discard saved results when Facebook cannot be opened',async()=>{
   const cached={items:[row],complete:false,at:1};state.data.listResults={[key]:cached};
   worker.run.mockResolvedValue({ok:false,reason:'signed_out',results:[]});
   await expect(findList('facebook','tags',source)).rejects.toThrow('Sign in');
   expect((state.data.listResults as any)[key]).toEqual(cached);
 });
 it('persists actual post previews, and does not request untrusted URLs',async()=>{
   state.data.listResults={[key]:{items:[row,{key:'bad',text:'Bad URL',url:'https://evil.com/'}],at:1,complete:false}};
   worker.url.mockResolvedValue(row.url);worker.step.mockResolvedValue({ok:true,preview:{postText:'Actual caption',previewChecked:true}});
   await loadPreviews('facebook','tags',source);
   expect(worker.goto).toHaveBeenCalledExactlyOnceWith(row.url);
   expect((state.data.listResults as any)[key].items[0].postText).toBe('Actual caption');
 });
});
