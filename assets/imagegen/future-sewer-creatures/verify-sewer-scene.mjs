// The original chapter fixture supplies entry state; subsequent route uses only controller input.
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
import {traverseSewerEntrance,traverseSewerDiary,traverseSewer,traverseUpperSewer} from '../../../tests/sewer-controller.mjs';
const dir='assets/imagegen/future-sewer-creatures',out='.local/qa/future-sewer-creatures-native-proof',hash=b=>createHash('sha256').update(b).digest('hex'),json=async p=>JSON.parse(await readFile(p));
const candidate=await json(out+'/candidate.json'),rom=new Uint8Array(await readFile(out+'/candidate.sfc'));assert.equal(hash(rom),candidate.candidateSha256);await mkdir(out+'/sewer',{recursive:true});
const s=await createCore(rom);restore(s,await json(out+'/bedroom.json'));s.ram[0x1019b]|=64; // Existing rescued-prisoner fixture branch.
const h=installHooks(s,await json('content/hooks.json')),d=createDevTools(s,h),loads=[],messages=[],battles=[],results=[],dispatches=[],screenshots=[];let maxFieldHeap=0;
h.on('event.init',e=>{if(![236,237].includes(e.location)||e.opcode!==0x83)return;const p=0x12001+e.scriptPC,enemy=s.ram[p+1];loads.push({location:e.location,object:e.object,enemy,frame:s.frames});});
h.on('event.dispatch',e=>{if(e.location===236&&e.opcode===0xd8&&dispatches.at(-1)!==e.scriptPC)dispatches.push(e.scriptPC);});
h.on('dialogue.render',e=>{if([236,237].includes(e.location))messages.push({location:e.location,stringId:e.stringId});});
h.on('battle.initialized',e=>{if([236,237].includes(e.location))battles.push({frame:s.frames,location:e.location,enemies:Array.from(s.ram.slice(0xaf02,0xaf0a)).filter(id=>id!==255)});});
h.on('battle.result',e=>{if([236,237].includes(e.location))results.push(e);});
h.on('field.nmi',e=>{if(![236,237].includes(e.location))return;const bytes=u16(s.ram,0x171)-0x8000;if(bytes>=0){assert.ok(bytes<=32768);maxFieldHeap=Math.max(maxFieldHeap,bytes);}});
async function shot(key){const p=out+'/sewer/'+key+'.png',png=new PNG({width:512,height:480});s.setPixels(png.data);const bytes=PNG.sync.write(png);await writeFile(p,bytes);screenshots.push({file:'sewer/'+key+'.png',sha256:hash(bytes)});}
let arrivalOwners,entrance,diary,lower,upper;
try{
 d.jump(areas.find(a=>a.futureScene==='future-sewer-entrance'));runFrames(s,400);assert.equal(u16(s.ram,0x100),236);assert.equal(d.diagnostics().fatal,null);
 arrivalOwners=loads.filter(a=>a.location===236&&[42,82].includes(a.enemy)).map(a=>{const x=a.object*2,gfx=rom[0x24f600+a.enemy*10],sourcePointer=(s.ram[0x1200+x]<<16)|u16(s.ram,0x1280+x),expected=candidate.streams.find(t=>t.gfx===gfx).address;assert.equal(sourcePointer,expected);return{...a,gfx,sourcePointer,palettePointer:u16(s.ram,0x1400+x)};});
 assert.ok(arrivalOwners.some(a=>a.enemy===42));assert.ok(arrivalOwners.some(a=>a.enemy===82));await shot('sewer-arrival');console.log('Original sewer 236 pod/bat stream ownership passed');
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(keys,n)=>runFrames(s,n,keys),wait:n=>runFrames(s,n),tap:(keys=256,gap=90)=>{runFrames(s,3,keys);runFrames(s,gap);},shot};
 entrance=await traverseSewerEntrance(io);console.log('Original entrance and bat warning route passed');
 diary=await traverseSewerDiary(io);lower=await traverseSewer(io,false);console.log('Original lower quiet sewer passed');
 upper=await traverseUpperSewer(io);console.log('Original upper pod encounters and world exit passed');
 assert.deepEqual(dispatches,[0x675,0x6ca,0x978,0x722]);assert.equal(upper.flags,31);assert.ok(results.some(r=>r.value>0&&r.value<32768));assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,rom);
}finally{d.dispose();h.dispose();}
const proof={status:'passed',baselineSha256:candidate.baselineSha256,candidateSha256:candidate.candidateSha256,core:'repository SNES JS native 65816/PPU',scope:'Original quiet sewer chapter route 236 → 237 → 236 → world 498; entry uses existing future-sewer-entrance diagnostic fixture, then only controller inputs. Native AI/events/formations and graphics loader remain unchanged.',arrivalOwners,maxObservedFieldHeapBytes:maxFieldHeap,entrance,diary,lower,upper,originalBattleDispatches:dispatches,battles,nativeDamageResults:results.length,positiveDamageResults:results.filter(r=>r.value>0&&r.value<32768).length,messages,loads,screenshots,evidence:out,runner:{file:dir+'/verify-sewer-scene.mjs',sha256:hash(await readFile(dir+'/verify-sewer-scene.mjs'))},limitations:['Covers original Sewer Pod and Lantern Bat scene roles; other palette owners have bounded display/timing proof and static scene-budget audits.','No independent-core execution in this source packet; root integration retains that check.','No noisy lower-route replay; unrelated lower sound traps are unchanged.']};
await writeFile(dir+'/native-scene-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({heap:maxFieldHeap,battles:battles.length,damage:results.length,destination:upper.destination}));
