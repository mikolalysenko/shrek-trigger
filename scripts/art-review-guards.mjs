import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export async function copyGuardReview(directory,out,sha256){
 if(!directory)return [];
 const specs=[
  ['prison-rescue','guards-prison-rescue','Duloc guards · prison rescue','Both fallen guards use the new native poses during Donkey’s original rescue scene.'],
  ['prison-breakout','guards-prison-battle','Duloc Guard · prison battle','The original cell breakout, guard battle and return to exploration.'],
  ['sewer','sewer-upper-battle-2','Sir Sludge · sewer toll','Generated eight-cell artwork in the original sewer boss encounter.'],
  ['sewer','sewer-frog-scene-complete','Frog guards · sewer scene','The frog guards retain their original movements, tongues and dialogue choreography.'],
  ['ruins-sentries','guards-ruins-sentries-battle','Duloc Shades · Moaning Ruins','The original spectral palette and native battle effects.'],
  ['forest-pages','guards-forest-pages-battle','Pond Pages · forest ambush','Generated frog artwork in the original mixed forest encounter.'],
  ['desert-baron','guards-desert-baron-battle','Bog Baron · desert encounter','The second sewer-troll palette in its original mixed encounter.']
 ];
 const captures=[];
 for(const [key,name,title,caption]of specs){
  const proof=JSON.parse(await readFile(path.join(directory,key+'.json')));assert.equal(proof.sha256,sha256,'Guard scene evidence must match the exported cartridge');assert.equal(proof.key,key);
  const file=name+'.png',bytes=await readFile(path.join(directory,file));assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);await writeFile(path.join(out,file),bytes);
  captures.push({key,file,title,caption,sha256:createHash('sha256').update(bytes).digest('hex'),native:true});
 }
 return captures;
}
