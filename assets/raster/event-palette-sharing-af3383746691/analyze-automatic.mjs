import fs from 'node:fs';
import path from 'node:path';
const dir=import.meta.dirname,read=f=>JSON.parse(fs.readFileSync(path.join(dir,f))),h=read('headers.json');
const maps=Object.fromEntries(Object.entries(h.headers).map(([k,v])=>[k,new Map(v.map(x=>[x.kind+':'+x.id,x]))]));
const old=new Map(read('private/scene-loads-original.json').scenes.map(s=>[s.location,s]));
const lookups=fs.readFileSync(path.resolve(dir,'../../../.local/reference/temporal-redux/sourcefiles/editorui/lookups.py'),'utf8'),names=new Map([...lookups.matchAll(/\(0x([0-9a-f]+),\s*"([^"]+)"\)/gi)].map(m=>[parseInt(m[1],16),m[2]]));
const reports=[];
for(const s of read('private/scene-loads-current.json').scenes){
  if(s.location===80)continue;
  const actors=s.actors.map(a=>{
    const loads=a.loads.filter(c=>c.opcode!==0x80).map(c=>{
      const kind=c.opcode===0x82?'npc':c.opcode===0x83?'enemy':'pc',id=c.args[0],key=kind+':'+id,now=maps.current.get(key),was=maps.original.get(key);if(!now||!was)return null;
      return{offset:c.offset,opcode:c.opcode,kind,id,currentPalette:now.palette,currentPointer:now.palettePointer,currentHash:now.paletteSha256,originalPalette:was.palette,originalPointer:was.palettePointer,originalHash:was.paletteSha256,headerChanged:JSON.stringify(now.header)!==JSON.stringify(was.header),paletteChanged:now.paletteSha256!==was.paletteSha256,init:a.initPrefix.some(q=>q.offset===c.offset)};
    }).filter(Boolean);
    const pos=a.initPrefix.filter(c=>[0x8b,0x8d].includes(c.opcode)).map(c=>({offset:c.offset,xy:c.opcode===0x8b?c.args.map(v=>v*16):c.args.map(v=>v/16)}));
    return{object:a.object,loads,assignments:a.relevantCommands.filter(c=>c.opcode===0x33).map(c=>({offset:c.offset,row:c.args[0]&7})),positions:pos,hiddenInInit:a.initPrefix.some(c=>[0x91,0x7e].includes(c.opcode)),conditionalInit:a.initPrefix.some(c=>c.opcode>=0x12&&c.opcode<=0x30),priority:a.relevantCommands.filter(c=>c.opcode===0x8e).map(c=>({offset:c.offset,value:c.args[0]}))};
  }).filter(a=>a.loads.length);
  const groups=new Map();for(const a of actors)for(const l of a.loads)if(l.init){const g=groups.get(l.originalPointer)??[];g.push({object:a.object,...l,positions:a.positions,hiddenInInit:a.hiddenInInit,conditionalInit:a.conditionalInit,assignments:a.assignments});groups.set(l.originalPointer,g);}
  const splits=[...groups.values()].filter(g=>new Set(g.map(l=>l.object)).size>1&&new Set(g.map(l=>l.currentPointer)).size>1);
  if(!splits.length)continue;
  const init=actors.flatMap(a=>a.loads.filter(l=>l.init&&a.assignments.length===0).map(l=>({...l,object:a.object,hiddenInInit:a.hiddenInInit,positions:a.positions})));
  const oldCount=new Set(init.map(l=>l.originalPointer)).size,newCount=new Set(init.map(l=>l.currentPointer)).size;
  const near=[];for(const g of splits)for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++)if(g[i].object!==g[j].object&&g[i].currentPointer!==g[j].currentPointer)for(const a of g[i].positions)for(const b of g[j].positions)if(Math.abs(a.xy[0]-b.xy[0])<240&&Math.abs(a.xy[1]-b.xy[1])<208)near.push({objects:[g[i].object,g[j].object],positions:[a.xy,b.xy],hiddenInInit:[g[i].hiddenInInit,g[j].hiddenInInit]});
  reports.push({location:s.location,name:names.get(s.location),eventId:s.eventId,eventBytesIdenticalToOriginal:s.decodedSha256===old.get(s.location)?.decodedSha256,originalAutomaticPaletteUnion:oldCount,currentAutomaticPaletteUnion:newCount,nearbySplitPairs:near,splitGroups:splits,allActors:actors,priority:newCount>5&&near.some(p=>p.hiddenInInit.every(x=>!x))?'Potential crowded allocator pressure':'Shared source split without proved exhaustion',confidence:'Static init-branch union. Visibility, allocator reuse and mutual exclusion require original/current runtime comparison; not a confirmed collision.'});
}
reports.sort((a,b)=>(b.currentAutomaticPaletteUnion-b.originalAutomaticPaletteUnion)-(a.currentAutomaticPaletteUnion-a.originalAutomaticPaletteUnion));
fs.writeFileSync(path.join(dir,'automatic-splits.json'),JSON.stringify({scope:'Normal NPC/forced-PC/enemy palette sharing by source pointer; active-party opcode80 excluded. Only initial-prefix load options counted. Original pointer-sharing splits may consume additional automatic slots; union counts do not prove simultaneous visibility or exhaustion.',excludedLocations:[80],candidates:reports},null,2)+'\n');
for(const s of reports)console.log(JSON.stringify({location:s.location,name:s.name,unchanged:s.eventBytesIdenticalToOriginal,count:[s.originalAutomaticPaletteUnion,s.currentAutomaticPaletteUnion],near:s.nearbySplitPairs.length,groups:s.splitGroups.map(g=>g.map(l=>[l.object,l.kind+l.id,l.originalPalette,l.currentPalette,l.hiddenInInit]))}));
console.log(JSON.stringify({scenes:reports.length}));
