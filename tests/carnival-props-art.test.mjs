import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from './helpers.mjs';
import {hatchetSprite} from '../engine/carnival-art.js';
import {rasterArt,rasterArtInfo} from '../engine/raster-art.js';
import {carnivalColors,hatchetProps} from '../content/carnival.js';

const mirror=(pixels,vertical=false)=>Uint8Array.from({length:1024},(_,i)=>{const x=i%32,y=Math.floor(i/32);return pixels[(vertical?31-y:y)*32+(vertical?x:31-x)];});

test('hatchet props expose complete generated native sequences and no procedural audit gaps',async()=>{
  const built=await build();
  for(const prop of hatchetProps){
    const info=rasterArtInfo(prop.key);assert.equal(info.sourceType,'image-generation');assert.deepEqual(info.palette,carnivalColors.hatchet);
    assert.equal(info.frames,prop.frames);assert.equal(info.sequences.native[1].length,prop.frames);
    const audit=built.audit.carnival.actors.find(a=>a.key===prop.key);assert.equal(audit.rasterCoverage.rasterFrames,prop.frames);assert.equal(audit.rasterCoverage.proceduralFrames,0);
    for(let frame=0;frame<prop.frames;frame++){
      const pixels=hatchetSprite(prop.key,frame);assert.deepEqual(pixels,rasterArt(prop.key,{pose:'native',facing:1,phase:frame}));
      assert.ok(pixels.some(v=>v===1),`${prop.key}/${frame} has a strong dark outline`);assert.ok(pixels.every(v=>v<=12));
    }
  }
});

test('the seven-slot hatchet spin preserves its native axis, mirrors and distinct foreshortening',()=>{
  const frames=Array.from({length:7},(_,f)=>hatchetSprite('carnival-hatchet',f));
  assert.equal(new Set(frames.map(p=>p.join(','))).size,7);
  for(let f=0;f<3;f++)assert.deepEqual(frames[f+3],mirror(frames[f]),`spin ${f+3} mirrors ${f}`);
  assert.deepEqual(frames[6],mirror(frames[0],true),'final slot flips vertically through the spin');
  for(const f of [0,1,3,4]){assert.ok(frames[f][29*32+15]||frames[f][29*32+16],`frame ${f} keeps its lower haft anchor`);}
  for(const f of [2,5]){let min=32,max=-1;for(let y=4;y<=16;y++)for(let x=0;x<32;x++)if(frames[f][y*32+x]){min=Math.min(min,x);max=Math.max(max,x);}assert.ok(max-min+1<=6,`frame ${f} is edge-on`);}
});
