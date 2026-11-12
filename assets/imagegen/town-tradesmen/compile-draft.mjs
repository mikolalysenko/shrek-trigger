import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {compileActorFamily} from '../../../engine/actor-families.js';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {compress} from '../../../engine/compression.js';
import {snesColor} from '../../../engine/sprites.js';
import {put16} from '../../../engine/rom.js';
import {dir,origin,readDraft} from './prepare-geometry.mjs';
export {dir};
export const hash=b=>createHash('sha256').update(b).digest('hex');
export async function compileDraft(){
 const{audit,asset,frames:images}=await readDraft(),family=JSON.parse(await readFile(dir+'/family.draft.json')),geometry=JSON.parse(await readFile(dir+'/geometry-proposal.json')),frames={'town-tradesmen':images};assert.equal(images.length,31);
 for(const p of asset.provenance)assert.equal(hash(await readFile(p.file)),p.sha256);const c=compileActorFamily(family,(key,f)=>frames[key][f]),compressed=compress(c.graphics),group=c.groups[0];assert.equal(group.cells,4);assert.equal(group.assembly.length,1240);assert.ok(c.graphics.length<=32768);
 let sourcePixels=0,duplicateSamples=0,unchangedXYBytes=0;const proofs=[];
 for(let f=0;f<31;f++){
  const cells=nativeSpriteCells({graphics:c.graphics,assembly:group.assembly,cells:4,frames:31},f),out=new Uint8Array(64*48),seen=new Uint8Array(64*48);assert.deepEqual(cells.map(c=>[c.x,c.y]),geometry.frames[f].signedCellOrigins);
  for(let k=0;k<4;k++)for(let axis=0;axis<2;axis++)if([cells[k].x,cells[k].y][axis]===audit.frames[f].cellOrigins[k][axis])unchangedXYBytes++;
  for(const cell of cells)for(let i=0;i<256;i++){const k=cell.pixels[i];if(!k)continue;const x=cell.x+(i&15)+origin[0],y=cell.y+(i>>4)+origin[1];assert.ok(x>=0&&x<64&&y>=0&&y<48);const p=y*64+x;if(seen[p]){assert.equal(out[p],k,'Every overlapping opaque sample agrees');duplicateSamples++;}else out[p]=k;seen[p]++;}
  assert.deepEqual(out,images[f],'Complete source pixels in native OAM priority order at frame '+f);const pixels=out.filter(Boolean).length;sourcePixels+=pixels;proofs.push({frame:f,nativeCells:4,sourcePixels:pixels,duplicateOpaquePixels:seen.filter(n=>n>1).length,allSourcePixelsCovered:true,originalXYUnchanged:geometry.frames[f].originalXYUnchanged});
 }
 const palettes=audit.palettes.map(p=>{const bytes=new Uint8Array(24);p.colors.forEach((c,i)=>put16(bytes,i*2,snesColor(c)));assert.equal(hash(bytes),p.sha256);return{id:p.id,colors:p.colors,bytes,sha256:p.sha256,unchanged:true};});
 const total=compressed.length+group.assembly.length,baseline=4042,report={status:'Inactive generated source and four-cell compile/redecode proof passed',activation:false,baseline:audit.baseline,gfx:35,asm:24,animation:15,nativeFrames:31,ownerPoseCount:93,owners:[25,39,52],sourceType:'Actual built-in imagegen PNG samples',rawBytes:c.graphics.length,compressedBytes:compressed.length,assemblyBytes:group.assembly.length,compressedPlusAssembly:total,graphicsSha256:hash(c.graphics),compressedSha256:hash(compressed),assemblySha256:hash(group.assembly),originalCT:{rawBytes:3936,compressedBytes:2802,assemblyBytes:1240,compressedPlusAssembly:4042},pinnedActive:{rawBytes:3936,compressedBytes:2802,assemblyBytes:1240,compressedPlusAssembly:4042},rawGrowthVsOriginal:c.graphics.length-3936,rawGrowthVsPinned:c.graphics.length-3936,compressedAssemblyGrowthVsOriginal:total-baseline,compressedAssemblyGrowthVsPinned:total-baseline,nativeSourcePixels:sourcePixels,agreeingDuplicateSamples:duplicateSamples,originalXYBytesUnchanged:unchangedXYBytes,originalXYBytesTotal:248,changedGeometryFrames:geometry.changedFrames,overlapFrames:geometry.overlapFrames,palettes:palettes.map(({bytes,...p})=>p),extraVramBytes:0,extraWramBytes:0,proofs,scope:'Source raster→4bpp→native assembly→indexed pixel reconstruction only; no emulator uploads, scheduler, scenes or connected route claimed yet.'};
 return{audit,asset,assets:{'town-tradesmen':asset},frames,families:[family],compiled:[{...c,family,compressed,report}],palettes,geometry};
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){const c=await compileDraft(),b=c.compiled[0];await mkdir(dir+'/compiled',{recursive:true});await writeFile(dir+'/compiled/gfx35.4bpp',b.graphics);await writeFile(dir+'/compiled/gfx35.ct-lz',b.compressed);await writeFile(dir+'/compiled/asm24.bin',b.groups[0].assembly);for(const p of c.palettes)await writeFile(dir+'/compiled/palette'+p.id+'.bin',p.bytes);await writeFile(dir+'/compiled/verification.json',JSON.stringify(b.report,null,2)+'\n');console.log(JSON.stringify({...b.report,proofs:undefined,palettes:b.report.palettes.map(p=>({id:p.id,sha256:p.sha256}))},null,2));}
