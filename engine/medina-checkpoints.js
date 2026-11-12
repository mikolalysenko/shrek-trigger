import {put24} from './rom.js';

// Reversible workshop fixtures. All scene logic, prices, combat, healing and
// travel after the transition remain owned by the cartridge.
export const medinaCheckpoints={
 'medina-arrival':{location:36,story:77,party:[0,1,2]},
 'medina-inn':{location:35,story:78,party:[0,1,2]},
 'medina-market':{location:39,story:78,party:[0,1,2]},
 'medina-peaceful-inn':{location:35,story:203,party:[0,1,2],peaceful:true},
 'medina-peaceful-market':{location:39,story:203,party:[0,1,2],peaceful:true},
 'medina-cave':{location:47,story:78,party:[0,1,2]},
 'medina-pyramid':{location:42,story:171,party:[0,1,2],pyramid:true}
};
export function seedMedinaCheckpoint(ram,key){
 const c=medinaCheckpoints[key];if(!c)throw Error('Unknown Medina checkpoint');
 if(c.pyramid){
  ram[0x10000]=c.story;ram[0x1019c]&=~4;ram[0x101a0]&=~1;
  ram.fill(128,0x2980,0x2989);ram.set([0,1,2,3,4,5,6],0x2980);ram[0x29af]=254;
  for(let i=0;i<256;i++)if([83,138].includes(ram[0x2400+i])){ram[0x2400+i]=0;ram[0x2500+i]=0;}
  return;
 }
 ram[0x10000]=c.story;ram[0x1005b]=key==='medina-arrival'?1:0;
 ram[0x101a1]=(ram[0x101a1]&~128)|(c.peaceful?128:0);
 ram[0x101a2]&=~23; // House welcome/meal and both local shop confrontations.
 if(key==='medina-arrival'){
  ram[0x101aa]=0;ram[0x100db]=0;ram[0x10199]&=~128;ram[0x1019c]&=~35;
 }
 if(key==='medina-cave'){
  ram[0x101ae]=0;ram[0x101a3]&=~2;ram[0x101f0]&=~1;
 }
 ram.fill(128,0x2980,0x2989);ram.set(c.party,0x2980);ram[0x2983]=3;ram[0x29af]=240;
 put24(ram,0x2c53,100000); // Enough to inspect the native variable-price shop.
}
