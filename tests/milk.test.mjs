import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {decode} from '../engine/text.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {techniqueTables as table} from '../engine/technique-revision.js';
import {milkColor} from '../engine/milk.js';

// Effect entries Water and Water II write in the live battle palette: the
// droplet rows (OBJ palettes 0 and 4) and the Water II wave (BG palette 1,
// colors 9-11 and 13-15; color 12 is the battlefield, dimmed by the fade).
const milkRanges=[[0x2232,0x2238],[0x223a,0x2240],[0x2300,0x2310],[0x2380,0x23a0]];

const b=await build(),rom=b.rom,specs=JSON.parse(await readFile('content/hooks.json'));

test('the milk color mapping is a same-brightness cream white and idempotent',()=>{
 for(let c=0;c<0x8000;c+=7){
  const m=milkColor(c),v=Math.max(c&31,c>>5&31,c>>10&31);
  assert.equal(m&31,v);assert.equal(m>>5&31,v);assert.equal(m>>10&31,Math.max(v-1,0));assert.equal(milkColor(m),m);
 }
});

test('Milk and Milk 2 keep Water and Water II mechanics under their new labels',()=>{
 assert.deepEqual(b.audit.milk.techs,[35,38]);assert.equal(b.audit.milk.hooks.length,3);assert.equal(b.audit.techThemes.assignments[35],'milk');assert.equal(b.audit.techThemes.assignments[38],'milk');assert.equal(b.audit.techThemes.hooks.length,10);
 for(const[id,name]of[[35,'Milk'],[38,'Milk 2']]){
  for(const[p,n]of[[table.target(id),2],[table.control(id),11],[table.property(id),12],[table.animation(id),7]])assert.deepEqual(rom.slice(p,p+n),b.base.slice(p,p+n),`tech ${id} native record`);
  assert.equal(rom[table.MP+id],b.base[table.MP+id]);
  assert.equal(decode(rom.subarray(0xc15c4+id*11,0xc15c4+id*11+11)).replace(/^\{2f\}/,'').trim(),name);
 }
});

test('Puss casts milk-white effects through the native palette upload',async()=>{
 for(const id of[35,38]){
  const s=await bedroom(rom),h=installHooks(s,specs),d=createDevTools(s,h);
  d.jump({id:1,x:8,y:8,party:[4,0,1],endgame:true});runFrames(s,300);d.startCombat({fixture:'clowns',unlockTechs:true});runFrames(s,400);
  const io={read:(p,n=1)=>n===2?s.ram[p]|s.ram[p+1]<<8:s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(k,gap=12)=>{runFrames(s,3,k);runFrames(s,gap);}};
  const before=new Map();for(const[start,end]of milkRanges)for(let p=start;p<end;p+=2)before.set(p,s.ram[p]|s.ram[p+1]<<8);
  await chooseNativeTech(io,rom,0,id);
  let frames=0,colored=0,blue=0;
  for(let f=0;f<700;f++){
   s.runFrame();
   if(s.ram[0xae92]!==2||s.ram[0xae93]!==id)continue;
   frames++;
   // Sample the visible effect (after the windup); color 0 of each palette
   // row is transparent and never drawn.
   if(frames<120)continue;
   for(const[start,end]of milkRanges)for(let p=start;p<end;p+=2){
    if((p&31)===0)continue;
    // Only entries the spell itself wrote; party and enemy colors are untouched.
    // Bit 15 is ignored by the PPU; pure grays and whites count as milk too.
    const c=(s.ram[p]|s.ram[p+1]<<8)&0x7fff;if(!c||c===(before.get(p)&0x7fff))continue;colored++;
    const r=c&31,g=c>>5&31,b=c>>10&31;if(milkColor(c)!==c&&!(r===g&&g===b))blue++;
   }
  }
  assert.ok(frames>60,`tech ${id} plays its native scene`);assert.ok(colored>0,`tech ${id} loads effect colors`);
  // The upload runs once per frame; a color written after it this frame is
  // converted on the next one, so allow a few transient samples.
  assert.ok(blue<=colored*0.02,`tech ${id} effect colors are milk white (${blue} of ${colored} not yet converted)`);
 }
});
