import assert from 'node:assert/strict';

// Buy from a native shop through controller input. The party must already
// face the shopkeeper. The shop's item list is read from WRAM ($1000) to find
// each item's row; the native quantity selector stops at what the party can
// afford. Returns {item: bought} counts.
const u24=b=>b[0]|b[1]<<8|b[2]<<16;
export async function buyFromShop(io,wants){
 const{read,bytes,hold,tap,wait}=io;
 const quantity=async item=>{const r=await bytes(0x2400,512);let n=0;for(let i=0;i<256;i++)if(r[i]===item)n+=r[i+256];return n;};
 await hold(16,4);await tap(256,180);
 for(let i=0;i<20&&await read(0xd13)!==47;i++)await tap(256,180);
 assert.equal(await read(0xd13),47,'native shop menu');await wait(200);
 const list=Array.from(await bytes(0x1000,16)),bought={};
 for(const [item,count] of wants){
  const row=list.indexOf(item);assert.ok(row>=0,'shop sells item '+item);
  const before=await quantity(item),gold=u24(await bytes(0x2c53,3));
  await tap(256,180);for(let i=0;i<row;i++)await tap(32,40);
  await tap(256,120);for(let i=1;i<count;i++)await tap(128,20);await tap(256,180);
  bought[item]=await quantity(item)-before;
  assert.ok(bought[item]>=1,'bought item '+item);assert.ok(u24(await bytes(0x2c53,3))<gold,'gold spent');
  await tap(1,180);
 }
 for(let i=0;i<4;i++)await tap(1,180);
 for(let i=0;i<20&&(await read(0x126)||!await read(0x11f));i++)await tap(256,100);
 assert.equal(await read(0x11f),1,'shop closed');
 return bought;
}
