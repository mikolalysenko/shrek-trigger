import test from 'node:test';
import assert from 'node:assert/strict';
import {build,screenshot} from './helpers.mjs';
import {createCore} from '../scripts/core.mjs';
import {decompress} from '../engine/compression.js';
import {titleLogoLayout,TITLE_DISCLAIMER} from '../engine/title.js';
import {titleLogo} from '../content/title-logo.js';

const built=await build();

// Visible OAM entries as the PPU sees them (OBJ size setting 0: 8x8/16x16).
function sprites(s) {
  const out=[];
  for(let e=0;e<128;e++){
    const lo=s.ppu.oam[e*2],at=s.ppu.oam[e*2+1],hi=s.ppu.highOam[e>>3]>>((e&7)*2)&3;
    let x=(lo&255)|(hi&1)<<8;if(x>255)x-=512;const y=lo>>8,size=hi&2?16:8;
    if((y>=224&&y+size<=256)||x<=-size)continue;
    out.push({e,x,y,size,tile:(at&255)|(at>>8&1)<<8,palette:at>>9&7});
  }
  return out;
}
function pixelsOf(s,sprite) {
  const vram=s.ppu.vram,out=new Map();
  for(let y=0;y<sprite.size;y++)for(let x=0;x<sprite.size;x++){
    const t=((sprite.tile&0xf0)+(y>>3)*16&0xf0)|((sprite.tile&15)+(x>>3)&15),base=s.ppu.sprAdr1+t*16,b=7-(x&7),r=y&7;
    const v=(vram[base+r]>>b&1)|(vram[base+r]>>(8+b)&1)<<1|(vram[base+8+r]>>b&1)<<2|(vram[base+8+r]>>(8+b)&1)<<3;
    if(v)out.set(`${sprite.x+x},${(sprite.y+1+y)&255}`,v);
  }
  return out;
}

test('the title draws the imported Shrek logo in the stock clock dial with the stock hands and native sprite limits',async()=>{
  const s=await createCore(built.rom),audit=built.audit.title;
  assert.equal(audit.logo,titleLogo.source.sha256);
  assert.equal(audit.disclaimer,TITLE_DISCLAIMER);
  let flight=0;
  for(let f=0;f<1950;f++){
    s.runFrame();
    // The clock group flies in from the right as one piece; no cell wraps.
    if(f>=725&&f<890){const clock=sprites(s).filter(o=>o.palette===0);if(clock.length){flight++;const xs=clock.map(o=>o.x);assert.ok(Math.max(...xs)-Math.min(...xs)<=96,`clock group wrapped at frame ${f}`);}}
  }
  assert.ok(flight>120,'the S and dial fly in');
  const shown=sprites(s),clock=shown.filter(o=>o.palette===0),letters=shown.filter(o=>o.palette===1),hands=shown.filter(o=>o.palette===3),disclaimer=shown.filter(o=>o.palette===4);
  assert.equal(shown.length,audit.sprites.oam);
  assert.equal(clock.length,audit.sprites.clock);assert.ok(clock.every(o=>o.size===8));
  assert.equal(disclaimer.length,TITLE_DISCLAIMER.length/4);assert.ok(disclaimer.every(o=>o.size===16&&o.y===176));
  assert.deepEqual(disclaimer.map(o=>o.x).sort((a,b)=>a-b),Array.from({length:10},(_,i)=>48+i*16));
  assert.deepEqual([letters.length,letters.every(o=>o.size===16)],[16,true],'H, R, E and K are four 16x16 sprites each');
  // Hands and the now-unused original copyright glyph tiles remain stock.
  const stock=decompress(built.base,0x3e6002).bytes,vram=new Uint8Array(s.ppu.vram.buffer);
  assert.deepEqual(hands.map(o=>o.tile).sort((a,b)=>a-b),[15,31,47,58,59,60,61,62,63]);
  for(const t of [15,31,47,58,59,60,61,62,63,1,2,3,16,17,18,83,84,85,86,90])assert.deepEqual(vram.slice(0x8000+t*32,0x8020+t*32),stock.slice(t*32,t*32+32),`stock tile ${t}`);
  // On screen, every logo pixel is the imported art or the stock dial, and
  // every one of their pixels is drawn (OAM order decides overlaps).
  const layout=titleLogoLayout(built.base),expected=new Map(),drawn=new Map();
  for(let i=0;i<layout.W*layout.H;i++)if(layout.clock[i]>=0)expected.set(`${i%layout.W},${Math.floor(i/layout.W)}`,`0:${layout.clock[i]}`);
  for(const l of layout.letters)for(let i=0;i<l.canvas.length;i++){const k=`${i%layout.W},${Math.floor(i/layout.W)}`;if(l.canvas[i]>=0&&!expected.has(k))expected.set(k,`1:${l.canvas[i]}`);}
  for(const o of [...clock,...letters].sort((a,b)=>a.e-b.e))for(const [k,v] of pixelsOf(s,o))if(!drawn.has(k))drawn.set(k,`${o.palette}:${v}`);
  // Letters tucked under the S are hidden by it, as the clock group comes first.
  for(const [k,v] of drawn)assert.equal(v,expected.get(k),`pixel ${k}`);
  for(const [k,v] of expected)assert.equal(drawn.get(k),v,`pixel ${k}`);
  // Hardware limits: 32 sprites and 34 eight-pixel slivers per scanline.
  for(let line=0;line<224;line++){
    const on=shown.filter(o=>((line-o.y-1)&255)<o.size);
    assert.ok(on.length<=32&&on.reduce((n,o)=>n+o.size/8,0)<=34,`scanline ${line}`);
  }
  // The palettes carry the dial's greys and the imported green ramp.
  const bgr=h=>{const n=parseInt(h,16);return ((n>>19)&31)|((n>>11)&31)<<5|((n>>3)&31)<<10;};
  assert.deepEqual(Array.from(s.ppu.cgram.slice(133,144)),titleLogo.ramp.map(bgr));
  assert.deepEqual(Array.from(s.ppu.cgram.slice(145,156)),titleLogo.ramp.map(bgr));
  await screenshot(s,'.local/qa/native-title-logo.png');
});

test('the logo letters slide out from behind the S to their imported places',async()=>{
  const s=await createCore(built.rom),lefts=[];
  for(let f=0;f<960;f++){s.runFrame();if(f>=880&&f%4===0)lefts.push(Math.max(...sprites(s).filter(o=>o.palette===1).map(o=>o.x),-1));}
  const first=lefts.findIndex(x=>x>=0);
  assert.ok(first>=0,'letters appear after the S arrives');
  for(let i=first+1;i<lefts.length;i++)assert.ok(lefts[i]>=lefts[i-1],'letters only move right');
  const last=titleLogo.letters.at(-1);
  assert.equal(lefts.at(-1),last.x+16*Math.floor((last.rows[0].length-1)/16),'K settles at its imported position');
});

test('the dark intro swings the Mode 7 pendulum before the logo flies in',async()=>{
  // M7HOFS/M7VOFS/M7X/M7Y are 13-bit two's complement. The intro pendulum
  // pivots at M7Y = $FFC0 (-64); reading that as -4160 left the intro black.
  const probe=await createCore(built.rom);
  for(const [value,expected] of [[0xffc0,-64],[0x1000,-4096],[0x0fff,4095],[0xefc0,4032]]){
    probe.ppu.write(0x20,value&255);probe.ppu.write(0x20,value>>8);
    assert.equal(probe.ppu.mode7Y,expected,`M7Y $${value.toString(16)}`);
  }
  const s=await createCore(built.rom),px=new Uint8Array(512*480*4),centres=[];
  for(let f=1;f<725;f++){
    s.runFrame();
    if(f<150||f%15)continue;
    s.setPixels(px);let lit=0,sum=0;
    for(let y=0;y<480;y+=2)for(let x=0;x<512;x+=2){const i=(y*512+x)*4;if(px[i]+px[i+1]+px[i+2]>60){lit++;sum+=x>>1;}}
    if(lit>1000)centres.push(sum/lit);
  }
  assert.ok(centres.length>=20,`pendulum on screen in only ${centres.length} of 39 sampled intro frames`);
  assert.ok(Math.max(...centres)-Math.min(...centres)>=60,'the intro pendulum does not swing');
});
