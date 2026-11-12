import assert from 'node:assert/strict';
import {walkWorld,enterWorldLocation} from './world-controller.mjs';
import {movement} from './medina-controller.mjs';
import {routeKit} from './route-kit.mjs';

// Fresh-save continuation from Fiona's restoration (location 122, story 33):
// home through the forest, canyon and gate, a stop at the Duloc market, the
// castle arrest and trial, the cell, Donkey's rescue and the prison climb to
// the tank bridge (location 28, story 46). Controller input and reads only.
export async function runHomecomingLeg(io,evidence={stages:[]},rom){
 const{read,hold,tap,wait}=io,{walk}=movement(io);
 const k=routeKit(io,evidence,rom),{location,story,party,position,busy,stage,settle,battle,tacticalBattle,go,replay,healAll}=k;
 assert.equal(await location(),122);assert.equal(await story(),33);

 // Leave Fiona's chamber and descend the right tower to the throne room.
 const chamberKeys={up:17,down:33,left:65,right:129,'up-left':81,'up-right':145,'down-left':97,'down-right':161};
 const chamberExit=[['down-right',671,807.9375],['down-right',694,835.9375],['down-left',673,863.9375],['down',679,901.9375],['down',679,937.9375],['down-right',715,973.9375],['right',751,973.9375],['right',787,973.9375],['up-right',817,943.9375],['right',853,943.9375],['up-right',863,933.9375],['up',863,897.9375],['up',863,861.9375],['up-right',871,825.9375],['up',871,789.9375],['up',872,763.9375]];
 async function nudge(x,y){
  for(let i=0;i<24;i++){
   const p=await position(),dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<1&&Math.abs(dy)<1)return;
   if(await busy()){await tap(256,60);continue;}
   await hold((Math.abs(dx)>=1?(dx>0?128:64):0)|(Math.abs(dy)>=1?(dy>0?32:16):0),1);await wait(2);
  }
 }
 for(const[name,x,y]of chamberExit){await hold(chamberKeys[name],18);await wait(12);if(await busy()){await tap(256,60);await wait(30);}await nudge(x,y);}
 for(let i=0;i<4&&await location()===122;i++){await hold(17,30);await wait(200);}
 for(let floor=0;floor<4&&await location()!==120;floor++){await hold(65,40);await hold(17,100);await wait(500);}
 assert.equal(await location(),120,'native tower descent to the throne room');
 await go([[600,416],[632,500],[504,500],[504,700],[504,860]],'throne room');await hold(32,100);await wait(500);
 assert.equal(await location(),497,'native castle exit');await healAll();await stage('medieval-castle-exit',{party:await party()});

 // Guardia Forest south, as on the medieval route's return leg.
 await walkWorld(io,[[35,31]]);await enterWorldLocation(io,119);await wait(500);
 const forestReturn=[['down',296,99.9375],['down-left',284,111.9375],['left',248,111.9375],['left',212,111.9375],['down-left',176,135.9375],['down',168,163.9375],['down-right',184,199.9375],['down',176,221.9375],['down-right',196,255.9375],['down-right',232,271.9375],['down-right',268,293.9375],['down-right',304,329.9375],['down',304,365.9375],['down',304,399.9375],['down-left',272,407.9375],['down-left',236,427.9375],['down-left',200,447.9375],['down-left',164,479.9375],['down-left',128,503.9375],['down-right',136,539.9375],['down-left',100,575.9375],['right',128,575.9375],['down-right',150,611.9375],['right',186,611.9375],['up-right',216,575.9375],['right',236,559.9375],['right',272,559.9375],['down-right',308,589.9375],['down',308,625.9375],['down',308,661.9375],['down',308,697.9375],['down',308,733.9375]];
 async function point(x,y){for(let a=0;a<8;a++){try{await walk(x,y);return;}catch(error){if(await read(0x117)&1){await battle('forest');continue;}throw error;}}assert.fail('too many encounters at '+x+','+y);}
 async function push(x,y){for(let a=0;a<8;a++){try{await walk(x,y);return;}catch(error){if(await read(0x117)&1){await battle('forest');continue;}assert.match(error.message,/Medina waypoint/);return;}}}
 async function step(name,x,y){
  for(let attempt=0;attempt<4;attempt++){
   const start=await position();let fought=false;
   for(let walked=0;walked<18;){
    if(await read(0x117)&1){await battle('forest');fought=true;break;}
    if(await busy()){await tap(256,60);continue;}
    await hold(chamberKeys[name],1);walked++;
   }
   if(fought){await point(Math.round(start.x),Math.round(start.y));await nudge(start.x,start.y);continue;}
   await wait(12);await nudge(x,y);return;
  }
  assert.fail('too many encounters in one forest step');
 }
 for(const[name,x,y]of forestReturn)await step(name,x,y);
 for(let i=0;i<12&&await location()===119;i++){await wait(60);if(await read(0x117)&1){await battle('forest');continue;}if(await busy()){await tap(256,60);continue;}await hold(chamberKeys.down,18);}
 await wait(500);assert.equal(await location(),497,'native forest south exit');

 // East to the canyon, up its terraces to the gate.
 await walkWorld(io,[[35,39],[37,39],[41,39],[51,39],[51,37],[53,37],[54,37],[54,31],[55,31],[55,28],[55,27],[55,26]]);
 await healAll();await enterWorldLocation(io,112);await wait(500);await stage('canyon-return');
 await replay([['U',328,447],['R',336,447],['UL',288,415],['U',288,367],['L',240,367],['U',224,335],['DL',176,383],['L',128,383],['U',135,361],['U',135,337],['U',135,313],['UR',165,273],['U',165,225],['UR',213,177],['U',213,151],['R',251,141],['R',283,125],['UR',315,77],['R',363,77],['DR',411,99],['DR',455,143],['D',455,167],['D',455,192],['DR',471,240],['UR',497,192],['U']],'canyon climb');
 assert.equal(await location(),113,'native canyon connector to the gate');
 for(let i=0;i<300&&await location()===113;i++){if(await read(0x117)&1){await battle('gate');continue;}await tap(256,60);}
 await wait(400);await settle();
 assert.equal(await location(),8,'the gate returns the party to the present');assert.equal(await story(),39);
 await stage('present-gate-arrival');

 // Through the festival grounds to the overworld.
 await go([[120,180],[120,215],['down',80]],'gate square');await wait(400);await settle();
 assert.equal(await location(),439);
 await go([[392,170],[392,240],[392,330],['down',90]],'festival grounds');await wait(400);
 assert.equal(await location(),5);
 await go([[392,360],[392,400],[328,400],[328,440],[200,440],[200,520],[328,520],[328,568],[360,568],[360,600],[392,600],[400,604],['down',150]],'festival entrance');
 await wait(400);assert.equal(await location(),496,'present overworld');

 // Restock and re-equip at the Duloc market, as a player with this much gold
 // would: Shrek's Ogre Chopper, Fiona's HeavyMetal, Mail Call, two Lawsuits,
 // three HelmDeeps and sixty Onions (the future has no shop on the way to
 // its first boss), all at native prices.
 await walkWorld(io,[[53,30],[53,31],[51,31],[51,34],[47,34],[47,35],[46,35],[46,36],[45,36]]);
 await enterWorldLocation(io,17);await wait(400);
 const inventory=async()=>{const ids=await io.bytes(0x2400,64),counts=await io.bytes(0x2500,64),o={};Array.from(ids).forEach((v,i)=>{if(v)o[v]=counts[i];});return o;};
 const before=await inventory(),goldBefore=await read(0x2c53,3);
 await go([[352,700],[356,690]],'market counter');await hold(16,30);
 for(let i=0;i<10&&await read(0xd13)!==47;i++)await tap(256,180);
 assert.equal(await read(0xd13),47,'native market menu opens');
 await wait(300);await tap(256,120);let row=0;
 const order=[[0,3,1],[1,18,1],[2,93,1],[3,94,2],[4,125,3],[5,189,60]];
 for(const[r,item,quantity]of order){
  for(;row<r;row++)await tap(32,60);
  await tap(256,120);for(let i=1;i<quantity;i++)await tap(128,20);await tap(256,180);await wait(60);
 }
 const after=await inventory();
 for(const[,item,quantity]of order)assert.equal(after[item]??0,(before[item]??0)+quantity,'bought item '+item);
 assert.equal(await read(0x2c53,3),goldBefore-(800+850+520+560*2+200*3+10*60),'native market prices');
 for(let i=0;i<3;i++)await tap(256,100);for(let i=0;i<4;i++)await tap(1,100);
 for(let i=0;i<10&&await busy();i++)await tap(256,60);
 for(const[member,slot,item]of[[0,0,3],[0,2,93],[0,1,125],[1,0,18],[1,2,94],[1,1,125]])await k.equip(member,slot,item);
 await stage('duloc-market-restock',{onions:after[189],equipment:{shrek:[3,93,125],fiona:[18,94,125]}});
 await go([[352,720],['down',80]],'market exit');await wait(400);assert.equal(await location(),496);
 await healAll();

 // The present Guardia Forest north to the castle (same map as the medieval
 // forest), then the arrest, trial, verdict and cell.
 await walkWorld(io,[[46,36],[45,36],[45,38],[41,38],[41,37],[37,37],[37,36],[36,36],[36,35],[35,35],[35,34]]);
 await enterWorldLocation(io,19);await wait(400);
 async function route(points){for(const[x,y]of points)await point(x,y);}
 async function holdFight(keys,frames){await hold(keys,frames);if(await read(0x117)&1)await battle('forest');}
 await route([[312,650],[312,600],[312,550]]);await push(312,500);await holdFight(97,200);
 await route([[88,600],[88,500]]);await push(88,400);
 await route([[136,500],[136,450]]);await push(136,400);
 await route([[184,450]]);await push(184,400);await holdFight(81,200);
 await route([[136,416]]);await push(136,400);
 await route([[184,416]]);await push(184,400);await holdFight(145,100);
 await route([[312,288]]);await push(312,250);
 await route([[280,288]]);await push(280,250);
 await route([[280,336]]);await push(248,336);
 await route([[280,384],[248,384]]);await push(248,336);
 await route([[216,384]]);await push(216,336);await holdFight(97,100);
 await route([[43,500],[136,500],[136,450]]);await push(136,400);
 await route([[104,450]]);await push(104,400);await holdFight(81,100);
 await push(72,400);await route([[104,408]]);await push(104,400);
 await route([[136,408]]);await push(136,400);
 await route([[136,450],[168,450]]);await push(168,400);
 await route([[200,450]]);await push(200,400);await holdFight(145,100);
 await route([[357,336],[400,336]]);await push(400,288);
 await route([[368,336]]);await push(368,288);
 await route([[336,336],[336,288]]);await push(336,250);
 await route([[304,288]]);await push(304,250);
 await route([[272,288]]);await push(272,250);await holdFight(81,100);
 await route([[163,200],[163,150],[163,100]]);await push(163,50);await holdFight(81,100);
 await push(111,50);await route([[111,150],[59,150]]);await push(59,100);
 await route([[163,150],[163,100]]);await push(163,50);await holdFight(145,100);await wait(500);
 assert.equal(await location(),496,'present forest north exit');
 await walkWorld(io,[[35,31],[35,29],[35,27],[35,25]]);await enterWorldLocation(io,21);await wait(500);
 await stage('present-castle-arrival');
 const seen=new Set();
 for(let i=0;i<1600&&await story()!==46;i++){
  seen.add(await location());
  if(await read(0x117)&1){await battle('prison');continue;}
  await tap(256,60);
 }
 await wait(120);await settle();
 for(const id of[27,71,30])assert.ok(seen.has(id)||await location()===id,'native trial and prison location '+id);
 assert.equal(await story(),46,'Donkey’s execution-room rescue');assert.deepEqual((await party()).filter(id=>id<8),[0,2]);
 await stage('donkey-execution-rescue');await healAll();
 // Donkey wears the spare Lawsuit and HelmDeep bought at the market.
 await k.equip(1,2,94);await k.equip(1,1,125);

 // The prison climb: recorded held-direction paths through the corridor
 // (72), the outer tower stair (28) and the office (29) to the tank bridge.
 await replay([['DL',104,201],['U']],'execution room');assert.equal(await location(),72);await settle();
 await replay([['DL',598,119],['DL',584,159],['UR',626,111],['L',600,111],['U',600,95],['DR',648,143],['D',648,191],['DR',680,225],['D',680,273],['DL',632,319],['L',584,319],['UL',536,279],['UL',496,245],['U',503,197],['UL',491,149],['UL',443,119],['L',395,119],['L',347,119],['L',299,119],['DL',259,159],['L',211,159],['UL',183,119],['U']],'prison corridor');
 assert.equal(await location(),28);await settle();
 await replay([['RRR',264,143,72],['RRR',456,143,72],['DL',424,161,72],['LLL',234,159,72],['UL',186,121,72],['LLL',638,415,28],['L',590,415,28],['LLL',398,415,28],['LLL',206,415,28],['LLL',392,695,72],['UUU',312,607,72],['L',287,624,72],['UUU',287,552,72],['R',335,552,72],['RRR',904,199,72],['UUU',950,119,72],['LLL']],'prison stairs');
 assert.equal(await location(),29,'native prison office');await settle();
 await replay([['DL',142,391,29],['UL',94,355,29],['UUU',88,187,29],['UUU',103,95,29],['L']],'office stair');
 assert.equal(await location(),28,'native upper tower walkway');await settle();
 await stage('tank-bridge',{hp:[await read(0x2603,2),await read(0x26a3,2)]});
 await healAll();

 // The Duloc Tank: walk west along the bridge into the native ambush. The
 // Repair Head heals the chassis, so it falls first, then the wheel.
 for(let i=0;i<2000&&!(await read(0x117)&1);i++){if(await busy()){await tap(256,40);continue;}await hold(65,8);}
 await tacticalBattle('Duloc Tank',[173,148,147]);
 for(let i=0;i<400&&await read(0x1021a)!==1;i++){if(await read(0x117)&1){await wait(30);continue;}await tap(256,60);}
 assert.equal(await read(0x1021a),1,'the bridge collapses after the tank');
 await settle();await stage('duloc-tank-defeated',{onions:await read(0x2501)});
 // The escape: off the collapsed bridge into the castle, past the gate guards
 // to the great hall, where Fiona confronts Harold and joins (story 48).
 await replay([['LLL',74,159,28],['LLL',136,119,489],['LLL']],'collapsed bridge');
 assert.equal(await location(),21,'native passage back into the castle');
 for(let i=0;i<200&&(await position()).y<886;i++){
  if(await read(0x117)&1){await battle('castle guards');continue;}
  if(await busy()){await tap(256,60);continue;}
  await hold(32,10);
 }
 await go([[300,890],[400,880],[504,870],[504,840]],'great hall');
 for(let i=0;i<300&&await location()===21;i++){if(await read(0x117)&1){await battle('great hall');continue;}await tap(256,100);}
 await wait(300);await settle(100);
 assert.equal(await location(),19,'the escape continues into the forest');assert.equal(await story(),48);
 assert.deepEqual((await party()).filter(id=>id<8),[0,2,1],'Fiona joins the escape');
 await stage('fiona-confronts-harold',{fionaJoined:true});

 // The forest pursuit ends at a gate that opens to the future (story 51).
 await replay([['RRR',529,102,19],['RRR',623,95,19],['DR',665,127,19],['RRR']],'escape forest');
 assert.equal(await location(),20,'native forest connector');
 for(let i=0;i<300&&await story()!==51;i++){if(await read(0x117)&1){await battle('pursuit');continue;}await tap(256,100);}
 await wait(600);assert.equal(await story(),51,'the pursuit ends at the gate');
 for(let i=0;i<90&&await read(0x10212)!==1;i++){
  const p=await position(),dx=152-p.x,dy=175-p.y;
  await hold(Math.abs(dx)>2?(dx>0?128:64):Math.abs(dy)>2?(dy>0?32:16):256,4);
 }
 for(let i=0;i<120&&await location()!==208;i++)await tap(256,100);
 await wait(240);await settle(60);
 assert.equal(await location(),208,'the gate opens to the future');
 assert.deepEqual((await party()).filter(id=>id<8),[0,2,1]);
 await stage('future-arrival',{story:await story()});
 evidence.destination=208;evidence.storyReached=51;
 return evidence;
}
