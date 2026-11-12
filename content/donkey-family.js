// Donkey's household. The Big Bad Wolf (in Grandma's nightgown), one of the
// Three Blind Mice (the huckster-inventor) and Donkey as a foal in the red
// Gate flashback. They each get their own NPC row, so the stock townswoman
// (NPC 213), tradesman (NPC 39) and child (NPC 38) rows, banks and palettes
// stay stock for the unrelated people who share them.
//  - NPC 218, 220 and 221 are loaded by no original event. Their rooms'
//    event objects are repointed with same-length edits (`rooms`: offset of
//    the load command in each source event); nothing else in a script moves.
//  - All three share graphics bank 249 with the empty-house actor, whose 21
//    frames only use the blank tile zero: no unowned graphics slot is left.
//  - Each keeps its source actor's animation program and frame count, with
//    its own assembly. The Wolf owns palette 13, the only palette slot no actor
//    row claims. The Mouse and the foal are indexed in their source actors'
//    stock palettes (133, the crowd's, and 130), which are not rewritten, so
//    no room needs another OBJ palette row.
const idle=facing=>({facing,pose:'idle',phase:0});
const walk=(facing,phases)=>phases.map(phase=>({facing,pose:'walk',phase}));
const pose=(facing,name,phase=0)=>({facing,pose:name,phase});
// Slots 0-15 of both adult programs: four idles, four-phase rear and front
// walks, and two contacts per side (the side idles are their passing frames).
const adultWalk=[idle(0),idle(1),idle(2),idle(3),...walk(0,[0,1,2,3]),...walk(1,[0,1,2,3]),...walk(2,[0,1]),...walk(3,[0,1])];

export const donkeyFamily=[
  {key:'wolf',name:'Big Bad Wolf',npc:218,npcs:[218],sourceNpc:213,source:{gfx:36,asm:25,palette:8},gfx:249,asm:8,palette:13,frames:21,size:0,width:32,height:32,
    rooms:{4:1199,9:417,80:3115},
    // 16 startled, 17/18 arms up (front/rear), 19/20 seated (left/right).
    frameMap:[...adultWalk,pose(1,'surprise'),pose(1,'raise'),pose(0,'raise'),pose(2,'sit'),pose(3,'sit')]},
  {key:'blind-mouse',name:'Blind Mouse',npc:220,npcs:[220],sourceNpc:39,source:{gfx:35,asm:24,palette:133},gfx:249,asm:9,palette:133,stockPalette:true,frames:31,size:0,width:32,height:32,
    rooms:{4:940,8:1404,9:366,80:3159,81:2328,125:1471},
    // 16/17 cane raised and struck (the tradesman's hammer slots), 18-21 seated drinking (left, right), 22-25 standing
    // drinking, 26/27 seated, 28 startled, 29 open hands, 30 arms up.
    frameMap:[...adultWalk,pose(2,'hammer',0),pose(2,'hammer',1),pose(2,'sip',0),pose(2,'sip',1),pose(3,'sip',0),pose(3,'sip',1),
      pose(2,'drink',0),pose(2,'drink',1),pose(3,'drink',0),pose(3,'drink',1),pose(2,'sit'),pose(3,'sit'),pose(1,'surprise'),pose(1,'offer'),pose(1,'raise')]},
  {key:'young-donkey',name:'Young Donkey',npc:221,npcs:[221],sourceNpc:38,source:{gfx:22,asm:11,palette:130},gfx:249,asm:10,palette:130,stockPalette:true,frames:15,size:0,width:32,height:32,
    rooms:{4:1096},
    // The child program walks idle, 4, 5, 6 (rear) and idle, 7, 8, 9 (front).
    // Slot 14 is blank in the source bank and stays blank.
    frameMap:[idle(0),idle(1),idle(2),idle(3),...walk(0,[0,1,2]),...walk(1,[0,1,2]),...walk(2,[0,1]),...walk(3,[0,1]),pose(1,'blank')]}
];

// Source event sizes and object counts, checked before any byte changes.
export const donkeyFamilyRooms={4:{length:1460,objects:13},8:{length:3145,objects:29},9:{length:507,objects:10},80:{length:3225,objects:42},81:{length:3139,objects:35},125:{length:2068,objects:22}};
