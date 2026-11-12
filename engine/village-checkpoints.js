import {u16,put16,put24} from './rom.js';

// Workshop fixtures only. Every purchase, quest update, rest and world exit
// after the initial E0 transition is executed by the native cartridge.
export const villageCheckpoints={
 'village-commission':{location:137,story:90},
 'village-inn':{location:138,story:90},
 'village-portrait':{location:136,story:90},
 'village-rowan':{location:138,story:90}
};
export function seedVillageCheckpoint(ram,key){
 const c=villageCheckpoints[key];if(!c)throw Error('Unknown village checkpoint');
 ram[0x10000]=c.story;ram.fill(128,0x2980,0x2989);ram.set([0,1,2,3],0x2980);ram[0x29af]=240;
 put24(ram,0x2c53,1000);
 if(key==='village-commission')ram[0x100f2]&=~3;
 if(key==='village-rowan')ram[0x100f2]=(ram[0x100f2]&~3)|1;
 if(key==='village-portrait'){ram[0x100fe]|=2;ram[0x100f6]&=~2;}
 if(key==='village-inn')for(const id of[0,1,2]){
  const p=0x2600+id*80;put16(ram,p+3,Math.min(500,u16(ram,p+5)));put16(ram,p+7,Math.min(1,u16(ram,p+9)));
 }
}
