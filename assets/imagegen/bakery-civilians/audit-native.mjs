import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {validateRom,u16,u24,fileOffset} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {spriteHeaders} from '../../../engine/native-sprites.js';

const root=new URL('./',import.meta.url),base=await validateRom(await readFile(new URL('../../../.local/chrono-trigger-usa.sfc',root))),families=JSON.parse(await readFile(new URL('source-families.json',root))),shared=JSON.parse(await readFile(new URL('shared-village-owners.json',root))),headers=spriteHeaders(base),hash=b=>createHash('sha256').update(b).digest('hex'),signed=v=>v>127?v-256:v,events=JSON.parse(await readFile(new URL('../../../.local/reference/events.json',root))),reports=[];
await mkdir(new URL('review/',root),{recursive:true});
for(const family of families){
 const group=family.groups[0],actor=family.actors[0],gfxOffset=fileOffset(u24(base,0x242000+family.gfx*3)),gfx=decompress(base,gfxOffset),asmOffset=fileOffset(u24(base,0x242300+group.asm*3)),asmEnd=Math.min(...Array.from({length:256},(_,i)=>fileOffset(u24(base,0x242300+i*3))).filter(p=>p>asmOffset)),paletteOffset=0x240000+u16(base,0x242a00+actor.palette*2),animOffset=0x240000+u16(base,0x242600+actor.animation*2),animEnd=0x240000+u16(base,0x242600+(actor.animation+1)*2),durationOffset=0x240000+u16(base,0x242800+actor.animation*2),durationEnd=0x240000+u16(base,0x242800+(actor.animation+1)*2),owners=Object.fromEntries([[0,family.gfx],[1,group.asm]].map(([field,id])=>[field+'/'+id,headers.filter(h=>base[h.offset+field]===id).map(h=>({kind:h.kind,id:h.id}))]));
 const expected=family.actors.flatMap(a=>a.npcs.map(id=>({kind:'npc',id}))).sort((a,b)=>a.id-b.id);
 for(const list of Object.values(owners))assert.deepEqual(list,expected);
 assert.equal(asmEnd-asmOffset,23*40);
 const pixels=[],frames=[];
 function tile(word,x,y){if(word&0x4000)x=7-x;if(word&0x8000)y=7-y;const t=(word&1023)*32;let v=0;for(let bit=0;bit<4;bit++)v|=(gfx.bytes[t+(bit>>1)*16+y*2+(bit&1)]>>(7-x)&1)<<bit;return v;}
 for(let f=0;f<23;f++){
  const p=new Uint8Array(128*128),xy=Array.from({length:4},(_,cell)=>[signed(base[asmOffset+f*40+32+cell*2]),signed(base[asmOffset+f*40+33+cell*2])]);
  for(let cell=0;cell<4;cell++)for(let y=0;y<16;y++)for(let x=0;x<16;x++){const v=tile(u16(base,asmOffset+f*40+(y>>3)*16+cell*4+(x>>3)*2),x&7,y&7),xx=64+xy[cell][0]+x,yy=112+xy[cell][1]+y;if(v){assert.ok(xx>=0&&xx<128&&yy>=0&&yy<128);p[yy*128+xx]=v;}}
  const pts=Array.from(p,(v,i)=>v?[i%128-64,(i/128|0)-112]:null).filter(Boolean);
  frames.push({frame:f,xy,opaquePixels:pts.length,bounds:pts.length?[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0]))+1,Math.max(...pts.map(p=>p[1]))+1]:null,pixelSha256:hash(p)});pixels.push(p);
 }
 function normalized(p,flip=false){const pts=Array.from(p,(v,i)=>v?[i%128,(i/128|0),v]:null).filter(Boolean);if(!pts.length)return'';const minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0])),minY=Math.min(...pts.map(p=>p[1]));return pts.map(([x,y,v])=>[flip?maxX-x:x-minX,y-minY,v]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]).join(';');}
 const normalizedFrames=pixels.map(p=>normalized(p)),mirrorPairs=[],copyPairs=[];
 for(let f=0;f<23;f++)for(let i=0;i<f;i++){if(normalizedFrames[f]===normalizedFrames[i])copyPairs.push([f,i]);else if(normalizedFrames[f]===normalized(pixels[i],true))mirrorPairs.push([f,i]);}
 const rgb=Array.from({length:16},(_,i)=>{const w=i?u16(base,paletteOffset+(i-1)*2):0;return[0,5,10].map(s=>{const v=w>>s&31;return v<<3|v>>2;});}),png=new PNG({width:8*48*4,height:3*48*4});
 for(const[i,p]of pixels.entries())for(let y=0;y<48;y++)for(let x=0;x<48;x++){const v=p[(y+72)*128+x+40];if(v)for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++)png.data.set([...rgb[v],255],(((i/8|0)*192+y*4+dy)*png.width+i%8*192+x*4+dx)*4);}
 await writeFile(new URL('review/'+family.key+'-original-4x.png',root),PNG.sync.write(png));
 const npcIds=family.actors.flatMap(a=>a.npcs),scenes=events.filter(e=>e.commands.some(([p,op,a])=>op===0x82&&npcIds.includes(a[0]))).map(e=>{const loads=e.commands.filter(([p,op])=>op===0x82||op===0x83),banks=[...new Set(loads.map(([p,op,a])=>base[op===0x83?0x24f600+a[0]*10:0x24f000+(a[0]+7)*5]).filter(g=>g>6))],parts=banks.map(g=>({gfx:g,bytes:decompress(base,fileOffset(u24(base,0x242000+g*3))).bytes.length}));return{location:e.location,eventPointer:e.eventPointer,civilianLoads:loads.filter(([p,op,a])=>op===0x82&&npcIds.includes(a[0])),allEnemyIds:[...new Set(loads.filter(([p,op])=>op===0x83).map(([p,op,a])=>a[0]))],allNpcIds:[...new Set(loads.filter(([p,op])=>op===0x82).map(([p,op,a])=>a[0]))],originalWholeLocationLoadUpperBound:{bytes:parts.reduce((n,p)=>n+p.bytes,0),limit:32768,parts,note:'Conservative union across all event branches, not simultaneous residency proof'}};});
 const animationProgram=Array.from(base.slice(animOffset,animEnd)),durationProgram=Array.from(base.slice(durationOffset,durationEnd)),stride=animationProgram.length/4;assert.equal(durationProgram.length,stride);
 const report={family,source:{graphicsOffset:gfxOffset,graphicsBytes:gfx.bytes.length,compressedBytes:gfx.length,assemblyOffset:asmOffset,assemblyBytes:asmEnd-asmOffset,animationOffset:animOffset,animationBytes:animEnd-animOffset,animationProgram,animationSha256:hash(base.slice(animOffset,animEnd)),durationOffset,durationBytes:durationEnd-durationOffset,durationProgram,durationSha256:hash(base.slice(durationOffset,durationEnd))},owners,npcHeaders:family.actors.flatMap(a=>a.npcs.map(id=>({id,bytes:Array.from(base.slice(0x24f000+(id+7)*5,0x24f000+(id+7)*5+5))}))),animationDirections:Array.from({length:4},(_,facing)=>({facing,program:animationProgram.slice(facing*stride,(facing+1)*stride),times:durationProgram})),normalizedMirrorPairs:mirrorPairs,normalizedCopyPairs:copyPairs,frames,scenes};reports.push(report);
}
const paletteRecords=[123,124].map(palette=>{const offset=0x240000+u16(base,0x242a00+palette*2);return{palette,offset,originalOwners:headers.filter(h=>base[h.offset+2]===palette).map(h=>({kind:h.kind,id:h.id})),projectOwners:shared.filter(a=>a.palette===palette).map(a=>({key:a.key,npcs:a.npcs,gfx:a.gfx,asm:a.asm,sourcePalette:a.sourcePalette??a.palette})),aliases:Array.from({length:256},(_,i)=>i).filter(i=>0x240000+u16(base,0x242a00+i*2)===offset),originalSha256:hash(base.slice(offset,offset+24)),projectColors:families[0].actors.find(a=>a.palette===palette).colors};});
await writeFile(new URL('native-audit.json',root),JSON.stringify({status:'Original resource and pose audit before source generation',families:reports,paletteRecords},null,2)+'\n');
console.log(JSON.stringify({families:reports.map(r=>({key:r.family.key,source:{...r.source,animationProgram:undefined,durationProgram:undefined},owners:r.owners,mirrorPairs:r.normalizedMirrorPairs,copyPairs:r.normalizedCopyPairs,blanks:r.frames.filter(f=>!f.opaquePixels).map(f=>f.frame),animationDirections:r.animationDirections,scenes:r.scenes.map(s=>({location:s.location,originalUpperBound:s.originalWholeLocationLoadUpperBound.bytes}))})),paletteRecords},null,2));
