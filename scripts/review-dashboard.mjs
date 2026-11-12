// Builds a static review page for a playtest build: technique clips with
// sound (scripts/record-tech.mjs), screenshots, today's changelog and the
// open questions. Private review material; the output directory is not part
// of the repository.
//   node scripts/review-dashboard.mjs --out=<dir> [--clips=.local/qa/tech-clips] [--notes=notes.json]
import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {techHelp} from '../content/tech-help.js';
const args=process.argv.slice(2),opt=(n,d)=>args.find(a=>a.startsWith('--'+n+'='))?.slice(n.length+3)??d;
const out=path.resolve(opt('out','.local/review-dashboard')),clips=opt('clips','.local/qa/tech-clips'),notes=JSON.parse(await readFile(opt('notes','.local/review-notes.json'),'utf8'));
const techs=JSON.parse(await readFile('content/techs.json','utf8')),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const commit=execFileSync('git',['rev-parse','--short','HEAD']).toString().trim(),subject=execFileSync('git',['log','-1','--format=%s']).toString().trim();
await mkdir(out+'/clips',{recursive:true});await mkdir(out+'/img',{recursive:true});
const have=new Set();for(const f of await readdir(clips).catch(()=>[]))if(f.endsWith('.mp4')){await copyFile(path.join(clips,f),out+'/clips/'+f);have.add(+f.slice(5,8));}
const images=[];for(const[file,caption]of notes.images){const name=path.basename(file);try{await copyFile(file,out+'/img/'+name);images.push([name,caption]);}catch{}}
const md=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/`(.+?)`/g,'<code>$1</code>');
const changelog=(await readFile('CHANGELOG.md','utf8')).split('\n## ').slice(1).filter(s=>s.includes(notes.changelogDate)).map(s=>{
 const[title,...body]=s.split('\n');let html='',list=false;
 for(const line of body){if(line.startsWith('- ')){if(!list){html+='<ul>';list=true;}html+='<li>'+md(line.slice(2))+'</li>';}else{if(list){html+='</ul>';list=false;}if(line.trim()&&!line.startsWith('#'))html+='<p>'+md(line)+'</p>';}}
 if(list)html+='</ul>';return`<details><summary>${esc(title)}</summary>${html}</details>`;}).join('');
const owners=['Shrek','Fiona','Donkey','Pinocchio','Puss','Mongo','Farquaad'],fresh=new Set(notes.newTechs);
const card=t=>`<figure class="${fresh.has(t.id)?'new':''}">${have.has(t.id)?`<video controls preload="none" playsinline poster="" src="clips/tech-${String(t.id).padStart(3,'0')}.mp4"></video>`:'<div class="missing">no clip</div>'}<figcaption><b>${esc(t.name)}</b>${fresh.has(t.id)?' <i>changed</i>':''}<br><small>${esc(techHelp[t.id]??'')}</small><br><span>${esc(t.concept.split('. ')[0])}.</span></figcaption></figure>`;
const group=(title,list)=>list.length?`<h3>${esc(title)}</h3><div class="grid">${list.map(card).join('')}</div>`:'';
const singles=owners.map((o,i)=>group(o,techs.filter(t=>t.id>i*8&&t.id<=i*8+8))).join('');
const combos=group('Double techniques',techs.filter(t=>t.id>56&&t.id<=101))+group('Triple techniques',techs.filter(t=>t.id>101));
const list=a=>'<ul>'+a.map(x=>'<li>'+md(x)+'</li>').join('')+'</ul>';
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shrek Trigger review</title>
<style>*{box-sizing:border-box}body{margin:0;padding:16px;background:#141d18;color:#e9efdd;font:15px/1.45 system-ui,sans-serif;max-width:1200px;margin:auto}h1{font-size:24px;margin:.2em 0}h2{margin-top:1.6em;border-bottom:1px solid #3c5340;padding-bottom:.2em;color:#b9e36b}h3{color:#dfe9c6;margin:1.2em 0 .4em}
a{color:#b9e36b}code{background:#22302a;padding:0 .3em;border-radius:3px}small{color:#b8c7a8}.meta{color:#9fb190}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}figure{margin:0;background:#1c2822;border:1px solid #2c3d33;border-radius:8px;overflow:hidden}figure.new{border-color:#b9e36b}
video,figure img{width:100%;display:block;image-rendering:pixelated;background:#000;aspect-ratio:8/7}figcaption{padding:8px 10px;font-size:13px}figcaption i{color:#141d18;background:#b9e36b;font-style:normal;font-size:11px;padding:0 5px;border-radius:8px}figcaption span{color:#c9d5ba}
.missing{aspect-ratio:8/7;display:grid;place-items:center;color:#667}.shots img{width:100%;height:auto;aspect-ratio:auto;image-rendering:pixelated;border-radius:6px;border:1px solid #2c3d33}.shots p{margin:.3em 0 1.2em;color:#c9d5ba}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #2c3d33;padding:6px 8px;text-align:left;vertical-align:top}th{color:#b9e36b}details{background:#1c2822;border:1px solid #2c3d33;border-radius:8px;margin:8px 0;padding:8px 12px}summary{cursor:pointer;font-weight:600}
nav a{margin-right:14px}blockquote{margin:.4em 0;padding:.3em .9em;border-left:3px solid #b9e36b;background:#1c2822}</style>
<h1>Shrek Trigger review</h1><p class="meta">Build <code>${commit}</code> · ${esc(subject)} · page generated ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC</p>
<nav><a href="#watch">Watch and listen</a><a href="#house">Donkey's house</a><a href="#text">Text</a><a href="#status">Status</a><a href="#you">Needs you</a></nav>
<p>${md(notes.intro)}</p>
<h2 id="watch">Watch and listen</h2><p>${md(notes.watch)}</p>${singles}<details><summary>Double and triple techniques (${techs.filter(t=>t.id>56&&have.has(t.id)).length} clips)</summary>${combos}</details>
<h2 id="house">Donkey's house: the Wolf and the Blind Mouse</h2><div class="shots">${images.map(([n,c])=>`<img loading="lazy" src="img/${esc(n)}" alt=""><p>${md(c)}</p>`).join('')}</div>${notes.scene.map(l=>'<blockquote>'+md(l)+'</blockquote>').join('')}
<h2 id="text">Text rewritten today</h2>${changelog}
<h2 id="status">Verification status</h2><table><tr><th>Check</th><th>Result</th><th>Covers</th></tr>${notes.status.map(r=>'<tr>'+r.map(c=>'<td>'+md(c)+'</td>').join('')+'</tr>').join('')}</table><h3>Not verified</h3>${list(notes.unverified)}
<h2 id="you">Needs you</h2>${list(notes.decisions)}
</html>`;
await writeFile(out+'/index.html',html);console.log('wrote',out+'/index.html',have.size,'clips',images.length,'images');
