import path from 'node:path';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {u16,put16} from '../engine/rom.js';
import {seedFutureCheckpoint} from '../engine/future-checkpoints.js';
import {cosmicMuffinSpawnActors} from '../content/cosmic-muffin.js';
import {cosmicMuffinRaster} from '../engine/generated-cosmic-muffin-art.js';
import {compileCosmicMuffinWorld,compileCosmicMuffinMeteor} from '../engine/cosmic-muffin.js';
import {nativeSpriteBank} from './native-sprite-view.mjs';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {traverseMuffinSpawn} from '../tests/cosmic-scene-controller.mjs';
import {seedBakeryCheckpoint} from '../engine/bakery-checkpoints.js';
import {defeatFurnaceMaw} from '../tests/bakery-controller.mjs';

const requested=process.argv[2]??'all',section=process.argv.find(a=>a.startsWith('--section='))?.split('=')[1]??'all';
if(!['all','snes9x','bsnes'].includes(requested)||!['all','spawn','shell','archive','meteor'].includes(section))throw Error('Choose [all|snes9x|bsnes] [--section=all|spawn|shell|archive|meteor]');
async function tool(env,name){if(process.env[env])return path.resolve(process.env[env]);for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu']){const file=path.resolve(dir,name);try{await access(file);return file;}catch{}}throw Error('Missing '+name);}
const built=await build(),sha256=createHash('sha256').update(built.rom).digest('hex'),root=path.resolve('.local/qa/cosmic-scenes-'+sha256.slice(0,12)),rom=path.join(root,'candidate.sfc');
await mkdir(root,{recursive:true});await writeCandidate(rom,built.rom);const host=await tool('RETRO_HOST','retro-host');
for(const coreName of requested==='all'?['snes9x','bsnes']:[requested]){
 const core=await tool(coreName==='snes9x'?'SNES9X_CORE':'BSNES_CORE',coreName+'_libretro.'+(process.platform==='darwin'?'dylib':'so')),out=path.join(root,coreName+'-'+section);
 const report=await withIndependentController({host,core,rom,out},async({request,write,controller:io})=>{
  for(const[frames,keys]of newGameSequence)await io.hold(keys,frames);
  assert.equal(await io.read(0x100,2),2);
  async function seed(fn){const before=Uint8Array.from(await io.bytes(0,0x20000)),after=before.slice();fn(after);for(let p=0;p<after.length;){if(after[p]===before[p]){p++;continue;}const start=p;while(p<after.length&&after[p]!==before[p])p++;await write(start,after.slice(start,p));}}
  await seed(ram=>{
   ram.fill(8,0x2830,0x2837);ram.fill(255,0x2837,0x283e);ram.fill(224,0x283e,0x284d);ram.fill(128,0x284d,0x285c);
   for(const id of[189,190,191,192,193,194,195,196,197,198,199,200,174,175,176,177,178]){let slot=ram.subarray(0x2400,0x2500).indexOf(id);if(slot<0)slot=ram.subarray(0x2400,0x2500).indexOf(0);assert.ok(slot>=0);ram[0x2400+slot]=id;ram[0x2500+slot]=20;}
   for(let id=0;id<7;id++){const p=0x2600+80*id;for(const o of[3,5])put16(ram,p+o,999);for(const o of[7,9])put16(ram,p+o,99);ram[p+0x12]=60;ram.set([65,60,12,60,60,50,60],p+0xb);ram.set([65,60,12,60,60,50,60],p+0x36);ram.set([id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163],p+0x27);ram.set([200,220,231,3],p+0x3d);}
   ram.set([0,1,2,3,4,5,6,128],0x2980);ram[0x29af]=254;
  });
  await request({op:'savestate',name:'kit'});const load=()=>request({op:'loadstate',file:path.join(out,'kit.state')});
  const jump=async(id,x,y,facing=1)=>{const map=id|facing<<9;await write(0x1238e,[0xe0,map&255,map>>8,x,y,0xb2]);await io.wait(500);assert.equal(await io.read(0x100,2),id);};
  const summary={sha256,core:coreName,section,fixture:'Diagnostic native location entry and level60 kit; ordinary controller input after entry. No fabricated formation, victory or actor coordinates.'};
  if(section==='all'||section==='spawn'){
   summary.spawn=[];
   for(const loc of[96,264,247,495]){
    await load();const [x,y]=loc===264?[5,24]:loc===247?[10,61]:loc===495?[4,20]:[24,19];await jump(loc,x,y);
    const actor=cosmicMuffinSpawnActors.find(a=>a.enemy===(loc===96?111:215)),bank=nativeSpriteBank(built.rom,actor);
    const expected=[];for(let i=0;i<96;i++){const word=u16(bank.assembly,i*2);for(let v of bank.graphics.slice((word&1023)*32,(word&1023)*32+32)){if(word&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=v>>4|(v&15)<<4;}expected.push(v);}}
    // Locate the native body by its loaded graphics ID; locations can use
    // different object numbers even though the assembly is shared.
    const headers=await io.bytes(0x1100,128),slots=[];for(let n=0;n<64;n++)if(headers[n*2+1]===actor.enemy&&[5,6].includes(headers[n*2]))slots.push(n);
    assert.equal(slots.length,1);const tile=await io.read(0xd00+slots[0]*2,2);
    if(coreName==='snes9x')assert.deepEqual((await request({op:'read',mem:'vram',addr:tile*32,len:3072})).value,expected);
    const result=await traverseMuffinSpawn({...io,tap:(key,gap=12)=>io.tap(key,gap)},loc);
    summary.spawn.push({...result,bodyTile:tile,bodyObject:slots[0],fixedUploadChecked:coreName==='snes9x'});console.log(coreName+' offspring '+loc+' passed');
   }
  }
  if(section==='all'||section==='shell'){
   await load();await jump(467,7,10);await io.wait(400);await io.shot('shell-arrival');
   const png=PNG.sync.read(await readFile(path.join(out,'shell-arrival.png'))),p=Uint8Array.from(cosmicMuffinRaster.body.pixels,v=>parseInt(v,16)),colors=new Map(),inverse=new Map();let checked=0;
   for(let y=35;y<100;y++)for(let x=32;x<224;x++){const k=p[y*256+x];if(!k)continue;const i=((y-33)*png.width+x)*4,rgb=png.data[i]<<16|png.data[i+1]<<8|png.data[i+2];if(colors.has(k))assert.equal(rgb,colors.get(k),'body palette index '+k);if(inverse.has(rgb))assert.equal(k,inverse.get(rgb),'distinct body colors');colors.set(k,rgb);inverse.set(rgb,k);checked++;}
   assert.ok(checked>10000&&colors.size>=10);summary.shell={location:467,displayedPixels:checked,colors:colors.size,heapBytes:(await io.read(0x171,2))-0x8000};console.log(coreName+' shell arrival passed');
  }
  if(section==='all'||section==='archive'){
   await load();await seed(ram=>seedFutureCheckpoint(ram,'future-archive'));await jump(218,56,43,0);await io.hold(16,24);
   let worldSamples=0,exactUploads=0;const expected=Array.from(compileCosmicMuffinWorld(built.base).graphics);
   for(let n=0;n<230&&await io.read(0x10000)!==54;n++){
    await io.tap(256,100);if(await io.read(0x100,2)!==503)continue;worldSamples++;
    if(coreName==='snes9x'){const bytes=(await request({op:'read',mem:'vram',addr:0,len:8192})).value;if(bytes.every((v,i)=>v===expected[i])){exactUploads++;if(exactUploads===5)await io.shot('world-emergence');}}
    else if(worldSamples===10)await io.shot('world-emergence');
   }
   assert.equal(await io.read(0x10000),54);assert.equal(await io.read(0x100,2),218);assert.ok(worldSamples>=15);if(coreName==='snes9x')assert.ok(exactUploads>=8);summary.archive={worldSamples,exactUploads,returnedTo:218,story:54};console.log(coreName+' archive disaster passed');
  }
  if(section==='all'||section==='meteor'){
   // FF replaces the field engine and resets its stack. Its native story
   // continuation cannot be tested by appending a return to a bedroom script.
   // Enter before the real predecessor battle; all later progress is native.
   await load();await seed(ram=>seedBakeryCheckpoint(ram,'bakery-furnace'));await jump(301,8,30,0);
   const packed=compileCosmicMuffinMeteor(built.base).graphics,expanded=Array.from(packed,v=>[v&15,v>>4]).flat();
   let mode7Samples=0,exactUploads=0;
   async function observe(){
    const vector=await io.bytes(0x501,3);
    if(vector[2]!==0xc3||await io.read(0x384)!==0x24)return;
    mode7Samples++;
    if(coreName==='snes9x'){
     const bytes=(await request({op:'read',mem:'vram',addr:0,len:expanded.length*2})).value;
     if(bytes.filter((_,i)=>i%2).every((v,i)=>v===expanded[i]))exactUploads++;
    }
    if(mode7Samples===10)await io.shot('meteor');
   }
   async function advance(keys,frames){for(let left=frames;left>0;left-=60){await io.hold(keys,Math.min(60,left));await observe();}}
   const cinematicIo={...io,hold:advance,wait:n=>advance(0,n),tap:async(keys=256,gap=90)=>{await advance(keys,3);await advance(0,gap);}};
   const result=await defeatFurnaceMaw(cinematicIo);
   assert.ok(mode7Samples>=15,'the real aftermath runs native scene24');if(coreName==='snes9x')assert.ok(exactUploads>=15,'meteor texture uploads during the real aftermath');
   const beforeX=await io.read(0x283,2);await io.hold(128,12);assert.notEqual(await io.read(0x283,2),beforeX,'world movement resumes after the original aftermath');
   await io.shot('meteor-return');summary.meteor={...result,nativeCommand:[255,36],mode7Samples,exactUploads,scope:'Diagnostic entry before the original Furnace Maw fight; controller-only defeat, meteor, impact, flight dialogue and playable overworld continuation.'};console.log(coreName+' native meteor and aftermath passed');
  }
  return summary;
 });
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(coreName+' Cosmic Muffin scenes passed: '+sha256);
}
