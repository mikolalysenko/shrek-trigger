// Four native flight poses. The copper/ivory palette is deliberately retained:
// slot 129 also belongs to a separate NPC and must not be recolored globally.
const folded=[[16,0],[48,0],[16,16],[32,16],[48,16],[16,32],[32,32],[48,32]];
const spread=[[0,16],[16,16],[32,16],[48,16],[64,16],[16,32],[32,32],[48,32]];
const down=[[16,16],[32,16],[48,16],[16,32],[32,32],[48,32],[32,0],[0,32]];
export const skyDrakeFamilies=[{
 key:'sky-drakes',name:'Sky drakes',gfx:42,
 groups:[{art:'sky-drake',asm:31,size:1,width:80,height:48,frames:4,frameCellOrigins:[folded,spread,spread,down]}],
 actors:[{key:'sky-drake',name:'Sky drake',npc:8,npcs:[8],asm:31,palette:129,animation:56,
  colors:['282028','f8f0d8','f09878','c0c0a0','f8d090','e0a070','c07860','884840','403028','808048','505830','384030']}]
}];
export const skyDrakes=skyDrakeFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
