import{worldLabels}from'../content/world-labels.js';
import{u16,put16}from'./rom.js';
import{dialogueLength,encodeDialogue}from'./text.js';

// Short replacements retain their native pointers. Longer Ohio names use the
// verified empty tail before the entrance pointer table, still within bank 06.
const FREE_START=0x6f360,FREE_END=0x6f400;
export function patchWorldLabels(base,add){
 const pointers=Array.from({length:112},(_,i)=>0x60000+u16(base,0x6f400+i*2)),audit=[];
 if(base.subarray(FREE_START,FREE_END).some(v=>v!==0))throw Error('World label relocation space is not empty');
 let next=FREE_START,relocatedPointers=0;
 for(const{id,name,offset,source}of worldLabels){
  const expected=Uint8Array.from(source.match(/../g),h=>parseInt(h,16)),length=expected.length;
  if(pointers[id]!==offset||!expected.every((v,i)=>base[offset+i]===v)||dialogueLength(base,offset)!==length)throw Error('World label source signature: '+id);
  if(pointers.some((p,i)=>i!==id&&p>=offset&&p<offset+length))throw Error('World label has a live alias: '+id);
  const bytes=encodeDialogue(name+'{null}',base);let destination=offset;
  if(bytes.length>length){
   if(next+bytes.length>FREE_END)throw Error('World label relocation space exhausted: '+id);
   destination=next;next+=bytes.length;relocatedPointers++;
   const pointer=new Uint8Array(2);put16(pointer,0,destination-0x60000);add(0x6f400+id*2,pointer,'world entrance pointer '+name);
  }
  add(destination,bytes,'world entrance label '+name);audit.push({id,name,offset:destination,sourceOffset:offset,bytes:bytes.length,capacity:length,relocated:destination!==offset});
 }
 return{labels:audit,relocatedPointers,allocatedBytes:next-FREE_START,extraVramBytes:0,extraWramBytes:0};
}
