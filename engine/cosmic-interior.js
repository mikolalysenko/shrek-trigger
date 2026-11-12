import {cosmicMuffinInteriorRaster as source} from './generated-cosmic-muffin-art.js';
import {cosmicInteriorActors,cosmicInteriorGeometry} from '../content/cosmic-interior.js';
import {nativeRasterArt,rasterArtInfo} from './raster-art.js';
import {compileSpriteFrames,spriteHeaders} from './native-sprites.js';
import {compress,decompress} from './compression.js';
import {cartridgeDataAddress} from './expanded-rom.js';
import {u16,u24,put16,put24,fileOffset} from './rom.js';
import {snesColor} from './sprites.js';

const require=(ok,message)=>{if(!ok)throw Error('Cosmic oven: '+message);};
const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const bytes=hex=>Uint8Array.from(hex.match(/../g),v=>parseInt(v,16));

export function compileCosmicInteriorArms(){
 const geometry=cosmicInteriorGeometry,key='cosmic-muffin-interior-arms';
 const frames=Array.from({length:12},(_,f)=>nativeRasterArt(key,f,geometry));
 const left=compileSpriteFrames(frames,{...geometry,size:2});
 require(left.graphics.length<=32768&&left.assembly.length===1440,'arm resource budget changed');
 // The sampled canvas origin is64,64; keep the accepted original attachments.
 for(let f=0;f<12;f++)for(let c=0;c<12;c++)left.assembly[f*120+97+c*2]+=64;
 const right=left.assembly.slice();
 for(let f=0;f<12;f++){
  const [dx,dy]=geometry.mirrorOffsets[f];
  for(let c=0;c<12;c++){
   const xy=f*120+96+c*2,x=left.assembly[xy]<<24>>24,y=left.assembly[xy+1]<<24>>24;
   right[xy]=(-x-16+dx)&255;right[xy+1]=(y+dy)&255;
   for(let row=0;row<2;row++)for(let col=0;col<2;col++){
    const at=f*120+Math.floor(c/4)*32+row*16+(c%4)*4+col*2,from=f*120+Math.floor(c/4)*32+row*16+(c%4)*4+(1-col)*2;
    put16(right,at,u16(left.assembly,from)^0x4000);
   }
  }
 }
 return {graphics:left.graphics,assemblies:[left.assembly,right],colors:rasterArtInfo(key).palette};
}

export function patchCosmicInterior(base,allocate,add,{streamedGraphics=new Set(),allocateGraphics=allocate}={}){
 const arms=compileCosmicInteriorArms(),headers=spriteHeaders(base);
 for(const a of cosmicInteriorActors){
  const offset=0x24f600+a.enemy*10;
  require(equal(base.subarray(offset,offset+5),[a.gfx,a.asm,a.palette,a.animation,a.size]),'arm header changed');
  for(const field of [0,1])require(headers.filter(h=>base[h.offset+field]===(field?a.asm:a.gfx)).every(h=>h.kind==='enemy'&&h.id===a.enemy),'arm has another owner');
  require(streamedGraphics.has(a.gfx),'both arms require the established native stream');
 }
 const palette=u16(base,0x242a00+226*2);
 require(headers.filter(h=>base[h.offset+2]===226).map(h=>h.kind+':'+h.id).join(',')==='enemy:203,enemy:204,enemy:205','arm palette owners changed');
 for(let id=0;id<256;id++)require(id===226||u16(base,0x242a00+id*2)!==palette,'arm palette pointer is aliased');
 for(let ts=0;ts<64;ts++)for(const id of [181,182])require(base.subarray(0x361c00+ts*8,0x361c00+(ts+1)*8).includes(id)===(ts===46),'body graphics have another tileset owner');
 for(let loc=0;loc<512;loc++){
  const p=0x360000+loc*14;
  require((base[p+1]===46)===(loc===475),'body tileset owner changed');
  require((base[p+3]===56)===(loc===475),'body palette owner changed');
 }
 const pointer=(field,address,label)=>{const p=new Uint8Array(3);put24(p,0,cartridgeDataAddress(address));add(field,p,label+' pointer');};
 const packet=(field,raw,label)=>{const packed=compress(raw),offset=allocate(packed,label);pointer(field,offset,label);return{pointer:field,offset,rawBytes:raw.length,compressedBytes:packed.length};};
 const packed=compress(arms.graphics),graphicsOffset=allocateGraphics(packed,'Cosmic Muffin shared oven arm graphics',208);
 const actors=cosmicInteriorActors.map((a,i)=>{
  pointer(0x242000+a.gfx*3,graphicsOffset,a.name+' graphics');
  const assemblyOffset=allocate(arms.assemblies[i],a.name+' assembly');pointer(0x242300+a.asm*3,assemblyOffset,a.name+' assembly');
  return {...a,graphicsOffset,graphicsBytes:arms.graphics.length,sourceGraphicsBytes:decompress(base,fileOffset(u24(base,0x242000+a.gfx*3))).bytes.length,graphicsStorage:'direct-rom',assemblyOffset,assemblyBytes:arms.assemblies[i].length,cells:12};
 });
 const paletteBytes=new Uint8Array(24);arms.colors.forEach((c,i)=>put16(paletteBytes,i*2,snesColor(c)));add(0x240000+palette,paletteBytes,'Cosmic oven arm palette');
 const backgrounds=source.backgrounds.map(b=>{
  const data=bytes(b.bytes),original=decompress(base,fileOffset(u24(base,0x362220+b.id*3))).bytes;
  require(data.length===original.length&&data.length===4096,'body packet size changed');
  if(b.id===182)require(equal(data.subarray(44*32),original.subarray(44*32)),'shared cave graphics changed');
  return{id:b.id,...packet(0x362220+b.id*3,data,'Cosmic oven background '+b.id)};
 });
 const pulse=bytes(source.pulse),oldPulse=decompress(base,fileOffset(u24(base,0x362220+22*3))).bytes;
 require(pulse.length===8192&&equal(pulse.subarray(0,116*32),oldPulse.subarray(0,116*32))&&equal(pulse.subarray(164*32),oldPulse.subarray(164*32)),'unrelated shared pulse tiles changed');
 const metatiles=bytes(source.metatiles),oldMetatiles=decompress(base,fileOffset(u24(base,0x362100+46*3))).bytes;
 require(metatiles.length===4096&&equal(metatiles.subarray(0,8),oldMetatiles.subarray(0,8))&&equal(metatiles.subarray(144*8),oldMetatiles.subarray(144*8)),'cave metatiles changed');
 const bgColors=new Uint8Array(30);source.palette.forEach((c,i)=>put16(bgColors,i*2,c));add(0x3624c0+56*210+6*30,bgColors,'Cosmic oven background palette56:7');
 return {actors,sharedCompressedGraphics:{offset:graphicsOffset,bytes:packed.length},backgrounds,pulse:packet(0x362220+22*3,pulse,'Cosmic oven shared pulse graphics'),metatiles:packet(0x362100+46*3,metatiles,'Cosmic oven body metatiles'),extraVramBytes:0,extraWramBytes:0};
}
