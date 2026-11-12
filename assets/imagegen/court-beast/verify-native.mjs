// Bounded, private native-display proof. This reads the canonical build but
// writes only its own candidate/checkpoints/evidence and a separate manifest.
// It does not activate the source package or claim complete scene residency.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {PNG} from 'pngjs';
import {u16,u24,put16,put24,applyRecords,fileOffset} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {coalesceReclaimedPools} from '../../../engine/resource-pools.js';
import {ResourceAllocator} from '../../../engine/resource-allocation.js';
import {placeNpcGraphicsStreams,npcGraphicsStreamingCode} from '../../../engine/npc-graphics-streaming.js';
import {spriteHeaders} from '../../../engine/native-sprites.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {snapshot,restore} from '../../../engine/save.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {nativePixels} from './prepare-draft.mjs';

const folder='assets/imagegen/court-beast',arg=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];};
const out=arg('--out')??'.local/qa/court-beast-native-proof',baselinePath=arg('--rom')??'.local/shrek-trigger.sfc';
const expectedBaseline=arg('--sha256')??'511e120ca47aa4f9c61371d4ecd264d0b1848061a649ee16b162cfe3f6bb109c';
const hash=b=>createHash('sha256').update(b).digest('hex'),json=async p=>JSON.parse(await readFile(p));
const signed=n=>(n<<24)>>24,ptr=n=>{const b=new Uint8Array(3);put24(b,0,n);return b;};
const baseline=new Uint8Array(await readFile(baselinePath)),original=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc'));
assert.equal(hash(baseline),expectedBaseline,'Private proof baseline changed');
const frozen=await json(folder+'/freeze.json'),audit=await json(folder+'/native-resource-audit.json'),geometry=await json(folder+'/native-frame-map.draft.json');
for(const f of frozen.files)assert.equal(hash(await readFile(f.file)),f.sha256,'Frozen source changed: '+f.file);
assert.equal(hash(original),audit.sourceRomSha256);
const buildManifest=await readFile('dist/manifest.json'),buildRecords=await readFile('dist/patch-records.json');
const manifest=JSON.parse(buildManifest),oldRecords=JSON.parse(buildRecords),native=manifest.resources.npcGraphicsStreaming;
const graphics=new Uint8Array(await readFile(folder+'/graphics.4bpp')),compressed=new Uint8Array(await readFile(folder+'/graphics.ct-lz')),assembly=new Uint8Array(await readFile(folder+'/assembly.bin'));
const frames=nativePixels(await json(folder+'/preview-raster.json'));
assert.equal(graphics.length,18048);assert.equal(assembly.length,2480);assert.deepEqual(decompress(compressed,0).bytes,graphics);
assert.equal(u24(baseline,native.table+133*3),0,'Family must remain inactive in baseline');
for(const helper of native.helpers)assert.deepEqual(baseline.slice(helper.address,helper.address+helper.bytes),npcGraphicsStreamingCode(native.table|0xc00000,helper.kind));
assert.deepEqual(spriteHeaders(baseline).filter(h=>baseline[h.offset]===133).map(h=>[h.kind,h.id]),[['enemy',144],['enemy',199]]);
assert.equal(fileOffset(u24(baseline,0x242300+127*3)),manifest.courtBeasts.assemblyOffset);
assert.equal(manifest.courtBeasts.assemblyBytes,assembly.length);
assert.equal(decompress(baseline,manifest.courtBeasts.graphicsOffset).bytes.length,manifest.courtBeasts.graphicsBytes);

// Recover free spans only from the saved build's proved ownership inventory.
// Subtract every emitted record and aligned allocation reservation, including
// resources outside this family. No apparent padding becomes a new pool.
const spans=['reclaimedEvents','reclaimedSprites','reclaimedPackets','reclaimedDialogue','reclaimedMusic'].flatMap(k=>manifest.resources[k].map(p=>({next:p.offset,end:p.offset+p.length}))).concat(manifest.characters.flatMap(c=>[
  {next:c.sourceGraphicsOffset,end:c.sourceGraphicsOffset+c.sourceCapacity},
  {next:c.assembly.offset+c.assembly.bytes,end:c.assembly.offset+c.assembly.sourceBytes}
]));
let free=coalesceReclaimedPools(spans);
const occupied=[...oldRecords,...manifest.allocations.map(a=>({...a,length:a.label.startsWith('event ')?(a.length+7)&~7:(a.length+1)&~1}))];
for(const a of occupied){const end=a.offset+a.length;free=free.flatMap(p=>end<=p.next||a.offset>=p.end?[p]:[
  {next:p.next,end:Math.max(p.next,a.offset)},{next:Math.min(end,p.end),end:p.end}
].filter(p=>p.next<p.end));}
free=free.map(p=>({next:(p.next+1)&~1,end:p.end&~1})).filter(p=>p.next<p.end);
const allocator=new ResourceAllocator(free),packetOffset=allocator.allocate(compressed.length,'Private Court Beast compressed graphics');
const records=[{offset:packetOffset,bytes:compressed,label:'Private Court Beast compressed graphics'},
  {offset:0x242000+133*3,bytes:ptr(packetOffset|0xc00000),label:'Private Court Beast compressed pointer'},
  {offset:manifest.courtBeasts.assemblyOffset,bytes:assembly,label:'Private Court Beast native assembly'}];
const placement=placeNpcGraphicsStreams(baseline,records,[{offset:packetOffset,length:compressed.length,label:records[0].label}],[133],native.pools);
records.push(...placement.records,{offset:native.table+133*3,bytes:ptr(placement.streams[0].address),label:'Private Court Beast selected raw stream'});
for(const r of [records[0],...placement.records])assert.ok(!oldRecords.some(a=>r.offset<a.offset+a.length&&r.offset+r.bytes.length>a.offset),'New resource overlaps saved allocation');
const rom=applyRecords(baseline,records);
for(const h of [0xffdc,0x40ffdc]){put16(rom,h,65535);put16(rom,h+2,0);}
const sum=rom.reduce((n,b)=>(n+b)&65535,0);for(const h of [0xffdc,0x40ffdc]){put16(rom,h,sum^65535);put16(rom,h+2,sum);}
let changedBytes=0;
for(let i=0;i<rom.length;i++)if(rom[i]!==baseline[i]){changedBytes++;assert.ok(records.some(r=>i>=r.offset&&i<r.offset+r.bytes.length)||[0xffdc,0x40ffdc].some(p=>i>=p&&i<p+4),'Unowned candidate delta at '+i);}
const timing=[];
for(const table of [0x242600,0x242800]){
  const pointer=table+99*2,start=0x240000+u16(original,pointer),end=0x240000+u16(original,pointer+2);
  assert.ok(end>start);for(const r of [baseline,rom]){assert.deepEqual(r.slice(pointer,pointer+4),original.slice(pointer,pointer+4));assert.deepEqual(r.slice(start,end),original.slice(start,end));}
  timing.push({kind:table===0x242600?'directional frame lists':'shared native duration list',pointer,offset:start,bytes:end-start,sha256:hash(rom.slice(start,end)),values:[...rom.slice(start,end)]});
}
const owners=[];
for(const a of audit.actors){
  const hp=0x24f600+a.enemy*10,pp=0x240000+u16(rom,0x242a00+a.palette*2),palette=new Uint8Array(await readFile(folder+'/palette-'+a.palette+'.bin'));
  assert.deepEqual(rom.slice(hp,hp+10),original.slice(hp,hp+10));assert.deepEqual(baseline.slice(hp,hp+10),original.slice(hp,hp+10));
  assert.equal(hash(rom.slice(a.ai.offset,a.ai.offset+a.ai.bytes)),a.ai.sha256);
  assert.deepEqual(rom.slice(pp,pp+24),palette);assert.deepEqual(baseline.slice(pp,pp+24),palette);
  owners.push({key:a.key,enemy:a.enemy,palette:a.palette,paletteOffset:pp,paletteSha256:hash(palette),header:[...rom.slice(hp,hp+10)],ai:a.ai});
}
await mkdir(out,{recursive:true});await writeFile(path.join(out,'candidate.sfc'),rom);
const candidate={status:'Private bounded display candidate only',baseline:{path:baselinePath,sha256:hash(baseline),bytes:baseline.length,buildManifestSha256:hash(buildManifest),buildRecordsSha256:hash(buildRecords)},candidate:{path:path.join(out,'candidate.sfc'),sha256:hash(rom),bytes:rom.length,changedBytes},records:records.map(r=>({offset:r.offset,bytes:r.bytes.length,label:r.label,sha256:hash(r.bytes)})),graphics:{rawBytes:graphics.length,compressedBytes:compressed.length,assemblyBytes:assembly.length,stream:placement.streams[0]},nativeHelpersUnchanged:true,palettesUnchanged:true,headersUnchanged:true,aiUnchanged:true,timing,owners,scope:'Existing production native 8-cell enemy preview; source overrides only. No active integration, complete scene residency, encounter or combat claim.'};
await writeFile(path.join(out,'candidate.json'),JSON.stringify(candidate,null,2)+'\n');
if(process.argv.includes('--candidate-only')){console.log(JSON.stringify(candidate));process.exit(0);}

let s=await createCore(rom);
try{restore(s,await json(path.join(out,'bedroom.json')));console.log('Restored private candidate bedroom');}
catch{s=await createCore(rom);await newGame(s);await writeFile(path.join(out,'bedroom.json'),JSON.stringify(snapshot(s)));console.log('Created private candidate bedroom');}
const hooks=installHooks(s,await json('content/hooks.json')),dev=createDevTools(s,hooks),reports=[],samples=[];
function frameTiles(frame){
  const bytes=[];for(let i=0;i<32;i++){
    const t=u16(assembly,frame*80+i*2);for(let b of graphics.slice((t&1023)*32,(t&1023)*32+32)){
      if(t&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}bytes.push(b);
    }
  }return Uint8Array.from(bytes);
}
function spriteCells(){
  const result=[];
  for(let entry=0;entry<128;entry++){
    const i=entry*2,xy=s.ppu.oam[i],ta=s.ppu.oam[i+1],ex=ta>>8;let x=(xy&255)|((s.ppu.highOam[i>>4]>>(i&15)&1)<<8);if(x>255)x-=512;
    const y=xy>>8,size=s.ppu.spriteSizes[s.ppu.objSize+((s.ppu.highOam[i>>4]>>(i&15)&2)?8:0)]*8,tile=ta&255,pixels=new Uint8Array(size*size),addr=s.ppu.sprAdr1+(ex&1?s.ppu.sprAdr2:0);
    for(let py=0;py<size;py++)for(let px=0;px<size;px++){
      const xx=ex&64?size-1-px:px,yy=ex&128?size-1-py:py,t=(tile+(yy>>3)*16+(xx>>3))&255,w=s.ppu.vram[(addr+t*16+(yy&7))&32767],w2=s.ppu.vram[(addr+t*16+(yy&7)+8)&32767],shift=7-(xx&7);
      pixels[py*size+px]=(w>>shift&1)|((w>>(shift+8)&1)<<1)|((w2>>shift&1)<<2)|((w2>>(shift+8)&1)<<3);
    }result.push({entry,x,y,size,palette:(ex&14)>>1,priority:(ex&48)>>4,pixels});
  }return result;
}
try{
  for(const a of owners){
    dev.previewActor(a.key,0);runFrames(s,300);assert.equal(dev.diagnostics().fatal,null);assert.equal(dev.diagnostics().preview.object,15);
    const x=30,source=(s.ram[0x1200+x]<<16)|u16(s.ram,0x1280+x),heapEnd=u16(s.ram,0x171);
    assert.equal(source,placement.streams[0].address,'Native object selects frozen raw bank');assert.equal(u16(s.ram,0x1400+x),u16(rom,0x242a00+a.palette*2));
    const actor={key:a.key,enemy:a.enemy,palette:a.palette,source,isolatedPreviewHeapBytes:heapEnd-0x8000,actorOrigin:[200,143],frames:[]};
    for(let frame=0;frame<31;frame++){
      dev.previewFrame(frame);let wait=0;while(s.ram[0x1301+x]!==frame&&wait++<40)runFrames(s,1);assert.equal(s.ram[0x1301+x],frame);runFrames(s,8);
      const vramBase=u16(s.ram,0xd00+x)*32,vram=new Uint8Array(s.ppu.vram.buffer),expected=frameTiles(frame);assert.deepEqual(vram.slice(vramBase,vramBase+1024),expected,a.key+' exact native upload '+frame);
      const oam=spriteCells(),png=new PNG({width:512,height:480});s.setPixels(png.data);const entries=[];let opaquePixels=0;
      for(let c=0;c<8;c++){
        const p=frame*80+64+c*2,cx=200+signed(assembly[p]),cy=143+signed(assembly[p+1]),pixels=new Uint8Array(256),[ox,oy]=geometry.frames[frame].cellOrigins[c];
        for(let py=0;py<16;py++)for(let px=0;px<16;px++)pixels[py*16+px]=frames[frame][(oy+py)*64+ox+px];
        const found=oam.find(o=>o.x===cx&&o.y===cy&&o.size===16&&Buffer.from(o.pixels).equals(Buffer.from(pixels)));
        assert.ok(found,a.key+' frame '+frame+' displayed cell '+c+' at '+cx+','+cy);
        const expectedPalette=Array.from({length:12},(_,i)=>u16(rom,a.paletteOffset+i*2)),actualPalette=Array.from({length:12},(_,i)=>s.ppu.cgram[128+found.palette*16+i+1]);assert.deepEqual(actualPalette,expectedPalette,'Exact native palette owner');
        entries.push({cell:c,oamEntry:found.entry,x:cx,y:cy,palette:found.palette,priority:found.priority});
        for(let py=0;py<16;py++)for(let px=0;px<16;px++){
          const index=pixels[py*16+px];if(!index)continue;const sx=cx+px,sy=cy+py,p=((sy+8)*2*512+sx*2)*4,nativeColor=expectedPalette[index-1],mult=s.ppu.brightnessMults[s.ppu.brightness],rgb=[nativeColor&31,nativeColor>>5&31,nativeColor>>10&31].map(v=>(v*mult)&255);
          assert.deepEqual([...png.data.slice(p,p+3)],rgb,a.key+' frame '+frame+' displayed pixel '+sx+','+sy+' index '+index);opaquePixels++;
          samples.push({key:a.key,frame,x:sx,y:sy,index,palette:a.palette});
        }
      }
      const actualOpaque=frames[frame].reduce((n,k)=>n+(k!==0),0);assert.equal(opaquePixels,actualOpaque,'Every sampled source pixel displayed exactly once');assert.equal(dev.diagnostics().fatal,null);
      const filename=a.key+'-'+String(frame).padStart(2,'0')+'.png';await writeFile(path.join(out,filename),PNG.sync.write(png));
      actor.frames.push({frame,role:geometry.frames[frame].role,waitFrames:wait,extraSettleFrames:8,uploadSha256:hash(expected),opaquePixels,exactCells:entries,screenshot:filename});
    }
    reports.push(actor);dev.undo();console.log(a.key+': all 31 uploads, 248 native cells, exact visible pixels and palette passed');
  }
}finally{dev.dispose();hooks.dispose();}
assert.deepEqual(s.cart.data,rom,'Diagnostic never changed cartridge bytes');
for(const f of frozen.files)assert.equal(hash(await readFile(f.file)),f.sha256,'Proof modified frozen source');
assert.equal(hash(await readFile(baselinePath)),expectedBaseline,'Proof modified baseline');
await writeFile(path.join(out,'display-report.json'),JSON.stringify({status:'passed',core:'repository SNES JS native 65816/PPU',reports},null,2)+'\n');
await writeFile(path.join(out,'pixel-samples.json'),JSON.stringify(samples)+'\n');
// Contact sheets contain actual native framebuffer captures, downsampled by
// exact 2x integer selection. The dark unused final grid cell is not a pose.
for(const a of reports){
  const sheet=new PNG({width:800,height:336});
  for(let i=0;i<sheet.data.length;i+=4)sheet.data.set([25,25,30,255],i);
  for(const f of a.frames){const png=PNG.sync.read(await readFile(path.join(out,f.screenshot)));
    for(let y=0;y<80;y++)for(let x=0;x<96;x++){
      const src=(((80+y+8)*2)*png.width+(152+x)*2)*4,dst=((Math.floor(f.frame/8)*84+y)*sheet.width+f.frame%8*100+x)*4;
      sheet.data.set(png.data.subarray(src,src+4),dst);
    }
  }await writeFile(path.join(out,a.key+'-native-1x.png'),PNG.sync.write(sheet));
}
const evidenceFiles=[];
for(const file of ['candidate.json','display-report.json','pixel-samples.json',...reports.map(a=>a.key+'-native-1x.png'),...reports.flatMap(a=>a.frames.map(f=>f.screenshot))]){
  const bytes=await readFile(path.join(out,file));evidenceFiles.push({file,bytes:bytes.length,sha256:hash(bytes)});
}
const proof={status:'Bounded native-display proof passed; inactive family',baseline:candidate.baseline,candidate:candidate.candidate,sourceFreezeSha256:hash(await readFile(folder+'/freeze.json')),runner:{file:folder+'/verify-native.mjs',sha256:hash(await readFile(folder+'/verify-native.mjs'))},scope:candidate.scope,owners,framesPerOwner:31,nativeFrameUploads:62,exactDisplayedCells:496,exactDisplayedOpaquePixels:samples.length,allSourcePixelsVisible:true,nativeCellGeometryExact:true,palettesExact:true,nativeStreamPointerExact:true,nativeHelpersUnchanged:true,originalHeadersAndAiUnchanged:true,originalFrameAndDurationLists:timing,sourceFilesUnchanged:true,activeFilesChanged:false,minimalSourceReproductionListUnchanged:true,visualReview:{lead:'/root/sprite_art_pass',status:'Approved 31-slot source at native/enlarged size, both palettes and corrected contact scale; this is distinct from native encounter timing review'},evidence:{directory:out,candidate:'candidate.json',display:'display-report.json',pixels:'pixel-samples.json',screenshots:62,contactSheets:reports.map(a=>a.key+'-native-1x.png'),files:evidenceFiles},limitations:['This is an isolated native field preview, not original encounter choreography, combat or complete scene residency.','Native duration and frame lists are proved byte-identical to the original; static frame scrubbing does not establish live encounter timing.','Scene438 conservative original actor union is 38016 decoded bytes, 5248 above the legacy 32768-byte heap. Guarded gfx133 streaming remains required.','This proof uses the repository SNES JS core; independent-core and full-scene integration remain separate.'],activation:false};
await writeFile(folder+'/native-display-proof.json',JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({status:proof.status,baseline:proof.baseline.sha256,candidate:proof.candidate.sha256,uploads:62,cells:496,pixels:samples.length,manifest:folder+'/native-display-proof.json'}));
