// Read-only helpers for auditing the fingerprinted source cartridge. Decoded
// source prose stays in ignored .local reports; the repository stores offsets
// and authored replacements, not a copy of the original dialogue.
import {dialogueLength} from './text.js';

export function sourceDictionary(base) {
  const dictionary=[];
  for(let i=0;i<127;i++){
    const address=0x1e0000+(base[0x1efa00+i*2]|base[0x1efa01+i*2]<<8);
    dictionary.push(base.subarray(address+1,address+1+base[address]));
  }
  return dictionary;
}

export function sourceHasLetters(bytes,dictionary=sourceDictionary(bytes)) {
  function letters(code,seen=new Set()) {
    if(code>=0xa0&&code<0xd4)return true;
    if(code<0x21||code>0x9f||seen.has(code))return false;
    seen.add(code);return dictionary[code-0x21].some(c=>letters(c,seen));
  }
  for(let p=0;p<bytes.length;){
    const code=bytes[p++];if(code===0)return false;
    if([1,2,3,18].includes(code)){const operand=bytes[p++];if(code===3&&operand===0)return false;}
    else if(letters(code))return true;
  }
  return false;
}

const symbols=['!','?','/','“','”',':','&','(',')',"'",'.',',','=','-','+','%','♪',' ','♥','…'];
const controls={5:'\n',6:'\n',9:'{instant}',10:'{page3}',11:'{full}',12:'{page}',13:'{value 8}',14:'{value 16}',15:'{value 24}',19:'{shrek}',20:'{fiona}',21:'{donkey}',22:'{pinocchio}',23:'{puss}',24:'{mongo}',25:'{farquaad}',26:'{mongo}',27:'{pc1}',28:'{pc2}',29:'{pc3}',30:'{fiona}',31:'{item}',32:'{dragon}'};

// Expand dictionary references recursively: a small number of source entries
// refer to earlier entries rather than directly to glyphs.
export function decodeSourceDialogue(base,address) {
  const dictionary=sourceDictionary(base),length=dialogueLength(base,address);
  function glyph(code,seen=new Set()) {
    if(code>=0xa0&&code<0xba)return String.fromCharCode(code-0xa0+65);
    if(code>=0xba&&code<0xd4)return String.fromCharCode(code-0xba+97);
    if(code>=0xd4&&code<0xde)return String.fromCharCode(code-0xd4+48);
    if(code>=0xde)return symbols[code-0xde]??`{${code.toString(16).padStart(2,'0')}}`;
    if(code>=0x21&&code<=0x9f){
      if(seen.has(code))throw Error('Recursive source dictionary entry '+code.toString(16));
      seen.add(code);return [...dictionary[code-0x21]].map(c=>glyph(c,seen)).join('');
    }
    return `{${code.toString(16).padStart(2,'0')}}`;
  }
  let out='';
  for(let p=address;p<address+length;){
    const code=base[p++];
    if(code===0){out+='{null}';break;}
    if(code===3){const ticks=base[p++];out+=`{delay ${ticks}}`;if(ticks===0){out+='{null}';break;}continue;}
    if([1,2,18].includes(code)){out+=`{${code.toString(16)} ${base[p++].toString(16)}}`;continue;}
    out+=code<0x21?(controls[code]??`{${code.toString(16).padStart(2,'0')}}`):glyph(code);
  }
  return out;
}
