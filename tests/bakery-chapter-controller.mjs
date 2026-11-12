import assert from'node:assert/strict';
import{movement}from'./medina-controller.mjs';
import{walkWorld,enterWorldLocation}from'./world-controller.mjs';
export async function quantity(io,id){const b=await io.bytes(0x2400,512);return Array.from(b.slice(0,256)).reduce((n,x,i)=>n+(x===id?b[i+256]:0),0);}
const playable=async io=>await io.read(0x11f)&&!await io.read(0x126);
async function finish(io,predicate=()=>playable(io),limit=180){for(let n=0;n<limit&&!await predicate();n++)await io.tap(256,100);assert.ok(await predicate(),'Bakery chapter control handoff');}
// A connected campaign can supply its own battle tactics (useBakeryFight);
// the chapter tests keep the default of confirming each native command.
let fightHook=null;export function useBakeryFight(fn){fightHook=fn;}
async function fight(io){await io.wait(400);const formation=Array.from(await io.bytes(0xaf02,8));if(fightHook)await fightHook();for(let n=0;n<160&&(await io.read(0x117)&1);n++)await io.tap(256,100);assert.equal(await io.read(0x117)&1,0);await io.wait(120);return formation;}
export async function arriveAtBakery(io){
 assert.equal(await io.read(0x100,2),273);assert.equal(await io.read(0x10000),108);assert.equal(await quantity(io,215),1);const encounters=[],name=await io.bytes(0x2c23+5*6,6);let named=false;
 for(let n=0;n<500;n++){
  if(await io.read(0x117)&1)encounters.push(await fight(io));
  else if(!named&&await io.read(0x12a)===17&&await io.read(0x126)){for(let page=0;page<12&&await io.read(0x126);page++)await io.tap(256,100);assert.equal(await io.read(0x126),0);await io.wait(600);await io.hold(8,8);await io.wait(360);named=true;}
  else await io.tap(256,100);
  if(await io.read(0x10000)===111&&await playable(io))break;
 }
 assert.ok(named,'Mongo naming screen');assert.deepEqual(await io.bytes(0x2c23+5*6,6),name,'the naming screen preserves Mongo');assert.equal(await io.read(0x10000),111);assert.equal(encounters.length,2);assert.ok(await playable(io));await io.shot('bakery-mountain-friends');
 await movement(io).route([[24,6],[24,13]]);for(let n=0;n<200&&await io.read(0x100,2)===273;n++)await io.hold(33,1);await io.wait(400);assert.equal(await io.read(0x100,2),274);
 let lowerPatrol=false,patrolInput=32;
 for(let n=0;n<1600&&await io.read(0x100,2)===274;n++){
  if(await io.read(0x117)&1)encounters.push(await fight(io));
  else if(await io.read(0x11f)){
   // The last four imps patrol tiles54–57. Dashing straight through can
   // miss them at a different native RNG phase. Walk their approach until
   // contact instead of racing into the world exit or changing their state.
   const object=await io.read(0x197,2),y=await io.read(0x1880+object,2);
   if(encounters.length===5&&(lowerPatrol||y>=54*256)){
    lowerPatrol=true;if(y>=56*256)patrolInput=16;if(y<=54*256)patrolInput=32;
    await io.hold(patrolInput,1);
   }else await io.hold(33,1);
  }else await io.tap(256,100);
 }
 await io.wait(400);assert.equal(await io.read(0x100,2),499);assert.equal(encounters.length,6);
 await walkWorld(io,[[49,91],[55,91],[55,87],[59,87],[59,80],[60,80],[60,78],[62,78],[67,78],[67,73],[65,73],[65,63],[60,63],[60,62]]);
 await enterWorldLocation(io,275);await movement(io).walk(128,230);await io.hold(16,8);
 await finish(io,async()=>await io.read(0x100,2)===280);await io.wait(400);await finish(io);assert.equal(await io.read(0x10000),111);assert.equal(await quantity(io,215),1);await io.shot('bakery-feast-welcome');
 return{encounters,destination:280,story:111};
}
export async function feastWithBakery(io){
 assert.equal(await io.read(0x100,2),280);assert.equal(await quantity(io,215),1);assert.equal(await quantity(io,220),0);
 const{walk}=movement(io);
 for(const[x,y]of[[328,160],[328,240],[136,240],[136,216],[104,216],[104,160],[115,160]])await walk(x,y);
 await io.hold(128,2);await io.tap(256,100);await finish(io);for(let n=0;n<220&&await io.read(0x10216)!==1;n++)await io.wait(30);assert.equal(await io.read(0x10216),1,'feast companion first performance');
 for(const[x,y]of[[104,160],[104,216],[136,216],[136,240],[200,240]])await walk(x,y);await io.hold(16,3);for(let n=0;n<8;n++)await io.tap(256,100);
 assert.ok(await io.read(0x10214)>0,'feast companion finishes dancing');
 for(const[x,y]of[[328,240],[328,160],[256,160]])await walk(x,y);await io.hold(64,3);
 let contest=false;
 for(let n=0;n<800&&await io.read(0x100,2)===280;n++){
  const id=await io.read(0x12a),box=await io.read(0x126);
  if(id===94&&box){await io.tap(256,30);contest=true;}
  else if(contest&&!box)await io.tap(256,3);
  else if(id===96&&box){await io.tap(32,12);await io.tap(256,100);}
  else await io.tap(256,100);
 }
 assert.ok(contest);assert.equal(await io.read(0x100,2),279);await io.wait(400);
 await finish(io,async()=>await io.read(0x10000)===117&&await io.read(0x100,2)===275);await io.wait(400);
 assert.equal(await quantity(io,215),0,'the Gate Key is stolen');assert.equal(await quantity(io,220),1,'Mongo gives Dreamstone');await io.shot('bakery-stolen-key-morning');
 return{destination:275,story:117,dreamstone:1,gateKey:0};
}
export async function recruitMongo(io){
 assert.equal(await io.read(0x100,2),275);assert.equal(await io.read(0x10000),117);
 for(const[x,y]of[[128,230],[160,230],[160,191]])await movement(io).walk(x,y);await io.hold(128,60);
 // The repeating sleep bubble can consume a slow, phase-aligned A press.
 // Short presses catch the ordinary interaction window without changing it.
 for(let n=0;n<80&&await io.read(0x10210)===0;n++)await io.tap(256,10);assert.equal(await io.read(0x10210),1);
 await finish(io,async()=>await io.read(0x10000)===120);await io.wait(500);assert.deepEqual(Array.from(await io.bytes(0x2980,3)),[0,5,1]);await io.shot('bakery-mongo-party-menu');await io.tap(1,300);await finish(io);
 assert.ok(await io.read(0x29af)&4,'Mongo is available');assert.equal(await quantity(io,215),0);assert.equal(await quantity(io,220),1);await io.shot('bakery-mongo-recruited');
 return{destination:275,story:120,party:Array.from(await io.bytes(0x2980,3))};
}

export async function walkToBakeryForest(io){
 assert.equal(await io.read(0x100,2),275);assert.equal(await io.read(0x10000),120);
 for(const[x,y]of[[128,230],[128,290]])await movement(io).walk(x,y);
 for(let n=0;n<100&&await io.read(0x100,2)===275;n++)await io.hold(33,1);
 await io.wait(400);assert.equal(await io.read(0x100,2),499);
 await walkWorld(io,[[65,63],[65,73],[68,73],[68,90]]);
 // The chapter's native world script changes the northern entrance from
 // the default empty forest to the Gingy event's location 282.
 await enterWorldLocation(io,282);await io.shot('bakery-forest-arrival');
}

export async function reconcileWithGingy(io){
 assert.equal(await io.read(0x100,2),282);assert.equal(await io.read(0x10000),120);
 const key=await quantity(io,215),stone=await quantity(io,220);
 for(const[x,y]of[[112,64],[112,144],[184,136],[192,112]])await movement(io).walk(x,y);
 await io.hold(128,20);let listening=false;
 await finish(io,async()=>{
  if(!listening&&await io.read(0x126)&&await io.read(0x12a)===9){
   assert.equal(await io.read(0xf01+6*2),201,'Mongo listens with folded arms');
   assert.equal(await io.read(0xf01+19*2),2,'Gingy remains upright');
   await io.shot('bakery-mongo-listens');listening=true;
  }
  return await io.read(0x10000)===123&&await playable(io);
 });
 assert.ok(listening,'Gingy explains himself while Mongo listens');
 assert.equal(await quantity(io,215),key);assert.equal(await quantity(io,220),stone);
 assert.equal(await io.read(0x100,2),282);await io.shot('bakery-gingy-reconciled');
 return{destination:282,story:123,gateKey:key,dreamstone:stone};
}
