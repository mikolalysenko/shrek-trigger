import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {u16} from '../../../engine/rom.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {snapshot,restore} from '../../../engine/save.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {woodlandPreview,expectedTiles,uploadedTiles} from './private-preview.mjs';
import {nativeOamCells} from './native-proof-utils.mjs';
const dir='assets/imagegen/woodland-sprites',out='.local/qa/woodland-sprites-native-proof',json=async p=>JSON.parse(await readFile(p)),sha=b=>createHash('sha256').update(b).digest('hex'),candidate=await json(out+'/candidate.json'),rom=new Uint8Array(await readFile(out+'/candidate.sfc')),audit=await json(dir+'/native-resource-audit.json');assert.equal(sha(rom),candidate.candidateSha256);
const actors=[...audit.owners,{kind:'enemy',id:225,header:candidate.guy225.header,externalSentinel:true}],s=await createCore(rom);try{restore(s,await json(out+'/bedroom.json'));}catch{await newGame(s);await writeFile(out+'/bedroom.json',JSON.stringify(snapshot(s)));}const ready=snapshot(s),reports=[];await mkdir(out+'/display',{recursive:true});
for(const actor of actors){
 const bank=nativeSpriteBank(rom,{gfx:actor.header[0],asm:actor.header[1],palette:actor.header[2],size:actor.header[4],frames:15}),{graphics,assembly,cells,nativeColors:colors}=bank;restore(s,ready);const hooks=installHooks(s,await json('content/hooks.json')),dev=createDevTools(s,hooks),preview=woodlandPreview(s,hooks,dev,actor);
 try{
  runFrames(s,300);assert.equal(preview.state.object,15);assert.equal(dev.diagnostics().fatal,null);const obj=15,x=obj*2,pointer=(s.ram[0x1200+x]<<16)|u16(s.ram,0x1280+x),heap=u16(s.ram,0x171)-0x8000;assert.ok(pointer>=0x400000&&pointer<0x7e0000);if(!actor.externalSentinel)assert.equal(pointer,candidate.streams[0].address);assert.ok(heap>=0&&heap<=32768);
  const report={kind:actor.kind,id:actor.id,externalSentinel:!!actor.externalSentinel,palette:actor.header[2],assembly:actor.header[1],fullSize:actor.header[4],sourcePointer:pointer,isolatedHeapBytes:heap,origin:preview.origin,frames:[]};
  for(let frame=0;frame<15;frame++){
   preview.frame(frame);let ticks=0;while(s.ram[0xf01+x]!==frame&&ticks++<100)runFrames(s,1);assert.equal(s.ram[0xf01+x],frame);runFrames(s,12);const uploaded=uploadedTiles(s,obj,cells);assert.deepEqual(uploaded,expectedTiles(frame,graphics,assembly,cells),'Complete native upload');const oam=nativeOamCells(s),png=new PNG({width:512,height:480});s.setPixels(png.data);const cellRecords=[],visible=new Map(),vramBase=u16(s.ram,0xd00+x)*32;
   for(const c of nativeSpriteCells(bank,frame)){
    const cx=200+c.x,cy=143+c.y,entry=oam.find(o=>o.x===cx&&o.y===cy&&o.size===16&&o.vramByteAddress===vramBase+c.cell*64&&Buffer.from(o.pixels).equals(Buffer.from(c.pixels)));assert.ok(entry,actor.kind+actor.id+' frame'+frame+' cell'+c.cell);assert.deepEqual(Array.from({length:12},(_,k)=>s.ppu.cgram[128+entry.palette*16+k+1]),colors);cellRecords.push({cell:c.cell,oam:entry.entry,x:cx,y:cy,palette:entry.palette,priority:entry.priority,vramByteAddress:entry.vramByteAddress});for(let y=0;y<16;y++)for(let x=0;x<16;x++){const k=c.pixels[y*16+x];if(k&&!visible.has((cx+x)+','+(cy+y)))visible.set((cx+x)+','+(cy+y),k);}
   }
   for(const[key,k]of visible){const[xx,yy]=key.split(',').map(Number);assert.ok(yy>=0&&yy<224&&xx>=0&&xx<256);const at=(((yy+8)*2)*512+xx*2)*4,n=colors[k-1],mult=s.ppu.brightnessMults[s.ppu.brightness],rgb=[n&31,n>>5&31,n>>10&31].map(v=>(v*mult)&255);assert.deepEqual([...png.data.slice(at,at+3)],rgb,'Exact final visible pixel '+actor.kind+actor.id+' frame'+frame+' '+key);}
   assert.equal(dev.diagnostics().fatal,null);const file='display/'+actor.kind+actor.id+'-'+String(frame).padStart(2,'0')+'.png';await writeFile(out+'/'+file,PNG.sync.write(png));report.frames.push({frame,origin:preview.origin,cells:cellRecords,opaquePixels:visible.size,uploadSha256:sha(uploaded),screenshot:file});
  }reports.push(report);console.log(actor.kind+actor.id+': 15 exact native poses passed');
 }finally{preview.dispose();dev.dispose();hooks.dispose();}
}
assert.deepEqual(s.cart.data,rom);const family=reports.filter(r=>!r.externalSentinel),external=reports.filter(r=>r.externalSentinel),summary=rs=>({uploads:rs.reduce((n,r)=>n+r.frames.length,0),cells:rs.reduce((n,r)=>n+r.frames.reduce((a,f)=>a+f.cells.length,0),0),pixels:rs.reduce((n,r)=>n+r.frames.reduce((a,f)=>a+f.opaquePixels,0),0)}),proof={status:'passed',activation:false,scope:'Bounded native field display through original NPC/enemy loader, copier and PPU; no CPU, stack, VRAM or OAM writes',baselineSha256:candidate.baselineSha256,candidateSha256:candidate.candidateSha256,nativeFamily:summary(family),externalGuy225Sentinel:summary(external),allOpaquePixelsVisible:true,graphics81Streamed:true,palette19Exact:true,sharedAA28AndGuyResourcesUnchanged:true,reports,core:'repository native65816/PPU',evidence:out,limitations:['Isolated exact display; authored scenes and live animation timing are separate.','Independent-core and final production placement remain integration checks.']};assert.equal(proof.nativeFamily.uploads,30);assert.equal(proof.nativeFamily.cells,120);assert.equal(proof.externalGuy225Sentinel.uploads,15);await writeFile(dir+'/native-display-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({family:proof.nativeFamily,sentinel:proof.externalGuy225Sentinel}));
