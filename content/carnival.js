// Native IDs and animation programs remain stable through every quest scene.
export const carnivalCast = [
  {key:'violent-j',name:'Violent J',short:'Violent J',enemy:151,gfx:164,asm:156,palette:198,frames:37,size:0,width:32,height:32},
  {key:'shaggy-2-dope',name:'Shaggy 2 Dope',short:'Shaggy2Dope',enemy:152,gfx:253,asm:238,palette:197,frames:37,size:0,width:32,height:32},
  {key:'great-milenko',name:'The Great Milenko',short:'G. Milenko',enemy:153,gfx:165,asm:157,palette:199,frames:20,size:2,width:48,height:64}
];
// Unreferenced NPC header slots, used only by the four mountain disguises.
// Keep their original 15-frame child animation program and event timing.
export const carnivalFields=[
  {key:'violent-j-field',art:'violent-j',name:'Violent J · quest scenes',npc:216,gfx:164,asm:241,palette:198,animation:8,frames:15},
  {key:'shaggy-2-dope-field',art:'shaggy-2-dope',name:'Shaggy 2 Dope · quest scenes',npc:217,gfx:253,asm:242,palette:197,animation:8,frames:15}
];
export const carnivalColors = {
  'violent-j':['171521','363442','b77b59','e6b58a','f7f3df','b7bab7','dc3942','842137','293444','546779','c5a66a','f2ce73'],
  'shaggy-2-dope':['171521','363442','a16a51','dba67e','f7f3df','b7bab7','e44336','8a2230','293444','546779','876d4e','f2ce73'],
  'great-milenko':['171322','35213f','693d7e','b28fca','ece9d6','9bafab','3b6539','74a746','b9db70','ad7937','efd177','fff9e9'],
  hatchet:['191d2c','454b5c','8b9ba6','dae6dc','fff9df','355f39','7da94b','b3d56b','63422e','a97847','51325e','94619f']
};
export const hatchetProps = [
  {key:'ruby-hatchet',name:'Ruby Hatchet',npc:103,gfx:72,asm:240,palette:170,frames:2},
  {key:'hatchet-parts',name:'Hatchet head and haft',npc:104,gfx:73,asm:239,palette:170,frames:2},
  {key:'carnival-hatchet',name:'Carnival Hatchet',npc:139,gfx:121,asm:116,palette:170,frames:7}
];
export const carnivalBattleMessages={
  0x2e:'Hatchet lowers Farquaad\'s M. def!{null}',
  0x4c:'The clowns are stronger together!{null}',
  0xa5:'The hatchet absorbs energy!{null}',
  0xaf:'Hatchet lowers the muffin\'s M. def!{null}'
};

// Every native Masa/Mune-family load in the Zeal and Ocean Palace locations,
// including the two Enhasa variants. Offsets identify decoded event commands
// after the leading object-count byte. These are coverage records, not new
// event instructions; their shared enemy headers supply the replacement art.
export const zealSpiritScenes=[
  {location:335,eventId:207,loads:[[1867,151],[1974,151],[2068,151]]},
  {location:340,eventId:15,loads:[[483,151],[506,151]]},
  {location:350,eventId:314,loads:[[129,153]]},
  {location:355,eventId:208,loads:[[1867,151],[1974,151],[2068,151]]},
  {location:401,eventId:217,loads:[[1643,151],[1694,152]]},
  {location:404,eventId:220,loads:[[884,152]]},
  {location:409,eventId:397,loads:[[2653,151]]}
];
