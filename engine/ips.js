// IPS for an expanding cartridge (4 MiB base -> 8 MiB target). Records carry
// a 24-bit offset and a 16-bit length; runs of one repeated byte use RLE
// records. A record may not start at 0x454F46 ("EOF"), which a reader would
// take for the end marker, so such a record starts one byte earlier.
const EOF_OFFSET=0x454f46,MAX=0xffff,RLE_MIN=9;

export function makeIps(base,target){
 if(target.length>0x1000000)throw Error('IPS cannot address past 16 MiB');
 if(target.length<base.length)throw Error('IPS cannot shrink a file');
 const out=[...new TextEncoder().encode('PATCH')];
 const differs=p=>p>=base.length||base[p]!==target[p];
 const record=(start,end)=>{
  // Emit [start,end) as literal and RLE records.
  let p=start;
  while(p<end){
   let run=1;while(p+run<end&&run<MAX&&target[p+run]===target[p])run++;
   if(run>=RLE_MIN&&p!==EOF_OFFSET){out.push(p>>16&255,p>>8&255,p&255,0,0,run>>8,run&255,target[p]);p+=run;continue;}
   let q=p; // literals stop one short of MAX, leaving room for the EOF backstep
   while(q<end&&q-p<MAX-1){let r=1;while(q+r<end&&r<RLE_MIN&&target[q+r]===target[q])r++;if(r>=RLE_MIN&&q>p&&q!==EOF_OFFSET)break;q++;}
   if(q===p)q=p+1;
   // Rewriting the byte before is harmless: it already holds its target value.
   const s=p===EOF_OFFSET?p-1:p;
   out.push(s>>16&255,s>>8&255,s&255,(q-s)>>8,(q-s)&255,...target.subarray(s,q));p=q;
  }
 };
 for(let p=0;p<target.length;){
  if(!differs(p)){p++;continue;}
  let start=p;while(p<target.length&&differs(p))p++;
  // Bridge short unchanged gaps (a record header costs five bytes).
  while(p<target.length){let g=p;while(g<target.length&&!differs(g)&&g-p<6)g++;if(g<target.length&&differs(g)&&g-p<6){p=g;while(p<target.length&&differs(p))p++;}else break;}
  if(start===EOF_OFFSET)start--;
  record(start,p);
 }
 out.push(69,79,70);
 return Uint8Array.from(out);
}

// An independent reader, used to prove the patch reproduces the cartridge.
export function applyIps(base,patch){
 if(new TextDecoder().decode(patch.subarray(0,5))!=='PATCH')throw Error('Not an IPS patch');
 let rom=Uint8Array.from(base),p=5;
 const grow=n=>{if(n>rom.length){const r=new Uint8Array(n);r.set(rom);rom=r;}};
 for(;;){
  if(p+3>patch.length)throw Error('IPS patch has no EOF marker');
  const offset=patch[p]<<16|patch[p+1]<<8|patch[p+2];p+=3;
  if(offset===EOF_OFFSET)break;
  const size=patch[p]<<8|patch[p+1];p+=2;
  if(size){grow(offset+size);rom.set(patch.subarray(p,p+size),offset);p+=size;}
  else{const run=patch[p]<<8|patch[p+1],v=patch[p+2];p+=3;grow(offset+run);rom.fill(v,offset,offset+run);}
 }
 return rom;
}
