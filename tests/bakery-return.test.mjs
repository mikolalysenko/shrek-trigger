import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {u16} from '../engine/rom.js';
import {snapshot} from '../engine/save.js';
import {areas} from '../content/areas.js';
import {interruptFarquaadRitual} from './fortress-controller.mjs';
import {wakeAfterRitual,visitBurnedBakery,climbDrakeNest,recruitSkyDrakes,flyToFurnaceLair,rescueBakeryPrisoners,followGingy,openIronPassage,completeFurnaceLair} from './bakery-return-controller.mjs';
import {quantity} from './bakery-chapter-controller.mjs';

const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
test('one native route connects the ritual, burned village, drakes, prison, furnace gates, both bosses and the playable escape',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,specs),messages=[],battles=[],original=s.cart.data.slice();let before,seeded=false;
 h.on('event.dispatch',e=>{if(!before)before=s.ram.slice();if(e.opcode===0xd8&&battles.at(-1)?.[1]!==e.scriptPC)battles.push([e.location,e.scriptPC]);});
 h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));const d=createDevTools(s,h);
 // A strong diagnostic loadout is set once, before the ritual starts. All
 // subsequent recruitment, combat, collision, switches and story flags are
 // cartridge-owned. Ruby Rhubarb Armor prepares the later native furnace encounter.
 h.on('event.dispatch',()=>{if(seeded)return;seeded=true;for(let id=0;id<6;id++)s.ram[0x2600+id*80+0x28]=110;});
 d.jump(areas.find(a=>a.fortressScene==='fortress-ritual'));runFrames(s,400);
 const io={read:(a,n=1)=>n===2?u16(s.ram,a):s.ram[a],bytes:(a,n)=>s.ram.slice(a,a+n),hold:(k,n)=>runFrames(s,n,k),wait:n=>runFrames(s,n),tap:(k=256,n=100)=>{runFrames(s,3,k);runFrames(s,n);},shot:k=>screenshot(s,'.local/qa/'+k+'.png')};
 try{
  await interruptFarquaadRitual(io);await wakeAfterRitual(io);await visitBurnedBakery(io);const climb=await climbDrakeNest(io);
  await recruitSkyDrakes(io);await flyToFurnaceLair(io);const rescue=await rescueBakeryPrisoners(io);await followGingy(io);
  const onions=await quantity(io,197),passage=await openIronPassage(io),lair=await completeFurnaceLair(io,b.rom);
  const heals=[...passage.encounters,...lair.encounters].reduce((n,e)=>n+e.heals,0);
  assert.ok(heals>0,'the long route uses real healing items');assert.equal(await quantity(io,197),onions-heals);
  assert.equal(lair.finale.story,153);assert.equal(await io.read(0x100,2),499);assert.equal(await io.read(0x100ec)&128,128);
  assert.equal(climb.encounters.length,5);assert.equal(rescue.encounters.length,3);
  for(const[loc,ids]of[[292,[48,29,30,31,32,33,34,35,36,37,38,39,40]],[295,[0,2,4,7,8,11,13]],[302,[85,84,86,87,91,92,93,94,95,96,97,98,99]],[299,[100]]])for(const id of ids)assert.ok(messages.some(([l,n])=>l===loc&&n===id),`dialogue ${loc}:${id}`);
  for(const [loc,pc]of[[430,0x356],[430,0x335],[302,0x2d2],[303,0x5f7]])assert.ok(battles.some(([l,p])=>l===loc&&p===pc),`native battle ${loc}:${pc.toString(16)}`);
  assert.deepEqual(battles.at(-1),[301,0x689]);
  for(const [loc,ids]of[[304,[93,94]],[300,[67,68,64]],[301,[65,69,66,70,71,72,73,74,75,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92]],[261,[103,105,106,109]]])for(const id of ids)assert.ok(messages.some(([l,n])=>l===loc&&n===id),`dialogue ${loc}:${id}`);
  assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);
 }finally{await writeFile('.local/qa/bakery-return-latest.json',JSON.stringify(snapshot(s)));await screenshot(s,'.local/qa/bakery-return-latest.png');}
 d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();
});
