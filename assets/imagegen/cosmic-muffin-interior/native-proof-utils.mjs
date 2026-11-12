import assert from 'node:assert/strict';
import {u16} from '../../../engine/rom.js';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {sha} from './sample-body.mjs';
export function tileBytes(c,f) {
  const out=[];
  for(let i=0;i<c.cells*4;i++) {
    const w=u16(c.assembly,f*c.cells*10+i*2);
    for(let b of c.graphics.slice((w&1023)*32,(w&1023)*32+32)) {
      if(w&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}out.push(b);
    }
  }
  return Uint8Array.from(out);
}
export function uploaded(s,c,object,f) {
  const p=u16(s.ram,0xd00+object*2)*32,v=new Uint8Array(s.ppu.vram.buffer),want=tileBytes(c,f);
  const got=c.cells===24?v.slice(p,p+want.length):Uint8Array.from((c.cells===12?[0,512,256,768,1024,1536]:[0,512]).flatMap(o=>Array.from(v.slice(p+o,p+o+256))));
  return {exact:Buffer.from(want).equals(Buffer.from(got)),tile:p/32,bytes:want.length,sha256:sha(got),expectedSha256:sha(want)};
}
export function oamCells(s,palette) {
  const out=[],v=new Uint8Array(s.ppu.vram.buffer);
  for(let e=0;e<128;e++) {
    const lo=s.ppu.oam[e*2],w=s.ppu.oam[e*2+1],hi=s.ppu.highOam[e>>3]>>((e&7)*2)&3;
    let x=(lo&255)|(hi&1)<<8;if(x>255)x-=512;
    const y=lo>>8,pal=w>>9&7;if(!(hi&2)||y>=224||x<=-16||x>=256)continue;
    if(!palette.every((w,i)=>s.ppu.cgram[129+pal*16+i]===w))continue;
    const p=new Uint8Array(256),attrs=w>>8,base=s.ppu.sprAdr1*2+(attrs&1?s.ppu.sprAdr2*2:0),tile=w&255;
    for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++) {
      const tx=attrs&64?15-xx:xx,ty=attrs&128?15-yy:yy,t=tile+(tx>>3)+(ty>>3)*16;
      for(let b=0;b<4;b++)p[yy*16+xx]|=(v[base+t*32+(b>>1)*16+(ty&7)*2+(b&1)]>>(7-(tx&7))&1)<<b;
    }
    out.push({entry:e,x,y,palette:pal,tile:w&511,pixels:p,hash:sha(p)});
  }
  return out;
}
export function locate(c,f,cells) {
  const expected=nativeSpriteCells({...c,frames:12},f).filter(a=>a.pixels.some(Boolean)).map(a=>({...a,hash:sha(a.pixels)}));
  if(!expected.length)return null;
  for(const first of cells.filter(a=>a.hash===expected[0].hash)) {
    const origin=[first.x-expected[0].x,first.y-expected[0].y];
    const match=expected.map(a=>cells.find(b=>b.x===origin[0]+a.x&&b.y===origin[1]+a.y&&b.palette===first.palette&&b.hash===a.hash));
    if(match.every(Boolean))return {key:c.key,frame:f,origin,cells:match};
  }
  return null;
}
export function pixelProof(s,parts,palette) {
  const expected=new Map(),rgba=new Uint8Array(512*480*4);s.setPixels(rgba);
  for(const part of parts)for(const cell of part.cells)for(let y=0;y<16;y++)for(let x=0;x<16;x++) {
    const k=cell.pixels[y*16+x],sx=cell.x+x,sy=cell.y+y;if(!k||sx<0||sx>=256||sy<0||sy>=224)continue;
    const pos=sy*256+sx,prior=expected.get(pos);if(!prior||cell.entry<prior.entry)expected.set(pos,{key:part.key,k,x:sx,y:sy,entry:cell.entry});
  }
  let exact=0;const mismatches=[],byPart={};
  for(const a of expected.values()) {
    const color=palette[a.k-1],rgb=[0,5,10].map(n=>((color>>n&31)*s.ppu.brightnessMults[s.ppu.brightness])&255),p=((a.y+8)*2*512+a.x*2)*4;
    const counts=byPart[a.key]??={exact:0,mismatches:0};
    if(rgb.every((v,i)=>v===rgba[p+i])){exact++;counts.exact++;}else {counts.mismatches++;mismatches.push({...a,expected:rgb,actual:[...rgba.slice(p,p+3)]});}
  }
  return {exact,mismatches:mismatches.length,firstMismatches:mismatches.slice(0,20),byPart};
}
