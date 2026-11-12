import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {u16,u24,fileOffset} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {spriteHeaders} from '../../../engine/native-sprites.js';
import {createCore} from '../../../scripts/core.mjs';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {newGame,runFrames} from '../../../engine/automation.js';
import {snapshot,restore} from '../../../engine/save.js';
const dir='assets/imagegen/sir-bram-ghost',rom=await readFile('.local/chrono-trigger-usa.sfc'),draft=JSON.parse(await readFile(dir+'/draft-audit.json','utf8')),headers=spriteHeaders(rom),events=JSON.parse(await readFile('.local/reference/events.json','utf8'));
const scene=events.find(e=>e.location===65),uses=events.flatMap(e=>e.commands.filter(c=>c[1]===0x83&&c[2][0]===143).map(c=>({location:e.location,offset:c[0],command:[c[1],...c[2]]})));
assert.deepEqual(uses.map(x=>x.location),[65]);
const loads=scene.commands.filter(c=>[0x82,0x83].includes(c[1])).map(([offset,op,args])=>{const kind=op===0x82?'npc':'enemy',h=headers.find(h=>h.kind===kind&&h.id===args[0]),gfx=rom[h.offset],p=fileOffset(u24(rom,0x242000+gfx*3)),d=decompress(rom,p);return{offset,kind,id:args[0],graphics:gfx,graphicsOffset:p,originalDecodedBytes:d.bytes.length,candidateDecodedBytes:gfx===181?draft.graphicsBytes:d.bytes.length};});
const unique=[...new Map(loads.map(x=>[x.graphics,x])).values()],originalSum=unique.reduce((s,x)=>s+x.originalDecodedBytes,0),candidateSum=unique.reduce((s,x)=>s+x.candidateDecodedBytes,0);
assert.ok(candidateSum<0x8000);
const signatures=[
  ['heap initialization',0xc058d7,[0xa2,0,0x80,0x86,0x71]],
  ['enemy decompressor call',0xc04825,[0x22,2,0,0xc3,0xc2,0x20,0xad,6,3,0x18,0x65,0x71,0x85,0x71,0xc9,0,0x80,0x10,8]],
  ['npc decompressor call',0xc046bc,[0x22,2,0,0xc3,0xc2,0x20,0xad,6,3,0x18,0x65,0x71,0x85,0x71,0xc9,0,0x80,0x10,8]],
  ['shared graphics lookup',0xc05c90,[0xa5,0xe3,0xa2,0,0,0xdd,0x20,9]],
  ['event decompressor then event sanity check',0xc056ff,[0x22,2,0,0xc3,0x20,0xc7,0x5c]],
  ['event size limit',0xc05cdd,[0xa2,0,0x17,0xec,6,3]],
];
for(const[name,address,expected]of signatures)assert.deepEqual([...rom.slice(fileOffset(address),fileOffset(address)+expected.length)],expected,name);
const audit={key:'sir-bram-ghost',status:'Inactive; native source loader and complete location graphics audited',baseRomSha256:createHash('sha256').update(rom).digest('hex'),scene:65,sceneUses:uses,loads,uniqueGraphics:unique.map(x=>({graphics:x.graphics,originalDecodedBytes:x.originalDecodedBytes,candidateDecodedBytes:x.candidateDecodedBytes})),originalAllConditionalActorsBytes:originalSum,candidateAllConditionalActorsBytes:candidateSum,heap:{bank:'7F',start:0x8000,endExclusive:0x10000,bytes:0x8000,strictNativeEndCheck:'The 16-bit end pointer must remain >= $8000; reaching $10000 exactly wraps to zero and fails.',candidateEnd:0x8000+candidateSum,headroom:0x8000-candidateSum},loader:{signatures:signatures.map(([name,address,expected])=>({name,address,expected})),perResourceOriginalDecodedCeiling:false,explanation:'Both enemy and NPC paths use the decompressor-returned byte count at $0306 and advance $0171. Neither compares with the source resource original size. The $1700 check is invoked immediately after event data decompression to $7F2000, before sprite loading.',sharing:'The native $0920 graphics-ID table reuses existing $1280 object pointers; four NPC41 objects charge graphics7 once.',party:'PC sprites use the native direct ROM graphics path; their streamed tiles do not occupy this $7F8000 heap.',vram:'Size2 and twelve 16x16 cells remain unchanged, so frame uploads retain the original 48-tile reservation.',projectGuard:'engine/actor-families.js still rejects any bank larger than its original decoded source. No guard was changed. Activation needs an explicit scene-budget contract plus native runtime validation, not a blanket bypass.'},extraWramBytes:0,extraVramBytes:0,nativeUploaded:false};
if(process.argv.includes('--runtime')){
  const snes=await createCore(rom);let state;
  try{state=JSON.parse(await readFile('art-review/art-pass/sir-bram-ghost/base-bedroom.json','utf8'));restore(snes,state);}catch{await newGame(snes);state=snapshot(snes);await writeFile('art-review/art-pass/sir-bram-ghost/base-bedroom.json',JSON.stringify(state));}
  const specs=JSON.parse(await readFile('content/hooks.json','utf8'));
  for(const[name,address]of[['ghost.heap.reset',0xc058de],['ghost.enemy.before',0xc047fe],['ghost.enemy.after',0xc04840],['ghost.npc.before',0xc0466b],['ghost.npc.after',0xc046d7],['ghost.share',0xc05c90],['ghost.fatal',0xc02e1e]])specs.push({name,address,expected:[...rom.slice(fileOffset(address),fileOffset(address)+4)]});
  const h=installHooks(snes,specs),dev=createDevTools(snes,h);let current;
  h.on('*',e=>{if(!current||e.location!==65)return;if(e.name.startsWith('ghost.'))current.trace.push({name:e.name,object:e.object,frame:e.frame,graphics:snes.ram[0x1e3],heapEnd:u16(snes.ram,0x171),decompressedBytes:u16(snes.ram,0x306)});if(e.name==='battle.initialized')current.battle={frame:e.frame,enemies:[...snes.ram.slice(0xaf02,0xaf0a)]};});
  const scenarios=[['hostile',8,0],['repair-workers',16,1],['all-conditional-actors',24,1],['peaceful-ghost-removed',72,0]];
  audit.runtimeBase=[];
  try{
    for(const[name,a3,a9f]of scenarios){
      restore(snes,state);current={name,seed:{event1a3:a3,event19f:a9f},trace:[]};
      snes.ram[0x101a3]=a3;snes.ram[0x1019f]=a9f;
      dev.jump({id:65,x:7,y:9,party:[0,1,2],endgame:true});runFrames(snes,300);
      current.location=u16(snes.ram,0x100);current.heapEnd=u16(snes.ram,0x171);current.heapBytes=current.heapEnd-0x8000;
      current.graphicsIds=[...snes.ram.slice(0x920,0x930)].filter(x=>x!==255);
      current.ownerPointers=Array.from({length:14},(_,object)=>({object,type:snes.ram[0x1100+object*2],id:snes.ram[0x1101+object*2],graphicsStart:u16(snes.ram,0x1280+object*2)}));
      if(name==='hostile'){
        runFrames(snes,40,16);
        for(let i=0;i<20&&!current.battle;i++){runFrames(snes,3,256);runFrames(snes,100);}
        assert.ok(current.battle,'Ordinary directional input and interaction must start the native ghost formation');
        assert.deepEqual(current.battle.enemies,[143,255,255,255,255,255,255,255]);
        current.battle.heapEnd=u16(snes.ram,0x171);current.battle.heapBytes=current.battle.heapEnd-0x8000;
        assert.equal(current.battle.heapBytes,10976);
      }
      current.fatal=current.trace.some(e=>e.name==='ghost.fatal');
      assert.equal(current.location,65);assert.equal(current.fatal,false);assert.ok(current.heapBytes<=originalSum);
      audit.runtimeBase.push(current);console.log(JSON.stringify({name,heap:current.heapBytes,ids:current.graphicsIds,battle:current.battle??null}));
    }
  }finally{current=null;dev.dispose();h.dispose();}
  audit.runtimeScope='Unmodified base ROM with seeded diagnostic story flags and a native change-location command. No candidate ROM file or engine/registry changes; candidate heap proof substitutes its verified decoded size in this complete scene bound.';
}
await writeFile(dir+'/heap-audit.json',JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({candidateBytes:candidateSum,headroom:audit.heap.headroom,perResourceOriginalDecodedCeiling:false,runtime:!!audit.runtimeBase}));
