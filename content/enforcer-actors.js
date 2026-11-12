import {briarGeometry,briarNativeRoles} from './large-actor-frames.js';
export const briarFrames=briarNativeRoles;
const knightColors=['202a2f','3c4c50','70858a','adbec1','e5eddb','28493c','50734a','91ad63','522e3d','a64e65','c2994d','f5dfa2'];
const mothColors=['252737','493654','795a86','ad87ab','e2bfd3','294d50','5d8984','aac8b5','f6dfa0','97764e','cfb380','fff0d5'];
export const enforcerFamilies=[{
 key:'briar-knight',name:'Briar Knight',gfx:166,
 groups:[briarGeometry],
 actors:[
  {key:'briar-unarmed',name:'Briar Knight (unarmed)',short:'BriarKnight',enemy:157,asm:158,palette:200,animation:125,colors:knightColors},
  {key:'briar-knight',name:'Briar Knight',short:'BriarKnight',enemy:158,asm:158,palette:200,animation:126,colors:knightColors},
  {key:'briar-trio',name:'Briar Knight (trio)',short:'BriarKnight',enemy:165,asm:158,palette:200,animation:126,colors:knightColors},
  {key:'briar-master',name:'Briar Knight (hideout)',short:'BriarKnight',enemy:186,asm:158,palette:200,animation:126,colors:knightColors}
 ]
},{
 key:'moth-witch',name:'Moth Witch',gfx:182,
 groups:[{art:'moth-witch',asm:179,size:1,width:32,height:64,frames:16,frameOffsets:{11:[0,-2],12:[0,-2],13:[0,-1],14:[0,-1]}}],
 actors:[
  {key:'moth-witch',name:'Moth Witch',short:'Moth Witch',enemy:159,asm:179,palette:210,animation:137,colors:mothColors},
  {key:'moth-trio',name:'Moth Witch (trio)',short:'Moth Witch',enemy:160,asm:179,palette:210,animation:137,colors:mothColors},
  {key:'moth-master',name:'Moth Witch (hideout)',short:'Moth Witch',enemy:187,asm:179,palette:210,animation:137,colors:mothColors}
 ]
}];
export const enforcerActors=enforcerFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
