import assert from 'node:assert/strict';
import {movement} from './medina-controller.mjs';
import {chooseNativeTech,attackNativeEnemy,useNativeItem} from './battle-controller.mjs';

// Shared helpers for the fresh-save campaign routes. Observation and ordinary
// controller input only: no writes, savestates or diagnostic jumps.
export function routeKit(io,evidence,rom){
 const{read,bytes,hold,tap,wait,shot}=io,{walk}=movement(io);
 const location=()=>read(0x100,2),story=()=>read(0x10000),party=async()=>Array.from(await bytes(0x2980,3));
 const position=async()=>{const n=await read(0x197,2);return{x:await read(0x1800+n,2)/16,y:await read(0x1880+n,2)/16};};
 const busy=async()=>await read(0x126)||!await read(0x11f);
 // Onions (item 189) anywhere in the inventory; slot order changes as key
 // items arrive, so no fixed slot is a stock check.
 const count=async item=>{const ids=await bytes(0x2400,256),n=await bytes(0x2500,256);let t=0;for(let i=0;i<256;i++)if(ids[i]===item)t+=n[i];return t;};
 const onions=async()=>{const ids=await bytes(0x2400,256),n=await bytes(0x2500,256);let t=0;for(let i=0;i<256;i++)if(ids[i]===189)t+=n[i];return t;};
 async function stage(name,extra={}){
  const row={name,location:await location(),story:await story(),party:await party(),position:await position(),...extra};
  evidence.stages.push(row);await shot(name);console.log(JSON.stringify(row));return row;
 }
 async function settle(limit=200){
  for(let i=0;i<limit;i++){
   if(await read(0x117)&1){await battle('scene');continue;}
   if(i>3&&!await busy()){await wait(60);if(!await busy())return;}
   await tap(256,60);
  }
 }
 // Healers: Puss (4) casts tech 33 and Fiona (1) tech 9 on an ally below 60%.
 const menu={...io,tap:(keys,gap=12)=>tap(keys,gap)};
 async function battle(name,expect){
  assert.ok(await read(0x117)&1,'expected native battle: '+name);await wait(300);
  const formation=Array.from(await bytes(0xaf02,8)).filter(id=>id!==255);
  if(expect!==undefined)assert.ok(formation.includes(expect),'native '+name+' formation');
  const ids=(await party()).filter(id=>id<8);let heals=0,turns=0,stuck=0,fled=false;
  // Techs that failed to dispatch (not learned, no MP) are not retried; a
  // turn that ended before the menu opened ("not ready") is.
  const failed=new Set(),closeMenus=async()=>{for(let i=0;i<8&&(await read(0x95db)||await read(0x9609));i++)await tap(1,12);};
  const tryTech=async(actor,tech,options)=>{if(failed.has(actor+':'+tech))return false;try{await chooseNativeTech(menu,rom,actor,tech,options);return true;}catch(e){if(process.env.ROUTE_DEBUG)console.log('TECHFAIL',actor,tech,e.message);failed.add(actor+':'+tech);await closeMenus();return false;}};
  // Enemies the party cannot hurt with weapons (Shadows ignore physical
  // attacks): after about thirty seconds without any enemy losing HP each
  // character casts a cheap single-target spell; after a minute the party
  // runs by holding L and R. Time, not menu sightings, measures the stall.
  const slots=Array.from(await bytes(0xaf02,8));
  const enemyHp=async()=>{let t=0;for(let s=3;s<11;s++)if(slots[s-3]!==255)t+=await read(0x5e30+s*128,2);return t;};
  let lastHp=await enemyHp(),idle=0,clock=0,lastDrop=0;
  for(let n=0;n<40000&&(await read(0x117)&1);n++){
   {const now=await enemyHp();if(now<lastHp)lastDrop=clock;lastHp=now;idle=clock-lastDrop;}
   if(idle>=3600&&!expect){fled=true;for(let i=0;i<60&&(await read(0x117)&1);i++)await hold(1024|2048,10);continue;}
   const actor=await read(0x95d5);
   if(actor>2||await read(0x95db)!==0||await read(0x9609)){
    // A command left open (an interrupted tech or target choice) is cancelled.
    if(actor<=2&&++stuck>40){await tap(1,12);stuck=0;clock+=15;}else{await wait(6);clock+=6;}continue;
   }
   stuck=0;turns++;clock+=34;let worst=-1,ratio=1;
   for(let s=0;s<ids.length;s++){const hp=await read(0x5e30+s*128,2),max=await read(0x5e32+s*128,2);if(hp>0&&max&&hp/max<ratio){ratio=hp/max;worst=s;}}
   {const hp=await read(0x5e30+actor*128,2),max=await read(0x5e32+actor*128,2);
    if(max&&hp/max<.4&&await onions()){
     // Below 40% the actor drinks an Onion (189) through the native Item menu.
     if(await useNativeItem(io,189,actor).catch(()=>false)){heals++;continue;}await closeMenus();
    }}
   const spell={0:3,1:11,2:17,3:27,4:35,5:41,6:49}[ids[actor]];
   if(idle>=1800&&spell&&await read(0x5e34+actor*128,2)>=2&&await tryTech(actor,spell))continue;
   const tech=ids[actor]===4?33:ids[actor]===1?9:0;
   if(tech&&ratio<.6&&await read(0x5e34+actor*128,2)>=2&&await tryTech(actor,tech,{target:worst})){heals++;continue;}
   await closeMenus();
   // A failed tech or item choice can leave the cursor off Attack.
   for(let i=0;i<3&&await read(0x95dc+actor)!==0;i++)await tap(16,12);
   await tap(256,12);await wait(4);await tap(256,12);
  }
  assert.equal(await read(0x117)&1,0,'battle finished: '+name);
  const alive=[];for(let s=0;s<ids.length;s++)alive.push(await read(0x5e30+s*128,2));
  await wait(60);for(let i=0;i<80&&await busy()&&!(await read(0x117)&1);i++)await tap(256,60);
  assert.ok(alive.some(hp=>hp>0),'party survives '+name);
  evidence.battles??=[];evidence.battles.push({name,formation,turns,heals,fled});
 }
 // Walk waypoints; [direction, frames] entries hold a direction (doors).
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
     if(attempt>=1){const p=await position();if(Math.abs(p.x-x)<=4&&Math.abs(p.y-y)<=4){reached=true;break;}}
     await hold(1,10);
    }
   }
   if(!reached){await shot('route-blocked');assert.fail(`${name}: native waypoint ${x},${y} from ${JSON.stringify(await position())}`);}
  }
 }
 // Replay held directions (24 frames, running; three-letter entries are 96
 // frame door pushes), nudging onto each recorded position. Entries may
 // record the room they end in; battles on the way are fought normally.
 const dirs={U:16,D:32,L:64,R:128,UL:80,UR:144,DL:96,DR:160,UUU:16,DDD:32,LLL:64,RRR:128};
 async function nudge(x,y){
  for(let i=0;i<30;i++){
   const p=await position(),dx=x-p.x,dy=y-p.y;if(Math.abs(dx)<2&&Math.abs(dy)<2)return;
   if(await read(0x117)&1){await battle('replay');continue;}
   if(!await read(0x11f)){if(await read(0x126))await tap(256,60);else await wait(15);continue;}
   await hold((Math.abs(dx)>=2?(dx>0?128:64):0)|(Math.abs(dy)>=2?(dy>0?32:16):0),2);
  }
 }
 // Steps are [direction,x,y,room] as recorded by the discovery search. `fr`
 // is the recorded hold length (triples hold four times as long); a two-letter
 // step ending in A ("UA") faces that way and presses A, for doors and lifts.
 async function replay(steps,name,{fr=24,fight=null,settleWait=200}={}){
  const fightNow=async()=>fight?await fight(name):await battle(name);
  for(const[d,x,y,room]of steps){
   let current=await location();const leaves=room!==undefined?room!==current:x===undefined;
   if(d.length===2&&d.endsWith('A')&&dirs[d[0]]){
    await hold(dirs[d[0]],6);await hold(256,4);await wait(90);
    for(let i=0;i<60&&(await read(0x117)&1||!await read(0x11f));i++){if(await read(0x117)&1)await fightNow();else if(await read(0x126))await tap(256,60);else await wait(10);}
    if(await location()!==current)await wait(200);
    if(x!==undefined){if(room!==undefined)assert.equal(await location(),room,`${name}: replay room`);await nudge(x,y);}
    continue;
   }
   // Dialogue and battles do not consume a step's hold; a step that changes
   // rooms keeps holding (up to 300 frames) until the connector fires.
   for(let f=0,len=d.length===3?fr*4:fr;f<(leaves?Math.max(len,300):len);f+=2){
    if(await read(0x117)&1){await fightNow();f-=2;continue;}
    // Only a scene that locks movement pauses the hold; ambient text boxes
    // (shown while the player can still walk) do not.
    if(!await read(0x11f)){if(await read(0x126))await tap(256,60);else await wait(10);f-=2;continue;}
    await hold(dirs[d]|1,2);
    if(await location()!==current){await wait(200);current=await location();break;}
    if(!leaves&&f+2>=(d.length===3?fr*4:fr))break;
   }
   if(x!==undefined){
    if(room!==undefined)assert.equal(await location(),room,`${name}: replay room`);
    await nudge(x,y);
   }
  }
  await wait(settleWait);
 }
 async function healAll(){
  if(!await onions())return;
  const ids=(await party()).filter(id=>id<8);
  await tap(512,180);await tap(128,60);await tap(256,180);await tap(32,60);await tap(256,120);await tap(256,180);
  for(let m=0;m<ids.length;m++){
   for(let n=0;n<6;n++){const hp=await read(0x2603+ids[m]*80,2),max=await read(0x2605+ids[m]*80,2);if(hp>=max*.6||!await onions())break;await tap(256,150);}
   if(m<ids.length-1)await tap(32,60);
  }
  for(let i=0;i<4;i++)await tap(1,100);
 }
 // Boss tactics: each actor below the threshold drinks an Onion from the
 // native battle Item menu (first row, self target); otherwise it attacks the
 // first living enemy in priority order through the native target cursor.
 async function tacticalBattle(name,order,threshold=.5,{techs={},healer=null,revivers={},holdWhile=null,safeAbove=0,healItem=189,targeted={},healerRefill=0,melee=true,groupHeal=null}={}){
  assert.ok(await read(0x117)&1,'expected native battle: '+name);await wait(300);
  let formation=Array.from(await bytes(0xaf02,8));const requested=order;
  // Keep the requested priority for enemies present in the loaded formation;
  // ids read while the battle was still loading are dropped, and anything
  // else in the formation is still attacked after them.
  order=[...order.filter(id=>formation.includes(id)),...new Set(formation.filter(id=>id!==255&&!order.includes(id)))];
  assert.ok(order.length,'native '+name+' formation');
  let turns=0,items=0,stuck=0,reviveCount=0;const untargetable=new Set(),dryItems=new Set();
  // As in battle(): techs that fail to dispatch close their menus and are
  // not retried, so the actor falls back to a real attack.
  const failed=new Set(),closeMenus=async()=>{for(let i=0;i<8&&(await read(0x95db)||await read(0x9609));i++)await tap(1,12);};
  // With holdWhile, an attacking tech stops at its target screen and the
  // stance is checked again there: one that began while the menu was open
  // cancels the command instead of drawing the counter.
  const guarded=async(actor,tech,options)=>{
   const r=await chooseNativeTech(menu,rom,actor,tech,{...options,stopAtTarget:true});
   if(r.target===undefined)return true;
   if(await holdWhile()){await closeMenus();return 'held';}
   for(let i=0;i<40&&(await read(0x95db)||await read(0x9609));i++)await tap(256,12);
   return true;
  };
  const tryTech=async(actor,tech,options,attack=false)=>{if(failed.has(actor+':'+tech))return false;try{if(attack&&holdWhile)return await guarded(actor,tech,options);await chooseNativeTech(menu,rom,actor,tech,options);return true;}catch(e){if(process.env.ROUTE_DEBUG)console.log('TECHFAIL',actor,tech,e.message);if(!/not ready/.test(e.message))failed.add(actor+':'+tech);await closeMenus();return false;}};
  for(let n=0;n<40000&&(await read(0x117)&1);n++){
   const actor=await read(0x95d5);
   if(actor>2||await read(0x95db)!==0||await read(0x9609)){if(actor<=2&&++stuck>40){await tap(1,12);stuck=0;}else await wait(6);continue;}
   stuck=0;
   // A scripted chain can load the next formation without leaving battle.
   {const live=Array.from(await bytes(0xaf02,8));if(live.some((id,k)=>id!==formation[k])&&live.some(id=>id!==255)){formation=live;order=[...requested.filter(id=>formation.includes(id)),...new Set(formation.filter(id=>id!==255&&!requested.includes(id)))];untargetable.clear();}}
   const who=(await party())[actor],mp=await read(0x5e34+actor*128,2);
   if(process.env.ROUTE_DEBUG){const p=[],e=[];for(let k=0;k<3;k++)p.push(await read(0x5e30+k*128,2)+'/'+await read(0x5e34+k*128,2));for(let k=3;k<11;k++)if(formation[k-3]!==255)e.push(formation[k-3]+':'+await read(0x5e30+k*128,2));console.log('TB',name,'actor',actor,'who',who,'party',p.join(' '),'enemies',e.join(' '));}
   // A healer (character id, tech) mends the weakest ally below 60%.
   if(healer&&who===healer[0]&&mp>=2){
    let worst=-1,ratio=1;for(let s=0;s<3;s++){const h=await read(0x5e30+s*128,2),m=await read(0x5e32+s*128,2);if(h>0&&m&&h/m<ratio){ratio=h/m;worst=s;}}
    if(ratio<.6&&await tryTech(actor,healer[1],{target:worst})){items++;turns++;continue;}
   }
   const hp=await read(0x5e30+actor*128,2),max=await read(0x5e32+actor*128,2);
   // The healing item (an Onion unless healItem says otherwise; Onions when
   // that runs out) goes to the actor below the threshold.
   // An item the native menu refuses (not usable here) is not retried in
   // this battle; the actor fights instead.
   const potion=await count(healItem)&&!dryItems.has(healItem)?healItem:await onions()&&!dryItems.has(189)?189:0;
   if(max&&hp/max<threshold&&potion){
    if(await useNativeItem(io,potion,actor).catch(e=>{if(process.env.ROUTE_DEBUG)console.log('ITEMFAIL',potion,e.message);dryItems.add(potion);return false;})){items++;turns++;continue;}await closeMenus();
   }
   // Revive a fallen ally with the native Revive item (199) when one is down.
   {let down=-1;for(let s=0;s<3;s++)if(!await read(0x5e30+s*128,2)&&await read(0x5e32+s*128,2))down=s;
    // A reviving tech (character id -> tech, e.g. Shrek's Get Up) comes first.
    if(down>=0&&revivers[who]&&await tryTech(actor,revivers[who],{target:down})){items++;turns++;continue;}
    if(down>=0&&reviveCount<3){try{await useNativeItem(io,199,down);reviveCount++;items++;turns++;continue;}catch(e){if(process.env.ROUTE_DEBUG)console.log("REVIVEFAIL",down,e.message);reviveCount=3;await closeMenus();}}}
   // A boss in a counterattack stance (holdWhile) is not struck: healing and
   // revives above still run, attacks wait until the stance ends.
   if(holdWhile&&await holdWhile()){
    // The stance is a free window: the healer tops up anyone below 90%.
    if(healer&&who===healer[0]&&mp>=2){let worst=-1,ratio=.9;for(let s=0;s<3;s++){const h=await read(0x5e30+s*128,2),m=await read(0x5e32+s*128,2);if(h>0&&m&&h/m<ratio){ratio=h/m;worst=s;}}
     if(worst>=0&&await tryTech(actor,healer[1],{target:worst})){items++;turns++;continue;}}
    await wait(6);continue;
   }
   // Against a boss whose counter hits the whole party (safeAbove), nobody
   // attacks while a living ally is below that share of HP: the healer
   // mends them, anyone else hands them an Onion.
   if(safeAbove){let worst=-1,ratio=safeAbove;for(let s=0;s<3;s++){const h=await read(0x5e30+s*128,2),m=await read(0x5e32+s*128,2);if(h>0&&m&&h/m<ratio){ratio=h/m;worst=s;}}
    if(worst>=0){
     if(healer&&who===healer[0]&&mp>=2&&await tryTech(actor,healer[1],{target:worst})){items++;turns++;continue;}
     // A double tech that heals everyone (groupHeal: {tech, members}) comes
     // first when both members are ready; its absence is not remembered.
     if(groupHeal&&groupHeal.members.includes(who)&&mp>=4){
      try{await chooseNativeTech(menu,rom,actor,groupHeal.tech);items++;turns++;continue;}
      catch(e){if(process.env.ROUTE_DEBUG)console.log('GROUPHEAL',e.message);await closeMenus();}
     }
     // With healerRefill (OnionBroth), a healer out of MP gets a broth so
     // Sing-Along can keep going.
     if(healer&&healerRefill&&await count(healerRefill)){const hs=(await party()).indexOf(healer[0]);
      if(hs>=0&&await read(0x5e30+hs*128,2)>0&&await read(0x5e34+hs*128,2)<2&&await useNativeItem(io,healerRefill,hs).catch(()=>false)){items++;turns++;continue;}}
     const potion=await count(healItem)&&!dryItems.has(healItem)?healItem:await onions()&&!dryItems.has(189)?189:0;
     if(potion&&await useNativeItem(io,potion,worst).catch(()=>{dryItems.add(potion);return false;})){items++;turns++;continue;}
     await closeMenus();
    }}
   // Enemies that shrug off blows (targeted: enemy id -> {character id: tech})
   // take the caster's spell aimed at their slot while MP lasts.
   {let cast=false;for(const [id,byWho] of Object.entries(targeted)){if(!byWho[who]||mp<4)continue;
     for(let k=0;k<8&&!cast;k++)if(formation[k]===+id&&await read(0x5e30+(k+3)*128,2)>0&&await tryTech(actor,byWho[who],{target:k+3},true))cast=true;if(cast)break;}
    if(cast){turns++;continue;}}
   // Area techs (character id -> tech) while MP lasts; no target cursor needed.
   if(techs[who]&&mp>=4){const r=await tryTech(actor,techs[who],{},true);if(r==='held'){await wait(6);continue;}if(r){turns++;continue;}}
   // Without melee (a boss that shrugs off blows and counters them), an
   // actor with no spell to cast waits for the next turn.
   if(!melee){await closeMenus();await wait(6);continue;}
   await closeMenus();for(let i=0;i<3&&await read(0x95dc+actor)!==0;i++)await tap(16,12);
   // Attack by slot so a second enemy with the same ID is not skipped.
   // A slot the native cursor cannot select (scenery actors in scripted
   // fights) is skipped after a failed attempt rather than retried forever.
   let slot=-1;for(const id of order){for(let k=0;k<8;k++)if(formation[k]===id&&!untargetable.has(k+3)&&await read(0x5e30+(k+3)*128,2)>0){slot=k+3;break;}if(slot>=0)break;}
   if(slot<0){if(untargetable.size)untargetable.clear();else await wait(6);continue;}
   try{await attackNativeEnemy(io,formation[slot-3],{targetSlot:slot});turns++;}catch(e){if(process.env.ROUTE_DEBUG)console.log("ATKFAIL",slot,e.message);untargetable.add(slot);await closeMenus();await wait(20);}
  }
  assert.equal(await read(0x117)&1,0,'battle finished: '+name);
  const ids=(await party()).filter(id=>id<8),alive=[];for(let s=0;s<ids.length;s++)alive.push(await read(0x5e30+s*128,2));
  assert.ok(alive.some(hp=>hp>0),'party survives '+name);
  evidence.battles??=[];evidence.battles.push({name,formation:formation.filter(id=>id!==255),turns,items});
 }
 // Equip an owned item through the native character menu: X, the character
 // screen, the character (party slot), the slot (0 weapon, 1 helmet, 2 armor,
 // 3 accessory) and the item, stepping down the list until the native
 // equipment byte holds the requested ID.
 async function equip(member,slot,item){
  const id=(await party())[member],byte=0x2600+id*80+[0x29,0x27,0x28,0x2a][slot];
  if(await read(byte)===item)return;
  await tap(512,180);await tap(256,120);for(let i=0;i<member;i++)await tap(32,60);await tap(256,120);
  for(let i=0;i<slot;i++)await tap(32,60);await tap(256,150);
  for(let n=0;n<12&&await read(byte)!==item;n++){await tap(256,150);if(await read(byte)!==item){await tap(256,150);for(let i=0;i<=n;i++)await tap(32,60);await tap(256,150);}}
  for(let i=0;i<5;i++)await tap(1,100);for(let i=0;i<10&&await busy();i++)await tap(256,60);
  assert.equal(await read(byte),item,`equip ${item} on party slot ${member}`);
 }
 // Use a field item on a party member through the native Item menu. The list
 // follows inventory order, so the item's inventory slot is its row.
 async function useItem(item,member){
  const ids=Array.from(await bytes(0x2400,240)),row=ids.indexOf(item);if(row<0)return false;
  const before=await read(0x2500+row);
  // A highlights the item, a second A opens the party target list.
  await tap(512,180);await tap(128,60);await tap(256,180);for(let i=0;i<row;i++)await tap(32,40);await tap(256,150);await tap(256,150);
  for(let i=0;i<member;i++)await tap(32,60);await tap(256,180);
  for(let i=0;i<5;i++)await tap(1,100);for(let i=0;i<10&&await busy();i++)await tap(256,60);
  return await read(0x2500+row)<before;
 }
 return{location,story,party,position,busy,stage,settle,battle,tacticalBattle,go,replay,healAll,equip,useItem};
}
