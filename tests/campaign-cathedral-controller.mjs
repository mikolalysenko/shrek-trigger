import assert from 'node:assert/strict';
import {movement} from './medina-controller.mjs';
import {chooseNativeTech} from './battle-controller.mjs';
import {routeKit} from './route-kit.mjs';

// Fresh-save continuation from the cathedral's organ passage (location 130)
// through the spike hall switches, the impostor battle and the queen's return
// to court. Controller input and reads only; called after the medieval route.
export async function runCathedralLeg(io,evidence={stages:[]},rom){
 const{read,bytes,hold,tap,wait,shot}=io,{walk}=movement(io);
 const location=()=>read(0x100,2),story=()=>read(0x10000),party=async()=>Array.from(await bytes(0x2980,3));
 const position=async()=>{const n=await read(0x197,2);return{x:await read(0x1800+n,2)/16,y:await read(0x1880+n,2)/16};};
 const flags=()=>read(0x100ff);
 async function stage(name,extra={}){
  const row={name,location:await location(),story:await story(),party:await party(),position:await position(),...extra};
  evidence.stages.push(row);await shot(name);console.log(JSON.stringify(row));return row;
 }
 const busy=async()=>await read(0x126)||!await read(0x11f);
 async function settle(limit=200){for(let i=0;i<limit&&await busy()&&!(await read(0x117)&1);i++)await tap(256,60);}

 // Battles: Puss's native heal (tech 33) keeps the party standing when an
 // ally drops below half HP; every other turn is the default Attack command.
 const menu={...io,tap:(keys,gap=12)=>tap(keys,gap)};
 async function battle(name,expect){
  assert.ok(await read(0x117)&1,'expected native battle: '+name);await wait(300);
  const formation=Array.from(await bytes(0xaf02,8)).filter(id=>id!==255);
  if(expect!==undefined)assert.ok(formation.includes(expect),'native '+name+' formation');
  const members=(await party()).filter(id=>id<8).length;
  let heals=0,turns=0,stuck=0;
  for(let n=0;n<4000&&(await read(0x117)&1);n++){
   const actor=await read(0x95d5);
   if(actor>2||await read(0x95db)!==0||await read(0x9609)){
    // A command left open (an interrupted tech or target choice) is cancelled.
    if(actor<=2&&++stuck>40){await tap(1,12);stuck=0;}else await wait(6);continue;
   }
   stuck=0;turns++;let worst=-1,ratio=1;
   for(let s=0;s<members;s++){const hp=await read(0x5e30+s*128,2),max=await read(0x5e32+s*128,2);if(hp>0&&max&&hp/max<ratio){ratio=hp/max;worst=s;}}
   {const hp=await read(0x5e30+actor*128,2),max=await read(0x5e32+actor*128,2);
    if(max&&hp/max<.4&&await read(0x2501)){
     // Below 40% the actor drinks an Onion (native Item menu, self target).
     for(let i=0;i<3&&await read(0x95dc+actor)!==2;i++)await tap(32,12);
     await tap(256,20);
     if(await read(0x95db)===2){await tap(256,20);await tap(256,20);for(let i=0;i<20&&(await read(0x95db)||await read(0x9609));i++)await tap(256,12);heals++;continue;}
    }}
   const pussSlot=(await party()).indexOf(4);
   if(actor===pussSlot&&ratio<.6&&await read(0x5e34+actor*128,2)>=2){
    try{await chooseNativeTech(menu,rom,actor,33,{target:worst});heals++;continue;}catch{}
   }
   await tap(256,12);await wait(4);await tap(256,12);
  }
  assert.equal(await read(0x117)&1,0,'battle finished: '+name);
  const alive=[];for(let s=0;s<members;s++)alive.push(await read(0x5e30+s*128,2));
  await settle(80);
  assert.ok(alive.some(hp=>hp>0),'party survives '+name);
  evidence.battles??=[];evidence.battles.push({name,formation,turns,heals});
 }
 async function go(points,name){
  const start=await location();
  for(const step of points){
   if(typeof step[0]==='string'){
    await hold({up:16,down:32,left:64,right:128}[step[0]],step[1]);await wait(20);
    if(await read(0x117)&1)await battle(name);
    if(await location()!==start)return;continue;
   }
   const[x,y]=step;let reached=false;
   for(let attempt=0;attempt<8&&!reached;attempt++){
    try{await walk(x,y);reached=true;}catch(error){
     if(await location()!==start)return;
     if(await read(0x117)&1){await battle(name);continue;}
     // A one-way ledge ends the step at its landing point.
     if(attempt>=1){const p=await position();if(Math.abs(p.x-x)<=4&&Math.abs(p.y-y)<=4){reached=true;break;}}
     await hold(1,10);
    }
   }
   if(!reached){await shot('cathedral-blocked');assert.fail(`${name}: native waypoint ${x},${y} from ${JSON.stringify(await position())}`);}
  }
 }
 // Collision alignment: walk toward a point and accept stopping against the
 // native wall or connector, as the medieval route's push() does.
 async function nudgeTo(x,y){
  for(let attempt=0;attempt<8;attempt++){
   try{await walk(x,y);return;}catch(error){
    if(await read(0x117)&1){await battle('alignment');continue;}
    if(/Medina waypoint|unexpected transition/.test(error.message))return;throw error;
   }
  }
 }
 async function press(){await hold(16,4);await tap(256,150);await settle();}
 async function healAll(){
  if(!await read(0x2501))return;
  const ids=(await party()).filter(id=>id<8);
  await tap(512,180);await tap(128,60);await tap(256,180);await tap(32,60);await tap(256,120);await tap(256,180);
  for(let m=0;m<ids.length;m++){
   for(let n=0;n<6;n++){const hp=await read(0x2603+ids[m]*80,2),max=await read(0x2605+ids[m]*80,2);if(hp>=max*.6||!await read(0x2501))break;await tap(256,150);}
   if(m<ids.length-1)await tap(32,60);
  }
  for(let i=0;i<4;i++)await tap(1,100);
 }

 assert.equal(await location(),130);assert.equal(await story(),21);

 // Nave: through the north door of the side aisle, then up the central aisle.
 await go([[856,720],[856,690],['up',80],[856,560],[856,544],[632,544],[632,400],[632,200],[632,90],['up',60]],'cathedral nave');
 await wait(300);assert.equal(await location(),131,'native nave exit');await stage('cathedral-spike-hall');
 await healAll();

 // The spike hall: drop into the lower-left chapel, climb through the left
 // side room to the gallery, and drop into the right side room, whose switch
 // lowers the central spikes (flag bit 1).
 await go([[344,640],[344,560],[344,536],[184,536],[184,673],[104,690],[104,660],['up',120],['up',120],[111,400],[111,330],[111,315],['up',100],[111,200],[111,160],[200,150],[400,150],[577,150],[577,170],['down',150],['down',100]],'spike hall gallery');
 if(await read(0x117)&1)await battle('right side room ambush');
 await settle();
 await go([[544,330],[544,316]],'right side room');await press();
 assert.ok(await flags()&2,'native right switch lowers the spikes');await stage('cathedral-spikes-lowered');

 // Back down through the lower-right chapel to the hall, across the lowered
 // spikes, and the altar switch that unlocks the gallery door (flag bit 2).
 await go([[577,400],[577,431],['down',240],['down',60],[488,690],[503,640],[503,560],[503,536],[344,536],[344,520],['up',80],[344,440],[344,416],[344,380],[344,340],[263,340],[263,330]],'lowered spikes');
 await press();assert.ok(await flags()&4,'native altar switch unlocks the gallery door');await stage('cathedral-altar-switch');
 await healAll();

 await go([[344,340],[344,416],[344,440],['down',80],[344,536],[184,536],[184,673],[104,690],[104,660],['up',120],['up',120],[111,400],[111,330],[111,315],['up',100],[111,200],[111,160],[345,152],[345,106]],'gallery door');
 await press();await hold(16,100);await wait(300);
 assert.equal(await location(),132,'native gallery door to the stair');await stage('cathedral-stair');
 await healAll();

 await go([[128,900],[120,800],[120,700],[120,640],[119,636],['up',100]],'cathedral stair');
 await wait(200);assert.equal(await location(),198,'native stair to the impostor chamber');
 await settle();await stage('impostor-chamber');
 // The stair's encounters wear the party down; heal before the impostor,
 // whose fight is close at normal level.
 await healAll();

 await go([[128,300],[120,220]],'impostor chamber');await hold(16,40);
 for(let i=0;i<300&&!(await read(0x117)&1);i++)await tap(256,60);
 // The impostor fight is close at normal level: Puss mends anyone under
 // 60%, actors under 35% drink an Onion (saving the rest for the cave
 // keeper), and fallen allies are revived.
 await routeKit(io,evidence,rom).tacticalBattle('impostor',[144],.35,{healer:[4,33]});await settle(80);
 await stage('impostor-defeated');

 // The queen walks to the altar; the native return starts at the chamber exit.
 for(let i=0;i<300&&!(await read(0x10228)&&!await busy());i++)await tap(256,60);
 assert.equal(await read(0x10228),1,'queen finishes her post-battle walk');
 await go([[120,300],[120,343]],'chamber exit');await hold(32,12);
 for(let i=0;i<300&&await story()!==28;i++)await tap(256,60);await wait(240);await settle(100);
 assert.equal(await location(),120,'native return to court');assert.equal(await story(),28);
 assert.ok((await party())[2]&128,'Puss leaves after the queen returns');
 await stage('queen-returned-to-court',{pussLeft:true});

 // Fiona's return: back up the right tower to her chamber (the same native
 // connectors as the medieval route) and through her restoration scene.
 await go([[504,500],[632,500],[632,416]],'throne to right tower');
 await hold(145,100);await nudgeTo(600,416);await nudgeTo(616,112);await hold(17,100);await hold(129,40);await wait(500);
 assert.equal(await location(),468,'native right staircase to the tower');
 await nudgeTo(144,600);await nudgeTo(144,440);await hold(17,250);await wait(400);
 await nudgeTo(144,350);await nudgeTo(144,150);await hold(17,100);await wait(500);
 assert.equal(await location(),122,'native upper staircase to Fiona’s chamber');await stage('fiona-chamber-return');
 // The chamber's diagonal partitions turn held directions into collision
 // slides, and the patrolling guards shift timing. Each step holds its
 // direction, then nudges the leader onto the position a clean run reached.
 const chamberKeys={up:17,down:33,left:65,'up-left':81,'down-left':97,'down-right':161};
 const chamberSteps=[['down',888,771.9375],['up-left',882,765.9375],['down-left',852,801.9375],['left',816,801.9375],['down-right',852,829.9375],['down',852,865.9375],['down-left',848,901.9375],['down',848,937.9375],['left',822,943.9375],['left',786,943.9375],['left',750,943.9375],['left',714,943.9375],['up-left',678,923.9375],['up',679,897.9375],['up-left',675,861.9375],['up-left',663,825.9375],['up-left',635,789.9375],['up',635,771.9375]];
 async function nudge(x,y){
  for(let i=0;i<24;i++){
   const p=await position(),dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<1&&Math.abs(dy)<1)return;
   if(await busy()){await tap(256,60);continue;}
   await hold((Math.abs(dx)>=1?(dx>0?128:64):0)|(Math.abs(dy)>=1?(dy>0?32:16):0),1);await wait(2);
  }
 }
 for(const[name,x,y]of chamberSteps){
  await hold(chamberKeys[name],18);await wait(12);
  if(await busy()){await tap(256,60);await wait(30);}
  await nudge(x,y);
 }
 for(let i=0;i<6&&await read(0x12a)!==102&&await story()===28;i++){await hold(16,18);await wait(30);}
 for(let i=0;i<300&&await story()!==33;i++)await tap(256,60);
 await wait(300);await settle(60);
 assert.equal(await story(),33,'Fiona’s restoration scene completes');
 assert.deepEqual(await party(),[0,2,1],'Fiona rejoins with Shrek and Donkey');
 await stage('fiona-rejoins',{fionaJoined:true});
 evidence.destination=122;evidence.storyReached=33;
 return evidence;
}
