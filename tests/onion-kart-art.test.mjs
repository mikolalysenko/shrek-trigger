import {needsSourceImages} from './helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {onionKartArt} from '../content/onion-kart-art.js';
import {convertOnionKart} from '../assets/imagegen/onion-kart/convert.mjs';
import {cast} from '../content/cast.js';
import {cartColors} from '../content/racing.js';

const pixels=image=>Uint8Array.from(image.rows.join(''),c=>parseInt(c,16));

test('the onion kart art is reproducible from its image-generation sources',{skip:needsSourceImages},async()=>{
  assert.equal(convertOnionKart(),await readFile(new URL('../content/onion-kart-art.js',import.meta.url),'utf8'));
  assert.deepEqual(cartColors.slice(0,12),cast[0].palette,'Shrek keeps his own colors in the kart');
  assert.equal(cartColors.length,15);
});

test('rider patches repeat the kart art exactly where the native race pastes them',()=>{
  // Packet 1 patches replace whole 8x8 blocks: 0/1 on side views at (8,0),
  // 2 on the front view at (12,8) and 3 on the back view at (12,0).
  const region=(view,x0,y0)=>{const p=pixels(onionKartArt.views[view]),out=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)out.push(p[(y0+y)*32+x0+x]);return out;};
  const patch=i=>Array.from(pixels(onionKartArt.riderPatches[i]));
  for(const view of['side0','side1','side2'])for(const i of[0,1])assert.deepEqual(patch(i),region(view,8,0),view);
  assert.deepEqual(patch(2),region('front0',12,8));
  assert.deepEqual(patch(3),region('back0',12,0));
});
