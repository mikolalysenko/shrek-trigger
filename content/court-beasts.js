import {rasterActorGeometry} from './generated-actor-geometry.js';
export const courtBeastGeometry=rasterActorGeometry['court-beast'];
// Both court impostors share a native eight-cell animation bank. Separate
// palettes distinguish the medieval beast and the later royal-court threat.
export const courtBeasts=[
  {key:'masquerader',name:'The Masquerader',short:'Masquerader',enemy:144,gfx:133,asm:127,palette:185,animation:99,frames:31,size:1,...courtBeastGeometry,
    colors:['252333','3d3656','5b4e7b','8a719c','c4b3c6','f3e4ba','5e213a','9d3c4f','bd8e45','d8e05d','193a38','fff8e8']},
  {key:'court-beast',name:'The Court Beast',short:'Court Beast',enemy:199,gfx:133,asm:127,palette:249,animation:99,frames:31,size:1,...courtBeastGeometry,
    colors:['252333','303d50','4b6670','789a9b','bdcdd0','f3e4ba','4d295d','845488','d3a756','f1a250','38283a','fff8e8']}
];
