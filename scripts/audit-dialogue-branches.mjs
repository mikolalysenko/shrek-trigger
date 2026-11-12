import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom} from '../tests/helpers.mjs';
import {dialogue} from '../content/dialogue.js';
import {additionalDialogue,nativeEventOffset} from '../engine/event-additions.js';
import {sourceDialogueEvents,sourceDialogueStrings} from '../content/dialogue-ownership.js';
import {decompress} from '../engine/compression.js';
import {encodeDialogue} from '../engine/text.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {snapshot,restore} from '../engine/save.js';
import {runFrames} from '../engine/automation.js';
import {fileOffset,u16,u24} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';

// Exercise the real VM decision and comparison handlers, not a JavaScript
// interpretation of their results. Branch bodies are replaced only in a clean,
// temporary WRAM script by B2, so no unrelated scene command can run.
const SCRATCH_PC=0x38d,SCRATCH_RAM=0x12001+SCRATCH_PC;
const args=process.argv.slice(2),value=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const out=value('--out',null),locationFilter=value('--locations',null),requested=locationFilter?new Set(locationFilter.split(',').map(Number)):null;
const built=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json')),specs=JSON.parse(await readFile('content/hooks.json')),decisionManifest=JSON.parse(await readFile('content/dialogue-decisions.json'));
const books=new Map(Object.entries(dialogue).map(([location,strings])=>[Number(location),{...strings}]));
for(const[location,strings]of Object.entries(additionalDialogue))Object.assign(books.get(Number(location)),strings);
const sha=createHash('sha256').update(built.rom).digest('hex'),reportPath=out??`.local/qa/dialogue-branches-${sha.slice(0,12)}.json`;
await mkdir('.local/qa',{recursive:true});
const s=await bedroom(built.rom);
const h=installHooks(s,specs),dev=createDevTools(s,h);
let dispatch=[];
h.on('event.dispatch',e=>dispatch.push({...e,result:s.ram[0x10a80+e.object*2],confirmed:s.ram[0x166]}));
const pixels=new Uint8Array(512*480*4),mask=new Uint8Array(512*480/8);
const report={sha256:sha,decisions:0,options:0,glyphChecks:0,comparisonChecks:0,fallthroughs:0,skips:0,unusedResultOptions:0,failures:[],complete:false};
const sourceById=new Map(sourceDialogueEvents.map(entry=>[entry[0],entry])),sourceInfo=new Map(sourceDialogueStrings.map(entry=>[entry[0],entry])),sourceAddresses=new Set(sourceInfo.keys());
const eventCache=new Map();
function eventFor(location){
  if(!eventCache.has(location)){
    const eventId=u16(built.base,0x360000+location*14+8),event=decompress(built.rom,cartridgeOffset(u24(built.rom,0x3cf9f0+eventId*3),built.rom)).bytes;
    eventCache.set(location,{eventId,event});
  }
  return eventCache.get(location);
}
function tableFor(location){
  const {event}=eventFor(location),layout=layouts.find(l=>l.location===location);
  if(layout){const command=nativeEventOffset(location,layout.tableCommands[0]);return u24(event,command+1);}
  for(let p=0;p+3<event.length;p++)if(event[p]===0xb8)return u24(event,p+1);
  throw Error(`No native text table for location ${location}`);
}
function stringAddress(table,id){return(table&0xff0000)|u16(built.rom,cartridgeOffset(table,built.rom)+id*2);}
function nativeTableAt(location,tableOffset){
  const {event}=eventFor(location),layout=layouts.find(l=>l.location===location);
  if(layout){
    const original=decompress(built.base,layout.eventPointer).bytes,index=layout.tableCommands.findIndex(p=>fileOffset(u24(original,p+1))===tableOffset);
    if(index>=0){const command=nativeEventOffset(location,layout.tableCommands[index]);return u24(event,command+1);}
  }
  for(let p=0;p+3<event.length;p++)if(event[p]===0xb8&&cartridgeOffset(u24(event,p+1),built.rom)===tableOffset)return u24(event,p+1);
  throw Error(`No native table ${tableOffset.toString(16)} for location ${location}`);
}
function bookTable(location,id){
  const {eventId,event}=eventFor(location),source=sourceById.get(eventId),layout=layouts.find(l=>l.location===location),string=layout?.strings.find(s=>s.id===id),text=books.get(location)?.[id];
  if(string&&text!==undefined){
    const expected=encodeDialogue(text,built.base),commands=[...layout.tableCommands];
    for(let p=0;p<event.length;p++)if(event[p]===0xb8)commands.push(p);
    for(const command of commands){
      const table=u24(event,command+1),address=stringAddress(table,id),offset=cartridgeOffset(address,built.rom);
      if(built.rom.slice(offset,offset+expected.length).every((v,i)=>v===expected[i]))return table;
    }
  }
  if(string)for(const[,tableOffset]of source[2])if((tableOffset&0x3f0000)+u16(built.base,tableOffset+id*2)===string.address)return nativeTableAt(location,tableOffset);
  return tableFor(location);
}
function finalChoice(text){
  const page=text.replace('{null}','').split(/\{(?:page|full|page3)\}/).at(-1).split('\n'),indices=page.flatMap((row,i)=>/^ {3,7}(?:\S|$)/.test(row)?[i]:[]);
  return{first:indices[0],last:indices.at(-1),count:indices.length};
}
function decisionEntry(manifest){
  const location=manifest.location,{eventId}=eventFor(location),source=sourceById.get(eventId);
  const added=additionalDialogue[location]?.[manifest.id];
  if(added){
    const table=tableFor(location);return{...manifest,table,choice:finalChoice(added)};
  }
  for(const[,tableOffset]of source[2]){
    const original=(tableOffset&0x3f0000)+u16(built.base,tableOffset+manifest.id*2),layoutString=layouts.find(l=>l.location===location)?.strings.find(s=>s.id===manifest.id);
    if(layoutString&&original!==layoutString.address)continue;
    if(!sourceAddresses.has(original)||!sourceInfo.get(original)[2].includes(eventId))continue;
    const text=books.get(location)?.[manifest.id],table=text?bookTable(location,manifest.id):nativeTableAt(location,tableOffset);
    return{...manifest,table,choice:text?finalChoice(text):{first:manifest.first,last:manifest.last,count:manifest.count}};
  }
  throw Error(`Decision ${location}:${manifest.id} has no native string table`);
}
function stopsForBytes(bytes,address){
  const stops=[];
  for(let p=0;p<bytes.length;){
    const offset=p,code=bytes[p++];
    if(code===0){stops.push({offset:p,kind:'final'});break;}
    if([1,2,3,18].includes(code)){
      const operand=bytes[p++];
      if(code===3){stops.push({offset:p,kind:operand===0?'final':'timed'});if(operand===0)break;}
    }else if([10,11,12].includes(code))stops.push({offset:p,kind:'manual'});
    if(p<=offset)throw Error('Text parser did not advance');
  }
  return stops.map(stop=>({...stop,pointer:address+stop.offset}));
}
function stopsFor(text,address){return stopsForBytes(encodeDialogue(text,built.base),address);}
function glyph(opcode,cursor=false){
  s.setPixels(pixels);mask.fill(0);
  const bottom=opcode===0xc4,y0=bottom?288:44,y1=bottom?424:180,x0=cursor?70:8;
  let bright=0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<504;x++){
    const p=(y*512+x)*4;if(pixels[p]>150&&pixels[p+1]>150&&pixels[p+2]>150){const bit=y*512+x;mask[bit>>3]|=1<<(bit&7);bright++;}
  }
  return{bright,sha256:createHash('sha256').update(mask).digest('hex')};
}
const pointer=()=>u24(s.ram,0x231);
async function until(target,{close=false,final=false,opcode=0xc0}={}){
  let started=false,lastCapture=null;
  for(let n=0;n<1200;n++){
    if(pointer()===target){const capture=glyph(opcode);if(capture.bright<3)throw Error('no visible glyph pixels');report.glyphChecks++;return capture;}
    if(s.ram[0x126]){
      started=true;if(n%30===0)lastCapture=glyph(opcode);
    }else if(close&&started){
      if(final&&lastCapture){report.glyphChecks++;return lastCapture;}
      throw Error(`message closed at ${pointer().toString(16)} before expected ${target.toString(16)}`);
    }
    runFrames(s,1);
  }
  throw Error(`text pointer ${pointer().toString(16)} did not reach ${target.toString(16)}`);
}
async function closeMessage(){
  for(let n=0;n<1200&&s.ram[0x126];n++)runFrames(s,1);
  if(s.ram[0x126])throw Error('message did not close');
  if(!s.ram[0x11f])throw Error('native control did not return');
}
function routeFor(event,decision,target){
  const commandPC=decision.pc+1;
  if(event[commandPC]!==decision.opcode||event[commandPC+1]!==decision.id||event[commandPC+2]!==decision.mask)
    throw Error(`native command mismatch at ${commandPC}`);
  let pc=commandPC+3;const comparisons=[];
  while(event[pc]===0x1a){
    const value=event[pc+1],offset=event[pc+2],match=target===value,next=match?pc+3:pc+2+offset;
    if(next<0||next>=event.length)throw Error(`comparison at ${pc} targets ${next}, outside ${event.length} event bytes`);
    comparisons.push({pc,value,offset,match,next});pc=next;
  }
  return{commandPC,nextPC:pc,comparisons,kind:comparisons.length?(comparisons.at(-1).match?'fallthrough':'skip'):'unused-result'};
}
function installRoute(base,entry,route){
  restore(s,base);dispatch=[];
  s.ram.set([7,0x39,0x30,0xd6,1,2,3,4,5,6,7,8,9,10,11,12],0x200);
  const delta=SCRATCH_PC+4-route.commandPC,scratch=(pc)=>0x12001+pc+delta;
  if(scratch(route.nextPC)<SCRATCH_RAM+7||scratch(route.nextPC)>=0x13700)throw Error(`route destination ${route.nextPC} does not fit the temporary event buffer`);
  // B2 is also the safe filler. Only bytes proved to be the decision or a 1A
  // on this option's route overwrite it; all are copied from the native event.
  s.ram.fill(0xb2,SCRATCH_RAM,0x13700);
  s.ram.set([0xb8,entry.table&255,entry.table>>8&255,entry.table>>16&255],SCRATCH_RAM);
  const {event}=eventFor(entry.location);
  s.ram.set(event.subarray(route.commandPC,route.commandPC+3),scratch(route.commandPC));
  for(const comparison of route.comparisons)s.ram.set(event.subarray(comparison.pc,comparison.pc+3),scratch(comparison.pc));
  s.ram[scratch(route.nextPC)]=0xb2;
  return{delta,decisionPC:SCRATCH_PC+4,nextPC:route.nextPC+delta};
}
async function executeOption(base,entry,option){
  const target=entry.choice.first+option,{event}=eventFor(entry.location),route=routeFor(event,entry,target),native=installRoute(base,entry,route),address=stringAddress(entry.table,entry.id),text=books.get(entry.location)?.[entry.id];
  const stops=text?stopsFor(text,address):stopsForBytes(built.rom.subarray(cartridgeOffset(address,built.rom)),address);
  for(const stop of stops){
    await until(stop.pointer,{close:true,final:stop.kind==='final',opcode:entry.opcode});
    if(stop.kind==='final')break;
    if(stop.kind==='manual')runFrames(s,3,256);
  }
  for(let n=0;n<1200&&s.ram[0x162]!==2;n++)runFrames(s,1);
  if(s.ram[0x162]!==2||s.ram[0x164]!==entry.choice.first||s.ram[0x165]!==entry.choice.last)throw Error(`choice bounds ${s.ram[0x164]}..${s.ram[0x165]}, expected ${entry.choice.first}..${entry.choice.last}`);
  for(let n=0;n<20&&s.ram[0x163]!==target;n++){
    const current=s.ram[0x163],button=current===128||current>target?16:32;runFrames(s,3,button);runFrames(s,1);
  }
  if(s.ram[0x163]!==target)throw Error(`cannot select row ${target}; native ${s.ram[0x163]}`);
  const optionGlyph=glyph(entry.opcode,true);if(optionGlyph.bright<3)throw Error('no visible option/cursor glyph pixels');report.glyphChecks++;
  runFrames(s,3,256);await closeMessage();runFrames(s,2);
  const decisionDispatch=dispatch.find(e=>e.scriptPC===native.decisionPC&&e.opcode===entry.opcode);
  if(!decisionDispatch)throw Error(`actual decision did not dispatch at temporary PC ${native.decisionPC}`);
  const object=decisionDispatch.object,resultCell=0x10a80+object*2;
  if(s.ram[0x166]!==target)throw Error(`$0166 confirmed row ${s.ram[0x166]}, expected ${target}`);
  if(s.ram[resultCell]!==target)throw Error(`object ${object} result cell $${resultCell.toString(16)} is ${s.ram[resultCell]}, expected ${target}`);
  const after=dispatch.filter(e=>e.object===object&&e.scriptPC>=native.decisionPC&&e.scriptPC!==native.decisionPC),expectedComparisons=route.comparisons.map(c=>c.pc+native.delta);
  const actualComparisons=after.filter(e=>e.opcode===0x1a).map(e=>e.scriptPC);
  if(JSON.stringify(actualComparisons)!==JSON.stringify(expectedComparisons))throw Error(`1A path ${JSON.stringify(actualComparisons)}, expected ${JSON.stringify(expectedComparisons)}`);
  const stop=after.find(e=>e.opcode===0xb2);
  if(!stop||stop.scriptPC!==native.nextPC)throw Error(`next PC ${stop?stop.scriptPC:'none'}, expected ${native.nextPC} (original ${route.nextPC})`);
  const observation=after.find(e=>e.opcode===0x1a||e.opcode===0xb2);
  if(!observation||observation.result!==target)throw Error(`object ${object} result cell $${resultCell.toString(16)} at routing is ${observation?.result}, expected ${target}`);
  if(observation.confirmed!==target)throw Error(`$0166 at routing is ${observation.confirmed}, expected ${target}`);
  if(after.some(e=>e.opcode!==0x1a&&e.opcode!==0xb2))throw Error(`unrelated event command executed: ${JSON.stringify(after)}`);
  if(s.cpu.stopped)throw Error('native CPU halted');
  report.comparisonChecks+=route.comparisons.length;
  if(route.kind==='fallthrough')report.fallthroughs++;else if(route.kind==='skip')report.skips++;else report.unusedResultOptions++;
  return{target,kind:route.kind,originalNextPC:route.nextPC,comparisons:route.comparisons.length};
}
function stage(){
  dev.jump({id:2,x:8,y:8,party:[1,2,3]});runFrames(s,400);s.ram[SCRATCH_RAM]=0xb2;runFrames(s,8);return snapshot(s);
}
try{
  const base=stage(),decisions=decisionManifest.map(decisionEntry),selected=decisions.filter(d=>!requested||requested.has(d.location));
  for(const decision of selected){
    report.decisions++;
    for(let option=0;option<decision.choice.count;option++){
      const target=decision.choice.first+option;
      try{await executeOption(base,decision,option);report.options++;}
      catch(error){const failure={location:decision.location,pc:decision.pc,id:decision.id,target,error:String(error?.message??error)};report.failures.push(failure);console.error('FAIL',failure);}
    }
  }
  if(!requested){
    // 222 source decisions and 461 options, plus the greeter's and Mr. Worldwide's two-option choices.
    if(report.decisions!==224)report.failures.push({error:`expected 224 decisions, got ${report.decisions}`});
    if(report.options!==465)report.failures.push({error:`expected 465 option branches, got ${report.options}`});
    if(report.unusedResultOptions!==2)report.failures.push({error:`expected Location378's two unused-result options, got ${report.unusedResultOptions}`});
  }
  report.complete=report.failures.length===0;
}finally{
  dev.dispose();h.dispose();await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({reportPath,sha256:report.sha256,decisions:report.decisions,options:report.options,glyphChecks:report.glyphChecks,comparisonChecks:report.comparisonChecks,fallthroughs:report.fallthroughs,skips:report.skips,unusedResultOptions:report.unusedResultOptions,failures:report.failures.length,complete:report.complete},null,2));
if(report.failures.length)process.exitCode=1;
