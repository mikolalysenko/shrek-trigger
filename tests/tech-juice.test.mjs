// Battle sound swaps and impact shake (engine/tech-juice.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {u16} from '../engine/rom.js';
import {techJuiceTables} from '../engine/tech-juice.js';
import {soundSwaps,impacts,sounds} from '../content/tech-juice.js';

const b=await build(),specs=JSON.parse(await readFile(new URL('../content/hooks.json',import.meta.url)));
const offsets=s=>{let m=0;for(let p=0xcca4;p<0xccb0;p+=2){const v=s.ram[p]|s.ram[p+1]<<8;m=Math.max(m,Math.abs(v>32767?v-65536:v));}return m;};

async function cast(id,frames=330){
 const owner=Math.floor((id-1)/8),party=[owner,...[0,1,2,3].filter(x=>x!==owner).slice(0,2)];
 const s=await bedroom(b.rom),h=installHooks(s,[...specs,{name:'sound.driver',address:0xc70140,expected:[...b.rom.slice(0x70140,0x70144)]}]),d=createDevTools(s,h);
 d.jump({id:1,x:7,y:8,party,endgame:true});runFrames(s,300);
 const fieldShake=offsets(s),fieldBlock=s.ram.slice(0xccb0,0xccc1);
 d.startCombat({fixture:'swamp-pack',unlockTechs:true});runFrames(s,400);
 for(let n=0;n<1800&&s.ram[0x95d5]>2;n++)s.runFrame();
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
 const heard=[];h.on('sound.driver',()=>{if((s.ram[0x1e00]&0xfe)===0x18)heard.push(s.ram[0x1e01]);});
 await chooseNativeTech(io,b.rom,0,id);heard.length=0;
 let peak=0,shaken=0;for(let f=0;f<frames;f++){s.runFrame();const o=offsets(s);peak=Math.max(peak,o);if(o)shaken++;}
 const settled=offsets(s),enabled=s.ram[0xccb0]|s.ram[0xccb8],fatal=d.diagnostics().fatal;d.dispose();h.dispose();
 return{heard,peak,shaken,settled,enabled,fatal,fieldShake,fieldBlock};
}

test('the sound and impact tables are well formed and the hook replaces only the driver jump',()=>{
 const t=techJuiceTables();assert.equal(t.swaps.length,soundSwaps.length*3+1);assert.equal(t.shakes.length,impacts.length*3+1);
 assert.equal(t.swaps.at(-1),0);assert.equal(t.shakes.at(-1),0);
 for(const[tech,from,to]of soundSwaps){assert.ok(tech>=1&&tech<=116);assert.notEqual(from,to);assert.ok(to>0&&to<0xfd,'a stock battle sound');}
 for(const[sound,amplitude,decay]of impacts){assert.ok(sound>0&&sound<0xfd,'not the stop cue or the fart buzz');assert.ok(amplitude*decay<=60,'a shake lasts under a second');}
 const a=b.audit.techJuice;assert.deepEqual([...b.base.subarray(a.entry,a.entry+4)],[0x4c,0x40,0x01,0xea]);
 assert.equal(b.rom[a.entry],0x5c);assert.equal((b.rom[a.entry+1]|b.rom[a.entry+2]<<8),a.address&0xffff);
 // Everything else in the driver's jump table and body is original.
 assert.deepEqual(b.rom.subarray(0x70000,0x70004),b.base.subarray(0x70000,0x70004));
 assert.deepEqual(b.rom.subarray(0x70008,0x70200),b.base.subarray(0x70008,0x70200));
 // The hook ends by entering the original routine.
 const code=b.rom.subarray(a.address,a.address+a.bytes);assert.ok(code.some((v,i)=>v===0x5c&&code[i+1]===0x40&&code[i+2]===0x01&&code[i+3]===0xc7));
});

test('Compensate is heard as the big explosion and rocks the screen, then settles',async()=>{
 const r=await cast(52);
 assert.equal(r.fatal,null);
 assert.ok(r.heard.includes(sounds.bigExplosion),'heard '+r.heard.map(v=>v.toString(16)));assert.ok(!r.heard.includes(sounds.darkBomb));
 assert.ok(r.peak>=4,'peak offset '+r.peak);assert.ok(r.shaken>=10&&r.shaken<=150,'shaken frames '+r.shaken); // Dark Bomb's own scripted quake follows ours
 assert.equal(r.settled,0);assert.equal(r.enabled,0);
 assert.equal(r.fieldShake,0,'no shake on the field');
});

test('Call My Wife roars and burns; Sing-Along, with no impact cue, never shakes',async()=>{
 const wife=await cast(24,420);
 assert.deepEqual(wife.heard.filter(v=>[sounds.roar,sounds.inferno,sounds.luminaireCharge,sounds.luminaireBlast].includes(v)),[sounds.roar,sounds.inferno]);
 assert.ok(wife.peak>=3);assert.equal(wife.settled,0);
 const song=await cast(9);
 assert.equal(song.peak,0);assert.equal(song.fatal,null);
});

test('a field event frog croak reaches the sound driver as a cat meow; other field sounds pass through',async()=>{
 const {FROG_CROAK,CAT_MEOW}=await import('../engine/tech-juice.js');
 for(const[sent,expected]of[[FROG_CROAK,CAT_MEOW],[0x65,0x65],[CAT_MEOW,CAT_MEOW]]){
  const s=await bedroom(b.rom),c=s.cpu;
  // Run the stock event handler for opcode E8 (C0:3C11) with its operand in the event buffer.
  c.e=false;c.m=true;c.x=false;c.i=true;c.r[0]=0;c.r[1]=0xc0;c.br[4]=0x3c11;c.br[2]=0x0100;c.br[3]=0x1ff0;c.br[5]=0;
  s.ram[0x12001+0x101]=sent;
  let n=0;while((c.r[1]<<16|c.br[4])!==0xc70140&&n++<5000)c.cycle();assert.ok(n<5000,'the driver was reached');
  assert.equal(s.ram[0x1e00],0x18);assert.equal(s.ram[0x1e01],expected,'sound 0x'+sent.toString(16));
 }
});
