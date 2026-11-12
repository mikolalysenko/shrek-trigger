import {u16,put16} from './rom.js';
import {encodeDialogue,dialogueLength} from './text.js';
import {techHelp} from '../content/tech-help.js';

const TABLE=0xc3a09,FIRST=1,LAST=116,MAX_CHARS=31;

// The help strings for techniques 1-116 sit back to back in bank C, each one
// sized for its Chrono Trigger sentence. Repack that whole block instead of
// fitting each Shrek line into its predecessor's slot: every technique gets
// its own string and pointer, and the block never grows past the next
// native string ("Can't run away").
export function techHelpRegion(base){
 const start=0xc0000+u16(base,TABLE+FIRST*2),end=0xc0000+u16(base,TABLE+(LAST+1)*2);
 let p=start;
 for(let id=FIRST;id<=LAST;id++){
  if(0xc0000+u16(base,TABLE+id*2)!==p)throw Error('Technique help block is no longer contiguous at '+id);
  p+=dialogueLength(base,p);
 }
 if(p!==end)throw Error('Technique help block end changed');
 for(let id=0;id<130;id++){
  if(id>=FIRST&&id<=LAST)continue;
  const other=0xc0000+u16(base,TABLE+id*2);
  if(other>=start&&other<end)throw Error('Technique help block is shared with entry '+id);
 }
 return{start,end};
}

// Runs after every technique module. Their own writes into the block (older
// per-technique help lines and the Charm/Heal pointer exchange) are replaced
// by the catalogue in content/tech-help.js.
export function repackTechHelp(base,records){
 const {start,end}=techHelpRegion(base),pointers=[TABLE+FIRST*2,TABLE+(LAST+1)*2];
 const inside=r=>r.offset>=start&&r.offset<end||r.offset>=pointers[0]&&r.offset<pointers[1];
 for(const r of records)if(inside(r)&&(r.offset+r.bytes.length>(r.offset>=start?end:pointers[1])))throw Error('Patch straddles the technique help block: '+r.label);
 const replaced=records.filter(inside).map(r=>r.label);
 for(let i=records.length-1;i>=0;i--)if(inside(records[i]))records.splice(i,1);
 // The block holds roughly a hundred Shrek lines. The rest go in the unused
 // 0xFF padding that follows the last native help string in the same bank.
 const spare=0xc0000+u16(base,TABLE+120*2)+dialogueLength(base,0xc0000+u16(base,TABLE+120*2));
 const text=new Uint8Array(end-start).fill(0),overflow=[],table=new Uint8Array(pointers[1]-pointers[0]),lines=[];
 let p=0;
 for(let id=FIRST;id<=LAST;id++){
  const line=techHelp[id];
  if(typeof line!=='string'||!line)throw Error('Technique '+id+' has no help line');
  if(line.length>MAX_CHARS)throw Error(`Technique ${id} help is ${line.length} characters: ${line}`);
  const bytes=encodeDialogue(line+'{null}',base);let address;
  if(p+bytes.length<=text.length){text.set(bytes,p);address=start+p;p+=bytes.length;}
  else{address=spare+overflow.length;overflow.push(...bytes);}
  put16(table,(id-FIRST)*2,address&0xffff);lines.push({id,address,text:line});
 }
 for(let i=0;i<overflow.length;i++)if(base[spare+i]!==0xff)throw Error('Technique help overflow is not free ROM');
 if(overflow.length)records.push({offset:spare,bytes:Uint8Array.from(overflow),label:'technique help overflow'});
 records.push({offset:start,bytes:text,label:'technique help block'},{offset:pointers[0],bytes:table,label:'technique help pointers'});
 return{lines,start,end,usedBytes:p,freeBytes:text.length-p,overflow:{address:spare,bytes:overflow.length},replaced,extraVramBytes:0,extraWramBytes:0};
}
