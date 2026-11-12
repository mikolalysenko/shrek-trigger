import{tile4bpp}from'./sprites.js';
import{pixelCanvas}from'./pixel-art.js';
import{rasterArt}from'./raster-art.js';
// Sixteen paired-beam angles (straight lines, drawn geometrically) and four
// generated flame frames. Each
// displayed frame is one 16x16 OBJ, using the native fire ramp (colors 1..3).
// Compile to cartridge tiles; no bitmap scaling or browser overlay is used.
export function eyeLaserGraphics(){
 const tiles=new Uint8Array(4096),assembly=[];
 for(let f=0;f<20;f++){
  const c=pixelCanvas(16,16),{pixels,line}=c;
  if(f<16){
   const angle=f*Math.PI/8,dx=Math.cos(angle),dy=Math.sin(angle);
   for(const side of[-3,3]){
    const a=[Math.round(7.5-dx*7-dy*side),Math.round(7.5-dy*7+dx*side)],b=[Math.round(7.5+dx*7-dy*side),Math.round(7.5+dy*7+dx*side)];
    for(const shift of[-1,1])line(a[0]-dy*shift,a[1]+dx*shift,b[0]-dy*shift,b[1]+dx*shift,2);
    line(...a,...b,1);
   }
  }else{
   // Generated two-frame flicker (assets/imagegen/eye-laser-flames) in the
   // native fire ramp: 1 core, 2 middle, 3 outer flame.
   const flame=rasterArt('eye-laser-flames',{pose:'native',facing:1,phase:(f-16)&1});
   if(!flame||flame.length!==256||flame.some(v=>v>3))throw Error('Eye Lasers flame leaves the fire ramp');
   pixels.set(flame);
  }
  const tile=(f%8)*2+(f>>3)*32;
  for(let y=0;y<2;y++)for(let x=0;x<2;x++)tiles.set(tile4bpp(pixels,16,x*8,y*8),(tile+y*16+x)*32);
  const n=0xc0+tile;assembly.push(0x11,0x80,n&255,n>>8,255,255);
 }
 const packed=new Uint8Array(tiles.length/2);for(let i=0;i<tiles.length/32;i++)packed.set(tiles.slice(i*32,i*32+16),i*16);
 return{tiles,packed,assembly:Uint8Array.from(assembly)};
}
