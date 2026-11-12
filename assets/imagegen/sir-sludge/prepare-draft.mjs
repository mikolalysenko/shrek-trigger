import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {PNG} from 'pngjs';
import {solveCover} from './cover-solver.mjs';
import {tile4bpp} from '../../../engine/sprites.js';
export const dir='assets/imagegen/sir-sludge',origin=[64,80];
export function nativePixels(asset,entry){const e=typeof entry==='number'?{frame:entry}:entry,p=Uint8Array.from(asset.frames[e.frame],c=>parseInt(c,16)),out=new Uint8Array(p.length),w=asset.width,h=asset.height;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(p[y*w+x]){const xx=(e.flip?w-1-x:x)+(e.dx??0),yy=y+(e.dy??0);assert.ok(xx>=0&&xx<w&&yy>=0&&yy<h,'Native source cannot clip');out[yy*w+xx]=p[y*w+x];}return out;}
export async function loadDraft(){const audit=JSON.parse(await readFile(dir+'/native-audit.json')),asset=JSON.parse(await readFile(dir+'/draft/preview-raster.json')),frames=asset.sequences.native[1].map(e=>nativePixels(asset,e));return{audit,asset,frames};}
const {audit,asset,frames}=await loadDraft(),w=asset.width,h=asset.height,seen=new Set(),packing=[];
for(const[f,p]of frames.entries()){
 let best;for(let py=0;py<16;py++){
  if(p.some((v,i)=>v&&(Math.floor(i/w)<py||Math.floor(i/w)>=py+Math.floor((h-py)/16)*16)))continue;
  const cells=[],phases=[];let score=0;
  for(let y=py;y+16<=h;y+=16){let row;
   for(let px=0;px<16;px++){
    const selected=[],keys=new Set();let missing=false;
    for(let yy=y;yy<y+16;yy++)for(let x=0;x<w;x++)if(p[yy*w+x]&&(x<px||x>=px+Math.floor((w-px)/16)*16))missing=true;
    if(missing)continue;
    for(let x=px;x+16<=w;x+=16){let opaque=false;for(let yy=y;yy<y+16;yy++)for(let xx=x;xx<x+16;xx++)if(p[yy*w+xx])opaque=true;if(opaque){selected.push([x,y]);for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++)keys.add(Buffer.from(tile4bpp(p,w,x+xx*8,y+yy*8)).toString('hex'));}}
    const fresh=[...keys].filter(k=>!seen.has(k)).length,value=selected.length*10000+fresh*10+px;if(!row||value<row.value)row={selected,keys,value,px};
   }
   if(!row){score=Infinity;break;}cells.push(...row.selected);phases.push([row.px,y]);score+=row.value;
  }
  if(cells.length>8)continue;if(!best||score<best.score)best={cells,phases,score};
 }

 if(!best){
  for(let px=0;px<16;px++){
   if(p.some((v,i)=>v&&(i%w<px||i%w>=px+Math.floor((w-px)/16)*16)))continue;
   const cells=[];let score=0;
   for(let x=px;x+16<=w;x+=16){let col;
    for(let py=0;py<16;py++){
     let missing=false;const selected=[];
     for(let xx=x;xx<x+16;xx++)for(let y=0;y<h;y++)if(p[y*w+xx]&&(y<py||y>=py+Math.floor((h-py)/16)*16))missing=true;
     if(missing)continue;
     for(let y=py;y+16<=h;y+=16){let opaque=false;for(let yy=y;yy<y+16;yy++)for(let xx=x;xx<x+16;xx++)if(p[yy*w+xx])opaque=true;if(opaque)selected.push([x,y]);}
     const value=selected.length*10000+py;if(!col||value<col.value)col={selected,value};
    }
    if(!col){score=Infinity;break;}cells.push(...col.selected);score+=col.value;
   }
   if(cells.length<=8&&(!best||score<best.score))best={cells,score};
  }
 }

 if(!best){
  const points=Array.from(p,(v,i)=>v?[i%w,Math.floor(i/w)]:null).filter(Boolean),x0=Math.max(0,Math.min(w-64,Math.min(...points.map(p=>p[0])))),y0=Math.max(0,Math.min(h-64,Math.min(...points.map(p=>p[1])))),crop=Uint8Array.from({length:4096},(_,i)=>p[(y0+Math.floor(i/64))*w+x0+i%64]);
  assert.ok(points.every(([x,y])=>x>=x0&&x<x0+64&&y>=y0&&y<y0+64));
  const solved=solveCover(crop,{limit:8,maxNodes:1000000});console.log('Exact overlap cover',f,solved.nodes,solved.origins?.length);
  if(solved.origins)best={cells:solved.origins.map(([x,y])=>[x+x0,y+y0]),overlap:true,solverNodes:solved.nodes};
 }
 assert.ok(best,'No exact eight-cell cover at frame '+f);const occupied=best.cells.length;
 for(let y=0;y+16<=h&&best.cells.length<8;y+=16)for(let x=0;x+16<=w&&best.cells.length<8;x+=16){if(best.cells.some(([cx,cy])=>x<cx+16&&cx<x+16&&y<cy+16&&cy<y+16))continue;best.cells.push([x,y]);}
 assert.equal(best.cells.length,8);const coverage=new Uint8Array(w*h);for(const[x,y]of best.cells)for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++){const n=coverage[(y+yy)*w+x+xx]++;if(!best.overlap)assert.equal(n,0,'No unapproved overlapping cells');}assert.ok(p.every((v,i)=>!v||coverage[i]));for(const[x,y]of best.cells)for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++)seen.add(Buffer.from(tile4bpp(p,w,x+xx*8,y+yy*8)).toString('hex'));
 packing.push({frame:f,opaquePixels:p.filter(Boolean).length,occupiedCells:occupied,cellOrigins:best.cells,signedCellOrigins:best.cells.map(([x,y])=>[x-origin[0],y-origin[1]]),originalCellOrigins:audit.frames[f].cellOrigins,cellOverlap:!!best.overlap,overlappingCanvasPixels:coverage.filter(v=>v>1).length,overlappingOpaquePixels:coverage.filter((v,i)=>v>1&&p[i]).length,solverNodes:best.solverNodes,allSourcePixelsCovered:true,sourceSelection:asset.sequences.native[1][f]});
}
const family=structuredClone(audit.family),group=family.groups[0];Object.assign(group,{width:w,height:h,anchor:[0,h-origin[1]],frameCellOrigins:packing.map(p=>p.cellOrigins),cellOverlapFrames:packing.filter(p=>p.cellOverlap).map(p=>p.frame)});delete group.frameOffsets;delete group.cellOrigins;
await writeFile(dir+'/family.draft.json',JSON.stringify(family,null,2)+'\n');await writeFile(dir+'/geometry-proposal.json',JSON.stringify({status:'Inactive exact native eight-cell geometry proposal',logicalOrigin:origin,canvas:[w,h],nativeSizeClass:1,nativeCells:8,sourcePlacement:'Gait uses a stable planted-foot baseline and the established one-pixel passing offsets; original action opaque center X and foot/effect bottom Y retained via explicit source translations. Body model rescaled consistently from real generated sheets. All new source pixels covered. Explicit overlapping frames duplicate identical source pixels; every overlap is checked in compiled native priority order.',extraVramBytes:0,extraWramBytes:0,frames:packing},null,2)+'\n');
await mkdir(dir+'/review',{recursive:true});
for(const actor of audit.actors)for(const scale of[1,4]){const cw=96,ch=96,cols=6,im=new PNG({width:cols*cw*scale,height:Math.ceil(frames.length/cols)*ch*scale}),rgb=actor.colors.map(c=>[0,2,4].map(i=>parseInt(c.slice(i,i+2),16)));for(let f=0;f<frames.length;f++)for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const k=frames[f][y*w+x+16];if(!k)continue;for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++)im.data.set([...rgb[k-1],255],((Math.floor(f/cols)*ch*scale+y*scale+yy)*im.width+f%cols*cw*scale+x*scale+xx)*4);}await writeFile(dir+'/review/'+actor.key+'-'+scale+'x.png',PNG.sync.write(im));}
console.log(JSON.stringify(packing.map(({frame,occupiedCells,opaquePixels})=>({frame,occupiedCells,opaquePixels}))));
