import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {createCore} from '../scripts/core.mjs';
import {u16,put16} from '../engine/rom.js';
import {nativeRoutine} from '../engine/asm.js';
import {swampBelchGraphics,swampBelchWindow} from '../engine/swamp-belch-art.js';
import {swampBurp} from '../engine/swamp-belch.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {assertRevisedBytes} from './technique-revision-fixtures.mjs';
const b=await build(),gfx=swampBelchGraphics();
function start(s,pc,{slot=0,tech=8,action=2,bg=1}={}){
 const c=s.cpu;s.ram.fill(0);c.reset();c.e=false;c.m=true;c.x=false;c.i=true;c.cyclesLeft=0;c.r[0]=0x7e;c.r[1]=pc>>16;c.br[4]=pc&65535;c.br[5]=0;c.br[3]=0x7ff;
 s.ram[0xae91]=slot;s.ram[0xae92]=action;s.ram[0xae93]=tech;put16(s.ram,0xcca2,bg);
}
function until(s,pc){let n=0;while((s.cpu.r[1]<<16|s.cpu.br[4])!==pc&&n++<100000)s.cpu.cycle();assert.ok(n<100000,'native helper returned');return n;}
function cpu(s){assert.equal(s.cpu.br[3],0x7ff);assert.equal(s.cpu.r[0],0x7e);assert.equal(s.cpu.m,true);assert.equal(s.cpu.x,false);}
test('Swamp Belch keeps Luminaire mechanics, shared source art and the existing memory reservations',()=>{
 for(const[start,end]of[[0xc1acb,0xc247b],[0xc253b,0xc2580],[0x114100,0x115000]])assertRevisedBytes(b.rom,b.base,start,end);
 for(const[start,end]of[[0xd45a6+56,0xd45a6+63],[0x11a011,0x11a233]])assert.deepEqual(b.rom.slice(start,end),b.base.slice(start,end));
 assert.equal(b.audit.swampBelch.extraWramBytes,0);assert.equal(b.audit.swampBelch.extraVramBytes,0);
 assert.equal(gfx.uniqueTiles,227);assert.equal(gfx.graphics.length,4096);assert.equal(gfx.tilemap.length,2048);
 for(const tile of[238,239,254,255])assert.ok(gfx.graphics.slice(tile*16,tile*16+16).every(v=>!v));
 // Reconstruct the actual 32×32 background from four native 16×16 quadrants.
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const q=(y>>7)*2+(x>>7),cell=((y>>3)&15)*16+((x>>3)&15),entry=u16(gfx.tilemap,q*512+cell*2),tile=entry&1023,bit=7-(x&7),p=tile*16+(y&7)*2;
  assert.equal((gfx.graphics[p]>>bit&1)|(gfx.graphics[p+1]>>bit&1)<<1,x>=32&&x<224&&y>=16&&y<208?gfx.expanded[(y-16)*192+x-32]:0);
 }
});
test('native gas contour matches all 100 exact radius masks in every player slot within a bounded CPU cost',async t=>{
 const s=await createCore(b.rom);let maxCycles=0;
 for(const slot of[0,1,2])for(let radius=1;radius<=100;radius++){
  start(s,0xcd3189,{slot});s.cpu.br[0]=0;s.ram[0xcaa4]=radius;s.ram[0xcaa6]=128;s.ram.fill(0xa7,0xb900,0xbb00);
  maxCycles=Math.max(maxCycles,until(s,0xcd35a5));
  // CD:35A5 loads the radius into 8-bit A and transfers all 16 bits to Y;
  // a nonzero hidden high byte puts the cloud in the wrong place on screen.
  assert.equal(s.cpu.br[0]>>8,0,'accumulator high byte is clear at the native continuation, radius '+radius);
  assert.deepEqual(s.ram.slice(0xb900+(128-radius)*2,0xb900+(128+radius)*2),swampBelchWindow(radius,gfx.contour),'radius '+radius);
  assert.ok(s.ram.slice(0xb900,0xb900+(128-radius)*2).every(v=>v===0xa7));assert.ok(s.ram.slice(0xb900+(128+radius)*2,0xbb00).every(v=>v===0xa7));cpu(s);
 }
 // The former per-frame renderer took about 25,700 cycles, overran the frame
 // and made the native lag path blank every other frame of the cloud.
 assert.ok(maxCycles<4000,'window rows are copied, not rebuilt: '+maxCycles);
 t.diagnostic('Maximum isolated native contour cost: '+maxCycles+' CPU cycles; no hardware multiply or divide.');
 // Execute the entire fallback, including its original nested JSR/RTS.
 // Merely reaching a return address misses jumps into overwritten bytes.
 const legacy=await createCore(b.base);
 for(const args of[{slot:3},{tech:7},{action:1},{bg:2},{bg:257},{cx:100},{radius:101},{shape:2}]){
  for(const core of[s,legacy]){
   start(core,0xcd3189,args);const shape=args.shape??0;core.cpu.br[0]=shape;
   core.ram[0xcaa4+shape]=args.radius??60;core.ram[0xcaa6+shape]=args.cx??128;core.ram[0xcaa8+shape]=112;
   put16(core.ram,0x800,0x7fff);until(core,0xcd8000);
  }
  assert.deepEqual(s.ram.slice(0xb800,0xcc64),legacy.ram.slice(0xb800,0xcc64),'original window and scratch output');
  assert.deepEqual(s.cpu.br,legacy.cpu.br,'fallback registers and stack');assert.deepEqual(s.cpu.r,legacy.cpu.r);
  for(const flag of['m','x','c','z','n','v','e','i','d'])assert.equal(s.cpu[flag],legacy.cpu[flag],'fallback flag '+flag);
 }
 start(s,0xcd3189);s.cpu.br[0]=0;s.ram[0xcaa6]=128;until(s,0xcd319d);cpu(s);
});
test('native upload, script, palette and sound selectors preserve aliases and CPU state',async()=>{
 const s=await createCore(b.rom);
 for(const args of[{}, {slot:1},{slot:2},{slot:3},{tech:1},{tech:17},{tech:64},{action:1},{bg:2},{bg:257}]){
  const selected=(args.slot??0)<3&&(args.tech??8)===8&&(args.action??2)===2&&(args.bg??1)===1;
  for(let chunk=0;chunk<4;chunk++){
   start(s,0xcd0fa9,args);s.cpu.br[1]=99;s.cpu.br[2]=1234;s.ram[0xcace]=chunk;s.ram.fill(0x91,0x2d00,0x3100);until(s,0xcd0fae);
   assert.deepEqual(s.ram.slice(0x2d00,0x3100),selected?gfx.graphics.slice(chunk*1024,chunk*1024+1024):new Uint8Array(1024).fill(0x91));assert.equal(s.cpu.br[1],chunk*2);assert.equal(s.cpu.br[2],1234);cpu(s);
  }
  start(s,0xcd1004,args);s.cpu.br[1]=1234;s.cpu.br[2]=4567;s.ram[0xca95]=s.ram[0xca96]=3;until(s,0xcd1009);
  assert.deepEqual(s.ram.slice(0xd000,0xd800),selected?gfx.tilemap:new Uint8Array(2048));
  assert.equal(s.ram[0xca95],selected?255:3);assert.equal(s.ram[0xca96],selected?255:3);assert.equal(s.cpu.br[1],1234);assert.equal(s.cpu.br[2],0);
  for(const p of[0x2032,0x2232,0x203a,0x223a])for(let i=0;i<3;i++)assert.equal(u16(s.ram,p+i*2),selected?gfx.palette[i]:0);cpu(s);
  start(s,0xcd1655,args);s.cpu.br[0]=0x0037;s.cpu.br[1]=0;put16(s.ram,0xca35,0xa011);s.ram[0xca37]=0xd1;until(s,0xcd165a);
  assert.equal(u16(s.ram,0x40),selected?b.audit.swampBelch.script&65535:0xa011);assert.equal(s.ram[0xca37],selected?(b.audit.swampBelch.script>>16)|0xc0:0xd1);assert.equal(s.cpu.br[0],0x37);cpu(s);
  for(const cue of[0xa5,0xa6,0x91,253]){start(s,0xc161a4,args);s.ram[0x1e01]=cue;s.ram[0x9895]=0x78;until(s,0xc161a8);assert.equal(s.ram[0x1e01],selected&&cue===0xa5?swampBurp.id:selected&&cue===0xa6?swampBurp.silent:cue);assert.equal(s.cpu.br[0],0x78);assert.equal(s.cpu.c,true);cpu(s);}
 }
 for(const [slot,pointer,bank]of[[16,0xa011,0xd1],[0,0xa012,0xd1],[0,0xa011,0xd2]]){
  start(s,0xcd1655);s.cpu.br[1]=slot;put16(s.ram,0xca35+slot,pointer);s.ram[0xca37+slot]=bank;until(s,0xcd165a);assert.equal(u16(s.ram,0x40),pointer);assert.equal(s.ram[0xca37+slot],bank);cpu(s);
 }
});
test('native emitter resolves signed long branches and rejects out-of-range short branches',()=>{
 const bytes=nativeRoutine(a=>{a.label('start');a.longBranch('end');for(let i=0;i<300;i++)a.emit(0xea);a.longBranch('start');a.label('end');a.emit(0x6b);});
 assert.equal(u16(bytes,1),303);assert.equal(u16(bytes,304),(-306)&65535);
 assert.throws(()=>nativeRoutine(a=>{a.branch(0x80,'end');for(let i=0;i<128;i++)a.emit(0xea);a.label('end');}),/out of range/);
});
test('native Swamp Belch reaches every target from all party slots, uploads exact pixels and restores the battle renderer',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json'));await mkdir('.local/qa',{recursive:true});
 for(const[party,fixture]of[[[0,1,2],'swamp-pack'],[[1,0,2],'swamp-pack'],[[1,2,0],'swamp-pack'],[[0,1,2],'milenko']]){
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),slot=party.indexOf(0);
  d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);d.startCombat({fixture,unlockTechs:true});runFrames(s,400);
  for(let n=0;n<1500&&s.ram[0x95d5]>2;n++)s.runFrame();
  const mp=u16(s.ram,0x5e34+slot*128),hits=[];let cast=false,exact=false,palette=false,cloud=false;
  h.on('battle.tech',e=>{if(e.techId===8&&e.actor===slot)cast=true;});h.on('battle.result',e=>{if(e.techId===8&&e.actor===slot)hits.push(e);});
  const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
  await chooseNativeTech(io,b.rom,slot,8);
  let restored=false;
  for(let f=0;f<2000;f++){
   s.runFrame();
   if(cast&&s.ram[0xae91]===slot&&s.ram[0xae92]===2&&s.ram[0xae93]===8){
    const vram=new Uint8Array(s.ppu.vram.buffer);
    exact ||= gfx.graphics.every((v,i)=>vram[0xa000+i]===v);
    palette ||= gfx.palette.every((v,i)=>s.ppu.cgram[25+i]===v);
    cloud ||= s.ram[0xcaa4]>=90&&s.ram[0xbe92]===0x44&&s.ram[0xbe99]===9;
   }
   if(f===240)await screenshot(s,`.local/qa/swamp-belch-${fixture}-slot-${slot}.png`);
   if(cloud&&u16(s.ram,0xcca2)===0&&s.ram[0xcfff]===0){restored=true;runFrames(s,180);break;}
  }
  assert.ok(cast);assert.ok(exact,'exact4KiB native BG3 upload');assert.ok(palette,'exact three generated colors');assert.ok(cloud,'native expanding gas with half-add color math');
  assert.equal(new Set(hits.map(e=>e.target)).size,fixture==='swamp-pack'?3:1);assert.ok(hits.every(e=>e.target>=3&&e.value>0));
  const currentMp=(s.ram[0x117]&1)?u16(s.ram,0x5e34+slot*128):u16(s.ram,0x2600+0*80+7);
  assert.equal(currentMp,mp-5,'Gold Stud preserves the source20MP discount');
  assert.ok(restored,'native renderer cleanup completes');assert.equal(d.diagnostics().fatal,null);assert.equal(s.cpu.stopped,false);
  d.undo();assert.deepEqual(s.cart.data,b.rom);d.dispose();h.dispose();
 }
});

test('the cloud covers the enemy group and never blanks a frame',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json')),s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
 d.jump({id:1,x:8,y:8,party:[0,1,2],endgame:true});runFrames(s,300);d.startCombat({fixture:'swamp-pack',unlockTechs:true});runFrames(s,400);
 for(let n=0;n<1800&&s.ram[0x95d5]>2;n++)s.runFrame();
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
 // The middle of the arena, around the three enemies, in output pixels.
 const pixels=new Uint8Array(512*480*4),box=()=>{s.setPixels(pixels);const out=[];for(let y=180;y<300;y+=6)for(let x=180;x<330;x+=6){const p=(y*512+x)*4;out.push(pixels[p],pixels[p+1],pixels[p+2]);}return out;};
 const before=box();
 await chooseNativeTech(io,b.rom,0,8);
 let blanked=0,cloudFrames=0,covered=0,full=false;
 for(let f=0;f<1500;f++){
  // Step by cycle: a screenshot every few frames cannot see a 30 Hz blank.
  let lines=0;do{s.cycle();if(s.xPos===0&&s.yPos<224&&s.ppu.forcedBlank)lines++;}while(!(s.xPos===0&&s.yPos===0));
  const radius=s.ram[0xcaa4],active=s.ram[0xcaa6]===128&&radius>=1&&radius<=100;
  if(active){cloudFrames++;if(lines>200)blanked++;}
  if(active&&radius===100&&!full){full=true;const now=box();let changed=0;for(let i=0;i<now.length;i+=3)if(now[i]!==before[i]||now[i+1]!==before[i+1]||now[i+2]!==before[i+2])changed++;covered=changed/(now.length/3);}
  if(full&&!active)break;
 }
 assert.ok(cloudFrames>200,'the cloud ran: '+cloudFrames+' frames');
 assert.equal(blanked,0,'no frame of the cloud is blanked');
 assert.ok(full,'the cloud reached full size');assert.ok(covered>0.8,'the full cloud tints the middle of the arena: '+covered.toFixed(2));
 assert.equal(d.diagnostics().fatal,null);d.dispose();h.dispose();
});

test('the burp occupies only empty sound slots in both banks, as two voices that each end',()=>{
 const bytes=Uint8Array.from(swampBurp.voices.flat());
 for(const block of[0x7430b,0x75b0d]){
  const at=block+swampBurp.address-0x2f00;
  assert.ok(b.base.subarray(at,at+bytes.length).every(v=>v===0),'the slots were empty');
  assert.deepEqual(b.rom.subarray(at,at+bytes.length),bytes);
  assert.equal(u16(b.rom,block+swampBurp.id*4),swampBurp.address);assert.equal(u16(b.rom,block+swampBurp.id*4+2),swampBurp.address+swampBurp.voices[0].length);
  assert.equal(u16(b.rom,block+swampBurp.silent*4),0);
 }
 for(const voice of swampBurp.voices)assert.equal(voice.at(-1),0xeb,'each voice ends');
});
