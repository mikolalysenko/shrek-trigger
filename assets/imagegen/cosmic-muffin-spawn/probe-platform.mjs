import fs from 'node:fs';import path from 'node:path';import {PNG} from 'pngjs';
import {privateOverlay} from './private-overlay.mjs';import {oamCells,locate} from './native-proof-utils.mjs';
import {createCore} from '../../../scripts/core.mjs';import {runFrames} from '../../../engine/automation.js';import {installHooks} from '../../../engine/hooks.js';import {createDevTools} from '../../../engine/devtools.js';import {restore,snapshot} from '../../../engine/save.js';import {u16} from '../../../engine/rom.js';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),c=privateOverlay(),s=await createCore(c.rom);restore(s,JSON.parse(fs.readFileSync(path.join(d,'private/scene-495-after.json'))));
const h=installHooks(s,JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json')))),dev=createDevTools(s,h),out=path.join(d,'private/platform');fs.mkdirSync(out,{recursive:true});let tick=0;
const events=[];h.on('event.dispatch',e=>{if(e.location===495&&[9,10,0].includes(e.object)&&![0,0x11,0x12,0x22,0xb2].includes(e.opcode))events.push({tick,object:e.object,pc:e.scriptPC,op:e.opcode,args:[...s.ram.slice(0x12002+e.scriptPC,0x12007+e.scriptPC)]});});
function state(){const i=u16(s.ram,0x197),body=locate(c.candidates[0],0,oamCells(s,c.audit.palette.words));return{tick,location:u16(s.ram,0x100),leader:[u16(s.ram,0x1800+i)/16,u16(s.ram,0x1880+i)/16],shell:[u16(s.ram,0x1812)/16,u16(s.ram,0x1892)/16],bodyOrigin:body?.origin,control:s.ram[0x11f],flags:[s.ram[0x10064],s.ram[0x10b12]],fatal:dev.diagnostics().fatal};}
function shot(name){const p=new PNG({width:512,height:480});s.setPixels(p.data);fs.writeFileSync(path.join(out,name+'.png'),PNG.sync.write(p));console.log(JSON.stringify(state()));}
shot('start');
function run(n,k=0){for(let i=0;i<n;i++){runFrames(s,1,k);tick++;}}
run(9,64);run(59,16);shot('left');
for(let i=0;i<500&&u16(s.ram,0x1812)/16<263;i++)run(1,128);
run(20);shot('push-right');run(40,32);run(24,128);shot('below');
run(100,16);run(20);shot('push-up');run(3,256);run(500);shot('climb-finished');
fs.writeFileSync(path.join(out,'probe.json'),JSON.stringify({final:state(),events},null,2)+'\n');fs.writeFileSync(path.join(out,'checkpoint.json'),JSON.stringify(snapshot(s)));dev.dispose();h.dispose();
