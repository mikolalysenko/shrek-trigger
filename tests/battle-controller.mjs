import assert from'node:assert/strict';

// Acceptance-test helper. Observe the cartridge's menu and send controller
// buttons; never set the actor, cursor, selected tech, target or battle state.
export async function chooseNativeTech({read,bytes,tap,wait},rom,slot,techId,{stopAtTarget=false,target,attempt=0}={}){
  if(slot<0||slot>2||techId<1||techId>=0xfb)throw Error('Invalid native tech selection');
  wait??=n=>tap(0,n);
  if(await read(0x95db)!==0||await read(0x9609)!==0)throw Error('Battle command menu is not ready');
  for(let i=0;i<6&&await read(0x95d5)!==slot;i++)await tap(64);
  if(await read(0x95d5)!==slot)throw Error('Requested party member is not ready');
  for(let i=0;i<3&&await read(0x95dc+slot)!==1;i++)await tap(await read(0x95dc+slot)<1?32:16);
  if(await read(0x95dc+slot)!==1)throw Error('Could not select native Tech command');
  await tap(256);
  if(await read(0x95db)!==1)throw Error('Native tech window did not open');
  const list=await bytes(0x94d0+rom[0xcf38c+slot],20),index=list.indexOf(techId);
  if(index<0)throw Error('Tech '+techId+' is absent from the native menu');
  const cursor=async()=>await read(0x95df+slot)+await read(0x95eb+slot);
  for(let i=0;i<24&&await cursor()!==index;i++)await tap(await cursor()<index?32:16);
  if(await cursor()!==index)throw Error('Native tech cursor did not reach tech '+techId);
  if(await read(0x9ee5)&128)throw Error('Native tech is unavailable');
  // Enemy actions can temporarily ignore a button while leaving the tech
  // window open. Confirm each observed menu state until the native engine
  // accepts the command; two fixed presses can leave target selection open.
  for(let n=0;n<120;n++){
    if(await read(0x95db)===0&&!await read(0x9609)){
      const queued=await read(0x93f4+slot*7),routed=techId===39&&(queued===15||queued===16);
      if((queued===techId||routed)&&!(await read(0x93f5+slot*7)&64))return {slot,techId,index};
      // Enemy actions temporarily close an unfinished command menu. Verify
      // the queued native record; otherwise wait for the same actor and retry.
      if(attempt>=12)assert.fail('Native tech command was repeatedly interrupted');
      for(let n=0;n<240;n++){
        if(await read(0x95d5)===slot&&await read(0x95db)===0&&!await read(0x9609))break;
        await wait(12);
      }
      return chooseNativeTech({read,bytes,tap,wait},rom,slot,techId,{stopAtTarget,target,attempt:attempt+1});
    }
    if(stopAtTarget&&await read(0x9609))return {slot,techId,index,target:await read(0xa62d)};
    if(target!==undefined&&await read(0x9609)&&await read(0xa62d)!==target){await tap(128,12);continue;}
    if(await read(0x95db)!==1&&!await read(0x9609)){await tap(0,12);continue;}
    await tap(256,attempt?12:60);
  }
  assert.fail('Native tech confirmation did not finish');
}

// Select an ordinary attack through the live command and target menus.
export async function attackNativeEnemy(io,enemy,{targetSlot}={}){
 const formation=Array.from(await io.bytes(0xaf02,8)),target=targetSlot??formation.indexOf(enemy)+3;
 if(target<3||target>10||formation[target-3]!==enemy)throw Error('Enemy is not in formation');
 const alive=async()=>!!(await io.read(0x117)&1)&&await io.read(0x5e30+target*128,2)>0;
 const cancel=async()=>{if(await io.read(0x117)&1&&await io.read(0x9609))await io.tap(1,12);return null;};
 if(!await alive())return cancel();
 for(let n=0;n<120&&await io.read(0x95d5)>2&&await alive();n++)await io.wait(30);
 if(!await alive())return cancel();
 assert.ok(await io.read(0x95d5)<=2,'ready actor for native attack');assert.equal(await io.read(0x95db),0,'native main command menu');
 for(let n=0;n<120&&!await io.read(0x9609)&&await alive();n++){
  assert.equal(await io.read(0x95db),0,'native Attack command menu');
  const actor=await io.read(0x95d5);
  if(actor>2){await io.wait(12);continue;}
  await io.tap(await io.read(0x95dc+actor)?16:256,12);
 }
 if(!await alive())return cancel();
 assert.ok(await io.read(0x9609),'native target selection');
 // An already queued attack can finish while the next actor selects a
 // target. The native cursor then skips the defeated enemy. Cancel that
 // unfinished command instead of attacking a different living target.
 for(let n=0;n<12&&await io.read(0xa62d)!==target&&await alive();n++)await io.tap(128,12);
 if(!await alive())return cancel();
 assert.equal(await io.read(0xa62d),target,'native target cursor');
 for(let n=0;n<120&&await io.read(0x9609)&&await alive();n++)await io.tap(256,12);
 if(await io.read(0x9609)&&!await alive())return cancel();
 assert.equal(await io.read(0x9609),0,'native attack confirmation');await io.wait(78);return target;
}

// Battle inventory records are five bytes: item, target mode, flags, quantity,
// original inventory slot. Select an item and optional ally with normal input.
export async function useNativeItem(io,item,target=null,{allowBattleEnd=false}={}){
 try{
 for(let n=0;n<120&&await io.read(0x95d5)>2;n++)await io.wait(30);
 assert.ok(await io.read(0x95d5)<=2,'ready actor for native item');assert.equal(await io.read(0x95db),0);assert.equal(await io.read(0x9609),0);
 // Enemy action transitions can ignore a press while the main menu remains
 // visible. Observe each cursor/menu state instead of assuming three taps
 // and one confirm were accepted. The ready actor may also change meanwhile.
 let actor=await io.read(0x95d5);
 for(let n=0;n<120&&await io.read(0x95db)!==2;n++){
  assert.equal(await io.read(0x95db),0,'native Item command menu');
  actor=await io.read(0x95d5);if(actor>2){await io.wait(12);continue;}
  await io.tap(await io.read(0x95dc+actor)===2?256:32,12);
 }
 assert.equal(await io.read(0x95db),2,'native item window opens');
 const records=await io.bytes(0x1580,1280);let index=-1;
 for(let n=0;n<256;n++)if(records[n*5]===item&&records[n*5+3]&&!(records[n*5+2]&128)){index=n;break;}
 assert.ok(index>=0,'usable native item '+item);const before=records[index*5+3],cursor=async()=>await io.read(0x95e5)+await io.read(0x95e6);
 for(let n=0;n<256&&await cursor()!==index;n++)await io.tap(await cursor()<index?32:16,12);
 assert.equal(await cursor(),index);await io.tap(256,12);assert.equal(await io.read(0x9f35),item);
 if(await io.read(0x9609)){
  if(target!==null){
   assert.ok(Number.isInteger(target)&&target>=0&&target<3,'native item ally slot');
   for(let n=0;n<6&&await io.read(0xa62d)!==target;n++)await io.tap(128,12);
   assert.equal(await io.read(0xa62d),target,'native item target');
  }
  await io.tap(256,90);
 }
 for(let n=0;n<120&&await io.read(0x1583+index*5)===before;n++)await io.wait(30);
 assert.equal(await io.read(0x1583+index*5),before-1,'native item reservation');
 // Confirming a target reserves the item. The cartridge refunds it when a
 // queued action is cancelled (including victory before that actor's turn).
 // Wait for the command's item flag to clear before counting consumption.
 const pending=0x93ef+actor*7;
 for(let n=0;n<120&&(await io.read(pending)&64);n++)await io.wait(30);
 assert.equal(await io.read(pending)&64,0,'native item action resolves');
 if(await io.read(0x1583+index*5)===before)return null;
 assert.equal(await io.read(0x1583+index*5),before-1,'native item consumption');return{item,index};
 }catch(error){
  // A queued attack can finish a short encounter during item selection.
  // Route drivers may accept that native cancellation; boss tests still
  // require the requested item to be consumed.
  if(allowBattleEnd){
   if(!(await io.read(0x117)&1))return null;
   const enemies=await io.bytes(0xaf02,8);let alive=false;
   for(let n=0;n<8;n++)if(enemies[n]!==255&&await io.read(0x5e30+(n+3)*128,2))alive=true;
   if(!alive)return null;
  }
  throw error;
 }
}
export const useNativePartyItem=(io,item)=>useNativeItem(io,item);
