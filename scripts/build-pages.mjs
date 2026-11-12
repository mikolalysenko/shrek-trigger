// Static site for GitHub Pages. index.html is the minimal player: the visitor
// chooses their own Chrono Trigger (USA) ROM and the release BPS is applied
// in their browser. dev.html is the developer workshop (debug tools), which
// builds the patch from source. No ROM is included.
//   node scripts/build-pages.mjs [--out=dist/pages] [--media=dir]
import {readFile,writeFile,mkdir,rm,cp,readdir} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const opt=n=>process.argv.find(a=>a.startsWith(`--${n}=`))?.slice(n.length+3);
const out=path.resolve(root,opt('out')??'dist/pages'),media=opt('media');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});

// Follow static and dynamic imports from both entry points.
const seen=new Set(),queue=['engine/player.js','engine/app.js','engine/globals.js'];
const importPattern=/\b(?:import|export)\b[^'"`;()]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s*['"]([^'"]+)['"]/g;
while(queue.length){
 const rel=queue.shift();if(seen.has(rel))continue;seen.add(rel);
 const source=await readFile(path.join(root,rel),'utf8');
 if(!/\.m?js$/.test(rel))continue;
 for(const m of source.matchAll(importPattern)){
  const spec=m[1]??m[2]??m[3];if(!spec.startsWith('.'))continue;
  queue.push(path.relative(root,path.resolve(path.dirname(path.join(root,rel)),spec)));
 }
}
// Fetched at run time by the workshop, plus the pages and styles.
for(const f of ['content/techs.json','content/event-layouts.json','content/hooks.json','index.html','dev.html','player.css','style.css'])seen.add(f);
for(const f of await readdir(path.join(root,'vendor/snes')))seen.add('vendor/snes/'+f);
for(const rel of seen){await mkdir(path.dirname(path.join(out,rel)),{recursive:true});await cp(path.join(root,rel),path.join(out,rel));}

// The player downloads the release patch under a fixed name.
const {version}=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
await cp(path.join(root,`dist/shrek-trigger-${version}.bps`),path.join(out,'shrek-trigger.bps'));
await writeFile(path.join(out,'.nojekyll'),'');
if(media)await cp(path.resolve(root,media),path.join(out,'media'),{recursive:true});
console.log(`Pages site: ${path.relative(root,out)} · ${seen.size+1} files`);
