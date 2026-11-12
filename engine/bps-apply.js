// Applies a BPS patch in the browser and checks all three CRC32s (source,
// target and the patch itself), so a wrong ROM or a damaged download fails
// loudly instead of booting garbage.
const table=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;});
export function crc32(bytes,end=bytes.length){let c=0xffffffff;for(let i=0;i<end;i++)c=table[(c^bytes[i])&255]^(c>>>8);return(c^0xffffffff)>>>0;}

export function applyBps(source,patch){
 if(String.fromCharCode(...patch.subarray(0,4))!=='BPS1')throw Error('Not a BPS patch');
 let p=4;
 const number=()=>{let n=0,shift=1;for(;;){const b=patch[p++];n+=(b&0x7f)*shift;if(b&0x80)return n;shift*=128;n+=shift;}};
 const sourceSize=number(),targetSize=number(),metadata=number();p+=metadata;
 const word=at=>(patch[at]|patch[at+1]<<8|patch[at+2]<<16|patch[at+3]<<24)>>>0,end=patch.length-12;
 if(crc32(patch,patch.length-4)!==word(patch.length-4))throw Error('The patch download is damaged');
 if(source.length!==sourceSize||crc32(source)!==word(end))throw Error('This ROM does not match the patch');
 const target=new Uint8Array(targetSize);let out=0,sourceRel=0,targetRel=0;
 while(p<end){
  const data=number(),length=(data>>>2)+1;
  switch(data&3){
   case 0:for(let i=0;i<length;i++,out++)target[out]=source[out];break;
   case 1:for(let i=0;i<length;i++)target[out++]=patch[p++];break;
   case 2:{const d=number();sourceRel+=(d&1?-1:1)*(d>>>1);for(let i=0;i<length;i++)target[out++]=source[sourceRel++];break;}
   default:{const d=number();targetRel+=(d&1?-1:1)*(d>>>1);for(let i=0;i<length;i++)target[out++]=target[targetRel++];}
  }
 }
 if(crc32(target)!==word(end+4))throw Error('The patched cartridge failed its checksum');
 return target;
}
