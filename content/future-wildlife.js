import {rasterActorGeometry} from './generated-actor-geometry.js';
const ratColors=['28272c','51463e','8b7763','c5af8c','eee0bb','8d5354','c88776','354d52','73918b','483b3d','c59a50','f6edce'];
const gremlinColors=['252b31','324b48','5a8171','97b49a','dbe3ba','6d4c6c','aa7895','494565','8b82a4','36364e','e0b963','fff1ca'];
const rootColors=['242928','4b352c','86543a','bc8150','e8bd7a','243e34','41684b','82a566','254750','5f9296','d89038','f8e8b8'];
const briarRootColors=['29272b','4d3031','8e4c3e','c67b58','eac18a','30423b','5b7850','97b46b','304158','6b91aa','dda44d','fff0c5'];
const briarColors={
  36:['242b2d','303b52','52628b','8192b6','b8cdd5','273d35','466951','8ba980','3d304b','8c709a','e8ba52','f7eed0'],
  37:['252a27','472c35','82404a','bc6570','e9a39a','223e31','3d6843','7ca765','49334d','927095','d5aa43','f7e7b1'],
  38:['2c272b','422d45','724868','a86c91','d89bb5','303c35','576a42','9aa760','412c37','88576b','e2b75d','ffecc8']
};
const mireColors=['232b2b','443a30','705643','a37d56','cba873','263e32','49664c','86a06a','3c5056','71858a','d7ae51','f4dfae'];
const ironColors=['262a37','3b3e50','626477','9994a2','c6c0b8','263d43','456369','7a9a96','353e58','7583a1','e2b166','ffebbb'];
const sewerPalettes={
  21:['252b2c','354b3e','5e7d54','91a86d','c5ce94','343c49','606e7a','9aa7ab','4f3831','926349','d5ab60','f5e5b9'],
  22:['282a38','3e455e','63748d','98b2b8','cddcc2','3b3549','75677c','b1a0aa','52343d','976475','d8b96a','f9edca'],
  54:['242c2c','2f503e','527f52','87ad70','c3d59b','3c4149','737d82','b0bbb3','5e4035','a27550','d8b966','fff0c8'],
  55:['242d37','344c52','5a7a7c','91b1a2','cbdec0','3d3e56','79758c','b3b0c2','4d3b57','8a7195','d9b96a','fff0c8'],
  56:['2d2a2d','59472e','8a7441','bca365','e2cf98','3a4547','718785','aabeb1','513d35','956f53','d7b166','fff0c6'],
  100:['282b28','3f4432','69704b','9ba56a','d4d898','503b42','885267','c28691','2b4847','5d8580','e3b865','fbebc8'],
  101:['2c282f','4f3a43','865764','b98987','e3bca0','49374e','7b557f','bd8cb3','3a4340','77836c','e6b35d','ffebc1'],
  43:['232d35','28484b','39726a','6ea88e','b5d7ac','3a3b59','67628a','a89ab9','304e71','6d98b7','dfbd6b','f8edc7'],
  42:['282b37','3d3c5b','65658d','9c99bc','d4cde4','493b4a','806076','b88fa2','304f67','6a99ac','e2b76a','fff0c9'],
  80:['282837','44364d','735376','aa829f','e2b7c4','4b382c','805738','ba8952','34434d','688491','e6ac54','fff0b8'],
  81:['252d2c','344a40','55765b','8eaa7b','c9d7a4','4a3f2f','7c6641','b49a63','334c50','70928a','e8ba65','fff0bd'],
  82:['302831','57343b','8c4c4b','c47d6b','eeb6a0','4e392e','835d3b','c59658','4b3b4e','937580','eea34a','ffedb8'],
  83:['252c3c','35465b','516c8b','849fbb','b9d5e2','353d4f','62718a','9ba9bd','363e56','757fa0','7dc9df','e3f6e8']
};
// Palette 111 crosses two native graphics families: Cracked Pot and Scrap
// Beetle must use the same twelve entries, and both owners are replaced.
const potPalettes={
  111:['252c2a','4b3b30','7d6047','b58b60','e2bc87','2c4337','557754','95ae76','364f5b','79949a','dfa84f','f9e9b6'],
  108:['2c272a','583632','935548','ca8462','edb78b','374038','68734f','a3ae71','433e53','91819a','e8b55d','ffedbc'],
  109:['252b30','3c414b','606a74','91a0a1','c8d6c0','294b38','4b8251','91b86c','354959','6a94a2','d9b66b','f7ecc2'],
  110:['2c2730','4d3547','825168','b9828d','e4b5b1','42324b','78506d','bb8c9b','4a3a57','9a789c','dcae69','ffebc0'],
  107:['2b2529','51332f','86503b','ba7c43','e4af66','493c30','786749','b5a36c','78352f','b95b3c','edab4f','fff0b3'],
  41:['252d29','423e32','7b7048','b1a161','e3ce8c','42374a','775a79','ad90ac','35543b','7eac65','e5ad55','ffedc2']
};
// Source ramps are shared with actors outside this graphics family. The
// artwork uses their existing indexed colors; the builder emits no recolor.
const wispColors={
  72:['292910','ffffff','dedef7','ceceef','c5c5ef','bdbde6','a5a5de','8c94de','8484d6','736bc5','5a6bce','3a3a29'],
  74:['292910','ffffff','e6d684','cebd3a','9ce6ef','bdad31','9c9431','847300','736300','525200','4a3a00','3a3a29'],
  70:['292910','ffffff','ffffce','f7ef8c','9ce6ef','f7ad63','efbd6b','f77321','de6342','d63121','7b1900','3a3a29'],
  75:['292910','ffffff','d6ffe6','9ce6ef','63efad','29c552','29ad42','318c29','427b3a','296b21','104a21','3a3a29'],
  73:['292910','ffffff','cebdb5','a5ad9c','9ce6ef','8c8c7b','737352','6b6342','5a5231','4a4219','3a3108','3a3a29']
};

// One native graphics bank can serve several assembly groups and palettes.
// Every owner is declared before a bank or palette can be replaced.
export const wildlifeFamilies=[{
  key:'rats',name:'Scavenger rats',gfx:105,
  groups:[{asm:68,size:0,art:'rat',...rasterActorGeometry['scavenger-rats']}],
  actors:[
    {key:'scrap-rat',name:'Scrap Rat',short:'Scrap Rat',enemy:134,npcs:[164],npcAnimations:{164:44},asm:68,palette:84,animation:97,colors:ratColors},
    {key:'gremlin',name:'Gremlin',short:'Gremlin',enemy:135,asm:68,palette:85,animation:97,colors:gremlinColors}
  ]
},{
  key:'residues',name:'Wisps and workshop residues',gfx:102,
  groups:[{asm:64,size:0,art:'wisp',...rasterActorGeometry['workshop-residues']}],
  actors:[
    ['lost-wisp','Lost Wisp',102,72,157],['gilt-wisp','Gilt Wisp',104,74,157],
    ['sour-slime','Sour Slime',105,70,52],['lye-slime','Lye Slime',106,75,52],
    ['ash-slime','Ash Slime',107,73,52],['cinder-slime','Cinder Slime',108,73,52]
  ].map(([key,name,enemy,palette,animation])=>({key,name,short:name==='Cinder Slime'?'CinderSlime':name,enemy,asm:64,palette,animation,colors:wispColors[palette]}))
},{
  key:'briars',name:'Rootlings and snapping briars',gfx:89,
  groups:[
    {asm:46,size:0,art:'rootling',...rasterActorGeometry.rootling},
    {asm:50,size:1,art:'briar-rider',...rasterActorGeometry['briar-rider']},
    {asm:51,size:0,art:'snap-briar',...rasterActorGeometry['snap-briar']}
  ],
  actors:[
    {key:'rootling',name:'Rootling',short:'Rootling',enemy:34,asm:46,palette:33,animation:35,colors:rootColors},
    {key:'briar-root',name:'Briar Root',short:'Briar Root',enemy:35,asm:46,palette:32,animation:35,colors:briarRootColors},
    // Enemy 36, the unused source Octobino record, is now Mr. Worldwide with
    // private sprite resources (content/mr-worldwide.js), so it no longer owns 89.
    {key:'briar-rider',name:'Briar Rider',short:'Briar Rider',enemy:175,asm:50,palette:32,animation:158,colors:briarRootColors},
    ...[['snap-briar','Snap Briar',38,36],['hungry-briar','Hungry Briar',39,37],['dire-briar','Dire Briar',40,38]].map(([key,name,enemy,palette])=>({key,name,short:name==='Hungry Briar'?'HungryBriar':name,enemy,asm:51,palette,animation:36,colors:briarColors[palette]}))
  ]
},{
  key:'golems',name:'Mire and iron golems',gfx:154,
  groups:[{asm:147,size:1,art:'mire-golem',...rasterActorGeometry['mire-golems']}],
  actors:[
    {key:'mire-golem',name:'Mire Golem',short:'Mire Golem',enemy:163,asm:147,palette:194,animation:117,colors:mireColors},
    {key:'iron-golem',name:'Iron Golem',short:'Iron Golem',enemy:164,asm:147,palette:195,animation:117,colors:ironColors}
  ]
},{
  key:'pots',name:'Enchanted clay pots',gfx:112,
  groups:[
    {asm:79,size:0,art:'cracked-pot',...rasterActorGeometry['cracked-pot']},
    {asm:78,size:0,art:'spore-pot',...rasterActorGeometry['spore-pot']},
    {asm:77,size:0,art:'ember-pot',...rasterActorGeometry['ember-pot']}
  ],
  actors:[
    ['cracked-pot','Cracked Pot',91,79,111],['clay-pot','Clay Pot',92,79,108],
    ['spore-pot','Spore Pot',93,78,109],['thorn-spore','Thorn Spore',94,78,110],
    ['ember-pot','Ember Pot',95,77,107],['spell-pot','Spell Pot',97,77,109],['moss-urn','Moss Urn',98,79,109]
  ].map(([key,name,enemy,asm,palette])=>({key,name,short:name,enemy,asm,palette,animation:48,colors:potPalettes[palette]}))
},{
  key:'beetles',name:'Scrap and briar beetles',gfx:92,
  groups:[{asm:49,size:0,art:'beetle',...rasterActorGeometry.beetle}],
  actors:[
    {key:'scrap-beetle',name:'Scrap Beetle',short:'ScrapBeetle',enemy:140,asm:49,palette:111,animation:144,colors:potPalettes[111]},
    {key:'briar-beetle',name:'Briar Beetle',short:'BriarBeetle',enemy:141,asm:49,palette:41,animation:144,colors:potPalettes[41]}
  ]
},{
  key:'pods',name:'Toothy sewer pods',gfx:110,
  groups:[{asm:75,size:0,art:'sewer-pod',...rasterActorGeometry['sewer-pods']}],
  actors:[
    ['thorn-pod','Thorn Pod',41,101],['sewer-pod','Sewer Pod',42,100]
  ].map(([key,name,enemy,palette])=>({key,name,short:name,enemy,asm:75,palette,animation:80,colors:sewerPalettes[palette]}))
},{
  key:'water-imps',name:'Water imps',gfx:93,
  groups:[{asm:52,size:0,art:'drain-imp',...rasterActorGeometry['drain-imps']}],
  actors:[
    ['drain-imp','Drain Imp',99,43],['river-imp','River Imp',101,42]
  ].map(([key,name,enemy,palette])=>({key,name,short:name,enemy,asm:52,palette,animation:37,colors:sewerPalettes[palette]}))
},{
  key:'lantern-bats',name:'Enchanted lantern bats',gfx:104,
  groups:[{asm:67,size:64,art:'lantern-bat',...rasterActorGeometry['lantern-bats']}],
  actors:[
    ['lantern-bat','Lantern Bat',82,80],['bog-bat','Bog Bat',83,81],
    ['ember-bat','Ember Bat',213,82],['frost-bat','Frost Bat',214,83]
  ].map(([key,name,enemy,palette])=>({key,name,short:name,enemy,asm:67,palette,animation:79,colors:sewerPalettes[palette]}))
},{
  key:'sewer-trolls',name:'Sewer toll trolls',gfx:82,
  groups:[{asm:37,size:1,art:'sewer-troll',...rasterActorGeometry['sewer-troll']}],
  actors:[
    ['sir-sludge','Sir Sludge',4,21],['bog-baron','Bog Baron',238,22]
  ].map(([key,name,enemy,palette])=>({key,name,short:name,enemy,asm:37,palette,animation:29,colors:sewerPalettes[palette]}))
},{
  key:'frog-guards',name:'Frog guards and squires',gfx:98,
  groups:[{asm:57,size:0,art:'frog-guards',...rasterActorGeometry['frog-guards']}],
  // Enemy 224 has already moved to Guy Fieri's private bank, assembly and
  // palette. The family builder verifies the earlier emitted header write.
  actors:[
    ['pond-page','Pond Page',76,56,84],['bog-squire','Bog Squire',77,55,94],
    ['mire-squire','Mire Squire',78,55,94],['frog-guard','Frog Guard',79,54,84],
    ['rain-squire','Rain Squire',145,55,94]
  ].map(([key,name,enemy,palette,animation])=>({key,name,short:name,enemy,asm:57,palette,animation,colors:sewerPalettes[palette]}))
}];
export const futureWildlife=wildlifeFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
// Generic wildlife uses stock CT art. Named sewer characters and guards keep
// their substantially different custom designs.
// Every wildlife family keeps stock art, including Krawlie (Sir Sludge) and
// the sewer frogs. Sir Sludge and the Bog Baron keep their battle names.
export const stockWildlifeFamilyKeys=new Set(['rats','residues','briars','golems','pots','beetles','pods','water-imps','lantern-bats','sewer-trolls','frog-guards']);
export const customWildlifeFamilies=wildlifeFamilies.filter(f=>!stockWildlifeFamilyKeys.has(f.key));
export const customFutureWildlife=customWildlifeFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
