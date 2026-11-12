import {largeActorFrames} from './large-actor-frames.js';
// The hostile castle ghost is separate from living Sir Bram's field sprite.
export const ghostFamilies=[{
 key:'sir-bram-ghost',name:'Sir Bram’s ghost',gfx:181,
 groups:[{art:'sir-bram-ghost',asm:178,size:2,...largeActorFrames['sir-bram-ghost']}],
 actors:[{key:'sir-bram-ghost',name:'Sir Bram’s ghost',short:'Bram Ghost',enemy:143,asm:178,palette:209,animation:136,colors:["292910","ffffff","eff7ff","c6bda5","c6a531","adad73","8c8c73","8c6318","6b735a","6b6329","425252","393929"]}]
}];
export const ghostActors=ghostFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a,previewAnimation:0})));
