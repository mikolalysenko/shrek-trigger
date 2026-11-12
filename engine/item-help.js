import {u16,put16} from './rom.js';
import {encodeDialogue,dialogueLength} from './text.js';
import {itemHelp} from '../content/item-help.js';

const TABLE=0xc2eb1,COUNT=242,MAX_CHARS=31;

// Item help strings sit back to back in bank C, sized for their Chrono
// Trigger sentences, and items without help share empty strings. Repack the
// whole block from content/item-help.js: identical lines share one string,
// and whatever does not fit goes in unused 0xFF padding in the same bank.
export function itemHelpRegion(base){
 const pointers=Array.from({length:COUNT},(_,id)=>0xc0000+u16(base,TABLE+id*2)),start=Math.min(...pointers),last=Math.max(...pointers),end=last+dialogueLength(base,last);
 // Every byte of the block must belong to an item help string.
 let p=start;while(p<end)p+=dialogueLength(base,p);
 if(p!==end)throw Error('Item help block is no longer contiguous');
 return{start,end};
}
const spare=[[0xc36f4,268],[0xcfc4f,945]];

export function repackItemHelp(base,records,reserved=[]){
 const {start,end}=itemHelpRegion(base),table=[TABLE,TABLE+COUNT*2];
 const inside=r=>r.offset>=start&&r.offset<end||r.offset>=table[0]&&r.offset<table[1];
 for(const r of records)if(inside(r)&&r.offset+r.bytes.length>(r.offset>=start?end:table[1]))throw Error('Patch straddles the item help block: '+r.label);
 const replaced=records.filter(inside).map(r=>r.label);
 for(let i=records.length-1;i>=0;i--)if(inside(records[i]))records.splice(i,1);
 const pools=[{address:start,length:end-start,used:0,bytes:new Uint8Array(end-start)}];
 for(const[address,length]of spare){
  for(let i=0;i<length;i++)if(base[address+i]!==0xff)throw Error('Item help overflow is not free ROM');
  if(reserved.some(([a,n])=>a<address+length&&a+n>address))throw Error('Item help overflow is already claimed');
  pools.push({address,length,used:0,bytes:new Uint8Array(length).fill(0xff)});
 }
 const place=bytes=>{for(const pool of pools)if(pool.used+bytes.length<=pool.length){pool.bytes.set(bytes,pool.used);const a=pool.address+pool.used;pool.used+=bytes.length;return a;}throw Error('Item help does not fit bank C');};
 const empty=place(Uint8Array.of(0)),strings=new Map(),pointers=new Uint8Array(COUNT*2),lines=[];
 for(let id=0;id<COUNT;id++){
  const line=itemHelp[id];let address=empty;
  if(line!==undefined){
   if(typeof line!=='string'||!line)throw Error('Item '+id+' has an empty help line');
   if(line.length>MAX_CHARS)throw Error(`Item ${id} help is ${line.length} characters: ${line}`);
   if(!strings.has(line))strings.set(line,place(encodeDialogue(line+'{null}',base)));
   address=strings.get(line);lines.push({id,address,text:line});
  }
  put16(pointers,id*2,address&0xffff);
 }
 for(const pool of pools)if(pool.used)records.push({offset:pool.address,bytes:pool===pools[0]?pool.bytes:pool.bytes.slice(0,pool.used),label:'item help '+(pool===pools[0]?'block':'overflow '+pool.address.toString(16))});
 records.push({offset:table[0],bytes:pointers,label:'item help pointers'});
 return{lines,empty,start,end,pools:pools.map(p=>({address:p.address,length:p.length,used:p.used})),replaced,extraVramBytes:0,extraWramBytes:0};
}
