export const swampColors=['252c27','394c36','59754b','88a368','c3cf91','253f37','456951','7da072','554436','8d6b43','c5a065','f6e9b9'];
export const swampFamily={key:'swamp-dozers',name:'Sleepy swamp creatures',gfx:99,
 groups:[{art:'dozer',asm:58,size:0,width:32,height:32,frames:24,frameOffsets:{
  0:[-1,1],2:[1,1],3:[-1,1],5:[1,1],6:[0,-1],8:[-1,-1],9:[0,-1],11:[1,-1],15:[0,3],17:[0,-16],19:[0,16],21:[-16,0],23:[16,0]
 }}],actors:[
  {key:'swamp-dozer',name:'Swamp Dozer',short:'Swamp Dozer',enemy:0,asm:58,palette:57,animation:93,colors:swampColors},
  {key:'old-dozer',name:'Old Dozer',short:'Old Dozer',enemy:130,asm:58,palette:57,animation:93,colors:swampColors}
 ]};

export const swampFamilies=[swampFamily];
export const swampCreatures=swampFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
