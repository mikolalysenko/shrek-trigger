// These are the source stat tabs, with their original item IDs and effects.
export const faygoItems=[
  {id:205,name:'Orange Faygo',short:'Orng Faygo',stat:'Beef',color:'orange',description:'Beef +1'},
  {id:206,name:'Blue Faygo',short:'Blue Faygo',stat:'Mojo',color:'blue',description:'Mojo +1'},
  {id:207,name:'Red Faygo',short:'Red Faygo',stat:'Zoom',color:'red',description:'Zoom +1'}
];

const bottleColors={
 orange:['24212b','703514','b65b1c','ed952b','ffd777','dfded1','f5edd7','7a3f23','36303b','fff6d0','b7d6d1','59505b'],
 blue:['24212b','173965','23669b','3ca6d0','9bdef0','dfded1','f5edd7','235071','36303b','fff6d0','b7d6d1','59505b'],
 red:['24212b','651b30','a42e42','e34f58','ffa194','dfded1','f5edd7','762b3d','36303b','fff6d0','b7d6d1','59505b']
};
export const faygoActors=faygoItems.map((item,i)=>({
 ...item,key:'faygo-'+item.color,npc:236+i,npcs:[236+i],gfx:229,asm:216,
 palette:[125,127,214][i],animation:139,size:0,width:32,height:32,frames:5,colors:bottleColors[item.color]
}));
