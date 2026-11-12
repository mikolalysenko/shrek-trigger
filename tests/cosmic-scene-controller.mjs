import assert from 'node:assert/strict';
import {attackNativeEnemy} from './battle-controller.mjs';

// Shared acceptance route. After the diagnostic entry, this driver has only
// ordinary controller input and read-only observations of the original game.
export async function traverseMuffinSpawn(io,location,{climb=location===495}={}){
 const {read,bytes,hold,wait,tap,shot}=io;
 assert.equal(await read(0x100,2),location);
 await shot?.('spawn-'+location+'-arrival');
 if(location===495){await hold(128,48);await hold(16,70);}else await hold(16,location===247?24:36);
 await wait(600);
 // Elder's original reveal pauses for dialogue before its battle command.
 for(let i=0;i<80&&!(await read(0x117)&1);i++)await tap(256,100);
 const formation=await bytes(0xaf02,8),head=location===96?110:216;
 assert.deepEqual(formation,location===96?[111,255,255,255,255,255,110,255]:[215,255,255,255,255,255,216,255]);
 assert.equal(await read(0x117)&1,1);await shot?.('spawn-'+location+'-battle');let attacks=0;
 for(let i=0;i<100&&((await read(0x117)&1)||!await read(0x11f)||await read(0x126));i++){
  if((await read(0x117)&1)&&(await bytes(0xaf02,8)).includes(head)){await attackNativeEnemy(io,head);attacks++;await wait(180);}
  else await tap(256,100);
 }
 await wait(180);assert.equal(await read(0x100,2),location);assert.equal(await read(0x117)&1,0);assert.equal(await read(0x11f),1);assert.equal(await read(0x126),0);
 if(location!==96)assert.ok((await read(0x10064))&({264:8,247:16,495:32}[location]));
 await shot?.('spawn-'+location+'-defeated');
 let platform;
 if(climb){
  await hold(64,9);await hold(16,59);
  for(let i=0;i<500&&await read(0x1812,2)/16<263;i++)await hold(128,1);
  await wait(20);await hold(32,40);await hold(128,24);await hold(16,100);await wait(20);await tap(256,500);
  const leader=await read(0x197,2);platform={leader:[await read(0x1800+leader,2)/16,await read(0x1880+leader,2)/16],body:[await read(0x1812,2)/16,await read(0x1892,2)/16],control:await read(0x11f)};
  assert.equal(platform.control,1);assert.ok(platform.leader[1]<212);assert.ok(platform.body[0]>=256&&platform.body[0]<272);assert.ok(platform.body[1]>=240&&platform.body[1]<256);
  await shot?.('spawn-platform-climbed');
 }
 return {location,formation,attacks,victory:true,platform};
}
