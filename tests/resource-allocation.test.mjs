import test from 'node:test';
import assert from 'node:assert/strict';
import {ResourceAllocator,ResourceAllocationError,planResources} from '../engine/resource-allocation.js';

test('whole-resource packing resolves fragmented space without crossing owned spans',()=>{
  const spans=[{next:0x100,end:0x10a},{next:0x200,end:0x20a}];
  const requirements=new Map([['small A',4],['small B',4],['large A',6],['large B',6]]);
  const online=new ResourceAllocator(spans);
  assert.throws(()=>{for(const[label,length]of requirements)online.allocate(length,label);},ResourceAllocationError);
  const plan=planResources(spans,requirements),allocator=new ResourceAllocator(spans,new Map(),plan),occupied=new Set();
  for(const[label,length]of requirements){
    const offset=allocator.allocate(length,label);
    assert.ok(spans.some(p=>offset>=p.next&&offset+length<=p.end));
    for(let p=offset;p<offset+length;p++){assert.ok(!occupied.has(p));occupied.add(p);}
  }
  allocator.finish();assert.equal(allocator.freeBytes,0);assert.equal(occupied.size,20);
  assert.deepEqual(planResources(spans,requirements),plan,'placement is reproducible');
  assert.deepEqual(spans,[{next:0x100,end:0x10a},{next:0x200,end:0x20a}],'ownership evidence remains intact');
});

test('packing honors bank boundaries and rejects an indivisible resource even with enough aggregate space',()=>{
  const spans=[{next:0xfff1,end:0x10000},{next:0x10000,end:0x10012}];
  const plan=planResources(spans,new Map([['first',14],['second',18]]));
  for(const slot of plan.slots.values())assert.equal(slot.offset>>16,(slot.offset+slot.length-1)>>16);
  assert.throws(()=>planResources(spans,new Map([['too wide',20]])),ResourceAllocationError);
  assert.throws(()=>planResources(spans,new Map([['invalid',0]])),/Invalid resource size/);
});

test('a relocated event that grows must be rebuilt before any bytes can be published',()=>{
  const spans=[{next:0x10000,end:0x10100}],requirements=new Map([['event 1',13],['fixed tiles',20]]);
  const plan=planResources(spans,requirements),allocator=new ResourceAllocator(spans,requirements,plan);
  assert.equal(plan.slots.get('event 1').length,16);
  assert.throws(()=>allocator.allocate(17,'event 1'),ResourceAllocationError);
  assert.equal(requirements.get('event 1'),17);
  const rebuilt=new ResourceAllocator(spans,requirements,planResources(spans,requirements));
  rebuilt.allocate(17,'event 1');rebuilt.allocate(20,'fixed tiles');rebuilt.finish();
  assert.throws(()=>rebuilt.allocate(20,'fixed tiles'),/Duplicate resource label/);
});
