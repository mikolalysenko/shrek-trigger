import {cartridgeOffset} from '../engine/expanded-rom.js';
import assert from 'node:assert/strict';
import {u16,u24} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';

const signed=value=>value>127?value-256:value;

// Read the emitted cartridge, including its native cell coordinates. This is
// also used by the review page, so tall actors and displaced attack frames
// cannot silently become cropped 32x32 thumbnails.
export function nativeSpriteBank(rom,actor){
  const size=(actor.size??0)&3;
  assert.ok(size>=0&&size<=3,'Native size class');
  if(size===3&&actor.frames!==1){
    assert.equal(actor.frames,2,'Fixed 24-cell actors have one native frame and at most one declared blank assembly');
    assert.equal(actor.fixedFrame,0,'Fixed 24-cell actors have one native frame');
    assert.deepEqual(actor.blankFrames,[1],'Fixed actor extra assembly must be a declared blank');
  }
  const cells=size===3?24:size===2?12:size===1?8:4;
  const graphics=decompress(rom,cartridgeOffset(u24(rom,0x242000+actor.gfx*3),rom)).bytes;
  const p=cartridgeOffset(u24(rom,0x242300+actor.asm*3),rom);
  const assembly=rom.slice(p,p+actor.frames*cells*10);
  assert.equal(assembly.length,actor.frames*cells*10);
  const paletteOffset=0x240000+u16(rom,0x242a00+actor.palette*2);
  const nativeColors=Array.from({length:12},(_,i)=>u16(rom,paletteOffset+i*2));
  const palette=nativeColors.map(c=>[0,5,10].map(shift=>{const v=c>>shift&31;return v<<3|v>>2;}));
  const bank={cells,graphics,assembly,nativeColors,palette,frames:actor.frames};
  if(size===3&&actor.frames===2)assert.ok(nativeSpriteCells(bank,1).every(c=>!c.pixels.some(Boolean)),'Fixed actor extra assembly must be transparent');
  return bank;
}

export function nativeSpriteCells(bank,frame){
  assert.ok(Number.isInteger(frame)&&frame>=0&&frame<bank.frames,'Native frame index');
  const {cells,graphics,assembly}=bank,perGroup=cells===24?8:cells===12?4:cells,base=frame*cells*10;
  return Array.from({length:cells},(_,cell)=>{
    const pixels=new Uint8Array(256);
    for(let y=0;y<16;y++)for(let x=0;x<16;x++){
      const offset=Math.floor(cell/perGroup)*perGroup*4+(y>>3)*perGroup*2+(cell%perGroup)*2+(x>>3);
      const word=u16(assembly,base+offset*2),tile=(word&1023)*32;
      assert.ok(tile+32<=graphics.length,'Native cell references an existing tile');
      const xx=word&0x4000?7-(x&7):x&7,yy=word&0x8000?7-(y&7):y&7;
      for(let bit=0;bit<4;bit++)pixels[y*16+x]|=(graphics[tile+(bit>>1)*16+yy*2+(bit&1)]>>(7-xx)&1)<<bit;
    }
    return {cell,x:signed(assembly[base+cells*8+cell*2]),y:signed(assembly[base+cells*8+cell*2+1]),pixels};
  });
}

export function nativeSpriteAtlas(bank){
  const frames=Array.from({length:bank.frames},(_,i)=>nativeSpriteCells(bank,i));
  return nativeCellAtlas(frames);
}

export function nativeCellAtlas(frames){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const cells of frames)for(const c of cells)for(let i=0;i<256;i++)if(c.pixels[i]){
    const x=c.x+(i&15),y=c.y+(i>>4);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x+1);maxY=Math.max(maxY,y+1);
  }
  assert.ok(Number.isFinite(minX),'Actor has visible source pixels');
  minX=Math.floor(minX/8)*8;minY=Math.floor(minY/8)*8;
  const width=Math.ceil((maxX-minX)/8)*8,height=Math.ceil((maxY-minY)/8)*8;
  const images=frames.map(cells=>{
    const image=new Uint8Array(width*height);
    // Earlier native OAM cells have priority where cells overlap.
    for(const c of cells)for(let i=0;i<256;i++)if(c.pixels[i]){
      const p=(c.y+(i>>4)-minY)*width+c.x+(i&15)-minX;
      if(!image[p])image[p]=c.pixels[i];
    }
    return image;
  });
  return {width,height,origin:[-minX,-minY],images};
}
