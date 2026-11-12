import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Reuse actual encounter captures from the scene checks. The cartridge hash
// must match this export; older proof cannot silently become a current image.
export async function copyEndgameReview(directory,out,sha256){
 if(!directory)return [];
 const specs=[
  ['night-throne','night-throne-battle','Rumpelstiltskin','The throne confrontation uses the original encounter and new native sprite poses.'],
  ['golem-twins','golem-twins-battle','Wishworks Golems','The original two-golem battle with the generated Wishworks model.'],
  ['blackbird-wing','blackbird-wing-battle','Wishworks Boss','The second palette and original countdown retreat.'],
  ['dragon-deck','dragon-deck-battle','King Rumpel','The usurper on Dragon’s deck, using the original battle and escape sequence.'],
  ['godmother','godmother-battle','Fairy Godmother · giant form','Her giant face and independently animated hands in the original three-part battle.'],
  ['cosmic-interior','cosmic-interior-battle','Cosmic Muffin · oven interior','The oven body, pulsing furnace and moving arms use the original background and sprite layers.'],
  ['cosmic-interior','tyson-emergence-6','Mike Tyson · emergence','Your supplied Tyson artwork appears during the original emergence and leads into the final formation.']
 ];
 const captures=[];
 for(const[key,name,title,caption]of specs){
  const proof=JSON.parse(await readFile(path.join(directory,key+'.json')));
  assert.equal(proof.sha256,sha256,'Endgame scene proof must match the exported cartridge');
  assert.equal(proof.key,key);
  const file=name+'.png',bytes=await readFile(path.join(directory,file));
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],'Native PNG capture');
  await writeFile(path.join(out,file),bytes);
  captures.push({key,file,title,caption,sha256:createHash('sha256').update(bytes).digest('hex'),native:true});
 }
 return captures;
}
