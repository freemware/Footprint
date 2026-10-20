import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const root=new URL('../',import.meta.url);
const content=fs.readFileSync(new URL('content.js',root),'utf8');
function page(html, onWait=()=>{}) {
  const w=new JSDOM(`<body>${html}</body>`,{url:'https://www.facebook.com/settings/',runScripts:'outside-only'}).window;
  let listener,waits=0;
  w.chrome={runtime:{onMessage:{addListener(fn){listener=fn}}}};
  w.setTimeout=fn=>{onWait(w,++waits);queueMicrotask(fn);return waits};
  w.eval(content);
  return {w, step:step=>new Promise(resolve=>listener({type:'fp:step',step},{},resolve))};
}
const row=(id,date='2021-08-23')=>`<div role="row"><input type="checkbox" aria-label="Select photo ${id}"><span>${date}</span><span>was tagged in a photo ${id}</span><a href="/photo.php?fbid=${id}">View</a><img src="https://scontent.fbcdn.net/${id}.jpg" width="120" alt="Tagged photo"></div>`;
test('collects post links and previews without the bulk selector',async()=>{
 const p=page(`<label><input type="checkbox" aria-label="All">All · Remove Tags</label>${row(1)}<p>No more activity</p>`);
 const result=await p.step({op:'collect'});
 assert.equal(result.ok,true); assert.equal(result.complete,true);
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].url,'https://www.facebook.com/photo.php?fbid=1');
 assert.equal(result.items[0].imageUrl,'https://scontent.fbcdn.net/1.jpg');
 p.w.close();
});
test('waits for delayed rows, retains virtualized rows, scrolls inner panels',async()=>{
 let panel;
 const p=page(`<main style="overflow-y:auto">${row(1)}</main>`,(w,n)=>{
  if(n===3) w.document.querySelector('main').innerHTML=row(2);
  if(n===5) w.document.querySelector('main').insertAdjacentHTML('beforeend','<p>No more activity</p>');
 });
 panel=p.w.document.querySelector('main');
 Object.defineProperties(panel,{scrollHeight:{value:2000},clientHeight:{value:500}});
 const result=await p.step({op:'collect'});
 assert.equal(result.complete,true);assert.equal(result.items.length,2); assert.equal(panel.scrollTop,2000);
 p.w.close();
});
test('paused loads and item limits are partial, not complete',async()=>{
 for(const step of [{op:'collect'},{op:'collect',limit:1}]) {
  const p=page(row(1));const result=await p.step(step);
  assert.equal(result.ok,true);assert.equal(result.complete,false);
  assert.equal(result.stopReason,step.limit?'item_limit':'loading_paused');p.w.close();
 }
});
test('post identity stays stable when surrounding rows disappear',async()=>{
 const p=page(row(1)+row(2));
 const before=await p.step({op:'collect',maxScrolls:0});
 p.w.document.querySelector('[role=row]').remove();
 const after=await p.step({op:'collect',maxScrolls:0});
 assert.equal(before.items[1].key,after.items[0].key);
 const missing=await p.step({op:'select',keys:[before.items[0].key]});
 assert.equal(missing.ok,false);p.w.close();
});
test('service worker preserves per-source results and never activates scan tabs',async()=>{
 let listener,state={},created=[];let seq=0;
 const api={runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onMessage:{addListener(fn){listener=fn}},onInstalled:{addListener(){}},onStartup:{addListener(){}}},alarms:{onAlarm:{addListener(){}},get:async()=>null,clear:async()=>true,create:async()=>{}},storage:{local:{get:async k=>({[k]:state[k]}),set:async v=>Object.assign(state,v)}},action:{setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}},tabs:{create:async opts=>{created.push(opts);return{id:1}},update:async()=>{},get:async()=>({status:'complete'}),remove:async()=>{},sendMessage:async(id,msg)=>msg.type==='fp:ping'?'pong':msg.type==='fp:step'?msg.step.op==='collect'?{ok:true,items:[{key:String(++seq),text:'Tagged photo'}],complete:false,stopReason:'loading_paused'}:{ok:true}:{signedOut:false,securityCheck:false}},scripting:{executeScript:async()=>{}}};
 const context=vm.createContext({chrome:api,Date,setTimeout:fn=>{queueMicrotask(fn);return 1},structuredClone,TextEncoder,TextDecoder,crypto:globalThis.crypto,console,atob});
 vm.runInContext(fs.readFileSync(new URL('background.js',root),'utf8'),context);
 async function find(source){
  const ack=await new Promise(resolve=>listener({type:'find',platform:'facebook',list:'tags',source},{id:'test',url:api.runtime.getURL('dashboard.html')},resolve));
  assert.equal(ack.ok,true);
  for(let i=0;i<500&&state.job?.status==='running';i++) await new Promise(resolve=>setImmediate(resolve));
  assert.equal(state.job.status,'done',state.job.message);
 }
 // Read supported source IDs from the shipped recipe rather than inventing routes.
 const recipe=vm.runInContext('FootprintFacebook.FACEBOOK',context);
 for(const source of recipe.tags.sources) await find(source.id);
 assert.equal(Object.keys(state.listResults).length,recipe.tags.sources.length);
 assert.ok(created.length);assert.ok(created.every(x=>x.active===false));
 state.job={kind:'scan',platform:'facebook'};
 assert.ok(Object.values(state.listResults).every(x=>x.items.length===1));
});
