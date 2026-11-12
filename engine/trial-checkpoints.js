// Reversible development fixtures. Native events own all progression after
// the location change; none of these WRAM writes are part of the IPS patch.
export const trialCheckpoints={
  'trial-kind':{location:27,story:44,party:[0],evidence:[1,0]},
  'trial-selfish':{location:27,story:44,party:[0],evidence:[6,0x73]},
  'prison-cell':{location:71,story:45,party:[0]},
  'prison-office':{location:29,story:45,party:[0]},
  'prison-tank':{location:28,story:46,party:[0,2]},
  'castle-escape':{location:21,story:46,party:[0,2]},
  'forest-escape':{location:20,story:48,party:[0,2,1]}
};
export function seedTrialCheckpoint(ram,key){
  const c=trialCheckpoints[key];if(!c)throw Error('Unknown trial checkpoint');
  ram[0x10000]=c.story;ram.fill(0,0x10050,0x1005c);
  ram[0x10054]=c.evidence?.[0]??1;ram[0x10055]=c.evidence?.[1]??0;
  ram[0x10059]=c.story===44?0:16;
  ram[0x100a1]=3;ram[0x100a2]=0;ram[0x100a9]=2;
  ram[0x100ff]&=~16;ram[0x101ed]=0;
  ram.fill(0,0x10190,0x101a0);
  if(c.story!==44){ram[0x10190]=key==='prison-cell'?3:7;ram[0x10192]=16;ram[0x10197]=3;}
  if(key==='prison-office')ram[0x10198]=32;
  if(key==='castle-escape')ram[0x10199]=4;
  ram.fill(128,0x2980,0x2989);ram.set(c.party,0x2980);
  ram[0x29af]=c.party.reduce((mask,id)=>mask|(128>>id),0);
}
