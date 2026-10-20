import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
const dir='../release/footprint-extension-0.3.0/';let state={},listener,pageListener,doc,clock=Date.now();const RealDate=Date;
class FastDate extends RealDate {static now(){return clock+=300}}
const later=fn=>{queueMicrotask(fn);return 1};
const content=fs.readFileSync(dir+'content.js','utf8');
const settings=fs.readFileSync('live-contact.html','utf8');
function render(html,url='https://www.facebook.com/settings/'){
 const w=new JSDOM('<body>'+html+'</body>',{url,runScripts:'outside-only'}).window;
 w.Date=FastDate;w.setTimeout=later;w.chrome={runtime:{onMessage:{addListener(fn){pageListener=fn}}}};w.eval(content);doc=w.document;
 for(const el of doc.querySelectorAll('[data-go]'))el.addEventListener('click',()=>render(el.dataset.go==='factor'?'<button>Profile picture, Test Facebook</button>':activity,url));
 const fb=Array.from(doc.querySelectorAll('button')).find(e=>e.textContent.endsWith('Test Facebook'));if(fb)fb.addEventListener('click',()=>render("<h2>You can't make this change at the moment</h2><p>device you don't usually use</p>",url));
}
const activity=`<h2>Activity from other businesses</h2><label><span>Allow us to use this activity to show you content that's more relevant</span><input type="radio" aria-checked="false"></label><label><span>Don't allow us to use this activity to show you relevant content</span><input type="radio" aria-checked="true" checked></label><button disabled>Confirm</button>`;
function route(url){
 if(url.includes('password_and_security'))render('<h2>Security checks</h2><button data-go="factor">Two-factor authentication</button><button>Security Checkup</button>',url);
 else if(url.includes('info_and_permissions'))render('<button data-go="activity">Activity from other businesses</button>',url);
 else if(url.includes('tab=posts'))render('<div role="button"><span>Who can see your future posts and reels?</span><span>Friends</span></div>',url);
 else if(url.includes('profile_and_tagging'))render(`<div role="switch" aria-checked="true"><span>Review posts you're tagged in before the post appears on your profile?</span></div>`,url);
 else render(settings,url);
}
const api={runtime:{id:'test-extension',getURL:p=>'chrome-extension://test-extension/'+p,onMessage:{addListener(fn){listener=fn}},onInstalled:{addListener(){}},onStartup:{addListener(){}}},alarms:{onAlarm:{addListener(){}},get:async()=>null,clear:async()=>true,create:async()=>{}},storage:{local:{get:async k=>({[k]:state[k]}),set:async o=>Object.assign(state,o)}},action:{setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}},tabs:{create:async()=>({id:1}),update:async(id,{url})=>route(url),get:async()=>({id:1,status:'complete'}),remove:async()=>{},sendMessage:async(id,msg)=>new Promise(resolve=>pageListener(msg,{},resolve))},scripting:{executeScript:async()=>{}}};
const ctx=vm.createContext({chrome:api,Date:FastDate,setTimeout:later,structuredClone,TextEncoder,TextDecoder,crypto:globalThis.crypto,console,atob});vm.runInContext(fs.readFileSync(dir+'background.js','utf8'),ctx);
const ack=await new Promise(resolve=>listener({type:'scan',platform:'facebook'},{id:api.runtime.id,url:api.runtime.getURL('dashboard.html')},resolve));assert.equal(ack.ok,true);
for(let i=0;i<20000&&state.job?.status!=='done'&&state.job?.status!=='failed';i++)await new Promise(resolve=>setImmediate(resolve));
assert.equal(state.job.status,'done');const report=state.reports.facebook[0];assert.equal(report.results.length,10);
const by=id=>report.results.find(x=>x.checkId===id);assert.equal(by('two_factor').problem,'restricted');assert.equal(by('login_alerts').status,'unknown');
for(const id of ['future_posts','lookup_phone','lookup_email','friends_list','search_engines','friend_requests','tag_review','other_businesses'])assert.equal(by(id)?.status,'ok',id);
console.log('PASS packaged service worker + packaged content script: complete scan, restricted MFA and absent alerts remain unknown');
