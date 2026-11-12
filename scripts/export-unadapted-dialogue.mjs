import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {validateRom,u16} from '../engine/rom.js';
import {decodeSourceDialogue} from '../engine/source-dialogue.js';
import {dialogue} from '../content/dialogue.js';

// Private authoring aid. The extracted original prose never enters dist or git.
const base=await validateRom(await readFile('.local/chrono-trigger-usa.sfc'));
const layouts=JSON.parse(await readFile('content/event-layouts.json','utf8'));
const out='.local/dialogue-sources';await mkdir(out,{recursive:true});
const manifest=[];
for(const layout of layouts){
  if(dialogue[layout.location])continue;
  const strings={};for(const s of layout.strings)strings[s.id]=decodeSourceDialogue(base,s.address);
  if(!Object.keys(strings).length)continue;
  const file=`${out}/${layout.location}.json`;
  await writeFile(file,JSON.stringify({location:layout.location,eventId:layout.eventId,eventIdAtLocation:u16(base,0x360008+layout.location*14),strings},null,2)+'\n');
  manifest.push({location:layout.location,eventId:layout.eventId,strings:Object.keys(strings).length,file});
}
await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(`Exported ${manifest.length} private source-dialogue reports to ${out}/`);
