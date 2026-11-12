import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from './helpers.mjs';
import {decode} from '../engine/text.js';
import {techniqueTables as table} from '../engine/technique-revision.js';
import {createCore} from '../scripts/core.mjs';

const b=await build(),techs=JSON.parse(await readFile('content/techs.json','utf8'));
// Reworked presentations are every technique without a color theme.
const custom=new Set(techs.filter(t=>!/native-theme-/.test(t.status)).map(t=>t.id));
// 6 and 56 carry joke mechanics: a full revival and a 0 MP cost.
const changedMechanics=new Set([6,36,39,45,56]);
const ranges=[['target',table.TARGET,2,-1],['control',table.CONTROL,11,0],['property',table.PROPERTY,12,-1],['animation',table.ANIMATION,7,0]];

test('every technique has a Shrek-themed label: Shrek presentations (reworked or color-themed)',()=>{
 assert.equal(table.control(1),0xc1bf6,'native records are indexed by tech ID times eleven');
 assert.equal(techs.length,116);
 assert.deepEqual(techs.filter(t=>custom.has(t.id)).map(t=>t.id),[...custom].sort((a,b)=>a-b));
 for(const t of techs){
  assert.ok(t.name&&t.short&&t.concept&&t.status);assert.doesNotMatch(t.status,/stock-animation|animation-pending/);
  const p=0xc15c4+t.id*11,record=b.rom.subarray(p,p+11);
  assert.equal(decode(record.subarray(record[0]===0x2f?1:0)).trim(),t.short,`native label ${t.id}`);
  assert.equal(record[0]===0x2f,b.base[p]===0x2f,`magic icon ${t.id}`);
  if(!custom.has(t.id))assert.match(t.status,/native-theme-/,`color theme ${t.id}`);
 }
});

test('the two source Fire Whirls have distinct Shrek-themed names',()=>{
 const flame=techs.find(t=>t.id===88),fire=techs.find(t=>t.id===60);
 assert.equal(flame.source,'Flame Whirl');assert.equal(fire.source,'Fire Whirl');
 assert.notEqual(flame.name,fire.name);
});

test('all unrelated targeting, control, property, MP and animation records remain byte-exact',()=>{
 for(const[label,start,size,zero]of ranges)for(let id=1;id<=56;id++){
  if(custom.has(id)&&label==='animation')continue;
  if(changedMechanics.has(id))continue;
  const p=start+(id+zero)*size;
  assert.deepEqual(b.rom.subarray(p,p+size),b.base.subarray(p,p+size),`${label} ${id}`);
 }
 for(let id=1;id<=56;id++)if(!changedMechanics.has(id))assert.equal(b.rom[table.MP+id],b.base[table.MP+id],`MP ${id}`);
 // Shrek's reworked spells (My Swamp!, Run Away!, Love & Life) keep their
 // native targets and control; only Love & Life's effect record differs.
 for(const id of[3,5,6]){
  for(const p of[table.target(id),table.control(id),...(id===6?[]:[table.property(id)])])assert.deepEqual(b.rom.subarray(p,p+(p===table.target(id)?2:p===table.control(id)?11:p===table.property(id)?12:7)),b.base.subarray(p,p+(p===table.target(id)?2:p===table.control(id)?11:p===table.property(id)?12:7)),`stock magic ${id}`);
 }
});

test('Puss Charm and Mongo Heal exchange their native mechanics without moving unlock slots',()=>{
 for(const[id,source]of[[36,45],[45,36]]){
  assert.deepEqual(b.rom.subarray(table.target(id),table.target(id)+2),b.base.subarray(table.target(source),table.target(source)+2));
  assert.deepEqual(b.rom.subarray(table.property(id),table.property(id)+12),b.base.subarray(table.property(source),table.property(source)+12));
  assert.equal(b.rom[table.MP+id],b.base[table.MP+source]);
  const a=b.rom.subarray(table.control(id),table.control(id)+11),z=b.base.subarray(table.control(source),table.control(source)+11);if(id===36)z[0]=50;else z[0]=0x85;assert.deepEqual(a,z);
  const x=b.rom.subarray(table.animation(id),table.animation(id)+7),y=b.base.subarray(table.animation(36),table.animation(36)+7);assert.deepEqual(x.subarray(1),y.subarray(1));assert.equal(x[0],id);
  assert.deepEqual(b.rom.subarray(table.SCENE+id*2,table.SCENE+id*2+2),b.base.subarray(table.SCENE+36*2,table.SCENE+36*2+2));
  assert.deepEqual(b.rom.subarray(table.ATTACK+id*2,table.ATTACK+id*2+2),b.base.subarray(table.ATTACK+36*2,table.ATTACK+36*2+2));
 }
 assert.equal(b.rom[0xd692c+36*2],b.base[0xd692c+36*2]);assert.equal(b.rom[0xd692c+45*2],b.base[0xd692c+45*2]);
 assert.equal(techs.find(t=>t.id===36).name,'Big Eyes');assert.match(techs.find(t=>t.id===45).source,/Frog Heal/);
 assert.deepEqual([...b.rom.subarray(0xc249f+50*3,0xc249f+50*3+3)],[4,4,255]);
});

test('moved combos use their destination pair pattern and revised native prerequisites',()=>{
 for(const[id,pattern]of[[80,43],[81,42],[92,47],[93,18]]){
  assert.equal(b.rom[table.control(id)],pattern,`participant pattern ${id}`);
  assert.deepEqual(b.rom.subarray(table.control(id)+1,table.control(id)+11),b.base.subarray(table.control(id)+1,table.control(id)+11),`effect records ${id}`);
 }
 for(const[id,expected]of[[80,[7,5,255]],[81,[2,4,255]],[92,[2,5,255]],[93,[4,4,255]]]){
  const requirement=b.audit.techniqueRevision.requirements[id];
  assert.deepEqual([...b.rom.subarray(requirement.offset,requirement.offset+3)],expected);
  assert.deepEqual(requirement.values,expected);
 }
});

test('moved combos read their new pair learned-bit group without changing tech ID or CPU state',async()=>{
 const s=await createCore(b.rom);
 for(const[entry,returnPc]of[[0xca56,0xca5b],[0xcb26,0xcb2b]])for(const[id,original,selected]of[[80,7,8],[81,8,7],[92,11,12],[93,12,11],[78,7,7]]){
  s.ram.fill(0);const c=s.cpu;c.reset();c.e=false;c.m=true;c.x=false;c.i=true;c.cyclesLeft=0;c.r[0]=0x7e;c.r[1]=0xc1;c.br[4]=entry;c.br[5]=0;c.br[3]=0x7ff;c.br[1]=original;
  for(let group=0;group<15;group++)s.ram[0x283e+group]=0x10+group;
  s.ram[0x08]=id;
  let ticks=0;while((c.r[1]<<16|c.br[4])!==(0xc10000|returnPc)&&ticks++<1000)c.cycle();
  assert.ok(ticks<1000);assert.equal(c.br[0],0x10+selected);assert.equal(s.ram[0x0c],0x10+selected);assert.equal(c.br[1],original);assert.equal(c.br[3],0x7ff);assert.equal(s.ram[0x93f4],0);
 }
});

test('rock triples use the locked Shrek-led participants, masks and required singles',()=>{
 for(const{id,mask,requirements,pattern,availabilityOffset}of b.audit.techniqueRevision.rockTriples){
  const idOffset=0xc2953+(id-112)*3,maskOffset=0xc2983+(id-112);
  assert.equal(b.rom[table.control(id)],pattern);
  assert.deepEqual([...b.rom.subarray(idOffset,idOffset+3)],requirements);
  assert.equal(b.rom[maskOffset],mask);
  assert.equal(b.rom[availabilityOffset],mask);
  assert.deepEqual(b.rom.subarray(table.control(id)+1,table.control(id)+11),b.base.subarray(table.control(id)+1,table.control(id)+11));
 }
 assert.deepEqual([...b.rom.subarray(0xc249f+11*3,0xc249f+11*3+3)],[0,2,6]);
 assert.deepEqual([...b.rom.subarray(0xc249f+15*3,0xc249f+15*3+3)],[0,4,6]);
 assert.equal(b.rom[0xc2983],0x62,'Dark Eternal stock party mask');
 assert.deepEqual([...b.rom.subarray(0xc297c,0xc2983)],[0xc4,0xb0,0xa8,0xa4,0x98,0x94,0x8c],'ordinary triple availability masks');
 assert.equal(b.rom[0x1cd0d],0x22);
 assert.ok(b.audit.techniqueRevision.rockSelectorHook.address>0);
});
