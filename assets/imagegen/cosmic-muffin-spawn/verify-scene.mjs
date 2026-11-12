import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {PNG} from 'pngjs';
import {privateOverlay} from './private-overlay.mjs';import {sha} from './compile-draft.mjs';
import {uploaded,oamCells,locate,pixelProof} from './native-proof-utils.mjs';
import {createCore} from '../../../scripts/core.mjs';import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';import {createDevTools} from '../../../engine/devtools.js';
import {u16} from '../../../engine/rom.js';import {screenshot} from '../../../tests/helpers.mjs';import {snapshot,restore} from '../../../engine/save.js';
import {attackNativeEnemy,useNativeItem} from '../../../tests/battle-controller.mjs';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),c=privateOverlay(),loc=Number(process.argv[2]??264),out=path.join(d,'scene-verification',String(loc));fs.mkdirSync(out,{recursive:true});
const s=await createCore(c.rom),checkpoint=path.join(d,'private/newgame.json');if(fs.existsSync(checkpoint))restore(s,JSON.parse(fs.readFileSync(checkpoint)));else{await newGame(s);fs.writeFileSync(checkpoint,JSON.stringify(snapshot(s)));}
const h=installHooks(s,JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json')))),dev=createDevTools(s,h),loads=[],battles=[],results=[],observations=[],captured=new Set(),actions=[];let ticks=0,maxHeap=0;
h.on('event.init',e=>{if(e.location===loc&&e.opcode===0x83){const id=s.ram[0x12002+e.scriptPC];if([110,111,215,216].includes(id))loads.push({object:e.object,enemy:id,scriptPC:e.scriptPC});}});
h.on('battle.initialized',e=>battles.push({...e,formation:[...s.ram.slice(0xaf02,0xaf0a)]}));h.on('battle.result',e=>results.push(e));
const capture=(name)=>{if(captured.has(name))return;captured.add(name);const p=new PNG({width:512,height:480});s.setPixels(p.data);fs.writeFileSync(path.join(out,name+'.png'),PNG.sync.write(p));};
function observe() {
  if(s.ppu.brightness!==15||u16(s.ram,0x100)!==loc)return;
  maxHeap=Math.max(maxHeap,u16(s.ram,0x171)-0x8000);
  const cells=oamCells(s,c.audit.palette.words),parts=[];
  for(const a of c.candidates)for(const f of a.key==='shell'?[0]:[0,1]) {const p=locate(a,f,cells);if(p){parts.push(p);break;}}
  if(parts.length!==2)return;
  const row={tick:ticks,battle:!!(s.ram[0x117]&1),parts:parts.map(p=>({key:p.key,frame:p.frame,origin:p.origin,opaqueCells:p.cells.length})),delta:parts[1].origin.map((v,i)=>v-parts[0].origin[i]),pixel:pixelProof(s,parts,c.audit.palette.words),fieldObjects:loads.map(a=>({...a,position:[u16(s.ram,0x1800+a.object*2)/16,u16(s.ram,0x1880+a.object*2)/16],frame:s.ram[0xf01+a.object*2]}))};
  const key=(row.battle?'battle':'field')+'-h'+parts[1].frame;
  if(!captured.has(key)&&!row.pixel.mismatches){capture(key);console.log(JSON.stringify(row));}
  if(!observations.some(a=>a.battle===row.battle&&a.parts[1].frame===row.parts[1].frame&&a.pixel.mismatches<=row.pixel.mismatches))observations.push(row);
}
function run(n,keys=0){if(keys)actions.push({tick:ticks,frames:n,keys});for(let i=0;i<n;i++){runFrames(s,1,keys);ticks++;if(ticks%8===0)observe();assert.equal(dev.diagnostics().fatal,null);}}
const start=loc===264?{x:5,y:24}:loc===247?{x:10,y:61}:loc===495?{x:4,y:20}:{x:24,y:19};
dev.jump({id:loc,...start,party:[0,1,2],endgame:true});run(500);await capture('arrival');
console.log(JSON.stringify({stage:'arrival',loc,loads,position:[u16(s.ram,0x1800+u16(s.ram,0x197))/16,u16(s.ram,0x1880+u16(s.ram,0x197))/16],battle:s.ram[0x117]&1}));
if(loc===264)run(36,16);else if(loc===247)run(24,16);else if(loc===96)run(36,16);else if(loc===495){run(48,128);run(70,16);}
run(600);await capture('after-approach');
const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(k,n)=>run(n,k),wait:n=>run(n),tap:(k=256,gap=12)=>{run(3,k);run(gap);}};
let attacks=0;
for(let i=0;i<100&&(s.ram[0x117]&1||!s.ram[0x11f]||s.ram[0x126]);i++){
  if(s.ram[0x117]&1){const enemy=loc===96?110:216;if(s.ram.slice(0xaf02,0xaf0a).includes(enemy)){await attackNativeEnemy(io,enemy);attacks++;run(180);}else {run(3,256);run(100);}}
  else {run(3,256);run(100);}
}
run(180);await capture('after-input');
fs.writeFileSync(path.join(d,'private/scene-'+loc+'-after.json'),JSON.stringify(snapshot(s)));
assert.equal(u16(s.ram,0x100),loc);assert.equal(s.ram[0x117]&1,0);assert.equal(s.ram[0x11f],1);assert.equal(s.ram[0x126],0);assert.equal(battles.length,1);
assert.deepEqual(battles[0].formation,loc===96?[111,255,255,255,255,255,110,255]:[215,255,255,255,255,255,216,255]);
assert.ok(results.some(r=>r.target===9&&r.actor<3&&r.value>0));for(const frame of[0,1])assert.ok(observations.some(r=>r.battle&&r.parts[1].frame===frame&&r.pixel.mismatches===0));
if(loc!==96)assert.ok(s.ram[0x10064]&({264:8,247:16,495:32}[loc]));assert.deepEqual(s.cart.data,c.rom);
const report={...c.report,status:'Original encounter and native victory passed',location:loc,diagnosticEntry:{...start,party:[0,1,2],endgame:true},originalSceneEventUnmodified:true,controllerOnlyAfterEntry:true,loads,battles,results,observations,actions,attacks,maxHeap,final:{location:u16(s.ram,0x100),battle:s.ram[0x117]&1,control:s.ram[0x11f],dialogue:s.ram[0x126],formation:[...s.ram.slice(0xaf02,0xaf0a)],flag10064:s.ram[0x10064],flag100a9:s.ram[0x100a9],positions:loads.map(a=>({...a,x:u16(s.ram,0x1800+a.object*2)/16,y:u16(s.ram,0x1880+a.object*2)/16})),leader:[u16(s.ram,0x1800+u16(s.ram,0x197))/16,u16(s.ram,0x1880+u16(s.ram,0x197))/16]},cartridgeUnchanged:true,scope:'Original location reveal/approach and battle after a diagnostic jump and endgame loadout. No fabricated formation or victory flags. Natural full mountain/Black Omen predecessor route and independent-core integration remain separate.'};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,observations:observations.length,actions:actions.length}));dev.dispose();h.dispose();
