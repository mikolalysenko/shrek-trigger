// Abandoned-attraction machines. All variants keep their original actor IDs,
// animation programs, combat headers and four-cell allocation.
import {rivetActor} from './racing.js';
import {rasterActorGeometry} from './generated-actor-geometry.js';
const brass=['252a31','4b4140','806044','bb925b','edd4a0','f8ebc4','35494c','567a79','98b6ab','694a51','bd655b','d6efb4'];
const steel=['242c38','38485b','596f83','89a8b6','c2d9d7','f0f3db','423d58','72638a','b4a5bd','514258','aa667e','b4e6ef'];
const iron=['302831','514046','78504b','b97d60','ddb993','f5dfb7','423e47','75636a','b1a093','593a3d','c45e5c','efc677'];
export const futureMachines=[
  {key:'sweep-mite',name:'Sweep Mite',short:'Sweep Mite',enemy:84,gfx:96,asm:55,palette:48,animation:40,size:0,frames:9,art:'mite',...rasterActorGeometry['future-mites'],colors:brass},
  {key:'scour-mite',name:'Scour Mite',short:'Scour Mite',enemy:85,gfx:96,asm:55,palette:49,animation:40,size:0,frames:9,art:'mite',...rasterActorGeometry['future-mites'],colors:steel},
  {key:'scrub-mite',name:'Scrub Mite',short:'Scrub Mite',enemy:86,gfx:96,asm:55,palette:50,animation:40,size:0,frames:9,art:'mite',...rasterActorGeometry['future-mites'],colors:iron},
  {key:'tin-usher',name:'Tin Usher',short:'Tin Usher',enemy:137,gfx:97,asm:56,palette:51,animation:41,size:0,frames:25,art:'usher',...rasterActorGeometry['future-ushers'],colors:steel},
  {key:'brass-usher',name:'Brass Usher',short:'Brass Usher',enemy:138,npcs:[170],npcAnimations:{170:41},gfx:97,asm:56,palette:52,animation:159,size:0,frames:25,art:'usher',...rasterActorGeometry['future-ushers'],colors:brass},
  {key:'iron-usher',name:'Iron Usher',short:'Iron Usher',enemy:139,gfx:97,asm:56,palette:53,animation:41,size:0,frames:25,art:'usher',...rasterActorGeometry['future-ushers'],colors:iron},
  {key:'watch-bell',name:'Watch Bell',short:'Watch Bell',enemy:207,gfx:197,asm:165,palette:201,animation:155,size:0,frames:5,art:'bell',...rasterActorGeometry['future-bells'],colors:brass},
  {key:'alarm-bell',name:'Alarm Bell',short:'Alarm Bell',enemy:208,gfx:197,asm:165,palette:201,animation:155,size:0,frames:5,art:'bell',...rasterActorGeometry['future-bells'],colors:brass},
  rivetActor
];
// Mites, bells, the Proto ushers (97) and the Guardian (172) keep stock art.
// Rivet stays custom; the Supply Keeper keeps its battle name.
export const stockMachineGraphics=new Set([96,97,172,197]);
export const customFutureMachines=futureMachines.filter(a=>!stockMachineGraphics.has(a.gfx));
export const supplyKeeper={key:'supply-keeper',name:'Supply Keeper',short:'Storekeeper',enemy:212,gfx:172,asm:167,palette:202,animation:129,size:6,...rasterActorGeometry['supply-keeper'],
  colors:['29282e','514038','765638','a87d49','d6b67e','f4dfae','2e4241','50675d','8d9b79','644151','ab6263','d6efb4'],
  background:{graphics:186,tileset:43,palette:57,map:123,locations:[219,346],maps:[123,20],width:128,height:176,x:64,y:48}
};
