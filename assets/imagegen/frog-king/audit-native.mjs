// Read-only Frog King audit. Writes only this inactive package and private QA.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {u16, u24} from '../../../engine/rom.js';
import {cartridgeOffset} from '../../../engine/expanded-rom.js';
import {decompress} from '../../../engine/compression.js';
import {spriteHeaders} from '../../../engine/native-sprites.js';
import {nativeSpriteBank, nativeSpriteCells, nativeSpriteAtlas} from '../../../scripts/native-sprite-view.mjs';
import {readEnemyAI} from '../../../engine/enemy-ai.js';
import {decode} from '../../../engine/text.js';

const dir='assets/imagegen/frog-king', qa='.local/qa/frog-king-audit-417914abe589';
const baselinePath='.local/qa/next-family-417914abe589/baseline.sfc';
const manifestPath='.local/qa/next-family-417914abe589/manifest.json';
const originalPath='.local/chrono-trigger-usa.sfc';
const rom=new Uint8Array(await readFile(baselinePath));
const original=new Uint8Array(await readFile(originalPath));
const manifest=JSON.parse(await readFile(manifestPath));
const sha=b=>createHash('sha256').update(b).digest('hex');
const ids=Array.from({length:256},(_,i)=>i);
assert.equal(sha(rom),'417914abe589d25e377b774009f983867c14617cbf7a7f176c52691c8c9f2e35');
assert.equal(sha(original),'06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9');
await mkdir(dir+'/review',{recursive:true});
await mkdir(qa,{recursive:true});
const headers=spriteHeaders(rom), oldHeaders=spriteHeaders(original);
const describe=(r,h)=>({kind:h.kind,id:h.id,header:[...r.slice(h.offset,h.offset+(h.kind==='enemy'?10:5))],name:h.kind==='enemy'?decode(r.slice(0xc6500+h.id*11,0xc650b+h.id*11)):null});
function ownership(r,field,id){
  const table=[0x242000,0x242300,0x242a00,0x242600][field];
  const pointer=i=>field<2?u24(r,table+i*3):u16(r,table+i*2);
  const aliases=ids.filter(i=>pointer(i)===pointer(id));
  return {field,id,pointer:pointer(id),aliases,owners:spriteHeaders(r).filter(h=>aliases.includes(r[h.offset+field])).map(h=>describe(r,h))};
}
function packet(r,id){
  const pointer=u24(r,0x242000+id*3), offset=cartridgeOffset(pointer,r), d=decompress(r,offset);
  return {pointer,offset,decodedBytes:d.bytes.length,compressedBytes:d.length,sha256:sha(d.bytes)};
}
const owners=headers.filter(h=>rom[h.offset]===193).map(h=>describe(rom,h));
assert.deepEqual(owners.map(o=>[o.kind,o.id]),[['enemy',174]]);
assert.deepEqual(owners[0].header,[193,133,225,61,1,0,224,12,12,17]);
const asmOffset=cartridgeOffset(u24(original,0x242300+133*3),original);
const asmEnd=Math.min(...ids.map(i=>cartridgeOffset(u24(original,0x242300+i*3),original)).filter(p=>p>asmOffset));
const frames=(asmEnd-asmOffset)/80;
assert.equal(frames,13);
const bank=nativeSpriteBank(rom,{gfx:193,asm:133,palette:225,size:1,frames});
const old=nativeSpriteBank(original,{gfx:193,asm:133,palette:225,size:1,frames});
assert.deepEqual(bank.graphics,old.graphics);
assert.deepEqual(bank.assembly,old.assembly);
assert.deepEqual(bank.nativeColors,old.nativeColors);
const graphics=packet(rom,193), streamTable=manifest.resources.npcGraphicsStreaming.table;
const paletteOffset=0x240000+u16(rom,0x242a00+225*2);
const fp=0x240000+u16(rom,0x242600+61*2), fe=0x240000+u16(rom,0x242600+62*2);
const dp=0x240000+u16(rom,0x242800+61*2), de=0x240000+u16(rom,0x242800+62*2);
const frameBytes=rom.slice(fp,fe), allocatedDurationBytes=rom.slice(dp,de), stride=frameBytes.length/4;
assert.equal(stride,4);
assert.deepEqual(frameBytes,original.slice(fp,fe));
assert.deepEqual(allocatedDurationBytes,original.slice(dp,de));
const durationBytes=allocatedDurationBytes.slice(0,stride);
const lists=Array.from({length:4},(_,facing)=>({facing,action:0,steps:[{frame:frameBytes[facing*stride],duration:durationBytes[0]}],cycleTicks:durationBytes[0]}));
assert.ok(lists.every(l=>l.steps[0].frame===0&&l.steps[0].duration===16));
const durationAliases=ids.filter(i=>u16(rom,0x242800+i*2)===u16(rom,0x242800+61*2));
const atlas=nativeSpriteAtlas(bank);
const nativeFrames=Array.from({length:frames},(_,frame)=>{
  const cells=nativeSpriteCells(bank,frame), points=new Map();
  for(const c of cells)for(let i=0;i<256;i++)if(c.pixels[i]){const k=[c.x+i%16,c.y+(i>>4)].join(',');if(!points.has(k))points.set(k,c.pixels[i]);}
  const xy=[...points.keys()].map(k=>k.split(',').map(Number)), xs=xy.map(p=>p[0]), ys=xy.map(p=>p[1]);
  return {frame,cellOrigins:cells.map(c=>[c.x,c.y]),cellOpaquePixels:cells.map(c=>c.pixels.filter(Boolean).length),bounds:points.size?[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs)+1,Math.max(...ys)-Math.min(...ys)+1]:null,opaquePixels:points.size,pixelSha256:sha(atlas.images[frame])};
});
const ownershipAudit=[[0,193],[1,133],[2,225],[3,61]].map(([field,id])=>({field,id,current:ownership(rom,field,id),original:ownership(original,field,id)}));
const ai=readEnemyAI(rom,174), oldAI=readEnemyAI(original,174);
const aiBytes=rom.slice(ai.start,ai.start+ai.bytes);
assert.deepEqual(aiBytes,original.slice(oldAI.start,oldAI.start+oldAI.bytes));
const report={status:'Read-only inactive Frog King source audit; no generation',activation:false,generationStarted:false,
  baseline:{path:baselinePath,sha256:sha(rom)},original:{path:originalPath,sha256:sha(original)},
  evidence:{manifest:{path:manifestPath,sha256:sha(await readFile(manifestPath))}},
  family:{gfx:193,asm:133,palettes:[225],animation:61,size:1,fullSizeFlags:1,cells:8,frames},owners,ownership:ownershipAudit,
  resources:{graphics:{current:graphics,original:packet(original,193),unchanged:true},assembly:{offset:asmOffset,extent:asmEnd-asmOffset,sha256:sha(bank.assembly),unchanged:true},compressedPlusAssemblyBytes:graphics.compressedBytes+asmEnd-asmOffset,originalDecodedCeiling:graphics.decodedBytes,streamPointer:u24(rom,streamTable+193*3),nativeHeapLimit:32768},
  palettes:[{id:225,offset:paletteOffset,words:bank.nativeColors,colors:bank.palette.map(rgb=>rgb.map(v=>v.toString(16).padStart(2,'0')).join('')),sha256:sha(rom.slice(paletteOffset,paletteOffset+24)),unchanged:true}],
  animation:{id:61,frameOffset:fp,frameBytes:[...frameBytes],frameSha256:sha(frameBytes),durationOffset:dp,durationBytes:[...durationBytes],allocatedDurationBytes:[...allocatedDurationBytes],allocatedDurationSha256:sha(allocatedDurationBytes),stride,lists,referencedFrames:[0],durationPointerAliases:durationAliases,durationAliasOwners:headers.filter(h=>durationAliases.includes(rom[h.offset+3])).map(h=>describe(rom,h)),unchanged:true,note:'AA61 is a shared one-frame hold. Other source poses use direct event frame commands; no invented AA timing is assigned. Preserve the five-byte native duration reservation, including its byte after the four-byte consumed stride.'},
  ai:{id:174,offset:ai.start,bytes:ai.bytes,sha256:sha(aiBytes),unchanged:true,statsSha256:sha(rom.slice(0xc4700+174*23,0xc4700+175*23)),rewardsSha256:sha(rom.slice(0xc5e00+174*7,0xc5e00+175*7))},
  geometry:{atlasWidth:atlas.width,atlasHeight:atlas.height,origin:atlas.origin,frames:nativeFrames},
  limitations:['This audit records source ownership and pixels, not native display or scene execution.','The existing Frog King story identity is separate from King Harold and the small frog guards. No names, dialogue or cast are changed.','Full current event decoding and direct-frame consumer analysis are recorded separately.']};
await writeFile(dir+'/native-audit.json',JSON.stringify(report,null,2)+'\n');
for(const scale of[1,4]){
  const p=new PNG({width:4*atlas.width*scale,height:Math.ceil(frames/4)*atlas.height*scale});
  for(let n=0;n<p.data.length;n+=4)p.data.set([38,50,56,255],n);
  for(let f=0;f<frames;f++)for(let k=0;k<atlas.images[f].length;k++){
    const v=atlas.images[f][k];if(!v)continue;
    const x=f%4*atlas.width+k%atlas.width,y=Math.floor(f/4)*atlas.height+(k/atlas.width|0);
    for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++)p.data.set([...bank.palette[v-1],255],((y*scale+yy)*p.width+x*scale+xx)*4);
  }
  await writeFile(dir+'/review/original-palette225-'+scale+'x.png',PNG.sync.write(p));
}
const events=[];
for(let location=0;location<512;location++){
  const eventId=u16(rom,0x360008+location*14);
  try{const offset=cartridgeOffset(u24(rom,0x3cf9f0+eventId*3),rom),decoded=decompress(rom,offset),originalEventId=u16(original,0x360008+location*14),originalOffset=cartridgeOffset(u24(original,0x3cf9f0+originalEventId*3),original),ob=decompress(original,originalOffset).bytes;
    events.push({location,eventId,offset,bytes:Buffer.from(decoded.bytes).toString('base64'),originalBytes:Buffer.from(ob).toString('base64'),decodedSha256:sha(decoded.bytes),originalPacketUnchanged:sha(decoded.bytes)===sha(ob)});
  }catch(error){events.push({location,eventId,error:String(error.message)});}
}
await writeFile(qa+'/current-events.json',JSON.stringify(events)+'\n');
console.log(JSON.stringify({family:report.family,owners,resources:report.resources,animation:{ownerCount:ownershipAudit[3].current.owners.length,stride,lists},geometry:report.geometry,events:{decoded:events.filter(e=>!e.error).length,errors:events.filter(e=>e.error).length}},null,2));
