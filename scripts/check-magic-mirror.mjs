// Read-only candidate-ROM verification. No art overlay or ROM writer is used.
// node scripts/check-magic-mirror.mjs --rom <candidate.sfc> --out <evidence-dir>
// Resume selected work with --phases scene,pixels,victory,shared,cores,core-pixels.
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {compileMagicMirror} from '../engine/magic-mirror.js';
import {magicMirror} from '../content/magic-mirror.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {u16,u24,fileOffset,validateRom} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {snapshot,restore} from '../engine/save.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {newGame,newGameSequence,runFrames} from '../engine/automation.js';
import {createCore} from './core.mjs';
import {withIndependentController} from './independent-controller.mjs';
import {attackNativeEnemy} from '../tests/battle-controller.mjs';

const args=process.argv.slice(2),option=name=>args[args.indexOf(name)+1],sha=b=>createHash('sha256').update(b).digest('hex');
if(!args.includes('--rom'))throw Error('Usage: node scripts/check-magic-mirror.mjs --rom <candidate.sfc> [--out <directory>] [--phases scene,pixels,victory,shared,cores,core-pixels]');
const romFile=path.resolve(option('--rom')),rom=new Uint8Array(await readFile(romFile)),romSha256=sha(rom);
const dir=path.resolve(args.includes('--out')?option('--out'):'.local/qa/magic-mirror-'+romSha256.slice(0,12));
const phaseNames=['scene','pixels','victory','shared','cores','core-pixels'],phases=args.includes('--phases')?option('--phases').split(','):phaseNames;
assert.ok(phases.every(p=>phaseNames.includes(p)),'Unknown proof phase');
const json=async p=>JSON.parse(await readFile(path.join(dir,p))),save=async(p,value)=>writeFile(path.join(dir,p),JSON.stringify(value,null,2)+'\n');
await mkdir(dir,{recursive:true});
let prior;try{prior=await json('manifest.json');}catch(e){if(e.code!=='ENOENT')throw e;}
if(prior)assert.equal(prior.romSha256,romSha256,'Use a distinct evidence directory for a different ROM');
const base=await validateRom(await readFile('.local/chrono-trigger-usa.sfc')),compiled=compileMagicMirror(base),hooks=JSON.parse(await readFile('content/hooks.json'));
const sourceRecords=[];
for(const [key,family]of [['model',magicMirror.model],['display',magicMirror.display]]){
  const bank=compiled[key],offset=fileOffset(u24(rom,0x242000+family.gfx*3)),packet=decompress(rom,offset);
  assert.deepEqual(packet.bytes,bank.graphics,'Candidate '+key+' graphics');
  const palette=0x240000+u16(rom,0x242a00+family.palette*2);assert.deepEqual(rom.slice(palette,palette+24),compiled.palette);
  sourceRecords.push({kind:'graphics',gfx:family.gfx,offset,decodedBytes:packet.bytes.length,compressedBytes:packet.length,sha256:sha(packet.bytes)});
  for(const [i,a]of (key==='model'?family.actors:[family]).entries()){
    const assembly=key==='model'?bank.assemblies[i]:bank.assembly,offset=fileOffset(u24(rom,0x242300+a.asm*3));
    assert.deepEqual(rom.slice(offset,offset+assembly.length),assembly,'Candidate native assembly '+a.asm);
    sourceRecords.push({kind:'assembly',id:a.asm,offset,bytes:assembly.length,sha256:sha(assembly)});
  }
}
const preserved={headers:[],ai:[],animations:[]};
for(const id of [183,190,191]){
  const p=0x24f600+id*10;assert.deepEqual(rom.slice(p,p+10),base.slice(p,p+10));preserved.headers.push({kind:'enemy',id,bytes:[...rom.slice(p,p+10)]});
  const old=readEnemyAI(base,id),current=readEnemyAI(rom,id);assert.equal(current.bytes,old.bytes);assert.deepEqual(rom.slice(current.start,current.start+current.bytes),base.slice(old.start,old.start+old.bytes));
  preserved.ai.push({id,offset:current.start,bytes:current.bytes,sha256:sha(rom.slice(current.start,current.start+current.bytes))});
  for(const [table,stride]of [[0xc4700,23],[0xc5e00,7]])assert.deepEqual(rom.slice(table+id*stride,table+(id+1)*stride),base.slice(table+id*stride,table+(id+1)*stride));
}
const npc=0x24f000+134*5;assert.deepEqual(rom.slice(npc,npc+5),base.slice(npc,npc+5));preserved.headers.push({kind:'npc',id:127,bytes:[...rom.slice(npc,npc+5)]});
for(const id of [115,143,173]){
  const p=0x240000+u16(base,0x242600+id*2),end=0x240000+u16(base,0x242602+id*2),q=0x240000+u16(rom,0x242600+id*2);
  assert.deepEqual(rom.slice(q,q+end-p),base.slice(p,end));preserved.animations.push({id,offset:q,bytes:end-p,sha256:sha(rom.slice(q,q+end-p))});
}
const manifest={...prior,romFile,romSha256,runner:'scripts/check-magic-mirror.mjs',runnerSha256:sha(await readFile(new URL(import.meta.url))),
  method:'Supplied ROM only; ordinary native scene events, compressed sprite loading and controller attacks',sourceRecords,preserved,
  diagnosticStart:{location:268,story:203,position:[9,13],party:[3,0,2],kit:'Existing endgame dev kit, applied before scene entry only'},
  completedPhases:prior?.completedPhases??[],extraWramBytes:0,extraVramBytes:0,romWritten:false};
await save('manifest.json',manifest);
const formation=[190,255,255,183,183,183,255,255],targets=[[183,6],[183,7],[183,8],[190,3]];
const signed=v=>v>127?v-256:v;
async function shot(s,name){const png=new PNG({width:512,height:480});s.setPixels(png.data);await writeFile(path.join(dir,name+'.png'),PNG.sync.write(png));}
async function fromState(name){const s=await createCore(rom);restore(s,await json(name+'.json'));return s;}
function jsController(s){return {read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(k,n)=>runFrames(s,n,k),wait:n=>runFrames(s,n),tap:(k=256,gap=90)=>{runFrames(s,3,k);runFrames(s,gap);},shot:key=>shot(s,key)};}

async function scene(){
  let s=await createCore(rom);
  try{restore(s,await json('bedroom.json'));}catch{s=await createCore(rom);await newGame(s);await save('bedroom.json',snapshot(s));}
  const h=installHooks(s,hooks),d=createDevTools(s,h),events=[],dialogs=[];let ready=false;
  h.on('battle.initialized',()=>{ready=true;});h.on('dialogue.render',e=>dialogs.push({frame:s.frames,id:e.stringId}));
  h.on('event.dispatch',e=>{if(e.location===268&&[0xd8,0xda,0x8e,0x88,0xe4,0xe5,0xf1,0xfe,0x65,0x66].includes(e.opcode))events.push({frame:s.frames,object:e.object,pc:e.scriptPC,op:e.opcode,args:[...s.ram.slice(0x12002+e.scriptPC,0x12008+e.scriptPC)]});});
  try{
    s.ram[0x10000]=203;d.jump({id:268,x:9,y:13,party:[3,0,2],endgame:true});runFrames(s,300);assert.equal(u16(s.ram,0x100),268);await shot(s,'arrival');await save('arrival.json',snapshot(s));
    for(let f=0;f<6000&&!ready;f++){runFrames(s,1,f%90<3?256:0);if([300,900,1800].includes(f))await shot(s,'reveal-'+f);}
    assert.ok(ready,'Original boss reveal reached battle');runFrames(s,180);assert.deepEqual([...s.ram.slice(0xaf02,0xaf0a)],formation);assert.equal(d.diagnostics().fatal,null);
    for(const object of [34,35])assert.ok(events.some(e=>e.object===object&&e.op===0x8e&&e.args[0]===0x22),'Original compound reveal priority');
    assert.ok(events.some(e=>e.op===0xd8),'Original native battle command');assert.ok(u16(s.ram,0x171)-0x8000<=0x8000,'Native scene sprite heap');
    await shot(s,'battle-ready');await save('battle-ready.json',snapshot(s));
    const report={ready,location:u16(s.ram,0x100),formation:[...s.ram.slice(0xaf02,0xaf0a)],heap:u16(s.ram,0x171),dialogs,events,fatal:d.diagnostics().fatal};
    await save('scene-probe.json',report);console.log(JSON.stringify({phase:'scene',ready,formation:report.formation,events:events.length}));
  }finally{d.dispose();h.dispose();}
}

async function victory(){
  const s=await fromState('battle-ready'),h=installHooks(s,hooks),d=createDevTools(s,h),io=jsController(s),results=[],events=[],messages=[],attacks=[];
  h.on('battle.result',e=>results.push(e));h.on('dialogue.render',e=>messages.push(e));
  h.on('event.dispatch',e=>{if(e.location===268&&[0x65,0x66,0xd8,0xda,0xe0,0xe1].includes(e.opcode))events.push({...e,args:[...s.ram.slice(0x12002+e.scriptPC,0x12007+e.scriptPC)]});});
  const initial={formation:[...s.ram.slice(0xaf02,0xaf0a)],slots:Array.from({length:8},(_,i)=>({slot:i+3,id:s.ram[0xaf02+i],hp:u16(s.ram,0x5e30+(i+3)*128),source:u24(s.ram,0x1c60+i*3),frame:s.ram[0x990a+i],x:s.ram[0x1d0f+i],y:s.ram[0x1d26+i]})),flags:[...s.ram.slice(0x1013b,0x1013f)]};assert.deepEqual(initial.formation,formation);
  try{
    for(const [enemy,targetSlot]of targets){
      for(let n=0;n<80&&(s.ram[0x117]&1)&&u16(s.ram,0x5e30+targetSlot*128);n++){
        const before=u16(s.ram,0x5e30+targetSlot*128);await attackNativeEnemy(io,enemy,{targetSlot});runFrames(s,300);attacks.push({enemy,targetSlot,before,after:u16(s.ram,0x5e30+targetSlot*128)});
      }
      assert.equal(u16(s.ram,0x5e30+targetSlot*128),0);await shot(s,'defeated-slot-'+targetSlot);
    }
    for(let n=0;n<180&&((s.ram[0x117]&1)||u16(s.ram,0x100)===268);n++)io.tap(256,90);
    await shot(s,'victory-final');assert.equal(s.ram[0x117]&1,0);assert.equal(s.ram[0x1013b]&16,16);assert.equal(u16(s.ram,0x100),498);assert.equal(d.diagnostics().fatal,null);
    await save('victory.json',snapshot(s));const final={location:u16(s.ram,0x100),flags:[...s.ram.slice(0x1013b,0x1013f)],inBattle:false,fatal:d.diagnostics().fatal};
    await save('victory-report.json',{status:'Original scene268 completed with controller attacks only',initial,attacks,results,events,messages,final});console.log(JSON.stringify({phase:'victory',attacks:attacks.length,final}));
  }finally{d.dispose();h.dispose();}
}

async function pixels(){
  const s=await fromState('battle-ready'),oam=[];
  for(let entry=0;entry<128;entry++){
    const i=entry*2,xy=s.ppu.oam[i],ta=s.ppu.oam[i+1],ex=ta>>8;let x=(xy&255)|((s.ppu.highOam[i>>4]>>(i&15)&1)<<8);if(x>255)x-=512;
    const y=xy>>8,size=s.ppu.spriteSizes[s.ppu.objSize+((s.ppu.highOam[i>>4]>>(i&15)&2)?8:0)]*8,tile=ta&255,pixels=new Uint8Array(size*size),addr=s.ppu.sprAdr1+(ex&1?s.ppu.sprAdr2:0);
    for(let py=0;py<size;py++)for(let px=0;px<size;px++){
      const xx=ex&64?size-1-px:px,yy=ex&128?size-1-py:py,t=(tile+(yy>>3)*16+(xx>>3))&255,word=s.ppu.vram[(addr+t*16+(yy&7))&32767],word2=s.ppu.vram[(addr+t*16+(yy&7)+8)&32767],shift=7-(xx&7);
      pixels[py*size+px]=((word>>shift)&1)|((word>>(shift+8)&1)<<1)|((word2>>shift&1)<<2)|((word2>>(shift+8)&1)<<3);
    }
    oam.push({entry,x,y,size,palette:(ex&14)>>1,priority:(ex&48)>>4,pixels});
  }
  const m=compiled.model,d=compiled.display,actors=[{key:'mirror-main',slot:3,palette:232,cells:12,graphics:m.graphics,assembly:m.assemblies[0]},
    {key:'mirror-trim',slot:9,palette:232,cells:8,graphics:m.graphics,assembly:m.assemblies[1]},...[6,7,8].map(slot=>({key:'display-'+slot,slot,palette:144,cells:4,graphics:d.graphics,assembly:d.assembly}))];
  const rgba=new Uint8Array(512*480*4);s.setPixels(rgba);const reports=[],samples=[];
  for(const a of actors){
    const n=a.slot-3,frame=s.ram[0x990a+n],ax=s.ram[0x1d0f+n],ay=s.ram[0x1d26+n],source=u24(s.ram,0x1c60+n*3),perGroup=a.cells===12?4:a.cells,colors=new Map(),entries=[];
    assert.deepEqual([ax,ay],({3:[128,95],9:[128,95],6:[40,79],7:[120,63],8:[200,79]})[a.slot],a.key+' original battle anchor');
    assert.equal(source>>16,127,'Mirror remains on native compressed loading');assert.deepEqual(s.ram.slice(source&0x1ffff,(source&0x1ffff)+a.graphics.length),a.graphics);let visible=0,occluded=0,opaque=0,paletteCycle;
    for(let c=0;c<a.cells;c++){
      const x=ax+signed(a.assembly[frame*a.cells*10+a.cells*8+c*2]),y=ay+signed(a.assembly[frame*a.cells*10+a.cells*8+c*2+1]),pixels=new Uint8Array(256);
      for(let py=0;py<16;py++)for(let px=0;px<16;px++){
        const t=u16(a.assembly,frame*a.cells*10+(Math.floor(c/perGroup)*perGroup*4+(py>>3)*perGroup*2+(c%perGroup)*2+(px>>3))*2),xx=t&16384?7-(px&7):px&7;
        for(let k=0;k<4;k++)pixels[py*16+px]|=(a.graphics[(t&1023)*32+(k>>1)*16+(py&7)*2+(k&1)]>>(7-xx)&1)<<k;
      }
      const found=oam.filter(o=>o.x===x&&o.y===y&&o.size===16&&Buffer.from(o.pixels).equals(Buffer.from(pixels)));assert.ok(found.length,a.key+' native cell '+c);
      const entry=found[0];assert.equal(entry.priority,2,a.key+' original OAM priority');entries.push({cell:c,oamEntry:entry.entry,x,y,palette:entry.palette,priority:entry.priority});
      const pp=0x240000+u16(rom,0x242a00+a.palette*2),expectedColors=Array.from({length:12},(_,i)=>u16(rom,pp+i*2)),actualColors=Array.from({length:12},(_,i)=>s.ppu.cgram[128+entry.palette*16+i+1]);
      // Mother Brain's unchanged native effect cycles its first six colors.
      // The gold ramp remains fixed; Display palettes do not use this effect.
      const phases=a.palette===232?[0,1,2,3,4,5]:[0],phase=phases.find(shift=>actualColors.every((value,i)=>value===expectedColors[i<6?(i+shift)%6:i]));
      assert.notEqual(phase,undefined,a.key+' native CGRAM palette');
      paletteCycle={colors:a.palette===232?6:0,phase,cgram:actualColors};
      for(let py=0;py<16;py++)for(let px=0;px<16;px++){
        const index=pixels[py*16+px];if(!index)continue;opaque++;const sx=x+px,sy=y+py;
        const front=oam.find(o=>sx>=o.x&&sx<o.x+o.size&&sy>=o.y&&sy<o.y+o.size&&o.pixels[(sy-o.y)*o.size+sx-o.x]);
        if(front.entry!==entry.entry){occluded++;continue;}
        const p=((sy+8)*2*512+sx*2)*4,rgb=rgba[p]*65536+rgba[p+1]*256+rgba[p+2];if(colors.has(index))assert.equal(rgb,colors.get(index),a.key+' source pixel');else colors.set(index,rgb);
        visible++;samples.push({key:a.key,palette:a.palette,x:sx,y:sy,index});
      }
    }
    const nativeColors=checkColors(a.palette,colors);assert.ok(visible>100);
    reports.push({key:a.key,slot:a.slot,frame,source,decodedBytes:a.graphics.length,actorOrigin:[ax,ay],exactNativeCells:entries,opaquePixels:opaque,visiblePixelsVerified:visible,occludedByEarlierOam:occluded,nativeColors,paletteCycle});
  }
  assert.equal(reports.reduce((n,r)=>n+r.exactNativeCells.length,0),32);
  await save('native-visible-pixel-samples.json',samples);await save('battle-pixel-report.json',{status:'Both compound layers and three Displays match decoded banks, native OAM positions and uploaded pixels',scope:'Visible samples exclude genuine earlier OAM sprites; underlying cells remain byte-exact',reports});
  console.log(JSON.stringify({phase:'pixels',cells:32,visiblePixels:samples.length,occluded:reports.reduce((n,r)=>n+r.occludedByEarlierOam,0)}));
}
function checkColors(palette,colors){
  const p=0x240000+u16(rom,0x242a00+palette*2),nativeColors=new Map(),screenColors=new Map();
  for(const [i,c]of colors){const native=u16(rom,p+(i-1)*2);if(nativeColors.has(native))assert.equal(c,nativeColors.get(native));if(screenColors.has(c))assert.equal(native,screenColors.get(c));nativeColors.set(native,c);screenColors.set(c,native);}
  return nativeColors.size;
}

async function shared(){
  const c=compiled.display,state=await json('bedroom.json'),s=await createCore(rom),h=installHooks(s,hooks),d=createDevTools(s,h),reports=[];let loaded=[];
  h.on('event.init',e=>{if(e.opcode===0x82&&s.ram[0x12002+e.scriptPC]===127)loaded.push({object:e.object,pc:e.scriptPC});});
  function tiles(frame){const out=[];for(let i=0;i<16;i++){const w=u16(c.assembly,frame*40+i*2);for(let v of c.graphics.slice((w&1023)*32,(w&1023)*32+32)){if(w&16384){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=v>>4|(v&15)<<4;}out.push(v);}}return Uint8Array.from(out);}
  try{
    for(const [location,x,y]of [[218,54,37],[228,9,21],[229,28,7],[230,22,47],[234,39,41],[235,44,21],[241,39,38],[248,6,55],[256,27,27],[259,55,41],[439,27,8],[476,7,6]]){
      restore(s,state);loaded=[];s.ram[0x10000]=203;d.jump({id:location,x,y,party:[3,0,2],endgame:true});runFrames(s,400);
      assert.equal(u16(s.ram,0x100),location);assert.equal(d.diagnostics().fatal,null);assert.ok(loaded.length,'Original NPC127 load '+location);const objects=[];
      for(const {object,pc}of loaded){
        const index=object*2,bank=s.ram[0x1200+index],address=u16(s.ram,0x1280+index),frame=s.ram[0xf01+index],tile=u16(s.ram,0xd00+index);
        assert.equal(bank,127);assert.deepEqual(s.ram.slice(0x10000+address,0x10000+address+c.graphics.length),c.graphics);assert.equal(u16(s.ram,0x1400+index),u16(rom,0x242a00+144*2));
        let exactUpload=false;if(frame<8){const v=new Uint8Array(s.ppu.vram.buffer);exactUpload=Buffer.from([...v.slice(tile*32,tile*32+256),...v.slice(tile*32+512,tile*32+768)]).equals(Buffer.from(tiles(frame)));assert.ok(exactUpload,'NPC127 queued upload in '+location);}
        objects.push({object,pc,source:bank*65536+address,frame,tile,exactUpload,nativeDrawState:s.ram[0x1a81+index],visibilityNote:frame>=8?'Native scene has not queued a frame at this checkpoint':'Native current frame sampled'});
      }
      assert.ok(u16(s.ram,0x171)-32768<=32768,'NPC127 scene sprite heap');await shot(s,'npc127-scene-'+location);reports.push({location,start:[x,y],heapBytes:u16(s.ram,0x171)-32768,objects});
    }
  }finally{d.dispose();h.dispose();}
  await save('shared-npc-report.json',{status:'All 12 original NPC127 loads retain candidate graphics and palette',scope:'Native scene initialization near each console at diagnostic story203; no monitor scripts or visibility flags altered; not a full interaction walkthrough',reports});console.log(JSON.stringify({phase:'shared',locations:reports.length,queuedUploads:reports.flatMap(r=>r.objects).filter(o=>o.exactUpload).length}));
}

async function cores(){
  const seedCore=await fromState('arrival'),seeds=[[0x10000,[203]],[0x2400,[...seedCore.ram.slice(0x2400,0x2600)]],[0x2600,[...seedCore.ram.slice(0x2600,0x2830)]],[0x2830,[...seedCore.ram.slice(0x2830,0x285c)]],[0x2980,[...seedCore.ram.slice(0x2980,0x2989)]],[0x29af,[254]]];
  await save('diagnostic-start-seeds.json',{purpose:'Existing endgame kit and party before native scene jump; no combat or reveal state writes',seeds});const reports=[];
  const coreDir=path.resolve(args.includes('--core-dir')?option('--core-dir'):'../secret-of-goku/.local/tools/emu');
  for(const core of ['snes9x','bsnes']){
    const out=path.join(dir,core);await mkdir(out,{recursive:true});console.log('Original Mirror scene and controller victory in '+core);
    const report=await withIndependentController({host:path.join(coreDir,'retro-host'),core:path.join(coreDir,core+'_libretro.dylib'),rom:romFile,out},async({request,write,controller:io})=>{
      for(const [frames,input]of newGameSequence)input?await io.hold(input,frames):await io.wait(frames);
      assert.equal(await io.read(0x100,2),2);for(const [p,b]of seeds)await write(p,b);await write(0x1238e,[0xe0,12,3,9,13,0xb2]);await io.wait(300);assert.equal(await io.read(0x100,2),268);await io.shot('arrival');
      const reveal=[];for(let n=0;n<100&&!(await io.read(0x117)&1);n++){await io.tap(256,87);if([3,9,17].includes(n))await io.shot('reveal-'+n);reveal.push({n,battle:await io.read(0x117),priorityMain:await io.read(0xc44),priorityTrim:await io.read(0xc46)});}
      assert.equal(await io.read(0x117)&1,1);await io.wait(180);await io.shot('battle-ready');assert.deepEqual(Array.from(await io.bytes(0xaf02,8)),formation);await request({op:'savestate',name:'battle-ready'});
      const displayHp=[];for(const slot of [6,7,8])displayHp.push({slot,hp:await io.read(0x5e30+slot*128,2)});
      const initial={formation:Array.from(await io.bytes(0xaf02,8)),pointers:Array.from(await io.bytes(0x1c60,24)),assemblyPointers:Array.from(await io.bytes(0x1c81,24)),frames:Array.from(await io.bytes(0x990a,8)),x:Array.from(await io.bytes(0x1d0f,8)),y:Array.from(await io.bytes(0x1d26,8)),displayHp,bossHp:await io.read(0x5e30+3*128,2)},attacks=[];
      for(const [enemy,targetSlot]of targets){
        for(let n=0;n<80&&(await io.read(0x117)&1)&&await io.read(0x5e30+targetSlot*128,2);n++){
          const before=await io.read(0x5e30+targetSlot*128,2);await attackNativeEnemy(io,enemy,{targetSlot});await io.wait(300);attacks.push({enemy,targetSlot,before,after:await io.read(0x5e30+targetSlot*128,2)});
        }
        assert.equal(await io.read(0x5e30+targetSlot*128,2),0);await io.shot('defeated-slot-'+targetSlot);
      }
      for(let n=0;n<180&&((await io.read(0x117)&1)||(await io.read(0x100,2))===268);n++)await io.tap(256,90);
      await io.shot('victory');assert.equal(await io.read(0x117)&1,0);assert.equal(await io.read(0x1013b)&16,16);assert.equal(await io.read(0x100,2),498);
      return {core,romSha256,scope:'Original scene268 event and AI; controller attacks after pre-scene diagnostic kit',reveal,initial,attacks,final:{location:await io.read(0x100,2),victoryFlag:await io.read(0x1013b),inBattle:await io.read(0x117)&1}};
    });
    reports.push(report);await save(core+'/report.json',report);console.log(JSON.stringify({phase:'cores',core,attacks:report.attacks.length,final:report.final}));
  }
  await save('independent-scene-report.json',reports);
}

async function corePixels(){
  const samples=await json('native-visible-pixel-samples.json'),reports=[];
  for(const core of ['snes9x','bsnes']){
    const png=PNG.sync.read(await readFile(path.join(dir,core,'battle-ready.png'))),groups=new Map();assert.equal(png.width,256);assert.equal(png.height,224);
    for(const q of samples){
      if(!groups.has(q.key))groups.set(q.key,{palette:q.palette,colors:new Map(),pixels:0});const group=groups.get(q.key),p=(q.y*png.width+q.x)*4,color=png.data[p]*65536+png.data[p+1]*256+png.data[p+2];
      if(group.colors.has(q.index))assert.equal(color,group.colors.get(q.index),core+' '+q.key+' native pixel '+q.x+','+q.y);else group.colors.set(q.index,color);group.pixels++;
    }
    const actors=[];for(const [key,g]of groups)actors.push({key,pixels:g.pixels,nativeColors:checkColors(g.palette,g.colors)});
    reports.push({core,totalPixels:samples.length,actors,scope:'Every source pixel unobscured by original party OAM; native coordinates without JS presentation margin'});
  }
  await save('independent-pixel-report.json',reports);console.log(JSON.stringify({phase:'core-pixels',reports}));
}

for(const phase of phases){
  await ({scene,pixels,victory,shared,cores,'core-pixels':corePixels}[phase])();
  if(!manifest.completedPhases.includes(phase))manifest.completedPhases.push(phase);
  await save('manifest.json',manifest);
}
assert.equal(sha(await readFile(romFile)),romSha256,'Candidate ROM remained unchanged');
console.log(JSON.stringify({romSha256,evidence:dir,completedPhases:manifest.completedPhases,romWritten:false}));
