import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom,screenshot} from '../tests/helpers.mjs';
import {u16,u24,fileOffset} from '../engine/rom.js';
import {snapshot,restore} from '../engine/save.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {makeCombatEvent} from '../engine/combat-sandbox.js';
import {medinaActors} from '../content/medina-actors.js';
import {enforcerActors} from '../content/enforcer-actors.js';
import {swampCreatures} from '../content/swamp-creatures.js';
import {ghostActors} from '../content/ghost-actors.js';
import {bakeryActors} from '../content/bakery-actors.js';
import {bridgeActors} from '../content/bridge-actors.js';
import {courtBeasts} from '../content/court-beasts.js';
import {futureMachines} from '../content/future-machines.js';
import {areas} from '../content/areas.js';
import {guyFieriActors} from '../content/guy-fieri.js';
import {nativeSpriteBank,nativeSpriteCells} from './native-sprite-view.mjs';

const b=await build(),rom=b.rom,sha256=createHash('sha256').update(rom).digest('hex');
const characterPass=process.argv.includes('--character-pass');
const out='.local/qa/'+(characterPass?'character-scenes-':'boss-scenes-')+sha256.slice(0,12);await mkdir(out,{recursive:true});
await writeFile(out+'/shrek-trigger.sfc',rom);
const actors=characterPass?[...bakeryActors.filter(a=>a.gfx!==34),...courtBeasts,...bridgeActors.filter(a=>a.gfx===108),...futureMachines.filter(a=>a.gfx===97)]:[...medinaActors,...enforcerActors,...swampCreatures,...ghostActors,...guyFieriActors];
const streams=b.audit.resources.npcGraphicsStreaming.streams;
const specs=JSON.parse(await readFile('content/hooks.json'));
for(const[name,address]of [['check.enemy.loaded',0xc04799],['check.npc.loaded',0xc0463b],['check.heap.fatal',0xc02e1e]])specs.push({name,address,expected:[...rom.slice(fileOffset(address),fileOffset(address)+4)]});
const s=await bedroom(rom),initial=snapshot(s),h=installHooks(s,specs),dev=createDevTools(s,h);
let formation=null,ready=false,current=null;
h.on('event.prepare',e=>{if(formation&&e.location===6)s.ram.set(makeCombatEvent(formation),0x12000);});
h.on('battle.initialized',()=>{ready=true;});
h.on('*',e=>{
  if(!current||e.location!==current.location||!e.name.startsWith('check.'))return;
  const object=e.object*2;
  current.loads.push({hook:e.name,object:e.object,gfx:s.ram[0x1e3],source:u16(s.ram,0x1280+object)|(s.ram[0x1200+object]<<16),heap:u16(s.ram,0x171)-0x8000});
});

function nativeOam(){
  return Array.from({length:128},(_,entry)=>{
    const i=entry*2,xy=s.ppu.oam[i],ta=s.ppu.oam[i+1],attr=ta>>8;
    let x=(xy&255)|((s.ppu.highOam[i>>4]>>(i&15)&1)<<8);if(x>255)x-=512;
    const y=xy>>8,size=s.ppu.spriteSizes[s.ppu.objSize+((s.ppu.highOam[i>>4]>>(i&15)&2)?8:0)]*8;
    const pixels=new Uint8Array(size*size),address=s.ppu.sprAdr1+(attr&1?s.ppu.sprAdr2:0);
    for(let py=0;py<size;py++)for(let px=0;px<size;px++){
      const xx=attr&64?size-1-px:px,yy=attr&128?size-1-py:py;
      const tile=((ta&255)+(yy>>3)*16+(xx>>3))&255,shift=7-(xx&7);
      const lo=s.ppu.vram[(address+tile*16+(yy&7))&32767],hi=s.ppu.vram[(address+tile*16+(yy&7)+8)&32767];
      pixels[py*size+px]=(lo>>shift&1)|(lo>>(shift+8)&1)<<1|(hi>>shift&1)<<2|(hi>>(shift+8)&1)<<3;
    }
    return {entry,x,y,size,pixels};
  });
}

const battles=[],scenes=[];
try{
  for(const actor of actors){
    restore(s,initial);formation=[actor.enemy];ready=false;
    dev.jump({id:6,x:8,y:11,party:[0,4,1],endgame:true});
    for(let f=0;f<1800&&!ready;f++)runFrames(s,1);
    assert.ok(ready,actor.key+' battle initialized');
    runFrames(s,60);
    assert.equal(s.ram[0x117]&1,1);assert.equal(s.ram[0xaf02],actor.enemy);assert.equal(dev.diagnostics().fatal,null);
    const stream=streams.find(g=>g.gfx===actor.gfx),source=u24(s.ram,0x1c60);
    if(stream)assert.equal(source,stream.address,actor.key+' battle raw source');
    else assert.ok(source>=0x7f8000&&source+nativeSpriteBank(rom,actor).graphics.length<=0x800000,actor.key+' native heap source');
    assert.equal(u24(s.ram,0x29c8),source,actor.key+' field-to-battle handoff');
    const bank=nativeSpriteBank(rom,actor),frame=s.ram[0x990a],ax=s.ram[0x1d0f],ay=s.ram[0x1d26];
    const oam=nativeOam(),entries=[];
    for(const c of nativeSpriteCells(bank,frame)){
      const match=oam.find(o=>o.x===ax+c.x&&o.y===ay+c.y&&o.size===16&&Buffer.from(o.pixels).equals(Buffer.from(c.pixels)));
      assert.ok(match,actor.key+' native cell '+c.cell+' frame '+frame+' exact OAM/VRAM');
      entries.push({cell:c.cell,entry:match.entry,x:match.x,y:match.y});
    }
    assert.ok(u16(s.ram,0x171)>=0x8000&&u16(s.ram,0x171)<=0xffff);
    await screenshot(s,out+'/battle-'+actor.key+'.png');
    const report={actor:actor.key,enemy:actor.enemy,frame,source,origin:[ax,ay],nativeCells:entries,heapBytes:u16(s.ram,0x171)-0x8000};
    battles.push(report);console.log('Battle '+actor.key+': '+entries.length+' exact OAM cells, native raw source');
  }
  formation=null;
  // These are the original location events with only their diagnostic entry
  // state selected. They exercise simultaneous original sprite loads.
  const characterAreas=['bakery-feast','bakery-morning','bakery-forest','bakery-kiln','bakery-iron-kiln','bakery-furnace','buried-furnace'].map(key=>{const area=areas.find(a=>a.bakeryScene===key);return{name:key,location:area.id,area,gfx:[]};});
  const cases=characterPass?[...characterAreas,{name:'late-court-room',location:438,story:255,gfx:[]}]:[
    {name:'horner-house',location:31,story:138,gfx:[155]},
    {name:'hideout-all-optional',location:33,story:203,a1:128,gfx:[155]},
    {name:'fortress-entry',location:170,story:118,gfx:[155]},
    {name:'fortress-traps',location:175,story:118,gfx:[155]},
    {name:'hideout-trio',location:180,story:203,a1:63,gfx:[155,166,182]},
    {name:'briar-moth-horner',location:92,story:203,gfx:[155,166,182]},
    {name:'castle-briar',location:169,story:118,x:8,y:44,flags:{[0x100a3]:2,[0x100ae]:0,[0x100df]:0,[0x10057]:0},gfx:[166]},
    {name:'fortress-briar',location:184,story:203,x:39,y:44,gfx:[155,166]}
  ];
  for(const c of cases){
    restore(s,initial);s.ram[0x10000]=c.story;s.ram[0x101a1]=c.a1??0;s.ram[0x101a4]=0;
    for(const[p,v]of Object.entries(c.flags??{}))s.ram[Number(p)]=v;
    current={...c,loads:[]};dev.jump(c.area??{id:c.location,x:c.x??8,y:c.y??10,party:[0,4,1],endgame:true});runFrames(s,300);
    assert.equal(u16(s.ram,0x100),c.location,c.name+' location');
    assert.equal(dev.diagnostics().fatal,null);assert.ok(!current.loads.some(l=>l.hook==='check.heap.fatal'));
    const cached=[...s.ram.slice(0x920,0x930)].filter(g=>g!==255);
    for(const gfx of c.gfx){
      const stream=streams.find(g=>g.gfx===gfx);assert.ok(stream);
      assert.ok(current.loads.some(l=>l.gfx===gfx&&l.source===stream.address),c.name+' native stream '+gfx);
      assert.ok(!cached.includes(gfx),c.name+' streamed graphics stay out of decompression heap');
    }
    current.heapBytes=u16(s.ram,0x171)-0x8000;assert.ok(current.heapBytes>=0&&current.heapBytes<=0x8000);
    current.cachedGraphics=cached;
    await screenshot(s,out+'/scene-'+c.name+'.png');scenes.push(current);
    console.log('Scene '+c.name+': '+current.heapBytes+' / 32768 heap bytes');current=null;
  }
}finally{current=null;dev.dispose();h.dispose();}
await writeFile(out+'/report.json',JSON.stringify({sha256,scope:'Native battle handoff and exact OAM/VRAM for each selected enemy; original location initialization and shared heap checks. Diagnostic entry is not a full campaign walkthrough.',battles,scenes},null,2)+'\n');
console.log('Report: '+out+'/report.json');
