import assert from'node:assert/strict';
import{movement}from'./medina-controller.mjs';

// Acceptance drivers expose reads and ordinary controller input only. All
// flags, scene changes, combat, rewards and escape choreography are native.
async function finish(io,predicate=async()=>await io.read(0x11f)&&!await io.read(0x126)){
 for(let i=0;i<100&&!await predicate();i++)await io.tap(256,180);
 assert.ok(await predicate(),'fortress scene did not release control');
}
async function quantity(io,id){const r=await io.bytes(0x2400,512);let n=0;for(let i=0;i<256;i++)if(r[i]===id)n+=r[i+256];return n;}
// A connected campaign can supply its own battle tactics (useFortressFight);
// the fortress tests keep the default of confirming each native command.
let fightHook=null;export function useFortressFight(fn){fightHook=fn;}
async function battle(io,formation,key){
 for(let i=0;i<180&&!(await io.read(0x117)&1);i++)await io.tap(256,100);
 assert.equal(await io.read(0x117)&1,1,'expected '+key);await io.wait(400);
 assert.deepEqual(Array.from(await io.bytes(0xaf02,8)),formation,key+' formation');await io.shot(key);
 if(fightHook)await fightHook(key,formation);
 for(let i=0;i<500&&(await io.read(0x117)&1);i++)await io.tap(256,100);
 assert.equal(await io.read(0x117)&1,0,key+' victory');
}
async function exitRoom(io,location,destination,points,direction){
 const{route}=movement(io);await route(points);for(let i=0;i<180&&await io.read(0x100,2)===location;i++)await io.hold(direction|1,1);await io.wait(400);assert.equal(await io.read(0x100,2),destination);
}
export async function defeatBriarKnight(io){
 assert.equal(await io.read(0x100,2),169);const before=await quantity(io,16),{route}=movement(io);
 await route([[8,40]]);await io.hold(16,10);await io.tap(256,180);
 await battle(io,[255,46,46,46,46,46,255,255],'fortress-bone-guards');
 await finish(io,async()=>await io.read(0x100a3)&64&&await io.read(0x11f)&&!await io.read(0x126));
 await route([[8,38]]);await io.hold(16,12);await io.tap(256,180);
 await battle(io,[157,255,255,255,255,255,255,255],'fortress-knight-unarmed');
 await battle(io,[158,255,255,255,255,255,255,255],'fortress-knight-armed');
 await finish(io,async()=>await io.read(0x100a3)&4&&await io.read(0x11f)&&!await io.read(0x126));
 assert.equal(await io.read(0x100ae)&12,4);await route([[8,37]]);await io.hold(16,10);await io.tap(256,180);await finish(io);
 assert.equal(await io.read(0x100ae)&12,12);assert.equal(await quantity(io,16),before+1);await io.shot('fortress-knight-reward');
 await io.tap(256,180);assert.equal(await quantity(io,16),before+1);
 await exitRoom(io,169,469,[[8,59]],32);
 return{guards:5,phases:[157,158],reward:16,quantity:1,destination:469};
}
export async function defeatMothWitch(io){
 assert.equal(await io.read(0x100,2),173);const before=await quantity(io,206),{route}=movement(io);
 await route([[7,23]]);await io.hold(16,10);await io.tap(256,180);
 await battle(io,[240,255,255,255,255,255,255,255],'fortress-moth-decoy');
 await battle(io,[255,255,255,255,159,255,255,255],'fortress-moth-reveal');
 await finish(io,async()=>await io.read(0x100a3)&8&&await io.read(0x11f)&&!await io.read(0x126));
 await route([[7,23]]);await io.hold(16,6);await io.tap(256,180);await finish(io);
 assert.equal(await io.read(0x100d5)&1,1);assert.equal(await quantity(io,206),before+1);await io.shot('fortress-moth-reward');
 await io.tap(256,180);assert.equal(await quantity(io,206),before+1);
 await exitRoom(io,173,125,[[7,28]],32);
 return{decoy:240,boss:159,reward:206,quantity:1,destination:125};
}
export async function defeatEnforcerRematch(io,kind){
 assert.ok(['moth','knight'].includes(kind));const moth=kind==='moth',location=moth?183:184,mask=moth?4:8,enemy=moth?187:186;
 assert.equal(await io.read(0x100,2),location);assert.equal(await io.read(0x101a1)&mask,0);
 for(let i=0;i<180&&!(await io.read(0x101a1)&mask);i++)await io.hold(17,1);
 assert.equal(await io.read(0x101a1)&mask,mask);
 await battle(io,[255,255,255,255,enemy,255,255,255],'hideout-'+kind);
 await finish(io);assert.equal(await io.read(0x101a1)&mask,mask);
 await exitRoom(io,location,moth?178:179,[[39,31]],16);
 return{enemy,destination:moth?178:179};
}
export async function interruptFarquaadRitual(io){
 assert.equal(await io.read(0x100,2),172);
 for(let i=0;i<180&&!(await io.read(0x117)&1);i++){
  if(await io.read(0x11f))await io.hold(16,8);
  await io.tap(256,100);
 }
 await battle(io,[249,255,255,255,255,255,255,255],'fortress-farquaad');
 for(let i=0;i<180&&(await io.read(0x100,2)!==271||await io.read(0x10000)!==138);i++)await io.tap(256,100);
 assert.equal(await io.read(0x100,2),271);assert.equal(await io.read(0x10000),138);
 // The location word changes when the transition is queued. Wait for the
 // actual destination's first wake-up cue after the long vortex animation.
 for(let i=0;i<90&&(await io.read(0x12a)!==0||!await io.read(0x126));i++)await io.wait(60);
 assert.equal(await io.read(0x100,2),271);assert.equal(await io.read(0x12a),0);assert.ok(await io.read(0x126));await io.shot('fortress-ritual-arrival');
 return{enemy:249,story:138,destination:271};
}
