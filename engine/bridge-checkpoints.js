// Workshop-only starting conditions. The native cartridge consumes the food,
// awards the captain's gift, runs combat and advances every subsequent flag.
export const bridgeCheckpoints={
 'bridge-request':{location:135,story:84},
 'bridge-chef':{location:123,story:84,chef:true},
 'bridge-supplies':{location:135,story:86,supplies:true},
 'bridge-battle':{location:135,story:87}
};
export function seedBridgeCheckpoint(ram,key){
 const c=bridgeCheckpoints[key];if(!c)throw Error('Unknown bridge checkpoint');
 if(c.supplies&&!ram.subarray(0x2400,0x2500).some(id=>id===0||id===219))throw Error('Bridge supplies need one inventory slot');
 ram[0x10000]=c.story;ram[0x100a9]=(ram[0x100a9]&~20)|(c.story>=86?16:0);
 ram[0x1019a]&=~7;ram[0x10057]&=~6;
 ram.fill(128,0x2980,0x2989);ram.set([0,1,2,3],0x2980);ram[0x29af]=240;
 if(c.chef){ram[0x100a9]=(ram[0x100a9]&~28)|6;ram[0x100a0]&=~16;}
 for(let i=0;i<256;i++)if(ram[0x2400+i]===219){ram[0x2400+i]=0;ram[0x2500+i]=0;}
 if(c.supplies){const slot=ram.subarray(0x2400,0x2500).indexOf(0);if(slot<0)throw Error('Bridge supplies need one inventory slot');ram[0x2400+slot]=219;ram[0x2500+slot]=1;}
}
