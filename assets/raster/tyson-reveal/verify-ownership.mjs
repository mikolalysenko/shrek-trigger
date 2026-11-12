import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {privateOverlay,sha} from './private-overlay.mjs';
import {u16} from '../../../engine/rom.js';
import {nativeSpriteBank} from '../../../scripts/native-sprite-view.mjs';
import {readEnemyAI} from '../../../engine/enemy-ai.js';

const d=import.meta.dirname,c=privateOverlay(),rows=[];
for(const [enemy,frames]of[[206,45],[237,3],[239,3]]){
  const h=Array.from(c.base.slice(0x24f600+enemy*10,0x24f60a+enemy*10));
  const actor={gfx:h[0],asm:h[1],palette:h[2],size:h[4],frames};
  const before=nativeSpriteBank(c.base,actor),after=nativeSpriteBank(c.rom,actor);
  assert.deepEqual(after,before,'Unrelated final actor source graphics, assembly and palette unchanged');
  const ai=readEnemyAI(c.base,enemy),beforeAI=c.base.slice(ai.start,ai.start+ai.bytes);
  assert.deepEqual(c.rom.slice(ai.start,ai.start+ai.bytes),beforeAI);
  rows.push({enemy,header:h,frames,graphicsBytes:before.graphics.length,graphicsSha256:sha(before.graphics),assemblyBytes:before.assembly.length,assemblySha256:sha(before.assembly),palette233Exact:true,aiSha256:sha(beforeAI)});
}
const pal=0x240000+u16(c.base,0x242a00+233*2),paletteBytes=c.base.slice(pal,pal+24);
assert.deepEqual(c.rom.slice(pal,pal+24),paletteBytes);
const report={...c.report,status:'Shared finale palette and all three final-formation source banks remain byte-identical',palette233:{offset:pal,bytes:24,sha256:sha(paletteBytes),owners:[11,206,237,239],words:Array.from({length:12},(_,i)=>u16(paletteBytes,i*2))},unrelatedFinalActors:rows,revealOnly:{enemy:11,gfx:238,asm:224,animation:187,size:2,cells:12,frames:8},sourceGeometry:'Original actor[128,127], rendered origin[128,111] and each original opaque bottom retained. Six of96 cell positions relocate to cover the complete approved source; no extra cell or opaque clipping.',streaming:'Existing size2 native raw copier and loader code unchanged. Only private table ownership238 plus frozen interior208/209 was added.',scope:'Private proof overlay includes the already frozen interior body/arms/pulse packet as a separately named dependency. This new source package proposes only enemy11 gfx238/asm224; no body, Tyson final, Ward/Core, AI, event, timing or palette mutation.'};
fs.writeFileSync(path.join(d,'ownership-proof.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({palette233:'unchanged',finalOwners:rows.map(a=>a.enemy),privateSha256:c.report.privateSha256}));
