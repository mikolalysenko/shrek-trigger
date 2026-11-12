import {u16} from '../engine/rom.js';

// Matches displayed field objects and battle slots to one native sprite bank.
// A streamed custom bank is recognized by its raw cartridge address. A stock
// bank decompresses into the native WRAM heap (7F:8000-FFFF), so its field
// objects are matched by that heap plus a palette one of its owners uses.
export function spriteSource(rom,streams,gfx){
 const stream=streams?.[gfx];
 if(stream!==undefined)return{streamed:true,field:address=>address===stream,battle:address=>address===stream};
 const heap=address=>address>=0x7f8000&&address<0x800000,palettes=new Set();
 for(let id=0;id<249;id++){const p=0x24f000+(id+7)*5;if(rom[p]===gfx)palettes.add(u16(rom,0x242a00+rom[p+2]*2));}
 for(let id=0;id<256;id++){const p=0x24f600+id*10;if(rom[p]===gfx)palettes.add(u16(rom,0x242a00+rom[p+2]*2));}
 return{streamed:false,field:(address,palette)=>heap(address)&&palettes.has(palette),battle:heap};
}
