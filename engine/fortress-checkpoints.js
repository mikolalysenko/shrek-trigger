// Only development starting conditions; all later choreography and combat are
// native. The early party carries the first Carnival Hatchet (weapon 61).
export const fortressCheckpoints={
 'fortress-knight':{location:169,story:118},
 'fortress-moth':{location:173,story:118},
 'hideout-moth':{location:183,story:203,late:true},
 'hideout-knight':{location:184,story:203,late:true},
 'hideout-route':{location:177,story:203,late:true,hideout:0},
 'hideout-trap':{location:179,story:203,late:true,hideout:15},
 'hideout-finale':{location:181,story:203,late:true,hideout:127},
 'hideout-cat':{location:181,story:203,late:true,hideout:127,cat:true},
 'fortress-ritual':{location:172,story:118,ritual:true}
};
export function seedFortressCheckpoint(ram,key){
 const c=fortressCheckpoints[key];if(!c)throw Error('Unknown fortress checkpoint');
 ram[0x10000]=c.story;ram.fill(128,0x2980,0x2989);ram.set(c.late?[0,4,1,2,3,5,6]:[0,4,1,2,3],0x2980);ram[0x29af]=c.late?254:248;ram[0x2769]=c.late?66:61;
 if(c.late){
  if(c.hideout===undefined){ram[0x101a1]&=~(key==='hideout-moth'?4:8);return;}
  // A1's eight bits are this quest's scene milestones. Other bytes contain
  // unrelated quests, so preserve all but the verified floor/reward bits.
  ram[0x101a1]=c.hideout;ram[0x101a0]=(ram[0x101a0]&127)|(c.cat?128:0);ram[0x1009c]&=~16;ram[0x101f4]&=~32;
  ram[0x101a4]&=~64;ram[0x1000b]&=15;ram[0x1000c]&=~3;
  return;
 }
 ram[0x100a3]=(ram[0x100a3]&129)|(c.ritual?126:2);ram[0x100df]&=~1;ram[0x10057]&=~4;
 if(key==='fortress-knight')ram[0x100ae]&=~12;
 if(key==='fortress-moth')ram[0x100d5]&=~1;
 if(c.ritual)ram[0x100e0]=0;
}
