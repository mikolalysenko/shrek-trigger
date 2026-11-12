import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export async function copyCourtSwampReview(directory,out,sha256){
 if(!directory)return[];
 const specs=[
  ['court-trial','court-30','Duloc Sergeant · court','The shared court officer appears in the original trial and prison escort.'],
  ['prison-rescue','rescue','Duloc Sergeant · rescue','His native reaction pose during Donkey’s execution-room rescue.'],
  ['imp-canyon','battle','Swamp Imps and Moss Roller','Generated creature artwork in the original canyon formation.'],
  ['imp-riders','battle','Imp Riders · forest ambush','Separate rider and mount cells retain native overlap and movement.'],
  ['imp-worker','dialogue','Swamp Imp · Medina worker','The shared friendly actor retains his original patrol and conversation.'],
  ['palace-piazza','battle','Palace Hexer · piazza','The original mixed encounter with its native statistics and AI.'],
  ['palace-lift','battle','Palace Hexer · lift','The connected lift encounter continues into the shared palace scene.'],
  ['sergeant-sleep','end','Duloc Sergeant · sleeping shift','The same officer retains both original sleeping poses.']
 ];
 const captures=[];
 for(const[key,name,title,caption]of specs){
  const proof=JSON.parse(await readFile(path.join(directory,key+'.json')));assert.equal(proof.sha256,sha256);assert.equal(proof.key,key);
  const file=key+'-'+name+'.png',bytes=await readFile(path.join(directory,file));assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);await writeFile(path.join(out,file),bytes);
  captures.push({key,file,title,caption,sha256:createHash('sha256').update(bytes).digest('hex'),native:true});
 }
 return captures;
}
