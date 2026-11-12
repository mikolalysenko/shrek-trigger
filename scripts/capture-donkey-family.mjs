import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from '../tests/helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {snapshot,restore} from '../engine/save.js';
import {u16} from '../engine/rom.js';
import {donkeyFamily} from '../content/donkey-family.js';
import {driveParadeToFarewell} from './check-endings.mjs';

// Screenshots of every room the Wolf, the Blind Mouse and young Donkey appear in, plus rooms
// where the stock townswoman, tradesman and child still stand, in the
// development emulator. Each capture records which NPC rows the room loaded
// and the palette row and frame each one shows.
//   node scripts/capture-donkey-family.mjs [scene ...]
const out='.local/qa/donkey-family';await mkdir(out,{recursive:true});
const b=await build(),specs=JSON.parse(await readFile('content/hooks.json','utf8'));
// `flags` are [WRAM address, OR mask]; `at` are the frames to capture after
// arrival; `watch` is a later room whose loads replace the first room's;
// `keys` are [frame, pad mask, hold frames] presses; `advance` taps
// A every that many frames, from `advanceFrom`, to step through dialogue.
const scenes={
  'house':{id:9,x:10,y:28,facing:0,story:0,at:[300,420]},
  'house-talk':{id:9,x:10,y:27,facing:0,story:0,at:[420],keys:[[300,256,4]]},
  'workshop':{id:4,x:10,y:14,facing:0,story:0x10,flags:[[0x1005a,4]],at:[300,460]},
  'flashback':{id:4,x:10,y:19,facing:0,story:0xcb,flags:[[0x1005a,2]],advance:150,advanceFrom:520,at:[300,500,640,790,940,1090,1240,1390,1540,1690,1840,1990,2140,2290,2440,2600,2800,3000]},
  'fair-teleporter':{id:8,x:7,y:9,facing:0,townsfolkScene:'tradesman-telepod',at:[500,800,1300]},
  'parade':{id:80,x:18,y:36,facing:0,townsfolkScene:'parade-center',at:[1100,1400]},
  // The bell: from the parade, walk up to it with the controller. The Mouse runs
  // in with his fireworks line (139) in the balloon variant (the Dragon was
  // lost in the dive), before the farewell room loads.
  'bell':{id:80,x:20,y:32,facing:0,townsfolkScene:'parade-center',flags:[[0x100ab,0x80],[0x100ce,5]],at:[1100],drive:driveParadeToFarewell,lines:[139],watch:81},
  // The illusions haunt the hall before the fortress falls (story below
  // 138); the Mouse's appears when Donkey is in the party.
  'fortress-illusion':{id:125,x:9,y:41,facing:0,story:0x89,party:[0,2,1],advance:140,advanceFrom:420,at:[300,400,700,1000]},
  // Stock neighbours: the soda contest man (NPC 39), a smith (NPC 52), market
  // women (NPC 13 and 40) and the parade crowd above.
  'stock-soda-man':{id:439,x:42,y:16,facing:0,story:5,at:[400]},
  'stock-smithy':{id:115,x:21,y:9,facing:0,townsfolkScene:'tradesman-hammer',at:[500]},
  'stock-townswoman-market':{id:58,x:8,y:10,facing:0,story:0,at:[400]}
};
const wanted=process.argv.slice(2),report={};
const s=await bedroom(b.rom),initial=snapshot(s);
for(const[key,scene]of Object.entries(scenes)){
  if(wanted.length&&!wanted.includes(key))continue;
  restore(s,initial);
  const h=installHooks(s,specs),d=createDevTools(s,h),loads=[],lines=[];let watching=false;
  h.on('event.init',e=>{if([scene.id,scene.watch].includes(e.location)&&e.opcode===0x82){if(e.location===scene.watch&&!watching){watching=true;loads.length=0;}loads.push({object:e.object,npc:s.ram[0x12002+e.scriptPC]});}});
  h.on('dialogue.render',e=>{if(!lines.includes(e.stringId))lines.push(e.stringId);});
  try{
    if(scene.story!==undefined)s.ram[0x10000]=scene.story;
    for(const[address,mask]of scene.flags??[])s.ram[address]|=mask;
    const {id,x,y,facing,townsfolkScene,party}=scene;d.jump({id,x,y,facing,...(townsfolkScene?{townsfolkScene}:{}),...(party?{party}:{})});
    let frame=0;const shots=[],seen=new Map(),due=new Map(),shown=new Set();
    const shoot=async name=>{const file=`${out}/${key}-${name}.png`;await screenshot(s,file);shots.push(file);};
    // One frame of input, then the captures that frame owes: the first time
    // a family member is drawn and each of `scene.lines` (dialogue IDs), after
    // a short settle.
    const step=async(input=0)=>{
      runFrames(s,1,input);frame++;
      for(const a of scene.watch&&!watching?[]:loads){const member=donkeyFamily.find(m=>m.npc===a.npc);if(member&&!seen.has(a.object)&&s.ram[0xf01+a.object*2]!==255&&u16(s.ram,0x1800+a.object*2)<0xff00){seen.set(a.object,member);due.set(frame+40,'first-'+member.key);}}
      for(const id of scene.lines??[])if(lines.includes(id)&&!shown.has(id)){shown.add(id);due.set(frame+30,'line-'+id);}
      if(due.has(frame))await shoot(due.get(frame));
    };
    for(const at of scene.at){
      while(frame<at){
        const press=(scene.keys??[]).find(([f,,hold])=>frame>=f&&frame<f+hold),tap=scene.advance&&frame>=(scene.advanceFrom??0)&&(frame-(scene.advanceFrom??0))%scene.advance<3;
        await step(press?press[1]:tap?256:0);
      }
      await shoot(String(at).padStart(4,'0'));
    }
    if(scene.drive){
      // Controller-only continuation: walk the parade to the bell, as the
      // ending tests do, until the farewell room loads.
      const run=async(n,input=0)=>{for(let i=0;i<n;i++)await step(input);};
      const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>run(n),hold:(input,n)=>run(n,input),tap:async(input=256,gap=12)=>{await run(3,input);await run(gap);},shot:async()=>{}};
      await scene.drive(io);await shoot('end');
    }
    const actors=loads.map(a=>{
      const p=0x24f023+a.npc*5,[gfx,asm,palette]=b.rom.slice(p,p+3),row=s.ram[0xf81+a.object*2]>>1&7,member=donkeyFamily.find(m=>m.npc===a.npc);
      return {...a,name:member?.name??null,gfx,asm,palette,row,frame:s.ram[0xf01+a.object*2],x:u16(s.ram,0x1800+a.object*2),y:u16(s.ram,0x1880+a.object*2)};
    });
    report[key]={location:u16(s.ram,0x100),requested:scene.id,fatal:d.diagnostics().fatal,dialogue:lines,actors,shots};
    console.log(key,'location',report[key].location,'fatal',report[key].fatal,'lines',lines.join(','),'\n ',actors.filter(a=>a.name||[13,37,38,39,40,52,213,25].includes(a.npc)).map(a=>`${a.name??'npc'+a.npc}@obj${a.object} gfx${a.gfx} pal${a.palette} row${a.row} frame${a.frame} (${a.x},${a.y})`).join('; '));
  }finally{d.dispose();h.dispose();}
}
await writeFile(out+'/captures.json',JSON.stringify(report,null,2)+'\n');
