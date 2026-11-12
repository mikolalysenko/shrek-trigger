import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,needsSourceImages} from './helpers.mjs';
import {dragonArt} from '../content/dragon-art.js';
import {convertDragonArt} from '../assets/imagegen/dragon/convert.mjs';
import {dragonPixels,dragonWorld} from '../engine/dragon.js';
import {dragonGlide} from '../engine/dragon-mode7.js';
import {rasterArtInfo} from '../engine/raster-art.js';
import {decompress} from '../engine/compression.js';
import {u24} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';

const built=await build();

test('the generated Dragon art is reproducible from its image-generation sources',{skip:needsSourceImages},async()=>{
  assert.equal(convertDragonArt(built.base),await readFile(new URL('../content/dragon-art.js',import.meta.url),'utf8'));
  assert.equal(dragonArt.palette.length,12);
});

test('Dragon art keeps the native mirroring, footprints and Mode 7 rules',()=>{
  const mirrored=(image,center)=>{const p=dragonPixels(image),w=image.width;for(let y=0;y<image.height;y++)for(let x=0;x<w;x++){const m=center?2*center-x:w-1-x;if(m>=0&&m<w)assert.equal(p[y*w+x],p[y*w+m],`${w}x${image.height} at ${x},${y}`);}};
  mirrored(dragonArt.folded);mirrored(dragonArt.winged);mirrored(dragonArt.saddle);
  for(const k of['front0','front1','front2','back0','back1','back2'])mirrored(dragonArt.world[k],15);
  for(const k of['left0','left1']){const p=dragonPixels(dragonArt.world[k]);for(let y=0;y<32;y++)for(let x=16;x<32;x++)if(y<8||y>23)assert.equal(p[y*32+x],0,'side view stays in the stored rows');}
  // Left half of the side view is shared by both frames; only the tail moves.
  const l0=dragonPixels(dragonArt.world.left0),l1=dragonPixels(dragonArt.world.left1);
  for(let y=0;y<32;y++)for(let x=0;x<16;x++)assert.equal(l0[y*32+x],l1[y*32+x]);
  const saddle=dragonPixels(dragonArt.saddle);
  for(let y=40;y<96;y++)for(let x=0;x<256;x++)assert.ok(saddle[y*256+x],'no sky below the raster split');
  for(let y=0;y<40;y++)for(let x=0;x<256;x++){const half=x<128?x:255-x;if((y<8&&half<104)||half<32)assert.equal(saddle[y*256+x],0,'native OAM tiles stay empty');}
  assert.ok(built.audit.dragon.wingAttachmentTiles<=52);
});

test('Dragon faces her direction of travel in world flight and Mode 7 views',()=>{
  // Native 'back' is selected while flying north (up the screen): the head
  // must lead upward. Native 'front' is flying south: the head leads downward.
  for(let wing=0;wing<3;wing++){
    assert.notDeepEqual(dragonWorld('back',wing),dragonWorld('front',wing),'north flight must not reuse the head-down south view');
    assert.deepEqual(dragonWorld('back',wing),dragonPixels(dragonArt.world['back'+wing]));
    assert.deepEqual(dragonWorld('front',wing),dragonPixels(dragonArt.world['front'+wing]));
  }
  // Mode 7 follows the original Epoch table: heading 0 faces the camera,
  // pi shows her back flying away (the Epoch's thrusters), pi/2 is a side view.
  assert.deepEqual(dragonGlide(0),dragonGlide(0,0,{headLeft:true}));
  assert.notDeepEqual(dragonGlide(0),dragonGlide(Math.PI),'flying toward and away from the camera use different views');
  assert.deepEqual(dragonGlide(Math.PI*2),dragonGlide(0),'wrapped heading keeps the front view');
  const side=dragonGlide(Math.PI/2,0,{headLeft:true}),mirrored=dragonGlide(Math.PI/2);
  const mass=(p,left)=>{let n=0;for(let y=0;y<16;y++)for(let x=0;x<32;x++)if(p[y*32+x]&&(x<16)===left)n++;return n;};
  assert.notDeepEqual(side,mirrored,'the ending side view is not mirrored');
  assert.ok(mass(side,true)>0&&mass(mirrored,false)>0);
  const fragments=rasterArtInfo('dragon-fragments');assert.equal(fragments.sourceType,'image-generation');assert.equal(fragments.frames,3);assert.equal(fragments.sequences.native[1].length,3);
  assert.deepEqual(built.audit.dragon.fragmentArt,{rasterFrames:3,proceduralFrames:0,sources:fragments.provenance});
});

test('the present-day world script flies Dragon with her own palette in the attract demo',()=>{
  // World opcode 01 sets the vehicle's OBJ palette; the stock argument 00
  // drew Dragon's tiles in the leader's greys and yellows past the swamp home.
  const read=rom=>decompress(rom,cartridgeOffset(u24(rom,0x6ffe0),rom)).bytes;
  const before=read(built.base),after=read(built.rom);
  assert.equal(after.length,before.length);
  for(let i=0;i<before.length;i++)assert.equal(after[i],i===0xff7?14:before[i],'world script byte '+i);
});
