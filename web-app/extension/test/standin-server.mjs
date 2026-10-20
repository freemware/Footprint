#!/usr/bin/env node
/**
 * Stand-in Facebook and Accounts Center pages for testing the extension end to end.
 * They follow the real pages' structure where it matters to Footprint (roles, labels, menus,
 * switches, dialogs, lists that load more on scroll, client-side navigation, a sign-in wall)
 * and keep their state on this server, so every change can be checked after a reload.
 * All data is invented.
 *
 *   node extension/test/standin-server.mjs   → http://localhost:4310/fb/… and /ac/…
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 4310);
const NAMES = ['Jordan Ellis', 'Priya Natarajan', 'Sam Okafor', 'Mei Lindqvist', 'Tomás Reyes', 'Ava Brennan'];

function freshState() {
  return {
    signedOut: false,
    checkpoint: false,
    settings: {
      future_posts: 'Public',
      lookup_phone: 'Everyone',
      lookup_email: 'Friends of friends',
      friends_list: 'Only me',
      friend_requests: 'Everyone',
      search_engines: true,
      tag_review: false,
      two_factor: false,
      login_alerts: false,
      off_meta_disconnected: false,
      ad_partners: true,
    },
    tagged: Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, kind: i % 2 ? 'photo' : 'post', text: `${NAMES[i]} tagged you in a ${i % 2 ? 'photo' : 'post'}.`, date: `March ${i + 2}, ${2015 + i}` })),
    posts: Array.from({ length: 24 }, (_, i) => ({ id: `p${i}`, text: `You shared a post: “Weekend notes #${24 - i}”`, date: `${['January', 'April', 'July', 'October'][i % 4]} ${(i % 27) + 1}, ${2025 - Math.floor(i / 2)}` })),
    trash: [],
  };
}
let S = freshState();

const page = (title, body, script = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>body{font:15px system-ui;margin:0;background:#f0f2f5;color:#1c1e21}.x9a{display:flex;gap:24px;padding:20px}.n1{width:260px;display:flex;flex-direction:column;gap:6px}
.n1 a,.n1 [role=link]{padding:8px;border-radius:6px;color:#1c1e21;text-decoration:none;cursor:pointer}.m2{flex:1;background:#fff;border-radius:8px;padding:16px;min-height:400px}
.r3{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #ddd}[role=button]{padding:6px 10px;background:#e4e6eb;border-radius:6px;cursor:pointer}
[role=menu],[role=dialog]{position:fixed;top:120px;left:40%;background:#fff;border:1px solid #ccc;padding:10px;box-shadow:0 4px 20px #0003}[role=menuitemradio]{padding:8px;cursor:pointer}
[role=listitem]{display:flex;gap:10px;padding:10px;border-bottom:1px solid #eee;min-height:60px}[role=checkbox]{width:18px;height:18px;border:2px solid #555;border-radius:4px;cursor:pointer}[role=checkbox][aria-checked=true]{background:#1877f2}
.bar{position:sticky;bottom:0;background:#fff;padding:10px;border-top:1px solid #ddd}</style></head><body>${body}
<script>
const api=(path,body)=>fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})}).then(r=>r.json());
const $=(s,r=document)=>r.querySelector(s);
function menu(anchor, options, onPick){document.querySelectorAll('[role=menu]').forEach(m=>m.remove());const m=document.createElement('div');m.setAttribute('role','menu');
 m.innerHTML=options.map(o=>'<div role="menuitemradio" tabindex="0" aria-checked="false"><span>'+o+'</span><span style="color:#65676b"> · '+o+' description</span></div>').join('');
 m.querySelectorAll('[role=menuitemradio]').forEach((el,i)=>el.addEventListener('click',()=>{m.remove();onPick(options[i]);}));document.body.append(m);}
function dialog(title, confirm, onYes){const d=document.createElement('div');d.setAttribute('role','dialog');d.setAttribute('aria-label',title);
 d.innerHTML='<h2>'+title+'</h2><div role="button" tabindex="0" class="c1">Cancel</div> <div role="button" tabindex="0" class="c2">'+confirm+'</div>';
 d.querySelector('.c1').onclick=()=>d.remove();d.querySelector('.c2').onclick=async()=>{d.remove();await onYes();};document.body.append(d);}
${script}
</script></body></html>`;

const LOGIN = page('Log in to Facebook', `<form style="padding:40px"><h1>facebook</h1><input name="email" placeholder="Email or phone number"><input type="password" name="pass" placeholder="Password"><button>Log in</button></form>`);
const CHECKPOINT = page('Security check', `<div style="padding:40px"><h1>You’re temporarily blocked</h1><p>It looks like you were misusing this feature by going too fast.</p></div>`);

function settingsPage() {
  const s = S.settings;
  return page(
    'Settings',
    `<div class="x9a"><div class="n1" role="navigation"><span>Audience and visibility</span>
     <a href="#" data-v="posts">Posts</a><a href="#" data-v="find">How people find and contact you</a><a href="#" data-v="tag">Profile and tagging</a></div>
     <div class="m2" id="main"><h1>Settings</h1><p>Choose a section.</p></div></div>`,
    `const S=${JSON.stringify(s)};
     const aud=(key,q,opts)=>'<div class="r3"><div><span>'+q+'</span></div><div role="button" tabindex="0" aria-haspopup="menu" data-k="'+key+'" data-o="'+opts.join('|')+'"><span>'+S[key]+'</span></div></div>';
     const sw=(key,q)=>'<div class="r3"><span>'+q+'</span><div role="switch" tabindex="0" aria-label="'+q.replace(/"/g,'&quot;')+'" aria-checked="'+S[key]+'" data-s="'+key+'" style="width:40px;height:22px;border-radius:11px;background:'+(S[key]?'#1877f2':'#ccc')+'"></div></div>';
     const views={posts:()=>'<h2>Posts</h2>'+aud('future_posts','Who can see your future posts?',['Public','Friends','Friends except...','Only me']),
       find:()=>'<h2>How people find and contact you</h2>'+aud('friend_requests','Who can send you friend requests?',['Everyone','Friends of friends'])+aud('friends_list','Who can see your friends list?',['Public','Friends','Only me'])
         +aud('lookup_email','Who can look you up using the email address you provided?',['Everyone','Friends of friends','Friends'])+aud('lookup_phone','Who can look you up using the phone number you provided?',['Everyone','Friends of friends','Friends','Only me'])
         +sw('search_engines','Do you want search engines outside of Facebook to link to your profile?'),
       tag:()=>'<h2>Profile and tagging</h2><h3>Reviewing</h3>'+sw('tag_review',"Review posts you're tagged in before the post appears on your profile?")};
     function show(v){$('#main').innerHTML=views[v]();
       document.querySelectorAll('[data-k]').forEach(b=>b.addEventListener('click',()=>menu(b,b.dataset.o.split('|'),async(o)=>{await api('/api/set',{key:b.dataset.k,value:o});S[b.dataset.k]=o;b.querySelector('span').textContent=o;})));
       document.querySelectorAll('[data-s]').forEach(b=>b.addEventListener('click',async()=>{const k=b.dataset.s;S[k]=!S[k];await api('/api/set',{key:k,value:S[k]});show(v);}));}
     document.querySelectorAll('[data-v]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();setTimeout(()=>show(a.dataset.v),300);}));`,
  );
}

function activityPage() {
  return page(
    'Activity log',
    `<div class="x9a"><div class="n1" role="navigation"><h2>Activity log</h2><a href="#" id="manage">Manage activity</a><a href="#" id="tagged">Activity you're tagged in</a><div id="sub"></div></div>
     <div class="m2" id="main"><p>Choose a category.</p></div></div>`,
    `let data=null,shown=10,mode=null;
     async function load(){data=await (await fetch('/api/state')).json();}
     function list(rows,button,title,confirm,endpoint){
       const groups={};rows.slice(0,shown).forEach(r=>{const y=r.date.split(', ')[1];(groups[y]=groups[y]||[]).push(r);});
       $('#main').innerHTML=Object.entries(groups).sort((a,b)=>b[0]-a[0]).map(([y,rs])=>'<h3>'+y+'</h3><div role="list">'+rs.map(r=>'<div role="listitem" data-id="'+r.id+'"><div role="checkbox" tabindex="0" aria-checked="false" aria-label="Select"></div><div><span>'+r.text+'</span><br><span style="color:#65676b">'+r.date+'</span></div></div>').join('')+'</div>').join('')
         +'<div class="bar"><div role="button" tabindex="0" id="act">'+button+'</div></div>';
       document.querySelectorAll('[role=checkbox]').forEach(c=>c.addEventListener('click',()=>c.setAttribute('aria-checked',c.getAttribute('aria-checked')==='true'?'false':'true')));
       $('#act').addEventListener('click',()=>{const ids=[...document.querySelectorAll('[role=listitem]')].filter(li=>li.querySelector('[aria-checked=true]')).map(li=>li.dataset.id);if(!ids.length)return;
         dialog(title,confirm,async()=>{await api(endpoint,{ids});await load();render();});});}
     function render(){if(mode==='posts')list(data.posts,'Trash','Move to trash?','Move to trash','/api/trash');
       else if(mode)list(data.tagged.filter(t=>mode==='tagged_photos'?t.kind==='photo':t.kind==='post'),'Remove tags','Remove tags?','Remove','/api/untag');}
     window.addEventListener('scroll',()=>{if(mode==='posts'&&shown<data.posts.length&&innerHeight+scrollY>=document.body.scrollHeight-50){shown+=10;setTimeout(render,400);}});
     $('#tagged').addEventListener('click',e=>{e.preventDefault();$('#sub').innerHTML='<a href="#" data-m="tagged_posts">Posts you\\'re tagged in</a><a href="#" data-m="tagged_photos">Photos and videos you\\'re tagged in</a>';
       document.querySelectorAll('[data-m]').forEach(a=>a.addEventListener('click',async e=>{e.preventDefault();mode=a.dataset.m;await load();render();}));});
     $('#manage').addEventListener('click',e=>{e.preventDefault();$('#sub').innerHTML='<div role="tab" tabindex="0" id="yp">Your posts</div>';$('#yp').addEventListener('click',async()=>{mode='posts';shown=10;await load();render();});});`,
  );
}

const nav = (title, links) => page(title, `<div class="x9a"><div class="m2"><h1>${title}</h1>${links.map(([t, href]) => `<p><a href="${href}">${t}</a></p>`).join('')}</div></div>`);

function route(path) {
  const s = S.settings;
  if (path === '/fb/settings' || path === '/fb/settings/') return settingsPage();
  if (path === '/fb/me/allactivity') return activityPage();
  if (path === '/fb/' || path === '/fb') return nav('Facebook', [['Settings', '/fb/settings']]);
  if (path === '/ac/password_and_security') return nav('Password and security', [['Change password', '#'], ['Two-factor authentication', '/ac/password_and_security/two_factor'], ['Login alerts', '/ac/password_and_security/login_alerts']]);
  if (path === '/ac/password_and_security/two_factor')
    return page('Two-factor authentication', `<div class="m2"><section><h1>Two-factor authentication</h1><div role="button" tabindex="0"><span>Robin Calder</span><br><span>Facebook</span> <span>${s.two_factor ? 'On' : 'Off'}</span></div></section></div>`);
  if (path === '/ac/password_and_security/login_alerts')
    return page('Login alerts', `<div class="m2"><h1>Login alerts</h1><p>Where you'll get alerts</p><div><label><input type="checkbox" id="ia" ${s.login_alerts ? 'checked' : ''}> In-app notifications</label></div><div><label><input type="checkbox" checked> Email</label></div></div>`, `$('#ia').addEventListener('change',e=>api('/api/set',{key:'login_alerts',value:e.target.checked}));`);
  if (path === '/ac/info_and_permissions') return nav('Your information and permissions', [['Access your information', '#'], ['Your activity off Meta technologies', '/ac/info_and_permissions/off_meta']]);
  if (path === '/ac/info_and_permissions/off_meta') return nav('Your activity off Meta technologies', [['Recent activity', '#'], ['Manage future activity', '/ac/info_and_permissions/off_meta/future']]);
  if (path === '/ac/info_and_permissions/off_meta/future')
    return page(
      'Manage future activity',
      `<div class="m2"><h1>Manage future activity</h1><div><label><input type="radio" name="f" ${s.off_meta_disconnected ? '' : 'checked'}> <span>Connect future activity</span></label></div>
       <div><label><input type="radio" name="f" id="dis" ${s.off_meta_disconnected ? 'checked' : ''}> <span>Disconnect future activity</span></label></div><div role="button" tabindex="0" id="cont">Continue</div></div>`,
      `$('#cont').addEventListener('click',()=>{if(!$('#dis').checked)return;dialog('Disconnect future activity?','Disconnect',()=>api('/api/set',{key:'off_meta_disconnected',value:true}));});`,
    );
  if (path === '/ac/ad_preferences') return nav('Ad preferences', [['Ad topics', '#'], ['Ad settings', '/ac/ad_preferences/settings']]);
  if (path === '/ac/ad_preferences/settings') return nav('Ad settings', [['Activity information from ad partners', '/ac/ad_preferences/partners']]);
  if (path === '/ac/ad_preferences/partners')
    return page(
      'Activity information from ad partners',
      `<div class="m2"><h1>Activity information from ad partners</h1><div role="button" tabindex="0" id="rev">Review setting</div><div id="panel"></div></div>`,
      `$('#rev').addEventListener('click',()=>{let on=${s.ad_partners};const draw=()=>{$('#panel').innerHTML='<div class="r3"><span>Make ads that are more personalised using activity information from partners</span><div role="switch" tabindex="0" aria-checked="'+on+'" id="sw" style="width:40px;height:22px;background:'+(on?'#1877f2':'#ccc')+'"></div></div>';
        $('#sw').addEventListener('click',async()=>{on=!on;await api('/api/set',{key:'ad_partners',value:on});draw();});};draw();});`,
    );
  return null;
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const json = (v) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(v));
  };
  if (req.method === 'POST') {
    let body = '';
    for await (const c of req) body += c;
    const b = body ? JSON.parse(body) : {};
    if (url.pathname === '/api/reset') S = freshState();
    else if (url.pathname === '/api/mode') Object.assign(S, b);
    else if (url.pathname === '/api/set') S.settings[b.key] = b.value;
    else if (url.pathname === '/api/untag') S.tagged = S.tagged.filter((t) => !b.ids.includes(t.id));
    else if (url.pathname === '/api/trash') {
      S.trash.push(...S.posts.filter((p) => b.ids.includes(p.id)));
      S.posts = S.posts.filter((p) => !b.ids.includes(p.id));
    }
    return json({ ok: true });
  }
  if (url.pathname === '/api/state') return json(S);
  const html = route(url.pathname.replace(/\/$/, '') || url.pathname) ?? route(url.pathname);
  if (!html) {
    res.writeHead(404);
    return res.end('not found');
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(S.signedOut ? LOGIN : S.checkpoint ? CHECKPOINT : html);
}).listen(PORT, () => console.log(`stand-in pages on http://localhost:${PORT}`));
