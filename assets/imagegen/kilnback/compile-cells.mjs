// Private geometry proposal. The active compiler is deliberately untouched.
// Like compileSpriteFrames/compileActorFamily, this uses native3×4 cell groups,
// 4bpp tiles and exact horizontal tile sharing. Only guarded frames6/9 overlap.
import assert from'node:assert/strict';import{tile4bpp,internSpriteTile}from'../../../engine/sprites.js';import{put16}from'../../../engine/rom.js';
export function compileCells(family,frames){
 const group=family.groups[0],overlapFrames=group.cellOverlapFrames;assert.deepEqual(overlapFrames,[6,9]);assert.equal(group.size,2);assert.equal(group.width,64);assert.equal(group.height,64);assert.equal(frames.length,28);
 const tiles=[new Uint8Array(32)],indices=new Map([[Array(32).fill(0).join(','),0]]),assembly=new Uint8Array(28*120),coverage=[];
 for(let f=0;f<28;f++){
  const p=frames[f],origins=group.frameCellOrigins[f],counts=new Uint8Array(4096);assert.equal(origins.length,12);
  for(const[x,y]of origins){assert.ok(Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x+16<=64&&y+16<=64);for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++)counts[(y+yy)*64+x+xx]++;}
  assert.ok(p.every((v,i)=>v<=12&&(!v||counts[i])),'No clipped source pixels at '+f);if(!overlapFrames.includes(f))assert.ok(counts.every(v=>v<=1),'Unapproved overlap at '+f);else assert.ok(counts.some(v=>v>1),'Expected explicit overlap');
  for(let g=0;g<3;g++)for(let row=0;row<2;row++)for(let c=0;c<4;c++)for(let col=0;col<2;col++){const[x,y]=origins[g*4+c];put16(assembly,f*120+g*32+row*16+c*4+col*2,internSpriteTile(tile4bpp(p,64,x+col*8,y+row*8),tiles,indices));}
  for(let c=0;c<12;c++)assembly.set([(origins[c][0]-32+(group.frameOffsets[f]?.[0]??0))&255,(origins[c][1]-64+(group.frameOffsets[f]?.[1]??0))&255],f*120+96+c*2);
  coverage.push({frame:f,opaque:p.filter(Boolean).length,overlappingCanvasPixels:counts.filter(v=>v>1).length,overlappingOpaquePixels:counts.filter((v,i)=>v>1&&p[i]).length,maxCoverage:Math.max(...counts)});
 }
 assert.ok(tiles.length<=1024);return{graphics:Uint8Array.from(tiles.flatMap(t=>Array.from(t))),groups:[{...group,assembly}],coverage};
}
