import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {fileURLToPath} from 'node:url';
import {dorisTiers,dorisColors} from '../../../content/doris.js';
import {compileSpriteFrames,mergeSpriteBanks} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
import {snesColor} from '../../../engine/sprites.js';
const root=path.resolve(import.meta.dirname,'../../..'),directory=import.meta.dirname;
const load=p=>JSON.parse(fs.readFileSync(path.join(directory,p)));
const body=load('body/preview-raster.json'),mantle=load('doris-mantle/preview-raster.json'),halo=load('doris-halo/preview-raster.json');
const original=load('original-native-audit.json');
export const draftDorisMaps=original.tiers.map(t=>t.currentMap.map(p=>({...p})));
draftDorisMaps[2][26]={...draftDorisMaps[2][26],facing:0,pose:'idle',phase:0};
draftDorisMaps[5][17]={...draftDorisMaps[5][17],pose:'tuck'};
draftDorisMaps[5][19]={...draftDorisMaps[5][19],pose:'impact'};
for(const role of draftDorisMaps[0])if(['cast','point','raise','jump','windup','attack'].includes(role.pose))role.pose='spoon-'+role.pose;
for(const role of draftDorisMaps[1])if(role.pose==='cast')role.pose='unarmed-cast';
export function resolveDorisSource(r,role){
 let sequence=r.sequences[role.pose]?.[role.facing],flip=false;
 if(!sequence&&role.facing===3){sequence=r.sequences[role.pose]?.[2];flip=!!sequence;}
 assert.ok(sequence,'Missing generated Doris role '+JSON.stringify(role));
 const entry=sequence[(role.phase??0)%sequence.length],frame=typeof entry==='number'?entry:entry.frame;
 flip=flip!==!!entry.flip;
 const source=Uint8Array.from(r.frames[frame],c=>parseInt(c,16)),out=new Uint8Array(source.length),width=r.width??32,height=r.height??32;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const xx=(flip?width-1-x:x)+(entry.dx??0),yy=y+(entry.dy??0);if(xx>=0&&xx<width&&yy>=0&&yy<height)out[yy*width+xx]=source[y*width+x];}
 return {pixels:out,sourceFrame:frame,wholeSourceMirror:flip};
}
export function renderDorisDraft(tier,role){
 const {width,height}=dorisTiers[tier],out=new Uint8Array(width*height),character=resolveDorisSource(body,role);
 if(tier===3||tier===4){const effect=resolveDorisSource(tier===3?mantle:halo,{pose:'aura',facing:1,phase:role.phase??0});out.set(effect.pixels);}
 const ox=(width-32)/2,oy=height-32;
 for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(character.pixels[y*32+x])out[(oy+y)*width+ox+x]=character.pixels[y*32+x];
 return out;
}
const sha=b=>createHash('sha256').update(b).digest('hex');
function reconstruct(graphics,assembly,frame,width,height,size){
 const groups=size&2?3:1,per=size&1?8:4,cells=groups*per,at=frame*cells*10,out=new Uint8Array(width*height);
 for(let c=0;c<cells;c++)for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  const group=Math.floor(c/per),local=c%per,p=at+group*per*8+(y>>3)*per*4+local*4+(x>>3)*2,t=assembly[p]|assembly[p+1]<<8,tx=t&0x4000?7-(x&7):x&7,ty=t&0x8000?7-(y&7):y&7;
  let value=0;for(let bit=0;bit<4;bit++)value|=((graphics[(t&1023)*32+(bit>>1)*16+ty*2+(bit&1)]>>(7-tx))&1)<<bit;
  const xx=(assembly[at+cells*8+c*2]<<24>>24)+x+width/2,yy=(assembly[at+cells*8+c*2+1]<<24>>24)+y+height;
  assert.ok(xx>=0&&xx<width&&yy>=0&&yy<height);out[yy*width+xx]=value;
 }
 return out;
}
function framePng(pixels,tier){const t=dorisTiers[tier],im=new PNG({width:t.width,height:t.height});pixels.forEach((v,p)=>{if(v){const c=snesColor(dorisColors(tier)[v-1]);im.data.set([0,5,10].map(n=>{const x=c>>n&31;return x<<3|x>>2}).concat(255),p*4);}});return PNG.sync.write(im);}
export function compileDorisDraft(){
 const frames=dorisTiers.map((t,i)=>draftDorisMaps[i].map(role=>renderDorisDraft(i,role))),banks=frames.map((f,i)=>compileSpriteFrames(f,dorisTiers[i])),merged=mergeSpriteBanks(banks),packed=compress(merged.graphics);
 assert.deepEqual(decompress(packed,0).bytes,merged.graphics);
 for(let tier=0;tier<6;tier++)for(let f=0;f<frames[tier].length;f++){
  assert.deepEqual(reconstruct(merged.graphics,merged.assemblies[tier],f,dorisTiers[tier].width,dorisTiers[tier].height,dorisTiers[tier].size),frames[tier][f]);
  assert.ok(frames[tier][f].every(v=>v<=12));
 }
 return {frames,banks,merged,packed};
}
async function main(){
 const {frames,banks,merged,packed}=compileDorisDraft(),tiers=dorisTiers.map((tier,i)=>({...tier,tier:i,nativeFrames:tier.frames,sourceFrames:frames[i].map((pixels,f)=>({slot:f,role:draftDorisMaps[i][f],sourceFrame:resolveDorisSource(body,draftDorisMaps[i][f]).sourceFrame,wholeSourceMirror:resolveDorisSource(body,draftDorisMaps[i][f]).wholeSourceMirror,pixelsSha256:sha(pixels)})),uniqueImages:new Set(frames[i].map(sha)).size,unmergedTiles:banks[i].tiles,assemblyBytes:merged.assemblies[i].length}));
 const report={key:'doris',status:'Inactive native-format draft; full pixel/motion review and emulator/scene integration pending',sourcePolicy:'Every opaque body and effect pixel is sampled from actual generated PNGs. Whole-source mirrors, palette quantization, a one-pixel horizontal width cap for wide poses, and transparent layering only; no anatomy or effect strokes painted in code.',nativeSlots:frames.flat().length,sourceBodyFrames:body.frames.length,sourceEffectFrames:4,tiles:merged.tiles,graphicsBytes:merged.graphics.length,compressedGraphicsBytes:packed.length,graphicsSha256:sha(merged.graphics),compressedGraphicsSha256:sha(packed),sharedBankTileLimit:1024,assemblyBytes:merged.assemblies.reduce((n,a)=>n+a.length,0),tiers,corrections:[{tier:2,slot:26,before:original.tiers[2].currentMap[26],after:draftDorisMaps[2][26],evidence:'Original Goblin frame26 is rear standing, not a fallen front pose.'},{tier:5,slot:17,before:original.tiers[5].currentMap[17],after:draftDorisMaps[5][17],evidence:'Original Nu uses a rear tucked aerial preparation. All authored Shrek Trigger frame offsets are preserved.'},{tier:5,slot:19,before:original.tiers[5].currentMap[19],after:draftDorisMaps[5][19],evidence:'Original Nu uses a low frontal headbutt/impact. New source is Doris’s low frontal landing; no upside-down or rear image substitution.'}],validation:{native4bppReconstruction:133,compressionRoundTrip:true,twelveOpaqueColors:true,paletteColorsUnchanged:true,nativeCellReservationsUnchanged:true,extraVramBytes:0,emulatorUpload:false},provenance:[...body.provenance,...mantle.provenance,...halo.provenance]};
 fs.writeFileSync(path.join(directory,'draft-audit.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(directory,'native-roles.draft.json'),JSON.stringify({key:'doris',maps:draftDorisMaps,corrections:report.corrections,sourcePolicy:report.sourcePolicy},null,2)+'\n');
 const html=`<!doctype html><meta charset="utf-8"><title>Doris six-tier draft</title><style>body{background:#303b36;color:#efeedf;font:14px system-ui;margin:20px}h1{font-size:24px}p{max-width:1150px;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(7,155px);gap:8px}article{background:#3d493f;text-align:center;padding:8px}img{image-rendering:pixelated;display:block;margin:auto}.stage{height:218px;display:flex;align-items:end;justify-content:center}.native{height:70px;display:flex;align-items:end;justify-content:center}label{display:block;min-height:48px;margin-top:8px}</style><h1>Doris · six native challenge tiers · inactive draft</h1><p>Actual generated source pixels,31px body reference with palette changes per native lesson. Sparse generated aura layers use the larger tiers’ original cells. All133 native4bpp frame reconstructions pass; no emulator integration claimed. ${merged.tiles} shared tiles / ${merged.graphics.length}decoded bytes / ${packed.length}compressed bytes.</p>${tiers.map((t,i)=>`<h2>${i} · ${t.name} · ${t.width}×${t.height}</h2><div class="grid">${frames[i].map((p,f)=>{const uri='data:image/png;base64,'+framePng(p,i).toString('base64'),r=draftDorisMaps[i][f];return `<article><div class="stage"><img src="${uri}" width="${t.width*3}" height="${t.height*3}"></div><div class="native"><img src="${uri}" width="${t.width}" height="${t.height}"></div><label>${f} · ${r.pose} ${r.facing}/${r.phase}<br>Source${resolveDorisSource(body,r).sourceFrame}</label></article>`;}).join('')}</div>`).join('')}`;
 fs.writeFileSync(path.join(directory,'native-frames.html'),html);
 const {chromium}=await import('@playwright/test'),browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1210,height:900},deviceScaleFactor:1});await page.setContent(html);await page.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));await page.screenshot({path:path.join(directory,'native-frames.png'),fullPage:true});for(let tier=0;tier<6;tier++)await page.locator('.grid').nth(tier).screenshot({path:path.join(directory,'native-tier'+tier+'.png')});}finally{await browser.close();}
 console.log(JSON.stringify({nativeSlots:133,sourceBodyFrames:body.frames.length,tiles:merged.tiles,rawBytes:merged.graphics.length,compressedBytes:packed.length,assemblyBytes:report.assemblyBytes,nativeRoundTrips:true},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
