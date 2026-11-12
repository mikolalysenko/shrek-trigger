import {encode,ONION_GLYPH} from './text.js';

// Status-screen stat names, in their native fixed-width slots.
export const statNames=[
 {stat:'Power',source:'PWR.',label:'BEEF'},
 {stat:'Speed',source:'SPD.',label:'ZOOM'},
 {stat:'Hit',source:'HIT',label:'AIM'},
 {stat:'Evade',source:'EV.',label:'SLY'},
 {stat:'Magic',source:'MAG.',label:'MOJO'},
 {stat:'Stamina',source:'STAM.',label:'LAYER'},
 {stat:'Magic Defense',source:'M DEF.',label:'EARWAX'}
];
// The "G" after an amount: status screen, save screen and the two shop panes.
const moneyLetters=[0x3fc501,0x3fc7cd,0x3fc965,0x3fc98f];
const FONT=0x3f8c60;
// A toenail clipping, eight pixels square: one curved crescent. Color 3 is
// the glyph, color 1 its shadow, as in the rest of the font.
const toenail=[
 '........',
 '3......3',
 '33....33',
 '.33..33.',
 '..3333..',
 '...11...',
 '........',
 '........'
];
export function toenailGlyph(){
 const out=new Uint8Array(16);
 toenail.forEach((row,y)=>[...row].forEach((c,x)=>{const v=c==='.'?0:Number(c);if(v&1)out[y*2]|=0x80>>x;if(v&2)out[y*2+1]|=0x80>>x;}));
 return out;
}

export function patchSwampTerms(base,add){
 // The labels follow one another in the status screen's layout string.
 let cursor=0x3fc500;
 for(const s of statNames){
  const source=encode(s.source),label=encode(s.label);
  if(label.length!==source.length)throw Error(`${s.label} does not fit the ${s.source} slot`);
  let offset=-1;
  for(let p=cursor;p<0x3fc530&&offset<0;p++)if(source.every((v,i)=>base[p+i]===v))offset=p;
  if(offset<0)throw Error('Status label moved: '+s.source);
  add(offset,label,'status screen '+s.stat+' label');cursor=offset+source.length;
 }
 for(const p of moneyLetters){
  if(base[p-2]!==0x63||base[p-1]!==0x7e||base[p]!==0xa6)throw Error('Menu money letter moved');
  add(p,Uint8Array.of(ONION_GLYPH),'menu toenail sign');
 }
 // "Found <amount>G!" after a battle.
 let found=-1;
 for(let p=0xeef00;p<0xef000;p++)if(base[p]===0x0f&&base[p+1]===0xa6&&base[p+2]===0xde&&base[p+3]===0){if(found>=0)throw Error('Battle money message is ambiguous');found=p+1;}
 if(found<0)throw Error('Battle money message moved');
 add(found,Uint8Array.of(ONION_GLYPH),'battle toenail sign');
 // The three '#' glyphs at EE, F2 and F3 are identical placeholders.
 const spare=FONT+ONION_GLYPH*16,twin=FONT+0xf3*16;
 for(let i=0;i<16;i++)if(base[spare+i]!==base[twin+i])throw Error('Spare font glyph changed');
 add(spare,toenailGlyph(),'toenail currency glyph');
 return{stats:statNames.map(s=>({stat:s.stat,label:s.label})),currency:{name:'toenails',glyph:ONION_GLYPH,menuSigns:moneyLetters.length,battleSign:found},extraVramBytes:0,extraWramBytes:0};
}
