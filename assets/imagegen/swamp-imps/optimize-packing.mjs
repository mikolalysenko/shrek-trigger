import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {compileActorFamily} from '../../../engine/actor-families.js';
import {compress} from '../../../engine/compression.js';
import {packMachineCells as packCells} from './pack-cells.mjs';
const dir='assets/imagegen/swamp-imps',source=JSON.parse(await readFile(dir+'/native-cell-raster.json'));
function points(cells,shift=[0,0]){const p=new Map();for(const c of cells)for(let i=0;i<256;i++){const k=parseInt(c.pixels[i],16);if(!k)continue;const x=c.x+i%16-shift[0],y=c.y+(i>>4)-shift[1],key=x+','+y;if(!p.has(key))p.set(key,[x,y,k]);}return[...p.values()];}
function canvas(p){const minY=Math.min(...p.map(v=>v[1])),a=new Uint8Array(4096);for(const[x,y,k]of p){const xx=x+32,yy=y+2-minY;assert.ok(xx>=0&&xx<64&&yy>=0&&yy<64);a[yy*64+xx]=k;}return a;}
const rider=source.groups.find(g=>g.key==='rider'),sets=Object.fromEntries(source.groups.filter(g=>g.key!=='rider').map(g=>[g.key,g.frames.map(f=>canvas(points(f.cells)))]));
sets.extra=[canvas(points(rider.frames[12].cells.slice(4),[0,-1])),canvas(points(rider.frames[15].cells.slice(0,4))),canvas(points(rider.frames[28].cells.slice(0,4),[-1,-18]))];
const all=Object.entries(sets).flatMap(([key,frames])=>frames.map((p,frame)=>({key,frame,pixels:p,opaque:p.filter(Boolean).length}))),range=Array.from({length:all.length},(_,i)=>i),orders=[{name:'initial',order:range},{name:'large-first',order:range.toSorted((a,b)=>all[b].opaque-all[a].opaque)},{name:'small-first',order:range.toSorted((a,b)=>all[a].opaque-all[b].opaque)},{name:'reverse',order:range.toReversed()}];
for(let seed=1;seed<=8;seed++){let n=seed,order=range.slice();for(let i=order.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[order[i],order[j]]=[order[j],order[i]];}orders.push({name:'deterministic-'+seed,order});}
const results=[];let best;
for(const trial of orders){const packed=packCells(trial.order.map(i=>all[i].pixels)),lookup=new Map(trial.order.map((i,n)=>[all[i].key+':'+all[i].frame,packed[n]])),groups=Object.entries(sets).map(([key,frames])=>({art:key,size:0,frames:frames.length,width:64,height:64,frameCellOrigins:frames.map((_,f)=>lookup.get(key+':'+f).origins)})),compiled=compileActorFamily({groups},(key,f)=>sets[key][f]),result={name:trial.name,raw:compiled.graphics.length,compressed:compress(compiled.graphics).length};results.push(result);console.log(result);if(!best||result.raw<best.result.raw||result.raw===best.result.raw&&result.compressed<best.result.compressed)best={result,order:trial.order.map(i=>({key:all[i].key,frame:all[i].frame}))};}
await writeFile(dir+'/packing-trials.json',JSON.stringify({status:'Pixel-identical cell-boundary trials; no source pixel editing',results,best},null,2)+'\n');await writeFile(dir+'/packing-order.draft.json',JSON.stringify(best,null,2)+'\n');
