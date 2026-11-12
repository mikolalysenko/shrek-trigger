import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {u24,fileOffset} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
const dir='assets/imagegen/bone-guards',source=JSON.parse(await readFile(dir+'/native-resource-audit.json')),draft=JSON.parse(await readFile(dir+'/draft-audit.json')),rom=new Uint8Array(await readFile(source.currentBaseline.path)),hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(rom),source.currentBaseline.sha256);
const manifest=JSON.parse(await readFile('dist/manifest.json')),table=manifest.resources.npcGraphicsStreaming.table;
const scenes=source.sceneUses.map(scene=>{
  const graphics=[...new Set([...scene.allEnemyIds.map(id=>rom[0x24f600+id*10]),...scene.allNpcIds.map(id=>rom[0x24f000+(id+7)*5])].filter(g=>g>6))];
  const banks=graphics.map(gfx=>{const pointer=u24(rom,table+gfx*3),currentBytes=decompress(rom,fileOffset(u24(rom,0x242000+gfx*3))).bytes.length;return{gfx,streamed:pointer!==0,streamPointer:pointer,currentBytes,candidateBytes:gfx===108?draft.graphicsBytes:currentBytes};});
  const currentHeapUnion=banks.filter(b=>!b.streamed).reduce((n,b)=>n+b.currentBytes,0),candidateHeapUnion=banks.filter(b=>!b.streamed).reduce((n,b)=>n+b.candidateBytes,0);
  return{location:scene.location,banks,currentHeapUnion,candidateHeapUnion,spareBytes:32768-candidateHeapUnion};
});
assert.ok(scenes.every(s=>s.spareBytes>=0));
await writeFile(dir+'/scene-budget-audit.json',JSON.stringify({baseline:source.currentBaseline.sha256,scope:'Conservative union of all original event load branches using current emitted headers/resources. Direct-ROM banks excluded only when selected by the actual saved-cartridge table. No full scene choreography/residency claim.',limit:32768,candidateGuardBankBytes:draft.graphicsBytes,scenes},null,2)+'\n');
console.log(JSON.stringify({scenes:scenes.length,largestUnion:Math.max(...scenes.map(s=>s.candidateHeapUnion)),minimumSpare:Math.min(...scenes.map(s=>s.spareBytes))}));
