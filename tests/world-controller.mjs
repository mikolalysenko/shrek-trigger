import assert from 'node:assert/strict';

// Read-only navigation on the native overworld. Coordinates use the E0
// transition's eight-pixel units. A brief press followed by release lets the
// native grid step finish without latching an extra step at the destination.
export async function walkWorld(io,points){
 const location=await io.read(0x100,2);
 assert.ok(location>=0x1f0&&location<0x1f8,'expected an overworld');
 for(const[x,y]of points){
  let arrived=false;
  for(let i=0;i<120;i++){
   assert.equal(await io.read(0x100,2),location,'unexpected world transition');
   const dx=x*8-await io.read(0x283,2),dy=y*8-await io.read(0x285,2);
   if(!dx&&!dy){arrived=true;break;}
   await io.hold(dx?(dx>0?128:64):(dy>0?32:16),1);await io.wait(24);
  }
  assert.ok(arrived,`world waypoint ${x},${y} from ${await io.read(0x283,2)},${await io.read(0x285,2)}`);
 }
}

export async function enterWorldLocation(io,location){
 const record=await io.read(0x1b32,2);
 assert.notEqual(record,65535,'no native entrance under the party');
 assert.equal((await io.read(0x7e03+record,2))&511,location,'entrance destination');
 await io.tap(256,500);assert.equal(await io.read(0x100,2),location);
}
