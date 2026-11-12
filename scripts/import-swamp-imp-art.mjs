import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';

// Reconstruct independently positioned cells from generated PNG samples and
// original indexed effects. Mounted cells are never flattened: hidden pixels
// and the original object-cell order remain available to the native engine.
export async function composeSwampImpArt(actors,root){
 if(!actors['swamp-imp']&&!actors['swamp-roly'])return;
 assert.ok(actors['swamp-imp']&&actors['swamp-roly']);
 const dir='assets/imagegen/swamp-imps',json=async p=>JSON.parse(await readFile(root+'/'+dir+'/'+p));
 const original=await json('source-native-components.json'),frozen=await json('native-cell-raster.json');
 const maps={imp:await json('imp/native-frame-map.draft.json'),roly:await json('roly/native-frame-map.draft.json'),rider:await json('rider/native-frame-map.draft.json')};
 const samples=Object.fromEntries(['imp','roly'].map(key=>{const a=actors['swamp-'+key];assert.equal(a.width,64);assert.equal(a.height,64);return[key,a.frames.map(s=>Uint8Array.from(s,c=>parseInt(c,16)))];}));
 const flip=p=>Uint8Array.from(p,(_,i)=>p[Math.floor(i/64)*64+63-i%64]);
 const points=p=>Array.from(p,(k,i)=>k?[i%64,Math.floor(i/64),k]:null).filter(Boolean);
 const bounds=p=>{const xs=p.map(p=>p[0]),ys=p.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return[x,y,Math.max(...xs)-x+1,Math.max(...ys)-y+1];};
 const anchor=(p,o)=>{const source=points(p),b=bounds(source),dx=Math.round(o[0]+o[2]/2-b[0]-b[2]/2),dy=o[1]+o[3]-b[1]-b[3];return source.map(([x,y,k])=>[x+dx,y+dy,k]);};
 const compose=layers=>{const pixels=new Map();for(const layer of layers)for(const[x,y,k]of layer)pixels.set(x+','+y,[x,y,k]);return [...pixels.values()];};
 const body={},native={};
 for(const key of['imp','roly']){
  body[key]=maps[key].frames.map((role,f)=>{const entry=typeof role.source==='number'?{frame:role.source}:role.source,p=samples[key][entry.frame];assert.ok(p);return anchor(entry.flip?flip(p):p,original[key][f].bodyBounds);});
  native[key]=body[key].map((p,f)=>compose([p,original[key][f].effects]));
 }
 native.extra=[body.roly[12],anchor(flip(samples.imp[19]),original.rider[15].impBounds),native.imp[19].filter(p=>p[1]<=-9)];
 function cellsFromPoints(p,origins){
  const index=new Map(p.map(([x,y,k])=>[x+','+y,k])),covered=new Set();
  const cells=origins.map(([x,y])=>({x,y,pixels:Array.from({length:256},(_,i)=>{const key=(x+i%16)+','+(y+Math.floor(i/16));if(index.has(key))covered.add(key);return(index.get(key)??0).toString(16);}).join('')}));
  assert.equal(covered.size,index.size,'Every source pixel fits the recorded native cells');return cells;
 }
 const groups=frozen.groups.slice(0,2).map(g=>({...g,frames:g.frames.map((f,i)=>({...f,cells:cellsFromPoints(native[g.key][i],f.cells.map(c=>[c.x,c.y]))}))}));
 const byKey=Object.fromEntries(groups.map(g=>[g.key,g]));
 const rider=frozen.groups[2],frames=rider.frames.map((f,i)=>{
  const role=maps.rider.frames[i],cells=Array(8),impFirst=role.priorityOrder[0]==='imp';
  for(const [part,start]of[['imp',impFirst?0:4],['mount',impFirst?4:0]]){
   const layer=role[part];
   if(layer===null){for(let c=0;c<4;c++){const target=f.cells[start+c];assert.ok(/^0+$/.test(target.pixels));cells[start+c]={x:target.x,y:target.y,pixels:'0'.repeat(256)};}continue;}
   const [dx,dy]=layer.shift;
   const source=layer.key==='extra'?cellsFromPoints(native.extra[layer.frame],f.cells.slice(start,start+4).map(c=>[c.x-dx,c.y-dy])):byKey[layer.key].frames[layer.frame].cells;
   for(let c=0;c<4;c++)cells[start+c]={...source[c],x:source[c].x+dx,y:source[c].y+dy};
  }
  return{...f,cells};
 });
 groups.push({...rider,frames});
 assert.deepEqual(groups,frozen.groups,'All 83 native frames, independent cells and hidden pixels reproduce the frozen source');
 const output={...frozen,groups};
 await writeFile(root+'/engine/generated-swamp-imp-art.js','// Generated from recorded image sources and original indexed components.\nexport const generatedSwampImpArt='+JSON.stringify(output)+';\n');
}
