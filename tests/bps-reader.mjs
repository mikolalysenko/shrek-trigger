// Test-only BPS reader: interprets all four standard commands and validates
// checksums with a bit-at-a-time implementation independent of the writer.
import assert from 'node:assert/strict';

export function readBps(source,patch){
  const checksum=data=>{
    let crc=0xffffffff;
    for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    return(crc^0xffffffff)>>>0;
  };
  const word=p=>(patch[p]|patch[p+1]<<8|patch[p+2]<<16|patch[p+3]<<24)>>>0;
  assert.equal(new TextDecoder().decode(patch.slice(0,4)),'BPS1');
  assert.equal(checksum(patch.slice(0,-4)),word(patch.length-4),'patch CRC');
  assert.equal(checksum(source),word(patch.length-12),'source CRC');
  let p=4;
  function number(){
    let value=0,shift=1;
    for(;;){assert.ok(p<patch.length-12,'bounded BPS number');const byte=patch[p++];value+=(byte&127)*shift;if(byte&128)return value;shift*=128;value+=shift;assert.ok(Number.isSafeInteger(value));}
  }
  assert.equal(number(),source.length,'source size');
  const target=new Uint8Array(number()),metadata=number();p+=metadata;
  let offset=0,sourceCursor=0,targetCursor=0;const commands=[0,0,0,0];
  while(offset<target.length){
    const command=number(),action=command%4,length=Math.floor(command/4)+1;commands[action]++;
    assert.ok(offset+length<=target.length,'bounded command');
    if(action===0){assert.ok(offset+length<=source.length);target.set(source.slice(offset,offset+length),offset);offset+=length;}
    else if(action===1){assert.ok(p+length<=patch.length-12);target.set(patch.slice(p,p+length),offset);p+=length;offset+=length;}
    else{
      const encoded=number(),delta=Math.floor(encoded/2)*(encoded%2?-1:1);
      if(action===2){sourceCursor+=delta;assert.ok(sourceCursor>=0&&sourceCursor+length<=source.length);for(let i=0;i<length;i++)target[offset++]=source[sourceCursor++];}
      else{targetCursor+=delta;assert.ok(targetCursor>=0&&targetCursor<offset);for(let i=0;i<length;i++)target[offset++]=target[targetCursor++];}
    }
  }
  assert.equal(p,patch.length-12,'complete command stream');
  assert.equal(checksum(target),word(patch.length-8),'target CRC');
  return{target,commands};
}
