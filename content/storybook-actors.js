import {rasterActorGeometry} from './generated-actor-geometry.js';

// Everyday residents and original cavern/fortress roles share native resources.
const definitions=[
  {
    "key": "duloc-household-resident",
    "name": "Duloc household residents",
    "gfx": 12,
    "groups": [
      {
        "asm": 248,
        "size": 0,
        "art": "duloc-household-resident",
        "geometry": "duloc-household-resident"
      }
    ],
    "actors": [
      {
        "key": "duloc-household-resident",
        "name": "Duloc Household Resident",
        "npc": 21,
        "npcs": [
          21
        ],
        "asm": 248,
        "sourceAsm": 7,
        "palette": 135,
        "animation": 7,
        "size": 0,
        "colors": [
          "313131",
          "dedede",
          "ffe7ad",
          "ff9c6b",
          "734221",
          "dead31",
          "bd5208",
          "8494c6",
          "6b4284",
          "d6634a",
          "a53129",
          "73738c"
        ]
      },
      {
        "key": "medieval-household-resident",
        "name": "Medieval Household Resident",
        "npc": 48,
        "npcs": [
          48
        ],
        "asm": 248,
        "sourceAsm": 7,
        "palette": 131,
        "animation": 7,
        "size": 0,
        "colors": [
          "313131",
          "dedede",
          "ffe7ad",
          "ff9c6b",
          "633118",
          "d6d618",
          "847310",
          "636b7b",
          "423142",
          "ad7bff",
          "63398c",
          "73738c"
        ]
      }
    ]
  },
  {
    "key": "townswomen-gfx36",
    "name": "Storybook townswomen",
    "gfx": 36,
    "groups": [
      {
        "asm": 25,
        "size": 0,
        "art": "townswomen-gfx36",
        "geometry": "townswomen-gfx36"
      }
    ],
    "actors": [
      {
        "key": "townswomen-village",
        "name": "Village townswoman",
        "npcs": [
          13
        ],
        "asm": 25,
        "palette": 9,
        "animation": 16,
        "size": 0,
        "colors": [
          "313131",
          "efefef",
          "ffe7ad",
          "ff9c6b",
          "a54a39",
          "f79431",
          "8c394a",
          "84c6de",
          "426b7b",
          "94a552",
          "5a6329",
          "7b8c9c"
        ],
        "npc": 13
      },
      {
        "key": "townswomen-middle",
        "name": "Middle Age townswoman",
        "npcs": [
          40
        ],
        "asm": 25,
        "palette": 131,
        "animation": 16,
        "size": 0,
        "colors": [
          "313131",
          "dedede",
          "ffe7ad",
          "ff9c6b",
          "633118",
          "d6d618",
          "847310",
          "636b7b",
          "423142",
          "ad7bff",
          "63398c",
          "73738c"
        ],
        "npc": 40
      },
      {
        "key": "townswomen-family",
        "name": "Workshop family townswoman",
        "npcs": [
          213
        ],
        "asm": 25,
        "palette": 8,
        "animation": 16,
        "size": 0,
        "colors": [
          "313131",
          "dedede",
          "ffe7ad",
          "ff9c6b",
          "a54a39",
          "e773c6",
          "9c295a",
          "ffbd39",
          "845a18",
          "639cbd",
          "426b7b",
          "7b8c9c"
        ],
        "npc": 213
      }
    ]
  },
  {
    "key": "woodland-bats",
    "name": "Woodland and cavern bats",
    "gfx": 103,
    "groups": [
      {
        "asm": 66,
        "size": 192,
        "art": "woodland-bats",
        "geometry": "woodland-bats"
      }
    ],
    "actors": [
      {
        "key": "woodland-bat",
        "name": "Woodland Bat",
        "short": "Mad Bat",
        "enemy": 80,
        "asm": 66,
        "palette": 78,
        "animation": 47,
        "size": 192,
        "colors": [
          "212118",
          "ffffff",
          "d6d6c6",
          "a5a58c",
          "7b7b5a",
          "636342",
          "6b3900",
          "424221",
          "422100",
          "291800",
          "181800",
          "313131"
        ]
      },
      {
        "key": "cavern-vamp",
        "name": "Cavern Vamp",
        "short": "Vamp",
        "enemy": 81,
        "asm": 66,
        "palette": 79,
        "animation": 47,
        "size": 192,
        "colors": [
          "212118",
          "ffffff",
          "ffd6a5",
          "e7ad84",
          "c68473",
          "8c5a5a",
          "42394a",
          "4a2142",
          "312939",
          "292131",
          "181800",
          "313131"
        ]
      },
      {
        "key": "cave-bat",
        "name": "Cave Bat",
        "short": "Cave Bat",
        "enemy": 115,
        "asm": 66,
        "palette": 78,
        "animation": 47,
        "size": 224,
        "colors": [
          "212118",
          "ffffff",
          "d6d6c6",
          "a5a58c",
          "7b7b5a",
          "636342",
          "6b3900",
          "424221",
          "422100",
          "291800",
          "181800",
          "313131"
        ]
      }
    ]
  },
  {
    "key": "fortress-jugglers",
    "name": "Fortress court fools",
    "gfx": 91,
    "groups": [
      {
        "asm": 48,
        "size": 224,
        "art": "fortress-jugglers",
        "geometry": "fortress-jugglers"
      }
    ],
    "actors": [
      {
        "key": "fortress-juggler",
        "name": "Fortress Juggler",
        "short": "Juggler",
        "enemy": 57,
        "asm": 48,
        "palette": 40,
        "animation": 82,
        "size": 224,
        "colors": [
          "292910",
          "ffffff",
          "ffdede",
          "ffc6bd",
          "e7ce4a",
          "de5a63",
          "73948c",
          "c68c10",
          "9c2129",
          "6b5200",
          "185a52",
          "393929"
        ]
      },
      {
        "key": "moth-witch-decoy",
        "name": "Moth Witch · decoy",
        "short": "Flea?",
        "enemy": 240,
        "asm": 48,
        "palette": 40,
        "animation": 82,
        "size": 192,
        "colors": [
          "292910",
          "ffffff",
          "ffdede",
          "ffc6bd",
          "e7ce4a",
          "de5a63",
          "73948c",
          "c68c10",
          "9c2129",
          "6b5200",
          "185a52",
          "393929"
        ]
      }
    ]
  }
];
export const storybookFamilies=definitions.map(f=>({...f,groups:f.groups.map(({geometry,...g})=>({...g,...rasterActorGeometry[geometry]}))}));
export const storybookActors=storybookFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
// Household residents, townswomen, bats and jugglers (with the Flea decoy that
// shares their bank) are ordinary actors or generic enemies: stock art.
export const stockStorybookFamilyKeys=new Set(['duloc-household-resident','townswomen-gfx36','woodland-bats','fortress-jugglers']);
export const customStorybookFamilies=storybookFamilies.filter(f=>!stockStorybookFamilyKeys.has(f.key));
export const customStorybookActors=customStorybookFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
