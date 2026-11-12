// Chapter fixtures only. These writes run before the diagnostic E0 transition;
// the cartridge's own events then control the scene and all progression.
export const futureCheckpoints={
  'future-arrival':{location:208,story:51,party:[0,1,2]},
  'future-scavengers':{location:212,story:52,party:[0,1,2]},
  'future-sewer-entrance':{location:236,story:52,party:[0,1,2]},
  'future-sewer':{location:237,story:52,party:[0,1,2]},
  'future-keeper':{location:219,story:53,party:[0,1,2]},
  'future-food':{location:344,story:53,party:[0,1,2]},
  'future-rat':{location:221,story:53,party:[0,1,2]},
  'future-passage-left':{location:216,story:53,party:[0,1,2]},
  'future-passage-right':{location:216,story:53,party:[0,1,2]},
  'future-archive':{location:218,story:53,party:[0,1,2]},
  'future-seeds':{location:214,story:54,party:[0,1,2]},
  'rivet-intro':{location:223,story:55,party:[0,1,2]},
  'rivet-race':{location:223,story:55,party:[0,1,2]},
  'rivet-no-boost':{location:223,story:55,party:[0,1,2]},
  'future-road':{location:224,story:55,party:[0,1,2]},
  'puppet-recruit':{location:226,story:55,party:[0,1,2]},
  'factory-entry':{location:228,story:60,party:[0,3,2],reserve:[1]},
  'factory-crane':{location:231,story:60,party:[0,3,2],reserve:[1]},
  'factory-conveyor':{location:232,story:60,party:[0,3,2],reserve:[1]},
  'factory-lab':{location:230,story:60,party:[0,3,2],reserve:[1]},
  'factory-lock':{location:235,story:60,party:[0,3,2],reserve:[1]},
  'factory-power':{location:235,story:60,party:[0,3,2],reserve:[1]},
  'puppet-brothers-donkey':{location:230,story:63,party:[0,3,2],reserve:[1]},
  'puppet-brothers-fiona':{location:230,story:63,party:[0,3,1],reserve:[2]},
  'puppet-repair':{location:226,story:66,party:[0,2],reserve:[1,3]}
};
export function seedFutureCheckpoint(ram,key){
  const c=futureCheckpoints[key];if(!c)throw Error('Unknown future checkpoint');
  ram[0x10000]=c.story;ram[0x1005b]=key==='future-arrival'?1:0;
  // Security bit 2, both crane bits 5/6, and lab-laser bit 0. The last
  // prerequisite also opens the route to the emergency escape ladder.
  ram[0x10058]=['factory-crane','factory-conveyor'].includes(key)?4:key==='factory-lab'?100:['factory-lock','factory-power'].includes(key)?101:0;
  ram[0x1005c]=['factory-lab','factory-lock','factory-power'].includes(key)?32:0;
  ram[0x101d0]=key==='factory-power'?1:0;
  ram[0x100a4]=['future-rat','future-passage-left','future-passage-right','future-archive','future-seeds'].includes(key)?1:0;
  ram[0x100a5]=key==='future-arrival'?0:1;
  ram[0x100ec]=key==='future-food'?1:key==='future-rat'?17:key.startsWith('future-passage')?97:0;ram[0x101ed]=0;ram[0x101f0]=0;
  if(key.startsWith('future-sewer')){
    ram[0x100ed]=0; // Replay both frog scenes and the toll keeper.
    ram[0x10070]&=~32; // Northern entrance's first imp ambush.
    ram[0x10011]&=~64; // Native treasure 134: the sword beside the bridge.
    for(let slot=0;slot<256;slot++)if(ram[0x2400+slot]===15){ram[0x2400+slot]=0;ram[0x2500+slot]=0;}
    // Preserve the earlier prisoner-rescue flag, which controls the diary.
  }
  ram.fill(0,0x10148,0x10160);
  if(key.startsWith('rivet-')||key==='future-road'){
    ram[0x10154]=key==='rivet-intro'?0:key==='future-road'?9:1;
    ram[0x10136]=key==='rivet-no-boost'?129:0;
    ram.fill(0,0x10130,0x10136);
    for(const id of(key==='rivet-no-boost'?[213,221]:[213])){
      let slot=ram.subarray(0x2400,0x2500).indexOf(id);
      if(slot<0)slot=ram.subarray(0x2400,0x2500).indexOf(0);
      if(slot<0)throw Error('No inventory slot for the race checkpoint');
      ram[0x2400+slot]=id;ram[0x2500+slot]=1;
    }
    if(key==='future-road'){
      // Native treasure record 120 is the recorder at Lab 32 (35,11).
      // Prepare an unopened chest and obtain its item only through play.
      ram[0x10010]&=~1;
      for(let slot=0;slot<256;slot++)if(ram[0x2400+slot]===221){ram[0x2400+slot]=0;ram[0x2500+slot]=0;}
    }
  }
  if(key==='puppet-recruit')ram[0x10150]=12; // Both workshop entrance fights cleared.
  if(key.startsWith('factory-')||key.startsWith('puppet-brothers')||key==='puppet-repair'){
    ram[0x10148]=15; // First repair's four native stages completed.
    ram[0x10150]=12|(key.endsWith('fiona')?2:1); // Companion waiting at the door.
  }
  ram.fill(128,0x2980,0x2989);ram.set(c.party,0x2980);
  if(c.reserve)ram.set(c.reserve,0x2983);
  ram[0x29af]=[...c.party,...(c.reserve??[])].reduce((mask,id)=>mask|(128>>id),0);
  if(key==='future-seeds'){
    let slot=ram.subarray(0x2400,0x2500).indexOf(212);
    if(slot<0)slot=ram.subarray(0x2400,0x2500).indexOf(0);
    if(slot<0)throw Error('No inventory slot for the seed checkpoint');
    ram[0x2400+slot]=212;ram[0x2500+slot]=1;
  }
}
