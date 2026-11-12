import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,needsSourceImages} from './helpers.mjs';
import {u16} from '../engine/rom.js';
import {cast} from '../content/cast.js';
import {workshopPuppet} from '../content/workshop-puppets.js';
import {PARTY_OUTLINE,PARTY_ACCENT,partyPaletteConvention,conformPartyFrame} from '../engine/party-palette.js';
import {rasterArtInfo,partyConvention} from '../engine/raster-art.js';
import {snesColor,playerRaster,frameAssignments} from '../engine/sprites.js';
import {renderPinocchioClean} from '../assets/raster/pinocchio-clean/render.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech} from './battle-controller.mjs';

const b=await build();

// Every native role's pixels exactly as the ROM compiler uploads them (the
// player-art tests check those uploads against VRAM). Death dissolves cut
// the silhouette by design and are skipped.
function nativeFrames(id){
  const {map}=frameAssignments(b.base,id),weapons=id===4?['rapier','hatchet']:['rapier'];
  return weapons.flatMap(weapon=>map.flatMap((a,f)=>a.pose==='blank'||a.pose==='dissolve'?[]:[{frame:f,weapon,pixels:playerRaster(id,a.facing,a.pose,a.phase,weapon)}]));
}

test('every party palette reserves entries 1 and 12 for the outline the status glow recolors',()=>{
  for(const c of cast){
    assert.equal(c.palette.length,12,c.name);assert.equal(c.palette[0],PARTY_OUTLINE,c.name+' entry 1');assert.equal(c.palette[11],PARTY_ACCENT,c.name+' entry 12');
    assert.deepEqual(rasterArtInfo(c.key).palette,c.palette,c.name+' raster palette');
    const pal=0x240000+u16(b.rom,0x242a00+c.id*2);
    for(let i=0;i<12;i++)assert.equal(u16(b.rom,pal+i*2),snesColor(c.palette[i]),c.name+' cartridge color '+(i+1));
  }
  assert.equal(workshopPuppet.colors[0],PARTY_OUTLINE);assert.equal(workshopPuppet.colors[11],PARTY_ACCENT);
});

test('every native party frame outlines its silhouette with entries 1 and 12 and keeps entry 12 off the body',()=>{
  for(const c of cast){
    const frames=nativeFrames(c.id);let edges=0;
    assert.ok(frames.length>=190,c.name+' native roles');
    frames.forEach(({frame:f,weapon,pixels:px})=>{
      const empty=(x,y)=>x<0||y<0||x>31||y>31||!px[y*32+x];
      for(let y=0;y<32;y++)for(let x=0;x<32;x++){const v=px[y*32+x];if(!v)continue;
        assert.ok(v<=12,`${c.name} ${weapon} frame ${f} uses a reserved index`);
        const l=empty(x-1,y),r=empty(x+1,y),u=empty(x,y-1),d=empty(x,y+1);
        if(!(l||r||u||d)){assert.notEqual(v,12,`${c.name} ${weapon} frame ${f} paints the body with entry 12 at ${x},${y}`);continue;}
        if((l&&r)||(u&&d))continue; // single-pixel lines (blades, strings) keep their color
        edges++;assert.ok(v===1||v===12,`${c.name} ${weapon} frame ${f} has an unoutlined edge at ${x},${y}`);
      }
    });
    assert.ok(edges>1000,c.name+' has outlined frames');
  }
});

test('the conversion merges only near-blacks and the closest colors, and is stable for conforming palettes',()=>{
  for(const c of cast.filter(c=>c.key!=='pinocchio')){
    const conv=partyConvention(c.key);assert.deepEqual(conv.palette,c.palette);
    assert.equal(conv.remap[0],0);for(let i=1;i<=12;i++)assert.ok(conv.remap[i]>=1&&conv.remap[i]<=11,c.name+' remap '+i);
  }
  // A palette that already conforms keeps every body color in place.
  const pino=cast.find(c=>c.key==='pinocchio'),counts=new Array(13).fill(1),conv=partyPaletteConvention(pino.palette,counts);
  assert.deepEqual(conv.palette.slice(0,11),pino.palette.slice(0,11));
  const px=Uint8Array.from({length:64},(_,i)=>i%9?i%11+1:0);assert.deepEqual(conformPartyFrame(px,8,8,conv,{outline:false}),px.map(v=>v===12?1:v));
});

test('Pinocchio\'s cel-shaded sprites and portrait are reproducible from the archived model and authored poses',{skip:needsSourceImages},async()=>{
  const {text,frames}=await renderPinocchioClean();
  assert.equal(text,await readFile(new URL('../content/pinocchio-clean-art.js',import.meta.url),'utf8'));
  assert.equal(frames.length,190);
  const info=rasterArtInfo('pinocchio'),spec=JSON.parse(await readFile(new URL('../assets/raster/pinocchio-model/import-spec.json',import.meta.url)));
  assert.deepEqual(info.sequences,spec.sequences,'native roles unchanged');
  assert.deepEqual(Object.keys(info.semanticRoles),Object.keys(spec.semanticRoles));
  assert.equal(info.sourceType,'existing-game-model-cel-render');
});

test('a live Haste lights only the outline entries of the target\'s palette',async()=>{
  const specs=JSON.parse(await readFile('content/hooks.json')),party=[1,3,0];
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
  d.jump({id:1,x:8,y:8,party,endgame:true});runFrames(s,300);d.startCombat({fixture:'swamp-pack',unlockTechs:true});runFrames(s,400);
  for(let n=0;n<1500&&s.ram[0x95d5]>2;n++)s.runFrame();
  const fiona=cast[1].palette.map(snesColor),row=()=>{for(let p=8;p<16;p++){const e=Array.from(s.ppu.cgram.slice(p*16,p*16+16));if(fiona.slice(1,11).every((c,i)=>e[i+2]===c))return p;}return -1;};
  const p=row();assert.ok(p>=8,'Fiona\'s battle palette row');
  const io={read:(a,n=1)=>n===2?u16(s.ram,a):s.ram[a],bytes:(a,n)=>s.ram.slice(a,a+n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
  await chooseNativeTech(io,b.rom,0,13);
  const changed=new Set();
  for(let f=0;f<600;f++){s.runFrame();if(s.ram[0x5e4d]&0x80)for(let i=1;i<=12;i++)if(s.ppu.cgram[p*16+i]!==fiona[i-1])changed.add(i);}
  assert.ok(s.ram[0x5e4d]&0x80,'native Haste status');
  assert.deepEqual([...changed].sort((a,b)=>a-b),[1,12],'only the outline pair glows');
  d.dispose();h.dispose();
});
