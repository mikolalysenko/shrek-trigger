import {u16, put16} from './rom.js';
// CT packet format: length-prefixed groups of eight LSB-first LZ tokens;
// final control record chooses 11- or 12-bit distances and a partial group.
export function decompress(rom, start) {
  let p = start + 2, end = p + u16(rom, start), bits = 8;
  const small = !!(rom[end] & 0xc0), shift = small ? 11 : 12, mask = (1 << shift) - 1, out = [];
  for (let guard = 0; guard < 0x20000; guard++) {
    if (p === end) {
      bits = rom[p] & 63;
      if (!bits) return {bytes: Uint8Array.from(out), length: p + 1 - start};
      if (bits > 8) throw Error('Invalid CT packet');
      end = start + u16(rom, p + 1); p += 3;
    }
    const flags = rom[p++];
    for (let bit = 0; bit < bits; bit++) {
      if (flags & 1 << bit) {
        const word = u16(rom, p); p += 2;
        const distance = word & mask, length = (word >> shift) + 3;
        if (!distance || distance > out.length) throw Error('Invalid LZ back-reference');
        for (let i=0;i<length;i++) out.push(out[out.length-distance]);
      } else out.push(rom[p++]);
      if (out.length > 0x10000 || p > rom.length) throw Error('CT packet exceeds buffer');
    }
    bits = 8;
  }
  throw Error('Unterminated CT packet');
}
// Select the shorter of both formats supported by the cartridge. Planning is
// build-time only: shortest-path costs include each flag byte and the final
// partial-group record, so a locally longer match cannot waste a whole packet.
export function compress(data,{mode='auto'}={}) {
  if(data.length>0x10000)throw Error('CT packet exceeds native decoded buffer');
  if(![11,12,'auto'].includes(mode))throw Error('CT distance mode must be 11 or 12');
  const pack=shift=>{
    const mask=(1<<shift)-1,limit=(1<<(16-shift))+2,seen=new Map();
    const lengths=new Uint8Array(data.length),distances=new Uint16Array(data.length);
    for(let p=0;p+2<data.length;p++){
      const key=(data[p]<<16)|(data[p+1]<<8)|data[p+2],list=seen.get(key)??[];
      let best=2,distance=0;
      for(let i=list.length-1;i>=0;i--){
        const q=list[i];if(p-q>mask)break;
        let n=3;while(n<limit&&p+n<data.length&&data[q+n]===data[p+n])n++;
        if(n>best){best=n;distance=p-q;}if(best===limit)break;
      }
      if(distance){lengths[p]=best;distances[p]=distance;}
      list.push(p);if(list.length>256)list.shift();seen.set(key,list);
    }
    const costs=new Uint32Array((data.length+1)*8),choices=new Uint8Array(data.length*8);
    for(let r=0;r<8;r++)costs[data.length*8+r]=r?4:1;
    for(let p=data.length-1;p>=0;p--)for(let r=0;r<8;r++){
      const next=(r+1)&7,flag=r?0:1;
      let best=flag+1+costs[(p+1)*8+next],length=1;
      for(let n=lengths[p];n>=3;n--){
        const score=flag+2+costs[(p+n)*8+next];if(score<best){best=score;length=n;}
      }
      costs[p*8+r]=best;choices[p*8+r]=length;
    }
    const tokens=[];
    for(let p=0;p<data.length;){
      const n=choices[p*8+(tokens.length&7)];
      tokens.push(n===1?{byte:data[p]}:{word:((n-3)<<shift)|distances[p]});p+=n;
    }
    const out=[0,0],controlMode=shift===11?0xc0:0;
    const group=values=>{
      let flags=0;values.forEach((t,i)=>{if(t.word!==undefined)flags|=1<<i;});
      // Native zero-flags fast path always copies EIGHT literals. Set an
      // unused flag in a short literal tail to force its counted path.
      if(!flags&&values.length<8)flags=1<<values.length;
      out.push(flags);for(const t of values)if(t.word!==undefined)out.push(t.word&255,t.word>>8);else out.push(t.byte);
    };
    const full=tokens.length-tokens.length%8;
    for(let i=0;i<full;i+=8)group(tokens.slice(i,i+8));
    put16(out,0,out.length-2);
    if(full<tokens.length){
      const control=out.length;out.push(controlMode|(tokens.length-full),0,0);
      group(tokens.slice(full));put16(out,control+1,out.length);
    }
    out.push(controlMode);return Uint8Array.from(out);
  };
  const candidates=(mode==='auto'?[11,12]:[mode]).map(pack).sort((a,b)=>a.length-b.length),best=candidates[0];
  if(best.length>0x10000)throw Error('Compressed CT packet exceeds one native bank');
  return best;
}
