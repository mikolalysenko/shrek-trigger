import assert from 'node:assert/strict';
import {u16} from '../engine/rom.js';
import {courtSwampCheckpoints} from '../engine/court-swamp-checkpoints.js';
import {spriteSource} from './sprite-source.mjs';

export const courtSwampRoutes={
 'court-trial':{location:27,x:8,y:23,entryFrames:400,trialScene:'trial-kind',gfx:158},
 'prison-rescue':{location:71,x:20,y:36,entryFrames:400,trialScene:'prison-cell',gfx:158},
 'castle-escape':{location:21,x:31,y:52,facing:0,entryFrames:400,trialScene:'castle-escape',gfx:158},
 ...Object.fromEntries(Object.entries(courtSwampCheckpoints).map(([key,c])=>[key,{...c,gfx:key.startsWith('imp-')?86:key.startsWith('palace-')?90:158}]))
};

// Only observation and controller input are exposed here. The identical route
// runs in SnesJs, Snes9x and bsnes after their respective checkpoint setup.
export async function traverseCourtSwampScene(io,rom,key,{streams}){
 const cfg=courtSwampRoutes[key];assert.ok(cfg);
 const {read,bytes}=io,fieldFrames=new Map(),heaps=new Map(),locations=new Set(),source=spriteSource(rom,streams,cfg.gfx);
 async function observe(){
  const location=await read(0x100,2);locations.add(location);
  if(await read(0x117)&1)return;
  const heap=await read(0x171,2);assert.ok(heap>=0x8000&&heap<=0x10000,'Field graphics heap');heaps.set(location,Math.max(heaps.get(location)??0,heap-0x8000));
  const count=Math.min(await read(0x12000),64),r=await bytes(0xf00,0x700);
  for(let object=0;object<count;object++){
   const x=object*2,address=r[0x300+x]<<16|u16(r,0x380+x);
   const frame=r[1+x],palette=u16(r,0x500+x),k=location+':'+object+':'+frame;
   if(!source.field(address,palette))continue;
   fieldFrames.set(k,{location,object,frame,address,palette,samples:(fieldFrames.get(k)?.samples??0)+1});
  }
 }
 const wait=async n=>{await io.wait(n);await observe();},hold=async(k,n)=>{await io.hold(k,n);await observe();},tap=async(k=256,gap=100)=>{await io.tap(k,gap);await observe();},shot=async name=>{await observe();await io.shot(key+'-'+name);};
 const location=()=>read(0x100,2),battle=async()=>!!(await read(0x117)&1);
 const formation=async()=>Array.from(await bytes(0xaf02,8)).filter(id=>id!==255);
 async function victory(max=180){let attacks=0;for(;attacks<max&&await battle();attacks++)await tap();assert.equal(await battle(),false,'Native combat ended');for(let i=0;i<30&&(!await read(0x11f)||await read(0x126));i++)await tap();await wait(120);return attacks;}
 async function fight(expected){
  for(let i=0;i<1600&&!await battle();i++)await wait(1);
  assert.equal(await battle(),true,'Original encounter starts');await wait(500);assert.deepEqual(await formation(),expected);
  const slots=await bytes(0xaf02,8),pointers=await bytes(0x1c60,24),sources=[];
  for(let i=0;i<8;i++)if(slots[i]!==255&&rom[0x24f600+slots[i]*10]===cfg.gfx){const address=pointers[i*3]|pointers[i*3+1]<<8|pointers[i*3+2]<<16;assert.ok(source.battle(address),'battle graphics source '+address.toString(16));sources.push({enemy:slots[i],slot:i,address});}
  assert.ok(sources.length);await shot('battle');const attacks=await victory();await shot('victory');return{formation:expected,sources,attackInputs:attacks};
 }
 await observe();await shot('entry');let result;
 if(key==='court-trial'){
  const chosen=new Set();let inputs=0;
  for(;inputs<280&&await location()!==71;inputs++){
   const id=await read(0x12a);
   if(await location()===27&&[141,159,165,168].includes(id)&&!chosen.has(id)){
    chosen.add(id);
    if([141,159].includes(id)){
     for(let i=0;i<600&&await read(0x162)!==2;i++)await wait(1);
     assert.equal(await read(0x162),2);const row=await read(0x164);
     for(let i=0;i<4&&await read(0x163)!==row;i++){await hold(32,3);await wait(6);}
     assert.equal(await read(0x163),row);
    }else await wait(120);
   }
   await tap();if(inputs%30===0)await shot('court-'+inputs);
  }
  assert.equal(await location(),71);assert.equal(await read(0x10000),45);assert.equal(await read(0x10051),0);await shot('prison-intake');result={location:71,story:45,juryVotes:0,inputs};
 }else if(key==='prison-rescue'){
  let inputs=0;for(;inputs<150&&await read(0x10000)!==46;inputs++)await tap();await wait(120);
  assert.equal(await location(),30);assert.equal(await read(0x10000),46);assert.deepEqual(Array.from(await bytes(0x2980,3)),[0,2,128]);assert.ok([...fieldFrames.values()].some(f=>f.location===30&&f.frame===19),'Native execution-room officer reaction');await shot('rescue');result={location:30,story:46,inputs};
 }else if(key==='castle-escape'){
  await hold(16,60);let inputs=0;for(;inputs<100&&await location()!==19;inputs++)await tap();await wait(120);
  assert.equal(await location(),19);assert.equal(await read(0x10000),48);assert.deepEqual(Array.from(await bytes(0x2980,3)),[0,2,1]);await shot('forest-return');result={location:19,story:48,inputs};
 }else if(key==='imp-canyon'||key==='imp-riders'){
  if(key==='imp-canyon')await wait(120);
  const approachFrames=key==='imp-canyon'?60:55;await hold(16,approachFrames);let approachNudges=0;
  if(key==='imp-canyon'){
   // The original moving roller can pass beside the party on a different
   // input-latch phase. Step back onto its path, then let native contact run.
   await wait(150);
   for(;approachNudges<6&&!await battle();approachNudges++){if(await read(0x11f))await hold(approachNudges%2?16:32,12);await wait(150);}
  }
  result={...await fight(key==='imp-canyon'?[12,12,16]:[19,19,19]),approachFrames,approachNudges};assert.equal(await location(),cfg.location);assert.equal(await read(0x11f),1);
 }else if(key==='imp-worker'){
  await hold(16,14);await tap(256,180);assert.equal(await read(0x12a),220,'Original NPC78 worker dialogue');assert.ok(await read(0x126));await shot('dialogue');
  for(let i=0;i<10&&await read(0x126);i++)await tap(256,60);assert.equal(await read(0x126),0);await wait(160);await shot('patrol');result={location:33,npc:78,dialogue:220};
 }else if(key==='palace-piazza'||key==='palace-lift'){
  if(key==='palace-piazza'){await hold(17,100);await hold(129,65);await hold(65,120);}
  else{await hold(33,45);assert.equal(await location(),411);await wait(350);await shot('lift-arrival');await hold(33,110);}
  result=await fight(key==='palace-piazza'?[59,82,82]:[214,82,82,214,59]);
  if(key==='palace-piazza'){assert.equal(await read(0x10163)&16,16);assert.equal(await location(),405);assert.equal(await read(0x11f),1);result.progressFlag163=await read(0x10163);}
  else{
   await hold(65,75);for(let i=0;i<15&&await location()===411;i++)await tap(256,90);
   for(let i=0;i<300&&await location()===411;i++)await wait(10);
   assert.ok(locations.has(416),'Original lift continues to shared palace');await wait(900);await shot('shared-palace');result.path=[410,411,416];
  }
 }else if(key==='palace-ending'){
  for(let i=0;i<550&&!(await location()===399&&locations.has(416));i++)await wait(10);
  assert.ok(locations.has(416));assert.equal(await location(),399);await wait(300);await shot('kitchen-return');result={path:[398,416,399],scope:'Bounded original montage and kitchen return; loaded Hexer actors are hidden in this branch.'};
 }else{
  for(let i=0;i<(key==='sergeant-sleep'?140:18);i++){
   if(key==='sergeant-sleep')await tap(256,100);else await wait(100);
   if(i%4===0)await shot('acting-'+i);
   if(await location()!==cfg.location)break;
   if(key==='sergeant-sleep'&&[24,25].every(frame=>[...fieldFrames.values()].some(f=>f.frame===frame)))break;
  }
  if(key==='sergeant-sleep')assert.ok([24,25].every(frame=>[...fieldFrames.values()].some(f=>f.frame===frame)),'Both original sleeping poses');
  await shot('end');result={location:await location(),scope:'Original shared scene initialization and acting after diagnostic entry; complete ending not claimed.'};
 }
 assert.ok(fieldFrames.size,'Native field actor uses the integrated graphics bank');
 assert.ok(Array.from(await bytes(0x2980,3)).filter(id=>id<7).length);
 return{key,...result,fieldFrames:[...fieldFrames.values()],heaps:Object.fromEntries(heaps),locations:[...locations]};
}
