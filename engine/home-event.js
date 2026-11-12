import {caretaker,onionJar} from '../content/caretaker.js';

// Shrek lives alone. Every edit below replaces bytes with the same number of
// bytes inside Crono's mother's own object, so no pointer, flag, branch or
// other object changes: the wake-up, the 200 onions, the visitors' scenes,
// the Stand-in handoff after Shrek falls, the parade and the ending all run
// their original programs. Only who is loaded, and where the jar sits, differ.
const STAY=[0x8b,5,5]; // Set Object Position (5,5): the jar never walks.
const edits={
 // Downstairs. The object becomes the onion jar by the stove. Her greeting
 // walk, the pacing loop and the two later standing spots all become "stay".
 1:{length:1994,objects:16,changes:[
  [0x535,[0x82,37],[0x82,onionJar.npc]],
  [0x541,[0x8b,0x0c,0x08],STAY],[0x55a,[0x8b,0x02,0x08],STAY],[0x593,[0x9c,0xc0,0x10],STAY],
  [0x5bb,[0x96,0x0c,0x0b],STAY],[0x5be,[0x96,0x06,0x0b],STAY],[0x5c1,[0x96,0x07,0x06],STAY],[0x5c4,[0x96,0x05,0x06],STAY],[0x5c9,[0x96,0x05,0x05],STAY],
  [0x5d0,[0x9c,0xc0,0x10],STAY],[0x5db,[0xa0,0x05,0x05],STAY],[0x5e5,[0xa0,0x04,0x05],STAY]
 ]},
 // The bedroom: the wake-up and, after Shrek falls, the Stand-in handoff.
 2:{length:2413,objects:20,changes:[[0x51e,[0x82,37],[0x82,caretaker.npc]]]},
 // The parade already loads NPC 215. Remove the object when the room loads
 // (the original does the same behind a flag), so nothing invisible stands
 // in the square.
 80:{length:3225,objects:42,changes:[[0xc81,[0x16,0x76,0x04,0x06,0x03],[0x0a,0x52,0x00,0x00,0x00]]]},
 // The ending: the cat still bolts; nobody chases it.
 85:{changes:[[0xd40,[0x82,37],[0x82,caretaker.npc]]]},
 // The fortress illusion that greeted Shrek as his mother is now his jar.
 125:{changes:[[0x3e2,[0x82,37],[0x82,onionJar.npc]]]}
};
export const homeEventLocations=Object.keys(edits).map(Number);

export function homeEvent(event,location){
 const edit=edits[location];if(!edit)return event;
 if(edit.length!==undefined&&event.length!==edit.length||edit.objects!==undefined&&event[0]!==edit.objects)throw Error('Home event '+location+' changed size');
 const out=event.slice();
 for(const[offset,from,to]of edit.changes){
  if(from.length!==to.length||!from.every((v,i)=>event[offset+i]===v))throw Error(`Home event ${location} signature changed at ${offset.toString(16)}`);
  out.set(to,offset);
 }
 return out;
}
