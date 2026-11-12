import {eggChallenge,eggChallengeDialogue} from '../content/resurrection.js';
import {mrWorldwide,greeterDialogue,mrWorldwideDialogue} from '../content/mr-worldwide.js';

// Field strings that exist only in the rebuilt cartridge, keyed by location.
// Their IDs follow the room's source strings in the same native table.
export const additionalDialogue={
  [eggChallenge.location]:eggChallengeDialogue,
  [mrWorldwide.kitchen.location]:greeterDialogue,
  [mrWorldwide.walmart.location]:mrWorldwideDialogue,
};

// Rooms whose rebuilt event gains one object. Each object owns sixteen
// two-byte function pointers, so the header grows by 32 bytes and every
// source offset after the original header moves 32 bytes later. (The Kodiak
// storeroom also relocates two guarded functions, but their source bytes
// stay at the moved offsets.)
export const appendedObjectRooms={
  [mrWorldwide.kitchen.location]:21, // Walmart greeter, object 21 after the lesson room's 21 objects
  [mrWorldwide.walmart.location]:9,  // Mr. Worldwide, object 9 after the storeroom's 9 objects
  474:14, // Dragon escape actor after the dive's 14 objects
};

// Maps an offset in a room's source event to the rebuilt native event.
export function nativeEventOffset(location,offset){
  const objects=appendedObjectRooms[location];
  return objects!==undefined&&offset>=1+objects*32?offset+32:offset;
}
