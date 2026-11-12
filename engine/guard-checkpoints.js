// Reversible scene entry only. Original proximity, AI and victory events
// remain responsible for the encounter after the map has loaded.
export const guardCheckpoints={
 'ruins-sentries':{location:66,x:8,y:28,story:220,name:'Duloc Shades · Moaning Ruins'},
 'forest-pages':{location:140,x:7,y:16,story:0,name:'Pond Pages · original forest ambush'},
 'desert-baron':{location:160,x:18,y:11,story:220,name:'Bog Baron · original desert encounter'}
};
export function seedGuardCheckpoint(ram,key){
 const c=guardCheckpoints[key];if(!c)throw Error('Unknown guard checkpoint');
 ram[0x10000]=c.story;ram.fill(128,0x2980,0x2989);ram.set([0,1,2,3,4,5,6],0x2980);ram[0x29af]=254;
 if(key==='ruins-sentries')for(const p of[0x1019f,0x101a3,0x101ac])ram[p]=0;
 if(key==='desert-baron')ram[0x101ad]=0;
}
