import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {PNG} from 'pngjs';
import {privateOverlay,dir,hash} from './private-overlay.mjs';
import {u16} from '../../../engine/rom.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
const {c,rom,baseline,rawPointers}=await privateOverlay(),cfg=JSON.parse(process.argv[2]??'{"name":"piazza","id":405,"x":18,"y":37,"actions":[[17,45]]}'),out=dir+'/private-qa/scene-probes';await mkdir(out,{recursive:true});
const s=await createCore(rom);await newGame(s);const h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h),loads=[],dispatches=[],messages=[],techs=[],pointers=new Map(),observed=new Map(),heaps=[],formations=[];let ticks=0;
h.on('event.init',e=>{if([0x82,0x83].includes(e.opcode))loads.push({...e,id:s.ram[0x12002+e.scriptPC]});});h.on('event.dispatch',e=>{if([0xd8,0xdf,0xe0,0xe1,0x65,0x66].includes(e.opcode))dispatches.push({...e,args:[...s.ram.slice(0x12002+e.scriptPC,0x12008+e.scriptPC)]});});h.on('dialogue.render',e=>messages.push(e));h.on('battle.enemy-tech',e=>techs.push(e));
function status(){return{tick:ticks,location:u16(s.ram,0x100),story:s.ram[0x10000],battle:s.ram[0x117]&1,control:s.ram[0x11f],dialogue:s.ram[0x126],partyXY:[u16(s.ram,0xd00+0x1000),u16(s.ram,0xd02+0x1000)],heap:u16(s.ram,0x171)-32768,formation:[...s.ram.slice(0xaf02,0xaf0a)],flag162:s.ram[0x10162],flag163:s.ram[0x10163]};}
function observe(){assert.equal(d.diagnostics().fatal,null);const heap=u16(s.ram,0x171)-32768;if(heap>=0&&heap<=32768)heaps.push(heap);if(s.ram[0x117]&1){const formation=[...s.ram.slice(0xaf02,0xaf0a)],key=JSON.stringify(formation);if(!formations.some(f=>f.key===key))formations.push({key,tick:ticks,location:u16(s.ram,0x100),formation});return;}for(const l of loads.filter(l=>l.opcode===0x83&&l.id===59&&l.location===u16(s.ram,0x100))){const x=l.object*2,pointer=u16(s.ram,0x1280+x)|s.ram[0x1200+x]<<16;if(pointer!==rawPointers[90])continue;assert.equal(u16(s.ram,0x1400+x),u16(rom,0x242a00+39*2));pointers.set(l.location+':'+l.object,{location:l.location,object:l.object,pointer,palette:39});const f=s.ram[0xf01+x];if(f<28)observed.set(l.location+':'+l.object+':'+f,(observed.get(l.location+':'+l.object+':'+f)??0)+1);}}
const wait=(n,k=0)=>{for(let t=0;t<n;t++){runFrames(s,1,k);ticks++;if(!(ticks&7))observe();}},tap=(k=256,gap=90)=>{wait(3,k);wait(gap);},shot=async key=>{const p=new PNG({width:512,height:480});s.setPixels(p.data);await writeFile(out+'/'+cfg.name+'-'+key+'.png',PNG.sync.write(p));};
s.ram[0x10000]=cfg.story??200;s.ram[0x10162]=0;s.ram[0x10163]=0;s.ram[0x100f8]=cfg.ending?128:0;if(cfg.previous!==undefined){s.ram[0x1d05]=cfg.previous&255;s.ram[0x1d06]=cfg.previous>>8;}
d.jump({id:cfg.id,x:cfg.x,y:cfg.y,party:[0,1,2],endgame:true});wait(cfg.wait??500);await shot('entry');console.log('ENTRY',JSON.stringify(status()));
for(const[k,n]of cfg.actions??[]){wait(n,k);console.log('ACTION',k,n,JSON.stringify(status()));}
if(cfg.auto!==false){for(let n=0;n<(cfg.maxTaps??80)&&!(s.ram[0x117]&1)&&u16(s.ram,0x100)===cfg.id;n++)tap();}
await shot('before-fight');console.log('BEFORE',JSON.stringify(status()));let attacks=0;
if(s.ram[0x117]&1){wait(400);await shot('battle');for(;attacks<(cfg.maxAttacks??150)&&(s.ram[0x117]&1);attacks++)tap();wait(180);await shot('after-fight');console.log('AFTER',JSON.stringify(status()));}
for(let n=0;n<(cfg.continueTaps??0);n++)tap();wait(cfg.tailWait??120);await shot('end');
const report={baseline,privateRomSha256:hash(rom),cfg,result:status(),attacks,heapMax:Math.max(...heaps),heapMin:Math.min(...heaps),pointers:[...pointers.values()],loads,dispatches,messages,techs,formations,observed:[...observed],party:[...s.ram.slice(0x2980,0x2983)].filter(i=>i<7).map(id=>({id,hp:u16(s.ram,0x2603+80*id)})),scope:'Private exploratory authored scene entry and controller inputs only after checkpoint; not yet frozen acceptance'};await writeFile(out+'/'+cfg.name+'.json',JSON.stringify(report,null,2)+'\n');console.log('END',JSON.stringify({result:report.result,pointers:report.pointers,formations,party:report.party,dispatches:dispatches.filter(e=>[0xd8,0xdf].includes(e.opcode)),messages,heapMax:report.heapMax}));assert.deepEqual(s.cart.data,rom);d.dispose();h.dispose();
