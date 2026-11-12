import path from 'node:path';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {u24} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {traverseRumpelEncounter} from '../tests/endgame-scene-controller.mjs';

export const DRAGON_PARTIES=[];
for(let a=0;a<7;a++)for(let b=a+1;b<7;b++)for(let c=b+1;c<7;c++)DRAGON_PARTIES.push([a,b,c]);
const partyKey=party=>party.join('-');
const location=io=>io.read(0x100,2);

// Each exported drive function is a post-boundary driver. Its io surface has
// no write, savestate, hook or diagnostic-jump operation. Returned line sets
// are read from the native dialogue register, including on independent cores.
export async function driveAcquisition(io,party){
 const lines=new Set();let triggered=false;
 for(let i=0;i<900&&!triggered;i++){
  const line=await io.read(0x12a);if(line!==9)lines.add(line);
  await io.hold(16,1);triggered=!!(await io.read(0x100ee)&128);
 }
 assert.ok(triggered,'native hangar trigger releases Dragon');
 let namingQuiet=0,named=false;
 for(let i=0;i<6000;i++){
  const line=await io.read(0x12a);lines.add(line);
  if(line===39){named=true;break;}
  if(line===38&&!(await io.read(0x126)))namingQuiet++;else namingQuiet=0;
  if(i%60===0)await io.tap(line===38&&namingQuiet>4?8:256,0);else await io.wait(1);
 }
 assert.ok(named,'native builders message, naming and boarding invitation complete');
 assert.equal(await location(io),243);assert.ok(await io.read(0x100ee)&128);
 assert.deepEqual(Array.from(await io.bytes(0x2980,3)),party);
 for(const id of[36,37,38,39])assert.ok(lines.has(id),'builders/naming line '+id);
 return{party,lines:[...lines].sort((a,b)=>a-b),acquired:true,named:true};
}

export async function driveWorldFlight(io,party,{allDirections=false,grounded=false}={}){
 assert.equal(await location(io),496);await io.tap(256,600);
 assert.equal(await io.read(0x294)&0xe3,grounded?0xc3:0xe3,'three native riders and expected flight capability');
 if(grounded){
  assert.equal(await io.read(0x294)&0x20,0,'injured wings do not enable free flight');
  assert.equal(await io.read(0x27c),8,'native time gauge opens');
  await io.tap(1024,200);await io.tap(256,1200);
  assert.equal(await location(io),497,'pre-repair harness crosses to the medieval world');
  assert.equal(await io.read(0x294)&0x20,0);assert.deepEqual(Array.from(await io.bytes(0x2980,3)),party);
  return{party,timeTravel:[496,497],flightEnabled:false};
 }
 const directions=allDirections?[['left',64],['up',16],['right',128],['down',32]]:[['right',128]],moves=[];
 for(const[name,input]of directions){
  const before=[await io.read(0x283,2),await io.read(0x285,2)];await io.hold(input,60);const after=[await io.read(0x283,2),await io.read(0x285,2)],dx=after[0]-before[0],dy=after[1]-before[1];
  if(name==='left')assert.ok(dx<0,'left flight moves west');if(name==='right')assert.ok(dx>0,'right flight moves east');
  if(name==='up')assert.ok(dy<0,'up flight moves north');if(name==='down')assert.ok(dy>0,'down flight moves south');
  assert.ok(await io.read(0x294)&0x40);assert.equal(await location(io),496);moves.push({name,before,after});
 }
 // A one-way displacement can end over water. Return to the native boarding
 // point before requiring landing; the directional assertion above still uses
 // the full outward displacement and no position writes.
 if(!allDirections)await io.hold(64,60);
 await io.tap(256,600);assert.equal(await io.read(0x294)&0x40,0,'native A lands');assert.equal(await io.read(0x27e),0,'party walking state restored');
 assert.deepEqual(Array.from(await io.bytes(0x2980,3)),party);return{party,moves,landed:true};
}

export async function driveRepairAndUpgrade(io,rom,party){
 const lines=new Set();
 let reached=false;
 for(let i=0;i<12000&&!reached;i++){
  const line=await io.read(0x12a);if(await location(io)===367&&line!==9)lines.add(line);
  reached=await location(io)===377&&!!(await io.read(0x117)&1)&&await io.read(0xaf02)===162;
  if(!reached){if(i%60===0)await io.tap(256,0);else await io.wait(1);}
 }
 assert.ok(reached,'repair scene and original Dragon-deck battle: '+JSON.stringify({location:await location(io),line:await io.read(0x12a),d2:await io.read(0x100d2),battle:await io.read(0x117),lines:[...lines]}));
 for(const id of[110,111,112,113,114,115,116,117])assert.ok(lines.has(id),'native wing-repair line '+id);
 const battle=await traverseRumpelEncounter(io,rom,'dragon-deck');
 assert.equal(battle.location,363);assert.equal(battle.d2,8);
 const upgraded=await driveUpgradedFlight(io,party,lines);
 return{party,repairLines:[...lines].sort((a,b)=>a-b),battle,...upgraded};
}

export async function driveUpgradedFlight(io,party,lines=new Set(),{requireY=true}={}){
 let upgraded=false,deckConfirm=false;
 for(let i=0;i<10000&&!upgraded;i++){
  const here=await location(io),line=await io.read(0x12a);if(line!==9)lines.add(line);
  if(here===502&&await io.read(0x100d2)===10&&await io.read(0x294)&0x20){upgraded=true;break;}
  if(here===363){await io.hold(65,1);continue;}
  if(i%60===0){
   const open=await io.read(0x126);let button=open?256:line>=154&&line<=158?2:line>=159&&line<=162?512:256;
   // Farquaad has no entry in object 7's X-prompt tables. After one ordinary
   // A confirmation his native fallthrough reaches the same wait as a spoken
   // prompt; X, not another A, releases that silent wait.
   if(!open&&here===377&&await io.read(0x100d2)===9&&line===9){button=deckConfirm?512:256;deckConfirm=true;}
   await io.tap(button,0);
  }else await io.wait(1);
 }
 assert.ok(upgraded,'native escape enables upgraded flight: '+JSON.stringify({party,location:await location(io),d2:await io.read(0x100d2),vehicle:await io.read(0x294),line:await io.read(0x12a),lines:[...lines]}));
 if(requireY)assert.ok([...lines].some(id=>id>=154&&id<=158),'native Y flight prompt');
 const promptSpeaker=party[1]===5?party[2]:party[1],spokenX=promptSpeaker>=1&&promptSpeaker<=4;
 if(spokenX)assert.ok(lines.has(158+promptSpeaker),'native character-specific X flight prompt');
 const speakers=party.filter(id=>id>=2&&id<=5);if(speakers.length)assert.ok([...lines].some(id=>id>=163&&id<=166&&speakers.includes(id-161)),'native upgraded-flight confirmation');
 assert.deepEqual(Array.from(await io.bytes(0x2980,3)),party);
 return{party,upgradedFlight:true,destination:502,vehicle:await io.read(0x294),silentX:!spokenX,lines:[...lines].sort((a,b)=>a-b)};
}

export async function driveApproachAndEscape(io,party){
 const lines=new Set();let recovered=false;
 for(let i=0;i<7000;i++){
  const line=await io.read(0x12a);if(line!==9)lines.add(line);
  if(await location(io)===474&&line>=129&&line<=134){recovered=true;break;}
  await io.wait(1);
 }
 assert.ok(recovered,'full approach and dive reach original recovery dialogue: '+JSON.stringify({location:await location(io),line:await io.read(0x12a),ce:await io.read(0x100ce),party:Array.from(await io.bytes(0x2980,3)),lines:[...lines]}));
 assert.equal(await io.read(0x100ce),5,'broken-harness branch retained');assert.equal(await io.read(0x100aa)&4,0,'dive variant remains selected');
 assert.deepEqual(Array.from(await io.bytes(0x2980,3)),party);
 if(party[0]>=1)assert.ok(lines.has(128+party[0]),'leader-specific recovery line');
 return{party,lines:[...lines].sort((a,b)=>a-b),recoveryLine:await io.read(0x12a),recovered:true,dragonDive:true};
}

// EA 3F and FF 2B enter the original native credits projection. Verify its
// live native script pointer and both Dragon outcome flags. The in-process
// suite separately checks active Mode 7 and every exact resource-46 angle.
export async function driveEndingProjection(io,rom,intact){
 await io.wait(2400);
 const endingScript=await io.read(0xb20,2);assert.equal(endingScript,0x97c8,'original native ending projection script');
 assert.equal(await location(io),2,'native ending projection runs from the disclosed fixture entry');assert.equal(await io.read(0x100ce),intact?0:5);assert.equal(!!(await io.read(0x100aa)&4),intact);
 const data=decompress(rom,cartridgeOffset(u24(rom,0x3e0006+0x46*3),rom)).bytes;assert.equal(data.length,19456);
 return{variant:intact?'intact':'dive',endingScript,resourceBytes:data.length,location:2};
}

async function main(){
 const requested=process.argv[2]??'all',section=process.argv.find(a=>a.startsWith('--section='))?.slice(10)??'all',sections=['all','acquisition','world','repair','approach','endings'];
 if(!['all','snes9x','bsnes'].includes(requested)||!sections.includes(section))throw Error('Usage: check-dragon-matrix.mjs [all|snes9x|bsnes] [--section=all|acquisition|world|repair|approach|endings] [--rom=path]');
 async function tool(env,name){if(process.env[env])return path.resolve(process.env[env]);for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu','../../../secret-of-goku/.local/tools/emu']){const file=path.resolve(dir,name);try{await access(file);return file;}catch{}}throw Error('Set '+env+' to an installed '+name);}
 const built=await build(),override=process.argv.find(a=>a.startsWith('--rom='))?.slice(6);if(override)built.rom=new Uint8Array(await readFile(path.resolve(override)));
 const sha256=createHash('sha256').update(built.rom).digest('hex');
 const root=path.resolve('.local/qa/dragon-matrix-'+sha256.slice(0,12));await mkdir(root,{recursive:true});const rom=path.join(root,'candidate.sfc');await writeCandidate(rom,built.rom);
 const host=await tool('RETRO_HOST','retro-host'),reports=[];
 for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
  const core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.'+(process.platform==='darwin'?'dylib':'so')),out=path.join(root,name+(section==='all'?'':'-'+section));
  const report=await withIndependentController({host,core,rom,out},async({request,write,controller:io})=>{
   for(const[frames,input]of newGameSequence)await io.hold(input,frames);assert.equal(await location(io),2);assert.equal(await io.read(0x1238e),0xb2);
   async function resetAndLoad(){
    await request({op:'reload'});for(const[frames,input]of newGameSequence)await io.hold(input,frames);
    assert.equal(await location(io),2);assert.equal(await io.read(0x11f),1);assert.equal(await io.read(0x1238e),0xb2);
   }
   async function jump({id,x,y,facing=1,party,story,flags,dragon,script}){
    if(party)await write(0x2980,[...party,...[0,1,2,3,4,5,6].filter(id=>!party.includes(id)),128,128]);
    if(party)await write(0x29af,[party.reduce((mask,id)=>mask|(128>>id),0)]);if(story!==undefined)await write(0x10000,[story]);
    if(flags)for(const[addr,value]of flags)await write(addr,[value]);
    if(dragon){
     await write(0x294,[dragon==='flying'?0xa0:0x80]);await write(0x290,[x*8&255,(x*8)>>8,y*8&255,(y*8)>>8]);await write(0x29f,[id&255,id>>8]);
     await write(0x27e,[0]);await write(0x28f,[0]);await write(0x100ec,[await io.read(0x100ec)|4]);
    }
    const map=id|(facing<<9),bytes=script??[0xe0,map&255,map>>8,x,y,0xb2];await write(0x1238e,bytes);
   }
   async function strongKit(){
    await write(0x2830,Array(7).fill(8));await write(0x2837,Array(7).fill(255));await write(0x283e,Array(15).fill(224));await write(0x284d,Array(15).fill(128));
    for(const id of[189,190,191,192,193,194,195,196,197,198,199,200,174,175,176,177,178]){const inv=await io.bytes(0x2400,256);let slot=inv.indexOf(id);if(slot<0)slot=inv.indexOf(0);assert.ok(slot>=0);await write(0x2400+slot,[id]);await write(0x2500+slot,[20]);}
    for(let id=0;id<7;id++){const p=0x2600+id*80;await write(p+5,[231,3]);await write(p+9,[99]);await write(p+0x12,[60]);await write(p+0xb,[65,60,12,60,60,50,60]);await write(p+0x36,[65,60,12,60,60,50,60]);await write(p+0x27,[id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163]);await write(p+0x3d,[200,220]);await write(p+0x3f,[231,3]);await write(p+3,[231,3]);await write(p+7,[99]);}
   }
   const cases=[],run=async(kind,party,setup,drive)=>{
    try{
     await resetAndLoad();await setup();
     // READ-ONLY / CONTROLLER BOUNDARY. No write, reload or savestate occurs in
     // drive. The next case's power cycle and new game are outside this case.
     const value=await drive(),row={kind,party,status:'passed',writesAfterBoundary:0,savestates:0,...value};cases.push(row);
     if(kind!=='world'||party[0]===party[1]-1&&party[1]===party[2]-1&&party[0]<6)await io.shot(kind+'-'+partyKey(party));
     console.log(name+' '+kind+' '+partyKey(party)+' passed');return row;
    }catch(error){
     const row={kind,party,status:'failed',writesAfterBoundary:0,savestates:0,error:error.message,errorStack:error.stack};cases.push(row);await io.shot(kind+'-FAIL-'+partyKey(party));console.error(name+' '+kind+' '+partyKey(party)+' FAILED: '+error.message);return row;
    }
   };
   if(section==='all'||section==='acquisition')for(const party of DRAGON_PARTIES)await run('acquisition',party,async()=>{
    await jump({id:243,x:8,y:28,party,story:0x7f,flags:[[0x100cd,3],[0x100ee,2]]});await io.wait(300);
   },()=>driveAcquisition(io,party));
   if(section==='all'||section==='world'){
    for(const party of DRAGON_PARTIES)await run('world',party,async()=>{await jump({id:496,x:55,y:35,party,dragon:'flying'});await io.wait(500);},()=>driveWorldFlight(io,party));
    await run('world-directions',[0,1,2],async()=>{await jump({id:496,x:55,y:35,party:[0,1,2],dragon:'flying'});await io.wait(500);},()=>driveWorldFlight(io,[0,1,2],{allDirections:true}));
    await run('pre-repair-time',[0,1,2],async()=>{await jump({id:496,x:55,y:35,party:[0,1,2],dragon:'grounded'});await io.wait(500);},()=>driveWorldFlight(io,[0,1,2],{grounded:true}));
   }
   if(section==='all'||section==='repair'){
    await run('repair',[1,2,3],async()=>{
     await strongKit();await jump({id:367,x:7,y:25,party:[1,2,3],story:207,flags:[[0x100d2,1],[0x100ec,4],[0x100ee,0x80]]});await io.wait(300);
    },()=>driveRepairAndUpgrade(io,built.rom,[1,2,3]));
    for(const party of DRAGON_PARTIES)await run('upgrade-scene',party,async()=>{
     await jump({id:363,x:56,y:9,party,story:207,flags:[[0x100d2,8],[0x100ec,4],[0x100ee,0x80]]});
    },()=>driveUpgradedFlight(io,party,new Set(),{requireY:false}));
   }
   if(section==='all'||section==='approach')for(const party of DRAGON_PARTIES)await run('approach',party,async()=>{
    const script=[0xea,80,0x66,2,0xaa,0x56,5,0xce,0,0x65,7,0x6d,0xde,0xda,1,7,58,0x56,0,0xed,1,0xff,0x26,0];
    await jump({id:432,x:7,y:58,party,script,flags:[[0x100ce,5],[0x100aa,await io.read(0x100aa)&~4]]});
   },()=>driveApproachAndEscape(io,party));
   if(section==='all'||section==='endings')for(const intact of[true,false])await run('ending-'+intact,[0,1,2],async()=>{
    const script=[0xea,0x3f,0xff,0x2b,0];
    await jump({id:2,x:8,y:8,party:[0,1,2],script,flags:[[0x100ce,intact?0:5],[0x100aa,intact?(await io.read(0x100aa)|4):(await io.read(0x100aa)&~4)]]});
   },()=>driveEndingProjection(io,built.rom,intact));
   return{core:name,section,sha256,scope:'Disclosed diagnostic story/party/vehicle/event fixtures and a strong repair party; not fresh-save campaign or balance proof',savestates:0,nativePowerCycleAndNewGameBetweenCases:true,cases};
  });
  await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');reports.push(report);console.log(name+' Dragon matrix completed '+report.cases.length+' cases, '+report.cases.filter(c=>c.status==='failed').length+' failures');
 }
 await writeFile(path.join(root,section+'-report.json'),JSON.stringify({sha256,scope:'Diagnostic fixtures only; no savestates or post-boundary writes; not normal campaign proof',reports},null,2)+'\n');
 console.log(JSON.stringify({sha256,report:path.join(root,section+'-report.json'),cores:reports.map(r=>({core:r.core,cases:r.cases.length,status:r.cases.some(c=>c.status==='failed')?'failed':'passed',failures:r.cases.filter(c=>c.status==='failed').map(c=>({kind:c.kind,party:c.party,error:c.error}))}))},null,2));
 if(reports.some(r=>r.cases.some(c=>c.status==='failed')))process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await main();
