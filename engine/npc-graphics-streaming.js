import {nativeRoutine} from './asm.js';
import {put24,u24,fileOffset} from './rom.js';
import {decompress} from './compression.js';
import {spriteHeaders} from './native-sprites.js';

// Keep the standard compressed graphics table intact for readers and tools
// that expect it. This second representation is selected only by the two
// guarded native field loaders below. Four-, eight- and twelve-cell actors
// retain their normal field/battle assembly paths. The fixed-frame size3
// loader is deliberately excluded; it does not use those same tile paths.
export function placeNpcGraphicsStreams(base,records,allocations,graphics,pools){
  const remaining=pools.map(p=>({...p})),streams=[],added=[],seen=new Set();
  const overlaps=(r,start,end)=>r.offset<end&&r.offset+r.bytes.length>start;
  const occupied=records.filter(r=>r.offset>=0x400000).map(r=>[r.offset,r.offset+r.bytes.length]);
  for(const p of remaining)if(!Number.isInteger(p.next)||!Number.isInteger(p.end)||p.next<0x400000||p.end>0x7d8000||p.next>p.end||p.end>(p.next&0xff0000)+0x8000)throw Error('Invalid extended sprite pool');
  for(let i=0;i<remaining.length;i++)for(let j=0;j<i;j++)if(remaining[i].next<remaining[j].end&&remaining[i].end>remaining[j].next)throw Error('Overlapping extended sprite pools');
  const headers=spriteHeaders(base).map(h=>{
    const values=base.slice(h.offset,h.offset+5);
    for(const r of records)if(overlaps(r,h.offset,h.offset+5))for(let p=Math.max(h.offset,r.offset);p<Math.min(h.offset+5,r.offset+r.bytes.length);p++)values[p-h.offset]=r.bytes[p-r.offset];
    return{...h,values};
  });
  for(const gfx of graphics){
    if(!Number.isInteger(gfx)||gfx<7||gfx>=255||seen.has(gfx))throw Error('Invalid or duplicate streamed sprite bank');
    seen.add(gfx);
    const owners=headers.filter(h=>h.values[0]===gfx);
    if(!owners.length||owners.some(h=>h.kind==='pc'||(h.values[4]&3)===3))throw Error('Streamed sprite bank requires exclusively four-, eight- or twelve-cell owners: '+gfx);
    const pointer=0x242000+gfx*3,writes=records.filter(r=>overlaps(r,pointer,pointer+3));
    if(writes.length>1||writes.some(r=>r.offset!==pointer||r.bytes.length!==3))throw Error('Ambiguous compressed sprite pointer: '+gfx);
    let packed,source;
    if(writes.length){
      const address=u24(writes[0].bytes,0);source=address>=0xc00000?fileOffset(address):address;
      if(address<0xc00000&&(address<0x400000||address>=0x7e0000||(address&65535)>=0x8000))throw Error('Compressed sprite pointer is outside owned ROM');
      const allocation=allocations.find(a=>a.offset===source),resource=allocation&&records.find(r=>r.offset===source&&r.label===allocation.label&&r.bytes.length===allocation.length);
      if(!resource)throw Error('Compressed sprite pointer has no owned resource: '+gfx);
      if(address<0xc00000&&(address&65535)+resource.bytes.length>0x8000)throw Error('Extended compressed sprite crosses its owned lower-half bank');
      packed=resource.bytes;
    }else{
      source=fileOffset(u24(base,pointer));
      const length=decompress(base,source).length;
      if(records.some(r=>overlaps(r,source,source+length)))throw Error('Original compressed sprite resource was overwritten: '+gfx);
      packed=base.subarray(source,source+length);
    }
    const decoded=decompress(packed,0),bytes=decoded.bytes.length;
    if(decoded.length!==packed.length||!bytes||bytes%32||bytes>0x8000)throw Error('Streamed sprite bank exceeds native tile limits: '+gfx);
    const pool=remaining.find(p=>p.end-p.next>=bytes);
    if(!pool)throw Error('Streamed sprites exceed extended lower-half banks');
    const address=pool.next,end=address+bytes;
    if(occupied.some(([lo,hi])=>address<hi&&end>lo))throw Error('Streamed sprite overlaps an existing extended resource');
    pool.next=end;occupied.push([address,end]);
    added.push({offset:address,bytes:decoded.bytes,label:'NPC '+gfx+' direct-ROM graphics'});
    streams.push({gfx,address,bytes,compressedSource:source,compressedBytes:packed.length,owners:owners.map(({kind,id,values})=>({kind,id,assembly:values[1],palette:values[2],size:values[4]&3}))});
  }
  return{records:added,streams,pools:remaining,bytes:streams.reduce((n,s)=>n+s.bytes,0),freeBytes:remaining.reduce((n,p)=>n+p.end-p.next,0)};
}

const contexts={
  npc:{entry:0x461e,header:0xe4f023,fallback:0xc04626,resume:0xc0463b},
  enemy:{entry:0x476d,header:0xe4f600,fallback:0xc04775,resume:0xc04799}
};

// The native field loader has already selected assembly, palette, animation
// and cell size. M=8, X=16, DB=0, DP=$0100, BF=header index,6D=object index.
// Streamed actors use the ordinary object's1200/1280 graphics pointer. They
// skip decompression and the16-entry decompressed-bank cache, then rejoin the
// existing bookkeeping. Other graphics replay the displaced header reads.
// D9/E3 are the native loader's existing scratch bytes. Stack, DB and DP do
// not change; legacy Y is preserved. Selected Y/X become the object index.
export function npcGraphicsStreamingCode(table,kind){
  const context=contexts[kind];if(!context)throw Error('Unknown sprite loader');
  const {header,fallback,resume}=context;
  if(!Number.isInteger(table)||table<0xc00000||table+768>0x1000000)throw Error('Native sprite pointer table requires original fast ROM');
  return nativeRoutine(a=>{
    a.emit(0xa6,0xbf,0xbf,header&255,header>>8&255,header>>16,0x85,0xe3);
    a.emit(0xc2,0x20,0x29,0xff,0,0x85,0xd9,0x0a,0x18,0x65,0xd9,0xaa,0xe2,0x20);
    a.emit(0xbf,(table+2)&255,(table+2)>>8&255,(table+2)>>16);a.branch(0xf0,'legacy');
    a.emit(0xa4,0x6d,0x99,0,0x12,0xc2,0x20,0xbf,table&255,table>>8&255,table>>16,0x99,0x80,0x12,0xe2,0x20,0xbb);
    a.emit(0x5c,resume&255,resume>>8&255,resume>>16);
    a.label('legacy');a.emit(0xa6,0xbf,0xa5,0xe3,0x5c,fallback&255,fallback>>8&255,fallback>>16);
  });
}

// Read-only diagnostics recover the table from the actual cartridge helper.
// Checking both complete routines prevents a developer budget from trusting
// a stale manifest or an unrelated JML at either loader entry.
export function npcGraphicsStreamTable(rom){
  const patched=Object.values(contexts).map(({entry})=>rom[entry]===0x5c);
  if(patched.every(v=>!v))return null;
  if(!patched.every(Boolean))throw Error('Incomplete native sprite streaming helpers');
  const tables=[];
  for(const [kind,{entry}]of Object.entries(contexts)){
    const address=u24(rom,entry+1);if(address<0xc00000)throw Error('Invalid native sprite helper address');
    const start=fileOffset(address),template=npcGraphicsStreamingCode(0xc00000,kind);
    const operand=template.findIndex((v,i)=>v===0xbf&&template[i+1]===2&&template[i+2]===0&&template[i+3]===0xc0)+1;
    if(operand<1)throw Error('Native sprite table operand is missing');
    const table=u24(rom,start+operand)-2,code=npcGraphicsStreamingCode(table,kind);
    if(!code.every((v,i)=>rom[start+i]===v)||rom[entry+4]!==0xea||rom[entry+5]!==0xea)throw Error('Native sprite streaming helper changed');
    tables.push(table);
  }
  if(tables[0]!==tables[1])throw Error('Native sprite loaders disagree on their table');
  return fileOffset(tables[0]);
}

export function patchNpcGraphicsStreaming(base,streams,allocate,add){
  if(!streams.length)throw Error('Native sprite streaming requires selected graphics');
  const table=new Uint8Array(768),seen=new Set();
  for(const {gfx,address,bytes}of streams){
    if(!Number.isInteger(gfx)||gfx<7||gfx>=255||seen.has(gfx))throw Error('Invalid or duplicate streamed sprite bank');
    if(!Number.isInteger(address)||address<0x400000||address>=0x7e0000||!Number.isInteger(bytes)||bytes<=0||bytes%32||(address&65535)+bytes>0x8000)throw Error('Streamed sprite graphics exceed an owned lower-half bank');
    put24(table,gfx*3,address);seen.add(gfx);
  }
  const tableOffset=allocate(table,'NPC direct-ROM graphics pointers'),helpers=[];
  for(const [kind,{entry,header}]of Object.entries(contexts)){
    const expected=[0xa6,0xbf,0xbf,header&255,header>>8&255,header>>16];
    if(!expected.every((v,i)=>base[entry+i]===v))throw Error('Native '+kind+' graphics loader boundary changed');
    const code=npcGraphicsStreamingCode(tableOffset|0xc00000,kind),address=allocate(code,kind+' direct-ROM graphics loader');
    add(entry,Uint8Array.of(0x5c,address&255,address>>8&255,0xc0|address>>16,0xea,0xea),kind+' direct-ROM graphics entry');
    helpers.push({kind,entry,address,bytes:code.length});
  }
  return{table:tableOffset,tableBytes:table.length,helpers,streams,extraWramBytes:0,extraVramBytes:0};
}
