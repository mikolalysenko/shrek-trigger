import {nativeRoutine} from './asm.js';
import {put24} from './rom.js';
import {cartridgeDataAddress} from './expanded-rom.js';

// Puss's Milk and Milk 2 keep Water and Water II's complete scenes, damage,
// element, targets and MP. Only their colors change: engine/tech-themes.js
// gives both the 'milk' theme (milk-white copies of the effect palette
// tables); this module converts the colors cached before the cast and evens
// out Milk 2's fade. Each color becomes a creamy white of the same
// brightness, (v, v, v-1) with v = max(r, g, b), so shading survives.
export const milkTechs={35:{name:'Milk',short:'Milk'},38:{name:'Milk 2',short:'Milk 2'}};

// C1:5B1F (TDC; JMP $75BB) follows the copy of the cached droplet colors
// (7E:9F99 and 9FA7) into OBJ palettes 0 and 4. That cache can be filled
// before the cast, so the copied entries are converted in place here.
const CACHE_HOOK=0x15b1f,CACHE_EXPECTED=[0x7b,0x4c,0xbb,0x75];
export const milkCacheRanges=[[0x2300,0x2308],[0x2380,0x2388]];
// CC:F26C (INC $80; LDA $80) ends the effect palette loader that runs
// throughout the cast; the cached OBJ palette 4 colors are converted there.
const LOADER_HOOK=0xccf26c-0xc00000,LOADER_EXPECTED=[0xe6,0x80,0xa5,0x80];
// FD:E5EB (SEP #$20; LDA $0526,Y) selects each palette fade's channel mode.
// Water II fades the scene through a blue-weighted mode; Milk 2 uses mode 0,
// which scales red, green and blue evenly, so the scene dims without a tint.
const FADE_HOOK=0x3de5eb,FADE_EXPECTED=[0xe2,0x20,0xb9,0x26,0x05];
export function milkColor(c){
 const r=c&31,g=c>>5&31,b=c>>10&31,v=Math.max(r,g,b);
 return v|v<<5|Math.max(v-1,0)<<10;
}

function gate(a,fail,pass){
 a.emit(0xaf,0x17,0x01,0x7e,0x29,0x01);a.branch(0xf0,fail);   // in battle
 a.emit(0xaf,0x92,0xae,0x7e,0xc9,0x02);a.branch(0xd0,fail);   // a tech action
 a.emit(0xaf,0x91,0xae,0x7e,0xc9,0x03);a.branch(0xb0,fail);   // by a party member
 a.emit(0xaf,0x93,0xae,0x7e,0xc9,35);a.branch(0xf0,pass);
 a.emit(0xc9,38);a.branch(0xf0,pass);
}
function colorLoop(a,n,start,end){
 a.emit(0xa2,start&255,start>>8);a.label('loop'+n);
 a.emit(0xbf,0x00,0x00,0x7e);                                  // LDA 7E:0000,X
 a.emit(0x48,0x29,0x1f,0x00,0x48);                             // PHA; AND #$1F; PHA      [r][c]
 a.emit(0xa3,0x03,0x4a,0x4a,0x4a,0x4a,0x4a,0x29,0x1f,0x00);    // g
 a.emit(0xc3,0x01);a.branch(0x90,'g'+n);a.emit(0x83,0x01);a.label('g'+n);
 a.emit(0xa3,0x03,0xeb,0x29,0xff,0x00,0x4a,0x4a,0x29,0x1f,0x00); // b
 a.emit(0xc3,0x01);a.branch(0x90,'b'+n);a.emit(0x83,0x01);a.label('b'+n);
 a.emit(0x68,0x48);                                            // v (keep a copy) [v][c]
 a.emit(0x0a,0x0a,0x0a,0x0a,0x0a,0x03,0x01,0x83,0x03);         // c := v<<5 | v
 a.emit(0xa3,0x01);a.branch(0xf0,'z'+n);a.emit(0x3a);a.label('z'+n); // v-1, floored at 0
 a.emit(0x0a,0x0a,0xeb,0x29,0x00,0x7c,0x03,0x03);              // (v-1)<<10 | c
 a.emit(0x9f,0x00,0x00,0x7e,0x68,0x68);                        // STA 7E:0000,X; drop both
 a.emit(0xe8,0xe8,0xe0,end&255,end>>8);a.branch(0xd0,'loop'+n);
}
// Convert palette entries in place during a Milk cast, then run the native
// instructions this hook displaced (`tail`, which also returns or jumps).
export function postRoutine(ranges,tail){
 return nativeRoutine(a=>{
  a.emit(0x08,0xc2,0x30,0xda,0x5a,0xe2,0x20);                  // PHP; REP #$30; PHX; PHY; SEP #$20
  gate(a,'done','milk');
  a.label('done');a.emit(0xc2,0x30,0x7a,0xfa,0x28,...tail);    // PLY; PLX; PLP; native tail
  a.label('milk');a.emit(0xc2,0x30);
  ranges.forEach(([start,end],n)=>colorLoop(a,n,start,end));
  a.longBranch('done');
 });
}
export function fadeRoutine(){
 return nativeRoutine(a=>{
  a.emit(0xe2,0x20,0x08);                       // SEP #$20; PHP (keep carry for the caller)
  gate(a,'native','milk');
  a.label('native');a.emit(0x28,0xb9,0x26,0x05,0x6b); // PLP; LDA $0526,Y; RTL
  a.label('milk');a.emit(0x28,0xa9,0x00,0x6b);        // PLP; LDA #0 (even fade); RTL
 });
}
export function patchMilk(base,allocate,add){
 // The palette loads themselves are themed by engine/tech-themes.js ('milk').
 const hooks=[];
 if(!CACHE_EXPECTED.every((v,i)=>base[CACHE_HOOK+i]===v))throw Error('Milk cached palette copy changed');
 const cache=postRoutine(milkCacheRanges,[0x7b,0x5c,0xbb,0x75,0xc1]),cacheAddress=allocate(cache,'Milk cached droplet colors'),jump=new Uint8Array(4);
 jump[0]=0x5c;put24(jump,1,cartridgeDataAddress(cacheAddress));add(CACHE_HOOK,jump,'Milk cached droplet colors hook');
 hooks.push({offset:CACHE_HOOK,address:cacheAddress,ranges:milkCacheRanges});
 if(!LOADER_EXPECTED.every((v,i)=>base[LOADER_HOOK+i]===v))throw Error('Milk effect palette loader end changed');
 const after=postRoutine([[0x2382,0x2388]],[0xe6,0x80,0xa5,0x80,0x6b]),afterAddress=allocate(after,'Milk loader droplet colors'),afterCall=new Uint8Array(4);
 afterCall[0]=0x22;put24(afterCall,1,cartridgeDataAddress(afterAddress));add(LOADER_HOOK,afterCall,'Milk loader droplet colors hook');
 hooks.push({offset:LOADER_HOOK,address:afterAddress,ranges:[[0x2382,0x2388]]});
 if(!FADE_EXPECTED.every((v,i)=>base[FADE_HOOK+i]===v))throw Error('Milk fade mode selection changed');
 const fade=fadeRoutine(),fadeAddress=allocate(fade,'Milk even palette fade'),fadeCall=Uint8Array.of(0x22,0,0,0,0xea);
 put24(fadeCall,1,cartridgeDataAddress(fadeAddress));add(FADE_HOOK,fadeCall,'Milk fade mode hook');
 hooks.push({offset:FADE_HOOK,address:fadeAddress});
 return{techs:[35,38],names:['Milk','Milk 2'],hooks,damage:'source Water/Water II',element:'Water',extraVramBytes:0,extraWramBytes:0};
}
