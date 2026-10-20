import {build} from 'esbuild';
import fs from 'node:fs';
const root='../footprint-source/footprint/';
await build({entryPoints:[root+'extension/src/platforms/facebook.ts'],bundle:true,format:'iife',globalName:'FootprintFacebook',outfile:'facebook-bundle.js',minify:true,target:'es2022'});
await build({entryPoints:[root+'extension/src/content.ts'],bundle:true,format:'iife',outfile:'../release/footprint-extension-0.3.0/content.js',minify:true,target:'es2022'});
for(const [entry,out] of [['engine/dom','dom'],['engine/runner','runner'],['platforms/facebook','facebook']]) await build({entryPoints:[root+'extension/src/'+entry+'.ts'],bundle:true,format:'esm',outfile:out+'.mjs',target:'es2022'});
const prefix=fs.readFileSync('facebook-bundle.js','utf8');
for(const file of ['background.js','assets/parts-DbcTRv_9.js']){
 let s=fs.readFileSync('../footprint-inspect/'+file,'utf8');
 const re=/\{id:`facebook`,name:`Facebook`,status:`available`[\s\S]*?\}\},(?=\w+=typeof __IG_ORIGIN__)/;
 if(!re.test(s)) throw Error('Cannot locate Facebook definition in '+file);
 s=s.replace(re,'FootprintFacebook.FACEBOOK,');
 if(file==='background.js') {
   const old='let{items:u}=await Ee(n,o.open,()=>!1),d=new Set(u.map(e=>e.key))';
   if(!s.includes(old)) throw Error('List verification guard target missing');
   s=s.replace(old,'let{items:u,out:verification}=await Ee(n,o.open,()=>!1);if(!verification.ok)throw Error(`Could not verify the refreshed list; no changes are confirmed`);let d=new Set(u.map(e=>e.key))');
 }

 fs.writeFileSync('../release/footprint-extension-0.3.0/'+file,prefix+'\n'+s);
}
