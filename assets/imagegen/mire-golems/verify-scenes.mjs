// Original Lab 32 road flow; only the entry diagnostic prepares chapter state.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {createCore} from '../../../scripts/core.mjs';
import {restore} from '../../../engine/save.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {runFrames} from '../../../engine/automation.js';
import {u16} from '../../../engine/rom.js';
import {areas} from '../../../content/areas.js';
import {traverseFutureRoad} from '../../../tests/future-road-controller.mjs';
const dir='assets/imagegen/mire-golems',out='.local/qa/mire-golems-native-proof',json=async p=>JSON.parse(await readFile(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const candidate=await json(out+'/candidate.json'),rom=new Uint8Array(await readFile(out+'/candidate.sfc'));assert.equal(hash(rom),candidate.candidateSha256);await mkdir(out+'/scenes',{recursive:true});
const s=await createCore(rom),bedroom=await json(out+'/bedroom.json');restore(s,bedroom);const h=installHooks(s,await json('content/hooks.json')),d=createDevTools(s,h),loads=[],battles=[],results=[],screenshots=[],heaps={224:0,312:0};
h.on('event.init',e=>{if(![224,312].includes(e.location)||e.opcode!==0x83)return;loads.push({location:e.location,object:e.object,enemy:s.ram[0x12002+e.scriptPC],frame:s.frames});});
h.on('battle.initialized',e=>{if(e.location===224)battles.push({frame:s.frames,location:e.location,enemies:Array.from(s.ram.slice(0xaf02,0xaf0a)).filter(id=>id!==255)});});
h.on('battle.result',e=>{if(e.location===224)results.push(e);});
h.on('field.nmi',e=>{if(!Object.hasOwn(heaps,e.location))return;const bytes=u16(s.ram,0x171)-0x8000;if(bytes>=0){assert.ok(bytes<=32768);heaps[e.location]=Math.max(heaps[e.location],bytes);}});
const routeFinished=new Error('Bounded road route complete before the unrelated race');
async function shot(key){const png=new PNG({width:512,height:480});s.setPixels(png.data);const bytes=PNG.sync.write(png),file='scenes/'+key+'.png';await writeFile(out+'/'+file,bytes);screenshots.push({file,sha256:hash(bytes)});if(key==='road-east')throw routeFinished;}
function owners(location,enemy){return loads.filter(a=>a.location===location&&a.enemy===enemy).map(a=>{const x=a.object*2,sourcePointer=(s.ram[0x1200+x]<<16)|u16(s.ram,0x1280+x),palette=rom[0x24f602+enemy*10],palettePointer=u16(s.ram,0x1400+x);assert.equal(sourcePointer,candidate.streams.find(t=>t.gfx===154).address);assert.equal(palettePointer,u16(rom,0x242a00+palette*2));return{...a,gfx:154,palette,sourcePointer,palettePointer};});}
let roadArrival,road,ironArrival;
try{
 d.jump(areas.find(a=>a.futureScene==='future-road'));runFrames(s,400);assert.equal(u16(s.ram,0x100),224);assert.equal(d.diagnostics().fatal,null);roadArrival=owners(224,163);assert.ok(roadArrival.length);await shot('road-arrival');console.log('Lab 32 original Mire loads use the selected source pointer');
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(keys,n)=>runFrames(s,n,keys),wait:n=>runFrames(s,n),tap:(keys=256,gap=90)=>{runFrames(s,3,keys);runFrames(s,gap);},shot};
 try{await traverseFutureRoad(io,rom);assert.fail('Road driver must stop at its original east exit');}catch(e){if(e!==routeFinished)throw e;}
 assert.equal(u16(s.ram,0x100),225);assert.equal(s.ram[0x10000],55);assert.equal(s.ram[0x10010]&1,1);assert.deepEqual(battles.map(b=>b.enemies),[[163,163,163],[163,163],[102,102,102,102,102],[163,163,163]]);assert.ok(results.some(r=>r.value>0&&r.value<32768));
 const item=Array.from(s.ram.slice(0x2400,0x2500)).indexOf(221);assert.ok(item>=0);assert.equal(s.ram[0x2500+item],1);road={origin:224,destination:225,recorder:221,quantity:1,chestFlag:1,story:55,battles,nativeDamageResults:results.length,positiveDamageResults:results.filter(r=>r.value>0&&r.value<32768).length};console.log('Four original road formations, damage, victory, recorder and native east exit passed');
 assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,rom);
 restore(s,bedroom);d.jump({id:312,x:8,y:8,party:[0,1,2],endgame:true});runFrames(s,400);assert.equal(u16(s.ram,0x100),312);ironArrival=owners(312,164);assert.ok(ironArrival.length);assert.equal(d.diagnostics().fatal,null);await shot('iron-scene312-arrival');assert.deepEqual(s.cart.data,rom);console.log('Original Iron Golem scene 312 native initialization passed');
}finally{d.dispose();h.dispose();}
const proof={status:'passed',baselineSha256:candidate.baselineSha256,candidateSha256:candidate.candidateSha256,core:'repository SNES JS native 65816/PPU',scope:'Original Lab 32 scene 224 controller route through four native battles, recorder chest and east exit to 225; existing chapter entry fixture, then controller input only. Iron Golem scene 312 native initialization is a separate bounded test.',roadArrival,road,ironArrival,maxObservedFieldHeapBytes:heaps,loads,screenshots,evidence:out,runner:{file:dir+'/verify-scenes.mjs',sha256:hash(await readFile(dir+'/verify-scenes.mjs'))},limitations:['Stops before the unrelated race controller after the original road-east checkpoint.','Scene 312 establishes original owner initialization, selected source/palette pointer and heap only; no Iron Golem encounter route or victory is claimed.','Scene 213 has a conservative original-load union and isolated owner proof only.','No independent-core execution in this inactive source packet; root owns production validation.']};
await writeFile(dir+'/native-scene-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({heaps,battles:road.battles.length,damage:road.nativeDamageResults,destination:road.destination,ironOwners:ironArrival.length}));
