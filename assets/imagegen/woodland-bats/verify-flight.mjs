// Compare unmodified event-driven flying routes on the pinned published and
// private art ROMs. Only reversible location entry precedes read-only tracing.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createCore} from '../../../scripts/core.mjs';
import {restore,snapshot} from '../../../engine/save.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {runFrames,newGame} from '../../../engine/automation.js';
import {u16} from '../../../engine/rom.js';
const dir='assets/imagegen/woodland-bats',out='.local/qa/woodland-bats-native-proof',json=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),audit=await json(dir+'/native-audit.json'),candidate=await json(out+'/candidate.json'),bedroom=await json(out+'/bedroom.json'),specs=await json('content/hooks.json'),traces=[];
for(const [key,file,expected] of [['baseline',audit.baseline.path,audit.baseline.sha256],['candidate',out+'/candidate.sfc',candidate.candidateSha256]]){
 const rom=new Uint8Array(await readFile(file));assert.equal(sha(rom),expected);const s=await createCore(rom);if(key==='candidate')restore(s,bedroom);else{try{restore(s,await json(out+'/baseline-bedroom.json'));}catch{await newGame(s);await writeFile(out+'/baseline-bedroom.json',JSON.stringify(snapshot(s)));}}const h=installHooks(s,specs);let before;h.on('event.dispatch',()=>{if(!before)before=s.ram.slice();});const d=createDevTools(s,h),loads=[];
 h.on('event.init',e=>{if(e.location===164&&e.opcode===0x83&&s.ram[0x12002+e.scriptPC]===81)loads.push({object:e.object,bodyOffset:e.scriptPC});});
 d.jump({id:164,x:16,y:13,party:[0,1,2],endgame:true});runFrames(s,450);assert.equal(u16(s.ram,0x100),164);assert.equal(s.ram[0x117]&1,0);assert.ok(loads.some(l=>l.object===12)&&loads.some(l=>l.object===13));const firstVideoFrame=s.frames,ticks=[];
 for(let tick=0;tick<900;tick++){
  assert.equal(s.ram[0x117]&1,0);assert.equal(d.diagnostics().fatal,null);ticks.push({tick,actors:[12,13].map(object=>{const x=object*2;return{object,worldX16:u16(s.ram,0x1800+x),worldY16:u16(s.ram,0x1880+x),frame:s.ram[0xf01+x],timer:s.ram[0x1601+x],animation:s.ram[0x1680+x],phase:s.ram[0x1681+x],mode:s.ram[0x1780+x]};})});runFrames(s,1);
 }
 assert.deepEqual(s.cart.data,rom);d.undo();assert.deepEqual(s.ram,before);d.dispose();h.dispose();const trace={key,romSha256:expected,firstVideoFrame,loads,ticks,controllerInputAfterEntry:0,cartridgeUnchanged:true,exactUndo:true},path=out+'/flight-'+key+'.json',bytes=JSON.stringify(trace)+'\n';await writeFile(path,bytes);traces.push({...trace,path,sha256:sha(bytes)});
}
const results=[];
for(const object of [12,13]){
 const a=traces[0].ticks.map(t=>t.actors.find(p=>p.object===object)),b=traces[1].ticks.map(t=>t.actors.find(p=>p.object===object));
 const equal=(p,q)=>JSON.stringify(p)===JSON.stringify(q);let alignment=null;
 for(let shift=-60;shift<=60;shift++){
  const ai=Math.max(shift,0),bi=Math.max(-shift,0),length=Math.min(a.length-ai,b.length-bi);
  if(length>=840&&Array.from({length},(_,i)=>equal(a[ai+i],b[bi+i])).every(Boolean)){alignment={baselineStartTick:ai,candidateStartTick:bi,comparedTicks:length,phaseOffsetVideoFrames:shift};break;}
 }
 assert.ok(alignment,'Exact original flying path/request/timer trace within a bounded startup phase shift, actor'+object);
 results.push({object,enemy:81,fullSize:192,...alignment,framesObserved:[...new Set(b.map(p=>p.frame))].sort(),worldPositionCount:new Set(b.map(p=>p.worldX16+','+p.worldY16)).size});
}
const proof={status:'passed',activation:false,baselineSha256:audit.baseline.sha256,candidateSha256:candidate.candidateSha256,core:'repository native65816/PPU',location:164,entry:{x:16,y:13,party:[0,1,2],endgame:true,story:3,settlingVideoFrames:450},scope:'Two original event-driven Vamp patrols, no controller input after entry. Compare world XY at1/16px and original frame request/timer/phase/mode on original-art baseline and private generated candidate.',results,traces:traces.map(t=>({file:t.path,sha256:t.sha256,firstVideoFrame:t.firstVideoFrame,ticks:t.ticks.length,cartridgeUnchanged:t.cartridgeUnchanged,exactUndo:t.exactUndo})),limits:['Route and native request comparison only. Exact displayed cells/palettes are in separate all-pose and actual-scene proofs.','Any startup phase shift is explicit; this does not assert universal field/battle latency.','Slot7 has no observed consumer in these original flying routes.']};await writeFile(dir+'/native-flight-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(results));
