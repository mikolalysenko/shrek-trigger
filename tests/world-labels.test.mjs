import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{build,bedroom,screenshot}from'./helpers.mjs';
import{worldLabels}from'../content/world-labels.js';
import{patchWorldLabels}from'../engine/world-labels.js';
import{encodeDialogue,dialogueLength}from'../engine/text.js';
import{u16,put16}from'../engine/rom.js';
import{installHooks}from'../engine/hooks.js';
import{createDevTools}from'../engine/devtools.js';
import{runFrames}from'../engine/automation.js';
const b=await build();
test('twenty-six world labels fit native storage, including relocated Ohio captions',()=>{
 const changed=new Set(),audit=b.audit.environment.worldLabels;assert.equal(audit.labels.length,36);assert.equal(audit.relocatedPointers,13);assert.equal(audit.extraVramBytes,0);assert.equal(audit.extraWramBytes,0);
 for(const{id,name,offset,source}of worldLabels){
  const bytes=encodeDialogue(name+'{null}',b.base),entry=audit.labels.find(a=>a.id===id);assert.ok(entry,'audited label '+id);assert.equal(entry.name,name);
  assert.equal(dialogueLength(b.rom,entry.offset),bytes.length);assert.deepEqual(b.rom.slice(entry.offset,entry.offset+bytes.length),bytes);assert.equal(0x60000+u16(b.rom,0x6f400+id*2),entry.offset);
  assert.equal(entry.relocated,bytes.length>source.length/2);if(!entry.relocated)assert.equal(entry.offset,offset);
  for(let i=0;i<bytes.length;i++)changed.add(entry.offset+i);
  if(entry.relocated)changed.add(0x6f400+id*2).add(0x6f401+id*2);
 }
 // The already-authored swamp label owns its separate original slot.
 const swamp=0x60000+u16(b.base,0x6f406);for(let i=0;i<encodeDialogue('Swamp{null}',b.base).length;i++)changed.add(swamp+i);
 for(let p=0x6f000;p<0x6f400;p++)if(!changed.has(p))assert.equal(b.rom[p],b.base[p],'unrelated world text '+p.toString(16));
 for(let p=0x6f400;p<0x6f4e0;p++)if(!changed.has(p))assert.equal(b.rom[p],b.base[p],'unrelated world pointer '+p.toString(16));
});
test('world-name patching rejects changed source pointers, text and live suffix aliases',()=>{
 for(const mutation of[r=>r[0x6f051]^=1,r=>put16(r,0x6f414,0xf052),r=>put16(r,0x6f400,0xf052)]){
  const bad=b.base.slice();mutation(bad);assert.throws(()=>patchWorldLabels(bad,()=>{}),/source signature|live alias/);
 }
});
test('native overworld entrances select the adapted Duloc and Bakery labels',async()=>{
 const specs=JSON.parse(await readFile('content/hooks.json'));
 // Native collision selects an entrance on an eight-pixel square; the exit
 // record's sixteen-pixel origin is not necessarily that walkable square.
 for(const[world,label,story,x,y]of[[0,10,111,53,28],[0,14,111,35,34],[0,15,111,35,25],[3,52,120,70,62],[3,53,120,60,62],[3,54,120,65,60],[3,56,120,68,104],[3,58,144,65,32],[3,59,151,106,71],[3,81,144,52,40],[3,82,153,105,80]]){
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);let seeded=false;
  h.on('event.dispatch',()=>{if(seeded)return;seeded=true;s.ram[0x10000]=story;});
  d.jump({id:496+world,x,y});runFrames(s,500);
  await screenshot(s,'.local/qa/world-label-'+label+'.png');
  const entry=u16(s.ram,0x1b32);assert.notEqual(entry,65535,'world label '+label);assert.equal(s.ram[0x7e02+entry],label,'runtime entrance name '+label);assert.equal(d.diagnostics().fatal,null);
  d.dispose();h.dispose();
 }
});
