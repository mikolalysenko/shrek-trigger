import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {chromium} from '@playwright/test';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {spriteHeaders} from '../../../engine/native-sprites.js';
import {readEnemyAI} from '../../../engine/enemy-ai.js';
import {u16,u24,fileOffset,validateRom} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {courtBeasts} from '../../../content/court-beasts.js';
import {courtBeastFrames} from '../../../engine/court-beast-art.js';
const dir=new URL('./',import.meta.url),base=await validateRom(await readFile(new URL('../../../.local/chrono-trigger-usa.sfc',dir))),sha=b=>createHash('sha256').update(b).digest('hex');
const headers=spriteHeaders(base),actor=courtBeasts[0],bank=nativeSpriteBank(base,actor),assemblyOffset=fileOffset(u24(base,0x242300+127*3)),assemblyEnd=Math.min(...Array.from({length:256},(_,i)=>fileOffset(u24(base,0x242300+i*3))).filter(p=>p>assemblyOffset));
assert.equal(assemblyEnd-assemblyOffset,31*80);
const frames=[],images=[];
for(let id=0;id<31;id++){
  const cells=nativeSpriteCells(bank,id),pixels=new Uint8Array(96*96),origin=[48,64];
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const c of cells)for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(c.pixels[y*16+x]){
    const xx=c.x+x,yy=c.y+y;minX=Math.min(minX,xx);minY=Math.min(minY,yy);maxX=Math.max(maxX,xx+1);maxY=Math.max(maxY,yy+1);
    const p=(yy+origin[1])*96+xx+origin[0];assert.ok(p>=0&&p<pixels.length);if(!pixels[p])pixels[p]=c.pixels[y*16+x];
  }
  const png=new PNG({width:96,height:96});for(let p=0;p<pixels.length;p++)if(pixels[p])png.data.set([...bank.palette[pixels[p]-1],255],p*4);
  images.push('data:image/png;base64,'+PNG.sync.write(png).toString('base64'));
  frames.push({id,originalBounds:[minX,minY,maxX-minX,maxY-minY],opaquePixels:pixels.filter(Boolean).length,pixelSha256:sha(pixels),cells:cells.map(({cell,x,y})=>({cell,x,y})),currentProceduralRole:courtBeastFrames[id],roleStatus:'Pending direct visual review of original native frame'});
}
const animStart=0x240000+u16(base,0x242600+99*2),animEnd=0x240000+u16(base,0x242602+99*2),stride=(animEnd-animStart)/4;
const ownership=[];for(const [field,ids,table]of [[0,[133],0x242000],[1,[127],0x242300],[2,[185,249],0x242a00],[3,[99],0x242600]])for(const id of ids){const read=id=>field>=2?u16(base,table+id*2):u24(base,table+id*3),pointer=read(id);ownership.push({field,id,owners:headers.filter(h=>base[h.offset+field]===id).map(h=>({kind:h.kind,id:h.id})),pointerAliases:Array.from({length:256},(_,i)=>i).filter(i=>read(i)===pointer)});}
const events=JSON.parse(await readFile(new URL('../../../.local/reference/events.json',dir))),sceneUses=events.flatMap(e=>e.commands.filter(([p,op,a])=>op===0x83&&[144,199].includes(a[0])).map(([offset,op,args])=>({location:e.location,eventPointer:e.eventPointer,offset,command:[op,...args],nearby:e.commands.filter(c=>c[0]>=offset-16&&c[0]<=offset+80)})));
const gfxOffset=fileOffset(u24(base,0x242000+133*3)),packet=decompress(base,gfxOffset);
const audit={status:'Inactive original native resource audit',sourceRomSha256:sha(base),graphics:{id:133,offset:gfxOffset,decodedBytes:packet.bytes.length,compressedBytes:packet.length,sha256:sha(packet.bytes)},assembly:{id:127,offset:assemblyOffset,bytes:2480,frames:31,cells:8,sizeClass:1,sha256:sha(bank.assembly)},ownership,
 actors:courtBeasts.map(a=>{const b=nativeSpriteBank(base,a),ai=readEnemyAI(base,a.enemy),paletteOffset=0x240000+u16(base,0x242a00+a.palette*2);return{key:a.key,enemy:a.enemy,header:[...base.slice(0x24f600+a.enemy*10,0x24f60a+a.enemy*10)],palette:a.palette,paletteOffset,originalColors:b.palette.map(c=>c.map(n=>n.toString(16).padStart(2,'0')).join('')),approvedColors:a.colors,ai:{offset:ai.start,bytes:ai.bytes,sha256:sha(base.slice(ai.start,ai.start+ai.bytes))}};}),
 animation:{id:99,offset:animStart,bytes:animEnd-animStart,directionStride:stride,sha256:sha(base.slice(animStart,animEnd)),directions:Array.from({length:4},(_,facing)=>({facing,bytes:[...base.slice(animStart+facing*stride,animStart+(facing+1)*stride)]}))},sceneUses,frames,activation:false};
await writeFile(new URL('native-resource-audit.json',dir),JSON.stringify(audit,null,2)+'\n');
const html='<!doctype html><meta charset="utf-8"><title>Court beast native audit</title><style>body{background:#354046;color:#f0eee4;font:14px system-ui;padding:16px}.grid{display:grid;grid-template-columns:repeat(5,300px);gap:8px}.frame{background:#465158;padding:6px;text-align:center}img{image-rendering:pixelated;display:block;margin:auto}.large{width:288px;height:288px;object-fit:contain}small{display:block}</style><h1>Original 31 Court Beast / Masquerader slots</h1><p>Source ROM gfx133 / asm127 / animation99. 1× and 3×; original signed cell coordinates and eight-cell budget.</p><div class="grid">'+frames.map((f,i)=>'<div class="frame"><b>Native '+i+'</b><img class="large" src="'+images[i]+'"><img width="96" height="96" src="'+images[i]+'"><small>'+JSON.stringify(f.originalBounds)+'</small></div>').join('')+'</div>';
await writeFile(new URL('original-native.html',dir),html);const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1580,height:900},deviceScaleFactor:1});await page.setContent(html);await page.screenshot({path:new URL('original-native.png',dir).pathname,fullPage:true});}finally{await browser.close();}
console.log(JSON.stringify({graphics:audit.graphics,assembly:audit.assembly,ownership,animation:audit.animation,sceneUses:sceneUses.map(s=>({location:s.location,command:s.command})),bounds:frames.map(f=>({id:f.id,bounds:f.originalBounds}))},null,2));
