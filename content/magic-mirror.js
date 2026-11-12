// The native boss is a main sprite, a visual-only trim sprite and three
// ordinary Display combatants. NPC 127 shares the Display resource family.
export const magicMirrorResources={graphics:[213,168],assemblies:[206,207,161]};

export const magicMirror={
  key:'magic-mirror',location:268,
  colors:['161727','222844','3f5875','667a8e','93a6b1','b8ced0','e5f3e9','4a321c','80602d','b68a3e','ddb854','f4dfa0'],
  model:{
    gfx:213,palette:232,width:48,height:96,frames:2,blankFrame:1,anchor:[0,48],
    original:{graphicsBytes:2048,graphicsCrc32:1839563604,paletteCrc32:506687625},
    actors:[
      {key:'magic-mirror-main',short:'MagicMirror',enemy:190,asm:206,size:2,cells:12,header:[213,206,232,173,2,0,224,12,12,0],assemblyBytes:240,assemblyCrc32:2137416274},
      {key:'magic-mirror-trim',short:'',enemy:191,asm:207,size:33,cells:8,header:[213,207,232,173,33,0,32,12,12,0],assemblyBytes:160,assemblyCrc32:672711199}
    ]
  },
  display:{
    key:'magic-mirror-display',short:'Echo Mirror',gfx:168,asm:161,palette:144,enemy:183,npc:127,size:0,cells:4,width:32,height:16,frames:8,blankFrame:7,
    enemyHeader:[168,161,144,143,0,0,232,12,12,0],npcHeader:[168,161,144,115,0],
    roles:['boot spark','boot sweep','static A','static B','active A','active B','active C','blank'],
    original:{graphicsBytes:960,graphicsCrc32:2838780867,assemblyBytes:320,assemblyCrc32:3558923242,paletteCrc32:3702010908},
    npcLocations:[218,228,229,230,234,235,241,248,256,259,439,476]
  }
};
