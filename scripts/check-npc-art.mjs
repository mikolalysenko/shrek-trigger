import {cartridgeOffset} from '../engine/expanded-rom.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import {PNG} from 'pngjs';import {newGameSequence} from '../engine/automation.js';import {u16,u24,fileOffset} from '../engine/rom.js';import {decompress} from '../engine/compression.js';import {supportingCast} from '../content/supporting-cast.js';import {carnivalCast,carnivalFields} from '../content/carnival.js';
import {bakeryActors} from '../content/bakery-actors.js';
import {bakeryVillagers} from '../content/bakery-villagers.js';
import {bridgeActors} from '../content/bridge-actors.js';
import {courtBeasts} from '../content/court-beasts.js';
import {futureMachines,supplyKeeper} from '../content/future-machines.js';
import {futureWildlife} from '../content/future-wildlife.js';
import {nativeGuards} from '../content/native-guards.js';
import {courtPalaceActors} from '../content/court-palace.js';
import {swampImps} from '../content/swamp-imps.js';
import {townsfolk} from '../content/townsfolk.js';
import {storybookActors} from '../content/storybook-actors.js';
import {dulocTank} from '../content/duloc-tank.js';
import {finaleCompanions} from '../content/finale.js';
import {cosmicMuffinActors,cosmicMuffinSpawnActors} from '../content/cosmic-muffin.js';
import {caretaker} from '../content/caretaker.js';
import {endgameActors} from '../content/endgame-actors.js';
import {cosmicInteriorActors} from '../content/cosmic-interior.js';
import {tysonReveal} from '../content/tyson-reveal.js';
import {medinaActors} from '../content/medina-actors.js';
import {enforcerActors} from '../content/enforcer-actors.js';
import {swampCreatures} from '../content/swamp-creatures.js';
import {ghostActors} from '../content/ghost-actors.js';
import {guyFieriTiers} from '../content/guy-fieri.js';
import {largePreviewFrameWrites} from '../engine/preview-frames.js';
import {build} from '../tests/helpers.mjs';
import {spriteHeaders} from '../engine/native-sprites.js';
import {createHash} from 'node:crypto';
import {access} from 'node:fs/promises';
import {writeCandidate} from './independent-controller.mjs';
// Diagnostic inputs enter ordinary native events; the external cores execute
// all CPU, graphics loads and scene dispatch without JavaScript hooks.
const requested=process.argv[2]??'all',bosses=process.argv.includes('--bosses'),characterPass=process.argv.includes('--character-pass'),machinePass=process.argv.includes('--machine-pass'),cosmicPass=process.argv.includes('--cosmic-pass'),woodlandPass=process.argv.includes('--woodland-pass'),endgamePass=process.argv.includes('--endgame-pass'),guardPass=process.argv.includes('--guard-pass'),courtSwampPass=process.argv.includes('--court-swamp-pass');
const actorArgument=process.argv.indexOf('--actor'),actorKey=actorArgument<0?null:process.argv[actorArgument+1];
if(actorArgument>=0&&(!actorKey||actorKey.startsWith('--')))throw Error('--actor requires a native actor key');
if(!['all','snes9x','bsnes'].includes(requested))throw Error('Choose all, snes9x or bsnes');
async function tool(env,name){
 if(process.env[env])return path.resolve(process.env[env]);
 for(const root of['.local/tools/emu','../secret-of-goku/.local/tools/emu']){const file=path.resolve(root,name);try{await access(file);return file;}catch{}}
 throw Error('Set '+env+' to the installed '+name+'; see docs/native-port.md.');
}
const selectedCharacters=[...bakeryActors,...courtBeasts,...bridgeActors,...bakeryVillagers,...futureMachines.filter(a=>[96,97,197].includes(a.gfx)),supplyKeeper,...futureWildlife.filter(a=>[104,110].includes(a.gfx))];
for(const a of [...selectedCharacters])for(const npc of a.npcs??[])if(a.enemy!==undefined)selectedCharacters.push({...a,key:a.key+'-npc'+npc,npc,enemy:undefined});
const selectedMachines=[...dulocTank.filter(a=>a.enemy!==147),...finaleCompanions,...futureMachines.filter(a=>a.gfx===37),...futureWildlife.filter(a=>[93,102,105,154].includes(a.gfx))];
for(const a of [...selectedMachines])for(const npc of a.npcs??[])if(a.enemy!==undefined)selectedMachines.push({...a,key:a.key+'-npc'+npc,npc,enemy:undefined});
const selectedGuards=[...nativeGuards,...nativeGuards.flatMap(a=>(a.npcs??[]).map(npc=>({...a,key:a.key+'-npc'+npc,npc,enemy:undefined}))),...futureWildlife.filter(a=>[82,98].includes(a.gfx))];
const selectedCourtSwamp=[...courtPalaceActors,...swampImps,...swampImps.flatMap(a=>(a.npcs??[]).map(npc=>({...a,key:a.key+'-npc'+npc,npc,enemy:undefined})))];
const townsfolkPass=process.argv.includes('--townsfolk-pass'),storybookPass=process.argv.includes('--storybook-pass');
const selectedStorybook=storybookActors.flatMap(a=>[...(a.enemy===undefined?[]:[a]),...(a.npcs??[]).map(npc=>({...a,npc,enemy:undefined}))]);
const selectedTownsfolk=[...townsfolk.flatMap(a=>[...(a.enemy===undefined?[]:[a]),...(a.npcs??[]).map(npc=>({...a,key:a.enemy===undefined&&npc===a.npc?a.key:a.key+'-npc'+npc,npc,enemy:undefined}))]),{...guyFieriTiers[1],key:'guy-fieri-1',enemy:225,gfx:252}];
const allActors=storybookPass?selectedStorybook:townsfolkPass?selectedTownsfolk:courtSwampPass?selectedCourtSwamp:guardPass?selectedGuards:endgamePass?[...endgameActors,...cosmicInteriorActors,tysonReveal]:woodlandPass?futureWildlife.filter(a=>[89,92,112].includes(a.gfx)):cosmicPass?[...cosmicMuffinActors,...cosmicMuffinSpawnActors.filter(a=>a.gfx===176)]:machinePass?selectedMachines:characterPass?selectedCharacters:bosses?[...medinaActors,...enforcerActors,...swampCreatures,...ghostActors,...guyFieriTiers.map((t,tier)=>({...t,key:'guy-fieri-'+tier,enemy:t.id,gfx:252}))]:[caretaker,...supportingCast.map(a=>({...a,npc:a.npcs[0]})),...carnivalFields,...carnivalCast.filter(a=>a.size===0)];
const selectedActors=actorKey?allActors.filter(a=>a.key===actorKey):allActors,reports=[],checkEndings=!storybookPass&&!townsfolkPass&&!courtSwampPass&&!guardPass&&!endgamePass&&!woodlandPass&&!cosmicPass&&!machinePass&&!bosses&&!characterPass&&!actorKey;
assert.ok(selectedActors.length,'Unknown native actor: '+actorKey);
const built=await build(),rom=built.rom,headers=spriteHeaders(rom),actors=selectedActors.map(a=>{const h=headers.find(h=>a.enemy===undefined?h.kind==='npc'&&h.id===a.npc:h.kind==='enemy'&&h.id===a.enemy);if(!h)throw Error('Native header missing for '+a.key);return{...a,gfx:rom[h.offset],asm:rom[h.offset+1],palette:rom[h.offset+2],animation:rom[h.offset+3],size:rom[h.offset+4]};}),sha256=createHash('sha256').update(rom).digest('hex'),dir=path.resolve('.local/qa/'+(storybookPass?'storybook-art-':townsfolkPass?'townsfolk-art-':courtSwampPass?'court-swamp-art-':guardPass?'guard-art-':endgamePass?'endgame-art-':woodlandPass?'woodland-art-':cosmicPass?'cosmic-pass-art-':machinePass?'machine-pass-art-':characterPass?'character-pass-art-':bosses?'boss-art-':'npc-art-')+sha256.slice(0,12)+(actorKey?'-'+actorKey:'')),romPath=path.join(dir,'shrek-trigger.sfc'),host=await tool('RETRO_HOST','retro-host');
const cells=a=>((a.size??0)&2?3:1)*((a.size??0)&1?8:4);
const nativeTile=a=>a.enemy===undefined?(cells(a)===8?192:384):64;
const segments=a=>cells(a)===12?[0,512,256,768,1024,1536]:cells(a)===8?[0,256,512,768]:[0,512];
const displayed=(a,f)=>storybookPass||townsfolkPass||courtSwampPass||guardPass||endgamePass||woodlandPass||cosmicPass||machinePass||bosses||characterPass||!!actorKey||[0,1,Math.floor(a.frames/2),a.frames-1].includes(f);
await mkdir(dir,{recursive:true});await writeCandidate(romPath,rom);

function tiles(a,f){const data=decompress(rom,cartridgeOffset(u24(rom,0x242000+a.gfx*3),rom)).bytes,p=cartridgeOffset(u24(rom,0x242300+a.asm*3),rom)+f*cells(a)*10,out=[];for(let i=0;i<cells(a)*4;i++){const t=u16(rom,p+i*2),tile=data.slice((t&1023)*32,(t&1023)*32+32);for(let j=0;j<32;j++){let v=tile[t&0x8000?(j&24)|((7-((j>>1)&7))<<1)|(j&1):j];if(t&0x4000){v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;v=(v>>4)|(v&15)<<4;}out.push(v);}}return out;}
for(const core of requested==='all'?['snes9x','bsnes']:[requested]){
 const library=await tool(core==='snes9x'?'SNES9X_CORE':'BSNES_CORE',core+'_libretro.'+(process.platform==='darwin'?'dylib':'so'));
 const out=path.join(dir,core);await mkdir(out,{recursive:true});const steps=[],push=(...v)=>steps.push(...v),wait=frames=>({op:'wait',frames}),write=(addr,bytes)=>({op:'write',mem:'wram',addr,bytes}),read=(name,addr,size=1)=>({op:'read',mem:'wram',name,addr,size}),load=name=>({op:'loadstate',file:path.join(out,name+'.state')}),shot=name=>({op:'shot',name});
 for(const[frames,input]of newGameSequence)push(input?{op:'hold',frames,buttons:input===8?'start':'a'}:wait(frames));
 push(read('bedroom',0x100,2),{op:'savestate',name:'bedroom'},write(0x1238e,[0xe0,1,2,(endgamePass||guardPass||courtSwampPass||townsfolkPass||storybookPass)?4:8,(endgamePass||guardPass||courtSwampPass||townsfolkPass||storybookPass)?12:8,0xb2]),{op:'until',mem:'wram',addr:0x119e,size:2,value:0x57d,frames:400,every:1},{op:'savestate',name:'stage'});
 for(const a of actors){const header=a.enemy===undefined?[0x82,a.npc]:[0x83,a.enemy,0x83],tile=nativeTile(a),large=cells(a)===12,hand=a.gfx===162,y=[161,162].includes(a.gfx)?7:8;
  if(a.enemy===undefined&&cells(a)===8){
   // The eight-cell NPC needs its original initialization allocation. A
   // late replacement inherits the caretaker's smaller tile reservation;
   // the original unmodified mouth reproduces that invalid fixture too.
   push(load('bedroom'),write(0x1238e,[0xe0,1,2,endgamePass?4:8,endgamePass?12:8,0xb2]),
    {op:'until',mem:'wram',addr:0x100,size:2,value:1,frames:400},
    {op:'until',mem:'wram',addr:0x12535,size:2,value:0x2582,frames:400},write(0x12536,[a.npc]),
    {op:'until',mem:'wram',addr:0x119e,size:2,value:0x57d,frames:400});
  }else push(load('stage'));
  push(write(0x1225d,[0xb2]),write(0x1257e,[...header,0x33,1,0x8b,12,y,0xa6,1,...(large?[0xad,1,0x11,3]:hand?[0x8b,12,7,0xac,1,0xad,1,0x11,8]:[0xac,1,0xad,1,0x11,5])]),wait(48),read(a.key+'-source',0x129e,2),read(a.key+'-bank',0x121e));
  // Replacing an actor in place can retain the old object's cached zero.
  // Enter another native pose before checking zero, as in independent.mjs.
  if(large){for(const[p,b]of largePreviewFrameWrites(rom,a,15,1))push(write(p,b));push(wait(48));}
  for(let f=0;f<a.frames;f++){const key=a.key+'-'+f;
   if(a.gfx===91)push(write(0x1257e+header.length+4,[f===8?9:8]));
   if(large)for(const[p,b]of largePreviewFrameWrites(rom,a,15,f))push(write(p,b));else if(hand)push(write(0x1257e+header.length+9,[[8,9,18,19].includes(f)?5:7]),write(0x1257e+header.length+11,[f]));else push(write(0x12586+header.length,[f]));
   push(wait(large?48:16),read(key+'-frame',0xf1f),read(key+'-tile',0xd1e,2),read(key+'-heap',0x171,2));
   if(core==='snes9x')for(const [i,o]of segments(a).entries())push({op:'read',mem:'vram',name:key+'-tiles-'+i,addr:tile*32+o,len:256});
   if(displayed(a,f))push(shot(key));
  }
 }
 if(checkEndings)for(const[name,story,db]of[['ending0',0xc2,0],['ending1',0xc5,0],['ending2',0xc9,0],['ending3',0xcb,0],['ending4',0xff,1],['ending-default',0xff,0]])push(load('bedroom'),write(0x10000,[story]),write(0x100db,[db]),write(0x2980,[0,1,2,3,4,5,6,128]),write(0x29af,[254]),write(0x1238e,[0xe0,0x9f,1,7,31,0xb2]),wait(500),read(name+'-location',0x100,2),read(name+'-variant',0x10210),read(name+'-heap',0x171,2),shot(name));
 const script=path.join(out,'steps.json');console.log('Checking raw NPCs in '+core);
 await writeFile(script,JSON.stringify(steps));await new Promise((resolve,reject)=>{const p=spawn(host,['--core',library,'--rom',romPath,'--out',out,'--script',script,'--sram','zero','--quiet'],{stdio:['ignore','pipe','pipe']});let msg='';p.stdout.on('data',b=>msg=(msg+b).slice(-2000));p.stderr.on('data',b=>msg=(msg+b).slice(-2000));p.on('error',reject);p.on('close',c=>c?reject(Error(msg)):resolve());});
 const result=JSON.parse(await readFile(path.join(out,'results.json'))),v=result.values;assert.equal(v.bedroom,2);let displayedFrames=0,occludedSourcePixels=0;
 for(const a of actors){const stream=built.audit.resources.npcGraphicsStreaming.streams.find(g=>g.gfx===a.gfx);if(stream){assert.equal(v[a.key+'-source'],stream.address&65535,a.key+' source');assert.equal(v[a.key+'-bank'],stream.address>>16,a.key+' bank');}else{assert.equal(v[a.key+'-bank'],0x7f);assert.ok(v[a.key+'-source']>=0x8000&&v[a.key+'-source']+decompress(rom,cartridgeOffset(u24(rom,0x242000+a.gfx*3),rom)).bytes.length<=0x10000,a.key+' original heap source');}}
 for(const a of actors)for(let f=0;f<a.frames;f++){
  const key=a.key+'-'+f,expected=tiles(a,f);assert.equal(v[key+'-frame'],f,key);assert.equal(v[key+'-tile'],nativeTile(a),key);assert.ok(v[key+'-heap']>=0x8000&&v[key+'-heap']<0x10000);
  if(core==='snes9x')assert.deepEqual(segments(a).flatMap((_,i)=>v[key+'-tiles-'+i]),expected,key);
  if(displayed(a,f)){
   const png=PNG.sync.read(await readFile(path.join(out,key+'.png'))),colors=new Map(),visiblePositions=new Set(),count=cells(a),perGroup=count===8?8:4,assembly=cartridgeOffset(u24(rom,0x242300+a.asm*3),rom)+f*count*10,signed=v=>v>127?v-256:v;
   for(let cell=0;cell<count;cell++)for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const t=Math.floor(cell/perGroup)*perGroup*4+(y>>3)*perGroup*2+cell%perGroup*2+(x>>3);let index=0;for(let k=0;k<4;k++)index|=(expected[t*32+(k>>1)*16+(y&7)*2+(k&1)]>>(7-(x&7))&1)<<k;
    if(index){const sx=200+signed(rom[assembly+count*8+cell*2])+x,sy=(a.gfx===162?([8,9,18,19].includes(f)?95:127):a.gfx===161?127:a.gfx===91&&f===8?159:143)+signed(rom[assembly+count*8+cell*2+1])+y;
     assert.ok(sx>=0&&sx<png.width&&sy>=0&&sy<png.height,key+' bounds');
     // Earlier OAM cells cover later cells. The separate VRAM check above
     // still verifies every hidden source pixel in compound riders.
     const position=sy*png.width+sx;if(visiblePositions.has(position)){occludedSourcePixels++;continue;}visiblePositions.add(position);
     const p=position*4,color=png.data[p]*65536+png.data[p+1]*256+png.data[p+2];if(colors.has(index))assert.equal(color,colors.get(index),key+' cell '+cell+' pixel '+x+','+y);else colors.set(index,color);}
   }
   // Distinct authored RGB888 swatches may quantize to the same cartridge
   // RGB555 value. Verify a bijection between native colors and screen colors.
   const palette=0x240000+u16(rom,0x242a00+a.palette*2),nativeColors=new Map(),screenColors=new Map();
   for(const[index,color]of colors){
    const native=u16(rom,palette+(index-1)*2);
    if(core==='snes9x'){
      // Snes9x emits RGB565; retro-host expands its channels to RGB888.
      const r=native&31,g=native>>5&31,b=native>>10&31,g6=g<<1|g>>4;
      assert.equal(color,((r<<3|r>>2)<<16)|((g6<<2|g6>>4)<<8)|(b<<3|b>>2),key+' exact cartridge palette');
    }
    // bsnes applies its configured display gamma; identical native colors
    // still match and distinct native colors remain distinct on this fixture.
    if(nativeColors.has(native))assert.equal(color,nativeColors.get(native),key+' native color');if(screenColors.has(color))assert.equal(native,screenColors.get(color),key+' screen color');nativeColors.set(native,color);screenColors.set(color,native);
   }
   const blank=a.gfx===166&&[39,40,41].includes(f)||a.gfx===20&&f===14||[11,12,15].includes(a.gfx)&&f===16||a.gfx===172&&f===3;
   if(blank){assert.ok(expected.every(v=>v===0),key+' original blank tiles');assert.equal(nativeColors.size,0,key+' original blank');}else assert.ok(nativeColors.size>=(a.gfx===162&&[3,13].includes(f)?1:3),key);displayedFrames++;
  }
 }
 const endings=[];if(checkEndings)for(const name of['ending0','ending1','ending2','ending3','ending4','ending-default']){assert.equal(v[name+'-location'],415);// The stock Nu (bank 99) decompresses here as in the original game.
 assert.ok(v[name+'-heap']>0x8000&&v[name+'-heap']<=0xc000,name+' sprite heap leaves at least 16 KiB of the native 32 KiB free');endings.push({name,variant:v[name+'-variant'],bytes:v[name+'-heap']-0x8000});}
 reports.push({core,frames:actors.reduce((n,a)=>n+a.frames,0),displayed:displayedFrames,occludedSourcePixels,exactPaletteColors:core==='snes9x',endings});console.log(JSON.stringify(reports.at(-1)));
}
await writeFile(path.join(dir,'report.json'),JSON.stringify({sha256,actor:actorKey,streams:built.audit.resources.npcGraphicsStreaming.streams,cores:reports},null,2)+'\n');console.log('Report: '+path.join(dir,'report.json'));
