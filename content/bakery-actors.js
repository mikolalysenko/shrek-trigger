import {rasterActorGeometry} from './generated-actor-geometry.js';
const glazeColors=['2c2630','634345','b77754','eab789','ffdfaf','533542','914154','c65c59','566466','9ca8a3','f4ead0','e0b65d'];
const kilnColors=['252a30','3e474c','677776','9da998','d5d9b6','5c3934','9d5438','ca8050','8e302c','dc5a31','ffd36f','fff0bf'];
const ironColors=['29252d','4e4246','80625d','ad8d78','dbc5a0','4d313e','835064','ba7b88','943747','e66e60','ffcc81','fff0c5'];
const hunterColors=['292c30','4c5140','7e8556','b3b77c','e2d8a0','573b38','8c5341','bd8553','a3423e','ef8660','f7d8a4','fff0ce'];
const guardColors=['2b2730','514449','846566','b28a7b','dbb795','483b46','795460','ab7a80','a63d4b','ec7b6b','f5cfb0','fff0d2'];
export const furnaceColors=['24272c','39434a','607477','99ada5','d3dfc4','553a32','926044','c4935b','81312c','d96032','ffd777','fff0c8'];
export const buriedFurnaceColors=['2c242b','4d393e','805955','b98a70','e2b994','49303b','79505d','b8847c','883248','dc646a','f5c887','fff0d0'];
export const bakeryFamilies=[{
 key:'master-glaze',name:'Master Glaze',gfx:141,
 groups:[{art:'master-glaze',asm:135,size:0,width:32,height:32,frames:20,frameOffsets:{1:[0,1],4:[0,1],7:[0,1],10:[0,1],12:[0,1],13:[1,1],14:[0,2],15:[0,5],16:[0,4],17:[0,5]}}],
 actors:[{key:'master-glaze',name:'Master Glaze',short:'Glaze',enemy:154,asm:135,palette:190,animation:101,colors:glazeColors}]
},{
 key:'kilnback',name:'Kilnback',gfx:139,
 groups:[{art:'kilnback',asm:132,size:2,...rasterActorGeometry['kilnback']}],
 actors:[
  {key:'kilnback',name:'Kilnback',short:'Kilnback',enemy:155,asm:132,palette:186,animation:104,colors:kilnColors},
  {key:'iron-kiln',name:'Iron Kilnback',short:'Iron Kiln',enemy:156,asm:132,palette:187,animation:104,colors:ironColors}
 ]
},{
 key:'crumb-hunters',name:'Crumb Hunters',gfx:79,
 groups:[{art:'crumb-hunter',asm:34,size:0,...rasterActorGeometry['crumb-hunters']}],
 actors:[
  {key:'crumb-hunter',name:'Crumb Hunter',short:'CrumbHunt',enemy:1,npcs:[76],asm:34,palette:16,animation:26,colors:hunterColors},
  {key:'kiln-hunter',name:'Kiln Hunter',short:'Kiln Hunter',enemy:61,asm:34,palette:17,animation:26,colors:guardColors}
 ]
},{
 key:'furnace-maw',name:'Furnace Maw',gfx:34,
 groups:[{art:'furnace-maw',asm:23,size:6,...rasterActorGeometry['furnace-maw']}],
 actors:[
  {key:'furnace-maw',name:'Furnace Maw',short:'Furnace Maw',enemy:188,asm:23,palette:229,animation:164,colors:furnaceColors},
  {key:'buried-kiln',name:'Buried Furnace',short:'Buried Kiln',enemy:189,asm:23,palette:230,animation:164,colors:buriedFurnaceColors}
 ]
}];
export const bakeryActors=bakeryFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
// Nizbel and the Reptites keep stock art; the Kilnback keeps its battle names.
// Master Glaze and the Furnace Maw stay custom as the chapter's villain and lair.
export const stockBakeryFamilyKeys=new Set(['kilnback','crumb-hunters']);
export const customBakeryFamilies=bakeryFamilies.filter(f=>!stockBakeryFamilyKeys.has(f.key));
export const customBakeryActors=customBakeryFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
