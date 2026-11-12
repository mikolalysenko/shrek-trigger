import {sourceDialogueEvents,sourceDialogueStrings} from '../content/dialogue-ownership.js';
import {u16,u24,fileOffset} from './rom.js';
import {decompress} from './compression.js';
import {dialogueLength} from './text.js';

// Reclaim only identified, terminated field-dialogue bytes after every event
// which can reference them has received a fresh table. Shared UI/dictionary
// banks, old pointer tables, unreferenced gaps and padding remain reserved.
export function replacedDialoguePools(rom,replacedEvents){
  const rewritten=new Set(replacedEvents);
  for(const [id,pointer,tables]of sourceDialogueEvents){
    if(fileOffset(u24(rom,0x3cf9f0+id*3))!==pointer)throw Error('Dialogue ownership event pointer changed');
    if(!tables.length)continue;
    const event=decompress(rom,pointer).bytes;
    for(const[pos,table]of tables)if(event[pos]!==0xb8||fileOffset(u24(event,pos+1))!==table)throw Error('Dialogue ownership B8 signature changed');
  }
  const live=[],eligible=[],entries=[];
  // Keep all 256 possible indices of every original B8 table reserved, even
  // when the known scripts use a shorter prefix or the table is now unused.
  for(const table of new Set(sourceDialogueEvents.flatMap(([, ,tables])=>tables.map(([,t])=>t))))live.push({offset:table,length:512});
  for(const [offset,length,owners,pointers]of sourceDialogueStrings){
    if(dialogueLength(rom,offset)!==length)throw Error('Dialogue ownership extent changed');
    for(const p of pointers)if((p&0x3f0000)+u16(rom,p)!==offset)throw Error('Dialogue ownership string pointer changed');
    const entry={offset,length,owners};
    entries.push(entry);
    if(owners.every(id=>rewritten.has(id))&&[0x37,0x38,0x39,0x3c].includes(offset>>16))eligible.push(entry);
    else live.push(entry);
  }
  if(!eligible.length)return [];
  const starts=new Set(entries.map(s=>s.offset)),direct=new Set();
  for(let p=0;p+2<rom.length;p++){
    const pointer=u24(rom,p),bank=pointer>>>16,word=pointer&65535;
    if(bank===0x7e||bank===0x7f||((bank<0x40||(bank>=0x80&&bank<0xc0))&&word<0x8000))continue;
    const offset=fileOffset(pointer);if(starts.has(offset))direct.add(offset);
  }
  // A complete pointer outside the compressed scripts may be a direct native
  // reference. Retain it even if it is just an accidental compressed match.
  live.push(...entries.filter(s=>direct.has(s.offset)));
  // Another table can point into a shared suffix. Keep the complete overlap
  // if any still-live string intersects a candidate, including a shared null.
  const candidates=eligible.filter(a=>!live.some(b=>a.offset<b.offset+b.length&&b.offset<a.offset+a.length));
  const out=[];
  for(const s of candidates.sort((a,b)=>a.offset-b.offset)){
    const previous=out.at(-1);
    if(previous&&s.offset<=previous.offset+previous.length&&(previous.offset>>16)===((s.offset+s.length-1)>>16)){
      previous.length=Math.max(previous.length,s.offset+s.length-previous.offset);previous.strings++;
      previous.owners=[...new Set([...previous.owners,...s.owners])].sort((a,b)=>a-b);
    }else out.push({...s,owners:[...s.owners],strings:1});
  }
  return out;
}
