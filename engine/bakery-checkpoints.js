// Development seeds only. Every fight, choice, reward and later transition
// executes the cartridge's own script after entry.
export const bakeryCheckpoints={
 'bakery-arrival':{location:273,story:108,chapter:true,early:true,party:[0,1,2],gateKey:1,dreamstone:0},
 'bakery-feast':{location:280,story:111,chapter:true,early:true,party:[0,1,2],gateKey:1,dreamstone:0},
 'bakery-morning':{location:275,story:117,chapter:true,early:true,party:[0,1,2],gateKey:0,dreamstone:1},
 'bakery-forest':{location:282,story:120,chapter:true,first:true,party:[0,5,1],gateKey:0,dreamstone:1},
 'bakery-drakes':{location:295,story:142,returnVisit:true,party:[0,4,1]},
 'bakery-kiln':{location:289,story:123,first:true},
 'bakery-iron-kiln':{location:304,story:150},
 'bakery-furnace':{location:301,story:151,fireArmor:true},
 'buried-furnace':{location:197,story:203,late:true,fireArmor:true}
};
export function seedBakeryCheckpoint(ram,key){
 const c=bakeryCheckpoints[key];if(!c)throw Error('Unknown Bakery checkpoint');
 if(c.returnVisit){
  const available=[0,1,2,3,4];ram[0x10000]=c.story;ram.fill(128,0x2980,0x2989);
  ram.set([...c.party,...available.filter(id=>!c.party.includes(id))],0x2980);ram[0x29af]=248;ram[0x2769]=61;
  ram[0x10160]&=~16; // Native summit landing has not yet called the drakes.
  ram[0x101df]&=~4; // The summit event sets Mongo's party lock itself.
  return;
 }
 if(c.chapter){
  const available=c.early?[0,1,2,3]:[0,1,2,3,5];
  ram[0x10000]=c.story;ram.fill(128,0x2980,0x2989);ram.set([...c.party,...available.filter(id=>!c.party.includes(id))],0x2980);
  ram[0x29af]=available.reduce((n,id)=>n|(128>>id),0);
  // Alternate portal/ending arrivals must not replace the early chapter.
  // Preserve other persistent quest bits and restore everything on undo.
  ram[0x1005b]=0;ram[0x10057]&=~4;ram[0x10156]&=~1;
  if(ram[0x101aa]===2)ram[0x101aa]=0;
  for(const id of[215,220])for(let slot=0;slot<256;slot++)if(ram[0x2400+slot]===id){ram[0x2400+slot]=0;ram[0x2500+slot]=0;}
  for(const[id,count]of[[215,c.gateKey],[220,c.dreamstone]])if(count){
   const slot=ram.subarray(0x2400,0x2500).indexOf(0);if(slot<0)throw Error('Bakery checkpoint needs an inventory slot');
   ram[0x2400+slot]=id;ram[0x2500+slot]=count;
  }
  return;
 }
 const available=c.first?[0,1,2,3,5]:c.late?[0,1,2,3,4,5,6]:[0,1,2,3,4,5];
 ram[0x10000]=c.story;ram.fill(128,0x2980,0x2989);ram.set([0,5,1,...available.filter(id=>![0,5,1].includes(id))],0x2980);
 ram[0x29af]=available.reduce((n,id)=>n|(128>>id),0);ram[0x2769]=c.first?59:c.late?66:61;
 // These two diagnostic encounters use Ruby Rhubarb Armor's existing Fire resistance.
 // Boss HP, AI, damage and the ordinary campaign loadout remain cartridge-owned.
 if(c.fireArmor)for(const id of available)ram[0x2600+id*80+0x28]=110;
 if(c.first){
  // Gingy's theft has already removed the Gate Key. The first Kilnback
  // victory awards it once through the original CA instruction.
  for(let slot=0;slot<256;slot++)if(ram[0x2400+slot]===215){ram[0x2400+slot]=0;ram[0x2500+slot]=0;}
 }
 if(key==='bakery-iron-kiln')ram[0x100ee]&=~1;
 if(key==='bakery-furnace'){ram[0x100ee]|=8;ram[0x100ec]&=~128;}
 if(c.late)ram[0x101d2]&=~64;
}
