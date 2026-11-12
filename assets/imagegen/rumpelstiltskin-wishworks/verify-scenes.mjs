import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {privateOverlay,dir,hash} from './private-overlay.mjs';
import {u16,u24} from '../../../engine/rom.js';
import {cartridgeOffset} from '../../../engine/expanded-rom.js';
import {decompress} from '../../../engine/compression.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {screenshot} from '../../../tests/helpers.mjs';
import {chooseNativeTech,useNativeItem} from '../../../tests/battle-controller.mjs';

const {c,rom,active,baseline,table,actors,rawPointers}=await privateOverlay(),out=dir+'/scene-verification/';await mkdir(out,{recursive:true});
const scenes=[...new Map(c.audit.families.flatMap(f=>f.sceneUses).map(s=>[s.location,s])).values()];
const unions=scenes.map(scene=>{
 const headers=[...scene.allEnemyOwners.map(id=>({kind:'enemy',id,offset:0x24f600+id*10})),...scene.allNpcOwners.map(id=>({kind:'npc',id,offset:0x24f000+(id+7)*5}))];
 const graphics=[...new Set(headers.map(h=>rom[h.offset]))];
 const parts=graphics.map(gfx=>{const current=decompress(active,cartridgeOffset(u24(active,0x242000+gfx*3),active)).bytes.length,candidate=decompress(rom,cartridgeOffset(u24(rom,0x242000+gfx*3),rom)).bytes.length;return{gfx,currentBytes:current,candidateBytes:candidate,currentHeapBytes:u24(active,table+gfx*3)?0:current,candidateHeapBytes:u24(rom,table+gfx*3)?0:candidate,streamed:!!u24(rom,table+gfx*3)};});
 const eid=u16(rom,0x360008+scene.location*14),offset=cartridgeOffset(u24(rom,0x3cf9f0+eid*3),rom),packet=decompress(rom,offset),oldOffset=cartridgeOffset(u24(active,0x3cf9f0+eid*3),active),oldPacket=decompress(active,oldOffset);
 assert.deepEqual(packet.bytes,oldPacket.bytes,'Authored location packet unchanged '+scene.location);
 return{location:scene.location,name:scene.name,originalEnemyOwners:scene.allEnemyOwners,originalNpcOwners:scene.allNpcOwners,parts,currentHeapUpperBound:parts.reduce((n,p)=>n+p.currentHeapBytes,0),candidateHeapUpperBound:parts.reduce((n,p)=>n+p.candidateHeapBytes,0),decodedUnion:parts.reduce((n,p)=>n+p.candidateBytes,0),eventId:eid,eventOffset:offset,eventDecodedSha256:hash(packet.bytes),scope:'Conservative all-branch original actor-ID union, with current graphics ownership; not a simultaneous formation. Original current event bytes unchanged.'};
});
await writeFile(dir+'/current-co-loads.json',JSON.stringify({baseline,privateRomSha256:hash(rom),scenes:unions},null,2)+'\n');

const configs={
 'night-throne':{id:334,story:188,x:24,y:16,d2:0,formation:[161],up:80,finalStory:189},
 'golem-twins':{id:414,story:200,x:8,y:22,d2:0,formation:[149,149],up:80,finalStory:201},
 'blackbird-wing':{id:363,story:207,x:14,y:25,d2:0,party:[1,2,3],recoveredEquipmentFlags:{'7F00AF':7,'7F00BA':6},formation:[243],up:0},
 'dragon-deck':{id:377,story:207,x:7,y:25,d2:7,party:[1,2,3],formation:[162],up:0},
};
const names=process.argv.slice(2).length?process.argv.slice(2):['night-throne','golem-twins'];
for(const name of names){
 const cfg=configs[name];assert.ok(cfg,'Known scenario');const s=await createCore(rom);await newGame(s);const h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h),loads=[],battleDispatches=[],messages=[],techs=[],fieldPointers=new Map(),observed=new Map(),heaps=[],controllerActions=[];let ticks=0;
 h.on('event.init',e=>{if(e.opcode===0x83)loads.push({...e,enemy:s.ram[0x12002+e.scriptPC]});});h.on('event.dispatch',e=>{if(e.opcode===0xd8)battleDispatches.push(e);});h.on('dialogue.render',e=>messages.push(e));h.on('battle.enemy-tech',e=>techs.push(e));h.on('battle.tech',e=>techs.push(e));
 const observe=()=>{assert.equal(d.diagnostics().fatal,null);if(s.ram[0x117]&1)return;const heap=u16(s.ram,0x171)-32768;if(heap>=0&&heap<=32768)heaps.push(heap);for(const l of loads){const a=actors.find(a=>a.enemy===l.enemy);if(!a||l.location!==u16(s.ram,0x100))continue;const x=l.object*2,pointer=u16(s.ram,0x1280+x)|s.ram[0x1200+x]<<16;if(pointer!==rawPointers[a.gfx])continue;const palettePointer=u16(s.ram,0x1400+x);assert.equal(palettePointer,u16(rom,0x242a00+a.palette*2),'Original owner palette pointer');const f=s.ram[0xf01+x];if(f<a.frames){const key=l.location+':'+a.key+':'+l.object+':'+f;observed.set(key,(observed.get(key)??0)+1);}fieldPointers.set(l.location+':'+l.object,{location:l.location,enemy:l.enemy,object:l.object,gfx:a.gfx,pointer,palette:a.palette,palettePointer});}};
 const wait=(n,keys=0)=>{for(let t=0;t<n;t++){runFrames(s,1,keys);ticks++;if(t%8===0)observe();}},tap=(key=256,gap=100)=>{wait(3,key);wait(gap);},shot=label=>screenshot(s,out+name+'-'+label+'.png');
 // Diagnostic checkpoint setup only. The actual entry, dialogue, formation, AI and return are authored native events.
 s.ram[0x10000]=cfg.story;s.ram[0x100d2]=cfg.d2;s.ram[0x100f8]&=127;s.ram[0x100ba]&=253;
 if(name==='blackbird-wing'){s.ram[0x100af]|=7;s.ram[0x100ba]|=6;}
 d.jump({name:'Private authored encounter '+name,id:cfg.id,x:cfg.x,y:cfg.y,party:cfg.party??[0,1,2],endgame:true});wait(500);await shot('entry');if(cfg.up)wait(cfg.up,17);
 for(let i=0;i<40&&!(s.ram[0x117]&1);i++)tap();
 assert.equal(s.ram[0x117]&1,1,'Original encounter started');wait(500);const formation=[...s.ram.slice(0xaf02,0xaf0a)];assert.deepEqual(formation.filter(i=>i!==255),cfg.formation,'Original formation');await shot('battle');
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),tap:(k=256,gap=12)=>tap(k,gap),wait};
 let taps=0;
 if(name==='golem-twins'){
  for(;taps<150&&(s.ram[0x117]&1);taps++){
   for(let n=0;n<120&&s.ram[0x95d5]>2&&(s.ram[0x117]&1);n++)wait(30);
   if(!(s.ram[0x117]&1))break;
   for(let n=0;n<120&&(s.ram[0x95db]||s.ram[0x9609])&&(s.ram[0x117]&1);n++)tap(1,12);
   if(!(s.ram[0x117]&1))break;
   const hp=[0,1,2].map(i=>u16(s.ram,0x5e30+i*128));assert.ok(hp.some(Boolean),'Native party survives');
   if(hp.includes(0)){await useNativeItem(io,199,hp.indexOf(0),{allowBattleEnd:true});controllerActions.push({item:199});}
   else if(hp.some(n=>n<650)||[0,1,2].some(i=>u16(s.ram,0x5e34+i*128)<20)){await useNativeItem(io,197,null,{allowBattleEnd:true});controllerActions.push({item:197});}
   else {for(let retry=0;retry<120;retry++){if(!(s.ram[0x117]&1))break;for(let n=0;n<120&&(s.ram[0x95db]||s.ram[0x9609])&&(s.ram[0x117]&1);n++)tap(1,12);const slot=s.ram[0x95d5];if(slot>2){wait(30);continue;}const tech=[8,14,20][slot];try{await chooseNativeTech(io,rom,slot,tech);controllerActions.push({slot,tech});console.log(JSON.stringify({action:taps,slot,tech,hp}));break;}catch(e){if(!['Native tech window did not open','Battle command menu is not ready','Requested party member is not ready'].includes(e.message))throw e;wait(30);if(retry===119)throw e;}}}
   wait(400);
  }
 }else if(name==='blackbird-wing'){for(;taps<300&&(s.ram[0x117]&1);taps++)wait(30);controllerActions.push({action:'Observe original fear/countdown/retreat AI without attacks',nativeTicks:taps*30});}
 else for(;taps<200&&(s.ram[0x117]&1);taps++)tap();
 assert.equal(s.ram[0x117]&1,0,'Battle returns through native engine');wait(120);await shot('battle-return');
 const complete=()=>cfg.finalStory?s.ram[0x10000]===cfg.finalStory&&s.ram[0x11f]===1&&!s.ram[0x126]:name==='dragon-deck'?s.ram[0x100d2]!==7&&u16(s.ram,0x100)!==377:name==='blackbird-wing'?s.ram[0x100d2]===1&&u16(s.ram,0x100)===271:true;
 let continuationTaps=0;for(;continuationTaps<160&&!complete();continuationTaps++){const awaitingY=name==='dragon-deck'&&Array.from({length:s.ram[0x12000]},(_,i)=>u16(s.ram,0x1180+i*2)).some(pc=>pc>=0xbc8&&pc<=0xbcc);tap(awaitingY?2:256);}if(!complete()){await shot('unfinished-continuation');await writeFile(out+name+'-unfinished.json',JSON.stringify({location:u16(s.ram,0x100),story:s.ram[0x10000],d2:s.ram[0x100d2],battle:s.ram[0x117],control:s.ram[0x11f],dialogue:s.ram[0x126],local:[...s.ram.slice(0x10200,0x10240)],party:[...s.ram.slice(0x2980,0x2983)].map(id=>({id,hp:u16(s.ram,0x2603+id*80)})),messages,battleDispatches,scriptPCs:Array.from({length:s.ram[0x12000]},(_,i)=>u16(s.ram,0x1180+i*2))},null,2)+'\n');}assert.ok(complete(),'Authored victory continuation completed');wait(120);await shot('return');
 const survivingParty=[...s.ram.slice(0x2980,0x2983)].map(id=>({id,hp:u16(s.ram,0x2603+id*80)}));assert.ok(survivingParty.some(p=>p.hp>0),'Party survived original encounter');
 assert.deepEqual(s.cart.data,rom);assert.ok(heaps.length);assert.ok(fieldPointers.size);assert.ok(battleDispatches.length,'Native D8 battle command executed');
 const report={status:'Passed',name,baseline,privateRomSha256:hash(rom),scope:'Authored current location event, original actors/formation/AI and controller battle, followed by the authored progression flag and return. Initial diagnostic warp/story flags and endgame party only; no event/pose/enemy writes after entry. This is not a connected whole-chapter playthrough.',checkpoint:cfg,nativeTicks:ticks,formation,controllerIterations:taps,controllerActions,continuationTaps,survivingParty,returnLocation:u16(s.ram,0x100),returnStory:s.ram[0x10000],returnD2:s.ram[0x100d2],heapMin:Math.min(...heaps),heapMax:Math.max(...heaps),loads,battleDispatches,messages,techs,fieldPointers:[...fieldPointers.values()],observedNativeFieldFrames:[...observed].map(([key,sampledTicks])=>({key,sampledTicks})),allThreePalettesUnchanged:true,cartridgeUnchanged:true};
 await writeFile(out+name+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({name,ticks,taps,formation,heapMax:report.heapMax,returnLocation:report.returnLocation,returnStory:report.returnStory}));d.dispose();h.dispose();
}
