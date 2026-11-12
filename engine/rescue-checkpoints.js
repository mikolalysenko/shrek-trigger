// Development fixtures only. The IPS never imports this module. Seed a scene
// before the native ChangeLocation; afterward the cartridge owns progression.
export const rescueCheckpoints={
  'fiona-vanishes':{location:122,story:15,party:[0],courtFlags:0},
  'puss-joins':{location:129,story:18,party:[0,2],courtFlags:3},
  'queen-rescue':{location:198,story:26,party:[0,2,4],courtFlags:3},
  'fiona-returns':{location:122,story:28,party:[0,2],courtFlags:7}
};
export function seedRescueCheckpoint(ram,key){
  const c=rescueCheckpoints[key];if(!c)throw Error('Unknown medieval rescue checkpoint');
  ram[0x10000]=c.story;ram[0x100a1]=c.courtFlags;ram[0x100a9]=2;
  ram[0x100ff]&=~16;ram[0x101ed]=0;
  ram.fill(128,0x2980,0x2989);ram.set(c.party,0x2980);
  ram[0x29af]=c.party.reduce((mask,id)=>mask|(128>>id),0);
}
