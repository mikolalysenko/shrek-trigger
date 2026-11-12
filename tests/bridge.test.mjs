import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{build,bedroom,screenshot}from'./helpers.mjs';
import{bridgeDialogue}from'../content/bridge-dialogue.js';
import{carnivalDialogue}from'../content/carnival-dialogue.js';
import{bridgeCheckpoints,seedBridgeCheckpoint}from'../engine/bridge-checkpoints.js';
import{u16,u24,fileOffset}from'../engine/rom.js';
import{encodeDialogue,dialogueLength}from'../engine/text.js';
import{decompress}from'../engine/compression.js';
import{installHooks}from'../engine/hooks.js';
import{createDevTools}from'../engine/devtools.js';
import{runFrames}from'../engine/automation.js';
import{areas}from'../content/areas.js';
import{requestBridgeSupplies,collectBridgeSupplies,deliverBridgeSupplies,defendBridge}from'./bridge-controller.mjs';

const b=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json')),specs=JSON.parse(await readFile('content/hooks.json'));
test('bridge and village text preserves every native branch, choice row, gift and Carnival flashback',()=>{
 let count=0;for(const[location,lines]of Object.entries(bridgeDialogue)){
  const l=layouts.find(l=>l.location===+location),old=decompress(b.base,l.eventPointer).bytes,now=decompress(b.rom,fileOffset(u24(b.rom,0x3cf9f0+l.eventId*3))).bytes;
  assert.equal(now.length,old.length);assert.ok(l.tableCommands.length);
  assert.deepEqual(Object.keys(lines).map(Number).sort((a,b)=>a-b),l.strings.map(s=>s.id).sort((a,b)=>a-b));
  const edited=new Set(l.tableCommands.flatMap(p=>[p+1,p+2,p+3]));for(let i=0;i<old.length;i++)if(!edited.has(i))assert.equal(now[i],old[i],`native event ${location}:${i}`);
  for(const command of l.tableCommands){
   assert.equal(now[command],0xb8);assert.notEqual(u24(now,command+1),u24(old,command+1));const table=fileOffset(u24(now,command+1));
   for(const[id,text]of Object.entries(lines)){
    const addr=(table&0x3f0000)+u16(b.rom,table+id*2),encoded=encodeDialogue(text,b.base);
    assert.equal(addr>>16,(addr+encoded.length-1)>>16);assert.deepEqual(b.rom.slice(addr,addr+encoded.length),encoded);assert.equal(dialogueLength(b.rom,addr),encoded.length);
    assert.ok(!/\b(Crono|Lucca|Marle|Robo|Lavos|Magus|Ozzie|Cyrus|Toma|Zombor|Masamune|Jerky)\b/i.test(text));
    for(const row of text.replace(/\{(?:page3|page|full)\}/g,'\n').replace(/\{[^}]+\}/g,'').split('\n'))assert.ok(row.length<=36,`${location}:${id}: ${row}`);count++;
   }
  }
 }
 assert.equal(count,178);
 for(const loc of[135,137,138])for(const[id,text]of Object.entries(carnivalDialogue[loc]))assert.equal(bridgeDialogue[loc][id],text);
 const choices=[...[134,135].flatMap(l=>[[l,1901,63,6],[l,1984,75,6]]),[136,656,189,11],[138,1667,83,6],[138,2192,100,6],[138,2310,77,6],[138,2494,87,6]];
 for(const[location,pos,id,mask]of choices){
  const l=layouts.find(l=>l.location===location),e=decompress(b.rom,fileOffset(u24(b.rom,0x3cf9f0+l.eventId*3))).bytes;assert.deepEqual([...e.slice(pos+1,pos+4)],[0xc0,id,mask]);
  const rows=bridgeDialogue[location][id].replace('{null}','').split(/\{(?:page|page3|full)\}/).at(-1).split('\n');for(let row=mask>>2;row<=(mask&3);row++)assert.ok(rows[row]?.startsWith('   '));
 }
});

test('bridge shortcuts preserve unrelated flags and reject unavailable inventory capacity',()=>{
 for(const key of Object.keys(bridgeCheckpoints)){
  const ram=new Uint8Array(0x20000);ram[0x100a9]=255;ram[0x1019a]=255;ram[0x10057]=255;ram[0x10058]=77;
  seedBridgeCheckpoint(ram,key);assert.equal(ram[0x100a9],key==='bridge-chef'?231:key==='bridge-request'?235:251);assert.equal(ram[0x1019a],248);assert.equal(ram[0x10057],249);assert.equal(ram[0x10058],77);
 }
 const full=new Uint8Array(0x20000);full.fill(1,0x2400,0x2500);const before=full.slice();assert.throws(()=>seedBridgeCheckpoint(full,'bridge-supplies'),/inventory slot/);assert.deepEqual(full,before);
 assert.throws(()=>seedBridgeCheckpoint(full,'bad'),/Unknown bridge/);
});
async function fixture(key,{party=[0,1,2]}={}){
 const s=await bedroom(b.rom),h=installHooks(s,specs),messages=[],battles=[];let before,seeded=false;
 h.on('event.dispatch',e=>{if(!before)before=s.ram.slice();if(e.opcode===0xd8&&battles.at(-1)!==e.scriptPC)battles.push(e.scriptPC);});h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
 const d=createDevTools(s,h),original=s.cart.data.slice();h.on('event.dispatch',()=>{if(seeded)return;seeded=true;s.ram.fill(128,0x2980,0x2989);s.ram.set([...party,...[0,1,2,3].filter(id=>!party.includes(id))],0x2980);});
 const area=areas.find(a=>a.bridgeScene===key);assert.throws(()=>d.jump({...area,id:134}),/own location/);assert.throws(()=>d.jump({...area,party}),/own location/);assert.throws(()=>d.jump({...area,medinaScene:'medina-cave'}),/own location/);
 d.jump(area);runFrames(s,400);
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(keys,n)=>runFrames(s,n,keys),wait:n=>runFrames(s,n),tap:(keys=256,gap=90)=>{runFrames(s,3,keys);runFrames(s,gap);},shot:key=>screenshot(s,'.local/qa/'+key+'.png')};
 return{s,h,d,io,messages,battles,close(){assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();}};
}
const saw=(f,id)=>f.messages.some(([loc,n])=>loc===135&&n===id);
test('the chef prepares supplies in the kitchen and delivers both native gifts on the real route out of the castle',async()=>{
 const f=await fixture('bridge-chef');await collectBridgeSupplies(f.io);
 for(const[location,ids]of[[123,[171,172,173,174,175]],[120,[178,179,0,241,180]]])for(const id of ids)assert.ok(f.messages.some(([loc,n])=>loc===location&&n===id),location+':'+id);
 assert.deepEqual(f.battles,[]);f.close();
});
test('the ration request sets its native flag and the delivered Onion Bread supports refusal then consumption',async()=>{
 const request=await fixture('bridge-request');await requestBridgeSupplies(request.io);assert.ok(saw(request,56));request.close();
 const delivery=await fixture('bridge-supplies');await deliverBridgeSupplies(delivery.io);for(const id of[62,63,64,65,66,67,68,69,70,71])assert.ok(saw(delivery,id),'delivery '+id);assert.deepEqual(delivery.battles,[]);delivery.close();
});
test('native captain choices, both skirmishes and the two-part boss reach the world exit with every early companion reaction',async()=>{
 for(const party of[[0,1,2],[0,2,1],[0,3,2]]){
  const f=await fixture('bridge-battle',{party});await defendBridge(f.io);assert.deepEqual(f.battles,[0x524,0x4ef,0x4cf]);
  for(const id of[75,76,78,87,88,89,90,91,92,96,243,82+party[1],92+party[1]])assert.ok(saw(f,id),'bridge '+id);f.close();
 }
});
