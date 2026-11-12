import assert from 'node:assert/strict';
import {runCampaignOpening} from './campaign-opening-controller.mjs';
import {walkWorld,enterWorldLocation} from './world-controller.mjs';
import {movement} from './medina-controller.mjs';
import {chooseNativeTech} from './battle-controller.mjs';

// Fresh-save continuation through the native Guardia Forest and castle
// introduction. Discovery savestates are never used by this accepted driver.
export async function runCampaignMedieval(io,evidence={stages:[]},rom){
 const{read,bytes,hold:rawHold,tap,wait,shot}=io,{walk}=movement(io);
 evidence.scope='Fresh-save continuation from medieval overworld; controller input and reads only.';
 evidence.writesAfterFreshStart=0;evidence.savestatesUsed=0;evidence.diagnosticJumps=0;
 const location=()=>read(0x100,2),story=()=>read(0x10000),party=async()=>Array.from(await bytes(0x2980,3));
 const position=async()=>{const n=await read(0x197,2);return{x:await read(0x1800+n,2)/16,y:await read(0x1880+n,2)/16};};
 async function stage(name,extra={}){
  const row={name,location:await location(),story:await story(),party:await party(),position:await position(),...extra};
  evidence.stages.push(row);await shot(name);console.log(JSON.stringify(row));return row;
 }
 async function fight(){
  assert.ok(await read(0x117)&1,'expected native Guardia Forest encounter');await wait(350);
  const formation=Array.from(await bytes(0xaf02,8));await shot('guardia-forest-battle');
  for(let i=0;i<220&&(await read(0x117)&1);i++)await tap(256,65);
  assert.equal(await read(0x117)&1,0,'ordinary Attack menus win Guardia Forest encounter');
  assert.ok(await read(0x2603,2)>0,'Shrek survives Guardia Forest encounter');
  for(let i=0;i<50&&(await read(0x126)||!await read(0x11f));i++)await tap(256,60);
  evidence.battles??=[];evidence.battles.push({name:'guardia-forest',formation:formation.filter(id=>id!==255),hp:await read(0x2603,2)});
 }
 async function point(x,y,destination=null){
  for(let attempt=0;attempt<8;attempt++){
   try{await walk(x,y);return;}catch(error){
    if(await read(0x117)&1){await fight();continue;}
    if(destination!==null&&await location()===destination)return;
    throw error;
   }
  }
  assert.fail('too many encounters at native waypoint '+x+','+y);
 }
 async function route(points,destination=null){for(const[x,y]of points){await point(x,y,destination);if(destination!==null&&await location()===destination)return;}}
 async function push(x,y){
  for(let attempt=0;attempt<8;attempt++){
   try{await walk(x,y);return;}catch(error){
    if(await read(0x117)&1){await fight();continue;}
    assert.match(error.message,/Medina waypoint/,'expected native collision alignment');return;
   }
  }
  assert.fail('too many encounters during collision alignment');
 }
 async function hold(keys,frames){await rawHold(keys,frames);if(await read(0x117)&1)await fight();}
 async function finishDialogue(){for(let i=0;i<80&&(await read(0x126)||!await read(0x11f));i++)await tap(256,60);assert.equal(await read(0x126),0);assert.equal(await read(0x11f),1);}
 async function healShrek(){
  const hp=await read(0x2603,2),onions=await read(0x2501);await tap(512,180);await tap(128,60);
  await tap(256,180);await tap(32,60);await tap(256,120);await tap(256,180);await tap(256,180);for(let i=0;i<3;i++)await tap(1,100);
  assert.ok(await read(0x2603,2)>hp,'native field Onion heals Shrek');assert.equal(await read(0x2501),onions-1,'field healing consumes one Onion');
 }

 await runCampaignOpening(io,evidence.opening??={stages:[]});
 assert.equal(await location(),497);assert.equal(await story(),12);assert.deepEqual(await party(),[0,128,128]);
 await stage('medieval-world-start');

 // Guardia Forest is west of the canyon exit. The small backtrack at (35,39)
 // follows the native overworld collision around the forest border.
 await walkWorld(io,[[55,28],[55,31],[54,31],[54,37],[53,37],[51,37],[51,39],[41,39],[35,39],[35,37],[37,37],[37,39],[35,39],[35,37],[35,35],[35,34]]);
 await enterWorldLocation(io,119);await wait(400);assert.equal(await location(),119);
 await stage('guardia-forest-arrival');

 // Ordinary diagonal input follows the collision slides through the forest.
 // The only encounter is fought through the real Attack menu; no stats are set.
 await route([[312,650],[312,600],[312,550]]);await push(312,500);await hold(97,200);
 await route([[88,600],[88,500]]);await push(88,400);
 await route([[136,500],[136,450]]);await push(136,400);
 await route([[184,450]]);await push(184,400);await hold(81,200);
 await route([[136,416]]);await push(136,400);
 await route([[184,416]]);await push(184,400);await hold(145,100);
 await route([[312,288]]);await push(312,250);
 await route([[280,288]]);await push(280,250);
 await route([[280,336]]);await push(248,336);
 await route([[280,384],[248,384]]);await push(248,336);
 await route([[216,384]]);await push(216,336);await hold(97,100);
 await route([[43,500],[136,500],[136,450]]);await push(136,400);
 await route([[104,450]]);await push(104,400);await hold(81,100);
 await push(72,400);await route([[104,408]]);await push(104,400);
 await route([[136,408]]);await push(136,400);
 await route([[136,450],[168,450]]);await push(168,400);
 await route([[200,450]]);await push(200,400);await hold(145,100);
 await route([[357,336],[400,336]]);await push(400,288);
 await route([[368,336]]);await push(368,288);
 await route([[336,336],[336,288]]);await push(336,250);
 await route([[304,288]]);await push(304,250);
 await route([[272,288]]);await push(272,250);await hold(81,100);
 await route([[163,200],[163,150],[163,100]]);await push(163,50);await hold(81,100);
 await push(111,50);await route([[111,150],[59,150]]);await push(59,100);
 await route([[163,150],[163,100]]);await push(163,50);await hold(145,100);await wait(500);
 assert.equal(await location(),497,'native Guardia Forest north exit');
 await stage('guardia-forest-castle-world',{forestComplete:true});

 await walkWorld(io,[[35,31],[35,29],[35,27],[35,25]]);await enterWorldLocation(io,120);await wait(500);
 assert.equal(await location(),120);await stage('guardia-throne-double-doors');
 // The front guard and Queen introduction advances story 12 -> 15.
 await finishDialogue();assert.equal(await story(),15);await stage('guardia-queen-introduction');

 // Follow the Queen north, then speak at the upper throne from below.
 await route([[504,800],[504,700],[504,600],[504,500]]);
 await hold(16,3);await tap(256,150);await finishDialogue();
 await route([[504,450],[504,416]]);await hold(16,3);await tap(256,150);await finishDialogue();
 await hold(32,16);await hold(16,3);await tap(256,150);await finishDialogue();
 await stage('guardia-throne-dialogue');

 // Go around the throne platform and climb the real right staircase. Its
 // native connector is the 16×32 strip at x=608,y=128.
 await route([[504,500],[568,500],[568,416]]);await push(568,300);
 await route([[568,500],[632,500],[632,416]]);await push(632,300);
 await route([[632,500]]);await push(696,500);await hold(161,100);
 await route([[568,529]]);await push(568,416);
 await route([[504,529],[504,416],[512,416]]);await push(512,300);
 await route([[512,500],[440,500]]);await push(440,416);
 await route([[512,500],[512,416]]);await push(512,300);await hold(81,100);
 await route([[447,417]]);await push(447,300);await hold(97,100);await hold(145,100);
 await route([[529,500]]);await push(529,417);
 await route([[417,500]]);await push(417,417);
 await route([[389,500],[389,417],[389,300]]);await push(512,300);
 await route([[377,300],[377,250],[377,200]]);await push(377,150);
 await route([[409,200],[409,300],[389,300],[389,417],[389,500],[632,500],[632,416]]);
 await hold(145,100);await push(600,416);await push(616,112);
 await hold(17,100);await hold(129,40);await wait(500);
 assert.equal(await location(),468,'native right staircase to Fiona tower');
 await stage('guardia-fiona-tower-arrival',{rightStaircase:true});

 // The right tower climbs two native stair connectors at x=144,y=384 and
 // x=144,y=96, then enters Fiona's chamber at location 122.
 await push(144,600);await push(144,440);await hold(17,250);await wait(400);assert.equal(await location(),468);
 await push(144,350);await push(144,150);await hold(17,100);await wait(500);
 assert.equal(await location(),122,'native upper staircase to Fiona chamber');
 await stage('guardia-fiona-chamber-arrival');

 // Descend from the arrival stair, pass the two guards, and follow the real
 // collision slides around the chamber partitions to Fiona's bed. These short
 // ordinary inputs preserve the diagonal stair/door alignment; no coordinates
 // or event state are written.
 const chamberKeys={up:17,down:33,left:65,'up-left':81,'down-left':97,'down-right':161,a:256};
 const chamberPath=['down','up-left','down-left','left','down-right','down','down-left','a','a','down','left','left','left','left','up-left','up','up-left','up-left','up-left','up','up','up'];
 for(const name of chamberPath){
  await hold(chamberKeys[name],name==='a'?3:18);await wait(name==='a'?50:12);
  if(await read(0x126)||!await read(0x11f)){await tap(256,60);await wait(30);}
 }
 assert.equal(await read(0x12a),22,'Fiona queen scene starts through the native chamber route');
 for(let i=0;i<200&&await story()!==16;i++)await tap(256,60);
 await wait(500);assert.equal(await story(),16,'Fiona disappears after the complete queen scene');
 await finishDialogue();await stage('guardia-fiona-vanished',{queenScene:true,fionaVanished:true});

 const returnPath=['down-right','down-right','down-right','down-left','down-right','down','down','down-right','right','right','up-right','right','up-right','up','up','up-right','up','up','left'];
 Object.assign(chamberKeys,{right:129,'up-right':145});
 for(const name of returnPath){
  await hold(chamberKeys[name],18);await wait(12);
  if(await read(0x126)||!await read(0x11f)){await tap(256,60);await wait(30);}
 }
 await wait(500);assert.equal(await location(),468,'return to right tower through native chamber exit');
 // Descending uses the alternating left stair on each floor.
 for(let floor=0;floor<3;floor++){
  await hold(65,40);await hold(17,100);await wait(500);
  assert.equal(await location(),floor===2?120:468,'native tower descent '+floor);
 }
 // Donkey's explanation is a real intermediate scene (location 108). Advance
 // it normally; he joins before the party returns to the throne floor.
 await hold(33,500);await wait(500);
 for(let i=0;i<200&&(await story()!==18||(await party())[1]!==2||!await read(0x11f));i++)await tap(256,60);
 assert.equal(await story(),18);assert.deepEqual(await party(),[0,2,128]);await finishDialogue();
 await stage('guardia-donkey-reunion',{donkeyJoined:true});

 await route([[600,416],[632,500],[504,500],[504,700],[504,860]]);await push(504,880);await hold(33,100);await wait(500);
 assert.equal(await location(),497,'native castle exit to medieval overworld');await stage('guardia-castle-exit');

 // Return through Guardia Forest from its north entrance.
 await walkWorld(io,[[35,31]]);await enterWorldLocation(io,119);await wait(500);
 // The forest's diagonal terraces turn held directions into collision slides,
 // and two pixels of drift change which slide is taken. Each step holds its
 // direction, then nudges the leader onto the position an encounter-free run
 // reached. Field battles leave the party in formation positions, so an
 // encounter during a step returns the party to the step's start and repeats it.
 const forestReturn=[["down",296,99.9375],["down-left",284,111.9375],["left",248,111.9375],["left",212,111.9375],["down-left",176,135.9375],["down",168,163.9375],["down-right",184,199.9375],["down",176,221.9375],["down-right",196,255.9375],["down-right",232,271.9375],["down-right",268,293.9375],["down-right",304,329.9375],["down",304,365.9375],["down",304,399.9375],["down-left",272,407.9375],["down-left",236,427.9375],["down-left",200,447.9375],["down-left",164,479.9375],["down-left",128,503.9375],["down-right",136,539.9375],["down-left",100,575.9375],["right",128,575.9375],["down-right",150,611.9375],["right",186,611.9375],["up-right",216,575.9375],["right",236,559.9375],["right",272,559.9375],["down-right",308,589.9375],["down",308,625.9375],["down",308,661.9375],["down",308,697.9375],["down",308,733.9375]];
 async function nudge(x,y){
  for(let i=0;i<12;i++){
   const p=await position(),dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<1&&Math.abs(dy)<1)return;
   await rawHold((Math.abs(dx)>=1?(dx>0?128:64):0)|(Math.abs(dy)>=1?(dy>0?32:16):0),1);await wait(2);
  }
 }
 async function step(name,x,y){
  for(let attempt=0;attempt<4;attempt++){
   const start=await position();let fought=false;
   for(let walked=0;walked<18;){
    if(await read(0x117)&1){await fight();fought=true;break;}
    if(await read(0x126)||!await read(0x11f)){await tap(256,60);continue;}
    await rawHold(chamberKeys[name],1);walked++;
   }
   if(fought){await point(Math.round(start.x),Math.round(start.y));await nudge(start.x,start.y);continue;}
   await wait(12);await nudge(x,y);return;
  }
  assert.fail('too many encounters in one Guardia Forest step');
 }
 for(const[name,x,y]of forestReturn)await step(name,x,y);
 // Walk south off the map; an encounter on the way is fought first.
 for(let i=0;i<12&&await location()===119;i++){
  await wait(60);
  if(await read(0x117)&1){await fight();continue;}
  if(await read(0x126)||!await read(0x11f)){await tap(256,60);continue;}
  await hold(chamberKeys.down,18);
 }
 await wait(500);assert.equal(await location(),497,'native forest south exit');assert.equal(await read(0x285,2)/8,35);
 await stage('guardia-forest-south-return');

 // Stock ordinary healing items through Truce's real native shop before the
 // cathedral. This is normal gold-funded inventory acquisition, not a fixture.
 await walkWorld(io,[[33,35],[33,37],[33,39],[35,39],[37,39],[41,39],[45,39],[47,39],[45,39],[45,37]]);
 await enterWorldLocation(io,118);await wait(500);await hold(17,60);
 for(let i=0;i<10&&await read(0xd13)!==47;i++)await tap(256,180);
 assert.equal(await read(0xd13),47,'native Truce shop menu opens');
 const goldBefore=await read(0x2c53,3);await wait(300);await tap(256,120);for(let i=0;i<4;i++)await tap(32,60);await tap(256,120);
 for(let i=0;i<11;i++)await tap(128,20);await tap(256,180);
 assert.equal(await read(0x2c53,3),goldBefore-120,'twelve Onions bought at native price');
 assert.equal(await read(0x2501),12,'native inventory contains twelve Onions');
 await stage('truce-onions-stocked',{onions:12,gold:goldBefore-120});
 for(let i=0;i<3;i++)await tap(256,100);for(let i=0;i<3;i++)await tap(1,100);
 await push(896,200);await hold(33,250);await wait(500);assert.equal(await location(),497,'native Truce shop exit');

 await walkWorld(io,[[47,37],[47,39],[45,39],[41,39],[37,39],[35,39],[33,39],[33,41],[31,41],[29,41],[27,41],[25,41],[25,39],[25,37],[25,35],[24,35],[25,34]]);
 await enterWorldLocation(io,129);await wait(500);assert.equal(await location(),129);await stage('cathedral-arrival',{onions:12});

 // Heal through the ordinary field Item menu before the hairpin encounter.
 const hpBeforeHeal=await read(0x2603,2),onionsBeforeHeal=await read(0x2501);
 await healShrek();
 assert.ok(await read(0x2603,2)>hpBeforeHeal);assert.equal(await read(0x2501),onionsBeforeHeal-1);
 await stage('cathedral-field-heal',{hp:await read(0x2603,2),onions:await read(0x2501)});

 await route([[128,400],[128,320],[128,256],[72,256],[72,192],[72,154]]);
 await hold(65,3);await tap(256,180);await route([[118,180]]);await hold(129,3);await tap(256,180);
 assert.equal(await read(0x12a),4,'native hairpin scene starts');
 const battleMenu={...io,tap:(keys,gap=12)=>tap(keys,gap)};let cathedralBattles=0;
 for(let i=0;i<400&&await read(0x12a)!==19;i++){
  if(await read(0x117)&1){
   await wait(400);cathedralBattles++;
   if(await read(0x2607,2)>=2)await chooseNativeTech(battleMenu,rom,0,1);
   for(let n=0;n<220&&(await read(0x117)&1);n++)await tap(256,65);
   assert.equal(await read(0x117)&1,0,'normal-level cathedral battle '+cathedralBattles);
  }else await tap(256,60);
 }
 assert.equal(await read(0x12a),19,'Puss naming prompt reached');await wait(600);await tap(256,180);await wait(300);
 if(await story()!==21&&await read(0x11f))await tap(256,180);await wait(300);await tap(8,300);
 for(let i=0;i<20&&await story()!==21;i++){await tap(8,180);await wait(120);}
 for(let i=0;i<150&&await story()!==21;i++)await tap(256,60);
 assert.equal(await story(),21);assert.deepEqual(await party(),[0,2,4]);assert.equal(await read(0x29af),232);
 for(let i=0;i<200&&(await read(0x100ff)&16);i++)await tap(256,60);assert.equal(await read(0x100ff)&16,0,'Puss recruitment event settles');
 evidence.cathedral={battles:cathedralBattles,hp:[await read(0x2603,2),await read(0x2653,2)],onions:await read(0x2501)};
 await stage('puss-recruited',{story:21,pussJoined:true});
 await healShrek();await stage('cathedral-passage-heal',{hp:await read(0x2603,2),onions:await read(0x2501)});

 // Play the organ from the outer left aisle after recruitment has settled,
 // then cross the room to the actual upper-right secret exit.
 await route([[72,256],[40,256],[40,192]]);await push(40,144);await hold(16,3);await tap(256,180);await wait(500);
 await route([[72,256],[184,256],[184,154],[200,154]]);await push(200,112);await hold(17,60);await wait(500);
 assert.equal(await location(),130,'native organ opens the cathedral passage');await stage('cathedral-secret-passage');

 evidence.destination=130;evidence.complete=false;
 evidence.remainingConnector='Cross the cathedral passage, defeat the impostor and restore the queen; later trial/future content is not claimed.';
 return evidence;
}
