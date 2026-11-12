// Sound and impact design for battle. Chrono Trigger's cartridge has room for
// one custom sound program (the fart buzz), so techniques are recast from the
// stock battle sounds, and every heavy sound shakes the screen.
//
// Sound ids are the battle bank's, named here by what the original techniques
// use them for (scripts/log-tech-sounds.mjs lists every cue a technique plays).
export const sounds={
 roar:0xc5,slam:0x6b,crash:0x6c,burst:0x6a,bigExplosion:0x77,explosions:0x99,
 flame:0x56,fireHit:0x74,inferno:0x7f,infernoTail:0x7e,fireCharge:0xaf,
 iceCharge:0x72,iceForm:0x6f,iceBreak:0x70,blizzard:0x84,blizzardCrash:0x85,
 thunder:0x7b,chime:0x7c,sing:0x78,luminaireCharge:0xa5,luminaireBlast:0xa6,
 darkBomb:0xdc,blackHole:0xde,darkMatter:0xdf,flood:0x83,areaBomb:0x97,shock:0x8a,
 tackle:0xb3,bodyHit:0x65,slash:0x4c,stab:0x4d,scratch:0x62,tailWhip:0x82,frogDrop:0x55
};
const s=sounds;

// [technique, the stock cue it plays, the sound heard instead].
export const soundSwaps=[
 // The picture techniques play Luminaire's scene, whose two cues are the
 // charge as the picture arrives and the blast as it leaves.
 // Call My Wife: Dragon roars as she fills the sky, then the fire lands.
 [24,s.luminaireCharge,s.roar],[24,s.luminaireBlast,s.inferno],
 // Compensate: the tower rumbles up; then the biggest explosion in the game.
 [52,s.luminaireCharge,s.tailWhip],[52,s.luminaireBlast,s.bigExplosion],
 // Some May Die: a fanfare of thunder for his lordship, then Dark Matter.
 [56,s.luminaireCharge,s.thunder],[56,s.luminaireBlast,s.darkMatter],
 // Magnets!: a hum of static, then the zap.
 [32,s.luminaireCharge,0xf1],[32,s.luminaireBlast,s.shock],
 // Bird Pop: Fiona holds the note while the bluebird swells, and then.
 [14,s.luminaireCharge,s.sing],[14,s.luminaireBlast,s.explosions],
 // Are We There Yet?: the same question, and again when he finally leaves.
 [18,s.luminaireCharge,0x92],[18,s.luminaireBlast,0x8b],
 // Torch Mob: the torches catch, then everything else does.
 [51,s.luminaireCharge,s.fireCharge],[51,s.luminaireBlast,s.inferno],
 // Dungeon: the cage slams down; the dark takes them.
 [55,s.luminaireCharge,s.crash],[55,s.luminaireBlast,s.blackHole],
 // Royal Decree: a herald's chime, then the thunder it promised.
 [49,s.luminaireCharge,s.chime],[49,s.luminaireBlast,s.thunder],
 // The fart combinations (every combination built on Shrek's Fart). The two
 // that spin him through the wind effect share the Fart's own looping buzz
 // (engine/swamp-spin.js); the rest toot once (sound $FB) where they launch,
 // spin or cross. Silent But Deadly, of course, makes no sound at all.
 [57,0x6d,0xfb],[63,0xb1,0xfb],[66,0xf2,0xfb],[69,0xb1,0xfb],[110,0xb1,0xfb],
 // High C: Fiona sings the note; the bluebird pops.
 [11,s.iceCharge,s.sing],[11,s.iceBreak,s.burst],
 // Fresh Eggs: something sizzles before the chime of a good breakfast.
 [12,s.chime,s.flame],
 // Run Away!: the roar ends in a crash, not a polite thunderclap.
 [5,s.thunder,s.explosions]
];

// [sound, shake amplitude in pixels (1-15), frames per pixel of decay, both axes].
// A shake of amplitude A lasts about A * decay frames. Small hits tick; big
// ones rock the whole screen.
export const impacts=[
 [s.roar,4,6,false],[s.slam,4,3,false],[s.crash,6,3,true],[s.burst,3,2,false],
 [s.bigExplosion,8,4,true],[s.explosions,7,4,true],[0x9a,5,3,true],
 [s.fireHit,3,2,false],[s.inferno,6,4,true],[s.infernoTail,3,3,false],
 [s.iceBreak,3,2,false],[s.blizzard,3,3,false],[s.blizzardCrash,5,3,true],
 [s.thunder,6,3,true],[s.luminaireBlast,7,5,true],
 [s.darkBomb,6,4,true],[s.blackHole,4,5,false],[s.darkMatter,9,5,true],[s.flood,4,4,false],
 [s.areaBomb,5,3,true],[s.shock,5,3,true],
 [s.tackle,5,2,false],[s.bodyHit,4,2,false],[s.slash,3,2,false],[s.stab,3,2,false],[s.scratch,2,2,false],
 [s.tailWhip,7,3,true],
 // Combination finishers.
 [0xec,6,3,true],[0xed,7,4,true],[0xeb,3,3,false],[0xc7,6,5,true],[0x94,7,4,true],[0x93,4,4,false],
 [0xc3,5,4,true],[0xe4,6,4,true],[0xd1,6,4,true],[0x9c,4,3,false],
 // Swamp Belch's burp (engine/swamp-belch.js): a long low rumble.
 [0xfc,4,10,false],[0xfb,3,4,false],
 // Ordinary weapon hits (the native hit table at CD:6DAC).
 [0x40,3,2,false],[0x47,3,2,false],[0x44,3,2,false],[0x41,3,2,false],[0xe8,3,2,false],[0x60,3,2,false],
 // Beams, splashes, spins and the rest of the technique hits that the first
 // pass left still (a 2-pixel shake often rounds to nothing).
 [0x4f,3,2,false],[0xa0,3,3,false],[0x9e,2,2,false],[0x80,3,3,false],[0x8f,4,3,false],[0xe5,3,2,false],
 [0x76,4,3,false],[0xa3,2,2,false],[0x4a,2,2,false],[0x4b,4,2,false],[0x90,5,3,true],[0xd4,3,2,false],
 [0xc8,5,3,true],[0xd6,4,3,false],[0xbb,5,3,true],[0xa2,4,2,false],[0xe0,5,3,true],[0x98,6,4,true],
 [0xd7,5,3,true],[0x5b,5,3,true],[0xf2,4,2,false],[0xf3,4,2,false],[0xd5,5,3,true],[0x6e,4,3,false],
 [0xd3,3,2,false],[0x5f,5,3,true]
];
