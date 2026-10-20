import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as dom from './dom.mjs';
import {runStep} from './runner.mjs';
import {FACEBOOK} from './facebook.mjs';
let passed=0;
const test=async(name,fn)=>{await fn();console.log('PASS '+name);passed++};
const page=html=>new JSDOM('<body>'+html+'</body>',{url:'https://www.facebook.com/settings/?tab=posts'}).window.document;
const check=id=>FACEBOOK.checks.find(c=>c.id===id);
for(const [id,label,value] of [
 ['future_posts','Who can see your future posts and reels? Friends','friends'],
 ['lookup_phone','People with your phone number No one','only_me'],
 ['lookup_email','People with your email address Possible connections','public'],
 ['friends_list','Who can see your friends list? Only me','only_me'],
 ['friend_requests','Who can send you friend requests? Friends of friends','friends_of_friends']
]) await test(id+' combined question/value reads correctly',()=>{
 const doc=page(`<div role="button" aria-label="${label}"><span>${label}</span></div>`);
 assert.equal(dom.readSetting(doc,check(id).read.question,'audience')?.value,value);
 assert.equal(dom.settingControl(doc,check(id).read.question)?.getAttribute('role'),'button');
});
await test('described Friends option excludes Friends of friends and custom lists',()=>{
 const doc=page(`<div role="dialog"><h2>Who can see your future posts and reels?</h2><div role="radio" aria-label="Friends of friends Your friends of friends" aria-checked="false"></div><div role="radio" aria-label="Friends Your Facebook friends" aria-checked="true"></div><div role="radio" aria-label="Friends except Bob" aria-checked="false"></div><button>Save</button></div>`);
 assert.equal(dom.nameOf(dom.findOption(doc,'^friends$')),'Friends Your Facebook friends');
 assert.equal(dom.readSetting(doc,'who can see your future posts','audience')?.value,'friends');
});
await test('described friend-request and No one options match exactly',()=>{
 const doc=page(`<div role="radio" aria-label="Friends of friends Your friends of friends"></div><div role="radio" aria-label="No one Your profile won't be suggested to people based on your phone number"></div>`);
 assert.ok(dom.findOption(doc,'^friends of friends$'));assert.ok(dom.findOption(doc,'^no one$'));
});
for(const [id,label,target] of [['search_engines','Do you want search engines outside of Facebook to link to your profile?',false],['tag_review',"Review posts you're tagged in before the post appears on your profile?",true]]){
 await test(id+' switch changes once and repeated request is idempotent',async()=>{
  const doc=page(`<div role="switch" aria-label="${label}" aria-checked="${!target}"><span>${label}</span></div>`);
  const sw=doc.querySelector('[role=switch]');let clicks=0;sw.addEventListener('click',()=>{clicks++;sw.setAttribute('aria-checked',String(sw.getAttribute('aria-checked')!=='true'))});
  const step=check(id).fix.steps[0];assert.equal((await runStep(doc,step,{settle:0})).ok,true);assert.equal(dom.readSetting(doc,check(id).read.question,'onoff').value,target);
  assert.equal((await runStep(doc,step,{settle:0})).ok,true);assert.equal(clicks,1);
 });
}
await test('activity allow radio reads independently from deny radio',async()=>{
 const doc=page(`<h2>Activity from other businesses</h2><div><div role="radio" aria-label="Allow us to use this activity to show you content that's more relevant" aria-checked="false"></div><div role="radio" aria-label="Don't allow us to use this activity to show you relevant content Your current experience" aria-checked="true"></div></div><button disabled>Confirm</button>`);
 assert.equal(dom.readSetting(doc,check('other_businesses').read.question,'onoff')?.value,false);
 assert.ok(dom.findOption(doc,check('other_businesses').fix.steps[0].option));
});
await test('security section headings do not stop normal scans',()=>{
 assert.equal(dom.looksLikeSecurityCheck(page('<h2>Security checks</h2><button>Security Checkup</button>')),false);
 assert.equal(dom.looksLikeSecurityCheck(page('<h2>Confirm it\'s you</h2>')),true);
});
await test('device restriction returns restricted, never Off or success',async()=>{
 const doc=page(`<h2>You can't make this change at the moment</h2><p>device you don't usually use</p>`);
 assert.deepEqual(await runStep(doc,{op:'read',question:'Two-factor authentication',vocab:'onoff'},{timeout:1}),{ok:false,reason:'restricted'});
});
await test('missing login alerts remains unreadable and has no automatic fix',async()=>{
 assert.equal(check('login_alerts').fix,undefined);
 assert.equal((await runStep(page('<h1>Password and security</h1>'),{op:'read',...check('login_alerts').read},{timeout:1})).ok,false);
});
await test('two-factor chooses Facebook and tracking is deduplicated',()=>{
 assert.equal(check('two_factor').open.length,3);assert.equal(FACEBOOK.checks.filter(x=>x.id==='ad_partners').length,0);
 const doc=page('<button aria-label="Profile picture, Seth Freeman Seth Freeman Facebook"></button><button aria-label="Profile picture, Seth Freeman Seth Freeman Instagram"></button>');
 assert.equal(dom.find(doc,check('two_factor').open[2].loc)?.getAttribute('aria-label'),'Profile picture, Seth Freeman Seth Freeman Facebook');
});
await test('activity routes require outer category and correct destinations',()=>{
 assert.equal(FACEBOOK.tags.sources[0].open[1].optional,undefined);
 assert.ok(FACEBOOK.tags.sources[0].open[1].loc.name[0].includes('Your Facebook activity'));
 assert.ok(FACEBOOK.tags.sources[0].open[3].loc.name[0].includes('and comments'));
 assert.ok(FACEBOOK.posts.sources[0].open[3].loc.name[0].includes('photos and videos'));
});
console.log(`${passed} tests passed`);
await test('captured live contact DOM: read and target all five controls',async()=>{
 const {readFileSync}=await import('node:fs');const doc=page(readFileSync('live-contact.html','utf8'));
 for(const [id,value] of [['friend_requests','friends_of_friends'],['friends_list','only_me'],['lookup_phone','only_me'],['lookup_email','only_me'],['search_engines',false]]){
  const c=check(id);assert.equal(dom.readSetting(doc,c.read.question,c.read.vocab)?.value,value,id);assert.ok(dom.settingControl(doc,c.read.question),id+' target');
 }
});
await test('native labelled radios use separated label and description text',()=>{
 const doc=page(`<div role="dialog"><h2>Who can see your future posts and reels?</h2><label><div><span>Public</span></div><div><span>Anyone on or off Facebook</span></div><input type="radio" aria-checked="false"></label><label><div><span>Friends</span></div><div><span>Your Facebook friends</span></div><input type="radio" checked aria-checked="true"></label></div>`);
 assert.equal(dom.nameOf(dom.findOption(doc,'^friends$')),'Friends Your Facebook friends');
 assert.equal(dom.readSetting(doc,'who can see your future posts','audience').value,'friends');
});
await test('ambiguous Facebook account selection fails closed',()=>{
 const loc=check('two_factor').open[2].loc;
 assert.equal(dom.find(page('<button>A Facebook</button><button>B Facebook</button>'),loc),null);
});
await test('unreadable lists and missing selected rows cannot count as successes',async()=>{
 assert.deepEqual(await runStep(page('<h1>Activity log</h1>'),{op:'collect'},{timeout:1}),{ok:false,reason:'unreadable'});
 assert.equal((await runStep(page('<h1>Activity log</h1>'),{op:'select',keys:['missing']},{settle:0})).ok,false);
});
console.log(`FINAL: ${passed} tests passed`);
