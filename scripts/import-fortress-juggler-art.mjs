import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {composeJugglerArt} from '../assets/imagegen/fortress-jugglers/compose-native.js';

// Eight generated source bodies become nine native slots. The original dots,
// flecks and radial flash retain their indexed pixels and overlap order.
export async function composeFortressJugglerArt(actors,audit,specs,root){
 const key='fortress-jugglers',source=actors[key];if(!source)return;
 const spec=specs.find(s=>s.key===key);assert.equal(spec.nativeComposer,key);
 const dir='assets/imagegen/fortress-jugglers',json=async p=>JSON.parse(await readFile(root+'/'+dir+'/'+p));
 const map=await json('native-composition.json'),effects=await json('original-effects.draft.json'),frozen=await json('native-raster.json');
 const actor=composeJugglerArt(source,map,effects);assert.deepEqual(actor.frames,frozen.frames,'Frozen native Juggler composition');
 const overlay=await readFile(root+'/'+dir+'/original-effects.draft.json');
 actor.originalRasterComponents[0].sha256=createHash('sha256').update(overlay).digest('hex');
 actors[key]=actor;
 const report=audit.find(a=>a.key===key);Object.assign(report,{frames:actor.frames.length,sequences:actor.sequences,originalRasterComponents:actor.originalRasterComponents});
 const {width,height}=actor,atlas=new PNG({width:8*width,height:2*height});
 const colors=actor.palette.map(hex=>[0,2,4].map(n=>{const v=parseInt(hex.slice(n,n+2),16)>>3;return v<<3|v>>2;}));
 actor.frames.forEach((hex,f)=>Array.from(hex,c=>parseInt(c,16)).forEach((k,i)=>{if(k)atlas.data.set([...colors[k-1],255],((Math.floor(f/8)*height+Math.floor(i/width))*atlas.width+f%8*width+i%width)*4);}));
 await writeFile(root+'/'+spec.directory+'/native-indexed.png',PNG.sync.write(atlas));
 await writeFile(root+'/'+spec.directory+'/import.json',JSON.stringify(report,null,2)+'\n');
}
