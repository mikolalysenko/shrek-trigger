import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {enforcerFamilies} from '../../../content/enforcer-actors.js';
import {compileActorFamily} from '../../../engine/actor-families.js';
import {compress,decompress} from '../../../engine/compression.js';
import {spriteHeaders} from '../../../engine/native-sprites.js';
import {u16,u24,fileOffset,put16,validateRom} from '../../../engine/rom.js';
import {snesColor,tile4bpp} from '../../../engine/sprites.js';
const root=new URL('./',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex'),width=64,height=80;
const rev=b=>{b=(b&0x55)<<1|(b>>1&0x55);b=(b&0x33)<<2|(b>>2&0x33);return(b&15)<<4|b>>4;};
const tileKey=t=>{const a=Buffer.from(t).toString('hex'),b=Buffer.from(Uint8Array.from(t,v=>rev(v))).toString('hex');return a<b?a:b;};
function placeCells(frames){
 const seen=new Set([tileKey(new Uint8Array(32))]),origins=[],summary=[];
 for(const [frame,p] of frames.entries()){
  let best=null;
  for(let py=0;py<16;py++){
   if(p.some((v,i)=>v&&((i/width|0)<py||(i/width|0)>=py+Math.floor((height-py)/16)*16)))continue;
   let states=[{selected:[],grid:[],score:0,phases:[]}];
   for(let y=py;y+16<=height;y+=16){
    const options=[];
    for(let px=0;px<16;px++){
     const grid=[],occupied=[],covered=new Uint8Array(width);
     for(let x=px;x+16<=width;x+=16){let opaque=0;for(let xx=x;xx<x+16;xx++){covered[xx]=1;for(let yy=y;yy<y+16;yy++)opaque+=!!p[yy*width+xx];}const cell=[x,y];grid.push(cell);if(opaque)occupied.push(cell);}
     let missing=false;for(let yy=y;yy<y+16;yy++)for(let x=0;x<width;x++)if(p[yy*width+x]&&!covered[x])missing=true;if(missing)continue;
     const keys=new Set();for(const[x,cy]of occupied)for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++)keys.add(tileKey(tile4bpp(p,width,x+xx*8,cy+yy*8)));
     const fresh=[...keys].filter(k=>!seen.has(k));options.push({selected:occupied,grid,score:fresh.length*10000+occupied.length*100+px,phase:[px,y]});
    }
    const next=new Map();for(const a of states)for(const b of options){const n=a.selected.length+b.selected.length;if(n>8)continue;const c={selected:[...a.selected,...b.selected],grid:[...a.grid,...b.grid],score:a.score+b.score,phases:[...a.phases,b.phase]};if(!next.has(n)||c.score<next.get(n).score)next.set(n,c);}states=[...next.values()];
   }
   for(const state of states){const selected=state.selected.slice(),occupied=selected.length;for(const cell of state.grid)if(selected.length<8&&!selected.includes(cell))selected.push(cell);if(selected.length!==8)continue;
    const keys=new Set();for(const[x,y]of selected)for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++)keys.add(tileKey(tile4bpp(p,width,x+xx*8,y+yy*8)));
    const fresh=[...keys].filter(k=>!seen.has(k)),score=fresh.length*10000+occupied*100+py;
    if(!best||score<best.score)best={selected,keys,fresh,score,phase:state.phases,occupied};
   }
  }
  if(!best)throw Error('No eight-cell grid covers complete source pixels at native frame '+frame);
  for(const k of best.keys)seen.add(k);origins.push(best.selected);summary.push({frame,phase:best.phase,occupiedCells:best.occupied,newTiles:best.fresh.length,cumulativeTiles:seen.size});
 }
 return{origins,summary,tiles:seen.size};
}
export async function compileBriarDraft(){
 const base=await validateRom(await readFile(new URL('../../../.local/chrono-trigger-usa.sfc',root))),asset=JSON.parse(await readFile(new URL('draft/preview-raster.json',root))),spec=JSON.parse(await readFile(new URL('import-spec.draft.json',root))),family=structuredClone(enforcerFamilies.find(f=>f.key==='briar-knight'));
 assert.equal(asset.width,width);assert.equal(asset.height,height);assert.deepEqual(asset.palette,family.actors[0].colors);
 for(const s of asset.provenance)assert.equal(hash(await readFile(new URL('../../../'+s.file,root))),s.sha256);
 const frames=asset.sequences.native[1].map(entry=>{const n=typeof entry==='number'?entry:entry.frame,source=Uint8Array.from(asset.frames[n],c=>parseInt(c,16)),p=new Uint8Array(width*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const xx=(entry.flip?width-1-x:x)+(entry.dx??0),yy=y+(entry.dy??0),v=source[y*width+x];if(entry.dissolve===11)continue;if(v)assert.ok(xx>=0&&xx<width&&yy>=0&&yy<height,'Mapped source clipped');if(xx>=0&&xx<width&&yy>=0&&yy<height&&(xx*3+yy*5)%11>=(entry.dissolve??0))p[yy*width+xx]=v;}return p;});
 assert.equal(frames.length,86);assert.deepEqual(frames.flatMap((p,f)=>p.some(Boolean)?[]:[f]),[39,40,41]);for(const p of frames){assert.equal(p.length,width*height);assert.ok(p.every(v=>v<=12));}
 const cells=placeCells(frames);family.groups[0].frameCellOrigins=cells.origins;family.groups[0].frameOffsets=spec.notes.frameOffsets;
 const c=compileActorFamily(family,(_,f)=>frames[f]),compressed=compress(c.graphics),assembly=c.groups[0].assembly,palette=new Uint8Array(24);asset.palette.forEach((c,i)=>put16(palette,i*2,snesColor(c)));
 const graphicsOffset=fileOffset(u24(base,0x242000+166*3)),old=decompress(base,graphicsOffset),assemblyOffset=fileOffset(u24(base,0x242300+158*3)),paletteOffset=0x240000+u16(base,0x242a00+200*2);assert.equal(assembly.length,6880);
 const headers=spriteHeaders(base);for(const[field,id]of[[0,166],[1,158],[2,200]])assert.deepEqual(headers.filter(h=>base[h.offset+field]===id).map(h=>[h.kind,h.id]),[['enemy',157],['enemy',158],['enemy',165],['enemy',186]]);for(let id=0;id<256;id++)if(id!==200)assert.notEqual(0x240000+u16(base,0x242a00+id*2),paletteOffset);
 // Reconstruct every pixel from the emitted native tile words and all eight
 // nonoverlapping 16×16 cells. This also proves full sword/afterimage coverage.
 for(let f=0;f<86;f++){
  const unpacked=new Uint8Array(width*height);
  for(let cell=0;cell<8;cell++){const [cx,cy]=cells.origins[f][cell];for(let y=0;y<16;y++)for(let x=0;x<16;x++){const word=u16(assembly,f*80+(y>>3)*32+cell*4+(x>>3)*2),tile=word&1023,tx=word&0x4000?7-(x&7):x&7;assert.equal(word&0x8000,0);let v=0;for(let bit=0;bit<4;bit++)v|=(c.graphics[tile*32+(bit>>1)*16+(y&7)*2+(bit&1)]>>(7-tx)&1)<<bit;unpacked[(cy+y)*width+cx+x]=v;}
   assert.equal(assembly[f*80+64+cell*2],(cx-32+(family.groups[0].frameOffsets[f]?.[0]??0))&255);assert.equal(assembly[f*80+65+cell*2],(cy-80+(family.groups[0].frameOffsets[f]?.[1]??0))&255);
  }
  assert.deepEqual(unpacked,frames[f],'Packed source pixels at frame '+f);
 }
 return{base,asset,spec,family,frames,cells,graphics:c.graphics,compressed,assembly,palette,original:{graphicsOffset,graphicsBytes:old.bytes.length,compressedBytes:old.length,assemblyOffset,assemblyBytes:6880,paletteOffset},records:[{offset:assemblyOffset,bytes:assembly,label:'Draft Briar Knight assembly'},{offset:paletteOffset,bytes:palette,label:'Draft Briar Knight palette'}]};
}
export function atlas(frames,palette,scale=1){const colors=palette.map(s=>[0,2,4].map(i=>{const v=parseInt(s.slice(i,i+2),16)>>3;return v<<3|v>>2;})),im=new PNG({width:8*width*scale,height:Math.ceil(frames.length/8)*height*scale});frames.forEach((p,i)=>p.forEach((v,j)=>{if(v)for(let y=0;y<scale;y++)for(let x=0;x<scale;x++)im.data.set([...colors[v-1],255],((((i/8|0)*height+(j/width|0))*scale+y)*im.width+(i%8*width+j%width)*scale+x)*4);}));return PNG.sync.write(im);}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){
 const c=await compileBriarDraft();for(const[name,data]of[['graphics.4bpp',c.graphics],['graphics.ct-lz',c.compressed],['assembly.bin',c.assembly],['palette.bin',c.palette],['native-1x.png',atlas(c.frames,c.asset.palette)],['native-4x.png',atlas(c.frames,c.asset.palette,4)]])await writeFile(new URL('draft/'+name,root),data);
 await writeFile(new URL('draft/family.json',root),JSON.stringify(c.family,null,2)+'\n');
 const audit=JSON.parse(await readFile(new URL('native-audit.json',root))),roles=JSON.parse(await readFile(new URL('native-roles.json',root))),report={status:'Inactive generated-source candidate; all packed pixels passed. Original family decoded-size guard remains unchanged.',dimensions:[width,height],nativeFrames:86,visibleFrames:83,blankFrames:[39,40,41],original:c.original,rawGraphicsBytes:c.graphics.length,tiles:c.graphics.length/32,compressedBytes:c.compressed.length,assemblyBytes:c.assembly.length,graphicsSha256:hash(c.graphics),assemblySha256:hash(c.assembly),pixelsSha256:hash(Uint8Array.from(c.frames.flatMap(p=>Array.from(p)))),nativeOffsets:c.family.groups[0].frameOffsets,cellPlacement:{method:'Nonoverlapping 16×16 row-band placement search. Minimize new exact tiles with hardware horizontal-flip sharing; no source pixels modified or omitted.',nativeCellsPerFrame:8,summary:c.cells.summary,origins:c.cells.origins},roles:roles.roles.map((r,f)=>({...r,opaquePixels:c.frames[f].filter(Boolean).length})),sceneOriginalLoadUpperBounds:audit.scenes.map(s=>({location:s.location,originalBytes:s.originalWholeLocationLoadUpperBound.bytes,candidateBytes:s.originalWholeLocationLoadUpperBound.bytes+c.graphics.length-c.original.graphicsBytes,limit:32768})),provenance:c.asset.provenance};await writeFile(new URL('draft/verification.json',root),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({raw:c.graphics.length,tiles:c.graphics.length/32,compressed:c.compressed.length,assembly:c.assembly.length,original:c.original,coLoads:report.sceneOriginalLoadUpperBounds}));
}
