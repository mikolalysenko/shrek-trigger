import assert from 'node:assert/strict';

// Original scene actors and triggers. The adapter deliberately offers only
// reads and controller input after the caller's diagnostic location entry.
export async function traverseWoodlandEncounter(io,key){
 async function approach(object,limit=1600){
  for(let n=0;n<limit&&!(await io.read(0x117)&1);n++){
   const leader=await io.read(0x197,2),dx=((await io.read(0x1800+object*2,2))-(await io.read(0x1800+leader,2)))/16,dy=((await io.read(0x1880+object*2,2))-(await io.read(0x1880+leader,2)))/16;
   await io.hold(1|(Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0)|(n%60<3?256:0),1);
  }
 }
 async function findEnemy(enemy){const headers=await io.bytes(0x1100,128);for(let n=0;n<64;n++)if([5,6].includes(headers[n*2])&&headers[n*2+1]===enemy)return n;assert.fail('Original field enemy '+enemy+' is loaded');}
 if(key==='forest-pots'){await io.hold(145,16);await io.hold(16,20);await io.tap(256,100);}
 else if(key==='forest-beetles')await approach(14);
 else if(key==='arris')await approach(await findEnemy(140));
 else if(key==='conveyor'){
  const x=await io.read(0x1810,2);await io.wait(60);assert.notEqual(await io.read(0x1810,2),x,'conveyor patrol moves');
  await io.hold(17,6);for(let n=0;n<12&&!(await io.read(0x117)&1);n++)await io.tap(256,90);
 }else throw Error('Unknown woodland encounter '+key);
 await io.wait(500);assert.equal(await io.read(0x117)&1,1,key+' original battle');
 const formation=(await io.bytes(0xaf02,8)).filter(id=>id!==255);
 if(key==='forest-pots')assert.deepEqual(formation,[94,94,94]);
 else if(key==='conveyor')assert.deepEqual(formation,[140,140,140,140]);
 else assert.ok(formation.includes(key==='forest-beetles'?141:140));
 await io.shot(key+'-battle');let attacks=0;
 for(;attacks<160&&(await io.read(0x117)&1);attacks++)await io.tap(256,100);
 assert.equal(await io.read(0x117)&1,0,key+' original victory');await io.wait(120);
 assert.equal(await io.read(0x11f),1,key+' field control returns');
 if(key==='conveyor'){
  assert.equal(await io.read(0x10210),0);assert.equal(await io.read(0x10000),60);
  const leader=await io.read(0x197,2),y=await io.read(0x1880+leader,2);await io.hold(33,16);assert.ok(await io.read(0x1880+leader,2)>y,'conveyor return movement');
 }
 await io.shot(key+'-returned');return{key,formation,attacks,location:await io.read(0x100,2),heapBytes:(await io.read(0x171,2))-0x8000};
}

export async function demonstrateBriarRider(io){
 assert.equal(await io.read(0x100,2),342);const headers=await io.bytes(0x1100,128),object=Array.from({length:64},(_,n)=>n).find(n=>[5,6].includes(headers[n*2])&&headers[n*2+1]===175);assert.ok(Number.isInteger(object));
 await io.hold(16,4);for(let i=0;i<12&&await io.read(0x12a)!==41;i++)await io.tap(256,50);assert.equal(await io.read(0x12a),41);
 const frames=new Set(),scripts=new Set();
 for(let t=0;t<500;t++){
  await io.hold(t%45<3?256:0,1);frames.add(await io.read(0xf01+object*2));scripts.add(await io.read(0x1180+object*2,2));
 }
 for(const frame of[18,19,21,23])assert.ok(frames.has(frame),'original rider demonstration frame '+frame);
 for(const pc of[519,522,525,528])assert.ok(scripts.has(pc),'original rider AB8 event '+pc);
 await io.shot('rider-demo');return{location:342,object,frames:[...frames].sort((a,b)=>a-b),originalActionScripts:[519,522,525,528],scope:'Original developer ending-room display interaction; no invented combat encounter.'};
}
