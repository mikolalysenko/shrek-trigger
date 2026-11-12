// Focused inherited collision proof; no fix, palette write, or event override.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync,writeFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import {privateOverlay,dir,hash} from './private-overlay.mjs';
import {oamCells,locate,pixelProof} from './native-proof-utils.mjs';
import {nativeSpriteBank} from '../../../scripts/native-sprite-view.mjs';
import {u16,u24} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {cartridgeOffset} from '../../../engine/expanded-rom.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {snapshot,restore} from '../../../engine/save.js';

const {c,rom,active,baseline}=await privateOverlay(),out=dir+'/scene-verification/';await mkdir(out,{recursive:true});
const original=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc'));assert.equal(hash(original),'06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9');
const packet=cart=>decompress(cart,cartridgeOffset(u24(cart,0x3cf9f0+u16(cart,0x360008+80*14)*3),cart)).bytes;
assert.deepEqual(packet(original),packet(active));assert.deepEqual(packet(active),packet(rom));
const report={status:'Inherited active palette collision reproduced against original USA',baseline,privateRomSha256:hash(rom),originalSha256:hash(original),location:80,eventPacketSha256:hash(packet(original)),eventPacketExactAcrossAll:true,checkpoint:{id:80,x:22,y:34,facing:0,story:200,party:[0,1,2],endgameKit:true,flag7F006D:64},cases:[]};
for(const [name,cart] of [['original-usa',original],['af338',active],['candidate',rom]]){
 const s=await createCore(cart),statePath=dir+'/private-qa/newgame-'+hash(cart).slice(0,12)+'.json';
 if(existsSync(statePath))restore(s,JSON.parse(await readFile(statePath)));else{await newGame(s);await writeFile(statePath,JSON.stringify(snapshot(s)));}
 const h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h),commands=[],changes=[],headers=[0,39,79,213,215].map(id=>({id,offset:0x24f023+id*5,bytes:[...cart.slice(0x24f023+id*5,0x24f023+id*5+5)]}));
 let tick=0,lastColors='';
 const log=e=>{if(e.location===80&&e.opcode===0x33){const sourcePointer=u16(s.ram,0x1400+e.object*2),sourceWords=Array.from({length:12},(_,i)=>u16(cart,0x240000+sourcePointer+i*2));commands.push({...e,tick,order:commands.length,hardwareRow:s.ram[0x12002+e.scriptPC],sourcePointer,sourceWords});}};
 h.on('event.init',log);h.on('event.dispatch',log);
 s.ram[0x10000]=200;s.ram[0x1006d]=64;d.jump({id:80,x:22,y:34,facing:0,party:[0,1,2],endgame:true});
 for(;tick<1100;tick++){runFrames(s,1);assert.equal(d.diagnostics().fatal,null);if(u16(s.ram,0x100)!==80)continue;const colors=[...s.ppu.cgram.slice(241,253)],key=colors.join(',');if(key!==lastColors){changes.push({tick,colors,brightness:s.ppu.brightness});lastColors=key;}}
 assert.equal(u16(s.ram,0x100),80);const colors=[...s.ppu.cgram.slice(241,253)],source133=Array.from({length:12},(_,i)=>u16(cart,0x240000+u16(cart,0x242a00+133*2)+i*2)),source138=Array.from({length:12},(_,i)=>u16(cart,0x240000+u16(cart,0x242a00+138*2)+i*2));
 const frame=s.ram[0xf01+40*2],bank=name==='candidate'?{...c.compiled[0],...c.compiled[0].groups[0],frames:31}:nativeSpriteBank(cart,{gfx:35,asm:24,palette:133,frames:31,size:0}),match=locate(bank,frame,oamCells(s));assert.ok(match,'Exact original or generated native tiles remain in OAM');assert.equal(match.cells[0].palette,7);const pixels=pixelProof(s,[match],colors);assert.ok(pixels.exact>0);
 const row7=commands.filter(x=>x.hardwareRow===7);assert.equal(row7.at(-1).object,41);assert.equal(row7.at(-1).scriptPC,3191);assert.ok(row7.some(x=>x.object===40&&x.scriptPC===3160));
 if(name==='original-usa')assert.deepEqual(colors,source133);else{assert.deepEqual(colors,source138);assert.notDeepEqual(colors,source133);}
 assert.deepEqual(s.cart.data,cart);const png=new PNG({width:512,height:480});s.setPixels(png.data);const screenshot='parade-sharing-'+name+'.png';writeFileSync(out+screenshot,PNG.sync.write(png));
 report.cases.push({name,romSha256:hash(cart),nativeTicks:tick,headers,row7Commands:row7,cgramChanges:changes,finalCgram:colors,source133,source138,source133Retained:colors.every((v,i)=>v===source133[i]),target:{npc:39,object:40,frame,sourcePalettePointer:u16(s.ram,0x1450),hardwarePaletteRow:7,origin:match.origin,exactActualColorPixels:pixels.exact,occludedPixels:pixels.mismatches},screenshot:out+screenshot,cartridgeUnchanged:true});
 d.dispose();h.dispose();console.log(JSON.stringify({name,finalPalette:colors.every((v,i)=>v===source133[i])?133:138,lastWriter:row7.at(-1).object,pixels:pixels.exact,hidden:pixels.mismatches}));
}
report.finding='Original USA NPC215 header [36,25,133,16,0] preserves shared row7. af338 changed it to [249,231,138,16,0] while original event80 body3191 still copies its palette to row7 after NPC39/body3160. This prior replacement regression recolors every visible row7 actor, including gfx35 and gfx125. The candidate only replaces gfx35 art/assembly/raw pointer and reproduces the same incorrect row7 colors.';
report.actionForRoot='Provide a palette133-compatible scene variant for NPC215 or preserve the shared133 material indices in its row7 scene without disturbing the native palette reservation. NPC0 also changed133 to139 and writes row7 earlier at3101; audit all shared row7 writers during integration. Do not change source133 globally or claim source colors correct from tile upload alone.';
report.scope='Same explicit diagnostic post-parade checkpoint on original USA, pinned af338 and candidate. Actual original initialization commands and settled native OAM/CGRAM/PPU evidence; no complete parade/ending route or active fix.';
await writeFile(out+'parade-palette-sharing.json',JSON.stringify(report,null,2)+'\n');
