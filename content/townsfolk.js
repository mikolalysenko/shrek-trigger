import {rasterActorGeometry} from './generated-actor-geometry.js';

// Shared everyday roles preserve their original palette and animation owners.
const definitions=[
  {
    "key": "duloc-town-keepers",
    "name": "Duloc townkeepers",
    "gfx": 11,
    "groups": [
      {
        "asm": 247,
        "size": 0,
        "art": "duloc-town-keeper",
        "geometry": "duloc-town-keeper"
      }
    ],
    "actors": [
      {
        "key": "duloc-town-keeper",
        "name": "Duloc Townkeeper",
        "npc": 22,
        "npcs": [
          22,
          49
        ],
        "asm": 247,
        "sourceAsm": 7,
        "palette": 9,
        "animation": 7,
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
        ]
      },
      {
        "key": "medina-town-keeper",
        "name": "Medina Townkeeper",
        "npc": 89,
        "npcs": [
          89
        ],
        "asm": 247,
        "sourceAsm": 7,
        "palette": 133,
        "animation": 7,
        "colors": [
          "292931",
          "e7e7ef",
          "ffe7ad",
          "ff9c6b",
          "633118",
          "ff8c29",
          "b54208",
          "397b94",
          "394263",
          "7bad4a",
          "525a29",
          "73738c"
        ]
      }
    ]
  },
  {
    "key": "woodland-sprites",
    "name": "Woodland sprites",
    "gfx": 81,
    "groups": [
      {
        "asm": 36,
        "size": 0,
        "art": "woodland-sprites",
        "geometry": "woodland-sprites"
      }
    ],
    "actors": [
      {
        "key": "woodland-sprite",
        "name": "Woodland Sprite",
        "short": "Wood Sprite",
        "enemy": 3,
        "npc": 77,
        "npcs": [
          77
        ],
        "asm": 36,
        "palette": 19,
        "animation": 28,
        "colors": [
          "292910",
          "ffffff",
          "e7ded6",
          "ffcead",
          "ffa56b",
          "c6bda5",
          "adad52",
          "b56342",
          "8c7308",
          "6b5a39",
          "7b3942",
          "393929"
        ]
      }
    ]
  },
  {
    "key": "duloc-town-residents",
    "name": "Duloc town residents",
    "gfx": 125,
    "groups": [
      {
        "asm": 188,
        "size": 0,
        "art": "duloc-town-resident",
        "geometry": "duloc-town-resident"
      }
    ],
    "actors": [
      {
        "key": "duloc-town-resident",
        "name": "Duloc Town Resident",
        "npc": 14,
        "npcs": [
          14
        ],
        "asm": 188,
        "palette": 135,
        "animation": 7,
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
        "key": "town-resident-green",
        "name": "Town Resident · green",
        "npc": 79,
        "npcs": [
          79
        ],
        "asm": 188,
        "palette": 133,
        "animation": 7,
        "colors": [
          "292931",
          "e7e7ef",
          "ffe7ad",
          "ff9c6b",
          "633118",
          "ff8c29",
          "b54208",
          "397b94",
          "394263",
          "7bad4a",
          "525a29",
          "73738c"
        ]
      }
    ]
  },
  {
    "key": "town-tradesmen",
    "name": "Storybook village tradesmen",
    "gfx": 35,
    "groups": [
      {
        "asm": 24,
        "size": 0,
        "art": "town-tradesmen",
        "geometry": "town-tradesmen"
      }
    ],
    "actors": [
      {
        "key": "village-tradesmen",
        "name": "Village tradesmen and patrons",
        "npcs": [
          25,
          52
        ],
        "asm": 24,
        "palette": 9,
        "animation": 15,
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
        "npc": 25
      },
      {
        "key": "workshop-tradesmen",
        "name": "Workshop and fair tradesmen",
        "npcs": [
          39
        ],
        "asm": 24,
        "palette": 133,
        "animation": 15,
        "size": 0,
        "colors": [
          "292931",
          "e7e7ef",
          "ffe7ad",
          "ff9c6b",
          "633118",
          "ff8c29",
          "b54208",
          "397b94",
          "394263",
          "7bad4a",
          "525a29",
          "73738c"
        ],
        "npc": 39
      }
    ]
  },
  {
    "key": "hench-hobgoblins",
    "name": "Storybook hobgoblins",
    "gfx": 83,
    "groups": [
      {
        "asm": 38,
        "size": 0,
        "art": "hench-hobgoblins",
        "geometry": "hench-hobgoblins"
      }
    ],
    "actors": [
      {
        "key": "hench-hobgoblin",
        "short": "Hench",
        "name": "Hobgoblin",
        "enemy": 5,
        "asm": 38,
        "palette": 24,
        "animation": 30,
        "colors": [
          "292910",
          "ffffff",
          "d6d6d6",
          "ffb594",
          "bd7bbd",
          "949494",
          "8c4a73",
          "ad6342",
          "844200",
          "636363",
          "6b397b",
          "393929"
        ]
      },
      {
        "key": "medina-hobgoblin",
        "short": "Hench",
        "name": "Medina Hobgoblin",
        "enemy": 75,
        "asm": 38,
        "palette": 23,
        "animation": 30,
        "colors": [
          "292910",
          "ffffff",
          "d6d6d6",
          "dece31",
          "7badff",
          "949494",
          "636be7",
          "a57b10",
          "7b5218",
          "636363",
          "524abd",
          "393929"
        ]
      }
    ]
  }
];
export const townsfolkFamilies=definitions.map(f=>({...f,groups:f.groups.map(({geometry,...g})=>({...g,...rasterActorGeometry[geometry]}))}));
// Every townsfolk family is ordinary or a generic enemy (Kilwala, Hench), so
// all of them keep stock Chrono Trigger art. The generated packets stay in
// assets/imagegen as inactive history.
export const stockTownsfolkFamilyKeys=new Set(['duloc-town-keepers','duloc-town-residents','town-tradesmen','woodland-sprites','hench-hobgoblins']);
export const customTownsfolkFamilies=townsfolkFamilies.filter(f=>!stockTownsfolkFamilyKeys.has(f.key));
export const townsfolk=townsfolkFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
export const customTownsfolk=customTownsfolkFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
