import {magicMirror,magicMirrorResources} from '../content/magic-mirror.js';
import {magicMirrorRaster} from '../assets/raster/magic-mirror-art.js';
import {compileSpriteFrames,mergeSpriteBanks,spriteHeaders} from './native-sprites.js';
import {tile4bpp,internSpriteTile,snesColor} from './sprites.js';
import {compress,decompress} from './compression.js';
import {u16,u24,put16,put24,fileOffset} from './rom.js';
import {crc32} from './bps.js';
import {encode} from './text.js';

export {magicMirrorResources};
const signed=v=>v>127?v-256:v;
const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
function requireBytes(bytes,length,crc,label){
  if(bytes.length!==length||crc32(bytes)!==crc)throw Error('Magic Mirror '+label+' changed');
}
function requireHeader(base,offset,header,label){
  if(!equal(base.slice(offset,offset+header.length),header))throw Error('Magic Mirror '+label+' header changed');
}
function requireOwnership(base,headers,field,ids,owners){
  for(const h of headers)if(ids.includes(base[h.offset+field])&&!owners.some(o=>o.kind===h.kind&&o.id===h.id))throw Error('Magic Mirror resource has another owner');
  const table=field===0?0x242000:field===1?0x242300:0x242a00,stride=field===2?2:3;
  const pointer=id=>field===2?u16(base,table+id*stride):fileOffset(u24(base,table+id*stride));
  for(const id of ids)for(let other=0;other<256;other++)if(!ids.includes(other)&&pointer(id)===pointer(other))throw Error('Magic Mirror resource pointer is aliased');
}
function originalAssembly(base,id,length,crc){
  const start=fileOffset(u24(base,0x242300+id*3));
  const end=Math.min(...Array.from({length:256},(_,i)=>fileOffset(u24(base,0x242300+i*3))).filter(p=>p>start));
  if(end-start!==length)throw Error('Magic Mirror original assembly capacity changed');
  const bytes=base.slice(start,end);requireBytes(bytes,length,crc,'original assembly '+id);return bytes;
}
function sourceFrames(asset,width,height,count,crcs){
  if(asset.width!==width||asset.height!==height||asset.frames.length!==count||asset.sourceType!=='existing-game-model-render'||!equal(asset.palette,magicMirror.colors))throw Error('Magic Mirror source format changed');
  return asset.frames.map((s,i)=>{
    if(s.length!==width*height||!/^[0-9a-c]+$/.test(s))throw Error('Magic Mirror source pixels changed');
    const pixels=Uint8Array.from(s,c=>parseInt(c,16));requireBytes(pixels,width*height,crcs[i],'approved source frame '+i);return pixels;
  });
}

// Synchronous and browser-compatible. Only the approved source rasters are
// sampled; cell counts, source frame IDs and runtime allocation stay native.
export function compileMagicMirror(base){
  const {model,display}=magicMirror,headers=spriteHeaders(base),modelOwners=model.actors.map(a=>({kind:'enemy',id:a.enemy})),displayOwners=[{kind:'enemy',id:display.enemy},{kind:'npc',id:display.npc}];
  for(const a of model.actors)requireHeader(base,0x24f600+a.enemy*10,a.header,a.key);
  requireHeader(base,0x24f600+display.enemy*10,display.enemyHeader,'Display enemy');
  requireHeader(base,0x24f000+(display.npc+7)*5,display.npcHeader,'Display NPC');
  for(const [field,ids,owners]of [[0,[model.gfx],modelOwners],[1,model.actors.map(a=>a.asm),modelOwners],[2,[model.palette],modelOwners],[0,[display.gfx],displayOwners],[1,[display.asm],displayOwners],[2,[display.palette],displayOwners]])requireOwnership(base,headers,field,ids,owners);
  const original={};
  for(const [key,family]of [['model',model],['display',display]]){
    const gfx=fileOffset(u24(base,0x242000+family.gfx*3)),decoded=decompress(base,gfx),paletteOffset=0x240000+u16(base,0x242a00+family.palette*2);
    requireBytes(decoded.bytes,family.original.graphicsBytes,family.original.graphicsCrc32,'original graphics '+family.gfx);
    requireBytes(base.slice(paletteOffset,paletteOffset+24),24,family.original.paletteCrc32,'original palette '+family.palette);
    original[key]={graphicsBytes:decoded.bytes.length,compressedBytes:decoded.length,graphicsOffset:gfx,paletteOffset};
  }
  const originalModel=model.actors.map(a=>originalAssembly(base,a.asm,a.assemblyBytes,a.assemblyCrc32)),originalDisplay=originalAssembly(base,display.asm,display.original.assemblyBytes,display.original.assemblyCrc32);
  const [pixels]=sourceFrames(magicMirrorRaster.model,48,96,1,[3105364748]),blank=new Uint8Array(pixels.length),main=new Uint8Array(pixels.length),trim=new Uint8Array(pixels.length);
  for(let y=0;y<96;y++)for(let x=0;x<48;x++){
    const p=y*48+x;if(x>=8&&x<40)main[p]=pixels[p];else if(y>=16&&y<80)trim[p]=pixels[p];else if(pixels[p])throw Error('Magic Mirror source exceeds compound cells');
  }
  const origins=[Array.from({length:12},(_,i)=>[8+i%2*16,Math.floor(i/2)*16]),Array.from({length:8},(_,i)=>[i%2*32,16+Math.floor(i/2)*16])];
  const compiled=mergeSpriteBanks(model.actors.map((a,i)=>compileSpriteFrames([[main,trim][i],blank],{width:48,height:96,size:a.size,cellOrigins:origins[i]})));
  for(const [i,a]of model.actors.entries()){
    const assembly=compiled.assemblies[i],stride=a.cells*10;
    for(let c=0;c<a.cells;c++)assembly[a.cells*8+c*2+1]=(assembly[a.cells*8+c*2+1]+model.anchor[1])&255;
    // Original frame 1 is intentionally blank; its native geometry survives.
    assembly.set(originalModel[i].slice(stride+a.cells*8,stride*2),stride+a.cells*8);
  }
  const frames=sourceFrames(magicMirrorRaster.display,32,16,7,[2145026781,3640969340,2485624956,997086207,4022472699,1006356689,1649757084]);frames.push(new Uint8Array(512));
  const tiles=[new Uint8Array(32)],lookup=new Map([[Array(32).fill(0).join(','),0]]),assembly=originalDisplay.slice();
  for(let f=0;f<8;f++)for(let cell=0;cell<4;cell++){
    // Display's boot cells overlap. Sample each original cell without moving
    // it; the ordinary nonoverlapping sprite compiler cannot represent this.
    const cx=signed(assembly[f*40+32+cell*2]),cy=signed(assembly[f*40+33+cell*2]),p=new Uint8Array(256);
    for(let y=0;y<16;y++)for(let x=0;x<16;x++){
      const sx=cx+8+x,sy=cy+36+y;if(sx>=0&&sx<32&&sy>=0&&sy<16)p[y*16+x]=frames[f][sy*32+sx];
    }
    for(let row=0;row<2;row++)for(let col=0;col<2;col++)put16(assembly,f*40+row*16+cell*4+col*2,internSpriteTile(tile4bpp(p,16,col*8,row*8),tiles,lookup));
  }
  const displayGraphics=Uint8Array.from(tiles.flatMap(t=>Array.from(t))),palette=new Uint8Array(24);magicMirror.colors.forEach((c,i)=>put16(palette,i*2,snesColor(c)));
  const result={model:{graphics:compiled.graphics,compressed:compress(compiled.graphics),assemblies:compiled.assemblies},display:{graphics:displayGraphics,compressed:compress(displayGraphics),assembly},palette,original};
  for(const key of ['model','display'])if(result[key].graphics.length>original[key].graphicsBytes)throw Error('Magic Mirror exceeds original decoded graphics budget');
  // These are the exact compiled records approved in the full original scene,
  // including both compound layers and all eight native Display frame IDs.
  for(const [bytes,length,crc,label]of [
    [result.model.graphics,2016,2504882673,'approved model graphics'],[result.model.compressed,1363,2171129343,'approved model packet'],
    [result.model.assemblies[0],240,1220460253,'approved main cells'],[result.model.assemblies[1],160,1710154932,'approved trim cells'],
    [displayGraphics,960,1211765132,'approved Display graphics'],[result.display.compressed,509,3765021079,'approved Display packet'],
    [assembly,320,1026461262,'approved Display cells'],[palette,24,2805040711,'approved palette']])requireBytes(bytes,length,crc,label);
  return result;
}

export function patchMagicMirror(base,allocate,add){
  const compiled=compileMagicMirror(base),actors=[],banks=[];
  const pointer=(table,id,address,label)=>{const bytes=new Uint8Array(3);put24(bytes,0,0xc00000|address);add(table+id*3,bytes,label);};
  for(const [key,family]of [['model',magicMirror.model],['display',magicMirror.display]]){
    const bank=compiled[key],address=allocate(bank.compressed,'Magic Mirror '+key+' compressed graphics');
    pointer(0x242000,family.gfx,address,'Magic Mirror '+key+' graphics pointer');
    banks.push({key,gfx:family.gfx,address,graphicsBytes:bank.graphics.length,compressedBytes:bank.compressed.length,originalGraphicsBytes:compiled.original[key].graphicsBytes,originalCompressedBytes:compiled.original[key].compressedBytes,graphicsStorage:'compressed',tiles:bank.graphics.length/32});
    add(compiled.original[key].paletteOffset,compiled.palette,'Magic Mirror '+key+' isolated palette');
    const specs=key==='model'?family.actors:[family];
    for(const [i,a]of specs.entries()){
      const assembly=key==='model'?bank.assemblies[i]:bank.assembly,assemblyAddress=allocate(assembly,'Magic Mirror '+a.key+' native frames');
      pointer(0x242300,a.asm,assemblyAddress,'Magic Mirror '+a.key+' assembly pointer');
      add(0xc6500+a.enemy*11,encode(a.short,{length:11}),'Magic Mirror '+a.key+' battle name');
      actors.push({key:a.key,enemy:a.enemy,...(a.npc===undefined?{}:{npc:a.npc}),gfx:family.gfx,asm:a.asm,palette:family.palette,size:a.size,cells:a.cells,frames:family.frames,blankFrame:family.blankFrame,assemblyBytes:assembly.length,assemblyAddress,graphicsBytes:bank.graphics.length,graphicsStorage:'compressed'});
    }
  }
  return {actors,banks,sourceType:'existing-game-model-render',provenance:[...magicMirrorRaster.model.provenance,...magicMirrorRaster.display.provenance],
    sourceArchive:magicMirrorRaster.archive,location:268,displayNpcLocations:magicMirror.display.npcLocations,
    extraWramBytes:0,extraVramBytes:0,extraNativeCells:0,extraFrameIds:0,decodedBytes:2976,originalDecodedBytes:3008,
    headersPreserved:true,animationsPreserved:true,aiPreserved:true,eventCoordinatesPreserved:true,displayCellCoordinatesPreserved:true};
}
