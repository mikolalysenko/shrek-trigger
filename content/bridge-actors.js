import {rasterActorGeometry} from './generated-actor-geometry.js';
const boneColors=['24252b','fff1d2','dccda5','75d578','ad9773','806748','668958','584a3d','3f5745','38343a','cfa250','f4d77d'];
const echoColors=['262338','f2e9ff','cec6df','81d0ee','9c8fae','71647f','607e9d','51465e','3c506d','342e43','baa1d5','e0c9ee'];
// The guard ramp is shared with enemy 47. Keeping its exact source colors
// permits new artwork without recoloring that unrelated actor.
const guardColors={
 91:['212110','ffffff','e6d6b5','ff6b63','ad9c7b','e6bd63','c53a31','84734a','a57b3a','5a523a','9c1919','3a3a29'],
 92:['212110','ffffff','ded6bd','9c94ef','b59c7b','adb5ef','8c42f7','8c734a','7b7bc5','5a523a','7329bd','3a3a29'],
 93:['212110','ffffff','d6c5a5','e673de','9c84b5','ad7bff','a52994','735a73','8442b5','524252','840063','3a3a29'],
 94:['212110','ffffff','dee69c','e673de','b5ad52','ad7bff','a52994','847308','8442b5','5a523a','840063','3a3a29']
};
export const bridgeFamilies=[{
 key:'bone-warden-legs',name:'Bone Warden legs',gfx:170,
 groups:[{art:'warden-legs',asm:163,size:10,...rasterActorGeometry['warden-legs']}],
 actors:[
  {key:'bone-warden-legs',name:'Bone Warden legs',short:'Bone Warden',enemy:179,asm:163,palette:203,animation:127,colors:boneColors},
  {key:'warden-echo-legs',name:'Warden Echo legs',short:'Warden Echo',enemy:181,asm:163,size:42,palette:204,animation:127,colors:echoColors}
 ]
},{
 key:'bone-warden',name:'Bone Warden crown',gfx:171,
 groups:[{art:'warden',asm:164,size:193,...rasterActorGeometry.warden}],actors:[
  {key:'bone-warden',name:'Bone Warden crown',short:'Bone Crown',enemy:180,asm:164,palette:203,animation:128,colors:boneColors},
  {key:'warden-echo',name:'Warden Echo crown',short:'Echo Crown',enemy:182,asm:164,size:161,palette:204,animation:128,colors:echoColors}
 ]
},{
 key:'bone-guards',name:'Enchanted bone guards',gfx:108,
 groups:[{art:'bone-guard',asm:71,size:0,...rasterActorGeometry['bone-guards']}],actors:[
  {key:'faded-guard',name:'Faded Guard',short:'Faded Guard',enemy:43,asm:71,palette:93,animation:85,colors:guardColors[93]},
  {key:'moss-guard',name:'Moss Guard',short:'Moss Guard',enemy:44,asm:71,palette:94,animation:85,colors:guardColors[94]},
  {key:'bone-guard',name:'Bone Guard',short:'Bone Guard',enemy:45,asm:71,palette:92,animation:85,colors:guardColors[92]},
  {key:'ember-guard',name:'Ember Guard',short:'Ember Guard',enemy:46,asm:71,palette:91,animation:85,colors:guardColors[91]}
 ]
}];
export const bridgeActors=bridgeFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
// Zombor and the bridge skeletons are neither story characters nor Shrek
// references: stock art. The Bone Warden keeps its battle names.
export const stockBridgeFamilyKeys=new Set(['bone-warden-legs','bone-warden','bone-guards']);
export const customBridgeFamilies=bridgeFamilies.filter(f=>!stockBridgeFamilyKeys.has(f.key));
export const customBridgeActors=customBridgeFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
