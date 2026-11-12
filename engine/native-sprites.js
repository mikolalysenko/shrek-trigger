import {tile4bpp,paletteBytes,internSpriteTile,snesColor} from './sprites.js';
import {put16,put24,u16,u24,fileOffset} from './rom.js';
import {compress,decompress} from './compression.js';
import {cartridgeDataAddress} from './expanded-rom.js';
import {rasterArt,rasterArtInfo} from './raster-art.js';
import {caretaker,onionJar,caretakerFrames} from '../content/caretaker.js';
import {onionJarArt} from '../content/onion-jar-art.js';

// The cartridge assembler stores upper/lower tile pairs for each group,
// followed by signed XY offsets for all 16x16 cells. Tile zero stays blank.
export function compileSpriteFrames(frames,{width=32,height=32,size=0,cellOrigins,frameCellOrigins,cellOverlapFrames=[]}={}) {
  const groups=size&2?3:1,cellsPerGroup=size&1?8:4,cells=groups*cellsPerGroup;
  if(width%16||height%16||(!cellOrigins&&!frameCellOrigins&&width*height!==cells*256))throw Error('Sprite dimensions do not match native cell budget');
  if(frameCellOrigins&&(cellOrigins||!Array.isArray(frameCellOrigins)||frameCellOrigins.length!==frames.length))throw Error('Invalid per-frame native sprite cells');
  if(!Array.isArray(cellOverlapFrames)||new Set(cellOverlapFrames).size!==cellOverlapFrames.length||cellOverlapFrames.some(f=>!Number.isInteger(f)||f<0||f>=frames.length)||cellOverlapFrames.length&&!frameCellOrigins)throw Error('Invalid native cell overlap selection');
  // A native assembly can place the same fixed cell reservation differently
  // in each pose. Wide sword sweeps and tall overhead poses need no new VRAM.
  const originSets=frameCellOrigins??[cellOrigins??Array.from({length:cells},(_,c)=>[c%(width/16)*16,Math.floor(c/(width/16))*16])];
  const coverages=originSets.map((origins,frame)=>{
    if(!Array.isArray(origins)||origins.length!==cells||origins.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isInteger(v))||p[0]<0||p[1]<0||p[0]+16>width||p[1]+16>height))throw Error('Invalid native sprite cell origins');
    const coverage=new Uint8Array(width*height);
    for(const[x,y]of origins)for(let j=0;j<16;j++)for(let i=0;i<16;i++){const p=(y+j)*width+x+i;if(coverage[p]++&&!cellOverlapFrames.includes(frame))throw Error('Native sprite cells overlap');}
    if(cellOverlapFrames.includes(frame)&&!coverage.some(n=>n>1))throw Error('Selected native frame has no cell overlap');
    return coverage;
  });
  const tiles=[new Uint8Array(32)],indices=new Map([[Array(32).fill(0).join(','),0]]),assembly=new Uint8Array(frames.length*cells*10);
  for(let f=0;f<frames.length;f++) {
    const origins=originSets[frameCellOrigins?f:0],coverage=coverages[frameCellOrigins?f:0];
    const pixels=frames[f];if(pixels.length!==width*height||pixels.some(c=>c>12))throw Error('Sprite exceeds twelve-color native palette');
    if(pixels.some((c,i)=>c&&!coverage[i]))throw Error('Opaque pixel lies outside native sprite cells');
    for(let group=0;group<groups;group++)for(let row=0;row<2;row++)for(let c=0;c<cellsPerGroup;c++)for(let col=0;col<2;col++) {
      const cell=group*cellsPerGroup+c,[x,y]=origins[cell];
      const tile=tile4bpp(pixels,width,x+col*8,y+row*8);
      put16(assembly,f*cells*10+group*cellsPerGroup*8+row*cellsPerGroup*4+c*4+col*2,internSpriteTile(tile,tiles,indices));
    }
    for(let c=0;c<cells;c++)assembly.set([(origins[c][0]-width/2)&255,(origins[c][1]-height)&255],f*cells*10+cells*8+c*2);
  }
  if(tiles.length>1024)throw Error('Sprite exceeds native tile-index range');
  return {graphics:Uint8Array.from(tiles.flatMap(t=>Array.from(t))),assembly,tiles:tiles.length,frames:frames.length};
}

// Nobody is drawn for the empty-house actor; every role is a blank frame.
export function caretakerSprite() {return new Uint8Array(32*32);}
export function onionJarSprite() {
  const pixels=Uint8Array.from(onionJarArt.rows.join(''),ch=>parseInt(ch,16));
  if(onionJarArt.rows.length!==32||pixels.length!==1024||onionJarArt.palette.length!==12)throw Error('Onion jar art is not one native 32x32 frame');
  return pixels;
}

function installActor(base,allocate,add,actor,frames,colors,label,row,{tenants=[],allocateGraphics=allocate,allocateAssembly=allocate}={}) {
  const {gfx,asm,palette:pal,npcs}=actor;
  assertUnusedSpriteSlot(base,0,gfx);assertUnusedSpriteSlot(base,1,asm);assertUnusedPalette(base,pal);
  const pointer=(table,id,offset,name)=>{const b=new Uint8Array(3);put24(b,0,cartridgeDataAddress(offset));add(table+id*3,b,name);};
  const paint=(id,list,name)=>{const bytes=new Uint8Array(24);if(list.length!==12)throw Error(name+' requires exactly twelve opaque colors');list.forEach((c,i)=>put16(bytes,i*2,snesColor(c)));add(0x240000+u16(base,0x242a00+id*2),bytes,name);};
  // Tenants are other four-cell actors drawn from the same graphics bank,
  // each with its own assembly. Tile indices are renumbered into one shared
  // dictionary; the host's frames keep their pixels. A bank with tenants and
  // their assemblies go where the caller's allocators put them (extended
  // data, in the expanded cartridge); the host's assembly stays where it was.
  const own=compileSpriteFrames(frames),lodgers=tenants.map(t=>compileSpriteFrames(t.frames)),merged=tenants.length?mergeSpriteBanks([own,...lodgers]):null;
  const compiled=merged?{...own,graphics:merged.graphics,assembly:merged.assemblies[0],tiles:merged.tiles}:own;
  pointer(0x242000,gfx,(merged?allocateGraphics:allocate)(compress(compiled.graphics),label+' compressed NPC graphics',gfx),label+' graphics pointer');
  pointer(0x242300,asm,allocate(compiled.assembly,label+' native NPC animation frames'),label+' assembly pointer');
  paint(pal,colors,label+' private palette');
  for(const id of npcs)add(0x24f000+(id+7)*5,Uint8Array.of(gfx,asm,pal,...row),label+' actor '+id);
  const claimed=new Set([asm]),painted=new Set([pal]);
  compiled.tenants=tenants.map((t,i)=>{
    const a=t.actor;
    if(a.gfx!==gfx||a.size!==0||t.frames.length!==a.frames||claimed.has(a.asm))throw Error(t.label+' cannot share graphics bank '+gfx);
    assertUnusedSpriteSlot(base,1,a.asm);claimed.add(a.asm);
    pointer(0x242300,a.asm,allocateAssembly(merged.assemblies[i+1],t.label+' native NPC animation frames'),t.label+' assembly pointer');
    // A tenant either owns an unused palette or is drawn in a stock palette
    // that it leaves untouched (colors: null).
    if(t.colors){if(painted.has(a.palette))throw Error(t.label+' palette is already claimed');assertUnusedPalette(base,a.palette);painted.add(a.palette);paint(a.palette,t.colors,t.label+' private palette');}
    for(const id of a.npcs)add(0x24f000+(id+7)*5,Uint8Array.of(gfx,a.asm,a.palette,...t.row),t.label+' actor '+id);
    return {key:a.key,name:a.name,npcIds:a.npcs,sourceNpc:a.sourceNpc,frames:a.frames,frameMap:a.frameMap,gfx,asm:a.asm,palette:a.palette,stockPalette:!t.colors,colors:t.colors??undefined,assemblyBytes:merged.assemblies[i+1].length,
      rasterCoverage:{rasterFrames:a.frameMap.filter(r=>r.pose!=='blank').length,proceduralFrames:0,blankFrames:a.frameMap.filter(r=>r.pose==='blank').length,sources:t.provenance??[]}};
  });
  return compiled;
}

export function patchCaretaker(base,allocate,add,{tenants=[],allocateGraphics=allocate,allocateAssembly=allocate}={}) {
  // Crono's mother shares graphics, assembly and NPC 37 with ordinary
  // townswomen, so NPC 37 is left alone. Her rooms load two private actors
  // instead: an empty one and the onion jar (content/caretaker.js). The empty
  // actor's frames only use the blank tile zero, so its graphics bank also
  // carries Donkey's family (content/donkey-family.js) as tenants.
  const mother=base.subarray(0x24f000+(37+7)*5,0x24f000+(37+7)*5+5),row=[mother[3],mother[4]];
  if(mother[0]!==0x24||mother[1]!==0x19)throw Error('Native mother actor changed');
  const blank=installActor(base,allocate,add,caretaker,caretakerFrames.map(caretakerSprite),caretaker.colors,'Empty house',row,{tenants,allocateGraphics,allocateAssembly});
  if(blank.assembly.some((v,i)=>i%40<32&&v))throw Error('Empty-house frames must only use the blank tile');
  const jarFrames=caretakerFrames.map(onionJarSprite),jar=installActor(base,allocate,add,onionJar,jarFrames,onionJarArt.palette,'Onion jar',row);
  return {npcIds:caretaker.npcs,frames:21,frameMap:caretakerFrames,graphicsBytes:blank.graphics.length,tiles:blank.tiles,gfx:caretaker.gfx,asm:caretaker.asm,palette:caretaker.palette,
    rasterCoverage:{rasterFrames:0,proceduralFrames:0,blankFrames:21,sources:[]},tenants:blank.tenants,
    onionJar:{npcIds:onionJar.npcs,frames:21,graphicsBytes:jar.graphics.length,tiles:jar.tiles,gfx:onionJar.gfx,asm:onionJar.asm,palette:onionJar.palette,colors:onionJarArt.palette,source:onionJarArt.source,sourceSha256:onionJarArt.sourceSha256}};
}

export function spriteHeaders(rom) {
  return Array.from({length:256},(_,i)=>({kind:i<7?'pc':'npc',id:i<7?i:i-7,offset:0x24f000+i*5}))
    .concat(Array.from({length:256},(_,i)=>({kind:'enemy',id:i,offset:0x24f600+i*10})));
}
export function assertUnusedSpriteSlot(rom,field,id) {
  if(id===255||spriteHeaders(rom).some(h=>rom[h.offset+field]===id))throw Error(`Native sprite slot ${field}:${id} is already owned`);
}
export function assertUnusedPalette(rom,id) {
  assertUnusedSpriteSlot(rom,2,id);
  const address=u16(rom,0x242a00+id*2);
  for(let i=0;i<256;i++)if(i!==id&&u16(rom,0x242a00+i*2)===address)throw Error(`Palette ${id} aliases palette ${i}`);
}

// Only whole resources whose pointer entries will all be replaced are
// reclaimable. Shared pointer aliases and header ownership are audited first.
// Native assembly ends at the next distinct pointer; graphics use their exact
// compressed packet length, never the apparent zero padding after a packet.
export function spriteResourcePools(rom,graphics,assemblies){
  const headers=spriteHeaders(rom),out=[];
  for(const[field,ids,table]of[[0,graphics,0x242000],[1,assemblies,0x242300]]){
    const unique=new Set(ids),pointers=Array.from({length:256},(_,i)=>fileOffset(u24(rom,table+i*3)));
    for(const id of unique){
      if(!headers.some(h=>rom[h.offset+field]===id))continue;
      const start=pointers[id],aliases=pointers.flatMap((p,i)=>p===start?[i]:[]);
      if(aliases.some(i=>!unique.has(i)))continue;
      if(out.some(p=>p.offset===start))continue;
      if(start<0||start>=rom.length)throw Error('Invalid native sprite resource start');
      const end=field===0?start+decompress(rom,start).length:Math.min(...pointers.filter(p=>p>start));
      // The final assembly pointer has no next entry to prove its extent.
      // Retain that source span; a replacement can be allocated elsewhere.
      if(!Number.isFinite(end))continue;
      if(start<0||!Number.isFinite(end)||end>rom.length||end<=start)throw Error('Invalid native sprite resource extent');
      // A distant next pointer does not prove ownership of the intervening
      // banks. The final boss assembly at 21:E000 is one such sparse entry.
      if(field===1&&(start>>16)!==((end-1)>>16))continue;
      out.push({field,id,table,aliases,offset:start,length:end-start,owners:headers.filter(h=>aliases.includes(rom[h.offset+field])).map(h=>({kind:h.kind,id:h.id}))});
    }
  }
  return out;
}

// Share a tile dictionary across actors with different native cell budgets.
// Assembly flags and XY offsets survive; only the ten-bit tile indices change.
export function mergeSpriteBanks(compiled) {
  const tiles=[],lookup=new Map(),assemblies=[];
  for(const bank of compiled){
    const map=[];
    for(let p=0;p<bank.graphics.length;p+=32){
      const tile=bank.graphics.slice(p,p+32),key=Array.from(tile).join(',');
      if(!lookup.has(key)){lookup.set(key,tiles.length);tiles.push(tile);}
      map.push(lookup.get(key));
    }
    const cells=bank.assembly.length/bank.frames/10,assembly=bank.assembly.slice();
    if(![4,8,12,24].includes(cells))throw Error('Invalid native assembly cell count');
    for(let f=0;f<bank.frames;f++)for(let i=0;i<cells*4;i++){
      const p=f*cells*10+i*2,w=u16(assembly,p);if(map[w&1023]===undefined)throw Error('Missing source sprite tile');
      put16(assembly,p,(w&0xfc00)|map[w&1023]);
    }
    assemblies.push(assembly);
  }
  if(tiles.length>1024)throw Error('Shared sprite bank exceeds ten-bit tile indices');
  return {graphics:Uint8Array.from(tiles.flatMap(t=>Array.from(t))),assemblies,tiles:tiles.length};
}
