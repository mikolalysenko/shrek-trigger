import assert from 'node:assert/strict';
import {movement} from './medina-controller.mjs';

// The 600 A.D. Guardia Forest crossing from the south entrance to the north
// exit beside the castle, shared by campaign legs. Ordinary diagonal input
// follows the forest's collision slides; encounters use a fight callback.
export async function crossGuardiaForestNorth(io,fight){
 const{read,hold:rawHold,wait}=io,{walk}=movement(io);
 async function point(x,y,destination=null){
  for(let attempt=0;attempt<8;attempt++){
   try{await walk(x,y);return;}catch(error){
    if(await read(0x117)&1){await fight();continue;}
    if(destination!==null&&await read(0x100,2)===destination)return;
    throw error;
   }
  }
  assert.fail('too many encounters at native waypoint '+x+','+y);
 }
 async function route(points,destination=null){for(const[x,y]of points){await point(x,y,destination);if(destination!==null&&await read(0x100,2)===destination)return;}}
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
 assert.equal(await read(0x100,2),497,'native Guardia Forest north exit');
}

// The return crossing from the north entrance to the south exit. The
// forest's diagonal terraces turn held directions into collision slides, so
// each step holds its direction and nudges onto the position an
// encounter-free run reached; a step interrupted by a battle is repeated.
export async function crossGuardiaForestSouth(io,fight){
 const{read,hold:rawHold,tap,wait}=io,{walk}=movement(io);
 const chamberKeys={up:17,down:33,left:65,right:129,'up-left':81,'up-right':145,'down-left':97,'down-right':161,a:256};
 const position=async()=>{const n=await read(0x197,2);return{x:await read(0x1800+n,2)/16,y:await read(0x1880+n,2)/16};};
 async function point(x,y){for(let a=0;a<8;a++){try{await walk(x,y);return;}catch(e){if(await read(0x117)&1){await fight();continue;}throw e;}}}
 async function hold(keys,frames){await rawHold(keys,frames);if(await read(0x117)&1)await fight();}
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
 for(let i=0;i<12&&await read(0x100,2)===119;i++){
  await wait(60);
  if(await read(0x117)&1){await fight();continue;}
  if(await read(0x126)||!await read(0x11f)){await tap(256,60);continue;}
  await hold(chamberKeys.down,18);
 }
 assert.equal(await read(0x100,2),497,'native Guardia Forest south exit');
}
