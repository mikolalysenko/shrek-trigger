import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{PNG}from'pngjs';
import{u16,u24,put16,fileOffset}from'../../../engine/rom.js';import{decompress,compress}from'../../../engine/compression.js';import{sceneMap,sceneCells}from'../../../engine/scene-map.js';import{tile4bpp}from'../../../engine/sprites.js';import{sampleBody,render,sha}from'./sample-body.mjs';
import{compilePulse}from'./compile-pulse.mjs';
const d=import.meta.dirname,root=path.resolve(d,'../../..');
export function compileBody({warm=true,method='area'}={}){
 const base=fs.readFileSync(path.join(root,'.local/chrono-trigger-usa.sfc')),body=sampleBody({warm,method}),map=sceneMap(base,32),cells=sceneCells(base,32,46),originalAssembly=decompress(base,fileOffset(u24(base,0x362100+46*3))),assembly=originalAssembly.bytes.slice(),banks=[181,182].map(id=>{const original=decompress(base,fileOffset(u24(base,0x362220+id*3)));return{id,original:original.bytes,originalCompressed:original.length,graphics:original.bytes.slice()};});
 assert.deepEqual([...new Set(map.layers[0].tiles)].sort((a,b)=>a-b),Array.from({length:160},(_,i)=>i));assert.ok([...new Set(map.layers[1].tiles)].every(id=>id>=256));
 const bodySlots=new Set(Array.from({length:182},(_,i)=>257+i));for(const c of cells.filter(c=>c.layer===1))assert.ok(!bodySlots.has(c.word&1023),'No cave alias of body graphics');
 const pulse=compilePulse(),animated=new Set(pulse.initial.keys()),tiles=new Map([[Buffer.alloc(32).toString('hex'),256]]),written=new Set(),assignments=[];let next=257;
 for(const[tile,bytes]of pulse.initial){banks[1].graphics.set(bytes,(tile&127)*32);written.add(tile);}
 const flip=p=>Uint8Array.from(p,(_,i)=>p[(i>>3)*8+7-(i&7)]);
 for(let my=0;my<9;my++)for(let mx=0;mx<16;mx++)for(let cy=0;cy<2;cy++)for(let cx=0;cx<2;cx++){
  const x=mx*16+cx*8,y=my*16+cy*8,p=new Uint8Array(64);for(let yy=0;yy<8;yy++)p.set(body.pixels.subarray((y+yy)*256+x,(y+yy)*256+x+8),yy*8);
  const bytes=tile4bpp(p,8,0,0),key=Buffer.from(bytes).toString('hex'),rev=Buffer.from(tile4bpp(flip(p),8,0,0)).toString('hex');let tile=tiles.get(key),flags=0;
  const index=(my*16+mx)*8+(cy*2+cx)*2,oldWord=u16(originalAssembly.bytes,index);let word;
  if(animated.has(oldWord&1023)){word=oldWord;}
  else{if(tile===undefined){tile=tiles.get(rev);if(tile!==undefined)flags=0x4000;else{while(animated.has(next))next++;tile=next++;assert.ok(bodySlots.has(tile),'Generated body stays inside its182 owned tile slots');tiles.set(key,tile);const bank=banks[tile<384?0:1];bank.graphics.set(bytes,(tile&127)*32);written.add(tile);}}word=tile|(tile===256?0:0x1c00)|flags;}
  put16(assembly,index,word);assignments.push({x,y,index,word});
 }
 assert.deepEqual(assembly.slice(0,8),originalAssembly.bytes.slice(0,8),'Repeated blank metatile0 stays exact');assert.deepEqual(assembly.slice(144*8),originalAssembly.bytes.slice(144*8),'Remaining lower map and every cave metatile stay exact');
 for(const bank of banks)for(let tile=0;tile<128;tile++)if(!written.has((bank.id===181?256:384)+tile))assert.deepEqual(bank.graphics.slice(tile*32,tile*32+32),bank.original.slice(tile*32,tile*32+32),'Unused/unowned graphics unchanged');
 const recon=new Uint8Array(256*144);for(const c of assignments){const word=c.word,bank=banks[(word&1023)<384?0:1];for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){const tx=word&0x4000?7-xx:xx;let v=0;for(let bit=0;bit<4;bit++)v|=(bank.graphics[(word&127)*32+(bit>>1)*16+yy*2+(bit&1)]>>(7-tx)&1)<<bit;recon[(c.y+yy)*256+c.x+xx]=v;}}
 assert.deepEqual(recon,body.pixels,'All generated body source pixels reconstruct through exact native map/metatile geometry');
 const report={status:'Inactive generated body; only owned layer0 metatile words and BG181/182 tiles repacked',source:body.audit,uniqueTiles:tiles.size-1,availableBodyTiles:182,modifiedTiles:[...written],metatileWordsChanged:assignments.filter(c=>c.word!==u16(originalAssembly.bytes,c.index)).length,metatile0Unchanged:true,mapBytesUnchanged:true,mapSha256:sha(map.bytes),collisionPropertiesUnchanged:true,caveMetatilesUnchanged:true,caveGraphicsUnchanged:true,bodyCanvas:[256,144],bodyOrigin:[0,4],banks:banks.map(b=>({id:b.id,rawBytes:b.graphics.length,compressedBytes:compress(b.graphics).length,originalCompressedBytes:b.originalCompressed,graphicsSha256:sha(b.graphics)})),assembly:{rawBytes:assembly.length,compressedBytes:compress(assembly).length,originalCompressedBytes:originalAssembly.length,sha256:sha(assembly)},extraVramBytes:0,extraWramBytes:0};
 report.pulse={destinationTiles:[416,428],sourceTiles:[116,164],threeRegionsPreserved:true,animatedMetatileWordsPreserved:assignments.filter(c=>animated.has(c.word&1023)).length};
 return{base,body,pulse,banks:banks.map(b=>({...b,compressed:compress(b.graphics)})),assembly,assemblyCompressed:compress(assembly),report};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const c=compileBody(),out=path.join(d,'body-draft');fs.mkdirSync(out,{recursive:true});for(const b of c.banks){fs.writeFileSync(path.join(out,'bg'+b.id+'.4bpp'),b.graphics);fs.writeFileSync(path.join(out,'bg'+b.id+'.ct-lz'),b.compressed);}fs.writeFileSync(path.join(out,'tileset46.bin'),c.assembly);fs.writeFileSync(path.join(out,'tileset46.ct-lz'),c.assemblyCompressed);fs.writeFileSync(path.join(out,'body.pixels'),c.body.pixels);fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(c.report,null,2)+'\n');for(const scale of[1,3])fs.writeFileSync(path.join(out,'native-'+scale+'x.png'),PNG.sync.write(render(c.body.pixels,256,144,c.body.palette,scale)));console.log(JSON.stringify(c.report));}
