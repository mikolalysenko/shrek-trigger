import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export async function copyTownsfolkReview(directory,out,sha256,currentSha256=sha256){
 if(!directory)return[];
 const specs=[
  ['keeper-market','interaction','Duloc townkeeper','The generated townkeeper in his original market scene.'],
  ['keeper-fair','merchant','Fair merchant and racers','The existing compatible merchant palette shares the crowd’s colors without exhausting the five native NPC rows.'],
  ['woodland-mountain','battle','Woodland Sprites','The four-creature encounter uses the original combat rules and the generated native frames.'],
  ['woodland-tavern','dialogue','Woodland Sprite · tavern','The friendly actor retains his native conversation and dance.'],
  ['resident-marco','dialogue','Town resident · homecoming','The original returned-husband conversation uses the new storybook resident artwork.'],
  ['resident-parade','dialogue','Town residents · parade','The seated resident displays its intended colors in the crowd.'],
  ['tradesman-hammer','settled','Tradesman · smithy','The original hammer animation uses distinct generated raise and strike poses.'],
  ['tradesman-drink','settled','Tradesman · taking a break','The original smithy walk and drinking sequence retain their native timing.'],
  ['tradesman-hero','entry','Tradesman · celebration','A native raised-arm pose in the hero ending’s staging; this capture is not a complete ending run.'],
  ['parade-center','settled','The Muffin Man','The corrected native palette assignment keeps the replacement and the crowd in their own colors.'],
  ['hobgoblin-cathedral','battle','Hobgoblins · portrait ambush','The three original cathedral enemies use their new generated artwork.'],
  ['hobgoblin-fortress','battle','Hobgoblins · fortress guards','The original guard battle retains its statistics and AI.'],
  ['hobgoblin-square','dialogue','Hobgoblin · Medina square','The shared friendly actor uses the same cartridge frames as its battle counterpart.'],
  ['hobgoblin-kitchen','dialogue','Hobgoblin · cathedral kitchen','Native dialogue and reaction poses in the crowded original kitchen.']
 ];
 const captures=[];
 for(const[key,name,title,caption]of specs){
  const proof=JSON.parse(await readFile(path.join(directory,key+'.json')));assert.equal(proof.sha256,sha256);assert.equal(proof.key,key);
  const file=key+'-'+name+'.png',bytes=await readFile(path.join(directory,file));assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);await writeFile(path.join(out,file),bytes);
  captures.push({key,file,title,caption:caption+(sha256===currentSha256?'':` Retained scene capture from build ${sha256.slice(0,12)}.`),sha256:createHash('sha256').update(bytes).digest('hex'),cartridgeSha256:sha256,native:true});
 }
 return captures;
}
