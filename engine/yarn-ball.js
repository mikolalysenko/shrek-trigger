import {yarnBallArt} from '../content/yarn-ball-art.js';
import {snesColor} from './sprites.js';

// Puss's ultimate, Yarn Bomb (native tech 40, source Frog Squash), keeps its
// native choreography, bounce, damage and low-HP rule. Its BG3 picture
// changes from the giant frog to a giant ball of yarn.
export const yarnBallTech=40,yarnBallBackground=65;

// The native frog map on BG3 (16x16 cells): the big tile of each left-half
// cell by [row][col]. The right half repeats these with horizontal flips, so
// the art is the left half of the ball and the map mirrors the right half.
export const yarnBallMap=[
  [,,0x002,0x004,0x006,0x008],
  [,0x020,0x022,0x024,0x026,0x028],
  [,0x040,0x042,0x044,0x046,0x048],
  [,0x060,0x062,0x064,0x066,0x068],
  [0x080,0x082,0x084,0x00a,0x00c,0x00e],
  [0x086,0x088,0x08a,0x02a,0x02c,0x02e],
  [0x08c,0x08e,,0x04a,0x04c,0x04e],
  [,,0x06e,0x06a,0x06c]
];

// The four 1 KiB chunks the effect stages for BG3 (256 2bpp tiles). Tiles
// the map does not show stay blank, including the native blank cell 0EE.
export function yarnBallGraphics() {
  const graphics=new Uint8Array(4096);
  yarnBallMap.forEach((row,r)=>row.forEach((big,c)=>{
    for(const [dx,dy,tile] of [[0,0,big],[8,0,big+1],[0,8,big+16],[8,8,big+17]])
      for(let y=0;y<8;y++){
        let p0=0,p1=0;
        for(let x=0;x<8;x++){const v=+yarnBallArt.rows[r*16+dy+y][c*16+dx+x];p0|=(v&1)<<(7-x);p1|=(v>>1&1)<<(7-x);}
        graphics[tile*16+y*2]=p0;graphics[tile*16+y*2+1]=p1;
      }
  }));
  return {graphics,palette:yarnBallArt.palette.map(snesColor)};
}

// The native frog paints a scrolling rainbow over BG3 with color math: an
// HDMA table of 96 lines (CGWSEL, CGADSUB, COLDATA, SETINI from $7E:BB05)
// that script opcode CD:2D44 fills once and CD:2D1F rotates up one line per
// frame. Yarn Bomb fills the COLDATA bytes with one soft white glint
// instead, which the same rotation sweeps up the ball.
export function yarnBallGlint() {
  const table=new Uint8Array(96*4);
  for(let i=0;i<96;i++){const d=Math.abs(i-12),v=d<12?Math.round(6*Math.cos(Math.PI*d/24)**2):0;table.set([0,4,0xe0|v,0],i*4);}
  return table;
}
