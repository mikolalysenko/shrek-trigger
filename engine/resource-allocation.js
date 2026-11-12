import {coalesceReclaimedPools} from './resource-pools.js';

// Allocation is a build-time concern. A sizing pass measures every resource;
// code and events are rebuilt using their final, bank-local addresses.
export class ResourceAllocationError extends Error {
  constructor(message,spans,label){super(message);this.spans=spans;this.label=label;}
}

function take(pools,length,label,spans){
  let pool;
  for(const p of pools)if(p.end-p.next>=length&&(!pool||p.end-p.next<pool.end-pool.next))pool=p;
  if(!pool){
    const free=pools.reduce((n,p)=>n+p.end-p.next,0),largest=Math.max(0,...pools.map(p=>p.end-p.next));
    throw new ResourceAllocationError(`No same-bank allocation available for ${label}: needs ${length} bytes, largest span ${largest}, total free ${free}`,spans,label);
  }
  const offset=pool.next;pool.next=Math.min(pool.end,(offset+length+1)&~1);return offset;
}

export function planResources(spans,requirements){
  // Fill each proven span with a subset of whole resources. Processing small
  // spans first avoids stranding the many short source dialogue strings.
  // Two-byte units keep the dynamic-programming array at most32769 entries.
  const pools=coalesceReclaimedPools(spans).map(p=>({next:(p.next+1)&~1,end:p.end&~1}))
    .filter(p=>p.end>p.next).sort((a,b)=>(a.end-a.next)-(b.end-b.next));
  const remaining=[...requirements].map(([label,bytes])=>{
    if(!Number.isInteger(bytes)||bytes<=0||bytes>0x10000)throw Error('Invalid resource size: '+label);
    // Only event compression depends on relocated text pointers. Rounding
    // its reservation to8bytes absorbs small changes without ROM padding.
    const length=label.startsWith('event ')?(bytes+7)&~7:(bytes+1)&~1;
    return{label,length,units:length>>1};
  }).sort((a,b)=>b.units-a.units),slots=new Map();
  for(const pool of pools){
    const capacity=(pool.end-pool.next)>>1,previous=new Int32Array(capacity+1).fill(-1);previous[0]=-2;
    for(let i=0;i<remaining.length;i++){
      const size=remaining[i].units;if(size>capacity)continue;
      for(let total=capacity;total>=size;total--)if(previous[total]===-1&&previous[total-size]!==-1)previous[total]=i;
      if(previous[capacity]!==-1)break;
    }
    let total=capacity;while(total>0&&previous[total]===-1)total--;
    const selected=[];
    while(total>0){const i=previous[total];selected.push(i);total-=remaining[i].units;}
    for(const i of selected){
      const{label,length}=remaining[i];slots.set(label,{offset:pool.next,length});pool.next+=length;
    }
    selected.sort((a,b)=>b-a).forEach(i=>remaining.splice(i,1));
  }
  if(remaining.length){
    const{label,length}=remaining[0],free=pools.reduce((n,p)=>n+p.end-p.next,0),largest=Math.max(0,...pools.map(p=>p.end-p.next));
    const error=new ResourceAllocationError(`No packed same-bank allocation for ${label}: needs ${length} bytes, largest span ${largest}, total free ${free}`,spans,label);
    Object.assign(error,{requirements:[...requirements],remaining});throw error;
  }
  return{slots,pools};
}

export class ResourceAllocator {
  constructor(spans,requirements=new Map(),plan=null,measure=false){
    this.spans=coalesceReclaimedPools(spans);this.requirements=requirements;
    this.pools=(plan?.pools??this.spans).map(p=>({...p}));
    this.slots=plan?.slots??new Map();this.used=new Set();this.measure=measure;this.cursor=0;
  }
  allocate(length,label){
    if(!Number.isInteger(length)||length<=0||length>0x10000)throw Error('Invalid resource size: '+label);
    if(this.used.has(label))throw Error('Duplicate resource label: '+label);
    this.used.add(label);this.requirements.set(label,Math.max(length,this.requirements.get(label)??0));
    if(this.measure){
      // These addresses exist only during compilation of the sizing pass.
      // Its records are never applied to a ROM or exposed to the emulator.
      if((this.cursor&65535)+length>65536)this.cursor=(this.cursor+65535)&~65535;
      const offset=this.cursor;this.cursor=(offset+length+1)&~1;
      if(this.cursor>0x400000)throw Error('Measured resources exceed the cartridge');
      return offset;
    }
    const slot=this.slots.get(label);
    if(slot){
      if(length>slot.length)throw new ResourceAllocationError('Relocated resource grew: '+label,this.spans,label);
      return slot.offset;
    }
    return take(this.pools,length,label,this.spans);
  }
  finish(){
    for(const label of this.slots.keys())if(!this.used.has(label))throw Error('Unused resource reservation: '+label);
  }
  get freeBytes(){return this.pools.reduce((n,p)=>n+p.end-p.next,0);}
}
