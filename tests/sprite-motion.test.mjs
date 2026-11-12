import test from 'node:test';
import {cast} from '../content/cast.js';
import {overworldHeroArt} from '../content/overworld-heroes.js';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from './helpers.mjs';
import {sprite,tile4bpp} from '../engine/sprites.js';
import {rasterArtInfo} from '../engine/raster-art.js';
import {caretakerSprite,onionJarSprite} from '../engine/native-sprites.js';
import {caretakerFrames} from '../content/caretaker.js';
import {overworldHeroSprite,overworldHeroFrame,overworldHeroPalette,overworldPaletteBytes} from '../engine/environment.js';
import {decompress} from '../engine/compression.js';
import {u24} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';

const built=await build(),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const directionNames=['back','front','left','right'];
function sequence(id,pose,facing){
  const key=id===0?'shrek':id===1?'fiona':id===2?'donkey':id===3?'pinocchio':id===4?'puss':id===5?'mongo':'farquaad';
  const directions=rasterArtInfo(key).sequences[pose];
  return directions?.[facing]??(facing===3?directions?.[2]:null);
}
function assertMotion(id,pose,facing,minimum){
  const frames=sequence(id,pose,facing);assert.ok(frames?.length,`${id} ${pose}/${facing} exists`);
  const pixels=frames.map((_,phase)=>sprite(id,facing,pose,phase,{weapon:'rapier'}));
  assert.ok(new Set(pixels.map(sha)).size>=minimum,`${id} ${pose}/${directionNames[facing]} has at least ${minimum} distinct drawings`);
}

test('every repaired party movement and combat loop contains real motion',()=>{
  const expectations=[
    [0,{walk:6,run:6}],
    [1,{walk:4,run:3,battle:2,shoot:2,'jump-shot':2,'cast-walk':2,'overhead-shot':2,cast:2}],
    [2,{walk:4,run:3,battle:2,channel:2,charge:2,sigh:2,shoot:2,down:2}],
    [3,{walk:4,run:4,battle:3,punch:2,uppercut:2,spin:2}],
    [4,{walk:4,run:3,battle:2,cast:2}],
    [5,{walk:4,roll:3,kick:2,battle:2,jump:2,tumble:2}],
    [6,{walk:4,run:3,battle:2,cast:2,'cast-walk':2,'big-cast':2,float:2}],
  ];
  for(const[id,poses]of expectations)for(const[pose,minimum]of Object.entries(poses))for(let facing=0;facing<4;facing++)if(sequence(id,pose,facing)?.length>1)assertMotion(id,pose,facing,minimum);
  for(let facing=0;facing<4;facing++)for(let phase=0;phase<6;phase++)assert.deepEqual(sprite(1,facing,'run',phase),sprite(1,facing,'walk',phase),`Fiona run ${directionNames[facing]} phase ${phase} uses the reviewed gait, not a T-pose gesture`);
  // Nobody lives with Shrek: the empty-house actor draws nothing in any
  // role, and the onion jar is one still frame in every role.
  assert.ok(caretakerFrames.map(caretakerSprite).every(f=>f.every(v=>v===0)),'the empty house draws nobody');
  const jar=caretakerFrames.map(onionJarSprite);
  assert.equal(new Set(jar.map(sha)).size,1,'the onion jar never animates');assert.ok(jar[0].filter(v=>v).length>300,'the onion jar is drawn');
});

test('verified native direction assignments stay attached to the original frame IDs',()=>{
  const cases=[
    [2,{205:[0,'dive']}],
    [4,{168:[0,'thrust']}],
    [5,{29:[0,'kneel'],30:[0,'jump'],41:[0,'jump'],64:[2,'kiss'],65:[3,'kiss'],68:[1,'ready'],99:[1,'kneel'],142:[0,'bow'],202:[2,'kick'],210:[3,'kick'],218:[2,'punch'],249:[2,'hit']}],
    [6,{100:[0,'float'],101:[1,'float'],102:[0,'float'],103:[1,'float']}],
  ];
  for(const[id,frames]of cases)for(const[frame,[facing,pose]]of Object.entries(frames)){
    assert.equal(built.audit.characters[id].map[frame].facing,facing,`${id} frame ${frame} facing`);
    assert.equal(built.audit.characters[id].map[frame].pose,pose,`${id} frame ${frame} pose`);
  }
  assert.equal(built.audit.characters[2].map[207].phase,1,'Donkey alternate left knockout drawing');
  assert.equal(built.audit.characters[2].map[208].phase,1,'Donkey alternate right knockout drawing');
});

test('all overworld heroes have distinct directional idle/step art within the seven-color native limit',()=>{
  for(let id=0;id<7;id++)for(let facing=0;facing<4;facing++){
    const idle=overworldHeroSprite(id,facing),step=overworldHeroSprite(id,facing,true);
    assert.equal(idle.length,256);assert.equal(step.length,256);
    assert.ok(Math.max(...idle,...step)<=7,`${id}/${facing} never emits magenta native palette indices`);
    assert.ok(idle.some(Boolean)&&step.some(Boolean));assert.notDeepEqual(idle,step,`${id}/${facing} has a genuine step`);
  }
});

test('overworld palettes use the OAM-selected playable-ID rows',()=>{
  const palettes=decompress(built.rom,cartridgeOffset(u24(built.rom,0x6fea0),built.rom)).bytes;
  for(let id=0;id<7;id++)assert.deepEqual(palettes.slice(id*32,id*32+32),overworldPaletteBytes(id),`hero ${id} palette row ${id}`);
});

test('Shrek uses his hand-drawn overworld frames and seven field colors',()=>{
  assert.deepEqual(overworldHeroPalette(0),cast[0].palette.slice(0,7));
  const rows=overworldHeroArt[0].frames;
  for(let frame=0;frame<8;frame++){
    const expected=Uint8Array.from(rows[frame].join(''),ch=>ch==='.'?0:overworldHeroArt[0].colors[ch]);
    assert.deepEqual(overworldHeroFrame(0,frame),expected,`Shrek overworld frame ${frame}`);
  }
  assert.deepEqual(overworldHeroSprite(0,3),Uint8Array.from({length:256},(_,i)=>overworldHeroFrame(0,4)[(i&~15)|(15-(i&15))]),'right is the mirrored left');
});

test('reduced overworld heroes keep several fill colors from their own palettes',()=>{
  for(let id=0;id<7;id++){
    const palette=overworldHeroPalette(id);assert.equal(palette.length,7);assert.equal(palette[0],'291820','outline stays first');
    for(const color of palette)assert.ok(cast[id].palette.includes(color),`${id} overworld color ${color} comes from the field palette`);
    for(let frame=0;frame<8;frame++){
      const fills=new Set(overworldHeroFrame(id,frame).filter(c=>c>1)).size;
      // Donkey's rear view is legitimately two greys; everything else keeps detail.
      assert.ok(fills>=(id===2&&(frame===2||frame===3)?2:3),`${id} frame ${frame} keeps ${fills} fill colors`);
    }
  }
});

test('the patched cartridge contains the exact reviewed overworld tiles in native direction order',()=>{
  const player=decompress(built.rom,cartridgeOffset(u24(built.rom,0x6fdf0),built.rom)).bytes;
  for(let id=0;id<7;id++)for(let frame=0;frame<8;frame++){
    const pixels=overworldHeroFrame(id,frame);
    for(let y=0;y<2;y++)for(let x=0;x<2;x++){
      const offset=((id*2+y)*16+frame*2+x)*32;
      assert.deepEqual(player.slice(offset,offset+32),tile4bpp(pixels,16,x*8,y*8),`${id} native overworld frame ${frame} tile ${x},${y}`);
    }
  }
});
