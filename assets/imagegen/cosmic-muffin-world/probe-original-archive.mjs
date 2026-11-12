import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {PNG} from 'pngjs';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {u16,u24,fileOffset} from '../../../engine/rom.js';
import {snapshot} from '../../../engine/save.js';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),out=path.join(d,'private/original-archive');
fs.mkdirSync(out,{recursive:true});
const rom=fs.readFileSync(path.join(root,'.local/chrono-trigger-usa.sfc')),s=await createCore(rom);
await newGame(s);
const specs=JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json')));
specs.push({name:'world.sprite',address:0xc20d08,expected:[0xbc,0x0b,0x00]});
const h=installHooks(s,specs),dev=createDevTools(s,h),nodes=new Map(),messages=[],locations=[];
h.on('dialogue.render',e=>messages.push([e.frame,e.location,e.stringId]));
h.on('world.sprite',e=>{
  const x=s.cpu.br[1],p=u24(s.ram,x+11),bytes=Array.from(s.ram.slice(x,x+14));
  const key=[e.location,p,bytes[8],bytes[9],bytes[10]].join(':');
  if(!nodes.has(key)){
    const bank=p>>>16,offset=p&65535,source=bank===0x7e||bank===0x7f?s.ram:rom;
    const start=bank===0x7e?offset:bank===0x7f?offset+65536:fileOffset(p),count=source[start];
    nodes.set(key,{location:e.location,pointer:p,count,bytes,assembly:Array.from(source.slice(start,start+1+count*4)),firstFrame:e.frame,observations:0});
  }
  nodes.get(key).observations++;
});
dev.jump({id:218,x:56,y:43,facing:0,futureScene:'future-archive'});
runFrames(s,400);runFrames(s,24,16);
let last=-1,worldTicks=0;
for(let i=0;i<220&&s.ram[0x10000]!==54;i++){
  runFrames(s,3,256);
  for(let n=0;n<100;n++){
    runFrames(s,1);const loc=u16(s.ram,0x100);
    if(loc!==last){locations.push({frame:s.frames,location:loc});last=loc;console.log('location',loc,s.frames);}
    if(loc===503){
      worldTicks++;
      if(worldTicks%120===0){
        const prefix='world-'+String(worldTicks).padStart(5,'0'),img=new PNG({width:512,height:480});s.setPixels(img.data);
        fs.writeFileSync(path.join(out,prefix+'.png'),PNG.sync.write(img));
        const report={frame:s.frames,location:loc,tick:worldTicks,cgram:Array.from(s.ppu.cgram),oam:Array.from(s.ppu.oam),highOam:Array.from(s.ppu.highOam),objSize:s.ppu.objSize,sprAdr1:s.ppu.sprAdr1,sprAdr2:s.ppu.sprAdr2,mode:s.ppu.mode};
        fs.writeFileSync(path.join(out,prefix+'.json'),JSON.stringify(report));
        fs.writeFileSync(path.join(out,prefix+'.vram'),Buffer.from(s.ppu.vram.buffer));
        if(worldTicks%360===0)fs.writeFileSync(path.join(out,prefix+'.state.json.gz'),zlib.gzipSync(JSON.stringify(snapshot(s))));
      }
    }
  }
}
fs.writeFileSync(path.join(out,'trace.json'),JSON.stringify({locations,messages,nodes:[...nodes.values()],story:s.ram[0x10000],worldTicks,fatal:dev.diagnostics().fatal},null,2)+'\n');
dev.dispose();h.dispose();console.log('complete',s.ram[0x10000],worldTicks,nodes.size);
