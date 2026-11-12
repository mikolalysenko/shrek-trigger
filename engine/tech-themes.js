import {nativeRoutine} from './asm.js';
import {put24} from './rom.js';
import {cartridgeDataAddress} from './expanded-rom.js';
import {milkColor} from './milk.js';

// Technique color themes. While a party technique with a theme is the active
// action, the native effect palette loaders read a recolored copy of their
// bank D1 tables; at any other time (and for enemies) they read the originals.
// Shapes, timing, damage and every other native record are unchanged.

const rgb=c=>[c&31,c>>5&31,c>>10&31];
const pack=([r,g,b])=>Math.round(r)|Math.round(g)<<5|Math.round(b)<<10;
function hsv([r,g,b]){const v=Math.max(r,g,b),m=Math.min(r,g,b),d=v-m,s=v?d/v:0;let h=0;
 if(d){if(v===r)h=((g-b)/d)%6;else if(v===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;}return[h,s,v];}
function fromHsv(h,s,v){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
 const [r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return[r+m,g+m,b+m];}
// Keep each color's brightness and shading; move its hue to the theme.
const hue=(target,{sat=1,minSat=0,lift=0}={})=>c=>{
 const [,s,v]=hsv(rgb(c));if(s<.08)return c&0x7fff; // whites, grays and blacks stay neutral
 const ns=Math.min(1,Math.max(minSat,s*sat)),nv=Math.min(31,v+lift*(31-v));return pack(fromHsv(target,ns,nv));
};
export const themeColors={
 milk:milkColor,
 swamp:hue(95,{sat:1,minSat:.45}),     // ogre green
 pink:hue(328,{sat:.9,minSat:.35}),    // Fiona and Dragon pink
 gold:hue(40,{sat:1,minSat:.5}),       // waffle gold and butter
 royal:hue(285,{sat:1,minSat:.45}),    // Farquaad violet
 wood:hue(28,{sat:.7,minSat:.35}),     // puppet pine
 fairy:hue(255,{sat:.8,minSat:.3,lift:.15}), // wish-star violet blue
 onion:hue(300,{sat:.85,minSat:.4}),   // onion purple
 icing:hue(345,{sat:.35,minSat:.15,lift:.35}) // sugar-frosting rose white
};

// Native loaders: LDA long,X from the bank D1 effect palette tables. Each
// 4-byte load becomes a JSL of the same length.
export const themeLoads=[
 {offset:0x15d50,table:0x114100},{offset:0x15d7e,table:0x114400},   // C1 effect palettes
 {offset:0xcf243,table:0x114100},{offset:0xcf25f,table:0x114400},   // CC effect palettes
 {offset:0x15e32,table:0x114d90},{offset:0x15e66,table:0x114d90},   // C1 droplet and spark gradients
 {offset:0xce739,table:0x114b00},{offset:0xcef09,table:0x114d80},   // CC sparkle and cached effect colors
 {offset:0xd1013,table:0x116002},{offset:0xd103b,table:0x116002}    // CD background palettes
];
export const themeRegions=[{start:0x114100,end:0x114f00},{start:0x116000,end:0x116800}];

export function themeTable(base,{start,end},color){
 const out=base.slice(start,end);
 for(let i=0;i+1<out.length;i+=2){const c=out[i]|out[i+1]<<8;if(c&0x8000)continue;const m=color(c);out[i]=m&255;out[i+1]=m>>8;}
 return out;
}

function loadRoutine(original,lookup,copies){
 const long=(a,op,p)=>a.emit(op,p&255,p>>8&255,p>>16&255);
 return nativeRoutine(a=>{
  a.emit(0x08,0xe2,0x20);                                         // PHP; SEP #$20
  a.emit(0xaf,0x17,0x01,0x7e,0x29,0x01);a.branch(0xf0,'native'); // in battle
  a.emit(0xaf,0x92,0xae,0x7e,0xc9,0x02);a.branch(0xd0,'native'); // a tech action
  a.emit(0xaf,0x91,0xae,0x7e,0xc9,0x03);a.branch(0xb0,'native'); // by a party member
  a.emit(0xda,0xc2,0x20,0xaf,0x93,0xae,0x7e,0x29,0xff,0x00,0xaa,0xe2,0x20); // PHX; tech -> X
  long(a,0xbf,lookup);a.emit(0xfa);                               // LDA theme[tech],X; PLX
  copies.forEach((_,n)=>{a.emit(0xc9,n+1);a.branch(0xf0,'theme'+n);});
  a.label('native');a.emit(0x28);long(a,0xbf,original);a.emit(0x6b);
  copies.forEach((copy,n)=>{a.label('theme'+n);a.emit(0x28);long(a,0xbf,copy);a.emit(0x6b);});
 });
}

// assignments: {techId: themeName}
export function patchTechThemes(base,allocate,add,assignments,allocateData=allocate){
 const names=[...new Set(Object.values(assignments))].sort();
 for(const n of names)if(!themeColors[n])throw Error('Unknown technique theme '+n);
 const lookup=new Uint8Array(256);
 for(const[id,name]of Object.entries(assignments))lookup[+id]=names.indexOf(name)+1;
 const lookupAddress=allocateData(lookup,'Technique theme lookup');
 const copies=names.map(name=>themeRegions.map(r=>({...r,address:allocateData(themeTable(base,r,themeColors[name]),`${name} theme palettes ${r.start.toString(16)}`)})));
 const hooks=[];
 for(const load of themeLoads){
  const original=0xc00000|load.table;
  if(base[load.offset]!==0xbf||(base[load.offset+1]|base[load.offset+2]<<8|base[load.offset+3]<<16)!==original)throw Error('Technique theme palette load changed at '+load.offset.toString(16));
  const themed=copies.map(regions=>{const r=regions.find(r=>load.table>=r.start&&load.table<r.end);return cartridgeDataAddress(r.address)+(load.table-r.start);});
  const code=loadRoutine(original,cartridgeDataAddress(lookupAddress),themed),address=allocate(code,'Technique theme load '+load.offset.toString(16));
  const call=new Uint8Array(4);call[0]=0x22;put24(call,1,cartridgeDataAddress(address));add(load.offset,call,'Technique theme load hook');
  hooks.push({offset:load.offset,address,table:load.table});
 }
 return{themes:names,assignments,lookup:lookupAddress,hooks,bytesPerTheme:themeRegions.reduce((n,r)=>n+r.end-r.start,0),extraVramBytes:0,extraWramBytes:0};
}
