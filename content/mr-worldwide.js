// Mr. Worldwide (Pitbull): an optional late-game superboss in exile in the
// stockroom of the Walmart in Kodiak, Alaska. After the Ocean Palace a lost
// Walmart greeter turns up in Guy Fieri's End of Time kitchen (location 465)
// and offers a shortcut. The visit borrows the aisle-shelving storeroom map
// (location 344) as a self-contained scene: it begins on arrival and every
// outcome returns the party to Guy's kitchen, so the room's own door and its
// ordinary 2300 AD visits are untouched.
//
// Everything here runs on native systems: an ordinary enemy record, native AI
// script, cloned enemy techniques, battle messages, field events and rewards.
// Enemy 0x24 (source name Octobino) is an unused Chrono Trigger record: no
// event loads it and no AI transforms into it.
import {mrWorldwidePalette,mrWorldwideSprite} from './mr-worldwide-palette.js';
export {mrWorldwidePalette};

export const mrWorldwide={
  key:'mr-worldwide',name:'Mr. Worldwide',short:'Pitbull',
  enemy:0x24,
  // Private sprite resources: unused graphics, assembly and palette slots.
  // The battle and field animation program is Golem's eight-frame program
  // 167, shared read-only: 0-2 breathing loop, 3 hit, 4-5 attack,
  // 6 standing "Dale!" pose, 7 casting.
  gfx:204,asm:250,palette:239,animation:167,size:2,...mrWorldwideSprite,
  // Guy Fieri's lesson room at the End of Time hosts the greeter. Its
  // location keeps the current song, and its practice returns restore the
  // room theme (song 0x1B); the trip home does the same.
  kitchen:{location:465,eventId:284,greeter:[11,10],npc:28,objects:21,eventBytes:3179,returnTo:[7,12],song:0x1b},
  // The Arris Dome storeroom map stands in for the Kodiak Walmart stockroom.
  walmart:{location:344,eventId:176,boss:[8,7],arrival:[8,12],staging:[8,10,6,10,10,10],objects:9,eventBytes:570},
  // Late game: after the Ocean Palace (the same threshold Guy's own late
  // dialogue uses). The flag byte is unused by every source event and native
  // long-address reference.
  storyGate:0xcb,flag:0x1b5,presentLocal:0x3e,flagLocal:0x3f,
  // "Fireball · Boss Battle 2" in the former unused fanfare slot.
  song:0x4f,
  rewards:{items:[{id:187,count:1,name:'Spectacular Specs'},{id:197,count:3,name:'Ginger Root'}]}
};

// Saved flag states: 0 never met, 2 met (declined or lost), 1 defeated and
// rewarded; 5 and 6 mark a Kodiak visit in progress (first or repeat).
export const mrWorldwideStates={unmet:0,defeated:1,met:2,visitFirst:5,visitRepeat:6};

// Native battle-block element bytes: lower is more damage (2 = double,
// 4 = normal, 8 = half), 0 is immune and bit 7 absorbs. Order: Air
// (lightning), Dirt (shadow), Water, Fire, at battle offsets 3F..42.
// The four phases are stops on his world tour.
export const mrWorldwidePhases=[
  {key:'miami',name:'Miami heat',hp:30000,defense:0xc8,magicDefense:50,attack:150,speed:14,elements:[4,4,2,0x84],
    hint:'Miami heat! Cool him with Water!'},
  {key:'penthouse',name:'Penthouse suite',hp:22528,defense:0x50,magicDefense:80,attack:160,speed:14,elements:[2,4,4,8],
    hint:'Penthouse suite! Hit him hard!'},
  {key:'fireball',name:'Fireball mode',hp:15104,defense:0x7f,magicDefense:50,attack:170,speed:15,elements:[4,4,0x84,2],
    hint:'He is a fireball! Use Fire!'},
  {key:'exile',name:'Kodiak exile',hp:7680,defense:0x7f,magicDefense:50,attack:185,speed:16,elements:[8,2,8,0x84],
    hint:'Kodiak exile! Dirt ends it!'}
];

export const mrWorldwideStats={
  hp:30000,level:60,
  // Bytes 3-7: full status immunity, as on the late Lavos and Zeal records.
  flags:[0x00,0xff,0x00,0x00,0x00],
  speed:14,magic:40,hit:100,evade:20,
  // Bytes 20-22 match late single-body bosses: anchored, no secondary hit.
  category:[0xe0,0x02,0x00],
  reward:{xp:9999,gp:15000,drop:197,charm:163,tp:100}
};

// Private clones of stock enemy techniques. Each keeps its source animation,
// targeting, element and formula; only power and status are tuned. Every
// damaging move uses a Fire-element source except Heat Wave, which keeps the
// HP-halving formula of Golem's Iron Orb. Names are shown by the native
// battle message attached to the AI action.
export const mrWorldwideTechs=[
  {key:'mic-drop',source:0x11,power:0x50,message:236},                   // single, Fire, physical formula
  {key:'dale',source:0xa9,power:0x12,message:230},                       // Fire, all (Son of Sun's Flare)
  {key:'pyrotechnics',source:0x37,power:0x0b,status:[0x32,0x40],message:231}, // Fire, all, 50% poison
  {key:'smoke-machine',source:0x9d,power:0x0b,status:[0x32,0x01],message:232},// Fire, all, 50% Blind
  {key:'fireball',source:0xa6,power:0x24,message:234},                   // telegraphed, Fire, all
  {key:'heat-wave',source:0x41,message:237},                             // single, HP cut by half
  {key:'room-service',source:0x7e,heal:0x19,message:235},                // heals ~1,000 (strength x magic; overflows past ~26)
  {key:'world-tour',source:0x3f,power:0x0a,message:242}                  // Fire, all, when a phase changes
];

// Battle messages 227-244 are unused by the source table and the finale.
export const mrWorldwideBattleMessages={
  227:'Live from Kodiak! DALE!{null}',
  228:'Miami heat! Cool him with Water!{null}',
  229:'Penthouse suite! Hit him hard!{null}',
  230:'Dale! Fire everywhere!{null}',
  231:'Pyrotechnics! The burn lingers!{null}',
  232:'Smoke machine! Nobody can see!{null}',
  233:'He is counting down! Brace!{null}',
  234:'FIREBALL!{null}',
  235:'Hotel Room Service! He heals!{null}',
  236:'Flaming Mic Drop!{null}',
  237:'Heat Wave! HP cut in half!{null}',
  238:'Fire hypes him up! Attack up!{null}',
  239:'He is a fireball! Use Fire!{null}',
  240:'Fire? He IS the fire!{null}',
  241:'Kodiak exile! Dirt ends it!{null}',
  242:'WORLD TOUR! Next stop!{null}'
};

// Room 465's source strings end at 176; the greeter owns the next IDs.
export const greeterDialogue={
  177:'GREETER: Hi! Welcome to Walmart!{page}Wait. This is not Walmart.\nI got lost on my break.{page}I work at the Walmart in\nKodiak, Alaska. Mr. Worldwide\nlives in our stockroom.{page}He calls it his exile.\nHe says nobody has the heat\nto end it.{null}',
  178:'GREETER: I know a shortcut\nto Kodiak. Coming along?\n   Go to Kodiak, Alaska.\n   Not today.{null}',
  179:'GREETER: Okay! Have a great day!{null}',
  180:'GREETER: Bundle up.\nKodiak is cold this time\nof year. Every time of year.{null}',
  181:'GREETER: Mr. Worldwide checked\nout of Kodiak! Thanks for\nshopping at Walmart!{null}'
};
export const greeterText={greet:177,choice:178,decline:179,go:180,after:181};

// Room 344's source strings end at 11; the Kodiak scene owns the next IDs.
export const mrWorldwideDialogue={
  12:'MR. WORLDWIDE: Welcome to\nKodiak, Alaska. Walmart.\nThe stockroom. My home.{page}The internet voted to send\nme here. A joke, they said.\nI call it my exile.{page}I played every era. The\nStone Age. The Middle Ages.\nThe future. Now... Kodiak.{null}',
  13:'DONKEY: Hold up! Pitbull?\nTHE Pitbull? In a Walmart?{page}MR. WORLDWIDE: Mr. Worldwide.\nEven in exile.{null}',
  14:'MR. WORLDWIDE: Bring the heat\nand I end this exile.\n   Fight Mr. Worldwide!\n   Leave Kodiak.{null}',
  15:'MR. WORLDWIDE: The exile\ncontinues. Find me in\naisle seven.{null}',
  16:'MR. WORLDWIDE: You came back\nto Kodiak. Nobody comes\nback to Kodiak.{null}',
  17:'MR. WORLDWIDE: Water cools Miami.\nThe penthouse hates Air.\nFire feeds the Fireball.{page}And Kodiak? Kodiak is dirt.\nThree, two, one... DALE!{null}',
  18:'MR. WORLDWIDE: You put out\nthe fire. Respect.{page}My exile is over.\nKodiak, thank you\nfor nothing.{null}',
  19:'MR. WORLDWIDE: Take my shades.\nI have a hundred pairs.\nAnd the snacks. Dale!{full}Received Spectacular Specs!\nReceived 3 Ginger Roots!{null}',
  20:'Mr. Worldwide leaves Kodiak\nfor the next world tour.{page}The greeter finally gets\nthe stockroom back.{null}',
  21:'MR. WORLDWIDE: Too hot? I fixed\nyou up. Free of charge.\nRollback prices.{page}Come back anytime.\nI live here now.{null}'
};
export const mrWorldwideText={intro:12,donkey:13,choice:14,decline:15,repeat:16,accept:17,victory:18,reward:19,aftermath:20,loss:21};
