import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {medinaDialogue} from '../content/medina-dialogue.js';
import {u16,u24,put16,put24,fileOffset} from '../engine/rom.js';
import {encodeDialogue,dialogueLength} from '../engine/text.js';
import {decompress} from '../engine/compression.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {areas} from '../content/areas.js';
import {visitMedinaHouse,visitMedinaInn,shopInMedina,defeatCaveKeeper} from './medina-controller.mjs';

const b=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json')),specs=JSON.parse(await readFile('content/hooks.json'));
test('Medina and the cave retain native choices, shop prices, historical branches, treasure and transition instructions',()=>{
 let count=0;
 for(const[location,lines]of Object.entries(medinaDialogue)){
  const l=layouts.find(l=>l.location===+location),old=decompress(b.base,l.eventPointer).bytes;
  const now=decompress(b.rom,fileOffset(u24(b.rom,0x3cf9f0+l.eventId*3))).bytes;
  assert.equal(now.length,old.length);assert.ok(l.tableCommands.length);
  assert.deepEqual(Object.keys(lines).map(Number).sort((a,b)=>a-b),l.strings.map(s=>s.id).sort((a,b)=>a-b));
  const edited=new Set(l.tableCommands.flatMap(p=>[p+1,p+2,p+3]));
  for(let i=0;i<old.length;i++)if(!edited.has(i))assert.equal(now[i],old[i],`native event ${location}:${i}`);
  for(const command of l.tableCommands){
   assert.equal(now[command],0xb8);assert.notEqual(u24(now,command+1),u24(old,command+1));
   const table=fileOffset(u24(now,command+1));
   for(const[id,text]of Object.entries(lines)){
    const addr=(table&0x3f0000)+u16(b.rom,table+id*2),encoded=encodeDialogue(text,b.base);
    assert.equal(addr>>16,(addr+encoded.length-1)>>16);assert.deepEqual(b.rom.slice(addr,addr+encoded.length),encoded);
    assert.equal(dialogueLength(b.rom,addr),encoded.length);
    assert.ok(!/\b(Crono|Lucca|Marle|Robo|Lavos|Magus|Ozzie|Heckran|Belthasar|Tonic|Ether)\b/i.test(text));
    for(const row of text.replace(/\{(?:page3|page|full)\}/g,'\n').replace(/\{[^}]+\}/g,'').split('\n'))assert.ok(row.length<=36,`${location}:${id}: ${row}`);
    count++;
   }
  }
 }
 assert.equal(count,79);
 const choices=[[35,660,179,6],[35,731,183,11],[35,797,181,11],[36,1514,169,6],[39,444,187,11],[47,1141,234,6]];
 for(const[location,pos,id,mask]of choices){
  const l=layouts.find(l=>l.location===location),e=decompress(b.rom,fileOffset(u24(b.rom,0x3cf9f0+l.eventId*3))).bytes;
  assert.deepEqual([...e.slice(pos+1,pos+4)],[0xc0,id,mask]);
  const rows=medinaDialogue[location][id].replace('{null}','').split('\n');
  for(let row=mask>>2;row<=(mask&3);row++)assert.ok(rows[row]?.startsWith('   '));
 }
 assert.deepEqual([...encodeDialogue(medinaDialogue[46][198],b.base).slice(-4)],[3,6,3,0]);
});

async function fixture(key,{party=[0,1,2],gold,paidInn=false}={}){
 const s=await bedroom(b.rom),h=installHooks(s,specs),messages=[],battles=[];let before,seeded=false;
 s.ram[0x101a2]=255;s.ram[0x101a1]=255;s.ram[0x101a3]|=2;s.ram[0x101f0]|=1;s.ram[0x100f0]=45;
 h.on('event.dispatch',e=>{if(!before)before=s.ram.slice();if(e.opcode===0xd8&&battles.at(-1)!==e.scriptPC)battles.push(e.scriptPC);});
 h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
 const d=createDevTools(s,h),original=s.cart.data.slice();
 h.on('event.dispatch',()=>{
  if(seeded)return;seeded=true;
  // Alternate companion and wallet/resource fixtures, all prepared before
  // the native E0 transition. No later gameplay state is written.
  s.ram.fill(128,0x2980,0x2989);s.ram.set(party,0x2980);s.ram[0x2983]=[0,1,2,3].find(id=>!party.includes(id));s.ram[0x29af]=240;
  if(gold!==undefined)put24(s.ram,0x2c53,gold);
  if(paidInn)s.ram[0x101a2]|=4;
  if(key==='medina-arrival'||key.endsWith('-inn'))for(const id of party){put16(s.ram,0x2603+id*80,500);put16(s.ram,0x2607+id*80,1);}
 });
 assert.throws(()=>d.jump({id:6,x:8,y:10,medinaScene:key}),/own location/);
 const area=areas.find(a=>a.medinaScene===key);assert.throws(()=>d.jump({...area,party}),/own location/);
 d.jump(area);runFrames(s,400);assert.equal(s.ram[0x100f0],45,'unrelated lower-bank flag is preserved');
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(keys,n)=>runFrames(s,n,keys),wait:n=>runFrames(s,n),tap:(keys=256,gap=90)=>{runFrames(s,3,keys);runFrames(s,gap);},shot:key=>screenshot(s,'.local/qa/'+key+'.png')};
 return{s,h,d,io,messages,battles,close(){assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();}};
}
const saw=(f,loc,id)=>f.messages.some(([l,n])=>l===loc&&n===id);

test('the cupboard arrival, welcome, declined meal, native recovery and house exit support every first-chapter companion pair',async()=>{
 for(const party of[[0,1,2],[0,3,2],[0,1,3]]){
  const f=await fixture('medina-arrival',{party}),result=await visitMedinaHouse(f.io);
  assert.ok(result.before.every(c=>c.hp===500&&c.mp===1));assert.deepEqual(result.after.map(c=>c.id),party);
  for(const id of[170,168,173,172,169,24])assert.ok(saw(f,36,id),'welcome '+id);
  const expected=party[1]===1?[174,178]:[176,177];for(const id of expected)assert.ok(saw(f,36,id),'companion '+id);
  assert.ok(f.messages.filter(([l,id])=>l===36&&id===169).length>=2);assert.deepEqual(f.battles,[]);f.close();
 }
});

test('the hostile and peaceful inns retain refusal, confrontation, both prices, insufficient funds and full recovery',async()=>{
 for(const c of[{peaceful:false,gold:5000},{peaceful:true,gold:5000},{peaceful:false,gold:199,paidInn:true},{peaceful:true,gold:9}]){
  const f=await fixture(c.peaceful?'medina-peaceful-inn':'medina-inn',c),result=await visitMedinaInn(f.io,{peaceful:c.peaceful,confrontation:!c.paidInn});
  assert.equal(result.paid,c.gold>=result.price);
  if(!c.peaceful&&!c.paidInn){assert.deepEqual(f.battles,[0x334]);for(const id of[181,182,184,183])assert.ok(saw(f,35,id));}
  else assert.deepEqual(f.battles,[]);
  if(!result.paid)assert.ok(saw(f,35,180));f.close();
 }
});

test('Medina markets preserve refusal and battle, buy one onion at the native random or discounted price, and restore ordinary prices',async()=>{
 for(const peaceful of[false,true]){
  const f=await fixture(peaceful?'medina-peaceful-market':'medina-market'),result=await shopInMedina(f.io);
  assert.equal(result.peaceful,peaceful);
  if(!peaceful){assert.deepEqual(f.battles,[0x200]);for(const id of[187,188,189,190,191])assert.ok(saw(f,39,id));}
  else{assert.ok(saw(f,39,210));assert.deepEqual(f.battles,[]);assert.equal(result.price,8);}
  f.close();
 }
});

test('the cave keeper falls to native magic and both companion explanations lead through the real river shortcut',async()=>{
 for(const party of[[0,1,2],[0,1,3]]){
  const f=await fixture('medina-cave',{party}),techs=[];f.h.on('battle.tech',e=>techs.push(e.techId));
  const result=await defeatCaveKeeper(f.io,b.rom);assert.ok(result.spells.length>=3);assert.equal(techs.filter(id=>id===5).length,result.spells.length);
  assert.deepEqual(f.battles,[0x349]);for(const id of[221,235,236,...(party.includes(2)?[237,239,241]:[238,240,242])])assert.ok(saw(f,47,id),'cave '+id);
  assert.ok(f.messages.filter(([loc,id])=>loc===47&&id===234).length>=2);f.close();
 }
});
