// Inactive source compiler. No ROM, file-system, registry or runtime writes.
// Preserve independent native cells: flattening a rider loses hidden pixels.
const requireValue=(condition,message)=>{if(!condition)throw Error(message);};
const writeWord=(a,p,w)=>{a[p]=w&255;a[p+1]=w>>>8;};
const reverseByte=v=>{v=(v>>>1&0x55)|(v&0x55)<<1;v=(v>>>2&0x33)|(v&0x33)<<2;return(v>>>4)|(v&15)<<4;};
function tile(pixels,x,y){
  const bytes=new Uint8Array(32);
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    const value=pixels[(y+row)*16+x+col];
    for(let bit=0;bit<4;bit++)bytes[(bit>>>1)*16+row*2+(bit&1)]|=((value>>>bit)&1)<<(7-col);
  }
  return bytes;
}

export function compileSwampImpCells(source){
  requireValue(source.gfx===86&&source.activation===false,'Expected inactive gfx86 source');
  const expected=[['imp',43,0,4,28],['roly',63,0,4,26],['rider',65,1,8,29]];
  requireValue(source.groups.length===expected.length,'Unexpected native group count');
  const groups=source.groups.map((g,i)=>{
    const[key,asm,size,cells,frames]=expected[i];
    requireValue(g.key===key&&g.asm===asm&&g.size===size&&g.cells===cells&&g.frames.length===frames,'Native group identity changed');
    return{...g,frames:g.frames.map((f,n)=>{
      requireValue(f.frame===n&&f.cells.length===cells,'Native frame/cell count changed');
      return{...f,cells:f.cells.map(c=>{
        requireValue(Number.isInteger(c.x)&&Number.isInteger(c.y)&&c.x>=-128&&c.x<=127&&c.y>=-128&&c.y<=127,'Invalid native signed origin');
        requireValue(typeof c.pixels==='string'&&/^[0-9abc]{256}$/.test(c.pixels),'Expected sixteen-square cell with twelve native colors');
        return{...c,pixels:Uint8Array.from(c.pixels,v=>parseInt(v,16))};
      })};
    })};
  });
  const tiles=[new Uint8Array(32)],indices=new Map([[Array(32).fill(0).join(','),0]]);
  function intern(bytes){
    const key=Array.from(bytes).join(',');
    if(indices.has(key))return indices.get(key);
    const id=tiles.length;
    requireValue(id<1024,'Native ten-bit tile bank exceeded');
    tiles.push(bytes);indices.set(key,id);
    const mirror=Array.from(bytes,reverseByte).join(',');
    if(!indices.has(mirror))indices.set(mirror,id|0x4000);
    return id;
  }
  function frame(cells){
    const assembly=new Uint8Array(cells.length*10);
    for(let row=0;row<2;row++)for(let c=0;c<cells.length;c++)for(let col=0;col<2;col++)
      writeWord(assembly,row*cells.length*4+c*4+col*2,intern(tile(cells[c].pixels,col*8,row*8)));
    cells.forEach((c,i)=>assembly.set([c.x&255,c.y&255],cells.length*8+i*2));
    return assembly;
  }
  const emitted=groups.slice(0,2).map(g=>({key:g.key,asm:g.asm,size:g.size,cells:g.cells,frames:g.frames.length,assembly:Uint8Array.from(g.frames.flatMap(f=>Array.from(frame(f.cells))))}));
  // The selected source packing first interned three additional four-cell
  // components: dot-free recoil mount, turned rider and cropped rider-only.
  // Their full pixels are already preserved in these native mounted cells.
  frame(groups[2].frames[12].cells.slice(4,8));
  frame(groups[2].frames[15].cells.slice(0,4));
  frame(groups[2].frames[28].cells.slice(0,4));
  const rider=groups[2];
  emitted.push({key:rider.key,asm:rider.asm,size:rider.size,cells:rider.cells,frames:rider.frames.length,assembly:Uint8Array.from(rider.frames.flatMap(f=>Array.from(frame(f.cells))))});
  return{graphics:Uint8Array.from(tiles.flatMap(t=>Array.from(t))),tiles:tiles.length,groups:emitted};
}
