import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {access,mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {attackNativeEnemy,useNativeItem} from '../tests/battle-controller.mjs';
import {movement} from '../tests/medina-controller.mjs';
import {newGameSequence} from '../engine/automation.js';
import {u16,u24} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {decodeSourceDialogue} from '../engine/source-dialogue.js';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';

export const ENDING_SCOPE='Diagnostic ending fixtures, not fresh-campaign completion, normal-level balance, or physical-hardware evidence. Setup writes and checkpoint loads end at each documented boundary; later operations are reads and ordinary controller input only.';
const L=location=>({kind:'location',location});
const M=(location,id)=>({kind:'message',location,id});
const messages=(location,ids)=>ids.map(id=>M(location,id));
const beyondEarly=[
 L(82),L(271),...messages(271,[214]),L(2),...messages(2,[215,216]),L(79),
 ...messages(79,[16,17,19,20,22,24,25,26,27,28,29,30,31,32,33,34,35,36,42]),L(80),...messages(80,[51,53,54])
];
const beyondLate=messages(85,[66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,82,83,84,85,86,87,88,89,90,91,108,109,110,94,95,96,97,98,99,100,101,102,103,104,93]);
const slideIds=[137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,178,177,179,180,181,182,183,184,185,186];

export const ENDING_ROUTES=[
 {name:'dream-project-early-selector',story:0,frames:1200,locations:[82,379],steps:[L(82),L(379)]},
 {name:'good-night',story:0x27,frames:6000,locations:[82,8],steps:[L(82),L(8)],silent:true},
 {name:'unknown-past',story:0x2d,frames:6000,locations:[82,240],steps:[L(82),L(240)],silent:true},
 {name:'legendary-hero',story:0x54,frames:20000,locations:[82,37,44,37,45,37,38,37,60,37,46,37],steps:[L(82),L(37),L(44),L(37),L(45),L(37),L(38),L(37),L(60),L(37),L(46),M(46,198),L(37)]},
 {name:'people-of-the-times',story:0x75,frames:7000,locations:[82,91,92,93,94,95],steps:[L(82),L(91),L(92),L(93),L(94),L(95)],silent:true},
 {name:'the-oath',story:0x84,frames:12000,locations:[82,345,460,165,460,169,460,173,460,176,460,174,460,447,460,172],steps:[L(82),L(345),...messages(345,[115,116,117,119,118,120,121,122]),L(460),L(165),L(460),L(169),...messages(169,[123,124]),L(460),L(173),...messages(173,[125,126]),L(460),L(176),L(460),L(174),M(174,127),L(460),L(447),L(460),L(172),...messages(172,[128,129])]},
 {name:'dino-age',story:0x8a,frames:6500,locations:[82,271,2,275],steps:[L(82),L(271),M(271,0),L(2),...messages(2,[63,64,65,198]),L(275),...messages(275,[200,204,206,208,210,214,215,216,217])]},
 // This fixture enters the ending directly, so its last transition waits on a
 // native condition the periodic A presses only meet by phase (the unmodified
 // cartridge stalls the same way); observe until its final scene loads.
 {name:'what-the-prophet-seeks',story:0x99,frames:12000,stopAtEnd:true,locations:[82,400,203,334,155,402],steps:[L(82),L(400),L(203),L(334),L(155),L(402)]},
 {name:'slide-show',story:0xa2,frames:6500,locations:[82,239],steps:[L(82),L(239),...messages(239,slideIds)]},
 {name:'apocalypse',location:476,frames:6500,locations:[476,496,476,0,433,0],steps:[L(476),...messages(476,[56,57]),L(496),L(476),...messages(476,[58,59,60,61,62,63,64,65]),L(0),L(433),L(0)]},
 {name:'beyond-time',story:0xd4,frames:12000,locations:[82,271,2,79,80,81,85],steps:beyondEarly,after:'parade',lateSteps:beyondLate}
];
export const REUNION_LIMIT='The pre-rescue connected selector was not established. Location 84 loads through native DF 54 02, but that map load alone is not Reunion completion. Reunion text is checked in the native renderer; connected route and rescue/farewell casting remain gaps.';
export const BRANCH_LIMIT='Party/roster and Epoch-status fixtures exercise the normal ending, but unique native outputs for every Farquaad recruited/defeated and Dragon intact/dive combination are not claimed. Native casting/branch selection still needs a connected North Cape and final-dive route.';

export function decodeNativeText(rom,table,id){
 const address=(table&0xff0000)|u16(rom,cartridgeOffset(table,rom)+id*2);
 return {address,text:decodeSourceDialogue(rom,cartridgeOffset(address,rom))};
}
export const STALE_TEXT=/\b(?:Crono|Marle|Lucca|Robo|Ayla|Magus|Guardia|Queen Leene|Cyrus|Glenn|Melchior|Gaspar|Belthasar|Schala|Janus|Dalton|Lavos|Masamune|Doreen|Spekkio|Enhasa|Kajar|Zeal|Mammon|Blackbird|Black Omen|Hiroko Yamamoto|Keita Eto|Kazuhiro Ohkawa|Yoshinori Ogura|Yasunori Mitsuda|Minoru Akao|Eiji Nakamura|Manabu Daishima|Kiyoshi Yoshii|Takashi Tokita|Akihiko Matsui|Keizo Kokubo|Hiroki Chiba|Akiyoshi Masuda|Yoshinori Kitase|Taizo Mamo|Shinichiro Okaniwa|Matsuzo Itakura|Square Soft|Chrono Trigger|development room|Poyozo)\b/i;

// Shared with the in-process finalArena test and both libretro cores. This
// controller surface deliberately has no write, restore, or savestate method.
export async function driveFinalVictory(io){
 let attacks=0,revivals=0;
 for(let n=0;n<24&&await io.read(0x100,2)===479&&await io.read(0x5e30+9*128,2)>0;n++){
  if(await io.read(0xaeff)===255){await useNativeItem(io,199,0,{allowBattleEnd:true});revivals++;}
  else{await attackNativeEnemy(io,239,{targetSlot:9});attacks++;}
  if(await io.read(0x5e30+9*128,2)===0)break;
  await io.wait(120);
 }
 assert.equal(await io.read(0x5e30+9*128,2),0,'native Muffin Core dies');
 const tysonHP=await io.read(0x5e30+3*128,2);
 for(let n=0;n<120&&await io.read(0x100,2)===479;n++)await io.wait(60);
 assert.equal(await io.read(0x100,2),82,'native victory enters the ending selector');
 return{attacks,revivals,tysonHP};
}

export async function driveParadeToFarewell(io){
 const{walk}=movement(io),points=[[392,600],[360,600],[360,568],[328,568],[328,520],[200,520],[200,440],[328,440],[328,400],[392,400],[392,360],[392,240],[392,16]];
 for(const[x,y]of points){
  try{await walk(x,y);}catch(error){
   const location=await io.read(0x100,2);
   if(location===80)throw error;
   if(![81,85].includes(location))throw error;
  }
  if(await io.read(0x100,2)===85)break;
 }
 for(let n=0;n<120&&await io.read(0x100,2)!==85;n++)await io.tap(256,60);
 assert.equal(await io.read(0x100,2),85,'native bell and farewell transition');
}

async function until(request,address,value,{size=1,frames=22000,buttons='a',every=45}={}){
 const result=await request({op:'until',mem:'wram',addr:address,size,value,frames,buttons,every,hold:3});
 assert.ok(result.met,`native ${address.toString(16)}=${value} timed out: ${JSON.stringify(result)}`);
 return result;
}

async function driveSteps(io,request,rom,steps,{prefix,core,observations=[]}={}){
 for(const step of steps){
  if(step.kind==='location'){
   await until(request,0x100,step.location,{size:2,frames:24000});
   observations.push({...step,frame:(await io.read(0x100,2))});
  }else{
   const hit=await until(request,0x12a,step.id,{frames:24000});
   assert.equal(await io.read(0x100,2),step.location,`${step.location}:${step.id} rendered in its native scene`);
   const table=(await io.read(0x12b))|(await io.read(0x12c))<<8|(await io.read(0x12d))<<16;
   const native=decodeNativeText(rom,table,step.id);
   assert.ok(native.text&&!STALE_TEXT.test(native.text),`${step.location}:${step.id} adapted ROM text: ${native.text}`);
   const row={...step,...native,table,frame:hit.frame};observations.push(row);
   if(step.id===186||step.id===65||step.id===122)await io.shot(`${prefix}-${core}-${step.location}-${step.id}`);
  }
 }
 return observations;
}

async function tool(env,name){
 if(process.env[env])return path.resolve(process.env[env]);
 for(const dir of['.local/tools/emu','../secret-of-goku/.local/tools/emu','../../../secret-of-goku/.local/tools/emu']){
  const file=path.resolve(dir,name);try{await access(file);return file;}catch{}
 }
 throw Error(`Set ${env} to an installed ${name}`);
}

function selectorScript(location=82,x=8,y=8,facing=1){
 const map=location|(facing<<9);return[0xe0,map&255,map>>8,x,y,0xb2];
}
async function setupSelector(load,write,request,io,route){
 await load();
 const party=route.party??[0,1,2],reserve=[0,1,2,3,4,5,6].filter(id=>!party.includes(id));
 await write(0x2980,[...party,...reserve,128,128]);await write(0x29af,[254]);
 await write(0x10000,[route.story??0xd4]);
 await write(0x100ab,[route.ab??0]);await write(0x100aa,[route.aa??(route.dive?0:4)]);await write(0x100ce,[route.dive?5:0]);
 await write(0x1238e,selectorScript(route.location??82));
 const entry=route.location??82;await until(request,0x100,entry,{size:2,frames:3000,buttons:undefined,every:1});
 // DOCUMENTED BOUNDARY: native location/story/party setup is complete. No
 // writes, restores, or savestates occur in driveSteps or route navigation.
 return entry;
}

async function runIndependentRoute({route,load,write,request,io,rom,core,prefix}){
 const entry=await setupSelector(load,write,request,io,route),observations=[{kind:'location',location:entry}];
 await driveSteps(io,request,rom,route.steps.slice(1),{prefix,core,observations});
 if(route.after==='parade'){
  await driveParadeToFarewell(io);
  await driveSteps(io,request,rom,route.lateSteps,{prefix,core,observations});
 }
 return{route:route.name,core,observations,scope:ENDING_SCOPE};
}

async function runBucket({load,write,request,io,core}){
 await load();await write(0x2980,[0,1,2,3,4,5,6,128,128]);await write(0x29af,[254]);await write(0x10000,[0xcb]);
 await write(0x1238e,selectorScript(464,34,18,0));await io.wait(400);
 // DOCUMENTED BOUNDARY: Last Inn checkpoint complete; controller only below.
 await until(request,0x12a,148,{frames:12000});await io.shot(`${core}-bucket-choice`);
 await until(request,0x100,466,{size:2,frames:16000});
 assert.equal(await io.read(0x166),2,'native Yes row confirms Day of the Muffin');
 return{route:'last-inn-bucket',core,location:466,story:await io.read(0x10000),choice:await io.read(0x166)};
}

async function runNewGamePlusGate({load,write,request,io,core}){
 await load();await write(0x10000,[0]);await write(0x101cf,[0x10]);
 await write(0x1238e,selectorScript(8,8,12,0));await io.wait(1800);
 for(let n=0;n<12&&await io.read(0x126);n++)await io.tap(256,80);
 // DOCUMENTED BOUNDARY: story zero and the NG+ right-telepod bit were loaded
 // before location 8 initialized. Only native movement and buttons follow.
 const{walk}=movement(io);
 for(const[x,y]of[[136,160],[136,144],[216,144],[192,144],[192,88]])await walk(x,y);
 await io.hold(16,40);await until(request,0x100,467,{size:2,frames:18000});
 await until(request,0x101cf,0x21,{frames:18000});await io.wait(120);
 const gateState={location:await io.read(0x100,2),story:await io.read(0x10000),flag:await io.read(0x101cf)};console.log(core,'NG+ arrival state',gateState);await io.shot(`${core}-new-game-plus-gate-arrival`);
 assert.equal(await io.read(0x10000),64);assert.equal(await io.read(0x101cf),0x21,'native gate consumes the pre-load 0x10 flag');
 await io.shot(`${core}-new-game-plus-gate`);
 return{route:'new-game-plus-right-telepod',core,location:467,story:64,flag:await io.read(0x101cf)};
}

async function runBeyondBattle({load,write,request,io,rom,core,prefix,route}){
 await load();
 await write(0x29af,[254]);await write(0x2830,Array(7).fill(8));await write(0x2837,Array(7).fill(255));
 await write(0x283e,Array(15).fill(224));await write(0x284d,Array(15).fill(128));
 for(const id of[189,190,191,192,193,194,195,196,197,198,199,200,174,175,176,177,178]){
  const inventory=await io.bytes(0x2400,256);let slot=inventory.indexOf(id);if(slot<0)slot=inventory.indexOf(0);assert.ok(slot>=0);
  await write(0x2400+slot,[id]);await write(0x2500+slot,[20]);
 }
 for(let id=0;id<7;id++){
  const p=0x2600+id*80;await write(p+3,[231,3,231,3,99,0,99,0]);
  await write(p+0xb,[65,60,12,60,60,50,60]);await write(p+0x12,[60]);await write(p+0x36,[65,60,12,60,60,50,60]);
  await write(p+0x27,[id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163]);await write(p+0x3d,[200,220,231,3]);
 }
 await write(0x2980,[0,1,2,3,4,5,6,128,128]);await write(0x10000,[0xd4]);await write(0x100ab,[0]);await write(0x100aa,[4]);await write(0x100ce,[0]);
 await write(0x1238e,selectorScript(479,7,10));await until(request,0xaf02,206,{frames:3000,buttons:undefined,every:1});await io.wait(180);
 for(let slot=0;slot<3;slot++)await write(0x5e30+slot*128,[0x0f,0x27,0x0f,0x27]);
 await write(0x5e30+9*128,[1,0,1,0]);
 // DOCUMENTED BOUNDARY: the same strong-party/one-HP-core diagnostic used by
 // the finale mechanism matrix. It is not normal-level balance evidence.
 const battle=await driveFinalVictory(io),observations=[];
 await driveSteps(io,request,rom,route.steps,{prefix,core,observations});
 await driveParadeToFarewell(io);await driveSteps(io,request,rom,route.lateSteps,{prefix,core,observations});
 return{route:'beyond-time-native-victory',core,battle,observations,scope:ENDING_SCOPE};
}

async function main(){
 const requested=process.argv[2]??'all',section=process.argv.find(a=>a.startsWith('--section='))?.slice(10)??'all',only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
 if(!['all','snes9x','bsnes'].includes(requested)||!['all','scenes','access','beyond'].includes(section))throw Error('Usage: check-endings.mjs [all|snes9x|bsnes] [--section=all|scenes|access|beyond] [--only=route] [--rom=path]');
 const built=await build(),override=process.argv.find(a=>a.startsWith('--rom='))?.slice(6);
 if(override)built.rom=new Uint8Array(await readFile(path.resolve(override)));
 const sha256=createHash('sha256').update(built.rom).digest('hex');
 const root=path.resolve('.local/qa/endings-'+sha256.slice(0,12));await mkdir(root,{recursive:true});
 const romPath=path.join(root,'candidate.sfc');await writeCandidate(romPath,built.rom);
 const host=await tool('RETRO_HOST','retro-host'),reports=[];
 for(const core of requested==='all'?['snes9x','bsnes']:[requested]){
  const corePath=await tool(core==='snes9x'?'SNES9X_CORE':'BSNES_CORE',core+'_libretro.'+(process.platform==='darwin'?'dylib':'so')),out=path.join(root,core+'-'+section);
  const result=await withIndependentController({host,core:corePath,rom:romPath,out},async({request,write,controller:io})=>{
   for(const[frames,input]of newGameSequence)await io.hold(input,frames);
   assert.equal(await io.read(0x100,2),2);await request({op:'savestate',name:'bedroom'});
   const load=()=>request({op:'loadstate',file:path.join(out,'bedroom.state')}),routes=[];
   if(section==='all'||section==='scenes')for(const route of ENDING_ROUTES){
    if(route.name==='beyond-time'||(only&&route.name!==only))continue;
    const row=await runIndependentRoute({route,load,write,request,io,rom:built.rom,core,prefix:'ending'});routes.push(row);console.log(core,route.name,'passed');
   }
   if((section==='all'||section==='access')&&(!only||only==='last-inn-bucket')){const row=await runBucket({load,write,request,io,core});routes.push(row);console.log(core,'bucket passed');}
   if((section==='all'||section==='access')&&(!only||only==='new-game-plus-right-telepod')){const row=await runNewGamePlusGate({load,write,request,io,core});routes.push(row);console.log(core,'NG+ gate passed');}
   if((section==='all'||section==='beyond')&&(!only||only==='beyond-time')){const route=ENDING_ROUTES.find(r=>r.name==='beyond-time'),row=await runBeyondBattle({load,write,request,io,rom:built.rom,core,prefix:'ending',route});routes.push(row);console.log(core,'Beyond Time native victory passed');}
   assert.ok(routes.length,'selected at least one ending route');
   return{core,section,sha256,scope:ENDING_SCOPE,limits:[REUNION_LIMIT,BRANCH_LIMIT],routes};
  });
  await writeFile(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');reports.push(result);
 }
 await writeFile(path.join(root,section+'-report.json'),JSON.stringify({sha256,scope:ENDING_SCOPE,reports},null,2)+'\n');
 console.log(JSON.stringify({sha256,section,cores:reports.map(r=>r.core),routes:reports.map(r=>[r.core,r.routes.length])}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await main();
