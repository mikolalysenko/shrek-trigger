import {seedMedinaCheckpoint} from './medina-checkpoints.js';

// Reversible entries to ordinary scene programs. No scene flag is marked
// complete; interactions and battles still run through the cartridge.
export const townsfolkCheckpoints={
 'keeper-market':{location:54,x:38,y:44,facing:0,story:0,entryFrames:500,name:'Townkeeper · present market'},
 'keeper-old-market':{location:118,x:56,y:10,facing:0,story:0,entryFrames:500,name:'Townkeeper · medieval market'},
 'keeper-old-inn':{location:156,x:28,y:29,facing:0,story:0,entryFrames:500,name:'Townkeeper · medieval inn'},
 'keeper-dream':{location:338,x:10,y:12,facing:0,story:0,entryFrames:500,name:'Townkeeper · Dream Project home'},
 'woodland-mountain':{location:274,x:7,y:59,story:0,entryFrames:450,name:'Woodland Sprites · mountain battle'},
 'woodland-tavern':{location:53,x:43,y:56,story:0,entryFrames:450,name:'Woodland Sprite · tavern dance'},
 'resident-inn':{location:12,x:54,y:13,facing:0,story:0,entryFrames:500,gfx:125,frames:20,object:10,dialogues:[79,80,81,82],name:'Town resident · Truce inn'},
 'resident-merchant-inn':{location:62,x:3,y:26,facing:0,story:0,entryFrames:500,gfx:125,frames:20,object:12,dialogues:[56],name:'Town resident · Choras inn'},
 'resident-marco':{location:158,x:60,y:56,facing:0,story:0,entryFrames:500,gfx:125,frames:20,object:9,dialogues:[106,107,108,109,110],name:'Town resident · returned husband'},
 'resident-dream':{location:379,x:33,y:19,facing:0,story:0,entryFrames:500,gfx:125,frames:20,object:10,dialogues:[35],name:'Town resident · Dream Project'},
 'resident-parade':{location:80,x:10,y:33,facing:2,story:200,entryFrames:1100,gfx:125,frames:20,object:35,dialogues:[56],name:'Town resident · post-parade'},
 'tradesman-hammer':{location:115,x:21,y:9,facing:0,story:50,entryFrames:500,gfx:35,frames:31,object:9,observeFrames:600,expectedPoses:[16,17],name:'Tradesman · smithy hammer'},
 'tradesman-drink':{location:115,x:23,y:9,facing:0,story:100,entryFrames:500,gfx:35,frames:31,object:9,observeFrames:6000,stopWhenPoses:true,expectedPoses:[24,25],name:'Tradesman · smithy drink'},
 'tradesman-inn':{location:62,x:13,y:27,facing:0,story:200,entryFrames:500,gfx:35,frames:31,object:11,observeFrames:600,expectedPoses:[18,19],name:'Tradesman · Choras patron'},
 // The Telepod presenter and the parade's lemonade drinker are the Blind Mouse, in bank
 // 249 with the tradesman's animation program (content/donkey-family.js).
 'tradesman-telepod':{location:8,x:7,y:9,facing:0,story:10,entryFrames:500,gfx:249,frames:31,object:10,observeFrames:800,name:'Blind Mouse · Telepod exhibit'},
 'tradesman-hero':{location:38,x:32,y:29,facing:0,story:200,entryFrames:100,gfx:35,frames:31,object:15,observeFrames:1700,expectedPoses:[30],expectedLocations:[38,37,60],finalLocation:60,name:'Tradesman · hero ending staging'},
 'parade-center':{location:80,x:20,y:32,facing:0,story:200,entryFrames:1100,gfx:249,frames:31,observeFrames:300,name:'Parade · the Muffin Man'},
 'parade-east':{location:80,x:26,y:30,facing:0,story:200,entryFrames:1100,gfx:249,frames:31,observeFrames:300,name:'Parade · east crowd'},
 'parade-granny-hidden':{location:80,x:20,y:32,facing:0,story:200,entryFrames:1100,gfx:249,frames:31,observeFrames:300,name:'Parade · alternate crowd branch'},
 'keeper-fair':{location:5,x:28,y:32,facing:0,story:5,entryFrames:1500,gfx:11,frames:19,name:'Townkeeper · fair crowd'},
 'keeper-fair-west':{location:5,x:16,y:40,facing:0,story:5,entryFrames:450,gfx:11,frames:19,object:24,name:'Townkeeper · west fair stall'},
 'keeper-fair-south':{location:5,x:5,y:36,facing:0,story:5,entryFrames:450,gfx:11,frames:19,object:25,name:'Townkeeper · south fair stall'},
 'hobgoblin-cathedral':{location:201,x:21,y:23,facing:0,story:3,entryFrames:500,gfx:83,frames:37,name:'Hobgoblins · cathedral portrait ambush'},
 'hobgoblin-fortress':{location:170,x:39,y:54,facing:0,story:3,entryFrames:500,gfx:83,frames:37,name:'Hobgoblins · fortress guards'},
 'hobgoblin-square':{location:31,x:4,y:6,facing:0,story:203,entryFrames:500,gfx:83,frames:37,historicalSeed:'medina-peaceful-inn',name:'Hobgoblin · peaceful Medina square'},
 'hobgoblin-kitchen':{location:202,x:41,y:24,facing:0,story:3,entryFrames:500,gfx:83,frames:37,name:'Hobgoblin · cathedral kitchen'}
};
export function seedTownsfolkCheckpoint(ram,key){
 const c=townsfolkCheckpoints[key];if(!c)throw Error('Unknown townsfolk checkpoint');
 ram[0x10000]=c.story;ram.fill(128,0x2980,0x2989);ram.set([0,1,2,3,4,5,6],0x2980);ram[0x29af]=254;
 if(key==='resident-marco')ram[0x100f7]|=2;
 if(c.location===80){ram[0x1006d]|=64;ram[0x10076]&=~4;if(key==='parade-granny-hidden')ram[0x10076]|=4;}
 if(key==='tradesman-hero')ram[0x101aa]=0;
 if(c.historicalSeed)seedMedinaCheckpoint(ram,c.historicalSeed);
}
