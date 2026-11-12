// Capture readable, paused native Tech windows after ordinary practice entry.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';
import{createCore}from'../../../scripts/core.mjs';import{newGame,runFrames}from'../../../engine/automation.js';import{snapshot,restore}from'../../../engine/save.js';import{installHooks}from'../../../engine/hooks.js';import{createDevTools}from'../../../engine/devtools.js';import{screenshot}from'../../../tests/helpers.mjs';
const root=path.resolve(import.meta.dirname,'../../..'),out=path.join(import.meta.dirname,'native-verification'),rom=new Uint8Array(fs.readFileSync(path.join(root,'.local/qa/doris-generated/shrek-trigger.sfc'))),s=await createCore(rom);await newGame(s);const initial=snapshot(s),h=installHooks(s,JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json')))),dev=createDevTools(s,h),records=[];
try{for(const tier of[0,3,4,5]){
 restore(s,initial);dev.jump({id:465,x:7,y:10,facing:0,party:[0,1,2],trainingLevel:[1,10,20,30,40,99][tier]});runFrames(s,300);const tap=(key,gap=90)=>{runFrames(s,3,key);runFrames(s,gap);};
 for(let n=0;n<16&&s.ram[0xaf02]!==224+tier;n++){tap(256);runFrames(s,120);}assert.equal(s.ram[0xaf02],224+tier);runFrames(s,300);
 for(let n=0;n<180&&s.ram[0x95d5]>2;n++)runFrames(s,12);assert.ok(s.ram[0x95d5]<3);const actor=s.ram[0x95d5];
 for(let n=0;n<6&&s.ram[0x95dc+actor]!==1;n++)tap(s.ram[0x95dc+actor]<1?32:16,12);assert.equal(s.ram[0x95dc+actor],1);
 for(let n=0;n<120&&s.ram[0x95db]!==1;n++)tap(256,12);assert.equal(s.ram[0x95db],1);runFrames(s,32);assert.equal(dev.diagnostics().fatal,null);
 await screenshot(s,path.join(out,`tier${tier}-battle-menu.png`));records.push({tier,enemy:224+tier,techWindow:true,readyPartySlot:actor,controllerInputOnly:true});
 }fs.writeFileSync(path.join(out,'battle-captures.json'),JSON.stringify({scope:'Supplemental readable PPU captures after normal decisions and controller-operated Tech menu; no battle RAM or cartridge patches.',records},null,2)+'\n');console.log(JSON.stringify({battleCaptures:records.length,controllerOnly:true}));
}finally{dev.dispose();h.dispose();}
