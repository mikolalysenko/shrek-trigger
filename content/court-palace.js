import {rasterActorGeometry} from './generated-actor-geometry.js';

// Native shared roles: the sergeant also appears in court, endings and 1999.
const definitions=[
  {
    "key": "duloc-court-soldiers",
    "name": "Duloc court sergeant",
    "gfx": 158,
    "groups": [
      {
        "asm": 151,
        "size": 0,
        "art": "duloc-court-soldier",
        "geometry": "duloc-court-soldier"
      }
    ],
    "actors": [
      {
        "key": "duloc-court-soldier",
        "name": "Duloc Sergeant",
        "npc": 16,
        "npcs": [
          16
        ],
        "asm": 151,
        "palette": 160,
        "animation": 120,
        "colors": [
          "212918",
          "eff7ef",
          "ffc684",
          "e79c63",
          "946329",
          "c6ded6",
          "5a8cad",
          "5a52d6",
          "423973",
          "4adeb5",
          "6b84a5",
          "393921"
        ]
      }
    ]
  },
  {
    "key": "palace-hexers",
    "name": "Palace Hexer court minions",
    "gfx": 90,
    "groups": [
      {
        "asm": 47,
        "size": 0,
        "art": "palace-hexer",
        "geometry": "palace-hexer"
      }
    ],
    "actors": [
      {
        "key": "palace-hexer",
        "name": "Palace Hexer",
        "short": "Hexer",
        "enemy": 59,
        "asm": 47,
        "palette": 39,
        "animation": 92,
        "colors": [
          "292910",
          "ffffff",
          "ffd6ad",
          "d6c6e7",
          "7bc631",
          "c67b5a",
          "396bc6",
          "9463ad",
          "7b4229",
          "63317b",
          "296308",
          "393929"
        ]
      }
    ]
  }
];
export const courtPalaceFamilies=definitions.map(f=>({...f,groups:f.groups.map(({geometry,...g})=>({...g,...rasterActorGeometry[geometry]}))}));
export const courtPalaceActors=courtPalaceFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
// The court officer (NPC16) and the Mage enemies are ordinary actors: stock art.
export const stockCourtPalaceFamilyKeys=new Set(['duloc-court-soldiers','palace-hexers']);
export const customCourtPalaceFamilies=courtPalaceFamilies.filter(f=>!stockCourtPalaceFamilyKeys.has(f.key));
export const customCourtPalaceActors=customCourtPalaceFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
