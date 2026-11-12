import {u24,fileOffset,put24} from './rom.js';
import {extendedDataPools} from './expanded-rom.js';

export class PlayerGraphicsCapacityError extends Error {}

// The cinematic routines at WRAM7E:7EF8/7F05 copy 32/16 zero bytes from
// D2:0000 into their callback tables. This blank player tile has a second,
// absolute consumer even when Farquaad's graphics pointer moves elsewhere.
export const sharedPlayerData=[{offset:0x120000,length:32,label:'cinematic callback zero source'}];

// Player tiles stream directly from ROM. The field copier has fast paths for
// banks D2–D5. Exclusively owned player regions in those banks may share their
// available space; each actor's complete tile stream stays within one bank.
export function placePlayerGraphics(base,compiled,{extended=false}={}){
  for(const {offset,length}of sharedPlayerData)if(!base.slice(offset,offset+length).every(v=>v===0))throw Error('Shared cinematic zero tile changed');
  const members=compiled.map(result=>{
    const {id,bytes,capacity}=result.audit,record=result.records[0],pointer=0x242000+id*3,source=u24(base,pointer);
    if(record.offset!==fileOffset(source)||record.bytes.length!==bytes)throw Error('Player graphics source mismatch');
    const start=record.offset,end=start+capacity,bank=start>>16;
    if(bank<0x12||bank>0x15||(end-1)>>16!==bank||bytes>0x10000||bytes%32)throw Error('Player graphics exceed a native bank');
    for(let other=0;other<256;other++)if(other!==id&&u24(base,0x242000+other*3)===source)throw Error('Player graphics allocation is aliased');
    return{result,id,bytes,start,end,pointer,bank,record};
  }).sort((a,b)=>a.start-b.start);
  const groups=[];
  for(const member of members){
    const previous=groups.at(-1);
    if(previous&&member.start<previous.end)throw Error('Player graphics source allocations overlap');
    if(previous&&previous.bank===member.bank&&previous.end===member.start){previous.members.push(member);previous.end=member.end;}
    else groups.push({start:member.start,end:member.end,bank:member.bank,members:[member]});
  }
  // Extended data uses only lower-half banks. Larger actors stay in the
  // jointly owned original regions; Puss retains the weapon selector address.
  const extraPools=extended?extendedDataPools():[];
  const extra=extended?members.filter(m=>m.id!==4&&m.bytes<=0x8000):[];
  const native=members.filter(m=>!extra.includes(m));
  // Prefer original banks, then search the four proven player spans when a
  // complete bank overflows. Puss stays at D3:0000 because the native weapon
  // selectors identify that graphics address. Other source allocations are
  // released only after their sole graphics pointer is redirected below.
  let assignment=groups.map(g=>g.members.filter(m=>native.includes(m)));
  if(groups.some((g,i)=>assignment[i].reduce((n,m)=>n+m.bytes,0)>g.end-g.start)){
    const ordered=native.slice().sort((a,b)=>(b.id===4)-(a.id===4)||b.bytes-a.bytes||a.id-b.id);
    const pending=groups.map(()=>[]),used=groups.map(()=>0);let best=null,bestMoves=Infinity;
    function search(index,moves){
      if(moves>=bestMoves)return;
      if(index===ordered.length){best=pending.map(list=>list.slice());bestMoves=moves;return;}
      const m=ordered[index],original=groups.findIndex(g=>g.members.includes(m));
      const choices=m.id===4?[original]:[original,...groups.map((_,i)=>i).filter(i=>i!==original)];
      for(const i of choices){
        const g=groups[i];if(used[i]+m.bytes>g.end-g.start)continue;
        if(m.id===4&&g.start!==m.start)throw Error('Puss weapon graphics must retain their source address');
        pending[i].push(m);used[i]+=m.bytes;search(index+1,moves+(i!==original));used[i]-=m.bytes;pending[i].pop();
      }
    }
    search(0,0);if(!best)throw new PlayerGraphicsCapacityError('Player graphics exceed their jointly owned native bank regions');
    assignment=best.map(list=>list.sort((a,b)=>(b.id===4)-(a.id===4)||a.start-b.start));
  }
  const records=[],pools=[],audit=[];
  for(let g=0;g<groups.length;g++){
    const group=groups[g],assigned=assignment[g];
    const repack=assigned.length!==group.members.length||assigned.some((m,i)=>m!==group.members[i]||m.bytes>m.end-m.start);
    const used=assigned.reduce((n,m)=>n+m.bytes,0);
    if(used>group.end-group.start)throw new PlayerGraphicsCapacityError('Player graphics exceed their jointly owned bank region');
    let cursor=group.start;
    if(!assigned.length)pools.push({next:group.start,end:group.end});
    for(let i=0;i<assigned.length;i++){
      const m=assigned[i],offset=repack?cursor:m.start;
      const limit=repack?(i+1<assigned.length?offset+m.bytes:group.end):m.end;
      if(offset+m.bytes>limit)throw Error('Player graphics overlap the following actor');
      const pointerBytes=new Uint8Array(3);put24(pointerBytes,0,offset|0xc00000);
      records.push({...m.record,offset});
      if(offset!==m.start)records.push({offset:m.pointer,bytes:pointerBytes,label:m.result.audit.name+' relocated player graphics pointer'});
      records.push(...m.result.records.slice(1));
      // Field C0:E534/E687, battle C1:1CFC and menu C2:F7C3 copy exactly
      // one 32-byte tile per assembly index. No reader rounds the stream up
      // to a 256-byte page. The complete tile stream therefore owns exactly
      // `bytes` bytes, including its final tile; the following byte is free.
      pools.push({next:offset+m.bytes,end:limit});
      Object.assign(m.result.audit,{sourceGraphicsOffset:m.start,graphicsOffset:offset,sourceCapacity:m.end-m.start,capacity:limit-offset});
      audit.push({id:m.id,source:m.start,offset,bytes:m.bytes,capacity:limit-offset,bank:0xc0|group.bank,relocated:offset!==m.start});
      cursor=offset+m.bytes;
    }
  }
  for(const m of extra){
    const pool=extraPools.find(p=>p.end-p.next>=m.bytes);
    if(!pool)throw new PlayerGraphicsCapacityError('Player graphics exceed extended data banks');
    const offset=pool.next;pool.next+=m.bytes;
    const pointerBytes=new Uint8Array(3);put24(pointerBytes,0,offset);
    records.push({...m.record,offset},{offset:m.pointer,bytes:pointerBytes,label:m.result.audit.name+' extended player graphics pointer'},...m.result.records.slice(1));
    Object.assign(m.result.audit,{sourceGraphicsOffset:m.start,graphicsOffset:offset,sourceCapacity:m.end-m.start,capacity:m.bytes});
    audit.push({id:m.id,source:m.start,offset,bytes:m.bytes,capacity:m.bytes,bank:offset>>16,relocated:true,extended:true});
  }
  let reclaimable=pools;
  for(const {offset,length}of sharedPlayerData){
    const end=offset+length;
    for(const r of records)for(let p=Math.max(offset,r.offset);p<Math.min(end,r.offset+r.bytes.length);p++)if(r.bytes[p-r.offset]!==0)throw Error('Player graphics overwrite the shared cinematic zero tile');
    reclaimable=reclaimable.flatMap(p=>p.next>=end||p.end<=offset?[p]:[
      ...(p.next<offset?[{next:p.next,end:offset}]:[]),...(p.end>end?[{next:end,end:p.end}]:[])
    ]);
  }
  return{records,pools:reclaimable,audit,sharedData:sharedPlayerData,extended:extended?{actors:extra.map(m=>m.id),bytes:extra.reduce((n,m)=>n+m.bytes,0),freeBytes:extraPools.reduce((n,p)=>n+p.end-p.next,0),pools:extraPools}:null};
}
