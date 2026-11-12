import assert from 'node:assert/strict';
import {reachOpeningOverworld} from './opening-controller.mjs';
import {walkWorld,enterWorldLocation} from './world-controller.mjs';
import {movement} from './medina-controller.mjs';

// Fresh-save, controller-only route through the native opening. The io surface
// intentionally contains reads, ordinary buttons, waits and screenshots only.
// In particular, the gate assertion below must never be replaced by a jump,
// loadout, savestate or direct story/inventory write.
export async function runCampaignOpening(io,evidence={stages:[]}){
 const{read,bytes,hold,tap,wait,shot}=io,{walk}=movement(io),lines=new Set();
 evidence.scope='Fresh SRAM; real controller input and WRAM reads only; no diagnostic progression.';
 evidence.writesAfterFreshStart=0;evidence.savestatesUsed=0;evidence.diagnosticJumps=0;
 const location=()=>read(0x100,2),story=()=>read(0x10000),party=async()=>Array.from(await bytes(0x2980,3));
 const line=async()=>{const id=await read(0x12a);lines.add(id);return id;};
 const playable=async()=>await read(0x11f)===1&&await read(0x126)===0;
 const position=async()=>{const n=await read(0x197,2);return{x:await read(0x1800+n,2)/16,y:await read(0x1880+n,2)/16};};
 const item=async id=>(await bytes(0x2400,256)).indexOf(id);
 async function stage(name,extra={}){
  const row={name,location:await location(),story:await story(),party:await party(),line:await line(),...extra};
  evidence.stages.push(row);await shot(name);console.log(JSON.stringify(row));return row;
 }
 async function advanceUntil(ready,max=80,{confirm=true}={}){
  for(let i=0;i<max;i++){
   await line();if(await ready())return;
   if(confirm)await tap(256,50);else await wait(30);
  }
  await line();assert.ok(await ready(),'native scene did not reach requested state');
 }
 async function finishDialogue(max=50){
  await advanceUntil(playable,max);assert.ok(await playable());
 }
 async function choose(id,first,target){
  let ready=false;evidence.choiceTrace??=[];
  for(let i=0;i<60;i++){
   const current=await line(),flags=[await read(0x126),await read(0x162),await read(0x164),await read(0x163)];
   evidence.choiceTrace.push({id,current,flags});if(evidence.choiceTrace.length>160)evidence.choiceTrace.shift();
   if(current===id&&flags[0]&&flags[1]===2&&flags[2]===first){ready=true;break;}
   // Once the native option rows are visible, let the cursor initialize
   // instead of blindly confirming the default before observing it.
   if(current===id&&flags[0]===1&&flags[1]===2)await wait(12);
   else await tap(256,50);
  }
  assert.ok(ready,'native dialogue choice '+id+' did not initialize');
  for(let i=0;i<8&&await read(0x163)!==target;i++)await tap(await read(0x163)<target?32:16,10);
  assert.equal(await read(0x163),target,'native dialogue cursor');await tap(256,70);
 }
 async function route(points){for(const[x,y]of points)await walk(x,y);}
 async function fight(name){
  assert.ok(await read(0x117)&1,'expected native encounter '+name);await wait(350);
  const formation=Array.from(await bytes(0xaf02,8));await shot(name);
  for(let i=0;i<220&&(await read(0x117)&1);i++)await tap(256,65);
  assert.equal(await read(0x117)&1,0,'ordinary Attack menus win '+name);
  assert.ok(await read(0x2603,2)>0,'Shrek survives '+name);
  for(let i=0;i<40&&(await read(0x126)||!await read(0x11f));i++)await tap(256,60);
  evidence.battles??=[];evidence.battles.push({name,formation:formation.filter(id=>id!==255),hp:await read(0x2603,2)});
 }
 async function northToTeleporter(){
  for(let i=0;i<300&&await location()===439;i++){
   if(await playable())await hold(16,1);else await tap(256,50);
  }
  await wait(400);assert.equal(await location(),8);
 }
 async function returnToFairSquare(){
  await route([[392,240],[392,330]]);
  for(let i=0;i<300&&await location()===439;i++){
   if(await playable())await hold(33,1);else await tap(256,50);
  }
  await wait(400);assert.equal(await location(),5);
 }

 await reachOpeningOverworld(io);
 assert.equal(await story(),3);assert.deepEqual(await party(),[0,128,128]);
 await stage('fresh-opening-overworld',{donkeyNamed:true});

 await walkWorld(io,[[51,35],[51,29],[53,29],[53,28]]);await enterWorldLocation(io,5);await wait(400);
 await stage('duloc-fair-arrival');
 // The fountain and stalls require the real west inner/outer walkway. These
 // points were all replayed from the fresh opening without moving WRAM actors.
 await route([[392,600],[360,600],[360,568],[328,568],[328,520],[200,520],[200,440],[328,440],[328,400],[392,400],[392,360]]);
 for(let i=0;i<100&&await location()===5;i++)await hold(16,1);
 await wait(400);assert.equal(await location(),439);await stage('fiona-festival-arrival');

 // Walk into Fiona; her native collision scene runs without a scripted event.
 for(let i=0;i<900&&await line()!==36;i++){
  const p=await position(),fx=await read(0x1806,2)/16,fy=await read(0x1886,2)/16,dx=fx-p.x,dy=fy-p.y;
  await hold((Math.abs(dx)>1?(dx>0?128:64):0)|(Math.abs(dy)>1?(dy>0?32:16):0),1);
 }
 assert.equal(await line(),36);
 await advanceUntil(async()=>await story()===6&&await playable(),50);
 for(const id of[36,37,38,39])assert.ok(lines.has(id),'Fiona meeting dialogue '+id);
 await stage('fiona-pendant-lost');

 await route([[544,240],[544,144],[510,144]]);await hold(64,3);await tap(256,240);
 assert.ok(await item(214)>=0,'Plot Pendant entered the real inventory');assert.equal(await read(0x10054)&32,32);
 await stage('festival-pendant-recovered',{inventoryItem:214});

 await walk(544,240);
 for(let i=0;i<1000&&await line()!==41;i++){
  const p=await position(),fx=await read(0x1806,2)/16,fy=await read(0x1886,2)/16,dx=fx-p.x,dy=fy-p.y;
  if(Math.abs(dx)<24&&Math.abs(dy)<24){await hold(Math.abs(dx)>Math.abs(dy)?(dx>0?128:64):(dy>0?32:16),3);await tap(256,70);}
  else await hold((Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0),1);
 }
 assert.equal(await line(),41);await choose(41,1,1); // Yes, return her pendant.
 // Confirm the default Sure branch and verify its unique follow-up. Unlike
 // the pendant window, this native question does not expose cursor mode 2.
 await advanceUntil(async()=>await line()===45,40);assert.ok(!lines.has(44),'Sure must bypass the refusal follow-up');
 await advanceUntil(async()=>await line()===46,40);assert.deepEqual(await party(),[0,128,128]);
 for(let i=0;i<20&&await read(0x126);i++)await tap(256,60);
 await wait(300);await stage('fiona-naming-screen');
 for(let i=0;i<5&&await story()===6;i++)await tap(8,300); // Start confirms the real native naming screen.
 await advanceUntil(async()=>await story()===8&&await playable(),50);
 assert.deepEqual(await party(),[0,1,128]);for(const id of[41,43,45,46,47,48])assert.ok(lines.has(id),'Fiona recruitment dialogue '+id);
 await stage('fiona-recruited',{company:'Sure',pendantReturned:true});

 // Attempt the north exit before shopping. Besides being the natural route,
 // this proves the native setup gate and its exact hint instead of skipping it.
 await walk(384,240);
 for(let i=0;i<300&&await line()!==59;i++){
  if(await playable())await hold(17,1);else await tap(256,50);
 }
 await hold(16,3);await tap(256,120);assert.equal(await line(),59);await finishDialogue();
 await stage('festival-pre-vendor-hint');

 await returnToFairSquare();
 await route([[392,400],[328,400],[328,440],[200,440],[200,520],[328,520],[328,568],[400,568]]);
 for(let i=0;i<8&&!(await read(0x10055)&128);i++){await line();await hold(16,3);await tap(256,100);await line();}
 assert.equal(await read(0x10055)&128,128);await finishDialogue();
 for(const id of[60,61])assert.ok(lines.has(id),'required fair vendor dialogue '+id);
 await stage('festival-vendor-complete',{setupRelease:true});

 await route([[392,600],[360,600],[360,568],[328,568],[328,520],[200,520],[200,440],[328,440],[328,400],[392,400],[392,360]]);
 for(let i=0;i<100&&await location()===5;i++)await hold(16,1);
 await wait(400);assert.equal(await location(),439);
 for(let i=0;i<1600&&await location()===439;i++){
  if(await playable())await hold(17,1);else await tap(256,40);
  if(await line()===67&&await playable())break;
 }
 assert.equal(await line(),67);for(const id of[63,66,67])assert.ok(lines.has(id),'Fiona candy dialogue '+id);
 await stage('festival-candy-complete');
 // Fiona's candy scene leaves Shrek to the right of the stairs. Walk around
 // her and align with the actual north connector.
 await route([[456,160],[384,160],[384,112]]);await northToTeleporter();
 await stage('donkey-teleporter-arrival');

 await advanceUntil(async()=>await line()===81&&await playable(),12);
 await route([[136,160],[72,160],[72,128]]);await hold(16,40);
 await advanceUntil(async()=>await line()===87&&await playable()&&(await party())[1]===128,80);
 assert.equal(await story(),10);assert.deepEqual(await party(),[0,128,128]);
 for(const id of[85,86,89,87])assert.ok(lines.has(id),'teleporter first-ride dialogue '+id);
 await stage('shrek-teleporter-ride',{firstRideComplete:true});

 // Fiona becomes an ordinary event actor at the bottom of the scene. Speak to
 // her before touching either pad: this starts her real turn, the pendant glow
 // and the accident. Riding again immediately is only the optional repeat.
 assert.equal(Math.round(await read(0x181c,2)/16),120,'Fiona event actor x');
 assert.equal(Math.round(await read(0x189c,2)/16),192,'Fiona event actor y');
 await hold(32,30);await hold(128,72);await hold(32,20);await hold(32,3);await tap(256,100);
 assert.equal(await line(),90,'Fiona starts her own teleporter turn');
 await advanceUntil(async()=>await story()===12&&await line()===102&&await playable(),150);
 for(const id of[90,95,97,101,103,106,110,111])assert.ok(lines.has(id),'Fiona accident/gate dialogue '+id);
 assert.deepEqual(await party(),[0,128,128]);
 await stage('fiona-vanished',{demonstrationCompleted:true,gateDiscussion:true});

 // Close Donkey's line 102, then walk directly to Fiona's left-pad pendant.
 // It is recovered by the native pad trigger, followed by lines 113-120 and
 // the original gate animation. No NPC or inventory writes are involved.
 await tap(256,60);await hold(64,40);await hold(16,50);await hold(16,3);await tap(256,100);await hold(16,32);
 assert.ok(await item(214)>=0,'recovered Fiona\'s pendant from the left pad');
 await stage('gate-pendant-recovered',{inventoryItem:214});
 await advanceUntil(async()=>await location()!==8,180);
 for(const id of[113,114,115,116,117,118,119,120])assert.ok(lines.has(id),'gate conversation '+id);
 await wait(800);assert.equal(await location(),113,'gate arrives in Truce Canyon');
 assert.equal(await story(),64);assert.deepEqual(await party(),[0,128,128]);
 await stage('truce-canyon-arrival',{gateTransition:true});

 // First canyon screen: real encounter, then the open west connector.
 await route([[136,128],[136,96]]);
 for(let i=0;i<400&&!(await read(0x117)&1);i++)await hold(33,1);
 for(let i=0;i<500&&!(await read(0x117)&1);i++)await hold(65,1);
 await fight('truce-canyon-imps');
 await route([[136,128],[120,128],[96,128],[64,128],[32,128]]);
 for(let i=0;i<200&&await location()===113;i++)await hold(65,1);
 await wait(500);assert.equal(await location(),112);await stage('truce-canyon-west');

 // Climb the east ladder, use the partial-tile forest gap to the bridge, and
 // win the second ordinary encounter. The bridge fight is mandatory here.
 await route([[456,216],[456,192],[456,160],[456,128],[456,96],[408,96],[408,80],[392,80],[376,80],[344,80]]);
 for(let i=0;i<500&&!(await read(0x117)&1);i++)await hold(65,1);
 await fight('truce-bridge-imps');
 await route([[280,80],[280,128]]);
 // Ordinary diagonal input follows the native cliff slides to the second
 // ladder. Continue down its southern terrace and turn right to the world map.
 await hold(97,100);await hold(161,100);await hold(32,500);await hold(128,150);await hold(32,100);
 await wait(500);assert.equal(await location(),497,'native canyon route reaches the medieval overworld');
 assert.equal(await story(),12);assert.deepEqual(await party(),[0,128,128]);
 await stage('medieval-overworld',{gateTransition:true,canyonComplete:true});
 evidence.lines=[...lines].sort((a,b)=>a-b);evidence.destination=497;evidence.complete=true;
 return evidence;
}
