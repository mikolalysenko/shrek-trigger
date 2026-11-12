import {customFutureMachines as futureMachines,supplyKeeper,stockMachineGraphics} from '../content/future-machines.js';
import {futureMachineSprite,futureMachineFrames,supplyKeeperBackground,supplyKeeperFrame} from './future-machine-art.js';
import {compileSpriteFrames,spriteHeaders} from './native-sprites.js';
import {compress,decompress} from './compression.js';
import {encode} from './text.js';
import {u16,u24,put16,put24,fileOffset} from './rom.js';
import {snesColor,tile4bpp} from './sprites.js';

// This is an ordinary location background, not an enlarged OBJ sprite.
// The source map's tile and collision stream is read for ownership validation;
// its bytes, scrolling program and reveal choreography remain untouched.
export function keeperBackgroundLayout(base){
  const b=supplyKeeper.background,tileset=base.slice(0x361c00+b.tileset*8,0x361c00+(b.tileset+1)*8);
  if(tileset[3]!==b.graphics)throw Error('Supply keeper background bank changed');
  for(let i=0;i<64;i++)if(i!==b.tileset&&base.slice(0x361c00+i*8,0x361c00+(i+1)*8).includes(b.graphics))throw Error('Supply keeper background bank is shared');
  for(let i=0;i<512;i++)if(base[0x360001+i*14]===b.tileset||base[0x360003+i*14]===b.palette){
    if(!b.locations.includes(i)||u16(base,0x360004+i*14)!==b.maps[b.locations.indexOf(i)])throw Error('Supply keeper location ownership changed');
  }
  const map=decompress(base,fileOffset(u24(base,0x361e00+b.map*3))).bytes;
  if(map[0]!==0x44||map[1]!==0)throw Error('Supply keeper map dimensions changed');
  const asm=decompress(base,fileOffset(u24(base,0x362100+b.tileset*3))).bytes,props=[];
  for(let p=1030;p<map.length;){
    const flags=map[p];p+=3;const count=flags&128?map[p++]||256:1;
    for(let i=0;i<count;i++)props.push(flags);
  }
  if(props.length!==512)throw Error('Supply keeper map properties changed');
  const cells=[];
  for(let layer=0;layer<2;layer++)for(let y=0;y<32;y++)for(let x=0;x<16;x++){
    const id=map[6+layer*512+y*16+x]+((props[y*16+x]&(1<<layer))?256:0);
    for(let c=0;c<4;c++){
      const word=u16(asm,id*8+c*2),tile=word&1023,palette=word>>10&7;
      if(palette===6&&tile!==256&&(tile<640||tile>=768))throw Error('Supply keeper palette is used outside its body');
      if(tile<640||tile>=768)continue;
      if(layer!==0||palette!==6||word&0x8000)throw Error('Unexpected supply keeper background tile');
      cells.push({x:x*16+(c%2)*8-b.x,y:y*16+(c>>1)*8-b.y,tile:tile-640,mirror:!!(word&0x4000)});
    }
  }
  if(cells.length!==200||cells.some(c=>c.x<0||c.y<0||c.x+8>b.width||c.y+8>b.height))throw Error('Supply keeper background footprint changed');
  return cells;
}

export function compileKeeperBackground(base){
  const b=supplyKeeper.background,cells=keeperBackgroundLayout(base),pixels=supplyKeeperBackground(),coverage=new Uint8Array(pixels.length),tiles=new Map();
  const source=decompress(base,fileOffset(u24(base,0x362220+b.graphics*3))).bytes;
  if(source.length!==4096)throw Error('Supply keeper background graphics length changed');
  const graphics=source.slice();
  for(const c of cells){
    const tilePixels=new Uint8Array(64);
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){
      const at=(c.y+y)*b.width+c.x+x;coverage[at]=1;tilePixels[y*8+(c.mirror?7-x:x)]=pixels[at];
    }
    const tile=tile4bpp(tilePixels,8,0,0),old=tiles.get(c.tile);
    if(old&&!old.every((v,i)=>v===tile[i]))throw Error('Supply keeper artwork breaks shared tile '+c.tile);
    tiles.set(c.tile,tile);graphics.set(tile,c.tile*32);
  }
  const outside=[];for(let i=0;i<pixels.length;i++)if(pixels[i]&&!coverage[i])outside.push([i%b.width,Math.floor(i/b.width)]);
  if(outside.length)throw Error('Supply keeper pixels outside native background cells: '+JSON.stringify(outside.slice(0,16))+' ('+outside.length+' total)');
  return {graphics,cells,tiles:tiles.size};
}

export function patchFutureMachines(base,allocate,add,{streamedGraphics=new Set()}={}){
  const keeper=!stockMachineGraphics.has(supplyKeeper.gfx);
  const headers=spriteHeaders(base),actors=[...futureMachines,...(keeper?[supplyKeeper]:[])],groups=new Map(),result=[];
  const pointer=(table,id,address,label)=>{const p=new Uint8Array(3);put24(p,0,0xc00000|address);add(table+id*3,p,label);};
  for(const a of actors){
    const h=0x24f600+a.enemy*10;
    if(![a.gfx,a.asm,a.palette,a.animation,a.size].every((v,i)=>base[h+i]===v))throw Error('Future machine header changed: '+a.key);
    for(const id of a.npcs??[]){
      const p=0x24f000+(id+7)*5;
      if(![a.gfx,a.asm,a.palette,a.npcAnimations?.[id]??a.npcAnimation??a.animation,a.size].every((v,i)=>base[p+i]===v))throw Error('Future machine NPC header changed: '+id);
    }
    const owners=actors.filter(o=>o.gfx===a.gfx&&o.asm===a.asm),owns=h=>h.kind==='enemy'?owners.some(a=>a.enemy===h.id):owners.some(a=>a.npcs?.includes(h.id));
    for(const[field,value]of[[0,a.gfx],[1,a.asm]])if(headers.some(h=>base[h.offset+field]===value&&!owns(h)))throw Error('Future machine bank has another owner');
    if(!groups.has(a.gfx)){
      const frames=a===supplyKeeper?Array.from({length:4},(_,f)=>supplyKeeperFrame(f)):futureMachineFrames[a.art].map((_,f)=>futureMachineSprite(a.art,f));
      const compiled=compileSpriteFrames(frames,a),cells=compiled.assembly.length/a.frames/10;
      if(a.anchor||a.frameOffsets)for(let f=0;f<a.frames;f++)for(let c=0;c<cells;c++)for(let axis=0;axis<2;axis++)compiled.assembly[f*cells*10+cells*8+c*2+axis]+=(a.anchor?.[axis]??0)+(a.frameOffsets?.[f]?.[axis]??0);
      const sourceGraphicsBytes=decompress(base,fileOffset(u24(base,0x242000+a.gfx*3))).bytes.length,streamed=streamedGraphics.has(a.gfx);
      if(streamed&&(a.size&3)===3)throw Error('Unsupported streamed machine size');
      if(!streamed&&compiled.graphics.length>sourceGraphicsBytes)throw Error('Future machine exceeds its original decoded graphics budget');
      const g=allocate(compress(compiled.graphics),a.name+' compressed graphics'),s=allocate(compiled.assembly,a.name+' native frames');
      pointer(0x242000,a.gfx,g,a.name+' graphics pointer');pointer(0x242300,a.asm,s,a.name+' assembly pointer');
      groups.set(a.gfx,{cells,sourceGraphicsBytes,graphicsStorage:streamed?'direct-rom':'decompressed-heap',graphicsBytes:compiled.graphics.length,assemblyBytes:compiled.assembly.length,graphicsOffset:g,assemblyOffset:s,tiles:compiled.tiles});
    }
    add(0xc6500+a.enemy*11,encode(a.short,{length:11}),a.name+' battle name');result.push({...a,...groups.get(a.gfx)});
  }
  for(const palette of new Set(actors.map(a=>a.palette))){
    const owners=actors.filter(a=>a.palette===palette),a=owners[0],p=u16(base,0x242a00+palette*2);
    if(headers.some(h=>base[h.offset+2]===palette&&!(h.kind==='enemy'?owners.some(a=>a.enemy===h.id):owners.some(a=>a.npcs?.includes(h.id)))))throw Error('Future machine palette has another owner');
    for(let id=0;id<256;id++)if(id!==palette&&u16(base,0x242a00+id*2)===p)throw Error('Future machine palette pointer is aliased');
    const colors=new Uint8Array(24);a.colors.forEach((c,i)=>put16(colors,i*2,snesColor(c)));add(0x240000+p,colors,a.name+' palette');
  }
  // A stock Guardian keeps its original background body, graphics and palette.
  if(!keeper)return {actors:result,stockRestored:[...stockMachineGraphics],background:null,extraVramBytes:0,extraWramBytes:0};
  const b=supplyKeeper.background,background=compileKeeperBackground(base),offset=allocate(compress(background.graphics),'Supply Keeper background graphics');
  pointer(0x362220,b.graphics,offset,'Supply Keeper background graphics pointer');
  const colors=new Uint8Array(30);[...supplyKeeper.colors,'adb59a','70554c','fff0c4'].forEach((c,i)=>put16(colors,i*2,snesColor(c)));
  // Location sets supply CGRAM banks 1..7; bank zero belongs to the UI.
  add(0x3624c0+b.palette*210+5*30,colors,'Supply Keeper background palette');
  return {actors:result,stockRestored:[...stockMachineGraphics],background:{...b,graphicsOffset:offset,graphicsBytes:4096,cells:background.cells.length,uniqueTiles:background.tiles},extraVramBytes:0,extraWramBytes:0};
}
