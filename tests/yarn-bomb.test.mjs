import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {assertRevisedBytes} from './technique-revision-fixtures.mjs';
import {build,bedroom,screenshot,needsSourceImages} from './helpers.mjs';
import {createCore} from '../scripts/core.mjs';
import {u16,put16} from '../engine/rom.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';
import {yarnBallArt} from '../content/yarn-ball-art.js';
import {convertYarnBall,yarnBallCells} from '../assets/imagegen/yarn-ball/convert.mjs';
import {yarnBallGraphics,yarnBallGlint,yarnBallMap} from '../engine/yarn-ball.js';
import {EFFECT_HOOKS_BLOCK,extendedDataPools} from '../engine/expanded-rom.js';

const b=await build(),yarn=yarnBallGraphics(),glint=yarnBallGlint();
function start(s,pc,{slot=1,tech=40,action=2,bg=65}={}){
 const c=s.cpu;s.ram.fill(0);c.reset();c.e=false;c.m=true;c.x=false;c.i=true;c.cyclesLeft=0;c.r[0]=0x7e;c.r[1]=pc>>16;c.br[4]=pc&65535;c.br[5]=0;c.br[3]=0x7ff;
 s.ram[0xae91]=slot;s.ram[0xae92]=action;s.ram[0xae93]=tech;put16(s.ram,0xcca2,bg);
}
function until(s,pc){let n=0;while((s.cpu.r[1]<<16|s.cpu.br[4])!==pc&&n++<100000)s.cpu.cycle();assert.ok(n<100000,'native helper returned');return n;}
function cpu(s){assert.equal(s.cpu.br[3],0x7ff);assert.equal(s.cpu.r[0],0x7e);assert.equal(s.cpu.m,true);assert.equal(s.cpu.x,false);}
const isYarn=({slot=1,tech=40,action=2,bg=65})=>slot<3&&tech===40&&action===2&&bg===65;
const isBelch=({slot=0,tech=40,action=2,bg=65})=>slot<3&&tech===8&&action===2&&bg===1;

test('the yarn ball is reproducible from its image-generation source and stays in the native frog cells',{skip:needsSourceImages},async()=>{
 assert.equal(convertYarnBall(),await readFile(new URL('../content/yarn-ball-art.js',import.meta.url),'utf8'));
 assert.equal(yarnBallArt.palette.length,3);
 yarnBallArt.rows.forEach((row,y)=>{for(let x=0;x<96;x++)if(!yarnBallCells[y>>4].includes(x>>4))assert.equal(row[x],'0',`empty native cell at ${x},${y}`);});
 yarnBallMap.forEach((row,r)=>{for(let c=0;c<6;c++)assert.equal(row[c]!==undefined,yarnBallCells[r].includes(c),`native map cell ${r},${c}`);});
 // Every tile outside the drawn cells stays blank, including the native blank cell 0EE.
 const used=new Set();for(const big of yarnBallMap.flat())for(const t of[big,big+1,big+16,big+17])used.add(t);
 for(let t=0;t<256;t++)if(!used.has(t))assert.ok(yarn.graphics.slice(t*16,t*16+16).every(v=>!v),'blank tile '+t);
});

test('Yarn Bomb keeps Frog Squash mechanics and its shared hooks use only the reserved end of bank $7D',()=>{
 for(const[start,end]of[[0xc1acb,0xc247b],[0xc253b,0xc2580],[0x114100,0x115000]])assertRevisedBytes(b.rom,b.base,start,end);
 const header=0xd45a6+40*7;assert.deepEqual(b.rom.slice(header,header+7),Uint8Array.of(40,224,0,28,40,2,65));
 assert.deepEqual(b.rom.slice(0xd45a6,0xd45a6+256*7).reduce((a,v,i)=>(i%7===6&&v===65&&a.push(i/7|0),a),[]),[40],'only Frog Squash shows the frog background');
 const {tiles,glint:table}=b.audit.yarnBomb;
 assert.equal(extendedDataPools().at(-1).end,EFFECT_HOOKS_BLOCK);
 assert.deepEqual(b.rom.slice(table,table+glint.length),glint);assert.deepEqual(b.rom.slice(tiles,tiles+4096),yarn.graphics);assert.equal(tiles+4096,0x7d8000);
 // The three hooks that branch for Yarn Bomb run from the reserved block.
 const shared=b.audit.yarnBomb.hooks.filter(h=>[0xd0fa9,0xd1004,0xd2d5e].includes(h.offset));
 assert.equal(shared.length,3);for(const h of shared)assert.ok(h.address>=EFFECT_HOOKS_BLOCK&&h.address+h.bytes<=table,h.label);
 for(let i=0;i<96;i++)assert.deepEqual([...glint.slice(i*4,i*4+4)].filter((v,j)=>j!==2),[0,4,0],'native CGWSEL, CGADSUB and SETINI');
});

test('native upload, palette and glint selectors run only for Yarn Bomb and preserve CPU state',async()=>{
 const s=await createCore(b.rom),legacy=await createCore(b.base);
 for(const args of[{},{slot:0},{slot:2},{slot:3},{tech:39},{tech:41},{tech:101},{action:1},{bg:64},{bg:65+256},{tech:8,bg:1}]){
  const selected=isYarn(args),belch=isBelch(args);
  for(let chunk=0;chunk<4;chunk++){
   start(s,0xcd0fa9,args);s.cpu.br[1]=99;s.cpu.br[2]=1234;s.ram[0xcace]=chunk;s.ram.fill(0x91,0x2d00,0x3100);until(s,0xcd0fae);
   if(!belch)assert.deepEqual(s.ram.slice(0x2d00,0x3100),selected?yarn.graphics.slice(chunk*1024,chunk*1024+1024):new Uint8Array(1024).fill(0x91));
   assert.equal(s.cpu.br[1],chunk*2);assert.equal(s.cpu.br[2],1234);cpu(s);
  }
  start(s,0xcd1004,args);s.cpu.br[1]=1234;s.cpu.br[2]=4567;s.ram[0xca95]=s.ram[0xca96]=3;until(s,0xcd1009);
  assert.equal(s.cpu.br[1],1234);assert.equal(s.cpu.br[2],0);cpu(s);
  if(!belch){
   // Yarn Bomb replaces only palette 6; the native palette-7 load and the map stay.
   assert.equal(s.ram[0xca95],selected?255:3);assert.equal(s.ram[0xca96],3);assert.ok(s.ram.slice(0xd000,0xd800).every(v=>!v));
   for(const p of[0x2032,0x2232])for(let i=0;i<3;i++)assert.equal(u16(s.ram,p+i*2),selected?yarn.palette[i]:0);
   for(const p of[0x203a,0x223a])for(let i=0;i<3;i++)assert.equal(u16(s.ram,p+i*2),0);
  }
  // Run the whole native opcode CD:2D44 (rainbow setup) against the stock cartridge.
  for(const fade of[0,5]){
   for(const core of[s,legacy]){start(core,0xcd2d44,args);core.ram[0xcd04]=fade;put16(core.ram,0x800,0x7fff);until(core,0xcd8000);}
   for(let i=0;i<0x20000;i++){
    const coldata=i>=0xbb07&&i<0xbb07+96*4&&(i-0xbb07)%4===0;
    if(selected&&coldata)assert.equal(s.ram[i],glint[i-0xbb05],'glint line '+(i-0xbb07)/4);
    else if(s.ram[i]!==legacy.ram[i])assert.fail(`WRAM $7E:${i.toString(16)} differs from the stock opcode`);
   }
   assert.deepEqual(s.cpu.br,legacy.cpu.br,'registers and stack');assert.deepEqual(s.cpu.r,legacy.cpu.r);
   for(const flag of['m','x','c','z','n','v','e','i','d'])assert.equal(s.cpu[flag],legacy.cpu[flag],'flag '+flag);
  }
 }
});

test('a live Yarn Bomb drops the yarn ball on every enemy from all party slots and restores the battle renderer',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json'));await mkdir('.local/qa',{recursive:true});
 for(const party of[[0,4,1],[4,0,1],[0,1,4]]){
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h),slot=party.indexOf(4);
  d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);d.startCombat({fixture:'swamp-pack',unlockTechs:true});runFrames(s,400);
  for(let n=0;n<1500&&s.ram[0x95d5]>2;n++)s.runFrame();
  const hits=[];let cast=false,exact=false,palette=false,map=false,glinting=false,restored=false;
  h.on('battle.tech',e=>{if(e.techId===40&&e.actor===slot)cast=true;});h.on('battle.result',e=>{if(e.techId===40&&e.actor===slot)hits.push(e);});
  const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
  await chooseNativeTech(io,b.rom,slot,40);
  for(let f=0;f<2000;f++){
   s.runFrame();
   if(cast&&u16(s.ram,0xcca2)===65){
    const vram=new Uint8Array(s.ppu.vram.buffer),words=s.ppu.vram;
    exact ||= yarn.graphics.every((v,i)=>vram[0xa000+i]===v);
    palette ||= yarn.palette.every((v,i)=>s.ppu.cgram[25+i]===v);
    // Left-half cells show the drawn tiles in palette 6; the right half mirrors them.
    map ||= exact&&yarnBallMap.every((row,r)=>{for(let c=0;c<12;c++){const e=words[0x7c00+r*32+c],big=row[c<6?c:11-c];if(big===undefined){if(![0,1,16,17].every(k=>vram.slice(0xa000+((e&1023)+k)*16,0xa000+((e&1023)+k+1)*16).every(v=>!v)))return false;}else if((e&1023)!==big||(e>>10&7)!==6||!!(e&0x4000)!==(c>=6))return false;}return true;});
    const coldata=Array.from({length:96},(_,i)=>s.ram[0xbb07+i*4]);
    glinting ||= Array.from({length:96},(_,i)=>s.ram[0xbb06+i*4]).every(v=>v===4)&&coldata.some((_,k)=>coldata.every((v,i)=>v===glint[((i+k)%96)*4+2]));
   }
   if(f===240)await screenshot(s,`.local/qa/yarn-bomb-slot-${slot}.png`);
   if(exact&&u16(s.ram,0xcca2)===0){restored=true;runFrames(s,180);break;}
  }
  assert.ok(cast);assert.ok(exact,'exact 4 KiB yarn ball BG3 upload');assert.ok(palette,'three generated reds in BG3 palette 6');
  assert.ok(map,'native mirrored frog map shows only the drawn cells');assert.ok(glinting,'the native rotation sweeps the glint');
  assert.equal(new Set(hits.map(e=>e.target)).size,3,'every enemy is hit');assert.ok(hits.every(e=>e.target>=3&&e.value>0));
  assert.ok(restored,'native renderer cleanup completes');assert.equal(d.diagnostics().fatal,null);assert.equal(s.cpu.stopped,false);
  d.undo();assert.deepEqual(s.cart.data,b.rom);d.dispose();h.dispose();
 }
});
