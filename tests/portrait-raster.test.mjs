import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {portrait,portraitArtInfo} from '../engine/portraits.js';
import {generatedRasterArt} from '../engine/generated-raster-art.js';
import {tile4bpp} from '../engine/sprites.js';
import {cast} from '../content/cast.js';
import {partyConvention} from '../engine/raster-art.js';
import {conformPartyFrame} from '../engine/party-palette.js';

const drafts=await Promise.all([4,5,6].map(async id=>{
  const key=cast[id].key+'-portrait',directory=new URL(`../assets/imagegen/${key}/`,import.meta.url);
  const [raster,review,tiles]=await Promise.all([
    readFile(new URL('preview-raster.json',directory),'utf8').then(JSON.parse),
    readFile(new URL('review-v1.json',directory),'utf8').then(JSON.parse),
    readFile(new URL('preview-tiles.4bpp',directory))
  ]);
  return {id,key,raster,review,tiles};
}));

test('generated portraits retain their exact indexed pixels, character palette, provenance and original tile slots',()=>{
  for(const {id,key,raster,review,tiles} of drafts){
    const original=generatedRasterArt[key];
    try{
      delete generatedRasterArt[key];
      const fallback=portrait(id);
      assert.equal(portraitArtInfo(id),null,'an inactive portrait explicitly uses the earlier artwork');
      generatedRasterArt[key]=raster;
      const pixels=portrait(id),info=portraitArtInfo(id),source=Uint8Array.from(raster.frames[0],v=>parseInt(v,16));
      assert.equal(pixels.length,48*48);
      // The accepted source is intact; the active portrait only remaps it into
      // the party outline palette (engine/party-palette.js), with no outline pass.
      assert.equal(createHash('sha256').update(source).digest('hex'),review.indexedSha256);
      assert.deepEqual(pixels,conformPartyFrame(source,48,48,partyConvention(cast[id].key),{outline:false}),'only the palette remap changes pixels');
      assert.deepEqual(info.palette,cast[id].palette);
      assert.deepEqual(info.provenance,raster.provenance);
      assert.equal(info.key,key);assert.equal(info.sourceType,'image-generation');
      const encode=px=>{const out=[];for(let y=0;y<48;y+=8)for(let x=0;x<48;x+=8)out.push(...tile4bpp(px,48,x,y));return Uint8Array.from(out);};
      assert.deepEqual(encode(source),Uint8Array.from(tiles));
      assert.equal(encode(pixels).length,0x480,'existing 36-tile portrait slot');
      pixels.fill(0);assert.ok(portrait(id).some(Boolean),'callers cannot mutate cached source art');
      delete generatedRasterArt[key];assert.deepEqual(portrait(id),fallback);
    }finally{if(original===undefined)delete generatedRasterArt[key];else generatedRasterArt[key]=original;}
  }
});

test('an active portrait with incompatible dimensions, palette, pose or indices fails instead of silently falling back',()=>{
  const {id,key,raster}=drafts[0],original=generatedRasterArt[key];
  try{
    generatedRasterArt[key]={...raster,width:32};assert.throws(()=>portrait(id),/portrait dimensions/);
    generatedRasterArt[key]={...raster,palette:[...raster.palette].reverse()};assert.throws(()=>portrait(id),/portrait palette/);
    generatedRasterArt[key]={...raster,sequences:{}};assert.throws(()=>portrait(id),/portrait idle pose/);
    generatedRasterArt[key]={...raster,frames:[...raster.frames,'d'.repeat(48*48)],sequences:{idle:{1:[1]}}};
    assert.throws(()=>portrait(id),/portrait pixels/);
  }finally{if(original===undefined)delete generatedRasterArt[key];else generatedRasterArt[key]=original;}
});
