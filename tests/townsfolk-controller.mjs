import assert from 'node:assert/strict';
import {u16} from '../engine/rom.js';
import {townsfolkCheckpoints} from '../engine/townsfolk-checkpoints.js';
import {traverseCourtSwampScene} from './court-swamp-controller.mjs';
import {visitMedinaInn} from './medina-controller.mjs';
import {spriteSource} from './sprite-source.mjs';

export const townsfolkRoutes={
 ...Object.fromEntries(Object.entries(townsfolkCheckpoints).map(([key,c])=>[key,{gfx:key.startsWith('woodland-')?81:11,frames:key.startsWith('woodland-')?15:19,...c}])),
 'keeper-medina':{location:35,x:58,y:12,facing:0,entryFrames:500,medinaScene:'medina-peaceful-inn',gfx:11,frames:19},
 'keeper-trial':{location:27,x:8,y:23,entryFrames:400,trialScene:'trial-kind',gfx:11,frames:19},
 'hobgoblin-inn':{location:35,x:50,y:9,facing:0,entryFrames:500,medinaScene:'medina-inn',gfx:83,frames:37}
};

// Shared controller-only routes for browser CPU and independent emulators.
// Scene setup is performed by the runner; these functions cannot write WRAM.
export async function traverseTownsfolkScene(io,rom,key,{streams}){
 const cfg=townsfolkRoutes[key];assert.ok(cfg);const {read,bytes}=io,poses=new Map(),heaps=new Map(),messages=new Set(),locations=new Set(),source=spriteSource(rom,streams,cfg.gfx);
 const location=()=>read(0x100,2),battle=async()=>!!(await read(0x117)&1);
 async function observe(){
  const loc=await location();locations.add(loc);if(await read(0x126))messages.add(loc+':'+await read(0x12a));if(await battle())return;
  const heap=await read(0x171,2);assert.ok(heap>=0x8000&&heap<=0x10000);heaps.set(loc,Math.max(heaps.get(loc)??0,heap-0x8000));
  const count=Math.min(await read(0x12000),64),r=await bytes(0xf00,0x700);
  for(let object=0;object<count;object++){
   const x=object*2,address=r[0x300+x]<<16|u16(r,0x380+x),frame=r[1+x];if(!source.field(address,u16(r,0x500+x))||frame>=cfg.frames)continue;
   const id=loc+':'+object+':'+frame;poses.set(id,{location:loc,object,frame,address,palette:u16(r,0x500+x),samples:(poses.get(id)?.samples??0)+1});
  }
 }
 const wait=async n=>{await io.wait(n);await observe();},hold=async(k,n)=>{await io.hold(k,n);await observe();},tap=async(k=256,gap=100)=>{await io.tap(k,gap);await observe();},shot=async name=>{await observe();await io.shot(key+'-'+name);};
 await observe();await shot('entry');let result;
 if(key==='keeper-trial'){
  const trial=await traverseCourtSwampScene({...io,wait,hold,tap},rom,'court-trial',{streams});
  assert.ok([...messages].some(s=>['27:149','27:152','27:153'].includes(s)),'Original Pierre dialogue executes');
  result={...trial.result,trialPath:trial.locations};await shot('prison-intake');
 }else if(key==='woodland-mountain'){
  await hold(16,80);await wait(500);assert.equal(await battle(),true);
  const formation=Array.from(await bytes(0xaf02,8)).filter(id=>id!==255);assert.deepEqual(formation,[3,3,3,3]);
  const pointers=await bytes(0x1c60,24),slots=await bytes(0xaf02,8),sources=[];
  for(let n=0;n<8;n++)if(slots[n]===3){const address=pointers[n*3]|pointers[n*3+1]<<8|pointers[n*3+2]<<16;assert.ok(spriteSource(rom,streams,81).battle(address),'battle graphics source '+address.toString(16));sources.push({slot:n,address});}
  await shot('battle');let attacks=0;for(;attacks<180&&await battle();attacks++)await tap();assert.equal(await battle(),false,'Original mountain victory');
  for(let n=0;n<30&&(!await read(0x11f)||await read(0x126));n++)await tap();await wait(120);assert.equal(await read(0x11f),1);assert.equal(await location(),274);await shot('victory');result={formation,sources,attackInputs:attacks};
 }else if(key==='woodland-tavern'){
  await hold(16,12);await tap(256,180);assert.equal(await read(0x12a),46);assert.ok(await read(0x126));await shot('dialogue');
  await hold(32,3);await wait(3);await tap(256,20);await wait(120);
  for(let n=0;n<10&&await read(0x126);n++)await tap(256,60);assert.equal(await read(0x126),0);await wait(60);await shot('returned');result={npc:77,dialogue:46,location:53};
 }else if(key.startsWith('keeper-fair')){
  if(key==='keeper-fair')await hold(64,60);await wait(180);await shot('merchant');
  const object=cfg.object??16,pointer=await read(0x1400+object*2,2),row=await read(0xf81+object*2)>>1&7;assert.equal(pointer,u16(rom,0x242a00+133*2));assert.ok(row<5);
  const owner=await read(0xb80+row);assert.ok(owner<128);assert.equal(await read(0x1400+owner,2),pointer,'Merchant shares a compatible allocated palette');
  result={location:5,merchantObject:object,palette:133,scope:'Original fair initialization and visible shared-palette merchant.'};
 }else if(key==='hobgoblin-inn'){
  result=await visitMedinaInn({...io,wait,hold,tap,shot}, {peaceful:false,confrontation:true});await observe();
 }else if(key==='hobgoblin-cathedral'||key==='hobgoblin-fortress'){
  if(key==='hobgoblin-cathedral'){await hold(16,8);await tap(256,180);assert.ok(messages.has('201:51'));for(let n=0;n<30&&!await battle();n++)await tap();}
  else{await hold(16,40);await wait(700);}
  assert.equal(await battle(),true);await wait(400);const formation=Array.from(await bytes(0xaf02,8)).filter(id=>id!==255);assert.deepEqual(formation,key==='hobgoblin-cathedral'?[75,75,75]:[5,5]);await shot('battle');
  let attacks=0;for(;attacks<160&&await battle();attacks++)await tap();assert.equal(await battle(),false);
  for(let n=0;n<30&&(!await read(0x11f)||await read(0x126));n++)await tap(256,90);await wait(120);assert.equal(await read(0x11f),1);await shot('victory');result={formation,attackInputs:attacks};
 }else if(key==='hobgoblin-kitchen'){
  await tap(256,160);await tap(256,160);await hold(16,12);await tap(256,180);assert.ok(messages.has('202:59'));await shot('dialogue');
  for(let n=0;n<4;n++)if(await read(0x126))await tap(256,90);else await wait(90);assert.equal(await read(0x126),0);assert.equal(await battle(),false);await shot('returned');result={dialogue:59,location:202};
 }else if(key==='hobgoblin-square'){
  for(let n=0;n<2400&&!messages.has('31:219');n++){
   if(await read(0x126)){await tap();continue;}
   const leader=await read(0x197,2),xy=await bytes(0x1800,256),dx=(u16(xy,18)-u16(xy,leader))/16,dy=(u16(xy,146)-u16(xy,128+leader))/16,face=Math.abs(dx)>Math.abs(dy)?(dx>0?128:64):(dy>0?32:16);
   if(Math.abs(dx)+Math.abs(dy)<28){await hold(face,1);await tap(256,60);}else await hold(face|1,1);
  }
  assert.ok(messages.has('31:219'));assert.equal(await battle(),false);await shot('dialogue');
  for(let n=0;n<20&&await read(0x126);n++)await tap(256,80);await wait(120);await shot('returned');result={dialogue:219,location:31};
 }else if(cfg.dialogues){
  for(let n=0;n<300&&!cfg.dialogues.some(id=>messages.has(cfg.location+':'+id));n++){
   const leader=await read(0x197,2),xy=await bytes(0x1800,256),x=cfg.object*2;
   const dx=(u16(xy,x)-u16(xy,leader))/16,dy=(u16(xy,128+x)-u16(xy,128+leader))/16;
   const direction=Math.abs(dx)>4?(dx>0?128:64):Math.abs(dy)>12?(dy>0?32:16):Math.abs(dx)>Math.abs(dy)?(dx>0?128:64):(dy>0?32:16);
   await hold(direction|(n%4===0?256:0),3);await wait(1);
  }
  assert.ok(cfg.dialogues.some(id=>messages.has(cfg.location+':'+id)),'Original target dialogue reached');await shot('dialogue');
  for(let n=0;n<4;n++)await tap(256,120);await wait(300);assert.equal(await location(),cfg.location);await shot('settled');
  result={location:cfg.location,scope:'Original NPC dialogue and bounded continuation from the recorded prerequisite checkpoint.'};
 }else if(cfg.observeFrames){
  for(let n=0;n<cfg.observeFrames;n+=4){await wait(Math.min(4,cfg.observeFrames-n));if(cfg.stopWhenPoses&&cfg.expectedPoses.every(frame=>[...poses.values()].some(p=>p.object===cfg.object&&p.frame===frame)))break;}
  for(const frame of cfg.expectedPoses??[])assert.ok([...poses.values()].some(p=>p.object===cfg.object&&p.frame===frame),'Original scene requests acting frame '+frame+'; observed '+[...new Set([...poses.values()].filter(p=>p.object===cfg.object).map(p=>p.frame))].sort((a,b)=>a-b).join(','));
  await shot('settled');assert.equal(await location(),cfg.finalLocation??cfg.location);for(const loc of cfg.expectedLocations??[])assert.ok(locations.has(loc),'Original ending transition '+loc);result={location:await location(),scope:'Original acting and palette staging from a diagnostic checkpoint; no complete ending claim.'};
 }else{
  if(key!=='keeper-dream'){await hold(128,12);await tap();await shot('interaction');}
  await wait(400);await shot('settled');assert.equal(await location(),cfg.location);result={location:cfg.location,scope:'Original initialization and bounded controller interaction; no full service transaction or ending claim.'};
 }
 if(cfg.location===80){
  const expected=[[2,0,0],[38,4,139],[41,0,138],[40,7,133],[35,7,133]],rows=[];
  for(const[object,row,palette]of expected){const actual=await read(0xf81+object*2)>>1&7;assert.equal(actual,row,'Parade object '+object+' palette row');assert.equal(await read(0x1400+object*2,2),u16(rom,0x242a00+palette*2));rows.push({object,row,palette});}
  result.paletteRows=rows;
 }
 assert.ok(poses.size,'Original scene requests the selected native graphics bank');
 return{key,result,locations:[...locations],messages:[...messages],fieldPoses:[...poses.values()],maxFieldHeapBytes:Object.fromEntries(heaps)};
}
