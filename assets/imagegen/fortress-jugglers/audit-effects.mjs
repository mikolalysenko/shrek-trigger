// Select pixels from the original native raster; never draw a body or new effect.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
const dir='assets/imagegen/fortress-jugglers',a=JSON.parse(await readFile(dir+'/native-audit.json')),roles=JSON.parse(await readFile(dir+'/native-role-audit.json')),rom=new Uint8Array(await readFile(a.original.path)),bank=nativeSpriteBank(rom,{gfx:91,asm:48,palette:40,size:0,frames:9});
const sha=b=>createHash('sha256').update(b).digest('hex');
const pixelMap=frame=>{const m=new Map();for(const cell of nativeSpriteCells(bank,frame))for(let i=0;i<256;i++)if(cell.pixels[i]){const key=[cell.x+i%16,cell.y+(i>>4)].join(',');if(!m.has(key))m.set(key,cell.pixels[i]);}return m;};
const dots=roles.frames[4].connectedComponents.filter(g=>g.pixels===1).flatMap(g=>g.points),flecks=roles.frames[6].connectedComponents.filter(g=>g.pixels<=3).flatMap(g=>g.points);
assert.equal(dots.length,3);assert.equal(flecks.length,12);
const points6=pixelMap(6),detached=new Set(flecks.map(([x,y])=>x+','+y));
const flash=[...points6].flatMap(([key,index])=>{const[x,y]=key.split(',').map(Number);if(detached.has(key))return[];
  // Authored star center is (0,-39). Preserve only its original bright strokes
  // inside the observed vertical, horizontal and diagonal arms. Gold body/ink
  // outside those lanes is excluded. This selects existing pixels, not vectors.
  const vertical=Math.abs(x)<=1&&[2,5].includes(index);
  const horizontal=y>=-41&&y<=-38&&[2,5].includes(index);
  const diagonal=Math.abs(Math.abs(x)-Math.abs(y+39))<=2&&[2,3,5,7].includes(index);
  return vertical||horizontal||diagonal?[[x,y,index]]:[];
});
for(const [frame,points]of [[4,dots],[6,[...flash,...flecks]]]){const map=pixelMap(frame);for(const[x,y,k]of points)assert.equal(map.get(x+','+y),k);}
const effect={status:'Inactive original-raster effect mask proposal, separate from generated body source',baseline:a.baseline,original:a.original,sourceGraphicsSha256:a.resources.graphics.original.sha256,sourceAssemblySha256:a.resources.assembly.sha256,palette:40,paletteSha256:a.palettes[0].sha256,frames:[{frame:4,role:'Detached overhead recoil dots',points:dots},{frame:6,role:'Native radial flash and detached flecks',points:[...flash,...flecks],flashPixels:flash.length,detachedPixels:flecks.length}],maskPolicy:'Copy the three source dots, twelve source flecks and selected original bright radial strokes exactly at their authored coordinates. Do not infer body pixels behind the flash. The radial mask is a manual source selection, not a new drawn star. Review its boundaries before source composition.',noProceduralAnatomy:true};
effect.pixelRecordSha256=sha(Buffer.from(JSON.stringify(effect.frames)));
await writeFile(dir+'/original-effects.draft.json',JSON.stringify(effect,null,2)+'\n');
const W=128,H=72,p=new PNG({width:W*4,height:H*4});for(let i=0;i<p.data.length;i+=4)p.data.set([42,49,57,255],i);for(let f=0;f<2;f++){const full=pixelMap(f?6:4),selected=new Map(effect.frames[f].points.map(([x,y,k])=>[x+','+y,k]));for(let v=0;v<2;v++)for(const[key,k]of(v?selected:full)){const[x,y]=key.split(',').map(Number),px=f*64+v*32+x+16,py=y+64;for(let yy=0;yy<4;yy++)for(let xx=0;xx<4;xx++)p.data.set([...bank.palette[k-1],255],((py*4+yy)*p.width+px*4+xx)*4);}}
await writeFile(dir+'/review/original-effects-proposal-4x.png',PNG.sync.write(p));console.log(JSON.stringify({dots:dots.length,flash:flash.length,flecks:flecks.length,sha256:effect.pixelRecordSha256}));
