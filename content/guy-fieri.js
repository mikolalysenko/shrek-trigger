// The original level thresholds, magic rules and rewards stay in the native event.
export const guyFieriTiers=[{"id":224,"asm":232,"palette":7,"frames":26,"width":32,"height":32,"size":0,"name":"Starter lesson","level":1},{"id":225,"asm":233,"palette":10,"frames":15,"width":32,"height":32,"size":0,"name":"Diner lesson","level":10},{"id":226,"asm":234,"palette":11,"frames":27,"width":32,"height":32,"size":0,"name":"Grill master lesson","level":20},{"id":227,"asm":235,"palette":12,"frames":21,"width":32,"height":64,"size":1,"name":"Flame lesson","level":30},{"id":228,"asm":236,"palette":251,"frames":20,"width":48,"height":64,"size":2,"name":"Blue inferno lesson","level":40},{"id":229,"asm":237,"palette":250,"frames":24,"width":32,"height":32,"size":0,"name":"Flavortown master lesson","level":99}];
const palettes=[
  // Classic flame shirt: the generated source art uses this exact palette.
  ["121319","a35d38","da9365","ffc38b","ffe4a5","d14316","ff9b24","303039","f6f0d7","66656b","bf8730","a7afb6"],
  // Diner blue: cyan shirt flames, cool steel and matching unarmed sparks.
  ["121319","a35d38","da9365","ffc38b","ffe4a5","17628c","20b8c7","252b3c","eef8f4","587180","bf8730","a7d5db"],
  // Grill master: crimson coals, golden flamework and warm polished steel.
  ["121319","a35d38","da9365","ffc38b","ffe4a5","a92832","ffbd3c","33262c","fff0d2","78515b","c7852e","d9c6a5"],
  // Flame mantle: the hottest orange fire and a brighter golden hair glow.
  ["121319","a35d38","da9365","ffc38b","fff0a8","e13b16","ffb21c","382526","fff6d6","79514c","d89a32","d7c2a4"],
  // Blue inferno: a cyan-white fire core, cobalt flame shadows and pale hair.
  ["121319","9d6044","d69a75","ffd0a0","d9fbff","3839a8","24c6e8","202a48","f4ffff","4e6384","9470d8","b9e8f0"],
  // Flavortown master: royal purple, gold flamework and golden utensils.
  ["121319","a35d38","da9365","ffc38b","fff6b0","713a9b","ffd02f","382044","fff8d8","765483","e0a02c","ffe28a"]
];
export const guyFieriColors=tier=>palettes[tier].slice();
export const guyFieriActors=guyFieriTiers.map((t,tier)=>({...t,key:"guy-fieri-"+tier,name:"Guy Fieri · "+t.name,enemy:t.id,gfx:252,art:"guy-fieri",previewAnimation:0}));
