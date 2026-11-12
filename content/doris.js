// Original level thresholds and training rewards remain in the native event.
export const dorisTiers=[
  {id:224,name:'Apron lesson',asm:232,palette:7,frames:26,width:32,height:32,size:0,dress:['6a3e65','a9759c']},
  {id:225,name:'Blue lesson',asm:233,palette:10,frames:15,width:32,height:32,size:0,dress:['354f69','698eae']},
  {id:226,name:'Green lesson',asm:234,palette:11,frames:27,width:32,height:32,size:0,dress:['31544b','729c78']},
  {id:227,name:'Scarlet lesson',asm:235,palette:12,frames:21,width:32,height:64,size:1,dress:['783f43','c07870']},
  {id:228,name:'Star lesson',asm:236,palette:251,frames:20,width:48,height:64,size:2,dress:['4b3f79','8f7dc4']},
  {id:229,name:'Master lesson',asm:237,palette:250,frames:24,width:32,height:32,size:0,dress:['8a5b32','d7ac62']}
];
export const dorisColors=tier=>['29212d','955f59','bf8875','f1bd9e','f4dfb6',...dorisTiers[tier].dress,'382c37','fff1db','665568','738bb8','cf4b6b'];
