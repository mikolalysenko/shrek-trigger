// Mr. Worldwide's private twelve-color sprite palette (indices 1..12; 0 is
// transparent) and his native sprite geometry: eight 48x64 poses in the
// twelve-cell class, following Golem's eight-frame animation program. The
// colors were picked by role from k-means clusters of the generated sheet
// (assets/imagegen/mr-worldwide/source-v2.png) and snapped to SNES 15-bit.
export const mrWorldwideSprite={width:48,height:64,frames:8};

export const mrWorldwidePalette=[
  '080810', // 1 outline
  '292931', // 2 black shirt, shades, shoes, goatee
  '737bad', // 3 suit shadow
  '9ca5ce', // 4 suit midtone, mic
  'bdbdd6', // 5 suit light, mic highlight
  'fffff7', // 6 white suit, teeth, shine
  '944a29', // 7 skin shadow
  'ad6339', // 8 skin midtone
  'e78c52', // 9 skin light
  'c60808', // 10 fire red
  'f79c31', // 11 fire orange, pocket square
  'fff784'  // 12 fire yellow
];
