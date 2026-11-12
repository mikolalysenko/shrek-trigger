// BPS1 patch writer, following byuu's public-domain specification. SourceRead
// preserves the original cartridge; TargetCopy expresses the mirrored second
// half without including another copy of the user's ROM in the patch.
const crcTable=Uint32Array.from({length:256},(_,value)=>{
  for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);
  return value>>>0;
});

export function crc32(bytes){
  let value=0xffffffff;
  for(const byte of bytes)value=(value>>>8)^crcTable[(value^byte)&255];
  return(value^0xffffffff)>>>0;
}

export function makeBps(base,target){
  if(!base.length)throw Error('BPS cartridge source must not be empty');
  const out=[66,80,83,49];
  function number(value){
    do{
      const byte=value%128;value=Math.floor(value/128);
      out.push(byte|(value===0?128:0));
      if(value===0)return;
      value--;
    }while(true);
  }
  const word=value=>{for(let n=0;n<4;n++)out.push(value>>>(n*8)&255);};
  number(base.length);number(target.length);number(0);
  let p=0,copyCursor=0;
  while(p<target.length){
    const start=p,source=p<base.length;
    const matches=i=>source?i<base.length&&target[i]===base[i]:target[i]===target[i-base.length];
    if(matches(p)){
      do{p++;}while(p<target.length&&matches(p));
      number((p-start-1)*4+(source?0:3));
      if(!source){
        const from=start-base.length,delta=from-copyCursor;
        number(Math.abs(delta)*2+(delta<0?1:0));copyCursor=from+p-start;
      }
    }else{
      do{p++;}while(p<target.length&&!matches(p)&&(!source||p<base.length));
      number((p-start-1)*4+1);
      for(let i=start;i<p;i++)out.push(target[i]);
    }
  }
  word(crc32(base));word(crc32(target));word(crc32(out));
  return Uint8Array.from(out);
}
