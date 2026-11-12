import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {chromium} from '@playwright/test';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {spriteHeaders} from '../../../engine/native-sprites.js';
import {readEnemyAI} from '../../../engine/enemy-ai.js';
import {u16,u24,fileOffset,validateRom} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {bridgeFamilies} from '../../../content/bridge-actors.js';
const dir='assets/imagegen/bone-guards',hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(dir,{recursive:true});
const base=await validateRom(await readFile('.local/chrono-trigger-usa.sfc')),current=new Uint8Array(await readFile('.local/shrek-trigger.sfc')),family=bridgeFamilies.find(f=>f.key==='bone-guards'),actors=family.actors.map(a=>({...family.groups[0],gfx:family.gfx,...a})),headers=spriteHeaders(base),bank=nativeSpriteBank(base,actors[3]);
const ap=fileOffset(u24(base,0x242300+71*3)),ae=Math.min(...Array.from({length:256},(_,i)=>fileOffset(u24(base,0x242300+i*3))).filter(p=>p>ap));assert.equal(ae-ap,24*40);
const frames=[],images=[],paletteImages=[];
for(let f=0;f<24;f++){
  const cells=nativeSpriteCells(bank,f),p=new Uint8Array(96*112);let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const c of cells)for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(c.pixels[y*16+x]){
    const xx=c.x+x,yy=c.y+y;x0=Math.min(x0,xx);x1=Math.max(x1,xx+1);y0=Math.min(y0,yy);y1=Math.max(y1,yy+1);
    assert.ok(xx+48>=0&&xx+48<96&&yy+72>=0&&yy+72<112);const i=(yy+72)*96+xx+48;if(!p[i])p[i]=c.pixels[y*16+x];
  }
  const png=new PNG({width:96,height:112});for(let i=0;i<p.length;i++)if(p[i])png.data.set([...bank.palette[p[i]-1],255],i*4);
  images.push('data:image/png;base64,'+PNG.sync.write(png).toString('base64'));
  frames.push({frame:f,originalBounds:[x0,y0,x1-x0,y1-y0],nativeBottomPixel:y1-1,opaquePixels:p.filter(Boolean).length,pixelSha256:hash(p),cells:cells.map(({cell,x,y})=>({cell,x,y})),currentFrameOffset:family.groups[0].frameOffsets?.[f]??[0,0],role:'Pending source visual audit'});
}
for(const actor of actors){const b=nativeSpriteBank(base,actor),png=new PNG({width:32,height:40});for(const c of nativeSpriteCells(b,4))for(let y=0;y<16;y++)for(let x=0;x<16;x++){const k=c.pixels[y*16+x];if(k)png.data.set([...b.palette[k-1],255],((c.y+y+36)*32+c.x+x+16)*4);}paletteImages.push('data:image/png;base64,'+PNG.sync.write(png).toString('base64'));}
const ownership=[];for(const [field,ids,table]of [[0,[108],0x242000],[1,[71],0x242300],[2,[91,92,93,94],0x242a00],[3,[85],0x242600]])for(const id of ids){const read=i=>field>=2?u16(base,table+i*2):u24(base,table+i*3),value=read(id);ownership.push({field,id,owners:headers.filter(h=>base[h.offset+field]===id).map(h=>({kind:h.kind,id:h.id})),pointerAliases:Array.from({length:256},(_,i)=>i).filter(i=>read(i)===value)});}
const animation=[];for(const table of [0x242600,0x242800]){const start=0x240000+u16(base,table+85*2),end=0x240000+u16(base,table+86*2);assert.ok(end>start);animation.push({kind:table===0x242600?'directional frames':'shared durations',id:85,pointer:table+85*2,offset:start,bytes:end-start,sha256:hash(base.slice(start,end)),values:[...base.slice(start,end)]});}
const events=JSON.parse(await readFile('.local/reference/events.json')),sceneUses=events.filter(e=>e.commands.some(([,op,a])=>op===0x83&&actors.some(c=>c.enemy===a[0]))).map(e=>({location:e.location,eventPointer:e.eventPointer,loads:e.commands.filter(([,op,a])=>op===0x83&&actors.some(c=>c.enemy===a[0])).map(([offset,op,args])=>({offset,command:[op,...args],nearby:e.commands.filter(c=>c[0]>=offset-16&&c[0]<=offset+72)})),allEnemyIds:[...new Set(e.commands.filter(([,op])=>op===0x83).map(([,op,a])=>a[0]))],allNpcIds:[...new Set(e.commands.filter(([,op])=>op===0x82).map(([,op,a])=>a[0]))]}));
const packet=(rom)=>{const offset=fileOffset(u24(rom,0x242000+108*3)),d=decompress(rom,offset);return{offset,decodedBytes:d.bytes.length,compressedBytes:d.length,rawSha256:hash(d.bytes),compressedSha256:hash(rom.slice(offset,offset+d.length))};};
const audit={status:'Inactive original resource and scene audit',sourceRomSha256:hash(base),originalGraphics:packet(base),currentBaseline:{path:'.local/shrek-trigger.sfc',sha256:hash(current),graphics:packet(current)},assembly:{id:71,offset:ap,bytes:ae-ap,frames:24,cells:4,sizeClass:0,sha256:hash(bank.assembly)},ownership,actors:actors.map(a=>{const b=nativeSpriteBank(base,a),ai=readEnemyAI(base,a.enemy),paletteOffset=0x240000+u16(base,0x242a00+a.palette*2);assert.deepEqual(base.slice(paletteOffset,paletteOffset+24),current.slice(paletteOffset,paletteOffset+24));return{key:a.key,enemy:a.enemy,header:[...base.slice(0x24f600+a.enemy*10,0x24f60a+a.enemy*10)],palette:a.palette,paletteOffset,nativeColors:b.nativeColors,colors:a.colors,paletteSha256:hash(base.slice(paletteOffset,paletteOffset+24)),ai:{offset:ai.start,bytes:ai.bytes,sha256:hash(base.slice(ai.start,ai.start+ai.bytes))}};}),animation,sceneUses,frames,activation:false};
await writeFile(dir+'/native-resource-audit.json',JSON.stringify(audit,null,2)+'\n');
const html='<!doctype html><meta charset="utf-8"><title>Bone Guard source audit</title><style>body{background:#354046;color:#f0eee4;font:14px system-ui;padding:16px}.grid{display:grid;grid-template-columns:repeat(6,300px);gap:8px}.frame{background:#465158;padding:6px;text-align:center}img{image-rendering:pixelated;display:block;margin:auto}.large{width:288px;height:336px}small{display:block}.palettes{display:flex;gap:30px}.palettes img{width:96px;height:120px}</style><h1>Original 24 Bone Guard native slots · 1× / 3×</h1><p>Four native cells, gfx108 / asm71 / animation85. Exact signed coordinates; original four color-index interpretations.</p><div class="palettes">'+actors.map((a,i)=>'<div>'+a.key+' · '+a.palette+'<img src="'+paletteImages[i]+'"></div>').join('')+'</div><div class="grid">'+frames.map((f,i)=>'<div class="frame"><b>Slot '+i+'</b><img class="large" src="'+images[i]+'"><img width="96" height="112" src="'+images[i]+'"><small>'+JSON.stringify(f.originalBounds)+'</small></div>').join('')+'</div>';
await writeFile(dir+'/original-native.html',html);const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1900,height:900},deviceScaleFactor:1});await page.setContent(html);await page.screenshot({path:dir+'/original-native.png',fullPage:true});}finally{await browser.close();}
console.log(JSON.stringify({original:audit.originalGraphics,current:audit.currentBaseline,assembly:audit.assembly,ownership,animation,scenes:sceneUses.map(s=>({location:s.location,enemies:s.allEnemyIds,npcs:s.allNpcIds})),bounds:frames.map(f=>({frame:f.frame,bounds:f.originalBounds}))},null,2));
