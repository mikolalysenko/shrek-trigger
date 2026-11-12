// Read-only production audit. All derived output stays beside this script.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {chromium} from '@playwright/test';
import {spriteHeaders} from '../../../engine/native-sprites.js';
import {nativeSpriteBank,nativeSpriteCells,nativeSpriteAtlas} from '../../../scripts/native-sprite-view.mjs';
import {u16,u24} from '../../../engine/rom.js';
import {cartridgeOffset} from '../../../engine/expanded-rom.js';
import {decompress} from '../../../engine/compression.js';
import {decode} from '../../../engine/text.js';
import {readEnemyAI} from '../../../engine/enemy-ai.js';

const dir='assets/raster/late-cast-coverage-audit',sha=b=>createHash('sha256').update(b).digest('hex');
const sourcePath='.local/chrono-trigger-usa.sfc',currentPath=process.argv[2]??'.local/shrek-trigger.sfc';
const source=await readFile(sourcePath),current=await readFile(currentPath);
const headers=spriteHeaders(current),eventsBytes=await readFile('.local/reference/events.json'),events=JSON.parse(eventsBytes);
const sceneNames=(await readFile('.local/reference/CTViewer/data/snes_na_scenes.txt','utf8')).trimEnd().split('\n');
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i),unique=a=>[...new Set(a)].sort((a,b)=>a-b);
const laterLocations=[...range(328,334),...range(351,377),...range(380,384),386,388,389,...range(392,395),397,...range(401,418),...range(424,427)];
const describe=(h,rom=current)=>({kind:h.kind,id:h.id,...(h.kind==='enemy'?{name:decode(rom.slice(0xc6500+h.id*11,0xc6500+(h.id+1)*11))}:{}),header:[...rom.slice(h.offset,h.offset+(h.kind==='enemy'?10:5))]});
function packet(rom,gfx){const pointer=u24(rom,0x242000+gfx*3),offset=cartridgeOffset(pointer,rom),p=decompress(rom,offset);return{pointer,offset,decodedBytes:p.bytes.length,compressedBytes:p.length,decodedSha256:sha(p.bytes),compressedSha256:sha(rom.slice(offset,offset+p.length))};}
function resource(field,id){const table=[0x242000,0x242300,0x242a00,0x242600][field],read=i=>field<2?u24(current,table+i*3):u16(current,table+i*2),pointer=read(id);return{field,id,pointer,pointerAliases:range(0,255).filter(i=>read(i)===pointer),owners:headers.filter(h=>current[h.offset+field]===id).map(h=>describe(h))};}
function assembly(rom,id){const pointers=range(0,255).map(i=>cartridgeOffset(u24(rom,0x242300+i*3),rom)),offset=pointers[id],end=Math.min(...pointers.filter(p=>p>offset));assert.equal(offset>>16,(end-1)>>16);return{offset,bytes:end-offset,sha256:sha(rom.slice(offset,end))};}
function animation(id){
 const fp=0x240000+u16(source,0x242600+id*2),fe=0x240000+u16(source,0x242600+(id+1)*2),dp=0x240000+u16(source,0x242800+id*2),de=0x240000+u16(source,0x242800+(id+1)*2);
 const frameBytes=source.slice(fp,fe),durationBytes=source.slice(dp,de),stride=frameBytes.length/4;assert.ok(Number.isInteger(stride));
 assert.deepEqual(current.slice(fp,fe),frameBytes);assert.deepEqual(current.slice(dp,de),durationBytes);
 const lists=[];for(let facing=0;facing<4;facing++)for(let mode=0;mode*4<durationBytes.length;mode++){
  const steps=[];for(let i=mode*4;i<durationBytes.length&&i<stride&&durationBytes[i]&&frameBytes[facing*stride+i]!==255;i++)steps.push({frame:frameBytes[facing*stride+i],ticks:durationBytes[i]});
  lists.push({facing,mode,steps,loopTicks:steps.reduce((n,s)=>n+s.ticks,0)});
 }
 return{id,frameOffset:fp,durationOffset:dp,stride,frameSha256:sha(frameBytes),durationSha256:sha(durationBytes),frameBytes:[...frameBytes],durationBytes:[...durationBytes],lists,referencedFrames:unique(lists.flatMap(l=>l.steps.map(s=>s.frame)))};
}
function sceneUses(enemyIds){return events.filter(e=>e.commands.some(([,op,a])=>op===0x83&&enemyIds.includes(a[0]))).map(e=>{
 const eventId=u16(source,0x360008+e.location*14),offset=cartridgeOffset(u24(source,0x3cf9f0+eventId*3),source),p=decompress(source,offset),loads=e.commands.filter(([,op,a])=>op===0x83&&enemyIds.includes(a[0]));
 // CTViewer's offsets address the decoded body after its object-count byte.
 for(const [pc,op,a]of loads){assert.equal(p.bytes[pc+1],op);assert.equal(p.bytes[pc+2],a[0]);}
 const currentId=u16(current,0x360008+e.location*14),currentOffset=cartridgeOffset(u24(current,0x3cf9f0+currentId*3),current),q=decompress(current,currentOffset);
 return{location:e.location,name:sceneNames[e.location],originalEventId:eventId,originalPacketOffset:offset,originalPacketSha256:sha(p.bytes),currentEventId:currentId,currentPacketOffset:currentOffset,currentPacketSha256:sha(q.bytes),originalPacketUnchanged:Buffer.from(p.bytes).equals(Buffer.from(q.bytes)),loads:loads.map(([pc,op,args])=>({bodyOffset:pc,opcode:op,enemy:args[0],slotAndFlags:args[1]})),allEnemyOwners:unique(e.commands.filter(([,op])=>op===0x83).map(([,op,a])=>a[0])),allNpcOwners:unique(e.commands.filter(([,op])=>op===0x82).map(([,op,a])=>a[0])),proof:'Static source-event loads; not a controller route or visibility proof'};
 });}
function png(pixels,width,height,palette,scale=1){const im=new PNG({width:width*scale,height:height*scale});pixels.forEach((v,i)=>{if(!v)return;for(let y=0;y<scale;y++)for(let x=0;x<scale;x++)im.data.set([...palette[v-1],255],((Math.floor(i/width)*scale+y)*im.width+i%width*scale+x)*4);});return PNG.sync.write(im);}

await mkdir(dir+'/review',{recursive:true});
const familySpecs=[{key:'dalton',gfx:143,asm:137,frames:28,size:0,animation:107,palettes:[192],enemies:[161,162]},{key:'summoned-golems',gfx:216,asm:209,frames:8,size:2,animation:167,palettes:[234,235],enemies:[149,243]}];
const families=[];
for(const f of familySpecs){
 const original=packet(source,f.gfx),active=packet(current,f.gfx),oldAsm=assembly(source,f.asm),newAsm=assembly(current,f.asm);assert.equal(original.decodedSha256,active.decodedSha256);assert.equal(oldAsm.sha256,newAsm.sha256);assert.equal(oldAsm.bytes,f.frames*(f.size===2?12:4)*10);
 const ownership=[resource(0,f.gfx),resource(1,f.asm),...f.palettes.map(id=>resource(2,id)),resource(3,f.animation)];
 const palettes=f.palettes.map(id=>{const p=0x240000+u16(current,0x242a00+id*2),old=0x240000+u16(source,0x242a00+id*2),bytes=current.slice(p,p+24);assert.deepEqual(bytes,source.slice(old,old+24));return{id,offset:p,sha256:sha(bytes),nativeColors:range(0,11).map(i=>u16(bytes,i*2))};});
 const bank=nativeSpriteBank(source,{...f,palette:f.palettes[0]}),atlas=nativeSpriteAtlas(bank),frames=range(0,f.frames-1).map(frame=>{const cells=nativeSpriteCells(bank,frame),points=cells.flatMap(c=>Array.from(c.pixels,(v,i)=>v?[c.x+(i&15),c.y+(i>>4)]:null).filter(Boolean)),x=points.map(p=>p[0]),y=points.map(p=>p[1]);return{frame,cellOrigins:cells.map(c=>[c.x,c.y]),bounds:points.length?[Math.min(...x),Math.min(...y),Math.max(...x)+1-Math.min(...x),Math.max(...y)+1-Math.min(...y)]:null,visiblePixels:atlas.images[frame].filter(Boolean).length,pixelSha256:sha(atlas.images[frame])};});
 const rows=[];for(const pal of f.palettes){const b=nativeSpriteBank(source,{...f,palette:pal}),cols=8,w=atlas.width*cols,h=atlas.height*Math.ceil(f.frames/cols),pixels=new Uint8Array(w*h);atlas.images.forEach((p,n)=>p.forEach((v,i)=>pixels[(Math.floor(n/cols)*atlas.height+Math.floor(i/atlas.width))*w+n%cols*atlas.width+i%atlas.width]=v));await writeFile(`${dir}/review/${f.key}-palette-${pal}-native-1x.png`,png(pixels,w,h,b.palette));await writeFile(`${dir}/review/${f.key}-palette-${pal}-native-4x.png`,png(pixels,w,h,b.palette,4));rows.push({palette:pal,width:w,height:h,cellWidth:atlas.width,cellHeight:atlas.height});}
 const ai=f.enemies.map(id=>{const a=readEnemyAI(source,id),b=readEnemyAI(current,id);return{enemy:id,bytes:a.bytes,sourceSha256:sha(source.slice(a.start,a.start+a.bytes)),currentSha256:sha(current.slice(b.start,b.start+b.bytes))};});
 families.push({...f,originalGraphics:original,currentGraphics:active,originalAssembly:oldAsm,currentAssembly:newAsm,ownership,palettes,animation:animation(f.animation),ai,frames,reviewAtlases:rows,sceneUses:sceneUses(f.enemies)});
}
const touchedOwners=events.filter(e=>laterLocations.includes(e.location)).flatMap(e=>e.commands.filter(([,op])=>op===0x82||op===0x83).map(([pc,op,a])=>({location:e.location,kind:op===0x82?'npc':'enemy',id:a[0]})));
const loadedHeaders=headers.filter(h=>touchedOwners.some(o=>o.kind===h.kind&&o.id===h.id));
const inventory=[];for(const gfx of unique(loadedHeaders.map(h=>current[h.offset]))){if(gfx<7)continue;try{const original=packet(source,gfx),active=packet(current,gfx);if(original.decodedSha256!==active.decodedSha256)continue;const owners=headers.filter(h=>current[h.offset]===gfx);inventory.push({gfx,originalGraphics:original,currentGraphics:active,owners:owners.map(h=>describe(h)),laterLoads:touchedOwners.filter(o=>owners.some(h=>h.kind===o.kind&&h.id===o.id)),status:'Unchanged decoded NPC graphics; scene visibility and BG composites not implied'});}catch(e){inventory.push({gfx,error:String(e)});}}
const assignedSearch=[];let searchedFiles=0;const namePattern=/\b(?:Rumpelstiltskin|Rumpel|Rumplestiltskin|Rumple)\b/i;
async function search(path){for(const e of await readdir(path,{withFileTypes:true})){const p=path+'/'+e.name;if(p.startsWith(dir))continue;if(e.isDirectory())await search(p);else if(/\.(?:md|txt|json|js|mjs)$/.test(e.name)&&e.name!=='generated-raster-art.js'){searchedFiles++;const text=await readFile(p,'utf8');text.split('\n').forEach((s,i)=>{if(namePattern.test(s))assignedSearch.push({path:p,line:i+1,text:s.slice(0,400)});});}}}
for(const p of ['docs','content','engine','assets'])await search(p);
const report={status:'Inactive coverage/ownership proposal; no generation or production edits',sourceRom:{path:sourcePath,sha256:sha(source)},currentRom:{path:currentPath,sha256:sha(current)},references:{gameDesign:{path:'docs/game-design.md',sha256:sha(await readFile('docs/game-design.md'))},events:{path:'.local/reference/events.json',sha256:sha(eventsBytes)}},rumpelAssignmentSearch:{roots:['docs','content','engine','assets'],pattern:namePattern.source,searchedFiles,matches:assignedSearch,limitation:'Search excludes local QA archives, generated-raster-art.js and this audit directory; no assignment found does not assign the character.'},laterLocationScope:laterLocations.map(id=>({id,name:sceneNames[id]})),scopeLimit:'Chapter room inventory, not an assertion that every room or enemy is mandatory. No new runtime encounter proof.',unchangedLaterGraphics:inventory.filter(x=>!x.error),uncomparableGraphics:inventory.filter(x=>x.error),families,excludedWork:[{family:'Cosmic Muffin interior',owner:'sprite_art_pass'},{family:'rootlings/briars',owner:'prophet_art_continuation'},{family:'enchanted pots/beetles',status:'frozen inactive; untouched'},{family:'Shrek, Pinocchio, Sky Drake image generation',status:'Rejected earlier; no retry'}]};
await writeFile(dir+'/audit.json',JSON.stringify(report,null,2)+'\n');
const html='<!doctype html><meta charset="utf-8"><title>Untouched later cast: original native art</title><style>body{background:#38434a;color:#f2eee4;font:16px system-ui;margin:24px}img{image-rendering:pixelated;display:block;margin:12px 0}.frame{display:inline-block;padding:4px;background:#455159;margin:4px;text-align:center}h2{margin-top:32px}small{display:block}</style><h1>Untouched later cast · original native source</h1><p>Current cartridge '+sha(current).slice(0,12)+'. The selected graphics and assemblies match the original cartridge. These are source-audit images, not proposed replacement art.</p>'+families.map(f=>'<h2>'+f.key+' · gfx '+f.gfx+' / asm '+f.asm+' · '+f.frames.length+' slots</h2>'+f.reviewAtlases.map(a=>'<p>Palette '+a.palette+' · native 1×</p><img src="'+f.key+'-palette-'+a.palette+'-native-1x.png"><p>4× review · row-major frame order</p><img src="'+f.key+'-palette-'+a.palette+'-native-4x.png">').join('')).join('');
await writeFile(dir+'/review/source-review.html',html);
const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1800,height:1000},deviceScaleFactor:1});await page.goto(new URL('./review/source-review.html',import.meta.url).href);await page.screenshot({path:dir+'/review/source-review.png',fullPage:true});}finally{await browser.close();}
console.log(JSON.stringify({current:report.currentRom,rumpel:report.rumpelAssignmentSearch,originalLaterGraphics:inventory.map(x=>x.gfx),families:families.map(f=>({key:f.key,gfx:f.gfx,asm:f.asm,frames:f.frames.length,blank:f.frames.filter(x=>!x.visiblePixels).map(x=>x.frame),nativePrograms:f.animation.lists.filter(l=>l.steps.length).length,allLists:f.animation.lists.length,sceneUses:f.sceneUses.map(e=>({id:e.location,unchanged:e.originalPacketUnchanged})),graphics:f.currentGraphics,assembly:f.currentAssembly}))},null,2));
