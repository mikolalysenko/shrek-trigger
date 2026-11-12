import test from 'node:test';
import assert from 'node:assert/strict';
import {generatedRasterArt} from '../engine/generated-raster-art.js';
import {rasterArt,rasterArtInfo} from '../engine/raster-art.js';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {PNG} from 'pngjs';

test('raster death masks only remove source pixels and preserve palette values, mirrors and transparent frames',()=>{
  const key='test-native-raster-mask';
  const source=Uint8Array.from({length:64},(_,i)=>i%7?i%12+1:0);
  const semanticRoles={idle:{1:{kind:'source',reason:'Fixture source pixels.'}},dissolve:{1:{kind:'adapted',reason:'Source visibility mask only.'}}};
  generatedRasterArt[key]={width:8,height:8,palette:[],frames:[Array.from(source,v=>v.toString(16)).join('')],semanticRoles,sequences:{idle:{1:[0],2:[{frame:0,dx:1,dy:-1}]},dissolve:{1:[0,2,4,6,8,10,11].map(dissolve=>({frame:0,dissolve}))}}};
  try{
    assert.deepEqual(rasterArt(key),source);
    let previous=source;
    for(let phase=0;phase<7;phase++){
      const threshold=[0,2,4,6,8,10,11][phase],pixels=rasterArt(key,{pose:'dissolve',phase});
      for(let y=0;y<8;y++)for(let x=0;x<8;x++){
        const i=y*8+x;
        assert.equal(pixels[i],(x*3+y*5)%11>=threshold?source[i]:0);
        if(pixels[i])assert.equal(pixels[i],previous[i],'later phases never create or recolor a pixel');
      }
      previous=pixels;
    }
    assert.equal(previous.some(Boolean),false,'threshold11 clears the entire frame');
    const mirrored=rasterArt(key,{facing:3});
    for(let y=0;y<8;y++)for(let x=0;x<8;x++)assert.equal(mirrored[y*8+x],x>=1&&y<7?source[(y+1)*8+8-x]:0);
    assert.equal(rasterArt(key,{pose:'blank'}).some(Boolean),false);
    assert.deepEqual(rasterArtInfo(key).semanticRoles,semanticRoles);
    assert.equal(rasterArt(key,{pose:'missing'}),null);
    assert.deepEqual(rasterArt(key),source,'source cache is never modified by a mask');
  }finally{delete generatedRasterArt[key];}
});

test('raster imports retain semantic gaps and reject invalid visibility masks or missing explanations',()=>{
  const directory=mkdtempSync(join(tmpdir(),'shrek-raster-import-'));
  try{
    const source=join(directory,'source.png'),spec=join(directory,'import-spec.json');
    const png=new PNG({width:8,height:8});for(let p=0;p<png.data.length;p+=4)png.data.set([120,160,64,255],p);
    writeFileSync(source,PNG.sync.write(png));
    const actor={key:'test-raster-import',directory,width:8,height:8,palette:['202020','405020','789f40','b0c060','d0c090','604020','907040','302020','f0e0c0','203020','d0d080','90a090'],sheets:[{file:source,columns:1,rows:1,nativeHeight:8,scaleCells:[0],sample:{bottom:7}}],sequences:{idle:{1:[{frame:0,dissolve:2}]}},semanticRoles:{idle:{1:{kind:'fallback',reason:'A source-derived provisional acting pose remains incomplete.'}}}};
    const run=()=>{writeFileSync(spec,JSON.stringify(actor));return spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/import-raster-art.mjs',import.meta.url)),'--preview-spec',spec],{encoding:'utf8'});};
    const valid=run();assert.equal(valid.status,0,valid.stderr);
    const imported=JSON.parse(readFileSync(join(directory,'preview-raster.json')));
    assert.deepEqual(imported.semanticRoles,actor.semanticRoles);
    assert.equal(imported.sequences.idle[1][0].dissolve,2);
    actor.sequences.idle[1][0].dissolve=12;
    const mask=run();assert.notEqual(mask.status,0);assert.match(mask.stderr,/invalid dissolve threshold/);
    actor.sequences.idle[1][0].dissolve=0;delete actor.semanticRoles.idle[1].reason;
    const missing=run();assert.notEqual(missing.status,0);assert.match(missing.stderr,/missing semantic role explanation/);
    actor.sequences.idle[1]=[];
    const empty=run();assert.notEqual(empty.status,0);assert.match(empty.stderr,/empty raster sequence/);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
