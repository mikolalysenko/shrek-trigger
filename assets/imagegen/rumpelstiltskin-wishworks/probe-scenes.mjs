// Exploratory native route driver; not frozen scene acceptance evidence.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {privateOverlay,dir} from './private-overlay.mjs';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {u16} from '../../../engine/rom.js';
import {screenshot} from '../../../tests/helpers.mjs';
const [id,story,x,y,d2=0]=process.argv.slice(2).map(Number),{rom,rawPointers}=await privateOverlay(),out=dir+'/probes';await mkdir(out,{recursive:true});const s=await createCore(rom);await newGame(s);const h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h),loads=[],dispatch=[],dialogs=[];
h.on('event.init',e=>{if(e.location===id&&[0x82,0x83].includes(e.opcode))loads.push({...e,id:s.ram[0x12002+e.scriptPC]});});h.on('event.dispatch',e=>{if(e.location===id&&[0xd8,0xe0,0xdf,0xaa,0xab,0xac,0xc1,0xc2,0xbb].includes(e.opcode)&&dispatch.length<100)dispatch.push(e);});h.on('dialogue.render',e=>{if(dialogs.length<50)dialogs.push(e);});
s.ram[0x10000]=story;s.ram[0x100d2]=d2;s.ram[0x100f8]&=127;s.ram[0x100ba]&=253;
if(id===363){s.ram[0x100af]|=7;s.ram[0x100ba]|=6;}
d.jump({name:'Private route probe '+id,id,x,y,party:[363,377].includes(id)?[1,2,3]:[0,1,2],endgame:true});runFrames(s,500);await screenshot(s,out+'/'+id+'-entry.png');
const stats=()=>({location:u16(s.ram,0x100),story:s.ram[0x10000],d2:s.ram[0x100d2],battle:s.ram[0x117]&1,leader:u16(s.ram,0x197),x:u16(s.ram,0x1800+u16(s.ram,0x197))/16,y:u16(s.ram,0x1880+u16(s.ram,0x197))/16,local:[...s.ram.slice(0x10200,0x1021a)],fatal:d.diagnostics().fatal,owners:loads.filter(l=>[149,161,162,243].includes(l.id)).map(l=>({...l,x:u16(s.ram,0x1800+l.object*2)/16,y:u16(s.ram,0x1880+l.object*2)/16,frame:s.ram[0xf01+l.object*2],pointer:u16(s.ram,0x1280+l.object*2)|s.ram[0x1200+l.object*2]<<16}))});
const initial=stats();if(id!==377)runFrames(s,80,17);for(let i=0;i<25&&!(s.ram[0x117]&1);i++){runFrames(s,3,256);runFrames(s,100);}await screenshot(s,out+'/'+id+'-after.png');const report={initial,after:stats(),loads,dispatch,dialogs,rawPointers};await writeFile(out+'/'+id+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));d.dispose();h.dispose();
