import {put16} from './rom.js';

export const HIROM_BYTES=0x400000;
export const EXHIROM_BYTES=0x800000;

// Preserve every original upper-half mirror, including bank00's vectors and
// absolute ROM reads. Only the lower halves of full banks40–7D hold new data.
// This is the same conservative layout used by Secret of Goku's native port.
// The BG3 effect hooks shared by Swamp Belch and Yarn Bomb, Yarn Bomb's
// glint table and its raw tiles fill the end of the last owned bank. The
// hooks call, jump and block-move there directly, so no pool covers it.
export const EFFECT_HOOKS_BLOCK=0x7d6c00;
export function extendedDataPools(){
  return Array.from({length:62},(_,i)=>({next:(0x40+i)*0x10000,end:(0x40+i)*0x10000+(0x40+i===EFFECT_HOOKS_BLOCK>>16?EFFECT_HOOKS_BLOCK&0xffff:0x8000)}));
}

// Explicit data pointers only. Original HiROM pointers remain in C0–FF;
// extended packets use the owned lower halves of full banks40–7D.
export function cartridgeDataAddress(offset){
  if(!Number.isInteger(offset)||offset<0||offset>=0x7e0000||(offset>=HIROM_BYTES&&(offset&65535)>=0x8000))throw Error('Invalid cartridge data address');
  return offset<HIROM_BYTES?offset|0xc00000:offset;
}

export function extendedDataAllocator(sourcePools){
  const pools=sourcePools.map(p=>({...p})),records=[],allocations=[];
  for(const p of pools)if(!Number.isInteger(p.next)||!Number.isInteger(p.end)||p.next<HIROM_BYTES||p.end>0x7d8000||p.next>p.end||p.end>(p.next&0xff0000)+0x8000)throw Error('Invalid extended data pool');
  for(let i=0;i<pools.length;i++)for(let j=0;j<i;j++)if(pools[i].next<pools[j].end&&pools[i].end>pools[j].next)throw Error('Overlapping extended data pools');
  const allocate=(bytes,label)=>{
    if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>0x8000||allocations.some(a=>a.label===label))throw Error('Invalid extended resource');
    const pool=pools.find(p=>p.end-((p.next+1)&~1)>=bytes.length);if(!pool)throw Error('Extended resources exceed owned lower-half banks');
    const offset=(pool.next+1)&~1;pool.next=offset+bytes.length;records.push({offset,bytes,label});allocations.push({offset,length:bytes.length,label});return offset;
  };
  return {pools,records,allocations,allocate};
}

export function expandHirom(rom,records=[]){
  if(rom.length!==HIROM_BYTES)throw Error('Extended cartridge requires a complete 4 MiB HiROM');
  if((rom[0xffd5]&15)!==1)throw Error('Extended cartridge requires the original HiROM mapper');
  const result=new Uint8Array(EXHIROM_BYTES);result.set(rom);result.set(rom,HIROM_BYTES);
  const occupied=[];
  for(const {offset,bytes,label} of records){
    if(!Number.isInteger(offset)||offset<HIROM_BYTES||offset>=0x7e0000||!bytes.length||
      (offset&65535)+bytes.length>0x8000)throw Error('Extended data exceeds an owned lower-half bank: '+label);
    for(const [lo,hi,name]of occupied)if(offset<hi&&offset+bytes.length>lo)throw Error('Overlapping extended data: '+label+' / '+name);
    occupied.push([offset,offset+bytes.length,label]);result.set(bytes,offset);
  }
  for(const h of[0xffc0,0x40ffc0]){
    result[h+21]|=4;result[h+23]=13;
    put16(result,h+28,65535);put16(result,h+30,0);
  }
  const sum=result.reduce((n,b)=>(n+b)&65535,0);
  for(const h of[0xffc0,0x40ffc0]){put16(result,h+28,sum^65535);put16(result,h+30,sum);}
  return result;
}

// Use with a target cartridge. Source-ROM inspection intentionally retains
// the original HiROM-only fileOffset helper.
export function cartridgeOffset(address,rom){
  if(rom.length>HIROM_BYTES&&address<0x800000)return(address&0x3fffff)|HIROM_BYTES;
  return address&0x3fffff;
}
