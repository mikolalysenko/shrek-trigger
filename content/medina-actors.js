import {largeActorFrames,cragGeometry} from './large-actor-frames.js';
const hornerColors=['282333','845060','c77b87','eea6a1','ffd0b7','3b304f','695080','a17caf','292e40','4277a0','8abbd1','f6efdb'];
const cragColors=['232b30','3d4852','63737d','93a5a5','c7d0b5','2c4338','4e7350','91ac67','3b3547','736883','d2aa57','f6e9b9'];
const echoColors=['292636','443c53','73617c','a18a9c','d5b8bf','384157','586b86','94a7b5','4b3540','925e71','ddb060','ffedc9'];

export const medinaFamilies=[{
 key:'horner',name:'Jack Horner',gfx:155,
 groups:[{art:'horner',asm:148,size:1,...largeActorFrames.horner}],
 actors:[
  {key:'jack-horner',name:'Jack Horner',short:'Jack Horner',enemy:166,asm:148,palette:196,animation:118,colors:hornerColors},
  {key:'horner-fort',name:'Jack Horner (hideout)',short:'Jack Horner',enemy:167,asm:148,palette:196,animation:161,colors:hornerColors},
  {key:'big-jack',name:'Big Jack Horner',short:'Big Jack',enemy:168,asm:148,palette:196,animation:118,colors:hornerColors}
 ]
},{
 key:'crag-keeper',name:'Crag Keeper',gfx:140,
 groups:[cragGeometry],
 actors:[
  {key:'crag-keeper',name:'Crag Keeper',short:'Crag Keeper',enemy:169,asm:134,palette:188,animation:102,colors:cragColors},
  {key:'crag-echo',name:'Crag Echo',short:'Crag Echo',enemy:200,asm:134,palette:189,animation:102,colors:echoColors}
 ]
}];
export const medinaActors=medinaFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
// Heckran is a route boss, not a story character or Shrek reference: stock
// art. The Crag Keeper keeps its battle names. Jack Horner stays custom.
export const stockMedinaFamilyKeys=new Set(['crag-keeper']);
export const customMedinaFamilies=medinaFamilies.filter(f=>!stockMedinaFamilyKeys.has(f.key));
export const customMedinaActors=customMedinaFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
