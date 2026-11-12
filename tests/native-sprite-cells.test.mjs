import test from 'node:test';
import assert from 'node:assert/strict';
import {compileSpriteFrames} from '../engine/native-sprites.js';
import {tile4bpp} from '../engine/sprites.js';
import {u16} from '../engine/rom.js';

test('explicit overlapping poses keep the fixed cell budget and duplicate only exact source pixels',()=>{
 const frame=Uint8Array.from({length:1024},(_,p)=>p%32<24?(p*7%12)+1:0),origins=[[0,0],[8,0],[0,16],[8,16]];
 const options={width:32,height:32,size:0,frameCellOrigins:[origins]};
 assert.throws(()=>compileSpriteFrames([frame],options),/overlap/);
 const compiled=compileSpriteFrames([frame],{...options,cellOverlapFrames:[0]});assert.equal(compiled.assembly.length,40);
 for(let c=0;c<4;c++)for(let row=0;row<2;row++)for(let col=0;col<2;col++){
  const word=u16(compiled.assembly,row*16+c*4+col*2),tile=compiled.graphics.slice((word&1023)*32,(word&1023)*32+32);
  if(word&0x4000)for(let i=0;i<32;i++){let v=tile[i];v=(v>>1&85)|(v&85)<<1;v=(v>>2&51)|(v&51)<<2;tile[i]=(v>>4)|(v&15)<<4;}
  assert.deepEqual(tile,tile4bpp(frame,32,origins[c][0]+col*8,origins[c][1]+row*8));
 }
 for(const selection of[[0,0],[-1],[1],[.5]])assert.throws(()=>compileSpriteFrames([frame],{...options,cellOverlapFrames:selection}),/overlap selection/);
 assert.throws(()=>compileSpriteFrames([frame],{width:32,height:32,cellOrigins:origins,cellOverlapFrames:[0]}),/overlap selection/);
 const separate=[[0,0],[16,0],[0,16],[16,16]];assert.throws(()=>compileSpriteFrames([frame],{...options,frameCellOrigins:[separate],cellOverlapFrames:[0]}),/no cell overlap/);
 const outside=frame.slice();outside[31]=1;assert.throws(()=>compileSpriteFrames([outside],{...options,cellOverlapFrames:[0]}),/outside native/);
});
