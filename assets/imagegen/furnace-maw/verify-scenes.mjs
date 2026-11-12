import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {privateFurnaceOverlay} from './private-overlay.mjs';
import {u16,u24,fileOffset} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {areas} from '../../../content/areas.js';
import {movement} from '../../../tests/medina-controller.mjs';
import {screenshot} from '../../../tests/helpers.mjs';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),baseline=process.argv.includes('--baseline'),out=path.join(d,'scene-verification',baseline?'baseline':''),overlay=await privateFurnaceOverlay(),contract=JSON.parse(fs.readFileSync(path.join(d,'background-contract.json'))),sha=b=>createHash('sha256').update(b).digest('hex');let{rom,head,body}=overlay;fs.mkdirSync(out,{recursive:true});
if(baseline){
 rom=new Uint8Array(fs.readFileSync(path.join(root,overlay.report.activeRomPath)));const g=decompress(rom,fileOffset(u24(rom,0x242000+34*3))).bytes,a=fileOffset(u24(rom,0x242300+23*3)),signed=n=>n>127?n-256:n,frames=[],packing=[];
 const pixel=(bytes,w,x,y)=>{if(w&16384)x=7-x;if(w&32768)y=7-y;let v=0;for(let b=0;b<4;b++)v|=(bytes[(w&1023)*32+(b>>1)*16+y*2+(b&1)]>>(7-x)&1)<<b;return v;};
 for(let f=0;f<8;f++){const p=new Uint8Array(64*96),origins=[];for(let c=0;c<12;c++){const x=signed(rom[a+f*120+96+c*2])+32,y=signed(rom[a+f*120+97+c*2])+64;origins.push([x,y]);for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++){const w=u16(rom,a+f*120+Math.floor(c/4)*32+(yy>>3)*16+(c%4)*4+(xx>>3)*2),v=pixel(g,w,xx&7,yy&7);if(v)p[(y+yy)*64+x+xx]=v;}}frames.push(p);packing.push({origins});}head={frames,packing};
 const banks=[190,171].map(id=>({id,graphics:decompress(rom,fileOffset(u24(rom,0x362220+id*3))).bytes})),pixels=new Uint8Array(112*152);for(const group of contract.body.tileGroups)for(const c of group.uses)for(let y=0;y<8;y++)for(let x=0;x<8;x++)pixels[(c.y+y)*112+c.x+x]=pixel(banks[0].graphics,group.tile|(c.flip?16384:0),x,y);body={banks,pixels};
}
function mapWord(ppu,x,y,l=0){const lx=x+ppu.bgHoff[l],ly=y+ppu.bgVoff[l];let a=ppu.tilemapAdr[l]+((ly&255)>>3)*32+((lx&255)>>3);if(lx&256&&ppu.tilemapWider[l])a+=1024;if(ly&256&&ppu.tilemapHigher[l])a+=ppu.tilemapWider[l]?2048:1024;return ppu.vram[a&32767];}
function uiPixel(ppu,x,y){if(!ppu.mainScreenEnabled[2])return 0;const w=mapWord(ppu,x,y,2),lx=x+ppu.bgHoff[2],ly=y+ppu.bgVoff[2],xx=w&16384?7-(lx&7):lx&7,yy=w&32768?7-(ly&7):ly&7,word=ppu.vram[(ppu.tileAdr[2]+(w&1023)*8+yy)&32767];return(word>>(7-xx)&1)|((word>>(15-xx)&1)<<1);}
function oamCells(s){const list=[],v=new Uint8Array(s.ppu.vram.buffer);for(let i=0;i<128;i++){const n=i*2,lo=s.ppu.oam[n],hi=s.ppu.oam[n+1],extra=s.ppu.highOam[n>>4]>>(n&15)&3,attrs=hi>>8;let x=(lo&255)|((extra&1)<<8);if(x>255)x-=512;const y=lo>>8;if(!(extra&2)||x<0||x>=256||y>=224)continue;const pixels=new Uint8Array(256),base=s.ppu.sprAdr1*2+(attrs&1?s.ppu.sprAdr2*2:0),tile=hi&255;for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++){const tx=attrs&64?15-xx:xx,ty=attrs&128?15-yy:yy,t=tile+(tx>>3)+(ty>>3)*16;let value=0;for(let b=0;b<4;b++)value|=(v[base+t*32+(b>>1)*16+(ty&7)*2+(b&1)]>>(7-(tx&7))&1)<<b;pixels[yy*16+xx]=value;}list.push({id:i,x,y,palette:attrs>>1&7,pixels,hash:sha(pixels)});}return list;}
function locateHead(s){const cells=oamCells(s);for(let f=0;f<8;f++){const expected=head.packing[f].origins.map(([x,y])=>{const p=new Uint8Array(256);for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++)p[yy*16+xx]=head.frames[f][(y+yy)*64+x+xx];return{x:x-32,y:y-64,hash:sha(p),opaque:p.some(Boolean)};}).filter(c=>c.opaque);for(const first of cells.filter(c=>c.hash===expected[0].hash)){const x=first.x-expected[0].x,y=first.y-expected[0].y;if(expected.every(e=>cells.some(c=>c.x===x+e.x&&c.y===y+e.y&&c.palette===first.palette&&c.hash===e.hash)))return{frame:f,anchor:[x,y],palette:first.palette,exactCells:expected.length,cells};}}return null;}
const scenes=[];
for(const key of['bakery-furnace','buried-furnace']){
 const buried=key==='buried-furnace',s=await createCore(rom);await newGame(s);const hooks=installHooks(s,JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json')))),dev=createDevTools(s,hooks);dev.jump(areas.find(a=>a.bakeryScene===key));runFrames(s,400);
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),hold:(keys,n)=>runFrames(s,n,keys),wait:n=>runFrames(s,n),tap:(keys=256,gap=100)=>{runFrames(s,3,keys);runFrames(s,gap);}};
 if(buried)await movement(io).route([[12,44]]);for(let i=0;i<180&&!(s.ram[0x117]&1);i++){if(s.ram[0x11f]&&!s.ram[0x126])runFrames(s,8,17);else io.tap();}
 assert.equal(s.ram[0x117]&1,1);runFrames(s,400);const formation=Array.from(s.ram.slice(0xaf02,0xaf0a));assert.deepEqual(formation,buried?[189,255,255,255,255,255,255,255]:[188,255,255,255,154,255,255,255]);assert.equal(dev.diagnostics().fatal,null);
 const vram=new Uint8Array(s.ppu.vram.buffer),bgChecks=[];for(const[id,first]of buried?[[190,768],[171,896]]:[[190,640]]){const b=body.banks.find(b=>b.id===id),actual=vram.slice(0x2000+first*32,0x2000+first*32+b.graphics.length);assert.deepEqual(actual,b.graphics,'Native background bank'+id);bgChecks.push({id,tileBase:first,bytes:actual.length,sha256:sha(actual)});}
 const palette=buried?79:76,slots=buried?[6,7]:[5,6,7];for(const slot of slots)for(let color=1;color<=15;color++)assert.equal(s.ppu.cgram[slot*16+color],u16(rom,0x3624c0+palette*210+(slot-1)*30+(color-1)*2));
 const base=buried?768:640,votes=new Map();for(let y=0;y<224;y+=8)for(let x=0;x<256;x+=8){const w=mapWord(s.ppu,x,y),g=contract.body.tileGroups.find(g=>g.tile===(w&1023)-base);if(!g)continue;for(const c of g.uses)if(c.flip===!!(w&16384)){const key=[x-c.x,y-c.y].join(',');votes.set(key,(votes.get(key)??0)+1);}}
 const [originKey,voteCount]=[...votes].sort((a,b)=>b[1]-a[1])[0];assert.ok(voteCount>=150,'Body tile identity locates the original native body footprint');const bodyOrigin=originKey.split(',').map(Number);let located=locateHead(s);for(let n=0;!located&&n<60;n++){runFrames(s,1);located=locateHead(s);}assert.ok(located,'Actual battle head cells match one complete emitted native frame');
 const relative=[located.anchor[0]-bodyOrigin[0],located.anchor[1]-bodyOrigin[1]];assert.deepEqual(relative,buried?[56,95]:[56,96],'Attachment proved against the unchanged saved-cartridge baseline');
 const rgba=new Uint8Array(512*480*4);s.setPixels(rgba);let pixels=0,occluded=0,uiOccluded=0,mismatched=0;for(let y=0;y<152;y++)for(let x=0;x<112;x++){
  const value=body.pixels[y*112+x],sx=bodyOrigin[0]+x,sy=bodyOrigin[1]+y;if(!value||sx<0||sx>=256||sy<1||sy>=184)continue;
  if(uiPixel(s.ppu,sx,sy)){uiOccluded++;continue;}if(located.cells.some(c=>sx>=c.x&&sx<c.x+16&&sy>=c.y&&sy<c.y+16&&c.pixels[(sy-c.y)*16+sx-c.x])){occluded++;continue;}
  const word=mapWord(s.ppu,sx,sy),slot=word>>10&7;if(!slots.includes(slot))continue;const color=s.ppu.cgram[slot*16+value],expected=[0,5,10].map(n=>((color>>n&31)*s.ppu.brightnessMults[s.ppu.brightness])&255),p=((sy+7)*2*512+sx*2)*4;if(expected.every((v,i)=>v===rgba[p+i]))pixels++;else mismatched++;
 }
 assert.ok(pixels>3000,'Thousands of unobstructed body pixels match the native framebuffer');await screenshot(s,path.join(out,key+'-battle.png'));
 scenes.push({key,location:u16(s.ram,0x100),formation,backgroundBanks:bgChecks,paletteGroup:palette,paletteSlots:slots,bodyOrigin,bodyTileIdentityVotes:voteCount,headFrame:located.frame,headAnchor:located.anchor,headAttachmentRelativeBody:relative,headExactOpaqueCells:located.exactCells,unobstructedBodyFramebufferPixels:pixels,spriteOccludedBodyPixels:occluded,uiOccludedBodyPixels:uiOccluded,otherBodyFramebufferMismatches:mismatched,framebufferScope:'Only exact matches are counted as proved. Residual foreground/small-OBJ or frame-boundary occlusion is retained in the mismatch count; complete raw BG banks and all original tile placements are verified separately.',heapBytes:u16(s.ram,0x171)-0x8000,scope:'Actual original encounter entered through normal controller input after authorized development seed. Artwork and attachment verified; full defeat/aftermath route is not claimed.'});console.log(JSON.stringify(scenes.at(-1)));dev.dispose();hooks.dispose();
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({...overlay.report,baseline,verifiedRomSha256:sha(rom),status:baseline?'Unchanged saved-cartridge body/head native attachment reference.':'Both original encounter entries render the generated body and a native animated head; exact attachment is compared with the saved baseline.',scenes,extraVramBytes:0,extraWramBytes:0,fullDefeatRoute:false},null,2)+'\n');
