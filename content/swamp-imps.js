// One shared native bank; original color ramps and animation programs remain exact.
export const swampImpFamilies=[
  {
    "key": "swamp-imps",
    "name": "Swamp imps and rollers",
    "gfx": 86,
    "groups": [
      {
        "asm": 43,
        "size": 0,
        "frames": 28,
        "sourceType": "image-generation",
        "width": 64,
        "height": 64,
        "art": "swamp-imp"
      },
      {
        "asm": 63,
        "size": 0,
        "frames": 26,
        "sourceType": "image-generation",
        "width": 64,
        "height": 64,
        "art": "swamp-roly"
      },
      {
        "asm": 65,
        "size": 1,
        "frames": 29,
        "sourceType": "image-generation",
        "width": 64,
        "height": 64,
        "art": "swamp-imp-rider"
      }
    ],
    "actors": [
      {
        "key": "swamp-imp",
        "name": "Swamp Imp",
        "short": "Swamp Imp",
        "enemy": 12,
        "npcs": [
          78
        ],
        "asm": 43,
        "palette": 67,
        "animation": 33,
        "size": 0,
        "colors": [
          "292910",
          "ffffff",
          "bddeff",
          "f7adff",
          "7ba5ff",
          "efef6b",
          "bd6bde",
          "cea542",
          "d65231",
          "3963bd",
          "84398c",
          "393929"
        ]
      },
      {
        "key": "rain-imp",
        "name": "Rain Imp",
        "short": "Rain Imp",
        "enemy": 13,
        "asm": 43,
        "palette": 63,
        "animation": 33,
        "size": 0,
        "colors": [
          "292910",
          "ffffff",
          "ceefad",
          "7b947b",
          "94d629",
          "efc600",
          "4a635a",
          "52a500",
          "ad5a08",
          "4a7308",
          "184a42",
          "393929"
        ]
      },
      {
        "key": "bog-imp",
        "name": "Bog Imp",
        "short": "Bog Imp",
        "enemy": 14,
        "asm": 43,
        "palette": 167,
        "animation": 33,
        "size": 0,
        "colors": [
          "292910",
          "ffffff",
          "bdc6a5",
          "e7848c",
          "849463",
          "d6e752",
          "ad525a",
          "b58c29",
          "8c397b",
          "4a5a39",
          "8c3139",
          "393929"
        ]
      },
      {
        "key": "gold-imp",
        "name": "Gold Imp",
        "short": "Gold Imp",
        "enemy": 15,
        "asm": 43,
        "palette": 68,
        "animation": 33,
        "size": 0,
        "colors": [
          "292910",
          "ffffff",
          "dec684",
          "8cad84",
          "9c8c4a",
          "efef6b",
          "63846b",
          "cea542",
          "d65231",
          "6b5221",
          "424a29",
          "393929"
        ]
      },
      {
        "key": "moss-roller",
        "name": "Moss Roller",
        "short": "Moss Roller",
        "enemy": 16,
        "asm": 63,
        "palette": 63,
        "animation": 44,
        "size": 0,
        "colors": [
          "292910",
          "ffffff",
          "ceefad",
          "7b947b",
          "94d629",
          "efc600",
          "4a635a",
          "52a500",
          "ad5a08",
          "4a7308",
          "184a42",
          "393929"
        ]
      },
      {
        "key": "sand-roller",
        "name": "Sand Roller",
        "short": "Sand Roller",
        "enemy": 17,
        "asm": 63,
        "palette": 64,
        "animation": 44,
        "size": 0,
        "colors": [
          "292910",
          "ffffff",
          "ffce9c",
          "f7b5e7",
          "cea563",
          "94ce31",
          "ef21a5",
          "a57b29",
          "4284d6",
          "7b5a00",
          "5a7308",
          "393929"
        ]
      },
      {
        "key": "plum-roller",
        "name": "Plum Roller",
        "short": "Plum Roller",
        "enemy": 18,
        "asm": 63,
        "palette": 65,
        "animation": 100,
        "size": 0,
        "colors": [
          "292910",
          "ffffff",
          "dea5ef",
          "f7b5e7",
          "ad73ce",
          "9cad5a",
          "ef21a5",
          "a55294",
          "2963d6",
          "8c296b",
          "a53963",
          "393929"
        ]
      },
      {
        "key": "imp-rider",
        "name": "Imp Rider",
        "short": "Imp Rider",
        "enemy": 19,
        "asm": 65,
        "palette": 63,
        "animation": 83,
        "size": 1,
        "colors": [
          "292910",
          "ffffff",
          "ceefad",
          "7b947b",
          "94d629",
          "efc600",
          "4a635a",
          "52a500",
          "ad5a08",
          "4a7308",
          "184a42",
          "393929"
        ]
      },
      {
        "key": "ash-roller",
        "name": "Ash Roller",
        "short": "Ash Roller",
        "enemy": 242,
        "asm": 63,
        "palette": 231,
        "animation": 100,
        "size": 0,
        "colors": [
          "292910",
          "ffffff",
          "9c9c84",
          "5a8c94",
          "636352",
          "ffffff",
          "ffffff",
          "424a4a",
          "ffffff",
          "294239",
          "a54a42",
          "393929"
        ]
      }
    ]
  }
];
export const swampImps=swampImpFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
