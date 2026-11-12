// Checks rewritten field dialogue against a baseline so a writing pass cannot
// break the cartridge: same strings, same control codes in the same order,
// untouched choice rows, rows and pages that fit the text window, glyphs the
// font has, and the game's current terms.
//
//   node scripts/check-dialogue-style.mjs --snapshot            write the baseline
//   node scripts/check-dialogue-style.mjs [file ...]            check (optionally only strings defined in those content files)
//   node scripts/check-dialogue-style.mjs --list file           print the file's effective strings with any Shrek reply
//
// The baseline is .local/dialogue-baseline.json (private, per checkout).
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {encode} from '../engine/text.js';
const args=process.argv.slice(2),flag=n=>args.includes(n),files=args.filter(a=>!a.startsWith('--'));
const BASELINE='.local/dialogue-baseline.json',ROW=34,ROWS=3;
const {dialogue}=await import('../content/dialogue.js'),{shrekReplies}=await import('../content/shrek-dialogue.js');
const {entries:options}=JSON.parse(await readFile('content/dialogue-options.json','utf8'));
if(flag('--snapshot')){await writeFile(BASELINE,JSON.stringify({dialogue,shrekReplies}));console.log('baseline written');process.exit(0);}
const base=JSON.parse(await readFile(BASELINE,'utf8'));
// Which strings does each requested content file define (and win, since later spreads override)?
let wanted=null;
if(files.length){
 wanted=new Set();
 for(const f of files){
  const m=await import(path.resolve(f)),tables=Object.values(m).filter(v=>v&&typeof v==='object');
  for(const t of tables)for(const[loc,lines]of Object.entries(t))if(lines&&typeof lines==='object')for(const[id,text]of Object.entries(lines))if(dialogue[loc]?.[id]===text||shrekReplies[loc]?.[id]===text)wanted.add(loc+':'+id);
 }
}
const tokens=t=>t.match(/\{[^}]+\}/g)??[];
const visible=t=>t.replace(/\{(shrek|fiona|donkey|pinocchio|puss|mongo|farquaad|pc1|pc2|pc3|dragon)\}/g,'XXXXX').replace(/\{item\}/g,'XXXXXXXXXX').replace(/\{value[^}]*\}/g,'000');
const pages=t=>visible(t).split(/\{[^}]+\}/).filter(p=>p.trim());
const stale=[[/\d ?G\b|\bgold pieces?\b/, 'money is onions ("200 onions"), never G or gold'],[/granny/i,'Granny is gone; Shrek lives alone'],
 [/\b(Tonic|Mid Tonic|Full Tonic|Ether|Elixir|Shelter|Revive|Power Tab|Magic Tab|Speed Tab)\b/,'Chrono Trigger item name'],
 [/\b(Sweet Onion|Blooming Onion|Onion Broth|Onion Soup|Rich Onion Soup|Golden Onion|Onion Stock|Onion Feast|Pickled Onion|Onion Juice|Onion Picnic|Mystery Onion|Onion Platter|OnionBroth|SweetOnion|BloomOnion)\b/,'old healing item name (see docs/writing-guide.md)'],
 [/\b(Crono|Marle|Lucca|Robo|Frog|Ayla|Magus|Lavos|Zeal|Guardia|Epoch|Spekkio|Gaspar)\b/,'Chrono Trigger name'],[/\b(Lightning|Shadow) (magic|element)|\bLightning 2\b/,'elements are Air and Dirt']];
const problems=[];let changed=0,checked=0;
const report=(k,msg)=>problems.push(k+' '+msg);
function checkText(k,now,was,{reply=false}={}){
 checked++;if(now!==was)changed++;
 try{encode(now.replace(/\{[^}]+\}/g,''));}catch(e){report(k,e.message);}
 if(reply){
  if(!now.startsWith('SHREK: '))report(k,'reply must start with "SHREK: "');
  if(now.includes('{'))report(k,'replies take no control codes');
  if(now.split('\n').length>3)report(k,'reply has more than 3 rows');
 }else if(tokens(now).join('')!==tokens(was).join(''))report(k,`control codes changed: ${tokens(was).join('')} -> ${tokens(now).join('')}`);
 const wasPages=pages(was),maxWas=Math.max(0,...wasPages.flatMap(p=>p.split('\n').map(r=>r.length))),rowsWas=Math.max(0,...wasPages.map(p=>p.split('\n').length));
 for(const p of pages(now)){
  const rows=p.split('\n');
  if(rows.length>Math.max(ROWS,rowsWas))report(k,`a page has ${rows.length} rows (limit ${Math.max(ROWS,rowsWas)})`);
  for(const r of rows)if(r.length>Math.max(ROW,maxWas)&&now!==was)report(k,`row is ${r.length} characters (limit ${Math.max(ROW,maxWas)}): ${r}`);
 }
 if(now!==was)for(const[re,why]of stale)if(re.test(now.replace(/\{[^}]+\}/g,'')))report(k,why+': '+JSON.stringify(now.match(re)?.[0]));
 if(!reply){const a=was.match(/^[A-Z][A-Z0-9' .?-]*: /)?.[0],z=now.match(/^[A-Z][A-Z0-9' .?-]*: /)?.[0];if(a&&a!==z&&!flag('--allow-speakers'))report(k,`speaker label changed: ${a.trim()} -> ${z?.trim()??'none'}`);}
}
for(const[loc,lines]of Object.entries(base.dialogue))for(const[id,was]of Object.entries(lines)){
 const k=loc+':'+id;if(wanted&&!wanted.has(k))continue;
 const now=dialogue[loc]?.[id];if(now===undefined){report(k,'string was removed');continue;}
 checkText(k,now,was);
}
for(const[loc,lines]of Object.entries(dialogue))for(const id of Object.keys(lines))if(base.dialogue[loc]?.[id]===undefined)report(loc+':'+id,'string was added');
for(const e of options){
 const k=e.location+':'+e.id;if(wanted&&!wanted.has(k))continue;
 const text=dialogue[e.location]?.[e.id];if(!text)continue;
 const rows=text.replace('{null}','').split(/\{(?:page|full|page3)\}/).at(-1).split('\n');
 if(JSON.stringify(rows.slice(e.first,e.last+1).map(r=>r.trim()))!==JSON.stringify(e.options))report(k,`choice rows must stay exactly ${JSON.stringify(e.options)} on rows ${e.first}-${e.last} of the last page`);
}
for(const[loc,lines]of Object.entries(base.shrekReplies))for(const[id,was]of Object.entries(lines)){
 const k='reply '+loc+':'+id;if(wanted&&!wanted.has(loc+':'+id))continue;
 const now=shrekReplies[loc]?.[id];if(now===undefined){report(k,'reply was removed');continue;}
 checkText(k,now,was,{reply:true});
 for(const r of now.split('\n'))if(r.length>36)report(k,'reply row is wider than 36');
}
for(const[loc,lines]of Object.entries(shrekReplies))for(const id of Object.keys(lines))if(base.shrekReplies[loc]?.[id]===undefined)report('reply '+loc+':'+id,'reply was added');
if(flag('--list')){
 for(const k of [...(wanted??[])].sort((a,z)=>a.split(':')[0]-z.split(':')[0]||a.split(':')[1]-z.split(':')[1])){const[loc,id]=k.split(':');if(dialogue[loc]?.[id]===undefined)continue;console.log(k+'\t'+JSON.stringify(dialogue[loc][id])+(shrekReplies[loc]?.[id]?'\n\t  then '+JSON.stringify(shrekReplies[loc][id]):''));}
 process.exit(0);
}
console.log(`${checked} strings checked, ${changed} changed from the baseline, ${problems.length} problems`);
for(const p of problems.slice(0,200))console.log('  '+p);
if(problems.length>200)console.log(`  ... and ${problems.length-200} more`);
process.exitCode=problems.length?1:0;
