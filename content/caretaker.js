import {cast} from './cast.js';

// Shrek lives alone. Crono's mother's event object still runs in every room
// that had her (it drives the wake-up, the 200 onions, the visitors' lines,
// the Stand-in handoff and the ending's cat chase), but nobody is drawn:
//  - `caretaker` is the empty actor, NPC 215: 21 blank frames in the same
//    private graphics, assembly and palette slots the old character used.
//    The parade loads it natively; the bedroom and the ending are repointed
//    to it (engine/home-event.js).
//  - `onionJar` is the savings jar downstairs and in the fortress illusion:
//    one generated frame in all 21 slots, NPC 219 (never loaded by any
//    original event), with its own graphics, assembly and palette slots.
// NPC 37 keeps its original townswoman art for the two unrelated rooms
// that also load it.
export const caretaker={key:'nobody-home',name:'Nobody home',npcs:[215],npc:215,gfx:249,asm:231,palette:138,frames:21,size:0,width:32,height:32,colors:cast[0].palette,blank:true};
export const onionJar={key:'onion-jar',name:'Onion jar',npcs:[219],npc:219,sourceNpc:37,gfx:74,asm:251,palette:61,frames:21,size:0,width:32,height:32};

// Native Mother's four directions, walking slots and five story gestures.
// These IDs are referenced directly by events as well as animation programs.
export const caretakerFrames=[
  ...[0,1,2,3].map(facing=>({facing,pose:'idle',phase:0})),
  ...[0,1].flatMap(facing=>[0,1,2,3].map(phase=>({facing,pose:'walk',phase}))),
  ...[2,3].flatMap(facing=>[0,1].map(phase=>({facing,pose:'walk',phase}))),
  ...[[1,'surprise'],[1,'raise'],[0,'raise'],[2,'bow'],[2,'recoil']].map(([facing,pose])=>({facing,pose,phase:0}))
];
