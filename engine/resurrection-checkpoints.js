// Diagnostic setup only. After the native location transition the cartridge
// handles every choice, eating animation, reward and saved quest flag.
export const resurrectionCheckpoints={
  'resurrection-memorial':{location:464,story:0xcb,party:[1,2,3]},
  'resurrection-eggs':{location:464,story:0xcb,party:[1,2,3]}
};
export function seedResurrectionCheckpoint(ram,key){
  const c=resurrectionCheckpoints[key];if(!c)throw Error('Unknown resurrection checkpoint');
  ram[0x10000]=c.story;ram[0x1005b]=0;
  ram[0x100ab]=(ram[0x100ab]|0x40)&~0x20; // Farquaad available; Shrek still lost.
  ram[0x100d8]=(ram[0x100d8]&~7)|(key==='resurrection-eggs'?5:0);
  ram[0x100cf]&=~0x40;ram[0x100cd]&=~4;ram[0x100db]&=~4;
  ram[0x101ed]=key==='resurrection-eggs'?1:0;
  ram.fill(128,0x2980,0x2989);ram.set([...c.party,4,5,6],0x2980);ram[0x29af]=0x7e;
  for(let i=0;i<256;i++)if(ram[0x2400+i]===217){ram[0x2400+i]=0;ram[0x2500+i]=0;}
}
