import fs from 'node:fs';
import path from 'node:path';
const dir=import.meta.dirname,read=f=>JSON.parse(fs.readFileSync(path.join(dir,f)));
const headers=read('headers.json'),events=read('events-current.json'),oldEvents=read('events-original.json');
const maps=Object.fromEntries(Object.entries(headers.headers).map(([k,v])=>[k,new Map(v.map(h=>[h.kind+':'+h.id,h]))]));
const oldByLoc=new Map(oldEvents.scenes.map(s=>[s.location,s]));
const lookups=fs.readFileSync(path.resolve(dir,'../../../.local/reference/temporal-redux/sourcefiles/editorui/lookups.py'),'utf8');
const names=new Map([...lookups.matchAll(/\(0x([0-9a-f]+),\s*"([^"]+)"\)/gi)].map(m=>[parseInt(m[1],16),m[2]]));
const kind=op=>op===0x82?'npc':op===0x83?'enemy':'pc';
const shorthand={0x57:0,0x5c:1,0x62:2,0x68:4,0x6a:3,0x6c:5,0x6d:6};
const reports=[];
for(const s of events.scenes){
  if(s.location===80)continue;
  const actors=Array.from({length:s.objectCount},(_,object)=>{
    const cmds=s.commands.filter(c=>c.owners.some(o=>o.object===object));
    const loads=cmds.filter(c=>[0x80,0x81,0x82,0x83].includes(c.opcode)||c.opcode in shorthand).map(c=>{
      const id=shorthand[c.opcode]??c.args[0],key=kind(c.opcode)+':'+id,current=maps.current.get(key),original=maps.original.get(key);
      if(!current||!original)return null;
      return{offset:c.offset,opcode:c.opcode,kind:kind(c.opcode),id,functions:c.owners.filter(o=>o.object===object).map(o=>o.function),current:{header:current.header,palette:current.palette,pointer:current.palettePointer,sha256:current.paletteSha256,words:current.paletteWords},original:{header:original.header,palette:original.palette,pointer:original.palettePointer,sha256:original.paletteSha256,words:original.paletteWords},paletteChanged:current.paletteSha256!==original.paletteSha256};
    }).filter(Boolean);
    return{object,loads,assignments:cmds.filter(c=>c.opcode===0x33).map(c=>({offset:c.offset,row:c.args[0]&7,operand:c.args[0],functions:c.owners.filter(o=>o.object===object).map(o=>o.function)})),priority:cmds.filter(c=>c.opcode===0x8e).map(c=>({offset:c.offset,value:c.args[0],functions:c.owners.filter(o=>o.object===object).map(o=>o.function)})),drawControls:cmds.filter(c=>[0x7c,0x7d,0x7e,0x90,0x91].includes(c.opcode)).map(c=>({offset:c.offset,opcode:c.opcode,args:c.args,functions:c.owners.filter(o=>o.object===object).map(o=>o.function)})),positions:cmds.filter(c=>[0x8b,0x8d].includes(c.opcode)).map(c=>({offset:c.offset,opcode:c.opcode,args:c.args,functions:c.owners.filter(o=>o.object===object).map(o=>o.function)}))};
  });
  const candidates=[];
  for(let a=0;a<actors.length;a++)for(let b=a+1;b<actors.length;b++)for(const aa of actors[a].assignments)for(const bb of actors[b].assignments)if(aa.row===bb.row)for(const la of actors[a].loads)for(const lb of actors[b].loads){
    if(la.original.sha256!==lb.original.sha256||la.current.sha256===lb.current.sha256)continue;
    candidates.push({row:aa.row,objects:[a,b],assignments:[aa,bb],loads:[la,lb],bothInitializationAssignments:aa.functions.includes(0)&&bb.functions.includes(0),sameOriginalPalette:la.original.palette===lb.original.palette,distinctCurrentPalettes:[la.current.palette,lb.current.palette]});
  }
  if(candidates.length){
    const affected=new Set(candidates.flatMap(c=>c.objects));
    reports.push({location:s.location,name:names.get(s.location),eventId:s.eventId,eventPointer:s.offset,decodedSha256:s.decodedSha256,eventBytesIdenticalToOriginal:s.decodedSha256===oldByLoc.get(s.location)?.decodedSha256,parseError:s.error,actors:actors.filter(a=>affected.has(a.object)),pairs:candidates,confidence:'Static candidate only; branches, actor lifetime, automatic rows and actual visibility must be traced.'});
  }
}
const report={scope:'Every decoded explicit opcode33 assignment in504 current source packets; this detects different actors formerly using equal12-word source colors that now differ. Opcode8E is priority, never a palette assignment. Detailed parade80 is excluded. A static union is not a simultaneous visibility or runtime defect proof.',inputs:headers.inputs,scannedPaletteScenes:events.scenes.length,excludedLocations:[80],decodeErrors:events.errors,candidates:reports};
fs.writeFileSync(path.join(dir,'static-candidates.json'),JSON.stringify(report,null,2)+'\n');
for(const s of reports)console.log(JSON.stringify({location:s.location,name:s.name,event:s.eventId,unchanged:s.eventBytesIdenticalToOriginal,pairs:s.pairs.map(p=>({row:p.row,objects:p.objects,actors:p.loads.map(l=>l.kind+l.id),original:p.loads.map(l=>l.original.palette),current:p.distinctCurrentPalettes,init:p.bothInitializationAssignments}))}));
console.log(JSON.stringify({scenes:reports.length,pairs:reports.reduce((n,s)=>n+s.pairs.length,0)}));
