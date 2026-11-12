import {rasterActorGeometry} from './generated-actor-geometry.js';
export const cosmicMuffinColors=['211b22','fff5d2','f5c783','e3b65c','cf3541','ce8c55','975535','593426','4a221b','362127','751b30','180f16'];
export const cosmicMuffinEnemyIds=[194,195,196,197,198,201,202,230,231,232,233,234,235,236];
export const cosmicMuffinActors=[
 ...cosmicMuffinEnemyIds.map(enemy=>({key:'cosmic-muffin-'+enemy,name:'Cosmic Muffin · '+enemy,short:'The Muffin',enemy,gfx:163,asm:155,palette:207,animation:151,size:enemy===196?37:5,frames:7,art:'cosmic-muffin-mouth'})),
 {key:'cosmic-muffin-echo',name:'Cosmic Muffin · time echo',npc:206,gfx:163,asm:155,palette:159,animation:151,size:5,frames:7,art:'cosmic-muffin-mouth'}
];

const spawnColors=["ffffff","292910","d6efad","de9c84","d6bd21","0884ff","b5735a","8c9c6b","8c5200","732118","525a29","393929"];
export const cosmicMuffinSpawnFamilies=[
 {key:'cosmic-muffin-spawn-head',name:'Muffin offspring mouths',gfx:176,groups:[{asm:171,size:32,art:'cosmic-muffin-spawn-head',...rasterActorGeometry['cosmic-muffin-spawn-head']}],actors:[110,216].map(enemy=>({key:'muffin-maw-'+enemy,name:enemy===110?'Elder Muffin · mouth':'Muffin Bud · mouth',short:'Muffin Maw',enemy,asm:171,palette:208,animation:105,colors:spawnColors}))},
 {key:'cosmic-muffin-spawn-shell',name:'Muffin offspring bodies',gfx:177,groups:[{asm:173,size:35,art:'cosmic-muffin-spawn-shell',...rasterActorGeometry['cosmic-muffin-spawn-shell']}],actors:[111,215].map(enemy=>({key:'muffin-bud-'+enemy,name:enemy===111?'Elder Muffin':'Muffin Bud',short:enemy===111?'ElderMuffin':'Muffin Bud',enemy,asm:173,palette:208,animation:177,colors:spawnColors,fixedFrame:0,blankFrames:[1]}))}
];
export const cosmicMuffinSpawnActors=cosmicMuffinSpawnFamilies.flatMap(f=>f.actors.map(a=>({...f.groups[0],gfx:f.gfx,...a})));
