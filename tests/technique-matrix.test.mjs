import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from './helpers.mjs';
import {decode} from '../engine/text.js';
import {techniqueTables as table} from '../engine/technique-revision.js';
import {assertRevisedBytes} from './technique-revision-fixtures.mjs';

const b=await build(),techs=JSON.parse(await readFile('content/techs.json','utf8'));
// Reworked presentations are every technique without a color theme.
const custom=new Set(techs.filter(t=>!/native-theme-/.test(t.status)).map(t=>t.id));
const parties=new Map();
for(const[ids,party]of[
 [[57,58,59],[0,1]],[[60,61,62],[0,2]],[[63,64,65],[0,3]],[[66,67,68],[0,4]],[[69,70,71],[0,5]],
 [[72,73,74],[1,2]],[[75,76,77],[1,3]],[[78,79,81],[1,4]],[[80,82,83],[1,5]],
 [[84,85,86],[2,3]],[[87,88,89],[2,5]],[[90,91,93],[3,4]],[[92,94,95],[3,5]],[[96,97,98],[4,5]],[[99,100,101],[2,4]],
 [[102],[0,1,2]],[[103],[0,1,3]],[[104],[0,1,4]],[[105],[0,1,5]],[[106],[0,2,3]],[[107],[0,2,4]],[[108],[0,2,5]],
 [[109],[0,3,4]],[[110],[0,3,5]],[[111],[0,4,5]],[[112],[1,2,6]],[[113],[0,2,6]],[[114],[0,3,5]],[[115],[0,1,5]],[[116],[0,4,6]]
])for(const id of ids)parties.set(id,party);
const changedControl=new Set([36,45,80,81,92,93,113,114,115,116]);
// 6: Love & Life revives fully (Life II's effect); 56: Some May Die costs 0 MP.
const changedMechanics=new Set([6,36,45,56]);
const buttons=new Map([[112,174],[113,175],[114,176],[115,177],[116,178]]);

test('the matrix has exactly 116 Shrek-themed techniques: Shrek presentations (reworked or color-themed)',()=>{
 assert.deepEqual(techs.map(t=>t.id),Array.from({length:116},(_,i)=>i+1));
 assert.equal(new Set(techs.map(t=>t.name)).size,116,'every technique has its own name');
 assert.ok(custom.size>=47,'at least the November 8 reworks');assert.equal(custom.size+techs.filter(t=>/native-theme-/.test(t.status)).length,116);
 assert.deepEqual(techs.filter(t=>custom.has(t.id)).map(t=>t.id),[...custom].sort((a,z)=>a-z));
 for(const t of techs){
  assert.ok(t.short&&t.concept&&t.status,`complete catalogue record ${t.id}`);
  assert.match(t.status,t.id===56?/joke-mechanics/:/source-mechanics/);assert.doesNotMatch(t.status,/animation-pending|stock-animation/i);
  if(!custom.has(t.id))assert.match(t.status,/native-theme-/,`color theme ${t.id}`);
  const p=0xc15c4+t.id*11,record=b.rom.subarray(p,p+11);
  assert.equal(decode(record.subarray(record[0]===0x2f?1:0)),t.short,`native label ${t.id}`);
 }
});

test('every ordinary pair, ordinary triple and Button-gated triple has the locked native participants',()=>{
 assert.equal(parties.size,60);
 for(let id=57;id<=116;id++){
  const pattern=b.rom[table.control(id)]&0x3f,actual=[...b.rom.subarray(0xc249f+pattern*3,0xc249f+pattern*3+3)].filter(v=>v!==255).sort((a,z)=>a-z);
  assert.deepEqual(actual,[...parties.get(id)].sort((a,z)=>a-z),`participants ${id}`);
 }
 for(const[id,item]of buttons)assert.ok(item>=174&&item<=178,`Button ${id}`);
 assert.deepEqual(b.audit.techniqueRevision.rockTriples.map(r=>[r.id,r.requirements]),[[113,[5,24,56]],[114,[4,28,47]],[115,[1,10,46]],[116,[6,40,56]]]);
 assert.deepEqual([...b.rom.subarray(0xc2953,0xc2953+3)],[14,22,56],'Dark Eternal prerequisites');
 assert.equal(b.rom[0xc2983],0x62,'Dark Eternal retains its stock party mask');
 assert.deepEqual([...b.rom.subarray(0xc297c,0xc2983)],[0xc4,0xb0,0xa8,0xa4,0x98,0x94,0x8c],'ordinary triple availability masks');
 for(const[id,item]of buttons){
  const index=id-112;if(id!==112)assert.equal(b.rom[0xc2983+index],b.audit.techniqueRevision.rockTriples.find(r=>r.id===id).mask,`rock party mask ${id}`);
  assert.ok(b.rom[0xc2983+index]>0,`native Button gate ${id} (${item})`);
 }
});

test('all color-themed techniques keep their native mechanics and animation records',()=>{
 // Their labels, effect palettes and help lines change (the help block is
 // repacked; see tests/tech-help.test.mjs); nothing else does.
 for(let id=1;id<=116;id++){
  if(custom.has(id))continue;
  if(id===45)continue; // Explicitly exchanged with Puss's old Heal slot; checked below.
  for(const[start,size]of[[table.animation(id),7],[table.SCENE+id*2,2],[table.ATTACK+id*2,2],...(id<=56?[[table.target(id),2],[table.property(id),12]]:[])])
   assert.deepEqual(b.rom.subarray(start,start+size),b.base.subarray(start,start+size),`stock native record ${id} at ${start.toString(16)}`);
  assert.equal(b.rom[table.MP+id],id===56?0:b.base[table.MP+id],`stock MP ${id}`);
  const p=table.control(id),offset=changedControl.has(id)?1:0;
  assert.deepEqual(b.rom.subarray(p+offset,p+11),b.base.subarray(p+offset,p+11),`stock control ${id}`);
 }
});

test('custom mechanics stay source-exact except for the three disclosed swaps and moved participants',()=>{
 for(let id=1;id<=116;id++){
  if(id<=56&&!changedMechanics.has(id)&&id!==39)assert.deepEqual(b.rom.subarray(table.target(id),table.target(id)+2),b.base.subarray(table.target(id),table.target(id)+2),`targets ${id}`);
  if(id<=56&&!changedMechanics.has(id))assert.deepEqual(b.rom.subarray(table.property(id),table.property(id)+12),b.base.subarray(table.property(id),table.property(id)+12),`properties ${id}`);
  if(!changedMechanics.has(id))assert.equal(b.rom[table.MP+id],b.base[table.MP+id],`MP ${id}`);
  const p=table.control(id),offset=changedControl.has(id)&&!changedMechanics.has(id)?1:0;
  if(!changedMechanics.has(id))assert.deepEqual(b.rom.subarray(p+offset,p+11),b.base.subarray(p+offset,p+11),`control tail ${id}`);
 }
 for(const[id,source]of[[36,45],[45,36]]){
  assert.deepEqual(b.rom.subarray(table.target(id),table.target(id)+2),b.base.subarray(table.target(source),table.target(source)+2),`swapped targets ${id}`);
  assert.deepEqual(b.rom.subarray(table.property(id),table.property(id)+12),b.base.subarray(table.property(source),table.property(source)+12),`swapped properties ${id}`);
  assert.equal(b.rom[table.MP+id],b.base[table.MP+source],`swapped MP ${id}`);
  const expected=b.base.slice(table.control(source),table.control(source)+11);if(id===36)expected[0]=50;else expected[0]=0x85;
  assert.deepEqual(b.rom.subarray(table.control(id),table.control(id)+11),expected,`swapped control ${id}`);
 }
 assert.equal(b.rom[table.MP+24],20,'Call My Wife retains Flare cost');
 assert.equal(b.rom[table.MP+39],b.base[table.MP+15],'Nine Lives retains Cure II cost');
});

test('ordinary progression and all unrelated prerequisite records remain byte-exact',()=>{
 // This region includes participant patterns, pair/triple component thresholds,
 // availability masks and the native post-battle learner inputs. The fixture
 // permits only the four moved doubles and four revised rock triples.
 assertRevisedBytes(b.rom,b.base,0xc249f,0xc29b3,'ordinary progression data');
 assertRevisedBytes(b.rom,b.base,0xd692c,0xd6938,'single technique color/progression-adjacent records');
 for(const[id,values]of[[80,[7,5,255]],[81,[2,4,255]],[92,[2,5,255]],[93,[4,4,255]]]){
  const r=b.audit.techniqueRevision.requirements[id];assert.deepEqual([...b.rom.subarray(r.offset,r.offset+3)],values,`revised prerequisites ${id}`);
 }
 for(const id of[113,114,115,116]){
  const r=b.audit.techniqueRevision.rockTriples.find(r=>r.id===id),p=0xc2953+(id-112)*3;
  assert.deepEqual([...b.rom.subarray(p,p+3)],r.requirements,`rock prerequisites ${id}`);
 }
});

test('the matrix rejects displaced ownership and out-of-scope experiments',()=>{
 for(let owner=0;owner<7;owner++)for(let n=0;n<8;n++){
  const id=owner*8+n+1,t=techs[id-1];assert.ok(t&&t.id===id);assert.ok(!parties.has(id),`single ${id} is not a combination`);
 }
 assert.equal(techs.find(t=>t.id===36).source,'Heal slot / Ayla Charm');
 assert.equal(techs.find(t=>t.id===45).source,'Charm slot / Frog Heal');
 assert.equal(techs.find(t=>t.id===80).source,'Double Cure');
 assert.equal(techs.find(t=>t.id===81).name,'Purrfect Heist');
 assert.equal(techs.find(t=>t.id===92).source,'Cure Wave');
 assert.equal(techs.find(t=>t.id===93).name,"Cat's Cradle");
 // November 8: the user reopened presentation (Shrek's roars, Puss's Milk);
 // mechanics stay native, as the tests above check.
 assert.deepEqual([3,5,6,35,38].map(id=>techs[id-1].name),['My Swamp!','Run Away!','Love & Life','Milk','Milk 2']);
});
