import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{build,bedroom,screenshot}from'./helpers.mjs';
import{installHooks}from'../engine/hooks.js';
import{createDevTools}from'../engine/devtools.js';
import{runFrames}from'../engine/automation.js';
import{u16}from'../engine/rom.js';
import{areas}from'../content/areas.js';
import{completeHornerHideout,completeHornerFinale,traverseBladeTrap,finishHornerCatScene}from'./hideout-controller.mjs';
const b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
async function fixture(key,party=[0,4,1]){
 const s=await bedroom(b.rom),h=installHooks(s,specs),messages=[],battles=[];let before,seeded=false;
 h.on('event.dispatch',e=>{if(!before)before=s.ram.slice();const battle=e.location+':'+e.scriptPC.toString(16);if(e.opcode===0xd8&&battles.at(-1)!==battle)battles.push(battle);});h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
 const d=createDevTools(s,h),original=s.cart.data.slice();h.on('event.dispatch',()=>{if(seeded)return;seeded=true;s.ram.fill(128,0x2980,0x2989);s.ram.set([...party,...[0,1,2,3,4,5,6].filter(id=>!party.includes(id))],0x2980);});
 d.jump(areas.find(a=>a.fortressScene===key));runFrames(s,400);
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(keys,n)=>runFrames(s,n,keys),wait:n=>runFrames(s,n),tap:(keys=256,gap=90)=>{runFrames(s,3,keys);runFrames(s,gap);},shot:key=>screenshot(s,'.local/qa/'+key+'.png')};
 return{s,h,d,io,messages,battles,close(){assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,original);d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();}};
}
function saw(f,location,ids){for(const id of ids)assert.ok(f.messages.some(([loc,n])=>loc===location&&n===id),location+':'+id);}
test('Horner hideout completes continuously with and without Farquaad, earns seven one-time rewards and returns to the overworld',async()=>{
 for(const farquaad of[false,true]){
  const f=await fixture('hideout-route',[0,4,farquaad?6:1]);await completeHornerHideout(f.io);
  assert.deepEqual(f.battles,['183:1db','184:1ea','180:19f','181:267']);saw(f,177,farquaad?[145,146,147,150,151,152]:[145,146,148,149]);
  saw(f,178,[154,155,156,157,158,149]);saw(f,179,[177,179,181,180,157,172,149,255]);saw(f,180,[182,183,184,185,186,171]);saw(f,181,[187,178,191,190,192,farquaad?189:193]);
  assert.equal(f.messages.some(([l,n])=>l===181&&n===188),farquaad);f.close();
 }
});
test('the blade trap leaves every active character at one HP while its alternative preserves health',async()=>{
 for(const takeBait of[true,false]){
  const f=await fixture('hideout-trap');await traverseBladeTrap(f.io,{takeBait});assert.deepEqual(f.battles,[]);saw(f,179,takeBait?[177,178]:[177,179,181,180,157,172,149]);f.close();
 }
});
test('the floor-switch shortcut wins through the actual battle target, falls, returns and completes the cat scene',async()=>{
 const f=await fixture('hideout-finale',[0,4,6]);await completeHornerFinale(f.io);assert.deepEqual(f.battles,['181:267']);saw(f,181,[188,187,178,191,190,192,189]);f.close();
});
test('all six final companion reactions follow the native cat animation and permanent quest flags',async()=>{
 for(const companion of[1,2,3,4,5,6]){
  const f=await fixture('hideout-cat',companion===4?[0,1,4]:[0,4,companion]);await finishHornerCatScene(f.io);assert.deepEqual(f.battles,[]);saw(f,181,[190,192,companion===6?189:192+companion]);f.close();
 }
});
