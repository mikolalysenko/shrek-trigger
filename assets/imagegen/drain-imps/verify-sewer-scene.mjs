// Entry uses the existing chapter fixture; the complete noisy route then uses controller input only.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PNG} from 'pngjs';
import {createCore} from '../../../scripts/core.mjs';
import {restore} from '../../../engine/save.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {runFrames} from '../../../engine/automation.js';
import {u16} from '../../../engine/rom.js';
import {areas} from '../../../content/areas.js';
import {traverseSewerEntrance,traverseSewerDiary,traverseSewer,traverseUpperSewer} from '../../../tests/sewer-controller.mjs';
const dir='assets/imagegen/drain-imps',out='.local/qa/drain-imps-native-proof',json=async p=>JSON.parse(await readFile(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const candidate=await json(out+'/candidate.json'),rom=new Uint8Array(await readFile(out+'/candidate.sfc'));assert.equal(hash(rom),candidate.candidateSha256);await mkdir(out+'/sewer',{recursive:true});await mkdir(out+'/rise',{recursive:true});
const graphics=new Uint8Array(await readFile(dir+'/imp/graphics.4bpp')),assembly=new Uint8Array(await readFile(dir+'/imp/assembly.bin'));
function tiles(frame){const bytes=[];for(let i=0;i<16;i++){const t=u16(assembly,frame*40+i*2);for(let b of graphics.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}bytes.push(b);}}return Uint8Array.from(bytes);}
const tileHashes=new Map([9,10,11].map(f=>[f,hash(tiles(f))]));
const s=await createCore(rom),bedroom=await json(out+'/bedroom.json');restore(s,bedroom);s.ram[0x1019b]|=64; // Existing rescued-prisoner entry branch.
const h=installHooks(s,await json('content/hooks.json')),d=createDevTools(s,h),loads=[],messages=[],battles=[],results=[],dispatches=[],screenshots=[],owners=new Map(),rises=[],activeRises=new Map(),riseCaptures=[],heapByScene={236:0,237:0,160:0};
h.on('event.init',e=>{if(![160,236,237].includes(e.location)||e.opcode!==0x83)return;const enemy=s.ram[0x12002+e.scriptPC];loads.push({location:e.location,object:e.object,enemy,frame:s.frames});owners.set(e.location+':'+e.object,enemy);});
h.on('event.dispatch',e=>{
 if(e.location===236&&e.opcode===0xd8&&dispatches.at(-1)!==e.scriptPC)dispatches.push(e.scriptPC);
 const key=e.location+':'+e.object;if(![236,237].includes(e.location)||owners.get(key)!==99)return;
 const value=s.ram[0x12002+e.scriptPC];if(e.opcode===0xac&&value===9){const r={location:e.location,object:e.object,beginVideoFrame:s.frames,commands:[],samples:[]};rises.push(r);activeRises.set(key,r);}
 const r=activeRises.get(key);if(!r)return;
 if([0xac,0xad].includes(e.opcode))r.commands.push({opcode:e.opcode,value,scriptPC:e.scriptPC,videoFrame:s.frames});
 if(e.opcode===0&&r.commands.some(c=>c.opcode===0xac&&c.value===11)){r.endVideoFrame=s.frames;activeRises.delete(key);}
});
h.on('dialogue.render',e=>{if([236,237].includes(e.location))messages.push({location:e.location,stringId:e.stringId});});
h.on('battle.initialized',e=>{if([236,237].includes(e.location))battles.push({frame:s.frames,location:e.location,enemies:Array.from(s.ram.slice(0xaf02,0xaf0a)).filter(id=>id!==255)});});
h.on('battle.result',e=>{if([236,237].includes(e.location))results.push(e);});
h.on('field.nmi',e=>{if(!Object.hasOwn(heapByScene,e.location))return;const bytes=u16(s.ram,0x171)-0x8000;if(bytes>=0){assert.ok(bytes<=32768);heapByScene[e.location]=Math.max(heapByScene[e.location],bytes);}});
function step(n,keys=0){for(let i=0;i<n;i++){runFrames(s,1,keys);for(const r of activeRises.values()){if(u16(s.ram,0x100)!==r.location)continue;const x=r.object*2,p=u16(s.ram,0xd00+x)*32,v=new Uint8Array(s.ppu.vram.buffer),uploaded=Uint8Array.from([...v.slice(p,p+256),...v.slice(p+512,p+768)]),uploadedHash=hash(uploaded),match=[...tileHashes].find(([,h])=>h===uploadedHash)?.[0]??null;r.samples.push({videoFrame:s.frames,nativeFrame:s.ram[0xf01+x],uploadedFrame:match,uploadedHash});if(r===rises[0]){const png=new PNG({width:512,height:480});s.setPixels(png.data);riseCaptures.push(PNG.sync.write(png));}}}}
async function shot(key){const png=new PNG({width:512,height:480});s.setPixels(png.data);const bytes=PNG.sync.write(png),file='sewer/'+key+'.png';await writeFile(out+'/'+file,bytes);screenshots.push({file,sha256:hash(bytes)});}
function nativeOwners(location,enemy){return loads.filter(a=>a.location===location&&a.enemy===enemy).map(a=>{const x=a.object*2,sourcePointer=(s.ram[0x1200+x]<<16)|u16(s.ram,0x1280+x),palette=rom[0x24f602+enemy*10],palettePointer=u16(s.ram,0x1400+x);assert.equal(sourcePointer,candidate.streams.find(t=>t.gfx===93).address);assert.equal(palettePointer,u16(rom,0x242a00+palette*2));return{...a,gfx:93,palette,sourcePointer,palettePointer};});}
let arrivalOwners,entrance,diary,lower,upper,riverInitialization;
try{
 d.jump(areas.find(a=>a.futureScene==='future-sewer-entrance'));step(400);assert.equal(u16(s.ram,0x100),236);arrivalOwners=nativeOwners(236,99);assert.ok(arrivalOwners.length);assert.equal(d.diagnostics().fatal,null);await shot('sewer-arrival');
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(keys,n)=>step(n,keys),wait:n=>step(n),tap:(keys=256,gap=90)=>{step(3,keys);step(gap);},shot};
 entrance=await traverseSewerEntrance(io);console.log('Original entrance Imp encounter and native ladder passed');diary=await traverseSewerDiary(io);lower=await traverseSewer(io,true);console.log('All four original lower-sewer sound traps passed');upper=await traverseUpperSewer(io);console.log('Original upper sewer, mixed Imp/Pod battle, treasure, bridge and world exit passed');
 assert.deepEqual(dispatches,[0x675,0x6ca,0x978,0x722]);assert.equal(battles.length,8);assert.equal(upper.flags,31);assert.ok(results.some(r=>r.value>0&&r.value<32768));assert.equal(d.diagnostics().fatal,null);assert.deepEqual(s.cart.data,rom);
 // Native AD re-enters the same command while its wait expires. Preserve
 // every dispatch, and distinguish that from advancement to the next PC.
 for(const r of rises)r.programCommands=r.commands.filter((c,i)=>i===0||c.scriptPC!==r.commands[i-1].scriptPC);
 await writeFile(out+'/rise-route-debug.json',JSON.stringify({rises,heapByScene,battles,results,upper},null,2)+'\n');
 assert.ok(rises.length>=16,'Every encountered Drain Imp retains native direct emergence');for(const r of rises){assert.deepEqual(r.programCommands.map(c=>[c.opcode,c.value]),[[0xac,9],[0xad,1],[0xac,10],[0xad,1],[0xac,11],[0xad,2]]);assert.ok(r.endVideoFrame>r.beginVideoFrame);for(const f of[9,10,11]){assert.ok(r.samples.some(a=>a.nativeFrame===f),'Native requested emergence phase '+f);assert.ok(r.samples.some(a=>a.uploadedFrame===f),'Exact native uploaded emergence phase '+f);}}
 restore(s,bedroom);activeRises.clear();d.jump({id:160,x:16,y:14,party:[0,1,2],endgame:true});step(400);assert.equal(u16(s.ram,0x100),160);riverInitialization=nativeOwners(160,101);assert.equal(riverInitialization.length,3);assert.equal(d.diagnostics().fatal,null);await shot('river-scene160-initialization');assert.deepEqual(s.cart.data,rom);
}finally{d.dispose();h.dispose();}
const riseSummary=rises.map(r=>({...r,displayedFrames:[...new Set(r.samples.map(s=>s.uploadedFrame).filter(f=>f!==null))],phaseDisplayTicks:[9,10,11].map(f=>({frame:f,videoTicks:r.samples.filter(s=>s.uploadedFrame===f).length})),samples:r.samples}));await writeFile(out+'/rise-traces.json',JSON.stringify(riseSummary,null,2)+'\n');
for(let i=0;i<riseCaptures.length;i++)await writeFile(out+'/rise/frame-'+String(i).padStart(3,'0')+'.png',riseCaptures[i]);assert.ok(riseCaptures.length);execFileSync('ffmpeg',['-v','error','-y','-framerate','60','-i',out+'/rise/frame-%03d.png','-plays','0','-f','apng',out+'/native-emergence.apng']);const motion=await readFile(out+'/native-emergence.apng');
const proof={status:'passed',baselineSha256:candidate.baselineSha256,candidateSha256:candidate.candidateSha256,core:'repository SNES JS native 65816/PPU',scope:'Original sewer entrance → noisy lower route → upper sewer → world498, after the existing chapter entry fixture. Eight native battles, original AI/events/formations and controller input only. Separate River Imp scene160 native initialization.',arrivalOwners,entrance,diary,lower,upper,battles,nativeDamageResults:results.length,positiveDamageResults:results.filter(r=>r.value>0&&r.value<32768).length,maxObservedFieldHeapBytes:heapByScene,originalUpperBattleDispatches:dispatches,originalDirectEmergence:{sequences:rises.length,commands:[[0xac,9],[0xad,1],[0xac,10],[0xad,1],[0xac,11],[0xad,2]],nativeFrames:[9,10,11],allThreePhasesExactlyUploaded:true,nativePauseReentryDispatchesRetained:true,trace:'rise-traces.json',traceSha256:hash(await readFile(out+'/rise-traces.json')),firstSequenceCommandFrames:rises[0].programCommands.map(c=>({opcode:c.opcode,value:c.value,videoFrame:c.videoFrame})),firstSequenceDisplayTicks:riseSummary[0].phaseDisplayTicks,motion:{file:'native-emergence.apng',sha256:hash(motion),videoTicks:riseCaptures.length,framesPerSecond:60}},riverInitialization,messages,loads,screenshots,evidence:out,runner:{file:dir+'/verify-sewer-scene.mjs',sha256:hash(await readFile(dir+'/verify-sewer-scene.mjs'))},limitations:['The original River Imp actors initialize hidden at scene160 coordinates255,255; initialization proves ownership/palette/heap, not River Imp encounter choreography or victory.','Source/display exactness is fully checked in isolated native poses; overlapping map/party layers in real encounters retain original priority.','No independent-core execution in this inactive packet; root owns current production placement and broader campaign checks.']};
await writeFile(dir+'/native-scene-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({heapByScene,battles:battles.length,damage:results.length,rises:rises.length,riseVideoTicks:riseCaptures.length,riverOwners:riverInitialization.length}));
