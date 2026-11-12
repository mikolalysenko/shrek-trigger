import assert from 'node:assert/strict';
import {movement} from './medina-controller.mjs';
import {attackNativeEnemy,chooseNativeTech,useNativeItem,useNativePartyItem} from './battle-controller.mjs';

async function quantity(io,id){const r=await io.bytes(0x2400,512);let n=0;for(let i=0;i<256;i++)if(r[i]===id)n+=r[i+256];return n;}
async function finish(io,predicate=async()=>await io.read(0x11f)&&!await io.read(0x126)){
 for(let i=0;i<160&&!await predicate();i++)await io.tap(256,100);
 assert.ok(await predicate(),'Bakery scene did not finish');
}
async function battle(io,formation,key){
 for(let i=0;i<160&&!(await io.read(0x117)&1);i++)await io.tap(256,100);
 assert.equal(await io.read(0x117)&1,1);await io.wait(400);assert.deepEqual(Array.from(await io.bytes(0xaf02,8)),formation);await io.shot(key);
}
// A connected campaign can supply its own boss tactics (useBakeryBossFight).
let bossHook=null;export function useBakeryBossFight(fn){bossHook=fn;}
async function defeat(io,enemy,{rom,lightning=false,healParty=false}={}){
 const slot=Array.from(await io.bytes(0xaf02,8)).indexOf(enemy)+3;assert.ok(slot>=3);
 if(bossHook){await bossHook(enemy);return{enemy,tactical:true};}
 let attacks=0,spells=0,heals=0,revives=0,finishers=0;
 for(let n=0;n<200&&(await io.read(0x117)&1)&&await io.read(0x5e30+slot*128,2);n++){
  const hp=[];if(healParty)for(let i=0;i<3;i++)hp.push(await io.read(0x5e30+i*128,2));
  if(healParty&&hp.includes(0)){if(await useNativeItem(io,199,hp.indexOf(0)))revives++;}
  else if(healParty&&hp.some(n=>n<650)){if(await useNativePartyItem(io,197))heals++;}
  else if(healParty&&n%3===0&&await io.read(0x5e34,2)>=12){await chooseNativeTech(io,rom,0,7);finishers++;}
  else if(lightning&&n%3===0){await chooseNativeTech(io,rom,0,3);spells++;}else if(await attackNativeEnemy(io,enemy)!==null)attacks++;
  await io.wait(400);
 }
 assert.equal(await io.read(0x5e30+slot*128,2),0,'native enemy defeat '+enemy);
 return{enemy,attacks,spells,heals,revives,finishers};
}
export async function recoverGateKey(io,rom,{explain=true}={}){
 assert.equal(await io.read(0x100,2),289);const before=await quantity(io,215);assert.equal(before,0);
 await io.hold(65,8);
 for(let i=0;i<120&&await io.read(0x12a)!==145;i++)await io.tap(256,100);
 assert.equal(await io.read(0x12a),145);await io.shot('bakery-glaze-choice');if(!explain)await io.tap(32,12);await io.tap(256,180);
 await battle(io,[155,255,255,255,255,255,255,255],'bakery-kiln-battle');const combat=await defeat(io,155,{rom,lightning:true});
 await finish(io,async()=>await io.read(0x100,2)===275&&await io.read(0x11f)&&!await io.read(0x126));
 assert.equal(await io.read(0x10000),124);assert.equal(await quantity(io,215),1);assert.equal(await io.read(0x117)&1,0);await io.shot('bakery-gate-key-returned');
 return{explain,combat,item:215,quantity:1,destination:275,story:124};
}
export async function defeatIronKilnback(io,rom,{greet=true}={}){
 assert.equal(await io.read(0x100,2),304);
 if(greet){await io.hold(16,10);await io.tap(256,180);assert.equal(await io.read(0x12a),93);await finish(io);}
 await movement(io).route([[6,25]]);
 // The boss leaves only a narrow passage at x=103..104. A waypoint's usual
 // three-pixel tolerance can stop at x=106, inside his collision boundary.
 const leader=await io.read(0x197,2);
 for(let n=0;n<8&&await io.read(0x1800+leader,2)>104*16;n++)await io.hold(64,1);
 assert.ok(await io.read(0x1800+leader,2)<=104*16,'west edge of Iron Kilnback');
 await movement(io).route([[6,21]]);
 for(let i=0;i<180&&!(await io.read(0x117)&1);i++){
  if(await io.read(0x11f)&&!await io.read(0x126))await io.hold(17,8);else await io.tap(256,100);
 }
 await battle(io,[156,255,255,255,255,255,255,255],'bakery-iron-kiln-battle');const combat=await defeat(io,156,{rom,lightning:true});
 await finish(io,async()=>!(await io.read(0x117)&1)&&await io.read(0x11f)&&!await io.read(0x126));assert.equal(await io.read(0x100ee)&1,1);
 // Align below the stairs, then let their diagonal collision steer the
 // ascent. Re-aiming horizontally on the stairs wedges against their edge.
 await movement(io).route([[7.5,10]]);
 for(let i=0;i<180&&await io.read(0x100,2)===304;i++){
  const n=await io.read(0x197,2),y=await io.read(0x1880+n,2)/16;
  // At the top landing, enter the doorway to the right. Which half-pixel
  // the battle leaves underfoot changes the stairs' horizontal correction.
  await io.hold(y<=104?129:17,1);
 }
 await io.wait(400);assert.equal(await io.read(0x100,2),302);
 await io.shot('bakery-iron-kiln-exit');return{greet,combat,destination:302};
}
export async function defeatFurnaceMaw(io){
 assert.equal(await io.read(0x100,2),301);
 for(let i=0;i<180&&!(await io.read(0x117)&1);i++){
  if(await io.read(0x11f)&&!await io.read(0x126))await io.hold(17,8);else await io.tap(256,100);
 }
 await battle(io,[188,255,255,255,154,255,255,255],'furnace-maw-battle');
 const glaze=await defeat(io,154),maw=await defeat(io,188);
 // The impact briefly enters the overworld before returning to the flight
 // dialogue. Wait for that conversation and the second, playable world entry.
 let aftermath=false;
 for(let i=0;i<320;i++){
  const location=await io.read(0x100,2);
  if(location===261&&await io.read(0x126)&&[107,108,109,110].includes(await io.read(0x12a)))aftermath=true;
  if(aftermath&&location===499)break;
  await io.tap(256,100);
 }
 assert.ok(aftermath,'furnace aftermath conversation');assert.equal(await io.read(0x100,2),499);await io.wait(400);
 assert.equal(await io.read(0x100ec)&128,128);assert.equal(await io.read(0x10000),153);assert.equal(await io.read(0x117)&1,0);
 await io.shot('furnace-escape-world');return{glaze,maw,destination:499,story:153};
}
export async function defeatBuriedFurnace(io,rom){
 assert.equal(await io.read(0x100,2),197);assert.equal(await io.read(0x101d2)&64,0);
 const onions=await quantity(io,197);
 await movement(io).route([[12,44]]);
 for(let i=0;i<180&&!(await io.read(0x117)&1);i++){
  if(await io.read(0x11f)&&!await io.read(0x126))await io.hold(17,8);else await io.tap(256,100);
 }
 await battle(io,[189,255,255,255,255,255,255,255],'buried-furnace-battle');const combat=await defeat(io,189,{rom,healParty:true});
 await finish(io,async()=>!(await io.read(0x117)&1)&&await io.read(0x11f)&&!await io.read(0x126));assert.equal(await io.read(0x101d2)&64,64);
 assert.equal(await quantity(io,197),onions-combat.heals);await io.shot('buried-furnace-defeated');return{combat};
}
