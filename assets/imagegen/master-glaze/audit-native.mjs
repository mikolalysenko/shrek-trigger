import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {bakeryFamilies} from '../../../content/bakery-actors.js';
import {masterGlaze} from '../../../engine/bakery-art.js';
import {u16,u24,fileOffset,validateRom} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {spriteHeaders} from '../../../engine/native-sprites.js';
import {readEnemyAI} from '../../../engine/enemy-ai.js';

const dir=import.meta.dirname,root=path.resolve(dir,'../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const base=await validateRom(fs.readFileSync(path.join(root,'.local/chrono-trigger-usa.sfc'))),family=bakeryFamilies.find(f=>f.key==='master-glaze'),headers=spriteHeaders(base);
const gfxOffset=fileOffset(u24(base,0x242000+141*3)),gfx=decompress(base,gfxOffset),asmOffset=fileOffset(u24(base,0x242300+135*3)),asmEnd=Math.min(...Array.from({length:256},(_,i)=>fileOffset(u24(base,0x242300+i*3))).filter(p=>p>asmOffset));
const palOffset=0x240000+u16(base,0x242a00+190*2),animOffset=0x240000+u16(base,0x242600+101*2),animEnd=0x240000+u16(base,0x242600+102*2),ai=readEnemyAI(base,154),signed=v=>v>127?v-256:v;
assert.equal(asmEnd-asmOffset,800);
const owners={};for(const[field,id]of[[0,141],[1,135],[2,190]]){owners[field+'/'+id]=headers.filter(h=>base[h.offset+field]===id).map(h=>[h.kind,h.id]);assert.deepEqual(owners[field+'/'+id],[['enemy',154]]);}
const frames=[],pixels=[];
for(let f=0;f<20;f++){
 const p=new Uint8Array(64*64),xy=Array.from({length:4},(_,c)=>[signed(base[asmOffset+f*40+32+c*2]),signed(base[asmOffset+f*40+33+c*2])]);
 for(let c=0;c<4;c++)for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  const word=u16(base,asmOffset+f*40+(y>>3)*16+c*4+(x>>3)*2),tx=word&0x4000?7-(x&7):x&7,ty=word&0x8000?7-(y&7):y&7;let v=0;
  for(let bit=0;bit<4;bit++)v|=(gfx.bytes[(word&1023)*32+(bit>>1)*16+ty*2+(bit&1)]>>(7-tx)&1)<<bit;
  const xx=32+xy[c][0]+x,yy=48+xy[c][1]+y;if(v){assert.ok(xx>=0&&xx<64&&yy>=0&&yy<64);p[yy*64+xx]=v;}
 }
 const pts=Array.from(p,(v,i)=>v?[i%64-32,(i/64|0)-48]:null).filter(Boolean),bounds=[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0]))+1,Math.max(...pts.map(p=>p[1]))+1];
 pixels.push(p);frames.push({frame:f,cellXY:xy,bounds,opaquePixels:pts.length,pixelSha256:sha(p)});
}
const originalPalette=Array.from({length:16},(_,i)=>{const c=i?u16(base,palOffset+(i-1)*2):0;return[0,5,10].map(s=>{const v=c>>s&31;return v<<3|v>>2;});});
const rgb=family.actors[0].colors.map(s=>[0,2,4].map(i=>{const v=parseInt(s.slice(i,i+2),16)>>3;return v<<3|v>>2;}));
function atlas(list,colors,w,h,scale){const im=new PNG({width:5*w*scale,height:4*h*scale});for(let i=0;i<im.data.length;i+=4)im.data.set([37,36,42,255],i);list.forEach((p,f)=>p.forEach((v,j)=>{if(v)for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++)im.data.set([...colors[v],255],((((f/5|0)*h+(j/w|0))*scale+yy)*im.width+(f%5*w+j%w)*scale+xx)*4);}));return PNG.sync.write(im);}
fs.mkdirSync(path.join(dir,'private'),{recursive:true});fs.writeFileSync(path.join(dir,'private/original-frames-4x.png'),atlas(pixels,originalPalette,64,64,4));
fs.writeFileSync(path.join(dir,'before-native-4x.png'),atlas(Array.from({length:20},(_,f)=>masterGlaze(f)),[[0,0,0],...rgb],32,32,4));
const events=JSON.parse(fs.readFileSync(path.join(root,'.local/reference/events.json'))),scenes=events.filter(e=>e.commands.some(([p,op,a])=>op===0x83&&a[0]===154)).map(e=>{
 const loads=e.commands.filter(([p,op])=>op===0x82||op===0x83),banks=[...new Set(loads.map(([p,op,a])=>base[op===0x83?0x24f600+a[0]*10:0x24f000+(a[0]+7)*5]).filter(g=>g>6))],parts=banks.map(g=>({gfx:g,bytes:decompress(base,fileOffset(u24(base,0x242000+g*3))).bytes.length}));
 return{location:e.location,enemyIds:[...new Set(loads.filter(([p,op])=>op===0x83).map(([p,op,a])=>a[0]))],npcIds:[...new Set(loads.filter(([p,op])=>op===0x82).map(([p,op,a])=>a[0]))],originalWholeLocationLoadUpperBound:{bytes:parts.reduce((n,p)=>n+p.bytes,0),parts,limit:32768,note:'Conservative union across event branches, not simultaneous residency.'}};
});
const animation=Array.from(base.slice(animOffset,animEnd));const report={sourceRomSha256:sha(base),family,owners,palette:{id:190,offset:palOffset,aliases:Array.from({length:256},(_,i)=>i).filter(i=>0x240000+u16(base,0x242a00+i*2)===palOffset),currentColors:family.actors[0].colors,originalBytesSha256:sha(base.slice(palOffset,palOffset+24))},source:{graphicsOffset:gfxOffset,rawGraphicsBytes:gfx.bytes.length,compressedGraphicsBytes:gfx.length,assemblyOffset:asmOffset,assemblyBytes:asmEnd-asmOffset,animationOffset:animOffset,animationBytes:animEnd-animOffset,animationSha256:sha(Uint8Array.from(animation)),animation,header:Array.from(base.slice(0x24f600+154*10,0x24f600+154*10+10)),ai:{offset:ai.start,bytes:ai.bytes,sha256:sha(base.slice(ai.start,ai.start+ai.bytes))}},frames,scenes};
report.exactOriginalMirrorPairs=[6,7,8].map(left=>{const right=left+3,mirrored=Uint8Array.from(pixels[left],(_,i)=>pixels[left][(i/64|0)*64+63-i%64]),changedPixels=pixels[right].reduce((n,v,i)=>n+(v!==mirrored[i]),0);assert.equal(changedPixels,0);return{left,right,changedPixels};});
fs.writeFileSync(path.join(dir,'source-family.json'),JSON.stringify(family,null,2)+'\n');fs.writeFileSync(path.join(dir,'native-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({source:report.source,palette:report.palette,owners,frames:frames.map(({frame,bounds})=>({frame,bounds})),scenes},null,2));
