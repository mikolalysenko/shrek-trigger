// Reversible diagnostic entries. The original events construct each battle;
// no actor, battle, AI or victory state is changed after location entry.
export const endgameCheckpoints={
 'night-throne':{location:334,x:24,y:16,party:[0,1,2],story:188,d2:0,name:'Rumpel · throne confrontation'},
 'golem-twins':{location:414,x:8,y:22,party:[0,1,2],story:200,d2:0,name:'Wishworks Golems · original twins'},
 'blackbird-wing':{location:363,x:14,y:25,party:[1,2,3],story:207,d2:0,name:'Wishworks Boss · original retreat'},
 'dragon-deck':{location:377,x:7,y:25,party:[1,2,3],story:207,d2:7,name:'King Rumpel · Dragon deck'},
 godmother:{location:107,x:8,y:12,party:[0,1,2],name:'Fairy Godmother · giant transformation'},
 'cosmic-interior':{location:475,x:8,y:12,party:[0,1,2],name:'Cosmic Muffin · oven and Tyson reveal'}
};
export function seedEndgameCheckpoint(ram,key){
 const cfg=endgameCheckpoints[key];if(!cfg)throw Error('Unknown endgame checkpoint');
 ram.fill(128,0x2980,0x2989);ram.set(cfg.party,0x2980);ram.set([0,1,2,3,4,5,6].filter(id=>!cfg.party.includes(id)),0x2983);ram[0x29af]=254;
 if(cfg.story!==undefined){ram[0x10000]=cfg.story;ram[0x100d2]=cfg.d2;ram[0x100f8]&=127;ram[0x100ba]&=253;}
 if(key==='blackbird-wing'){ram[0x100af]|=7;ram[0x100ba]|=6;}
 if(key==='godmother')ram[0x101a8]=128;
}
