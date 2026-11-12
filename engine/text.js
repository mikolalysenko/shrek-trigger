const symbols = ['!', '?', '/', '“', '”', ':', '&', '(', ')', "'", '.', ',', '=', '-', '+', '%', '♪', ' ', '♥', '…'];
// The currency sign: a toenail clipping drawn over a spare '#' in the 8x8 menu and
// battle font (engine/swamp-terms.js). The dialogue font has no such glyph;
// field text spells the word.
export const ONION='\u00a4',ONION_GLYPH=0xf2;
export function encode(text, {length, pad = 0xef, terminator = false} = {}) {
  const result = [];
  for (const c of text) {
    if (/[A-Z]/.test(c)) result.push(c.charCodeAt(0) - 65 + 0xa0);
    else if (/[a-z]/.test(c)) result.push(c.charCodeAt(0) - 97 + 0xba);
    else if (/[0-9]/.test(c)) result.push(c.charCodeAt(0) - 48 + 0xd4);
    else if (c === '\n') result.push(6);
    else if (c === '\f') result.push(0x0c);
    else if (c === ONION) result.push(ONION_GLYPH);
    else if (symbols.includes(c)) result.push(0xde + symbols.indexOf(c));
    else throw Error('Unsupported CT glyph: ' + c);
  }
  if (terminator) result.push(0);
  if (length !== undefined) {
    if (result.length > length) throw Error(`Text overflows ${length} bytes: ${text}`);
    while (result.length < length) result.push(pad);
  }
  return Uint8Array.from(result);
}
// Item and technique names in the cartridge's fixed-width tables: a space
// inside the name is $FF and only the trailing padding is $EF, as in the
// original tables. Battle messages ("Got 1x ...!", "... learns ...!") trim a
// name at $EF, so an $EF between words drops everything before it.
export function encodeName(text, {length} = {}) {
  const out = encode(text, {length});
  let last = out.length - 1;
  while (last >= 0 && out[last] === 0xef) last--;
  for (let i = 0; i < last; i++) if (out[i] === 0xef) out[i] = 0xff;
  return out;
}
export function decode(bytes) {
  return [...bytes].map(v => v >= 0xa0 && v < 0xba ? String.fromCharCode(v - 0xa0 + 65) : v >= 0xba && v < 0xd4 ? String.fromCharCode(v - 0xba + 97) : v >= 0xd4 && v < 0xde ? String.fromCharCode(v - 0xd4 + 48) : v === 0xff ? ' ' : symbols[v - 0xde] ?? `{${v.toString(16).padStart(2,'0')}}`).join('').trim();
}

const controls={null:0,br:6,instant:9,page3:10,page:12,full:11,shrek:19,fiona:20,donkey:21,pinocchio:22,puss:23,mongo:24,farquaad:25,pc1:27,pc2:28,pc3:29,item:31,dragon:32,value:13,'value 8':13,'value 16':14,'value 24':15};
// Numeric and character-name controls read the separate argument stream.
// Only extended glyphs, delay, and entity-name subcodes consume inline bytes.
const inlineOperands=new Set([1,2,3,18]);
export function dialogueLength(bytes,start=0){
  const end=Math.min(bytes.length,(start|0xffff)+1);
  if(!Number.isInteger(start)||start<0||start>=bytes.length)throw Error('Invalid native dialogue address');
  for(let p=start;p<end;){
    const code=bytes[p++];if(code===0)return p-start;
    if(inlineOperands.has(code)){
      if(p>=end)throw Error('Truncated native dialogue operand');
      const operand=bytes[p++];if(code===3&&operand===0)return p-start;
    }
  }
  throw Error('Unterminated native dialogue in bank');
}
export function encodeDialogue(text,rom) {
  const raw=[];
  for(const part of text.split(/(\{[^}]+\})/g)) {
    if(!part)continue;
    if(part[0]!=='{')raw.push(...encode(part));
    else {
      const key=part.slice(1,-1);
      if(key.startsWith('delay ')){
        const ticks=Number(key.slice(6));if(!Number.isInteger(ticks)||ticks<0||ticks>255)throw Error('Dialogue delay must be a byte');raw.push(3,ticks);
      }
      else if(key in controls)raw.push(controls[key]);
      else throw Error('Unknown dialogue control: '+key);
    }
  }
  const dict=[];
  for(let i=0;i<127;i++){
    const a=0x1e0000+(rom[0x1efa00+i*2]|rom[0x1efa01+i*2]<<8);
    dict.push(rom.subarray(a+1,a+1+rom[a]));
  }
  const out=[];
  for(let p=0;p<raw.length;) {
    // Keep controls and their operands intact; only glyph runs are compressed.
    if(raw[p]<0x21){const v=raw[p++];out.push(v);if(inlineOperands.has(v))out.push(raw[p++]);continue;}
    let best=-1,len=1;
    for(let i=0;i<dict.length;i++)if(dict[i].length>len&&p+dict[i].length<=raw.length&&dict[i].every((v,k)=>v===raw[p+k])){best=i;len=dict[i].length;}
    if(best>=0)out.push(best+0x21);else out.push(raw[p]);p+=len;
  }
  return Uint8Array.from(out);
}
