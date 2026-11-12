import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {frameAssignments,sprite,paletteBytes,makeCharacterRecords,snesColor} from '../../../../engine/sprites.js';
import {generatedRasterArt} from '../../../../engine/generated-raster-art.js';
import {validateRom,u16,u24,fileOffset} from '../../../../engine/rom.js';
import {decompress} from '../../../../engine/compression.js';

const dir=import.meta.dirname,root=path.resolve(dir,'../../../..');
process.chdir(root);
const json=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const write=(name,data)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(data,null,2)+'\n');
const base=await validateRom(fs.readFileSync('.local/chrono-trigger-usa.sfc'));
const sourceSpec=json('assets/raster/shrek/import-spec.json'),actor=generatedRasterArt.shrek;
const gaps=json('assets/raster/shrek/acting-review/remaining-acting-gaps.json').remaining;
const gapIds=new Set(gaps.map(g=>g.frame)),mapping=frameAssignments(base,0),built=makeCharacterRecords(base,0,{allowGrowth:true});
assert.deepEqual(built.audit.semanticCoverage.remaining.map(g=>g.frame),gaps.map(g=>g.frame));
assert.deepEqual(built.audit.semanticCoverage.counts,{source:60,adapted:158,fallback:27,blank:3});
fs.mkdirSync(path.join(dir,'source-crops'),{recursive:true});
fs.mkdirSync(path.join(dir,'native'),{recursive:true});
const rgb=c=>[0,5,10].map(s=>{const v=c>>s&31;return v<<3|v>>2;});
const activePalette=[[0,0,0],...actor.palette.map(c=>rgb(snesColor(c)))];
const originalPaletteOffset=0x240000+u16(base,0x242a00);
// Indices13–15 belong to the original weapon/effect palette. Diagnostic magenta
// identifies them instead of inventing a color or reading the next actor's ramp.
const originalPalette=[[0,0,0],...Array.from({length:12},(_,i)=>rgb(u16(base,originalPaletteOffset+i*2))),[255,0,255],[255,127,255],[255,223,255]];
function image(pixels,width,height,palette){const out=new PNG({width,height});pixels.forEach((v,i)=>{if(v)out.data.set([...palette[v],255],i*4);});return PNG.sync.write(out);}
const gfx=fileOffset(u24(base,0x242000));
function original(frame){const pixels=new Uint8Array(320*320),a=mapping.assembly+frame*40;let dynamicColorPixels=0;const cells=[];
 for(let c=0;c<4;c++){const ox=(base[a+32+c*2]<<24)>>24,oy=(base[a+33+c*2]<<24)>>24;cells.push([ox,oy]);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const t=u16(base,a+(y>>3)*16+c*4+(x>>3)*2),xx=t&0x4000?7-(x&7):x&7;let v=0;
   for(let k=0;k<4;k++)v|=(base[gfx+(t&2047)*32+(k>>1)*16+(y&7)*2+(k&1)]>>(7-xx)&1)<<k;
   const X=160+ox+x,Y=160+oy+y;assert.ok(X>=0&&X<320&&Y>=0&&Y<320);if(v){if(v>12)dynamicColorPixels++;pixels[Y*320+X]=v;}
  }
 }
 const pts=[...pixels].flatMap((v,i)=>v?[[i%320-160,Math.floor(i/320)-160]]:[]),bounds=pts.length?[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))]:[0,0,0,0];
 const width=bounds[2]-bounds[0]+1,height=bounds[3]-bounds[1]+1,crop=new Uint8Array(width*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++)crop[y*width+x]=pixels[(bounds[1]+160+y)*320+bounds[0]+160+x];
 return{pixels,cells,bounds,dynamicColorPixels,crop,width,height};
}
const frames=mapping.map.map((m,frame)=>{const p=sprite(0,m.facing,m.pose,m.phase),originalFrame=original(frame);if(gapIds.has(frame)||[0,221,222,226,227,228,229,230,231].includes(frame)){
 fs.writeFileSync(path.join(dir,'native',`current-${frame}.png`),image(p,32,32,activePalette));
 fs.writeFileSync(path.join(dir,'native',`original-${frame}.png`),image(originalFrame.crop,originalFrame.width,originalFrame.height,originalPalette));
 }return{frame,...m,pixels:Array.from(p,v=>v.toString(16)).join(''),sha256:hash(p),original:{cells:originalFrame.cells,bounds:originalFrame.bounds,dynamicColorPixels:originalFrame.dynamicColorPixels,pixelsSha256:hash(originalFrame.pixels)}};});
write('baseline.json',{status:'Read-only snapshot of approved active Shrek, not a replacement specification',palette:actor.palette,paletteBytesSha256:hash(paletteBytes(0)),counts:built.audit.semanticCoverage.counts,gaps:gaps.map(g=>({...g,original:frames[g.frame].original})),frames,graphics:{bytes:built.records[0].bytes.length,sha256:hash(built.records[0].bytes)},assembly:{bytes:built.records[1].bytes.length,sha256:hash(built.records[1].bytes)},activeSpecSha256:hash(fs.readFileSync('assets/raster/shrek/import-spec.json')),nativeMapSha256:hash(Buffer.from(JSON.stringify(mapping.map))),notes:['Original diagnostic hashes preserve native cell coordinates on a320×320canvas around(160,160); review PNGs are tight crops without scaling. Magenta marks original weapon/effect indices13–15; it is not source artwork or a candidate palette.','Approved Shrek is32×32 with four16×16cells and12opaque colors. No active art, cell map, palette, animation, cartridge or frozen packet is written.']});

const choices={
 vsmile:{catalogue:'vsmile-components.json',ids:[3,8,9,20,26,35,56,57,61,71,73,107,108,109,110,111,113,114,123,124,125,126,148,149,150,151,152,161,167],reference:3,scaleX:1.2},
 mobile:{catalogue:'source-components.json',ids:[0,59,63,65,66,67,123,124,127,128,129,130,136,139,155,161,162,169,170,171,178,179,180,183,184],reference:0,scaleX:1},
 gba:{catalogue:'gba-components.json',ids:[0,58,59,60,61,62,65,66,67,69,70],reference:0,scaleX:1}
};
const crops=[];
for(const [key,choice] of Object.entries(choices)){
 const catalogue='assets/raster/shrek/acting-audit-remaining/catalogues/'+key+'.json',cat=json(catalogue),source=PNG.sync.read(fs.readFileSync(cat.file)),keys=new Set(cat.chromaKey.map(s=>parseInt(s,16))),selected=choice.ids.map(id=>cat.components.find(c=>c.id===id));
 const subdir=`assets/raster/shrek/acting-audit-remaining/${key}-preview`;fs.mkdirSync(subdir,{recursive:true});
 for(const c of selected){const [x,y,w,h]=c.bounds,p=new PNG({width:w,height:h});let count=0;
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const i=((y+yy)*source.width+x+xx)*4,j=(yy*w+xx)*4,value=source.data[i]<<16|source.data[i+1]<<8|source.data[i+2];if(source.data[i+3]&&!keys.has(value)){p.data.set(source.data.subarray(i,i+4),j);count++;}}
  const file=`source-crops/${key}-${c.id}.png`,bytes=PNG.sync.write(p);fs.writeFileSync(path.join(dir,file),bytes);crops.push({source:key,id:c.id,sourceFile:cat.file,sourceSha256:hash(fs.readFileSync(cat.file)),sourceCatalogue:catalogue,bounds:c.bounds,chromaKey:cat.chromaKey,operation:'Exact rectangular crop; only listed flat chroma-key pixels become transparent. No anatomy, colors or internal pixels are drawn.',file,pixels:count,sha256:hash(bytes)});
 }
 // Keep the same selected V.Smile sampling and normalize the two other whole
 // models by their standing reference, not by independently enlarging each pose.
 const overrides=key==='vsmile'?Object.fromEntries(selected.flatMap((c,i)=>sourceSpec.sheets[0].overrides?.[c.id]?[[i,sourceSpec.sheets[0].overrides[c.id]]]:[])):{};
 const spec={key:`shrek-acting-audit-${key}`,directory:subdir,width:32,height:32,sourceType:'user-supplied-game-sheet',palette:actor.palette,samplingPalette:sourceSpec.samplingPalette,sheets:[{file:cat.file,regions:selected.map(c=>c.bounds),chromaKey:cat.chromaKey,nativeHeight:key==='mobile'?25:30,scaleCells:[choice.ids.indexOf(choice.reference)],sample:key==='vsmile'?sourceSpec.sheets[0].sample:{method:'area',scaleX:choice.scaleX,bottom:31},overrides}],sequences:{native:{1:choice.ids.map((_,i)=>i)}},notes:['Inactive source feasibility only. Not registered, not approved for mixed-model use.','All source bodies remain whole, with only chroma removal and deterministic area sampling. Hardware palette is the existing Shrek twelve-color ramp.',...(key==='mobile'?['A uniform25px standing reference is needed to retain the99px extended handstand in the32px output. The30px reference would make that pose35px tall and is rejected. This smaller whole-model scale is an additional adoption limitation.']:[])]};
 write(`${key}-preview/import-spec.draft.json`,spec);
}
write('source-crops.json',{status:'Inactive whole-source candidates; none approved as a replacement',sources:Object.entries(choices).map(([key,c])=>({key,catalogue:'assets/raster/shrek/acting-audit-remaining/catalogues/'+key+'.json',ids:c.ids,standingScaleReference:c.reference})),crops,inspectedCatalogues:[{key:'vsmile',components:168},{key:'mobile',components:205,note:'Catalogue includes effects, editor remnants and palette cells; not205 usable drawings.'},{key:'gba',components:125}],noImageGeneration:true});

const anim=0x240000+u16(base,0x242600),animEnd=0x240000+u16(base,0x242602),stride=(animEnd-anim)/4,duration=0x240000+u16(base,0x242800),programs=[];
for(let facing=0;facing<4;facing++)for(let mode=0;mode<stride/4;mode++){const list=[];for(let i=mode*4;i<stride;i++){const frame=base[anim+facing*stride+i],ticks=base[duration+i];if(frame===255||!ticks)break;assert.ok(frame<mapping.count);list.push({frame,ticks,programIndex:i});}if(list.some(e=>gapIds.has(e.frame)))programs.push({facing,mode,list,period:list.reduce((n,e)=>n+e.ticks,0),gaps:[...new Set(list.filter(e=>gapIds.has(e.frame)).map(e=>e.frame))]});}
write('animation-audit.json',{animation:0,animationOffset:anim,durationOffset:duration,facingStride:stride,programSha256:hash(base.subarray(anim,animEnd)),durationSha256:hash(base.subarray(duration,duration+stride)),programs,notes:['Directions have separate frame lists but share ONE duration list. Never add facing*stride to the duration pointer.','Each mode begins at mode*4; the zero duration terminates a list, not an arbitrary four-entry bound.','This is a source-program audit. Runtime timing proof is reported separately.']});

const events=json('.local/reference/events.json'),names=fs.readFileSync('.local/reference/CTViewer/data/snes_na_scenes.txt','utf8').split(/\r?\n/),scenes=[],excluded=[];
for(const event of events){const eventId=u16(base,0x360008+event.location*14),eventPointer=fileOffset(u24(base,0x3cf9f0+eventId*3));assert.equal(eventPointer,event.eventPointer);
 let p;try{p=decompress(base,eventPointer).bytes;}catch(error){excluded.push({location:event.location,eventId,eventPointer,reason:error.message,referenceCommands:event.commands.length});continue;}
 const pointers=Array.from({length:p[0]*16},(_,i)=>u16(p,1+i*2)),ends=[...new Set([...pointers,p.length])].sort((a,b)=>a-b),objects=[];
 for(let object=0;object<p[0];object++){const functions=pointers.slice(object*16,(object+1)*16),starts=[...new Set(functions)],initStart=functions[0],initEnd=ends.find(n=>n>initStart);const loads=event.commands.filter(([at,op,args])=>at>=initStart&&at<initEnd&&(op===0x57||([0x80,0x81].includes(op)&&args[0]===0)));if(!loads.length)continue;
  const uses=[],functionRecords=[];for(const start of starts){const end=ends.find(n=>n>start),commands=event.commands.filter(([at])=>at>=start&&at<end),aliases=functions.flatMap((p,i)=>p===start?[i]:[]);functionRecords.push({start,end,aliases,commands});for(const [at,op,args] of commands){let hits=[],lists=[];
   if(op===0xac&&gapIds.has(args[0]))hits=[args[0]];
   if([0xaa,0xab,0xb7,0xb3,0xb4].includes(op)){const mode=op===0xb3?0:op===0xb4?1:args[0];lists=programs.filter(l=>l.mode===mode);hits=[...new Set(lists.flatMap(l=>l.gaps))];}
   if(hits.length)uses.push({offset:at,opcode:op,args,functionStart:start,functionAliases:aliases,frames:hits,mode:op===0xac?'static':'native-program',possibleFacings:lists.map(l=>l.facing),confidence:op===0xac?'exact static frame in PC0-loaded object':'conservative union of four facings; branches, movement and cross-object turns require runtime confirmation',precedingCommands:commands.filter(c=>c[0]<at).slice(-5)});
  }}
  objects.push({object,loads:loads.map(([offset,opcode,args])=>({offset,opcode,args,ownership:opcode===0x81?'PC0 loaded as NPC regardless of party':'PC0 conditional party actor'})),uses,functions:functionRecords});
 }
 if(objects.length)scenes.push({location:event.location,name:names[event.location]??null,eventId,eventPointer,sourceEventSha256:hash(p),sourceEventBytes:p.length,endingName:/Ending|Epilogue/i.test(names[event.location]??''),objects});
}
write('story-source-audit.json',{status:'Static source ownership and native command audit, not a complete playthrough claim',baseSha256:hash(base),eventsSourceSha256:hash(fs.readFileSync('.local/reference/events.json')),scope:'Every reference location pointer was checked against the original ROM location header and event pointer table. Only objects loadingPC0 via57/80/81 are counted. Shared scripts may have several location aliases. Function branches, callers, current facing and player control remain runtime conditions.',excluded,scenes,byFrame:gaps.map(g=>({frame:g.frame,uses:scenes.flatMap(s=>s.objects.flatMap(o=>o.uses.filter(u=>u.frames.includes(g.frame)).map(u=>({location:s.location,name:s.name,object:o.object,...u}))))})),endingScenes:scenes.filter(s=>s.endingName).map(s=>({location:s.location,name:s.name,objects:s.objects.map(o=>({object:o.object,loads:o.loads,uses:o.uses}))}))});
console.log(JSON.stringify({sourceCrops:crops.length,remaining:gaps.length,programs:programs.length,pc0Locations:scenes.length,endingLocations:scenes.filter(s=>s.endingName).map(s=>s.location),potentialGapLocations:scenes.filter(s=>s.objects.some(o=>o.uses.length)).length,currentRawBytes:built.records[0].bytes.length,currentAssemblyBytes:built.records[1].bytes.length},null,2));
