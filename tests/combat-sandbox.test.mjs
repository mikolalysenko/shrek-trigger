import test from 'node:test';
import {mrWorldwide} from '../content/mr-worldwide.js';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom,screenshot} from './helpers.mjs';
import {snapshot} from '../engine/save.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {combatFixtures} from '../content/combat-sandbox.js';
import {makeCombatEvent,combatResourceBudget} from '../engine/combat-sandbox.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {u16} from '../engine/rom.js';
import {npcGraphicsStreamTable} from '../engine/npc-graphics-streaming.js';
const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
const digest=s=>createHash('sha256').update(JSON.stringify(snapshot(s))).digest('hex');
const io=s=>({read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),tap:(k,n=12)=>{runFrames(s,3,k);runFrames(s,n);}});

test('arena budgets use the cartridge stream table and reject stale or mismatched resources',()=>{
 const table=npcGraphicsStreamTable(b.rom);assert.equal(table,b.audit.resources.npcGraphicsStreaming.table);
 assert.equal(npcGraphicsStreamTable(b.base),null);
 // Masquerader, Briar Knight and Sir Bram's ghost: three custom streamed banks.
 const mixed=combatResourceBudget(b.rom,[144,158,143],[0,1,2]);
 assert.equal(mixed.spriteBytes,0);assert.deepEqual(mixed.streamedBanks,[133,166,181]);
 // Restored stock banks use the native decompressed heap again.
 const stock=combatResourceBudget(b.rom,[155,137],[0,1,2]);assert.deepEqual(stock.streamedBanks,[]);assert.ok(stock.spriteBytes>0&&stock.spriteBytes<=32768);
 assert.ok(b.audit.resources.npcGraphicsStreaming.streams.filter(s=>mixed.streamedBanks.includes(s.gfx)).reduce((n,s)=>n+s.bytes,0)>32768);
 const damaged=b.rom.slice(),stream=b.audit.resources.npcGraphicsStreaming.streams.find(s=>s.gfx===133);
 damaged[stream.address]^=1;assert.throws(()=>combatResourceBudget(damaged,[144],[0]),/does not match/);
 const helper=b.rom.slice();helper[b.audit.resources.npcGraphicsStreaming.helpers[0].address]^=1;
 assert.throws(()=>combatResourceBudget(helper,[144],[0]),/helper changed/);
 for(const entry of[0x461e,0x476d]){
  const incomplete=b.rom.slice();incomplete[entry]=b.base[entry];
  assert.throws(()=>npcGraphicsStreamTable(incomplete),/Incomplete/);
 }
});

test('combat fixtures use bounded native events and the original enemy stats and AI',async()=>{
 for(const fixture of combatFixtures){
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),event=makeCombatEvent(fixture.enemies),stats=s.ram.slice(0x2600,0x2830);
  assert.ok(event.length<0x1700);assert.equal(event[0],fixture.enemies.length+8);
  for(let p=1;p<1+event[0]*32;p+=2)assert.ok(u16(event,p)>=event[0]*32&&u16(event,p)<event.length-1);
  d.startCombat({fixture:fixture.key});assert.equal(d.diagnostics().combat.actors.length,0);runFrames(s,400);
  const state=d.diagnostics().combat;assert.equal(state.stage,'battle');assert.equal(state.inBattle,true);assert.equal(d.diagnostics().fatal,null);assert.ok(h.counts['battle.initialized']);
  assert.deepEqual(state.actors.filter(a=>a.slot>=3).map(a=>a.id),fixture.enemies);
  if(fixture.song!==undefined)assert.equal(s.ram[0x29ae],fixture.song,'same music as the authored boss encounter');
  // Every fixture uses the cartridge's own record. Only Mr. Worldwide,
  // which occupies the unused Octobino slot, differs from its source.
  for(const enemy of state.actors.filter(a=>a.slot>=3)){
   assert.equal(enemy.maxHp,u16(b.rom,0xc4700+enemy.id*23));
   if(enemy.id!==mrWorldwide.enemy)assert.equal(enemy.maxHp,u16(b.base,0xc4700+enemy.id*23));
  }
  assert.deepEqual(s.ram.slice(0x2600,0x2830),stats,'current mode preserves source party stats');assert.equal(s.ram[0xb31f],0,'native RNG, without attract-mode override');
  assert.ok(state.budget.spriteBytes<=state.budget.spriteLimit);d.undo();assert.equal(u16(s.ram,0x100),2);d.dispose();h.dispose();
 }
 for(const invalid of[[],[0,1,2,3],[-1],[256],[1.5]])assert.throws(()=>makeCombatEvent(invalid));
 // Paired enemy techniques find their partner by native slot. The clowns keep
 // the two slots of their own encounter; other fixtures fill slots from 3.
 const find=(event,bytes)=>event.findIndex((_,p)=>bytes.every((v,i)=>event[p+i]===v));
 assert.deepEqual(combatFixtures.find(f=>f.key==='clowns').slots,[9,10]);
 const clowns=makeCombatEvent([151,152],{slots:[9,10]});
 assert.ok(find(clowns,[0x83,151,0x80|9])>0);assert.ok(find(clowns,[0x83,152,0x80|10])>0);
 const pack=makeCombatEvent([0,0,0]);for(const slot of[3,4,5])assert.ok(find(pack,[0x83,0,0x80|slot])>0);
 for(const slots of[[9],[9,9],[2,3],[9,11],[9,1.5]])assert.throws(()=>makeCombatEvent([151,152],{slots}),/slots/);
 assert.equal(combatResourceBudget(b.rom,[0,0,0],[0,1,2]).spriteBytes,combatResourceBudget(b.rom,[0],[0,128,128]).spriteBytes,'shared graphics only consume one bank');
});

test('native combat retries reproduce the machine and RNG, and Return restores the exact game checkpoint',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs);let before=null,armed=false;
 h.on('event.dispatch',()=>{if(armed&&!before)before=digest(s);});const d=createDevTools(s,h);
 armed=true;d.startCombat({unlockTechs:true});runFrames(s,400);assert.ok(before);
 const cast=async()=>{
  d.restartCombat();runFrames(s,400);for(let n=0;n<1200&&s.ram[0x95d5]!==0;n++)s.runFrame();
  assert.equal(s.ram[0x95d5],0);await chooseNativeTech(io(s),b.rom,0,1);runFrames(s,450);
  const log=d.diagnostics().combat.log;assert.ok(log.some(e=>e.name==='battle.tech'&&e.techId===1));assert.equal(log.filter(e=>e.name==='battle.result'&&e.techId===1).length,3);assert.equal(u16(s.ram,0x5e34),6,'native 2 MP expenditure');return{machine:digest(s),log};
 };
 const first=await cast(),second=await cast();assert.deepEqual(second,first);assert.equal(d.diagnostics().combat.attempt,3);
 d.startCombat({fixture:'milenko'});runFrames(s,400);assert.deepEqual(d.diagnostics().combat.actors.filter(a=>a.slot>=3).map(a=>a.id),[153],'switch encounters immediately during combat');
 assert.equal(d.diagnostics().combat.actors[0].maxHp,70,'current mode restores the original game loadout when switching');
 runFrames(s,4000);assert.ok(d.diagnostics().combat.log.length<=128);assert.ok(d.diagnostics().combat.log.some(e=>e.actor>=3),'ordinary enemy actions execute');
 assert.equal(d.diagnostics().combat.inBattle,false,'loss returns to the field');assert.equal(d.diagnostics().fatal,null);assert.ok(h.counts['event.prepare']>=3,'arena event restored after battle return');
 d.undo();assert.equal(digest(s),before);assert.equal(d.diagnostics().combat,null);assert.throws(()=>d.restartCombat(),/begin/);d.dispose();h.dispose();
});

test('a sandbox victory returns through the native field reload and remains retryable',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);d.startCombat({fixture:'sparring',loadout:'test'});runFrames(s,400);
 for(let n=0;n<120&&(s.ram[0x117]&1);n++){runFrames(s,3,256);runFrames(s,90);}
 runFrames(s,200);assert.equal(d.diagnostics().fatal,null);assert.equal(d.diagnostics().combat.inBattle,false);assert.ok(h.counts['event.prepare']>=2);
 d.restartCombat();runFrames(s,400);assert.equal(d.diagnostics().combat.inBattle,true);assert.equal(d.diagnostics().combat.actors.find(a=>a.slot===3).hp,u16(b.base,0xc4700+146*23));d.undo();assert.equal(u16(s.ram,0x100),2);d.dispose();h.dispose();
});

test('Fart casts from each native party slot with matching cloud colors, bounded audio and three rotations per sixteen steady animation ticks',async()=>{
 for(const party of[[0,1,2],[1,0,2],[1,2,0]]){
  const slot=party.indexOf(0),s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
  d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);d.startCombat({fixture:'swamp-pack',unlockTechs:true});runFrames(s,400);
  for(let n=0;n<1200&&s.ram[0x95d5]>2;n++)s.runFrame();const before=u16(s.ram,0x5e34+slot*128);await chooseNativeTech(io(s),b.rom,slot,1);
  const frames=[],audio=new Float32Array(534),right=new Float32Array(534);let cloud=false,sound=false,buzz=false,peak=0;
  for(let f=0;f<360;f++){
   s.runFrame();s.setSamples(audio,right,534);for(const a of[audio,right])for(const v of a){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));}
   frames.push(s.ram[0x9907+slot]);if(s.ram[0x1e01]===253)sound=true;
   if(s.apu.dsp.ram[0x74]===4&&s.apu.dsp.ram[0x78]>0)buzz=true;
   for(let o=0;o<128;o++){const attr=s.ppu.oam[o*2+1],tile=attr&255,y=s.ppu.oam[o*2]>>8;if(y<224&&[0xc6,0xc8,0xca,0xcc,0xe6,0xe8,0xea,0xec].includes(tile)){assert.equal(attr>>9&7,5+slot,'cloud uses the casting Shrek palette');cloud=true;}}
  }
  const cadence=[129,131,128,128,130,129,131,131,128,130,129,129,131,128,130,130];
  // Ignore the initial sprite/DMA arbitration while effects are starting.
  assert.ok(frames.some((_,i)=>i+32<=frames.length&&Array.from({length:32},(_,j)=>frames[i+j]===cadence[j%16]).every(Boolean)),'two full sixteen-frame periods with three turns each');
  assert.ok(cloud);assert.ok(sound);assert.ok(buzz,'the SPC plays the resident buzz sample on its effect voice');assert.ok(peak<0.98);assert.equal(u16(s.ram,0x5e34+slot*128),before-1,'the native test-kit Gold Stud still discounts the 2 MP cost');assert.equal(d.diagnostics().fatal,null);await screenshot(s,'.local/qa/fart-party-slot-'+slot+'.png');d.undo();d.dispose();h.dispose();
 }
});
