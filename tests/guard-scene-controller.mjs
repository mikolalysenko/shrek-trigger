import assert from 'node:assert/strict';
import {u16} from '../engine/rom.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {spriteSource} from './sprite-source.mjs';
import {traverseSewerEntrance,traverseSewerDiary,traverseSewer,traverseUpperSewer} from './sewer-controller.mjs';

// Every action here is a controller input or an observation. The same route
// runs in SnesJs and the two independent cartridge emulators.
export async function traverseGuardScene(io,rom,key,{streams}={}){
 const {read,bytes,hold,tap,wait,shot}=io;
 const battle=async()=>!!(await read(0x117)&1);
 const formation=async()=>Array.from(await bytes(0xaf02,8)).filter(n=>n!==255);
 async function pointers(gfx){
  if(!streams)return[];
  const table=await bytes(0xaf02,8),p=await bytes(0x1c60,24),found=[];
  for(let i=0;i<8;i++)if(table[i]!==255&&rom[0x24f600+table[i]*10]===gfx){const address=p[i*3]|p[i*3+1]<<8|p[i*3+2]<<16;assert.ok(spriteSource(rom,streams,gfx).battle(address),'battle graphics source '+address.toString(16));found.push({enemy:table[i],slot:i,address});}
  assert.ok(found.length,'Native battle uses the selected graphics bank');return found;
 }
 async function victory(max=180){let inputs=0;for(;inputs<max&&await battle();inputs++)await tap(256,100);assert.equal(await battle(),false,'Battle ended through native combat');for(let i=0;i<30&&!await read(0x11f);i++)await tap(256,100);await wait(120);return inputs;}
 if(key==='sewer'){
  const entrance=await traverseSewerEntrance(io),diary=await traverseSewerDiary(io),lower=await traverseSewer(io,true),upper=await traverseUpperSewer(io);
  assert.equal(upper.flags,31);return{key,entrance,diary,lower,upper,battles:entrance.formations.length+lower.formations.length+upper.formations.length};
 }
 if(key==='prison-rescue'){
  for(let i=0;i<150&&await read(0x10000)!==46;i++)await tap(256,100);
  await wait(120);assert.equal(await read(0x100,2),30);assert.equal(await read(0x10000),46);assert.deepEqual(Array.from(await bytes(0x2980,3)),[0,2,128]);
  const frames=await bytes(0xf01,48),source=await bytes(0x1200,0x100),fallen=[];
  for(let object=0;object<24;object++){const x=object*2,address=source[x]<<16|u16(source,0x80+x);if(address===streams[78]&&frames[x]===25)fallen.push(object);}
  assert.ok(fallen.length>=2,'Both original prison guards display their fallen pose');await shot('guards-prison-rescue');return{key,location:30,story:46,fallen};
 }
 if(key==='prison-breakout'){
  await hold(32,12);let fought=false,captured=false,inputs=0;
  for(;inputs<160;inputs++){
   await tap(256,100);
   if(await read(0x12a)===15)await hold(32,12);
   if((await formation()).includes(49)&&await battle()){fought=true;if(!captured){await shot('guards-prison-battle');captured=true;}}
   if(fought&&!await battle()&&(await read(0x10190)&4)&&await read(0x11f))break;
  }
  assert.ok(fought);assert.equal(await battle(),false);assert.equal(await read(0x10190)&4,4);assert.equal(await read(0x10000),45);await shot('guards-prison-return');return{key,fought,inputs,story:45,flag190:await read(0x10190)};
 }
 if(key==='forest-pages'){
  for(const [tx,ty]of[[7,18],[10,23],[2,25],[7,29]]){
   for(let n=0;n<1200&&!await battle();n++){
    if(!await read(0x11f)){await tap();continue;}
    const r=await bytes(0x100,0x1900),o=u16(r,0x97),dx=tx*16+8-u16(r,0x1700+o)/16,dy=ty*16+7-u16(r,0x1780+o)/16;
    if(Math.abs(dx)<3&&Math.abs(dy)<3)break;
    await hold(1|(Math.abs(dx)>2?(dx>0?128:64):0)|(Math.abs(dy)>2?(dy>0?32:16):0),1);
   }
   if(await battle())break;
  }
 }else if(key==='desert-baron'){
  await hold(129,20);for(let n=0;n<16&&!await battle();n++)await tap(256,100);
 }else if(key==='ruins-sentries'){
  for(let n=0;n<50&&!await battle();n++){await hold(32,6);await tap(256,100);}
 }else throw Error('Unknown guard scene '+key);
 assert.equal(await battle(),true,'Original encounter starts');await wait(500);
 const enemies=await formation(),gfx=key==='forest-pages'?98:key==='desert-baron'?82:78;
 // Approach timing can add a stock Gnasher to the two native Pages.
 // Preserve the authored Page formation without rejecting that native variant.
 if(key==='forest-pages'){
  assert.ok(enemies.every(id=>[0,76,29].includes(id)));
  assert.deepEqual(enemies.filter(id=>id!==0),[76,29,76]);
 }else assert.deepEqual(enemies,key==='desert-baron'?[101,101,101,238]:[50,50]);
 const sources=await pointers(gfx);await shot('guards-'+key+'-battle');
 let magic;
 if(key==='ruins-sentries'){const mpBefore=await read(0x5e34,2),selection=await chooseNativeTech(io,rom,0,8);await wait(1800);magic={selection,mpBefore,mpAfter:await read(0x5e34,2)};assert.ok(magic.mpAfter<mpBefore,'Swamp Belch spends native MP');}
 const inputs=await victory();
 if(key==='desert-baron'){for(let n=0;n<30&&!(await read(0x101ad)&4);n++)await tap(256,100);assert.equal(await read(0x101ad)&4,4);}
 await shot('guards-'+key+'-victory');return{key,enemies,sources,magic,inputs,location:await read(0x100,2),exploration:await read(0x11f)};
}
