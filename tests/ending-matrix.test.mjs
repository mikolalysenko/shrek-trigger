import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom,finalArena} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {snapshot,restore} from '../engine/save.js';
import {u16,u24,put16} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';
import {dialogue} from '../content/dialogue.js';
import {supportingCast} from '../content/supporting-cast.js';
import {movement} from './medina-controller.mjs';
import {ENDING_ROUTES,ENDING_SCOPE,REUNION_LIMIT,BRANCH_LIMIT,STALE_TEXT,decodeNativeText,driveFinalVictory,driveParadeToFarewell} from '../scripts/check-endings.mjs';

const built=await build(),specs=JSON.parse(await readFile('content/hooks.json')),layouts=JSON.parse(await readFile('content/event-layouts.json'));
const eventCache=new Map();
function eventFor(location){
 if(!eventCache.has(location)){
  const eventId=u16(built.base,0x360008+location*14),event=decompress(built.rom,cartridgeOffset(u24(built.rom,0x3cf9f0+eventId*3),built.rom)).bytes;
  eventCache.set(location,{eventId,event});
 }
 return eventCache.get(location);
}
const sameText=(a,b)=>a.replace(/\{null\}$/,'')===b.replace(/\{null\}$/,'');
function nativeText(location,id){
 const{event}=eventFor(location),layout=layouts.find(l=>l.location===location),commands=new Set(layout?.tableCommands??[]);
 for(let p=0;p+3<event.length;p++)if(event[p]===0xb8)commands.add(p);
 for(const command of commands){
  const table=u24(event,command+1);
  try{const native=decodeNativeText(built.rom,table,id);if(sameText(native.text,dialogue[location]?.[id]??''))return{...native,table};}catch{}
 }
 throw Error(`No adapted ROM text at ${location}:${id}`);
}
function controller(s){return{
 read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),hold:(input,n)=>runFrames(s,n,input),
 tap:(input=256,gap=12)=>{runFrames(s,3,input);runFrames(s,gap);},shot:async()=>{}
};}
const pixels=new Uint8Array(512*480*4);
function visibleGlyphs(s){
 s.setPixels(pixels);let bright=0;
 for(let y=44;y<180;y++)for(let x=8;x<504;x++){const p=(y*512+x)*4;if(pixels[p]>150&&pixels[p+1]>150&&pixels[p+2]>150)bright++;}
 return bright;
}
function visualProof(s,{assertVisible=true}={}){
 const rgba=new Uint8Array(512*480*4);s.setPixels(rgba);let nonblack=0;
 for(let p=0;p<rgba.length;p+=4)if(rgba[p]||rgba[p+1]||rgba[p+2])nonblack++;
 if(assertVisible)assert.ok(nonblack>1000,'native scene has a visible framebuffer');
 return{nonblack,sha256:createHash('sha256').update(rgba).digest('hex')};
}
function attachLog(s,h,{initialLocations=[]}={}){
 const log={locations:[...initialLocations],messages:[],actors:[],texts:[]};
 h.on('scene.load',e=>{if(log.locations.at(-1)!==e.location)log.locations.push(e.location);});
 h.on('dialogue.render',e=>{
  log.messages.push([e.location,e.stringId]);const native=decodeNativeText(built.rom,e.table,e.stringId);log.texts.push({frame:e.frame,location:e.location,id:e.stringId,...native});
  assert.ok(!STALE_TEXT.test(native.text),`${e.location}:${e.stringId}: ${native.text}`);
 });
 h.on('event.init',e=>{if([0x82,0x83].includes(e.opcode))log.actors.push({location:e.location,object:e.object,id:s.ram[0x12002+e.scriptPC],init:true});});
 h.on('event.dispatch',e=>{if([0x82,0x83].includes(e.opcode))log.actors.push({location:e.location,object:e.object,id:s.ram[0x12002+e.scriptPC],init:false});});
 return log;
}
async function observeRoute(s,h,route,{frames=route.frames,lateFrames=20000,initialLocations=[]}={}){
 const log=attachLog(s,h,{initialLocations});let capturedTexts=0,lastGlyph=null,visual=null;
 function tick(f){
  if(f%45===0)runFrames(s,3,256);else s.runFrame();
  if(log.texts.length>capturedTexts&&s.frames-log.texts.at(-1).frame>=30){lastGlyph=visibleGlyphs(s);capturedTexts=log.texts.length;}
  if(f%600===0){const sample=visualProof(s,{assertVisible:false});if(sample.nonblack>1000)visual=sample;}
 }
 for(let f=0;f<frames;f++){tick(f);if(route.stopAtEnd&&log.locations.length===route.locations.length&&log.locations.at(-1)===route.locations.at(-1))break;}
 if(route.after==='parade'){
  assert.equal(u16(s.ram,0x100),80,'native parade is ready for controller navigation');
  await driveParadeToFarewell(controller(s));
  for(let f=0;f<lateFrames;f++)tick(f);
 }
 assert.deepEqual(log.locations,route.locations,`${route.name} native scene order`);
 const expectedMessages=route.steps.filter(s=>s.kind==='message').concat(route.lateSteps??[]).map(s=>[s.location,s.id]);
 assert.deepEqual(log.messages,expectedMessages,`${route.name} native rendered-message order`);
 if(route.silent)assert.deepEqual(log.messages,[],`${route.name} remains a visual/casting presentation`);
 if(expectedMessages.length)assert.ok(lastGlyph>3,`${route.name} has visible text glyphs during its native scene`);
 if(!visual)visual=visualProof(s);
 assert.equal(s.cpu.stopped,false);assert.deepEqual(s.cart.data,built.rom);
 return{...log,visual};
}
async function selectorFixture(route,phase=0){
 const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h);
 for(let n=0;n<phase;n++)s.runFrame();
 s.ram[0x10000]=route.story??0xd4;s.ram[0x100ab]=route.ab??0;s.ram[0x100aa]=route.aa??(route.dive?0:4);s.ram[0x100ce]=route.dive?5:0;
 dev.jump({id:route.location??82,x:8,y:8,party:route.party??[0,1,2],endgame:true});
 for(let n=0;n<60&&dev.pending;n++)s.runFrame();
 assert.equal(dev.pending,null,'diagnostic location setup dispatched');
 // DOCUMENTED BOUNDARY: all story/party/location setup is complete. Removing
 // devtools guarantees no later event-hook writes; only reads/buttons follow.
 dev.dispose();return{s,h,dev};
}

test('ROM ending inventory, native text ownership, casting and Slide Show final joke are adapted',()=>{
 const expected=new Map([[84,32],[85,87],[87,89],[79,83],[80,84],[239,159],[338,13],[340,15],[345,309],[379,19],[414,222],[476,295],[12,325]]);
 for(const[location,eventId]of expected){assert.equal(eventFor(location).eventId,eventId,`native event owner ${location}`);assert.ok(layouts.some(l=>l.location===location),'authored layout '+location);}
 const locations=new Set([2,8,12,37,38,44,45,60,79,80,81,84,85,87,91,92,93,94,95,155,203,239,240,271,275,334,338,339,340,341,342,343,345,379,390,391,392,393,394,400,414,460,476,496]);
 let checked=0;
 for(const location of locations)for(const[id,text]of Object.entries(dialogue[location]??{})){
  const native=nativeText(location,Number(id));assert.ok(sameText(native.text,text),`actual ROM text ${location}:${id}`);
  assert.ok(!STALE_TEXT.test(native.text),`${location}:${id}: ${native.text}`);checked++;
 }
 const expectedCount=[...locations].reduce((n,location)=>n+Object.keys(dialogue[location]??{}).length,0);
 assert.equal(checked,expectedCount,'every selected ending/developer-room string resolves in the actual ROM');console.log('ending ROM strings checked',checked);
 assert.match(nativeText(239,186).text,/left my sandwich in 600/,'new final joke assumes a speaking Shrek');
 assert.doesNotMatch(nativeText(239,186).text,/silent|never spoke|said nothing/i);
 for(const[location,id]of[[85,114],[85,115],[85,117],[85,118],[85,125],[414,76],[414,77],[476,65]])assert.ok(nativeText(location,id).text.length>10,'native ending payoff '+location+':'+id);
 const honored=supportingCast.find(a=>a.key==='puss-honored');assert.ok(honored);assert.equal(honored.scene,85);assert.deepEqual(honored.npcs,[203]);
 const selector=eventFor(82).event,reunionTransition=selector.findIndex((v,p)=>v===0xdf&&selector[p+1]===0x54&&selector[p+2]===0x02);
 assert.ok(reunionTransition>0,'native selector retains the Reunion DF 54 02 transition');
 const reunion=eventFor(85).event,positions=[114,115,116,117,118,119,125,126].map(id=>{
  const p=reunion.findIndex((v,i)=>v===id&&[0xbb,0xc0,0xc3,0xc4].includes(reunion[i-1]));assert.ok(p>0,'Reunion command '+id);return p;
 });
 assert.deepEqual(positions,[...positions].sort((a,b)=>a-b),'Reunion rescue/farewell commands retain native event order');
 console.log('ending scope',ENDING_SCOPE);console.log(REUNION_LIMIT);console.log(BRANCH_LIMIT);
});

for(const route of ENDING_ROUTES.filter(r=>r.name!=='beyond-time'))test(`native ending scene order and rendered text: ${route.name}`,async()=>{
 // "What the Prophet Seeks" polls vblank in a way this development core
 // (which has no short odd-frame scanline) can phase-lock, on the unmodified
 // cartridge too; Snes9x and bsnes are unaffected. Whether it locks depends
 // on the frame the scene is entered on, so that one route may enter up to
 // three frames later. Every other route must pass on its first entry.
 const phases=route.name==='what-the-prophet-seeks'?4:1;let failure;
 for(let phase=0;phase<phases;phase++){
  const{s,h,dev}=await selectorFixture(route,phase);
  try{
   const result=await observeRoute(s,h,route);
   assert.equal(dev.diagnostics().fatal,null);if(route.name==='slide-show')assert.equal(result.messages.at(-1)[1],186,'Slide Show reaches its new final joke');
   return;
  }catch(e){failure=e;}finally{h.dispose();}
 }
 throw failure;
});

test('finalArena native victory reaches Beyond Time, parade, bell and farewell without post-boundary writes',async()=>{
 const route=ENDING_ROUTES.find(r=>r.name==='beyond-time'),s=await finalArena(built.rom),h=installHooks(s,specs);
 s.ram[0x10000]=0xd4;s.ram[0x100ab]=0;s.ram[0x100aa]=4;s.ram[0x100ce]=0;
 for(let slot=0;slot<3;slot++){put16(s.ram,0x5e30+slot*128,9999);put16(s.ram,0x5e32+slot*128,9999);s.ram[0x5e6b+slot*128]=255;s.ram[0x5e6c+slot*128]=255;}
 put16(s.ram,0x5e30+9*128,1);put16(s.ram,0x5e32+9*128,1);
 let tysonAtLethalCoreResult=0;
 h.on('battle.result',e=>{if(e.target===9&&u16(s.ram,0x5e30+9*128)<=1)tysonAtLethalCoreResult=Math.max(tysonAtLethalCoreResult,u16(s.ram,0x5e30+3*128));});
 // DOCUMENTED BOUNDARY: strong stats and a one-HP core are diagnostic only.
 // Native attacks/items, AI, victory, scenes and dialogue run from here on.
 const battle=await driveFinalVictory(controller(s));assert.ok(tysonAtLethalCoreResult>0,'lethal core result occurs with Tyson standing');
 const result=await observeRoute(s,h,route,{frames:12000,initialLocations:[82]});
 assert.ok(result.messages.some(([l,id])=>l===85&&id===95),'intact Dragon harness farewell renders');
 assert.ok(result.messages.some(([l,id])=>l===85&&id===80),'Farquaad/Lyra farewell text renders in this fixture');
 h.dispose();
});

test('normal-ending diagnostic fixtures include recruited/defeated party and intact/dive Epoch states',async()=>{
 const base=ENDING_ROUTES.find(r=>r.name==='beyond-time');
 for(const fixture of[
  {name:'farquaad-recruited-dragon-intact',party:[0,1,6],ab:0x40,aa:4,dive:false},
  {name:'farquaad-defeated-dragon-dive',party:[0,1,2],ab:0x80,aa:0,dive:true}
 ]){
  const route={...base,...fixture,name:fixture.name},{s,h,dev}=await selectorFixture(route),result=await observeRoute(s,h,route);
  assert.equal(dev.diagnostics().fatal,null);assert.equal(s.ram[0x100ab],fixture.ab,'native Epoch/Farquaad fixture state is retained');
  assert.ok(result.actors.length>0,'native ending casting commands execute');h.dispose();
 }
 console.log(BRANCH_LIMIT);
});

test('Shrek-absent native renderer shows Reunion; Dream Project, Prophet and other payoffs are adapted',async()=>{
 const cases=[[85,114],[85,115],[85,117],[85,118],[85,125],[338,13],[340,53],[379,20],[390,59],[414,76],[414,77],[12,79],[12,82],[345,118],[239,186],[476,65]];
 const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h);
 dev.jump({id:2,x:8,y:8,party:[1,2,3]});runFrames(s,400);dev.dispose();s.ram[0x1238e]=0xb2;runFrames(s,8);
 assert.deepEqual([...s.ram.slice(0x2980,0x2983)],[1,2,3],'Shrek is absent from the Reunion text fixture');
 const base=snapshot(s);
 for(const[location,id]of cases){
  // Restore only before this case's documented setup boundary. The native
  // renderer gets an actual event table/string command from the built ROM.
  restore(s,base);const native=nativeText(location,id),table=native.table;
  s.ram.set([7,0x39,0x30,0xd6,1,2,3,4,5,6,7,8,9,10,11,12],0x200);
  s.ram.set([0xb8,table&255,table>>8&255,table>>16&255,0xc0,id,0,0xb2],0x1238e);
  let opened=false;for(let n=0;n<1200;n++){s.runFrame();if(s.ram[0x126]&&s.ram[0x12a]===id){opened=true;break;}}
  assert.ok(opened,`native message opens ${location}:${id}`);runFrames(s,30);assert.ok(visibleGlyphs(s)>3,`visible native glyphs ${location}:${id}`);
  const current=decodeNativeText(built.rom,u24(s.ram,0x12b),s.ram[0x12a]);assert.ok(sameText(current.text,dialogue[location][id]));assert.ok(!STALE_TEXT.test(current.text));
 }
 h.dispose();console.log(REUNION_LIMIT);
});

test('native Last Inn bucket choice reaches the Cosmic Muffin arrival',async()=>{
 const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),messages=[];h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
 s.ram[0x10000]=0xcb;dev.jump({id:464,x:34,y:18,facing:0,party:[0,1,2],endgame:true});runFrames(s,400);
 // DOCUMENTED BOUNDARY: checkpoint complete. Only A input and reads follow.
 dev.dispose();for(let n=0;n<24&&u16(s.ram,0x100)===464;n++){runFrames(s,3,256);runFrames(s,300);}
 assert.ok(messages.some(([l,id])=>l===464&&id===148),'native Day of the Muffin choice renders');assert.equal(u16(s.ram,0x100),466);assert.equal(s.ram[0x166],2,'native Yes row');h.dispose();
});

test('New Game Plus right telepod uses its native pre-load flag and controller route',async()=>{
 const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),io=controller(s);
 s.ram[0x10000]=0;s.ram[0x101cf]=0x10;dev.jump({id:8,x:8,y:12,facing:0});runFrames(s,1800);
 for(let n=0;n<12&&s.ram[0x126];n++){runFrames(s,3,256);runFrames(s,80);}
 // DOCUMENTED BOUNDARY: 0x10 was present before location 8 initialized. The
 // introductory text and diagnostic jump are finished; no further writes.
 dev.dispose();const{walk}=movement(io);
 for(const[x,y]of[[136,160],[136,144],[216,144],[192,144],[192,88]])await walk(x,y);
 runFrames(s,40,16);for(let n=0;n<24&&u16(s.ram,0x100)===8;n++){runFrames(s,3,256);runFrames(s,150);}
 assert.equal(u16(s.ram,0x100),467);assert.equal(s.ram[0x10000],64);assert.equal(s.ram[0x101cf],0x21,'native gate consumes the pre-load 0x10 flag into its travel state');h.dispose();
});
