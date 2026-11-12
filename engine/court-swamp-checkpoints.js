// These reversible diagnostics enter original scenes. Their event programs,
// enemy formations and completion flags remain responsible for progression.
export const courtSwampCheckpoints={
 'imp-canyon':{location:112,x:13,y:27,story:3,entryFrames:450,name:'Swamp Imps · canyon encounter'},
 'imp-riders':{location:119,x:8,y:14,story:3,entryFrames:450,name:'Imp Riders · forest encounter'},
 'imp-worker':{location:33,x:11,y:9,story:3,entryFrames:450,name:'Swamp Imp · Medina worker'},
 'palace-piazza':{location:405,x:13,y:40,story:200,entryFrames:500,name:'Palace Hexer · piazza encounter'},
 'palace-lift':{location:410,x:8,y:12,story:200,entryFrames:500,name:'Palace Hexer · connected lift'},
 'palace-ending':{location:398,x:41,y:16,story:200,entryFrames:500,name:'Palace · ending montage segment'},
 'sergeant-sleep':{location:239,x:18,y:10,story:220,entryFrames:400,name:'Duloc Sergeant · sleeping shift'},
 'sergeant-jail':{location:341,x:4,y:18,story:220,entryFrames:400,name:'Duloc Sergeant · ending jail'},
 'sergeant-disaster':{location:476,x:8,y:10,story:220,entryFrames:400,name:'Duloc Sergeant · 1999 scene'}
};
export function seedCourtSwampCheckpoint(ram,key){
 const c=courtSwampCheckpoints[key];if(!c)throw Error('Unknown court/swamp checkpoint');
 ram[0x10000]=c.story;ram.fill(128,0x2980,0x2989);ram.set([0,1,2,3,4,5,6],0x2980);ram[0x29af]=254;
 if(key.startsWith('palace-')){ram[0x10162]=0;ram[0x10163]=0;ram[0x100f8]=key==='palace-ending'?128:0;}
}
