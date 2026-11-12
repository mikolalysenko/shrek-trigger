import {u16,u24,put16,put24,fileOffset} from './rom.js';
import {compress,decompress} from './compression.js';
import {sprite,tile4bpp,snesColor} from './sprites.js';
import {encodeDialogue} from './text.js';
import {patchCaretaker} from './native-sprites.js';
import {donkeyFamilyTenants} from './donkey-family.js';
import {swampHutArt} from '../content/swamp-hut-art.js';
import {cast} from '../content/cast.js';
import {lab} from './party-palette.js';
import {overworldHeroArt} from '../content/overworld-heroes.js';

// The native overworld reloads only seven opaque colors for each hero and
// fills the rest of the object palette with magenta. Each hero gets its own
// overworld palette row, so those seven colors are chosen for the reduced art
// rather than truncated from the twelve-color field palette.
//
// Each 2x2 source block keeps its most common fill color unless at least half
// of it is line work; the silhouette then receives a one-pixel outline. The
// former reducer broke ties toward the darkest color, which turned Fiona's
// hair, Donkey and Farquaad into near-black blobs.
const overworldRoles=[[1,'idle',0],[1,'walk',1],[0,'walk',1],[0,'idle',0],[2,'idle',0],[2,'walk',0],[2,'walk',2],[1,'walk',3]];
function reduceOverworldBlock(large) {
  const out=new Uint8Array(256);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const opaque=[];
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const c=large[(y*2+dy)*32+x*2+dx];if(c)opaque.push(c);}
    if(opaque.length<2)continue;
    const fill=opaque.filter(c=>c!==1);
    if(opaque.length-fill.length>=2||!fill.length){out[y*16+x]=1;continue;}
    const votes=new Map();for(const c of fill)votes.set(c,(votes.get(c)??0)+1);
    out[y*16+x]=[...votes].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0];
  }
  const outlined=out.slice();
  for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(out[y*16+x]&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const X=x+dx,Y=y+dy;return X<0||Y<0||X>15||Y>15||!out[Y*16+X];}))outlined[y*16+x]=1;
  return outlined;
}
const overworldCache=new Map();
function overworldHero(id) {
  if(overworldCache.has(id))return overworldCache.get(id);
  const palette=cast[id].palette,colors=palette.map(lab),distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  const authored=overworldHeroArt[id];
  if(authored){
    const keep=[...new Set([1,...Object.values(authored.colors)])];
    if(keep.length>7)throw Error('Authored overworld hero uses more than seven colors');
    while(keep.length<7)keep.push(keep[keep.length-1]);
    const frames=authored.frames.map((rows,f)=>{
      if(rows.length!==16||rows.some(r=>r.length!==16))throw Error(`Overworld hero ${id} frame ${f} is not 16x16`);
      return Uint8Array.from(rows.join(''),ch=>{if(ch==='.')return 0;const c=authored.colors[ch];if(!c)throw Error('Unknown overworld color '+ch);return keep.indexOf(c)+1;});
    });
    const mirror=f=>Uint8Array.from({length:256},(_,i)=>f[(i&~15)|(15-(i&15))]);
    const hero={palette:keep.map(k=>palette[k-1]),frames,idle:[frames[3],frames[0],frames[4],mirror(frames[4])],step:[frames[2],frames[1],frames[5],mirror(frames[5])]};
    overworldCache.set(id,hero);return hero;
  }
  const reduce=([facing,pose,phase])=>reduceOverworldBlock(sprite(id,facing,pose,phase));
  const frames=overworldRoles.map(reduce),idle=[0,1,2,3].map(f=>reduce([f,'idle',0])),step=[0,1,2,3].map(f=>reduce([f,'walk',1]));
  const counts=new Array(13).fill(0);for(const f of frames)for(const c of f)counts[c]++;
  // Keep the outline plus the six colors that minimize the pixel-weighted
  // perceptual error of mapping every other used color to its nearest kept one.
  const keep=[1];
  while(keep.length<7){
    let best=0,bestError=Infinity;
    for(let c=2;c<=12;c++){
      if(keep.includes(c)||!counts[c])continue;
      let error=0;for(let i=2;i<=12;i++)if(counts[i])error+=counts[i]*Math.min(...[...keep,c].map(j=>distance(colors[i-1],colors[j-1])));
      if(error<bestError){bestError=error;best=c;}
    }
    if(!best)break;keep.push(best);
  }
  while(keep.length<7)keep.push(keep[keep.length-1]);
  const remap=new Uint8Array(13);
  for(let i=1;i<=12;i++){let bestDistance=Infinity;keep.forEach((j,n)=>{const d=distance(colors[i-1],colors[j-1]);if(d<bestDistance){bestDistance=d;remap[i]=n+1;}});}
  const map=f=>f.map(c=>c&&remap[c]);
  const hero={palette:keep.map(k=>palette[k-1]),frames:frames.map(map),idle:idle.map(map),step:step.map(map)};
  overworldCache.set(id,hero);return hero;
}

export function overworldHeroPalette(id) {return overworldHero(id).palette;}

export function overworldHeroSprite(id,facing,walking=false) {
  return overworldHero(id)[walking?'step':'idle'][facing].slice();
}

// Native overworld movement does not use the field engine's four-direction
// layout. It alternates front frames 0/1 and back frames 2/3, then cycles left
// idle/step/step frames 4/5/6. OAM mirrors those side frames for right. Frame
// 7 retains a distinct front stride in the remaining native slot.
export function overworldHeroFrame(id,frame) {
  if(!Number.isInteger(frame)||frame<0||frame>=overworldRoles.length)throw Error('Invalid overworld hero frame');
  return overworldHero(id).frames[frame].slice();
}

export function overworldPaletteBytes(id) {
  const colors=['000000',...overworldHeroPalette(id),...Array(8).fill('000000')],out=new Uint8Array(32);
  colors.forEach((c,i)=>put16(out,i*2,snesColor(c)));return out;
}

export function patchEnvironment(base,allocate,add,{allocateGraphics=allocate,allocateAssembly=allocate}={}) {
  const lz=p=>decompress(base,fileOffset(p)).bytes;
  function pointer(offset,address,label){const b=new Uint8Array(3);put24(b,0,0xc00000|address);add(offset,b,label);}
  function packet(pointerOffset,bytes,label){const address=allocate(compress(bytes),label);pointer(pointerOffset,address,label+' pointer');return address;}

  // An unused native tileset and palette isolate the home from other interiors.
  const homeTileset=55,homePalette=4;
  for(let i=0;i<512;i++)if(base[0x360001+i*14]===homeTileset||base[0x360003+i*14]===homePalette)throw Error('Swamp environment slot already in use');
  const palette=base.slice(0x3624c0+2*210,0x3624c0+3*210);
  for(let i=0;i<105;i++) {
    const c=u16(palette,i*2),r=c&31,g=c>>5&31,b=c>>10&31;
    put16(palette,i*2,Math.round(r*.72)|Math.min(31,Math.round(g*.88+r*.12))<<5|Math.round(b*.65)<<10);
  }
  const earth=['242b1c','35402a','48462c','585536','6b5e3d','82704b','a18a58','374d24','47662d','62823a','86a34b','b3bb6b','b7a16e','d2bc87','e5d5a0'];
  earth.forEach((c,i)=>put16(palette,4*30+i*2,snesColor(c)));
  add(0x3624c0+homePalette*210,palette,'swamp home palette');
  add(0x3df9c7+homePalette*2,base.slice(0x3df9c7+4,0x3df9c7+6),'swamp palette animation pointer');
  const floor=lz(u24(base,0x362220+136*3)),pixels=new Uint8Array(256);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++) {
    let color=2+((x*7+y*13)%3);
    if((x+Math.round(Math.sin(y*.55)*2))%9<2)color=5+(y%3);
    if((x*3+y*5)%19<3)color=8+(x+y)%4;
    pixels[y*16+x]=color;
  }
  for(const [tile,x,y] of [[0x24,0,0],[0x25,8,0],[0x34,0,8],[0x35,8,8]])floor.set(tile4bpp(pixels,16,x,y),tile*32);
  packet(0x362220+31*3,floor,'swamp roots and moss tiles');
  const set=base.slice(0x361c10,0x361c18);set[1]=31;
  add(0x361c00+homeTileset*8,set,'swamp home tileset');
  add(0x362100+homeTileset*3,base.slice(0x362106,0x362109),'swamp home assembly pointer');
  add(0x3df290+homeTileset*2,base.slice(0x3df294,0x3df296),'swamp home tile animation pointer');
  for(const id of [1,2]){add(0x360001+id*14,Uint8Array.of(homeTileset),'home tileset '+id);add(0x360003+id*14,Uint8Array.of(homePalette),'home palette '+id);}
  const caretaker=patchCaretaker(base,allocate,add,{tenants:donkeyFamilyTenants(base),allocateGraphics,allocateAssembly});

  // Seven player characters share eight native 16x16 object frames each.
  const player=lz(u24(base,0x6fdf0));
  for(let id=0;id<7;id++)for(let f=0;f<8;f++) {
    const small=overworldHeroFrame(id,f);
    for(let y=0;y<2;y++)for(let x=0;x<2;x++)player.set(tile4bpp(small,16,x*8,y*8),((id*2+y)*16+f*2+x)*32);
  }
  packet(0x6fdf0,player,'seven overworld hero sprites');
  const playerPalettes=lz(u24(base,0x6fea0));
  // Player OAM selects the palette row by playable ID. Only the first seven
  // opaque colors are retained by the overworld loader; the rest stay black.
  for(let id=0;id<7;id++)playerPalettes.set(overworldPaletteBytes(id),id*32);
  packet(0x6fea0,playerPalettes,'overworld hero palettes');

  // Reuse the existing house's tile footprint and palette. A cloned graphics
  // chunk changes only the present-day world and uses the original VRAM budget.
  const house=lz(u24(base,0x6fe20+5*3));
  // Shrek's swamp home: generated mossy stump hut (assets/imagegen/swamp-hut,
  // scripts/import-swamp-hut-art.mjs), indexed in world palette row 3.
  const hut=new Uint8Array(32*32);
  swampHutArt.rows.forEach((row,y)=>{for(let x=0;x<32;x++)hut[y*32+x]=parseInt(row[x],16);});
  const assembly=lz(u24(base,0x6ff00));
  for(const [metatile,mx,my]of [[0x9d,0,0],[0x9e,16,0],[0xad,0,16],[0xae,16,16]])for(let c=0;c<4;c++) {
    const w=u16(assembly,metatile*8+c*2),tile=w&1023;
    if(tile===0)continue;
    if(tile<640||tile>=768||(w&0xc000))throw Error('Unexpected home world tile layout');
    house.set(tile4bpp(hut,32,mx+(c%2)*8,my+(c>>1)*8),(tile-640)*32);
    // Row 5 (shared with buildings) has no mossy greens; row 3 holds the map's
    // foliage colors. Only these four metatiles of the present-day map change.
    put16(assembly,metatile*8+c*2,(w&~0x1c00)|swampHutArt.paletteRow<<10);
  }
  packet(0x6ff00,assembly,'present-day world assembly with swamp home palette');
  const houseAddress=allocate(compress(house),'overworld swamp hut graphics');
  const table=new Uint8Array(43*3);table.set(base.slice(0x6fe20,0x6fe20+42*3));put24(table,42*3,0xc00000|houseAddress);
  const tableAddress=allocate(table,'expanded overworld graphics pointer table');
  for(const instruction of [0x227fc,0x22805,0x2283f,0x22848,0x2291b,0x22924,0x27b0b,0x27b14]) {
    const old=u24(base,instruction+1),delta=old-0xc6fe20;
    if(base[instruction]!==0xbf||![0,2].includes(delta))throw Error('Overworld loader signature mismatch');
    pointer(instruction+1,tableAddress+delta,'world graphics loader '+instruction.toString(16));
  }
  add(0x6fd10+5,Uint8Array.of(42),'present-day swamp hut graphics selection');
  const nameAddress=0x60000+u16(base,0x6f406),name=encodeDialogue('Swamp{null}',base);
  if(name.length>u16(base,0x6f408)-(nameAddress&65535))throw Error('World name exceeds original allocation');
  add(nameAddress,name,'overworld Swamp entrance label');
  return {homeLocations:[1,2],homeTileset,homePalette,caretaker,overworldHeroes:7,overworldHouse:true,collision:'original',extraVramBytes:0,extraWramBytes:0};
}
