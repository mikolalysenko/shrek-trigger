// Read-only palette observation after documented reversible diagnostic entry.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {snapshot,restore} from '../../../engine/save.js';
import {u16} from '../../../engine/rom.js';
import {nativeSpriteBank} from '../../../scripts/native-sprite-view.mjs';
import {oamCells,locate,pixelProof} from '../../imagegen/town-civilians-gfx125/native-proof-utils.mjs';

const dir=import.meta.dirname,root=path.resolve(dir,'../../..'),out=path.join(dir,'native-verification'),read=f=>JSON.parse(fs.readFileSync(path.join(dir,f))),sha=b=>createHash('sha256').update(b).digest('hex');
fs.mkdirSync(out,{recursive:true});
const header=read('headers.json'),configs={
  'fair-east':{id:5,x:31,y:32,story:5,ticks:1500},
  'fair-center':{id:5,x:28,y:32,story:5,ticks:1800},
  'fair-west':{id:5,x:25,y:32,story:5,ticks:1800},
  'fair-pan-west':{id:5,x:28,y:32,story:5,ticks:2100,moves:[{start:1500,end:1560,keys:64}]},
  'fair-merchant24':{id:5,x:16,y:40,story:5,ticks:900},
  'fair-merchant25':{id:5,x:5,y:36,story:5,ticks:900},
  'court':{id:27,x:8,y:23,trialScene:'trial-kind',ticks:1800},
  'throne-ending':{id:79,x:31,y:29,party:[0,1,2],story:200,endgame:true,ticks:2200},
  'end-time-ending':{id:84,x:30,y:24,party:[0,1,2],story:200,endgame:true,ticks:2200},
  'bram-flashback':{id:206,x:31,y:32,party:[0,1,2],story:200,endgame:true,ticks:1800},
  'smithy-ending':{id:38,x:31,y:31,party:[0,1,2],story:200,endgame:true,ticks:1200},
  'last-inn':{id:464,x:28,y:24,party:[0,1,2],story:200,endgame:true,ticks:1200},
};
const keys=process.argv.slice(2);if(!keys.length)keys.push('fair-east','court','throne-ending','end-time-ending','bram-flashback');
for(const version of ['original','current']){
  const input=header.inputs.find(x=>x.name===version),rom=new Uint8Array(fs.readFileSync(path.join(root,input.path)));assert.equal(sha(rom),input.sha256);
  let statePath=path.join(dir,'private/newgame-'+input.sha256.slice(0,12)+'.json');
  const previous=path.join(root,'assets/imagegen/town-tradesmen/private-qa/newgame-'+input.sha256.slice(0,12)+'.json');
  if(!fs.existsSync(statePath)&&fs.existsSync(previous))fs.copyFileSync(previous,statePath);
  let state;
  if(fs.existsSync(statePath))state=JSON.parse(fs.readFileSync(statePath));
  else{const boot=await createCore(rom);await newGame(boot);state=snapshot(boot);fs.writeFileSync(statePath,JSON.stringify(state));}
  for(const key of keys){
    const cfg=configs[key];assert.ok(cfg,key);const s=await createCore(rom);restore(s,state);
    const nativePoints=[{name:'palette.alloc.failed',address:0xc072b2,expected:[0x18,0x60]},{name:'palette.row.assigned',address:0xc07248,expected:[0x9d,0x81,0x0f]}];
    const h=installHooks(s,[...JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json'))),...nativePoints]),dev=createDevTools(s,h),events=[],loads=[],messages=[],frames=[],mismatchIntervals=new Map(),paletteAllocation=[];
    let tick=0;
    const onEvent=e=>{if([0x80,0x81,0x82,0x83].includes(e.opcode))loads.push({...e,tick,args:[...s.ram.slice(0x12002+e.scriptPC,0x12004+e.scriptPC)]});if([0x33,0x88,0x2e,0x8e,0x90,0x91,0x7c,0x7d,0x7e].includes(e.opcode))events.push({...e,tick,args:[...s.ram.slice(0x12002+e.scriptPC,0x12008+e.scriptPC)]});};
    h.on('event.init',onEvent);h.on('event.dispatch',onEvent);h.on('dialogue.render',e=>messages.push({...e,tick}));
    for(const name of ['palette.alloc.failed','palette.row.assigned'])h.on(name,e=>{
      if(e.location!==cfg.id)return;
      const p=e.object*2;paletteAllocation.push({...e,tick,action:name,type:s.ram[0x1100+p],id:s.ram[0x1101+p],sourcePointer:u16(s.ram,0x1400+p),assignedRow:name==='palette.row.assigned'?(s.cpu.br[0]&14)>>1:null,previousRow:s.ram[0xf81+p]>>1&7,slots:Array.from({length:5},(_,row)=>{const obj=s.ram[0xb80+row];return{row,object:obj===128?null:obj/2,sourcePointer:obj===128?null:u16(s.ram,0x1400+obj)};})});
    });
    if(cfg.story!==undefined)s.ram[0x10000]=cfg.story;
    dev.jump(cfg);
    function inspect(capture=false){
      const location=u16(s.ram,0x100),actors=[],cells=capture?oamCells(s):[];
      for(let object=0;object<Math.min(s.ram[0x12000],64);object++){
        const p=object*2,type=s.ram[0x1100+p];if(type>6)continue;
        const id=s.ram[0x1101+p],kind=type===4?'npc':type>=5?'enemy':'pc',rec=header.headers[version].find(x=>x.kind===kind&&x.id===id);if(!rec)continue;
        const visible=!!(s.ram[0xf00+p]&128)&&s.ram[0x1a81+p]>0&&s.ram[0x1a81+p]<128;
        if(!visible)continue;
        const sourcePointer=u16(s.ram,0x1400+p),row=s.ram[0xf81+p]>>1&7,sourceWords=Array.from({length:12},(_,i)=>u16(rom,0x240000+sourcePointer+i*2)),actualWords=[...s.ppu.cgram.slice(129+row*16,141+row*16)],colorExact=sourceWords.every((w,i)=>w===actualWords[i]);
        const item={object,kind,id,type,frame:s.ram[0xf01+p],position:[u16(s.ram,0x1800+p)/16,u16(s.ram,0x1880+p)/16],header:rec.header,sourcePointer,sourcePaletteIds:header.headers[version].filter(x=>x.palettePointer===sourcePointer).map(x=>x.palette).filter((x,i,a)=>a.indexOf(x)===i),row,rowOwner:s.ram[0xb80+row]/2,sourceWords,actualWords,colorExact,drawFlag:s.ram[0xf00+p],visibility:s.ram[0x1a81+p],tileSlot:u16(s.ram,0xd00+p)};
        if(capture&&kind==='npc'&&item.frame<100&&rec.header[4]===0){
          try{const bank=nativeSpriteBank(rom,{gfx:rec.header[0],asm:rec.header[1],palette:rec.header[2],size:0,frames:item.frame+1}),spriteBase=s.ppu.sprAdr1*2/32,expectedTiles=[0,2,4,6].map(n=>item.tileSlot-spriteBase+n),match=locate(bank,item.frame,cells.filter(c=>expectedTiles.includes(c.tile)));
            if(match){const pp=pixelProof(s,[match],actualWords);item.displayed={origin:match.origin,row:match.cells[0].palette,cells:match.cells.map(c=>c.entry),tiles:match.cells.map(c=>c.tile),actorTileSlot:item.tileSlot,spriteBase,actualColorPixels:pp.exact,occludedOrDifferentPixels:pp.mismatches};}
          }catch(error){item.nativeMatchError=String(error);}
        }
        actors.push(item);
        if(!colorExact&&s.ppu.brightness===15){const k=[location,object,kind,id,sourcePointer,row].join(':');const a=mismatchIntervals.get(k)??{location,object,kind,id,sourcePointer,row,firstTick:tick,lastTick:tick,sampledTicks:0};a.lastTick=tick;a.sampledTicks++;mismatchIntervals.set(k,a);}
      }
      const f={tick,location,brightness:s.ppu.brightness,rows:[...s.ram.slice(0xb80,0xb88)].map(v=>v===128?null:v/2),actors};
      if(capture){const png=new PNG({width:512,height:480});s.setPixels(png.data);f.screenshot=key+'-'+version+'-'+tick+'.png';fs.writeFileSync(path.join(out,f.screenshot),PNG.sync.write(png));frames.push(f);}
    }
    let fatal=null;
    for(;tick<cfg.ticks;tick++){
      const move=cfg.moves?.find(m=>tick>=m.start&&tick<m.end),input=move?.keys??(tick>600&&tick%130<3?256:0);runFrames(s,1,input);fatal=dev.diagnostics().fatal;if(fatal)break;
      if(tick%16===0)inspect(false);if([450,900,1500,1515,1535,1560,1600,1900,2100].includes(tick))inspect(true);
      if(u16(s.ram,0x100)!==cfg.id&&tick>400)break;
    }
    inspect(true);assert.deepEqual(s.cart.data,rom);
    const result={version,romSha256:input.sha256,key,setup:cfg,ticks:tick,finalLocation:u16(s.ram,0x100),fatal,loads,events,messages,paletteAllocation,frames,mismatchIntervals:[...mismatchIntervals.values()],scope:'Read-only observations after diagnostic entry and periodic ordinary confirm input. No palette, source, actor coordinate, event or scene progression edits after entry. Culling flags alone do not prove framebuffer visibility; displayed native matches are recorded separately. This is bounded scene staging, not a full route.'};
    fs.writeFileSync(path.join(out,key+'-'+version+'.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({version,key,ticks:tick,location:result.finalLocation,fatal,mismatches:result.mismatchIntervals,displayedWrong:frames.flatMap(f=>f.actors.filter(a=>!a.colorExact&&a.displayed?.actualColorPixels>0).map(a=>({tick:f.tick,o:a.object,id:a.id,row:a.row,pixels:a.displayed.actualColorPixels})))}));
    dev.dispose();h.dispose();
  }
}
