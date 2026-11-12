import {rasterActorGeometry} from './generated-actor-geometry.js';

// The field guard and the two battle guards share the entire graphics bank.
// Both original ramps remain byte-identical, including the spectral recolor.
const colors={
 14:['212110','ffffff','d6d6b5','d6ad42','f7948c','a5a584','848463','8452de','c6635a','a5524a','5a5a39','393929'],
 15:['212110','ffffff','d6cec6','a573d6','a573d6','a5948c','84736b','844aad','844aad','6b318c','63524a','393929']
};
export const nativeGuardFamilies=[{
 key:'native-guards',name:'Duloc civic guards',gfx:78,
 groups:[{asm:33,size:0,art:'native-guard',...rasterActorGeometry['native-guard']}],
 actors:[
  {key:'duloc-civic-guard',name:'Duloc Guard',short:'Duloc Guard',enemy:49,npcs:[75],asm:33,palette:14,animation:25,colors:colors[14]},
  {key:'spectral-sentry',name:'Spectral Sentry',short:'Duloc Shade',enemy:50,asm:33,palette:15,animation:25,colors:colors[15]}
 ]
}];
export const nativeGuards=nativeGuardFamilies.flatMap(f=>f.actors.map(a=>({...f.groups.find(g=>g.asm===a.asm),gfx:f.gfx,...a})));
