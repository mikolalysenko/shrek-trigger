import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {themeColors} from '../engine/tech-themes.js';
import {techThemes} from '../content/tech-themes.js';

const b=await build(),rom=b.rom,specs=JSON.parse(await readFile('content/hooks.json'));
const brightness=c=>Math.max(c&31,c>>5&31,c>>10&31);

test('every themed technique is in the native lookup with its catalogue theme',()=>{
 const a=b.audit.techThemes;
 for(const[id,t]of Object.entries(techThemes))assert.equal(a.assignments[id],t.theme,`tech ${id}`);
 for(const id of[35,38])assert.equal(a.assignments[id],'milk');
 assert.equal(a.hooks.length,10);assert.equal(a.extraWramBytes,0);assert.equal(a.extraVramBytes,0);
});

test('theme colors keep each color’s brightness and leave grays alone',()=>{
 for(const[name,color]of Object.entries(themeColors)){
  if(name==='milk'||name==='fairy'||name==='icing')continue; // these deliberately lighten
  for(let c=0;c<0x8000;c+=97){const m=color(c);assert.ok(Math.abs(brightness(m)-brightness(c))<=1,`${name} ${c.toString(16)}`);}
  for(const g of[0,0x2108,0x4210,0x7fff])assert.equal(color(g),g,`${name} keeps gray ${g.toString(16)}`);
 }
});

test('Dragon Kiss turns Fire pink only while Donkey casts it',async()=>{
 const s=await bedroom(rom),h=installHooks(s,specs),d=createDevTools(s,h);
 d.jump({id:1,x:8,y:8,party:[2,0,1],endgame:true});runFrames(s,300);d.startCombat({fixture:'clowns',unlockTechs:true});runFrames(s,400);
 const io={read:(p,n=1)=>n===2?s.ram[p]|s.ram[p+1]<<8:s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(k,gap=12)=>{runFrames(s,3,k);runFrames(s,gap);}};
 const before=s.ram.slice(0x2300,0x2320);
 await chooseNativeTech(io,rom,0,19);
 let pink=0,orange=0;
 for(let f=0;f<700;f++){
  s.runFrame();if(s.ram[0xae92]!==2||s.ram[0xae93]!==19)continue;
  for(let p=0x2302;p<0x2320;p+=2){
   const c=s.ram[p]|s.ram[p+1]<<8;if(c===(before[p-0x2300]|before[p-0x22ff]<<8))continue;
   const r=c&31,g=c>>5&31,bl=c>>10&31;if(r>g+4&&bl>g+2)pink++;else if(r>g+4&&g>bl+2)orange++;
  }
 }
 assert.ok(pink>20,`pink fire colors (${pink})`);assert.ok(orange<pink/10,`little orange left (${orange})`);
});
