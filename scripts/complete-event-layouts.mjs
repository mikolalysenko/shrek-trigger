import {readFile,writeFile} from 'node:fs/promises';
import {validateRom,u16} from '../engine/rom.js';
import {sourceDialogueEvents,sourceDialogueStrings} from '../content/dialogue-ownership.js';
import {sourceDictionary,sourceHasLetters} from '../engine/source-dialogue.js';

// Complete the location/event inventory without embedding source prose. Every
// added location has at least one verbal source string outside the old audit.
const base=await validateRom(await readFile('.local/chrono-trigger-usa.sfc'));
const path='content/event-layouts.json',layouts=JSON.parse(await readFile(path,'utf8'));
const dictionary=sourceDictionary(base),byEvent=new Map(sourceDialogueEvents.map(e=>[e[0],e])),locations=new Set(layouts.map(l=>l.location));
const added=[];
for(let location=0;location<512;location++){
  if(locations.has(location))continue;
  const eventId=u16(base,0x360008+location*14),source=byEvent.get(eventId);if(!source)continue;
  const tableBases=source[2].map(([,address])=>address),owned=sourceDialogueStrings.filter(([, ,owners])=>owners.includes(eventId));
  if(!owned.some(([address,length])=>sourceHasLetters(base.subarray(address,address+length),dictionary)))continue;
  const strings=owned.map(([address,capacity,,pointers])=>{
    const table=tableBases.find(t=>pointers.some(p=>p>=t&&p<t+512&&(p-t)%2===0));
    const pointer=table===undefined?undefined:pointers.find(p=>p>=table&&p<table+512&&(p-table)%2===0);
    if(pointer===undefined)throw Error(`No table pointer for event ${eventId} string ${address.toString(16)}`);
    const id=(pointer-table)/2;
    if(!Number.isInteger(id)||id<0||id>255)throw Error(`Invalid source string ID ${eventId}:${id}`);
    return{id,address,capacity};
  }).sort((a,b)=>a.id-b.id);
  const layout={location,eventId,eventPointer:source[1],tableCommands:source[2].map(([position])=>position),strings,storage:'extended'};
  layouts.push(layout);locations.add(location);added.push({location,eventId,strings:strings.length});
}
layouts.sort((a,b)=>a.location-b.location);
await writeFile(path,JSON.stringify(layouts,null,2)+'\n');
console.log(JSON.stringify({added:added.length,strings:added.reduce((n,x)=>n+x.strings,0),totalLayouts:layouts.length},null,2));
