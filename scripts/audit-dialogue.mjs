import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom,screenshot} from '../tests/helpers.mjs';
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

const args=process.argv.slice(2),value=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const limit=Number(value('--limit',Infinity)),locationFilter=value('--locations',null),out=value('--out',null),sourcesOnly=args.includes('--sources-only'),inventoryOnly=args.includes('--inventory-only');
const requested=locationFilter?new Set(locationFilter.split(',').map(Number)):null;
const built=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json')),specs=JSON.parse(await readFile('content/hooks.json')),decisionManifest=JSON.parse(await readFile('content/dialogue-decisions.json'));
const books=new Map(Object.entries(dialogue).map(([location,strings])=>[Number(location),{...strings}]));
for(const[location,strings]of Object.entries(additionalDialogue))Object.assign(books.get(Number(location)),strings);
// Complete inventory: 5,003 source-owned strings, 222 source decisions and
// 461 options, plus the Walmart greeter's 5 kitchen strings and Mr. Worldwide's
// 10 storeroom strings, each with a two-option choice.
const expectedTotals={strings:5018,decisions:224,options:465};
const sha=createHash('sha256').update(built.rom).digest('hex'),directory=out??`.local/qa/dialogue-full-${sha.slice(0,12)}`;
await mkdir(directory,{recursive:true});
const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h);
let pending=null;
h.on('event.dispatch',({scriptPC})=>{if(pending){s.ram.set(pending,0x12001+scriptPC);pending=null;}});
const pixels=new Uint8Array(512*480*4),mask=new Uint8Array(512*480/8);
const report={sha256:sha,strings:0,pages:0,decisions:0,options:0,replies:0,failures:[],locations:[],skipped:[],complete:false};
const shaBytes=bytes=>createHash('sha256').update(bytes).digest('hex');
const pointer=()=>u24(s.ram,0x231);
function tableFor(location){
  const eventId=u16(built.base,0x360000+location*14+8),event=decompress(built.rom,cartridgeOffset(u24(built.rom,0x3cf9f0+eventId*3),built.rom)).bytes,layout=layouts.find(l=>l.location===location);
  if(layout){const command=nativeEventOffset(location,layout.tableCommands[0]);return u24(event,command+1);}
  for(let p=0;p+3<event.length;p++)if(event[p]===0xb8)return u24(event,p+1);
  throw Error(`No native text table for location ${location}`);
}
function stringAddress(table,id){return(table&0xff0000)|u16(built.rom,cartridgeOffset(table,built.rom)+id*2);}
const sourceById=new Map(sourceDialogueEvents.map(entry=>[entry[0],entry])),sourceInfo=new Map(sourceDialogueStrings.map(entry=>[entry[0],entry])),sourceAddresses=new Set(sourceInfo.keys()),coveredAddresses=new Set(layouts.flatMap(l=>l.strings.map(s=>s.address)));
function patchedEvent(location){const eventId=u16(built.base,0x360000+location*14+8);return decompress(built.rom,cartridgeOffset(u24(built.rom,0x3cf9f0+eventId*3),built.rom)).bytes;}
function nativeTableAt(location,tableOffset){
  const event=patchedEvent(location),layout=layouts.find(l=>l.location===location);
  if(layout){
    const original=decompress(built.base,layout.eventPointer).bytes,index=layout.tableCommands.findIndex(p=>fileOffset(u24(original,p+1))===tableOffset);
    if(index>=0){const command=nativeEventOffset(location,layout.tableCommands[index]);return u24(event,command+1);}
  }
  for(let p=0;p+3<event.length;p++)if(event[p]===0xb8&&cartridgeOffset(u24(event,p+1),built.rom)===tableOffset)return u24(event,p+1);
  throw Error(`No native table ${tableOffset.toString(16)} for location ${location}`);
}
function bookTable(location,id){
  const source=sourceById.get(u16(built.base,0x360000+location*14+8)),layout=layouts.find(l=>l.location===location),string=layout?.strings.find(s=>s.id===id),text=books.get(location)?.[id];
  if(string&&text!==undefined){
    const event=patchedEvent(location),expected=encodeDialogue(text,built.base),commands=[...layout.tableCommands];
    for(let p=0;p<event.length;p++)if(event[p]===0xb8)commands.push(p);
    for(const command of commands){
      const table=u24(event,command+1),address=stringAddress(table,id),offset=cartridgeOffset(address,built.rom);
      if(built.rom.slice(offset,offset+expected.length).every((v,i)=>v===expected[i]))return table;
    }
  }
  if(string)for(const[,tableOffset]of source[2])if((tableOffset&0x3f0000)+u16(built.base,tableOffset+id*2)===string.address)return nativeTableAt(location,tableOffset);
  return tableFor(location);
}
function stockInventory(){
  const records=[],seen=new Set();
  for(let location=1;location<512;location++){
    const eventId=u16(built.base,0x360000+location*14+8),source=sourceById.get(eventId);if(!source||!source[2].length)continue;
    for(const[,tableOffset]of source[2]){
      const table=nativeTableAt(location,tableOffset);
      for(let id=0;id<256;id++){
        const original=(tableOffset&0x3f0000)+u16(built.base,tableOffset+id*2);
        if(!sourceAddresses.has(original)||!sourceInfo.get(original)[2].includes(eventId)||coveredAddresses.has(original)||seen.has(original))continue;
        seen.add(original);records.push({location,id,table,address:stringAddress(table,id),opcode:0xc0,mask:0,stock:true});
      }
    }
  }
  return{records};
}
function decisionEntry(manifest){
  const location=manifest.location,eventId=u16(built.base,0x360000+location*14+8),source=sourceById.get(eventId);
  const added=additionalDialogue[location]?.[manifest.id];
  if(added){
    const table=tableFor(location);return{...manifest,table,choice:finalChoice(added),stock:false};
  }
  for(const[,tableOffset]of source[2]){
    const original=(tableOffset&0x3f0000)+u16(built.base,tableOffset+manifest.id*2),layoutString=layouts.find(l=>l.location===location)?.strings.find(s=>s.id===manifest.id);
    if(layoutString&&original!==layoutString.address)continue;
    if(!sourceAddresses.has(original)||!sourceInfo.get(original)[2].includes(eventId))continue;
    const text=books.get(location)?.[manifest.id],table=text?bookTable(location,manifest.id):nativeTableAt(location,tableOffset);
    return{...manifest,table,choice:text?finalChoice(text):{first:manifest.first,last:manifest.last,count:manifest.count},stock:!text};
  }
  throw Error(`Decision ${location}:${manifest.id} has no native string table`);
}
function finalChoice(text){
  const page=text.replace('{null}','').split(/\{(?:page|full|page3)\}/).at(-1).split('\n'),indices=page.flatMap((row,i)=>/^ {3,7}(?:\S|$)/.test(row)?[i]:[]);
  return{first:indices[0],last:indices.at(-1),count:indices.length};
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
  return{bright,sha256:shaBytes(mask)};
}
async function fail(location,id,error){
  const entry={location,id,error:String(error?.message??error)};report.failures.push(entry);
  await screenshot(s,`${directory}/failure-${location}-${id}-${report.failures.length}.png`);console.error('FAIL',entry);
}
async function until(target,{close=false,final=false,opcode=0xc0}={}){
  let started=false,lastCapture=null;
  for(let n=0;n<1200;n++){
    if(pointer()===target){const capture=glyph(opcode);if(capture.bright<3)throw Error('no visible glyph pixels');return capture;}
    if(s.ram[0x126]){
      started=true;if(n%30===0)lastCapture=glyph(opcode);
    }else if(close&&started&&!pending){
      if(final&&lastCapture)return lastCapture;
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
async function renderSource(base,entry,{option=null}={}){
  restore(s,base);s.ram.set([7,0x39,0x30,0xd6,1,2,3,4,5,6,7,8,9,10,11,12],0x200);
  const command=entry.opcode===0xbb?[0xb8,entry.table&255,entry.table>>8&255,entry.table>>16&255,0xbb,entry.id,0xb2]:[0xb8,entry.table&255,entry.table>>8&255,entry.table>>16&255,entry.opcode,entry.id,entry.mask,0xb2];
  s.ram.set(command,0x1238e);
  const stops=entry.text?stopsFor(entry.text,entry.address):stopsForBytes(built.rom.subarray(cartridgeOffset(entry.address,built.rom)),entry.address),captures=[];
  for(const stop of stops){
    const capture=await until(stop.pointer,{close:true,final:stop.kind==='final',opcode:entry.opcode});captures.push({...stop,...capture});
    if(stop.kind==='final')break;
    if(stop.kind==='manual')runFrames(s,3,256);
  }
  if(entry.choice){
    for(let n=0;n<1200&&s.ram[0x162]!==2;n++)runFrames(s,1);
    if(s.ram[0x162]!==2||s.ram[0x164]!==entry.choice.first||s.ram[0x165]!==entry.choice.last)throw Error(`choice bounds ${s.ram[0x164]}..${s.ram[0x165]}, expected ${entry.choice.first}..${entry.choice.last}`);
    if(option!==null){
      const target=entry.choice.first+option;
      for(let n=0;n<20&&s.ram[0x163]!==target;n++){
        const current=s.ram[0x163],button=current===128||current>target?16:32;runFrames(s,3,button);runFrames(s,1);
      }
      if(s.ram[0x163]!==target)throw Error(`cannot select row ${target}; native ${s.ram[0x163]}`);
      const optionCapture=glyph(entry.opcode,true);captures.push({option,...optionCapture});
      runFrames(s,3,256);await closeMessage();
      if(s.ram[0x166]!==target)throw Error(`confirmed row ${s.ram[0x166]}, expected ${target}`);
    }
  }else{
    runFrames(s,3,256);await closeMessage();
  }
  if(s.cpu.stopped)throw Error('native CPU halted');
  return captures;
}
async function renderReply(base,entry,reply){
  restore(s,base);s.ram.set([0xb8,entry.table&255,entry.table>>8&255,entry.table>>16&255,0xc0,entry.id,0,0xb2],0x1238e);
  const stops=stopsFor(books.get(entry.location)[entry.id],entry.address);
  for(const stop of stops){
    if(stop.kind==='final')break;
    await until(stop.pointer,{close:true,opcode:0xc0});
    if(stop.kind==='manual')runFrames(s,3,256);
  }
  await until(0xc00000|(reply.offset+1),{close:true});
  runFrames(s,3,256);
  const capture=await until(0xc00000|(reply.offset+reply.bytes),{close:true,final:true});
  runFrames(s,3,256);await closeMessage();return capture;
}
function stage(party){
  dev.jump({id:2,x:8,y:8,party});runFrames(s,400);s.ram[0x1238e]=0xb2;runFrames(s,8);return snapshot(s);
}
try{
  const noShrek=stage([1,2,3]),withShrek=stage([0,1,2]),stock=stockInventory(),decisions=decisionManifest.map(decisionEntry);
  if(inventoryOnly){
    report.strings=[...books.values()].reduce((n,strings)=>n+Object.keys(strings).length,0)+stock.records.length;
    report.decisions=decisions.length;report.options=decisions.reduce((n,d)=>n+d.choice.count,0);report.expected={...expectedTotals,replies:373};
    report.decisionInventory=decisions.map(({location,pc,opcode,id,mask,choice})=>({location,pc,opcode,id,mask,choice}));
  }else{
  for(const[location,strings]of books){
    if(requested&&!requested.has(location))continue;
    const locationResult={location,strings:0,decisions:0,options:0};
    for(const[id,text]of Object.entries(strings)){
      if(report.strings>=limit)continue;
      const table=bookTable(location,Number(id)),address=stringAddress(table,Number(id)),entry={location,id:Number(id),text,table,address,opcode:0xc0,mask:0};
      report.strings++;locationResult.strings++;
      if(!decisions.some(d=>d.location===location&&d.id===Number(id)))try{
        const captures=await renderSource(noShrek,entry);report.pages+=captures.length;
      }catch(error){await fail(location,Number(id),error);}
    }
    report.locations.push(locationResult);
  }
  for(const entry of stock.records){
    if(requested&&!requested.has(entry.location))continue;
    if(report.strings>=limit)continue;
    report.strings++;
    try{const captures=await renderSource(noShrek,entry);report.pages+=captures.length;}catch(error){await fail(entry.location,entry.id,error);}
  }
  const selectedDecisions=decisions.filter(d=>!requested||requested.has(d.location));
  for(const decision of selectedDecisions){
    report.decisions++;const entry={...decision,text:books.get(decision.location)?.[decision.id],address:stringAddress(decision.table,decision.id)};
    for(let option=0;option<decision.choice.count;option++)try{
      await renderSource(noShrek,entry,{option});report.options++;
    }catch(error){await fail(decision.location,decision.id,error);}
  }
  if(!sourcesOnly)for(const reply of built.audit.shrekDialogue.replies){
    if(requested&&!requested.has(reply.location))continue;
    const table=bookTable(reply.location,reply.id),entry={location:reply.location,id:reply.id,table,address:stringAddress(table,reply.id)};
    try{await renderReply(withShrek,entry,reply);report.replies++;}catch(error){await fail(reply.location,reply.id,error);}
  }
  report.expected={...expectedTotals,replies:sourcesOnly?0:373};
  if(!locationFilter&&limit===Infinity){
    if(report.strings!==expectedTotals.strings)report.failures.push({error:`expected ${expectedTotals.strings} strings, got ${report.strings}`});
    if(report.decisions!==expectedTotals.decisions)report.failures.push({error:`expected ${expectedTotals.decisions} decisions, got ${report.decisions}`});
    if(report.options!==expectedTotals.options)report.failures.push({error:`expected ${expectedTotals.options} option selections, got ${report.options}`});
    if(!sourcesOnly&&report.replies!==373)report.failures.push({error:`expected 373 replies, got ${report.replies}`});
  }
  }
  report.complete=report.failures.length===0;
}finally{
  dev.dispose();h.dispose();await writeFile(`${directory}/report.json`,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({directory,sha256:report.sha256,strings:report.strings,decisions:report.decisions,options:report.options,replies:report.replies,failures:report.failures.length,complete:report.complete},null,2));
if(report.failures.length)process.exitCode=1;
