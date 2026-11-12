import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot,settlePreviewFrame} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16,u24} from '../engine/rom.js';
import {sprite,tile4bpp} from '../engine/sprites.js';
import {cast} from '../content/cast.js';

const built=await build(),specs=JSON.parse(await readFile('content/hooks.json'));

test('native idle frame IDs retain all four directions without interpreting alignment padding as artwork',()=>{
  const idleIds=[[3,0,1,2],[0,1,2,3],[0,1,2,3],[3,0,1,2],[0,1,2,3],[1,2,3,4],[3,0,1,2]];
  for(let id=0;id<7;id++)for(let facing=0;facing<4;facing++)assert.deepEqual(built.audit.characters[id].map[idleIds[id][facing]],{facing,pose:'idle',phase:0,provisional:false});
});

test('all seven party leaders turn, walk and settle into the matching native idle artwork through controller input',async()=>{
  const s=await bedroom(built.rom),address=0xc0cc3b,h=installHooks(s,[...specs,{name:'art.field',address,expected:[built.rom[address&0x3fffff]]}]),dev=createDevTools(s,h),objects=new Map();
  const gfx=Array.from({length:7},(_,id)=>u24(built.rom,0x242000+id*3));
  h.on('art.field',()=>{
    const x=s.cpu.br[1],source=u16(s.ram,0x1280+x)|s.ram[0x1200+x]<<16,id=gfx.indexOf(source);
    if(id>=0&&u16(s.ram,256)===6)objects.set(id,x);
  });
  for(let id=0;id<7;id++){
    const others=[0,1,2,3,4,5,6].filter(n=>n!==id).slice(0,2);objects.clear();
    dev.jump({id:6,x:8,y:11,party:[id,...others]});runFrames(s,400);assert.ok(objects.has(id),'loaded leader '+id);
    for(const [facing,button]of[[0,16],[1,32],[2,64],[3,128]]){
      runFrames(s,6,button);runFrames(s,48);const frame=s.ram[0xf01+objects.get(id)],pose=built.audit.characters[id].map[frame];
      assert.equal(pose.facing,facing,`leader ${id}, native frame ${frame}`);assert.equal(pose.pose,'idle');assert.equal(pose.provisional,false);
    }
    await screenshot(s,`.local/qa/party-idle-directions-${id}.png`);assert.equal(dev.diagnostics().fatal,null);dev.undo();
  }
  dev.dispose();h.dispose();
});

for(const {id,weapon='rapier'} of[0,1,2,3,4,5,6].map(id=>({id})).concat({id:4,weapon:'hatchet'}))test(`all ${[248,241,244,256,245,255,254][id]} ${cast[id].name} ${id===4?weapon+' ':''}frames upload exact indexed artwork through native PC, static-frame and mirrored-tile loaders`,async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),start=s.frames;
  const a=built.audit.characters[id];assert.equal(a.frameCount,[248,241,244,256,245,255,254][id]);assert.equal(a.provisionalFrames,0);
  const originalWeapon=s.ram[0x2769];
  dev.previewActor('party-'+cast[id].key,0,{weapon:weapon==='hatchet'?61:59});runFrames(s,300);
  const object=dev.diagnostics().preview.object,x=object*2;
  assert.equal(object,15);assert.equal(u16(s.ram,256),1);
  const script=dev.diagnostics().preview.script;
  for(let frame=0;frame<a.frameCount;frame++){
    settlePreviewFrame(s,dev,frame);
    assert.equal(s.ram[0xf01+x],frame,'native cached frame '+frame);
    assert.equal(dev.diagnostics().preview.script,script,'scrubbing stays in the bounded preview script');
    const m=a.map[frame],pixels=sprite(id,m.facing,m.pose,m.phase,{weapon}),tile=u16(s.ram,0xd00+x),vram=new Uint8Array(s.ppu.vram.buffer);
    assert.ok(pixels.every(v=>v<=12),'native twelve-color player palette');
    if(id===3&&[76,79,83,192,...Array.from({length:58},(_,i)=>198+i)].includes(frame))assert.ok(pixels.every(v=>v===0),'native blank puppet frame '+frame);
    if(id===5&&[60,176,177,178,179].includes(frame))assert.ok(pixels.every(v=>v===0),'native blank cookie frame '+frame);
    if(id===6&&frame===211)assert.ok(pixels.every(v=>v===0),'native blank royal frame');
    for(let row=0;row<2;row++){
      const expected=new Uint8Array(256);
      for(let cell=0;cell<4;cell++)for(let col=0;col<2;col++)expected.set(tile4bpp(pixels,32,(cell%2)*16+col*8,(cell>>1)*16+row*8),(cell*2+col)*32);
      assert.deepEqual(vram.slice(tile*32+row*512,tile*32+row*512+256),expected,`${cast[id].name} frame ${frame}, tile row ${row}`);
    }
    assert.equal(dev.diagnostics().fatal,null);
  }
  const shots=[[[47,'battle'],[89,'slash'],[115,'cast'],[70,'knockout'],[235,'sitting']],[[214,'battle'],[140,'shoot'],[162,'cast'],[79,'knockout'],[77,'sleep']],[[53,'battle'],[177,'shoot'],[210,'charge'],[64,'knockout'],[62,'raise']],[[185,'battle'],[110,'punch'],[142,'cast'],[77,'knockout'],[196,'offline']],[[51,'battle'],[116,'thrust'],[126,'cast'],[78,'knockout'],[223,'awakening']],[[42,'battle'],[98,'punch'],[146,'kick'],[195,'knockout'],[160,'drink']],[[166,'battle'],[112,'swing'],[172,'cast'],[77,'knockout'],[234,'big-cast']]][id];
  for(const [frame,label]of shots){
    settlePreviewFrame(s,dev,frame);await screenshot(s,`.local/qa/${cast[id].key}-${id===4?weapon+'-':''}${label}-native.png`);
  }
  if(id===4){
    settlePreviewFrame(s,dev,223);const before=Array.from(s.ppu.vram);
    dev.previewWeapon(weapon==='hatchet'?59:66);runFrames(s,8);
    assert.equal(s.ram[0xf1f],223,'weapon swap refreshes the same cached frame');assert.notDeepEqual(Array.from(s.ppu.vram),before);
  }
  dev.undo();assert.equal(u16(s.ram,256),2);assert.equal(s.ram[0x2769],originalWeapon,'bench restores actual equipment');assert.ok(s.frames-start<=1,'bench restores initial machine state');
  dev.dispose();h.dispose();
});
