import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {tysonNativeSprite,tysonSprite} from '../engine/finale.js';
import {tysonLinework} from '../engine/tyson-linework.js';
import {compileSpriteFrames} from '../engine/native-sprites.js';
import {compress} from '../engine/compression.js';

const frames=Array.from({length:45},(_,i)=>tysonNativeSprite(i));

test('Tyson linework retains all 45 native slots and the recorded sequence',async()=>{
  const spec=JSON.parse(await readFile('assets/raster/tyson/import-spec.json','utf8'));
  assert.equal(tysonLinework.width,48);assert.equal(tysonLinework.height,64);
  assert.deepEqual(tysonLinework.sequences.native[1],spec.sequences.native[1]);
  assert.equal(tysonLinework.sequences.native[1].length,45);
  assert.equal(tysonLinework.frames.length,36);
  frames.forEach((pixels,i)=>{
    assert.equal(pixels.length,48*64,`frame ${i} dimensions`);
    assert.ok(pixels.some(Boolean),`frame ${i} is not blank`);
    assert.ok(pixels.every(v=>v<=12),`frame ${i} uses the native twelve-color palette`);
  });
  assert.deepEqual(tysonSprite('native',24),tysonSprite('windup',0),'frame24 remains the native charge pose');
  for(const slot of[12,13,14,15]){
    const entry=tysonLinework.sequences.native[1][slot];
    assert.equal(typeof entry,'object');assert.equal(entry.flip,true);
  }
  for(const frame of[-1,45,1.5,NaN])assert.throws(()=>tysonNativeSprite(frame),/outside native assembly/);
});

test('Tyson native silhouettes keep dark ink and front-facing guards retain paired eye pixels',()=>{
  for(const[index,pixels]of frames.entries()){
    let edge=0,inkEdge=0;
    for(let y=0;y<64;y++)for(let x=0;x<48;x++){
      const value=pixels[y*48+x];if(!value)continue;
      const boundary=[[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy])=>x+dx<0||x+dx>=48||y+dy<0||y+dy>=64||!pixels[(y+dy)*48+x+dx]);
      if(boundary){edge++;if(value===1)inkEdge++;}
    }
    assert.ok(edge>0);assert.ok(inkEdge/edge>=.75,`frame ${index} has a continuous dark silhouette (${inkEdge}/${edge})`);
  }
  for(const index of[0,1,2,3,8,9,10]){
    const pixels=frames[index],rows=[];
    for(let y=0;y<16;y++){
      const xs=[];for(let x=0;x<48;x++)if(pixels[y*48+x]===7)xs.push(x);
      if(xs.length)rows.push(xs);
    }
    assert.ok(rows.some(xs=>xs.some((x,i)=>i&&x-xs[i-1]>1)),`frame ${index} has separated eye highlights`);
  }
  assert.ok(frames[33].slice(0,30*48).every(v=>v!==7),'profile frame33 does not invent frontal eye pixels');
});

test('Tyson linework compiles inside the existing native sprite and memory contract',()=>{
  const compiled=compileSpriteFrames(frames,{width:48,height:64,size:2}),packed=compress(compiled.graphics);
  assert.equal(compiled.assembly.length,45*12*10,'45 frames retain twelve native OBJ cells each');
  assert.equal(compiled.graphics.length,compiled.tiles*32);
  assert.ok(compiled.tiles<468,'line-aware conversion does not increase the previous tile count');
  assert.ok(packed.length<6715,'line-aware conversion does not increase the previous compressed size');
  assert.equal(packed.length,6677,'recorded Tyson linework packet size');
});
