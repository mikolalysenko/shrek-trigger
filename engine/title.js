import {decompress, compress} from './compression.js';
import {tile4bpp} from './sprites.js';
import {put16, put24, u24} from './rom.js';
import {titleLogo} from '../content/title-logo.js';

// The title cinematic is decompressed to $7E:3000 and runs there. Its sprite
// groups are tables of [tile, attribute, dx, dy] entries after a count+1 byte,
// drawn around an anchor by C3:0D0E (8x8, signed offsets) or C3:0D5E (16x16,
// offsets 0-255). Addresses below are WRAM addresses inside that code.
const RAM=0x3000;
const CLOCK_TABLE=0x603f,CLOCK_LOW_TABLE=0x60bc,LETTER_TABLES=[0x60f1,0x610a,0x6123,0x6148,0x6161];
const CLOCK_POINTER=0x5d0a,CLOCK_LOW_POINTER=0x5d19,LETTER_POINTERS=0x5d5d,LETTER_SPEEDS=0x5d67,LETTER_DRAW=0x5d9b;
const LETTER_TARGETS=[0x5a10,0x5a15,0x5a1a,0x5a1f,0x5a24],LETTER_START=0x5a29;
const HAND_TABLE=0x61b4,COPYRIGHT_TABLES=[0x6186,0x619b];
const CLOCK_ANCHOR=[56,58],CLOCK_FLIGHT_X=212,LETTER_Y=82,HANDS_ANCHOR=[58,100];
const COPYRIGHT_ANCHORS=[[48,176],[128,176]],COPYRIGHT_DRAW_CALLS=[0x5e2c,0x5e38];
export const TITLE_DISCLAIMER='NOT AFFILIATED WITH SQUARE OR DREAMWORKS';
// Four 3x5 characters per 16x16 sprite keep the complete notice on one line.
const DISCLAIMER_FONT={
 A:['.#.','#.#','###','#.#','#.#'],D:['##.','#.#','#.#','#.#','##.'],
 E:['###','#..','##.','#..','###'],F:['###','#..','##.','#..','#..'],
 H:['#.#','#.#','###','#.#','#.#'],I:['###','.#.','.#.','.#.','###'],
 K:['#.#','#.#','##.','#.#','#.#'],L:['#..','#..','#..','#..','###'],
 M:['#.#','###','#.#','#.#','#.#'],N:['#.#','###','###','###','#.#'],
 O:['.#.','#.#','#.#','#.#','.#.'],Q:['.#.','#.#','#.#','##.','..#'],
 R:['##.','#.#','##.','#.#','#.#'],S:['.##','#..','.#.','..#','##.'],
 T:['###','.#.','.#.','.#.','.#.'],U:['#.#','#.#','#.#','#.#','.#.'],
 W:['#.#','#.#','#.#','###','#.#'],' ':['...','...','...','...','...']
};
// The clock and letter tables are contiguous: 7 count bytes + 80 entries.
const TABLE_START=CLOCK_TABLE,TABLE_END=0x6186;
const OBJ_TILES=252,LETTER_START_X=60,SLIDE_FRAMES=52;

const tableAt=(code,address)=>{
  const at=address-RAM,count=code[at]-1;
  return Array.from({length:count},(_,i)=>{const p=at+1+i*4;return {tile:code[p],attr:code[p+1],dx:code[p+2]<<24>>24,dy:code[p+3]<<24>>24};});
};
const word=(code,address)=>code[address-RAM]|code[address-RAM+1]<<8;
function setWord(code,address,value){code[address-RAM]=value&255;code[address-RAM+1]=value>>8;}
function pixel(graphics,tile,x,y){const o=tile*32,b=7-x;return (graphics[o+y*2]>>b&1)|(graphics[o+y*2+1]>>b&1)<<1|(graphics[o+16+y*2]>>b&1)<<2|(graphics[o+17+y*2]>>b&1)<<3;}
const bgr=hex=>{const n=parseInt(hex,16);return ((n>>19)&31)|((n>>11)&31)<<5|((n>>3)&31)<<10;};

function verifyStock(code) {
  const expect=(address,bytes,label)=>{if(bytes.some((v,i)=>code[address-RAM+i]!==v))throw Error(`Title cinematic signature mismatch: ${label}`);};
  expect(CLOCK_POINTER-1,[0xa9,0x3f,0x60,0x22,0x0e,0x0d,0xc3],'clock group');
  expect(CLOCK_LOW_POINTER-1,[0xa9,0xbc,0x60,0x22,0x0e,0x0d,0xc3],'lower clock group');
  expect(LETTER_POINTERS,[0xf1,0x60,0x0a,0x61,0x23,0x61,0x48,0x61,0x61,0x61,4,0,9,0,14,0,20,0,24,0],'letter tables and speeds');
  expect(LETTER_DRAW-1,[0x22,0x0e,0x0d,0xc3],'letter draw call');
  expect(0x5d71,[0xa9,LETTER_Y,0,0x85,0x17],'letter baseline');
  [0x670,0x770,0x860,0x9a0,0xa90,0x5a0].forEach((v,i)=>expect([...LETTER_TARGETS,LETTER_START][i]-1,[0xa9,v&255,v>>8],'letter slide'));
  expect(0x5d20,[0xa9,HANDS_ANCHOR[1],0,0x85,0x17,0xa9,HANDS_ANCHOR[0],0,0x85,0x15,0xa9,0xb4,0x61],'clock hands');
  expect(0x5e1e,[0xa9,208,0,0x85,0x17],'copyright baseline');
  expect(0x5e23,[0xa9,120,0,0x85,0x15,0xa9,0x86,0x61,0x22,0x0e,0x0d,0xc3],'first copyright draw');
  expect(0x5e2f,[0xa9,184,0,0x85,0x15,0xa9,0xa7,0x61,0x22,0x0e,0x0d,0xc3],'second copyright draw');
  if(code[CLOCK_TABLE-RAM]!==32||code[CLOCK_LOW_TABLE-RAM]!==14||LETTER_TABLES.some((a,i)=>code[a-RAM]!==[7,7,10,7,10][i]))throw Error('Title sprite table signature mismatch');
}

// The stock clock C stands in a dial of arcs, minute marks and XII/IX/VI
// numerals drawn in the same 8x8 cells. Keep the dial and drop the C.
function stockDial(graphics,code) {
  const W=256,H=128,stock=new Int16Array(W*H).fill(-1);
  for(const [address,anchor] of [[CLOCK_TABLE,CLOCK_ANCHOR],[CLOCK_LOW_TABLE,[CLOCK_ANCHOR[0],CLOCK_ANCHOR[1]+64]]])
    for(const s of tableAt(code,address))for(let y=0;y<8;y++)for(let x=0;x<8;x++){
      const v=pixel(graphics,s.tile,x,y),X=anchor[0]+s.dx+x,Y=anchor[1]+s.dy+1+y;if(v&&X>=0&&Y>=0&&X<W&&Y<H)stock[Y*W+X]=v;
    }
  const letterBody=new Set([5,7,8,9,12]),dial=new Int16Array(W*H).fill(-1);
  // Dark texture within two pixels of the C's brown body belongs to the C.
  const near=(x,y)=>{let n=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<W&&Y<H&&letterBody.has(stock[Y*W+X]))n++;}return n;};
  const slot={2:1,3:1,4:2,6:3,10:4,11:4};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=stock[y*W+x];if(v<0||letterBody.has(v)||(v<=3&&near(x,y)>=3))continue;dial[y*W+x]=slot[v];}
  return dial;
}

// Indexed canvases (screen coordinates) for the clock group and each letter.
function logoCanvases(dial) {
  const W=256,H=128,digit=c=>'123456789ab'.indexOf(c);
  const clock=dial.slice();
  const {s}=titleLogo;
  s.rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(c!=='.')clock[(s.y+y)*W+s.x+x]=4+digit(c)+1;}));
  const letters=titleLogo.letters.map(l=>{
    const canvas=new Int16Array(W*H).fill(-1);
    l.rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(c!=='.')canvas[(l.y+y)*W+l.x+x]=digit(c)+1;}));
    return {name:l.name,x:l.x,y:l.y,w:l.rows[0].length,h:l.rows.length,canvas};
  });
  return {W,H,clock,letters};
}

// Smallest 8x8 cover of the clock group: the best regular grid for the dense
// S, then greedy cells for the dial's thin arcs and numerals left over.
function clockCells(canvas,W,H,dense) {
  const covered=new Uint8Array(W*H);
  const hit=(x,y,mask)=>{for(let j=0;j<8;j++)for(let i=0;i<8;i++){const X=x+i,Y=y+j;if(X>=0&&Y>=0&&X<W&&Y<H&&mask(Y*W+X))return true;}return false;};
  let best=null;
  for(let oy=0;oy<8;oy++)for(let ox=0;ox<8;ox++){
    const cells=[];for(let y=oy-8;y<H;y+=8)for(let x=ox-8;x<W;x+=8)if(hit(x,y,i=>dense[i]))cells.push([x,y]);
    if(!best||cells.length<best.length)best=cells;
  }
  const take=([x,y])=>{for(let j=0;j<8;j++)for(let i=0;i<8;i++){const X=x+i,Y=y+j;if(X>=0&&Y>=0&&X<W&&Y<H)covered[Y*W+X]=1;}};
  best.forEach(take);
  for(;;){
    let most=0,at=null;
    for(let y=-7;y<H;y++)for(let x=-7;x<W;x++){
      let n=0;for(let j=0;j<8;j++)for(let i=0;i<8;i++){const X=x+i,Y=y+j;if(X>=0&&Y>=0&&X<W&&Y<H&&canvas[Y*W+X]>=0&&!covered[Y*W+X])n++;}
      if(n>most){most=n;at=[x,y];}
    }
    if(!at)break;best.push(at);take(at);
  }
  return best;
}

export function titleLogoLayout(base) {
  const graphics=decompress(base,0x3e6002).bytes,code=decompress(base,0x031313).bytes;
  verifyStock(code);
  const {W,H,clock,letters}=logoCanvases(stockDial(graphics,code));
  const dense=new Uint8Array(W*H);for(let i=0;i<W*H;i++)dense[i]=clock[i]>4;
  const clockGroup=clockCells(clock,W,H,dense).map(([x,y])=>({x,y,size:8}));
  const letterGroups=letters.map(l=>{
    const cells=[];for(let y=l.y;y<l.y+l.h;y+=16)for(let x=l.x;x<l.x+l.w;x+=16){
      let used=false;for(let j=0;j<16&&!used;j++)for(let i=0;i<16;i++)if(l.canvas[(y+j)*W+x+i]>=0){used=true;break;}
      if(used)cells.push({x,y,size:16});
    }
    return {...l,cells};
  });
  return {W,H,clock,clockGroup,letters:letterGroups,graphics,code};
}

// Sprites per scanline at rest, including the stock hands and disclaimer line.
export function titleScanlines(layout) {
  const sprites=new Int32Array(240),slivers=new Int32Array(240);
  const add=(y,size)=>{for(let j=0;j<size;j++){const line=y+j;if(line>=0&&line<240){sprites[line]++;slivers[line]+=size/8;}}};
  layout.clockGroup.forEach(c=>add(c.y,8));layout.letters.forEach(l=>l.cells.forEach(c=>add(c.y,16)));
  tableAt(layout.code,HAND_TABLE).forEach(s=>add(HANDS_ANCHOR[1]+s.dy+1,8));
  for(let i=0;i<TITLE_DISCLAIMER.length/4;i++)add(COPYRIGHT_ANCHORS[0][1]+1,16);
  return {sprites:Math.max(...sprites),slivers:Math.max(...slivers),oam:layout.clockGroup.length+layout.letters.reduce((n,l)=>n+l.cells.length,0)+tableAt(layout.code,HAND_TABLE).length+TITLE_DISCLAIMER.length/4};
}

export function patchTitle(base,allocate,add) {
  if(u24(base,0x3e0048)!==0xfe6002||u24(base,0x3e0051)!==0xfe6e34)throw Error('Title pointer signature mismatch');
  const layout=titleLogoLayout(base),{W,clock,clockGroup,letters,code}=layout;
  const palettes=decompress(base,0x3e6e34).bytes,stockGraphics=layout.graphics;
  const lines=titleScanlines(layout);
  if(lines.sprites>32||lines.slivers>34)throw Error(`Title logo exceeds the per-line sprite limit: ${JSON.stringify(lines)}`);
  if(lines.oam>124)throw Error(`Title logo needs ${lines.oam} of 128 OAM entries`);

  // Tiles: the stock logo's tiles, the blank tiles between them, and tiles
  // 176-251 appended to the title set (the loader uploads its whole length).
  const free=new Set([74,75,76,77,78,79,91,92,93,94,95]);
  for(const address of [CLOCK_TABLE,CLOCK_LOW_TABLE,...LETTER_TABLES])for(const s of tableAt(code,address))free.add(s.tile);
  if(free.size!==91)throw Error('Unexpected stock title tile layout');
  for(let t=176;t<OBJ_TILES;t++)free.add(t);
  const graphics=new Uint8Array(OBJ_TILES*32);graphics.set(stockGraphics);
  for(const t of free)graphics.fill(0,t*32,t*32+32);
  const takeBlock=()=>{for(const t of [...free].sort((a,b)=>b-a))if((t&15)<15&&[t,t+1,t+16,t+17].every(u=>free.has(u))){[t,t+1,t+16,t+17].forEach(u=>free.delete(u));return t;}throw Error('No free 16x16 title tile block');};
  const takeTile=()=>{const t=Math.min(...free);if(!isFinite(t))throw Error('No free title tile');free.delete(t);return t;};
  const cellTile=(canvas,x,y)=>{const p=new Uint8Array(64);for(let j=0;j<8;j++)for(let i=0;i<8;i++){const X=x+i,Y=y+j,v=X>=0&&Y>=0&&X<W&&Y<128?canvas[Y*W+X]:-1;p[j*8+i]=v<0?0:v;}return tile4bpp(p,8,0,0);};

  // Allocate every 16x16 block before the 8x8 clock cells to avoid fragmenting
  // the native tile grid. Letter offsets are unsigned; the clock's are signed.
  const letterEntries=letters.map(l=>l.cells.map(c=>{
    const tile=takeBlock();
    for(const [q,ox,oy] of [[0,0,0],[1,8,0],[16,0,8],[17,8,8]])graphics.set(cellTile(l.canvas,c.x+ox,c.y+oy),(tile+q)*32);
    return [tile,0x02,c.x-l.x,(c.y-1-LETTER_Y)&255];
  }));
  while(letterEntries.length<5)letterEntries.push([]);

  if(TITLE_DISCLAIMER.length!==40||[...TITLE_DISCLAIMER].some(c=>!DISCLAIMER_FONT[c]))throw Error('Unsupported title disclaimer');
  const disclaimerEntries=[];
  for(let cell=0;cell<TITLE_DISCLAIMER.length/4;cell++){
    const pixels=new Uint8Array(16*16),tile=takeBlock();
    for(let c=0;c<4;c++)for(let y=0;y<5;y++)for(let x=0;x<3;x++)if(DISCLAIMER_FONT[TITLE_DISCLAIMER[cell*4+c]][y][x]==='#')pixels[y*16+c*4+x]=5;
    for(const [q,ox,oy] of [[0,0,0],[1,8,0],[16,0,8],[17,8,8]])graphics.set(tile4bpp(pixels,16,ox,oy),(tile+q)*32);
    disclaimerEntries.push([tile,0x08,(cell%5)*16,0]);
  }

  // Clock group: every 8x8 cell in one table, pixels owned by the first cell.
  const owned=clock.slice(),clockEntries=[];
  for(const c of clockGroup){
    const canvas=new Int16Array(owned.length).fill(-1);
    for(let j=0;j<8;j++)for(let i=0;i<8;i++){const X=c.x+i,Y=c.y+j;if(X>=0&&Y>=0&&X<W&&Y<128){canvas[Y*W+X]=owned[Y*W+X];owned[Y*W+X]=-1;}}
    const tile=takeTile();graphics.set(cellTile(canvas,c.x,c.y),tile*32);
    const dx=c.x-CLOCK_ANCHOR[0],dy=c.y-1-CLOCK_ANCHOR[1];
    if(dx<-128||dx+CLOCK_FLIGHT_X>255||dy<-128||dy>127)throw Error('Clock cell outside its signed anchor range');
    clockEntries.push([tile,0x00,dx&255,dy&255]);
  }

  // The new tables replace the stock logo's seven contiguous tables in place
  // (the cinematic keeps its size); the draws are pointed at them.
  const tables=[],pointers=[];let at=TABLE_START;
  for(const entries of [clockEntries,[],...letterEntries]){pointers.push(at);tables.push(entries.length+1,...entries.flat());at+=1+entries.length*4;}
  if(at>TABLE_END)throw Error(`Title sprite tables need ${at-TABLE_START} of ${TABLE_END-TABLE_START} bytes`);
  const cinematic=code.slice();cinematic.fill(0,TABLE_START-RAM,TABLE_END-RAM);cinematic.set(tables,TABLE_START-RAM);
  setWord(cinematic,CLOCK_POINTER,pointers[0]);setWord(cinematic,CLOCK_LOW_POINTER,pointers[1]);
  pointers.slice(2).forEach((p,i)=>setWord(cinematic,LETTER_POINTERS+i*2,p));
  cinematic.set([0x5e,0x0d,0xc3],LETTER_DRAW-RAM);
  setWord(cinematic,LETTER_START,LETTER_START_X*16);
  letters.forEach((l,i)=>{setWord(cinematic,LETTER_TARGETS[i],l.x*16);setWord(cinematic,LETTER_SPEEDS+i*2,Math.ceil((l.x-LETTER_START_X)*16/SLIDE_FRAMES));});
  for(let i=letters.length;i<5;i++){setWord(cinematic,LETTER_TARGETS[i],LETTER_START_X*16);setWord(cinematic,LETTER_SPEEDS+i*2,0);}

  // Replace the stock Square copyright with the full non-affiliation notice.
  // Both existing draw calls become 16x16 draws, five cells per anchor.
  COPYRIGHT_TABLES.forEach((address,group)=>{
    const entries=disclaimerEntries.slice(group*5,group*5+5),at=address-RAM;
    cinematic[at]=entries.length+1;cinematic.set(entries.flat(),at+1);
  });
  COPYRIGHT_ANCHORS.forEach(([x],i)=>setWord(cinematic,[0x5e24,0x5e30][i],x));
  COPYRIGHT_TABLES.forEach((address,i)=>setWord(cinematic,[0x5e29,0x5e35][i],address));
  setWord(cinematic,0x5e1f,COPYRIGHT_ANCHORS[0][1]);
  COPYRIGHT_DRAW_CALLS.forEach(address=>{cinematic[address-RAM]=0x5e;});

  // Palettes: the clock group keeps the dial's greys before the green ramp;
  // the letters use the same ramp. Copies feed the cinematic's fades.
  const ramp=titleLogo.ramp.map(bgr),dial=[0x0442,0x14a5,0x1ce7,0x4a52];
  const clockPalette=[...dial,...ramp],letterPalette=[...ramp,...Array(4).fill(ramp.at(-1))];
  for(const offset of [0x100,0xa0])clockPalette.forEach((c,i)=>put16(palettes,offset+2+i*2,c));
  for(const offset of [0x120,0x1c0])letterPalette.forEach((c,i)=>put16(palettes,offset+2+i*2,c));

  const graphicsOffset=allocate(compress(graphics),'native Shrek title graphics');
  const paletteOffset=allocate(compress(palettes),'native Shrek title palettes');
  const cinematicOffset=allocate(compress(cinematic),'cinematic code with title sprite layout');
  // The loader reads the low pointer from FE:0003 but uses an immediate bank.
  if(base[0x03006a]!==0xa9||base[0x03006b]!==0xc3)throw Error('Cinematic loader signature mismatch');
  if([graphicsOffset,paletteOffset,cinematicOffset].some(o=>o>=0x400000))throw Error('Title data must stay in HiROM banks C0-FF');
  add(0x03006b,Uint8Array.of(0xc0|(cinematicOffset>>16)),'cinematic loader bank');
  for(const [offset,address,label] of [[0x3e0048,graphicsOffset,'title graphics pointer'],[0x3e0051,paletteOffset,'title palette pointer'],[0x3e0003,cinematicOffset,'cinematic code pointer']]) {
    const ptr=new Uint8Array(3);put24(ptr,0,0xc00000|address);add(offset,ptr,label);
  }
  return {native:true,ears:true,disclaimer:TITLE_DISCLAIMER,clock:{dial:'stock arcs and numerals',hands:'stock'},logo:titleLogo.source.sha256,
    sprites:{clock:clockEntries.length,letters:letterEntries.map(e=>e.length),oam:lines.oam,perLine:lines.sprites,slivers:lines.slivers},
    tiles:OBJ_TILES,tableBytes:at-TABLE_START,graphicsOffset,paletteOffset,cinematicOffset,fade:'original cinematic palette routine'};
}
