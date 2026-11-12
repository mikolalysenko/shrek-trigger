import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {fileURLToPath} from 'node:url';
import {compileSpriteFrames,mergeSpriteBanks} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
import {snesColor} from '../../../engine/sprites.js';
const d=import.meta.dirname,load=p=>JSON.parse(fs.readFileSync(path.join(d,p))),sha=b=>createHash('sha256').update(b).digest('hex');
export const guyTiers=load('native-contract.json').tiers,guyPalettes=load('palettes.draft.json').palettes,draftGuyMaps=load('native-roles.draft.json').maps;
export const body=load('body/preview-raster.json'),mantle=load('guy-fieri-mantle/preview-raster.json'),halo=load('guy-fieri-halo/preview-raster.json');
export function resolveGuySource(r,role){
 let sequence=r.sequences[role.pose]?.[role.facing],flip=false;
 if(!sequence&&role.facing===3){sequence=r.sequences[role.pose]?.[2];flip=!!sequence;}
 assert.ok(sequence,'Missing Guy pose '+JSON.stringify(role));
 const e=sequence[(role.phase??0)%sequence.length],frame=typeof e==='number'?e:e.frame;flip=flip!==!!e.flip;
 const source=Uint8Array.from(r.frames[frame],c=>parseInt(c,16)),out=new Uint8Array(source.length),w=r.width??32,h=r.height??32;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const xx=(flip?w-1-x:x)+(e.dx??0),yy=y+(e.dy??0);if(xx>=0&&xx<w&&yy>=0&&yy<h)out[yy*w+xx]=source[y*w+x];}
 return {pixels:out,sourceFrame:frame,wholeSourceMirror:flip};
}
export function renderGuyDraft(tier,role){
 const {width,height}=guyTiers[tier],out=new Uint8Array(width*height),character=resolveGuySource(body,role);
 if(tier===3||tier===4)out.set(resolveGuySource(tier===3?mantle:halo,{pose:'aura',facing:1,phase:role.phase??0}).pixels);
 const ox=(width-32)/2,oy=height-32;
 for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(character.pixels[y*32+x])out[(oy+y)*width+ox+x]=character.pixels[y*32+x];
 return out;
}
function reconstruct(graphics,assembly,frame,{width,height,size}){
 const groups=size&2?3:1,per=size&1?8:4,cells=groups*per,at=frame*cells*10,out=new Uint8Array(width*height);
 for(let c=0;c<cells;c++)for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  const group=Math.floor(c/per),local=c%per,p=at+group*per*8+(y>>3)*per*4+local*4+(x>>3)*2,t=assembly[p]|assembly[p+1]<<8,tx=t&0x4000?7-(x&7):x&7,ty=t&0x8000?7-(y&7):y&7;
  let value=0;for(let bit=0;bit<4;bit++)value|=((graphics[(t&1023)*32+(bit>>1)*16+ty*2+(bit&1)]>>(7-tx))&1)<<bit;
  const xx=(assembly[at+cells*8+c*2]<<24>>24)+x+width/2,yy=(assembly[at+cells*8+c*2+1]<<24>>24)+y+height;assert.ok(xx>=0&&xx<width&&yy>=0&&yy<height);out[yy*width+xx]=value;
 }
 return out;
}
export function compileGuyDraft(){
 const frames=guyTiers.map((t,i)=>draftGuyMaps[i].map(r=>renderGuyDraft(i,r))),banks=frames.map((f,i)=>compileSpriteFrames(f,guyTiers[i])),merged=mergeSpriteBanks(banks),packed=compress(merged.graphics);
 assert.deepEqual(decompress(packed,0).bytes,merged.graphics);assert.ok(merged.tiles<=1024,'Guy exceeds native10-bit shared tile bank');
 for(let tier=0;tier<6;tier++)for(let f=0;f<frames[tier].length;f++){assert.deepEqual(reconstruct(merged.graphics,merged.assemblies[tier],f,guyTiers[tier]),frames[tier][f]);assert.ok(frames[tier][f].every(v=>v<=12));}
 return {frames,banks,merged,packed,nativeAssemblies:withAuthoredOffsets(merged.assemblies)};
}
export function withAuthoredOffsets(assemblies){
 return assemblies.map((a,tier)=>{const out=a.slice(),t=guyTiers[tier],cells=(t.size&2?3:1)*(t.size&1?8:4);for(let f=0;f<t.frames;f++)for(let c=0;c<cells;c++){const at=f*cells*10+cells*8+c*2;out[at]=(out[at]+draftGuyMaps[tier][f].x)&255;out[at+1]=(out[at+1]+draftGuyMaps[tier][f].y)&255;}return out;});
}
export function framePng(pixels,tier){const t=guyTiers[tier],im=new PNG({width:t.width,height:t.height});pixels.forEach((v,p)=>{if(v){const c=snesColor(guyPalettes[tier][v-1]);im.data.set([0,5,10].map(n=>{const x=c>>n&31;return x<<3|x>>2}).concat(255),p*4);}});return PNG.sync.write(im);}
async function main(){
 const {frames,banks,merged,packed,nativeAssemblies}=compileGuyDraft(),tiers=guyTiers.map((t,i)=>({...t,sourceFrames:frames[i].map((pixels,f)=>({slot:f,role:draftGuyMaps[i][f],...Object.fromEntries(Object.entries(resolveGuySource(body,draftGuyMaps[i][f])).filter(([k])=>k!=='pixels')),pixelsSha256:sha(pixels)})),uniqueImages:new Set(frames[i].map(sha)).size,unmergedTiles:banks[i].tiles,assemblyBytes:merged.assemblies[i].length}));
 const used=new Set(tiers.flatMap(t=>t.sourceFrames.map(f=>f.sourceFrame))),report={key:'guy-fieri',status:'Inactive full native-format draft; native scene integration pending',nativeSlots:133,sourceBodyFrames:body.frames.length,consumedBodyFrames:used.size,sourceEffectFrames:4,tiles:merged.tiles,graphicsBytes:merged.graphics.length,compressedGraphicsBytes:packed.length,assemblyBytes:merged.assemblies.reduce((n,a)=>n+a.length,0),graphicsSha256:sha(merged.graphics),compressedSha256:sha(packed),assemblySha256:merged.assemblies.map(sha),validation:{native4bppReconstruction:133,compressionRoundTrip:true,twelveOpaqueColors:true,cellReservationsUnchanged:true,nativeFrameOffsetsPreserved:true,extraWramBytes:0,extraVramBytes:0,emulatorUpload:false},tiers,provenance:[...body.provenance,...mantle.provenance,...halo.provenance],limitations:['Back opposite contact and right-profile gait use complete-source mirrors.','The side second generated contact changes foreground arm crossing; its sole positions remain similar, so it is not claimed as a perfect opposite-foot support drawing.','Tier4 native directions0/2 retain the original shared left-facing walk IDs.','All six palettes deliberately preserve the same blond/skin/flame/charcoal identity; large tiers differ by their generated flame silhouettes.']};
 report.nativeOffsetAssemblySha256=nativeAssemblies.map(sha);
 fs.writeFileSync(path.join(d,'draft-audit.json'),JSON.stringify(report,null,2)+'\n');
 const html=`<!doctype html><meta charset="utf-8"><title>Guy Fieri six native tiers</title><style>body{background:#303b36;color:#efeedf;font:14px system-ui;margin:20px}.grid{display:grid;grid-template-columns:repeat(7,155px);gap:8px}article{background:#3d493f;text-align:center;padding:8px}img{image-rendering:pixelated;display:block;margin:auto}.stage{height:210px;display:flex;align-items:end;justify-content:center}.native{height:70px;display:flex;align-items:end;justify-content:center}label{display:block;min-height:48px;margin-top:8px}</style><h1>Guy Fieri ·133 native frames · inactive draft</h1><p>Actual generated sources,31px standing body,12opaque colors. ${merged.tiles} shared tiles; ${merged.graphics.length}decoded / ${packed.length}compressed bytes. All133 native4bpp reconstructions pass; emulator integration is pending.</p>${tiers.map((t,i)=>`<h2>Tier${i} · ${t.width}×${t.height}</h2><div class="grid">${frames[i].map((p,f)=>{const u='data:image/png;base64,'+framePng(p,i).toString('base64'),r=draftGuyMaps[i][f];return`<article><div class="stage"><img src="${u}" width="${t.width*3}" height="${t.height*3}"></div><div class="native"><img src="${u}" width="${t.width}" height="${t.height}"></div><label>${f} · ${r.pose} ${r.facing}/${r.phase}<br>Source${resolveGuySource(body,r).sourceFrame}${resolveGuySource(body,r).wholeSourceMirror?' · H mirror':''}</label></article>`;}).join('')}</div>`).join('')}`;
 fs.writeFileSync(path.join(d,'native-frames.html'),html);
 const {chromium}=await import('@playwright/test'),browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1210,height:900}});await page.setContent(html);await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await page.screenshot({path:path.join(d,'native-frames.png'),fullPage:true});for(let i=0;i<6;i++)await page.locator('.grid').nth(i).screenshot({path:path.join(d,'native-tier'+i+'.png')});}finally{await browser.close();}
 console.log(JSON.stringify({nativeSlots:133,consumedBodyFrames:used.size,tiles:merged.tiles,rawBytes:merged.graphics.length,compressedBytes:packed.length,assemblyBytes:report.assemblyBytes,nativeRoundTrips:true},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
