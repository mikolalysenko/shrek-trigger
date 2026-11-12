import {rasterActorGeometry} from './generated-actor-geometry.js';
const firstColors=['382b2d','71452e','b87744','e5ad67','fff0c9','2f5d58','5e9280','b6cbb1','fff7e5','8c364b','da7787','d9b05f'];
const northColors=['302932','674235','a76d50','dba57b','f3ddbb','55415f','8b698b','cbb2c5','fff2dd','87454f','d48a91','d6b574'];
// The two villages share their three civilian banks and have separate native
// palettes. The elder has a fourth bank. Children and elders receive private
// assemblies because their source assemblies also serve unrelated villagers.
// No graphics or animation IDs move.
export const bakeryVillagerFamilies=[
 {key:'bread-porters',name:'Bread porters',gfx:24,groups:[{art:'bread-porter',asm:12,size:0,width:32,height:32,frames:23}],actors:[
  {key:'bakery-porter',name:'First Bakery porter',npcs:[30],npc:30,asm:12,palette:123,animation:21,colors:firstColors},
  {key:'north-bakery-porter',name:'North Bakery porter',npcs:[62],npc:62,asm:12,palette:124,animation:21,colors:northColors}
 ]},
 {key:'cinnamon-bakers',name:'Cinnamon bakers',gfx:25,groups:[{art:'cinnamon-baker',asm:13,size:0,width:32,height:32,frames:23}],actors:[
  {key:'bakery-baker',name:'First Bakery bun baker',npcs:[31],npc:31,asm:13,palette:123,animation:22,colors:firstColors},
  {key:'north-bakery-baker',name:'North Bakery bun baker',npcs:[63],npc:63,asm:13,palette:124,animation:22,colors:northColors}
 ]},
 {key:'crumb-children',name:'Crumb children',gfx:20,groups:[{art:'crumb-child',asm:245,size:0,...rasterActorGeometry['crumb-child']}],actors:[
  {key:'bakery-child',name:'First Bakery crumb child',npcs:[32],npc:32,asm:245,sourceAsm:11,palette:123,animation:8,colors:firstColors},
  {key:'north-bakery-child',name:'North Bakery crumb child',npcs:[64],npc:64,asm:245,sourceAsm:11,palette:124,animation:8,colors:northColors}
 ]},
 {key:'brioche-elder',name:'Brioche elder',gfx:15,groups:[{art:'brioche-elder',asm:246,size:0,...rasterActorGeometry['brioche-elder']}],actors:[
  {key:'bakery-elder',name:'Brioche elder',npcs:[33],npc:33,asm:246,sourceAsm:7,palette:123,animation:7,colors:firstColors}
 ]},
 {key:'bakery-drummer',name:'Bread drummer',gfx:52,groups:[{art:'bread-drummer',asm:94,size:0,...rasterActorGeometry['bread-drummer']}],actors:[
  {key:'bakery-drummer',name:'Bread drummer',npcs:[122],npc:122,asm:94,palette:123,sourcePalette:174,animation:63,colors:firstColors}
 ]},
 {key:'bakery-log-drummer',name:'Bun percussionist',gfx:53,groups:[{art:'bun-percussionist',asm:95,size:0,...rasterActorGeometry['bun-percussionist']}],actors:[
  {key:'bakery-log-drummer',name:'Bun percussionist',npcs:[123],npc:123,asm:95,palette:123,sourcePalette:174,animation:63,colors:firstColors}
 ]},
 {key:'onion-bread-plates',name:'Onion bread platters',gfx:191,groups:[{art:'onion-bread-plate',asm:187,size:0,...rasterActorGeometry['onion-bread-plate']}],actors:[
  {key:'onion-bread-plate',name:'Onion bread platter',npcs:[94],npc:94,asm:187,palette:123,sourcePalette:5,animation:150,colors:firstColors}
 ]}
];
export const bakeryVillagers=bakeryVillagerFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
