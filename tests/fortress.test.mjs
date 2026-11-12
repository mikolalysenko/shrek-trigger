import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{build,bedroom,screenshot}from'./helpers.mjs';
import{fortressDialogue}from'../content/fortress-dialogue.js';
import{carnivalDialogue}from'../content/carnival-dialogue.js';
import{u16,u24,fileOffset}from'../engine/rom.js';
import{encodeDialogue,dialogueLength}from'../engine/text.js';
import{decompress}from'../engine/compression.js';
import{fortressCheckpoints,seedFortressCheckpoint}from'../engine/fortress-checkpoints.js';
import{installHooks}from'../engine/hooks.js';
import{createDevTools}from'../engine/devtools.js';
import{runFrames}from'../engine/automation.js';
import{areas}from'../content/areas.js';
import{defeatBriarKnight,defeatMothWitch,defeatEnforcerRematch,interruptFarquaadRitual}from'./fortress-controller.mjs';
const b=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json'));
test('fortress and hideout dialogue preserves every native instruction, branch and timed duel cue',()=>{
 let count=0;for(const[location,lines]of Object.entries(fortressDialogue)){
  const l=layouts.find(l=>l.location===+location),old=decompress(b.base,l.eventPointer).bytes,now=decompress(b.rom,fileOffset(u24(b.rom,0x3cf9f0+l.eventId*3))).bytes;
  assert.equal(now.length,old.length);assert.ok(l.tableCommands.length);assert.deepEqual(Object.keys(lines).map(Number).sort((a,b)=>a-b),l.strings.map(s=>s.id).sort((a,b)=>a-b));
  const edited=new Set(l.tableCommands.flatMap(p=>[p+1,p+2,p+3]));for(let i=0;i<old.length;i++)if(!edited.has(i))assert.equal(now[i],old[i],`native event ${location}:${i}`);
  for(const command of l.tableCommands){assert.equal(now[command],0xb8);assert.notEqual(u24(now,command+1),u24(old,command+1));const table=fileOffset(u24(now,command+1));
   for(const[id,text]of Object.entries(lines)){
    const addr=(table&0x3f0000)+u16(b.rom,table+id*2),encoded=encodeDialogue(text,b.base);assert.equal(addr>>16,(addr+encoded.length-1)>>16);assert.deepEqual(b.rom.slice(addr,addr+encoded.length),encoded);assert.equal(dialogueLength(b.rom,addr),encoded.length);
    assert.ok(!/\b(Crono|Lucca|Marle|Robo|Lavos|Magus|Ozzie|Cyrus|Flea|Slash|Masamune|Froggy)\b/i.test(text));for(const row of text.replace(/\{(?:page3|page|full)\}/g,'\n').replace(/\{[^}]+\}/g,'').split('\n'))assert.ok(row.length<=36,`${location}:${id}: ${row}`);count++;
   }
  }
 }
 assert.equal(count,201);assert.equal(Object.keys(fortressDialogue).length,22);
 for(const loc of[163,172])assert.deepEqual(fortressDialogue[loc],carnivalDialogue[loc]);
 const l=layouts.find(l=>l.location===171),e=decompress(b.rom,fileOffset(u24(b.rom,0x3cf9f0+l.eventId*3))).bytes;assert.deepEqual([...e.slice(775,778)],[0xc3,13,6]);const rows=fortressDialogue[171][13].replace('{null}','').split('\n');assert.equal(rows.length,3);assert.ok(rows[1].startsWith('   '));assert.ok(rows[2].startsWith('   '));
 for(const[loc,id,delay]of[[169,123,6],[169,124,12],[173,125,6],[173,126,6],[174,127,6]])assert.deepEqual(fortressDialogue[loc][id].match(/\{delay \d+\}/g),[`{delay ${delay}}`,'{delay 0}']);
});

const specs=JSON.parse(await readFile('content/hooks.json'));

test('fortress shortcuts preserve unrelated flags and distinguish the first hatchet from the late-game loadout',()=>{
 for(const[key,c]of Object.entries(fortressCheckpoints)){
  const ram=new Uint8Array(0x20000);for(const a of[0x100a3,0x100df,0x10057,0x100ae,0x100d5,0x100e0,0x101a1,0x101a0,0x1009c,0x101f4,0x101a4,0x1000b,0x1000c])ram[a]=255;ram[0x10056]=77;seedFortressCheckpoint(ram,key);
  assert.equal(ram[0x10000],c.story);assert.deepEqual([...ram.slice(0x2980,0x2983)],[0,4,1]);assert.equal(ram[0x29af],c.late?254:248);assert.equal(ram[0x2769],c.late?66:61);
  assert.equal(ram[0x100a3],c.late||c.ritual?255:131);assert.equal(ram[0x100df],c.late?255:254);assert.equal(ram[0x10057],c.late?255:251);assert.equal(ram[0x100ae],key==='fortress-knight'?243:255);assert.equal(ram[0x100d5],key==='fortress-moth'?254:255);assert.equal(ram[0x100e0],c.ritual?0:255);assert.equal(ram[0x101a1],c.hideout??(key==='hideout-moth'?251:key==='hideout-knight'?247:255));assert.equal(ram[0x10056],77);
  const hideout=c.hideout!==undefined;assert.equal(ram[0x101a0],hideout&&!c.cat?127:255);assert.equal(ram[0x1009c],hideout?239:255);assert.equal(ram[0x101f4],hideout?223:255);assert.equal(ram[0x101a4],hideout?191:255);assert.equal(ram[0x1000b],hideout?15:255);assert.equal(ram[0x1000c],hideout?252:255);
 }
 const ram=new Uint8Array(0x20000),before=ram.slice();assert.throws(()=>seedFortressCheckpoint(ram,'bad'),/Unknown fortress/);assert.deepEqual(ram,before);
});
async function fixture(key,party=[0,4,1]){
 const s=await bedroom(b.rom),h=installHooks(s,specs),messages=[],battles=[];let before,seeded=false;
 h.on('event.dispatch',e=>{if(!before)before=s.ram.slice();if(e.opcode===0xd8&&battles.at(-1)!==e.scriptPC)battles.push(e.scriptPC);});h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
 const d=createDevTools(s,h),original=s.cart.data.slice();h.on('event.dispatch',()=>{if(seeded)return;seeded=true;const ids=key.startsWith('hideout')?[0,1,2,3,4,5,6]:[0,1,2,3,4];s.ram.fill(128,0x2980,0x2989);s.ram.set([...party,...ids.filter(id=>!party.includes(id))],0x2980);});
 const a=areas.find(a=>a.fortressScene===key);assert.throws(()=>d.jump({...a,id:134}),/own location/);assert.throws(()=>d.jump({...a,party}),/own location/);assert.throws(()=>d.jump({...a,bridgeScene:'bridge-battle'}),/own location/);
 d.jump(a);runFrames(s,400);
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(keys,n)=>runFrames(s,n,keys),wait:n=>runFrames(s,n),tap:(keys=256,gap=90)=>{runFrames(s,3,keys);runFrames(s,gap);},shot:key=>screenshot(s,'.local/qa/'+key+'.png')};
 return{s,h,d,io,messages,battles,close(){assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();}};
}
function saw(f,location,ids){for(const id of ids)assert.ok(f.messages.some(([loc,n])=>loc===location&&n===id),location+':'+id);}
test('the knight guard ambush, unarmed fight, sword phase, one-time weapon reward and native exit complete with the first hatchet',async()=>{
 const f=await fixture('fortress-knight');assert.equal(f.s.ram[0x2769],61);await defeatBriarKnight(f.io);assert.deepEqual(f.battles,[0x42e,0x50e,0x54d]);saw(f,169,[0,7,8,16,17,18,19,20,21,22,23,24]);f.close();
});
test('the moth decoy, transformation, companion reactions, one-time onion and real exit work for all three early companions',async()=>{
 for(const companion of[1,2,3]){const f=await fixture('fortress-moth',[0,4,companion]);await defeatMothWitch(f.io);assert.deepEqual(f.battles,[0x439,0x512]);saw(f,173,[1,25,26,27,28,32,33,37,38,39,40,41,28+companion,33+companion]);f.close();}
});
test('both hideout rematches select the correct Farquaad-present or absent dialogue, win and leave through their real northern doors',async()=>{
 for(const kind of['moth','knight'])for(const farquaad of[false,true]){
  const f=await fixture('hideout-'+kind,[0,4,farquaad?6:1]);await defeatEnforcerRematch(f.io,kind);assert.deepEqual(f.battles,[kind==='moth'?0x1db:0x1ea]);
  const loc=kind==='moth'?183:184,chosen=kind==='moth'?(farquaad?163:164):(farquaad?174:173),other=kind==='moth'?(farquaad?164:163):(farquaad?173:174);
  saw(f,loc,kind==='moth'?[153,159,160,162,165,166,167,chosen]:[161,168,169,170,175,176,chosen]);assert.ok(!f.messages.some(([l,n])=>l===loc&&n===other));f.close();
 }
});
test('Farquaad ritual approach, hatchet confrontation, native battle and vortex reach the real wake-up cue with every early companion',async()=>{
 for(const companion of[1,2,3]){
  const f=await fixture('fortress-ritual',[0,4,companion]);await interruptFarquaadRitual(f.io);assert.deepEqual(f.battles,[0x582]);
  saw(f,172,[83,84,85,86,87,88,89,90,91,92,93,97,98,102,106,110,114,93+companion,98+companion,102+companion,106+companion,110+companion]);saw(f,271,[0]);f.close();
 }
});
