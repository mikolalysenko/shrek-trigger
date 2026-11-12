import {u16,put16} from './rom.js';
import {eggChallenge} from '../content/resurrection.js';
import {supportingCast} from '../content/supporting-cast.js';

// Append a replacement function, then share byte-identical existing helpers
// to stay inside the cartridge's 0x1700-byte decompressed event buffer.
// The original Time Egg award is reached only after all 24 native bite calls.
// Its item, save flags, music, party reactions and return sequence stay intact.
export function resurrectionEvent(event,location){
  if(location!==eggChallenge.location)return event;
  const host=supportingCast.find(a=>a.key==='steve'),guru=supportingCast.find(a=>a.key==='steve-guru');
  if(!host||!guru||host.frames<10||!host.colors.every((c,i)=>c===guru.colors[i]))
    throw Error('Steve and his guru double must share their native scene palette');
  const awardStart=0x76e,awardEnd=0x812,steve=eggChallenge.object;
  const awardPointer=1+5*2,bitePointer=1+steve*32+9*2;
  if(event[0]!==37||event.length!==5882||u16(event,awardPointer)!==awardStart||u16(event,bitePointer)!==0x131d||
    ![0x56,0,0xed,1].every((v,i)=>event[awardStart+1+i]===v)||
    ![0xca,217].every((v,i)=>event[0x7f7+i]===v)||event[awardEnd]!==0||
    event[0x117f]!==0x33||event[0x1180]!==3)
    throw Error('Last Inn resurrection function signature changed');
  const body=[];
  // Give Steve room to perform. Use the source handoff's wide party staging
  // so the party does not cover his hands and the egg at the talk trigger.
  body.push(0xd9,29,24,27,24,31,24);
  // Native choice rows2/3, matching C3's first/last-row operand0B.
  // Declining restores field control without changing the original quest flags.
  body.push(0xc3,eggChallenge.choice,0x0b,0x1a,3,7,
    0xc2,eggChallenge.decline,0xda,0x77,6,0x00,
    0xc2,eggChallenge.accept);
  for(let n=1;n<=eggChallenge.eggs;n++){
    body.push(0x04,steve*2,0x09); // Blocking call: one visible egg, one chew.
    if(n%6===0)body.push(0xc2,eggChallenge.milestones[n/6-1]);
  }
  body.push(...event.subarray(awardStart+1,awardEnd+1));
  const bite=[0xac,eggChallenge.frames.bite,0xad,5,
    0xac,eggChallenge.frames.chew,0xad,5,0xac,1,0x00];
  const out=new Uint8Array(event.length+body.length+bite.length);
  out.set(event);out.set(body,event.length);out.set(bite,event.length+body.length);
  // The source Gaspar reused Robo's colors in slot3. Steve has a private
  // palette and shares slot7 with his displaced-guru double (NPC188), whose
  // generated palette is identical. All seven party slots remain available.
  out[0x1180]=7;
  put16(out,awardPointer,event.length-1);
  put16(out,bitePointer,event.length+body.length-1);
  const compacted=compactInnFunctions(out);
  if(compacted.length>0x1700)throw Error('Resurrection event exceeds native event buffer');
  return compacted;
}

// Only the commands present in this signature-checked Last Inn program are
// accepted. It contains no variable-length commands or inline data packets.
const commandLengths=new Map([
  [1,[0x00,0x0f,0x17,0x1b,0x1d,0x57,0x5c,0x62,0x68,0x6a,0x6c,0x6d,0x90,0x91,0xae,0xb0,0xb1,0xb2,0xb3,0xb4,0xda,0xed,0xee,0xf2,0xf8]],
  [2,[0x0d,0x0e,0x10,0x11,0x1e,0x31,0x33,0x5a,0x75,0x77,0x7c,0x7d,0x81,0x82,0x84,0x87,0x89,0x8e,0x94,0xa9,0xaa,0xab,0xac,0xad,0xb5,0xbb,0xc1,0xc2,0xc8,0xca,0xe3,0xe8,0xea,0xf0,0xff]],
  [3,[0x02,0x03,0x04,0x05,0x06,0x07,0x18,0x1a,0x24,0x4f,0x51,0x5f,0x65,0x66,0x67,0x8b,0x8c,0x96,0x97,0xa1,0xb7,0xc3,0xd2,0xeb]],
  [4,[0x22,0x56,0x7a,0xb8,0xec]],
  [5,[0x12,0x16,0x48,0x4a,0x4c,0x8d,0xdd,0xe0]],
  [6,[0x4b]],[7,[0xd9]],[8,[0xe4,0xe5]]
].flatMap(([length,ops])=>ops.map(op=>[op,length])));
const branchOpcodes=new Set([0x10,0x11,0x12,0x16,0x18,0x1a,0x31,0xd2]);

export function innCommands(event){
  const commands=[];
  for(let pc=event[0]*32;pc<event.length-1;){
    const op=event[pc+1],length=commandLengths.get(op);
    if(!length||pc+length>event.length-1)throw Error('Unsupported Last Inn command at '+pc.toString(16));
    const target=branchOpcodes.has(op)?pc+length-1+event[pc+length]*(op===0x11?-1:1):undefined;
    commands.push({pc,op,length,target});pc+=length;
  }
  const starts=new Set(commands.map(c=>c.pc));
  for(const c of commands)if(c.target!==undefined&&!starts.has(c.target))throw Error('Last Inn branch is not an instruction boundary');
  return commands;
}

function compactInnFunctions(event){
  const commands=innCommands(event),byEnd=new Map(commands.map(c=>[c.pc+c.length,c])),branches=commands.filter(c=>c.target!==undefined);
  const entries=Array.from({length:event[0]*16},(_,i)=>u16(event,1+i*2));
  const starts=[...new Set(entries)].sort((a,b)=>a-b),seen=new Map(),chunks=[];
  for(let i=0;i<starts.length;i++){
    const start=starts[i],end=starts[i+1]??event.length-1,bytes=event.subarray(start+1,end+1),key=Array.from(bytes).join(',');
    // No fallthrough may enter a removed helper. No relative jump may enter,
    // leave or cross it. Calls use the object function table, which we update.
    const canShare=byEnd.get(start)?.op===0&&byEnd.get(end)?.op===0&&!branches.some(c=>
      (c.pc<start&&c.target>=start)||(c.target<start&&c.pc>=start&&c.pc<end)||
      (c.pc>=end&&c.target<end)||(c.pc>=start&&c.pc<end&&c.target>=end));
    const alias=canShare?seen.get(key):undefined;
    const chunk={start,end,bytes,alias};chunks.push(chunk);
    if(alias===undefined)seen.set(key,chunk);
  }
  const packed=Array.from(event.subarray(0,1+event[0]*32)),mapped=new Map();
  for(const c of chunks){
    if(c.alias){mapped.set(c.start,mapped.get(c.alias.start));continue;}
    mapped.set(c.start,packed.length-1);packed.push(...c.bytes);
  }
  const out=Uint8Array.from(packed);
  entries.forEach((old,i)=>put16(out,1+i*2,mapped.get(old)));
  innCommands(out); // Reject any shifted branch whose destination was damaged.
  return out;
}
