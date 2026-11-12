import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {writeFileSync,existsSync} from 'node:fs';
import {PNG} from 'pngjs';
import {privateOverlay,dir,hash} from './private-overlay.mjs';
import {uploaded,oamCells,locate,pixelProof} from './native-proof-utils.mjs';
import {u16,u24} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {cartridgeOffset} from '../../../engine/expanded-rom.js';
import {createCore} from '../../../scripts/core.mjs';
import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {snapshot,restore} from '../../../engine/save.js';

const {c,rom,active,baseline,rawPointer}=await privateOverlay(),out=dir+'/scene-verification/';
await mkdir(out,{recursive:true});
const bank={...c.compiled[0],...c.compiled[0].groups[0],frames:31};
const palettes=c.palettes.map(p=>({...p,words:Array.from({length:12},(_,i)=>u16(p.bytes,i*2))}));
const eventPacket=(cart,id)=>decompress(cart,cartridgeOffset(u24(cart,0x3cf9f0+u16(cart,0x360008+id*14)*3),cart)).bytes;
const configs={
 'smithy-hammer':{id:115,x:21,y:9,story:50,object:9,npc:52,frames:[16,17],ticks:900},
 'smithy-drink':{id:115,x:23,y:9,story:100,object:9,npc:52,frames:[24,25],ticks:3000},
 'choras-inn':{id:62,x:13,y:27,story:200,object:11,npc:52,frames:[18,19],ticks:1000},
 'telepod-exhibit':{id:8,x:7,y:9,story:10,object:10,npc:39,ticks:1200},
 'hero-ending-row6':{id:38,x:32,y:29,story:200,object:15,npc:25,row:6,frames:[30],flags:{'0x101aa':0},ticks:1700},
};
const statePath=dir+'/private-qa/newgame-'+hash(rom).slice(0,12)+'.json';
let saved;
if(existsSync(statePath))saved=JSON.parse(await readFile(statePath));
else {const boot=await createCore(rom);await newGame(boot);saved=snapshot(boot);await writeFile(statePath,JSON.stringify(saved));}
for(const name of process.argv.slice(2).length?process.argv.slice(2):Object.keys(configs)){
 const cfg=configs[name];assert.ok(cfg);const s=await createCore(rom);restore(s,saved);
 const h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h),loads=[],events=[],messages=[],shots=[],observations=new Map(),heaps=[];
 let ticks=0;const captured=new Set();
 assert.deepEqual(eventPacket(rom,cfg.id),eventPacket(active,cfg.id),'Original authored scene packet unchanged');
 h.on('event.init',e=>{if(e.opcode===0x82)loads.push({...e,id:s.ram[0x12002+e.scriptPC]});if(e.location===cfg.id&&e.object===cfg.object&&[0x33,0xaa,0xac,0xad,0xa6,0x8e].includes(e.opcode))events.push({...e,phase:'init',tick:ticks,args:[...s.ram.slice(0x12002+e.scriptPC,0x12007+e.scriptPC)]});});
 h.on('event.dispatch',e=>{if((e.location===cfg.id&&e.object===cfg.object&&[0x33,0xaa,0xac,0xad,0xa6,0x8e].includes(e.opcode))||[0xdc,0xdd,0xde,0xdf,0xe0,0xe1,0xe2].includes(e.opcode))events.push({...e,tick:ticks,args:[...s.ram.slice(0x12002+e.scriptPC,0x12007+e.scriptPC)]});});
 h.on('dialogue.render',e=>messages.push({...e,tick:ticks}));
 function observe(){
  assert.equal(d.diagnostics().fatal,null);const loc=u16(s.ram,0x100),heap=u16(s.ram,0x171)-32768;if(heap>=0&&heap<=32768)heaps.push({location:loc,bytes:heap});
  if(s.ram[0x117]&1)return;
  for(const l of loads.filter(l=>l.location===loc&&[25,39,52].includes(l.id))){
   const x=l.object*2,pointer=u16(s.ram,0x1280+x)|s.ram[0x1200+x]<<16;if(pointer!==rawPointer)continue;
   const palette=l.id===39?133:9;assert.equal(u16(s.ram,0x1400+x),u16(rom,0x242a00+palette*2));
   const f=s.ram[0xf01+x];if(f>=31)continue;const key=[loc,l.object,l.id,f].join(':'),r=observations.get(key)??{location:loc,object:l.object,npc:l.id,palette,frame:f,pointer,sampledTicks:0,exactUploads:0};r.sampledTicks++;if(uploaded(s,bank,l.object,f).exact)r.exactUploads++;observations.set(key,r);
  }
 }
 function matches(){
  const result=[];
  for(const palette of palettes){let cells=oamCells(s,palette.words);
   for(let frame=0;frame<31;frame++)for(let tries=0;tries<8;tries++){
    const match=locate(bank,frame,cells);if(!match)break;const pixels=pixelProof(s,[match],palette.words);
    result.push({frame,palette:palette.id,hardwarePaletteRow:match.cells[0].palette,cgramWords:Array.from({length:12},(_,i)=>s.ppu.cgram[129+match.cells[0].palette*16+i]),origin:match.origin,visibleExact:pixels.exact,occludedOrDifferent:pixels.mismatches,firstMismatches:pixels.firstMismatches,cells:match.cells.map(a=>a.entry)});
    const used=new Set(match.cells.map(a=>a.entry));cells=cells.filter(a=>!used.has(a.entry));
   }
  }return result;
 }
 function shot(key,found=matches()){
  const png=new PNG({width:512,height:480});s.setPixels(png.data);writeFileSync(out+name+'-'+key+'.png',PNG.sync.write(png));
  shots.push({key,tick:ticks,location:u16(s.ram,0x100),brightness:s.ppu.brightness,dialogue:s.ram[0x12a],nativeMatches:found});
 }
 function wait(n,keys=0){for(let i=0;i<n;i++){runFrames(s,1,keys);ticks++;if(!(ticks&7))observe();
  if(u16(s.ram,0x100)===cfg.id&&s.ppu.brightness===15&&!(ticks%8)){
   const frame=s.ram[0xf01+cfg.object*2],key='frame-'+frame;if(!captured.has(key)){
    const found=matches(),target=found.filter(m=>m.frame===frame&&m.palette===(cfg.npc===39?133:9)&&(cfg.row===undefined||m.hardwarePaletteRow===cfg.row)&&m.visibleExact>0);
    if(target.length){shot(key,found);captured.add(key);}
   }
  }
 }}
 try{
  s.ram[0x10000]=cfg.story;for(const [address,value]of Object.entries(cfg.flags??{}))s.ram[Number(address)]=value;
  d.jump({id:cfg.id,x:cfg.x,y:cfg.y,facing:0,party:[0,1,2],endgame:true});wait(cfg.ticks);shot('settled');
  assert.ok(loads.some(l=>l.location===cfg.id&&l.object===cfg.object&&l.id===cfg.npc),'Original source NPC load executes');
  const visible=shots.filter(q=>q.location===cfg.id&&q.brightness===15).flatMap(q=>q.nativeMatches).filter(m=>m.palette===(cfg.npc===39?133:9)&&m.visibleExact>0&&(cfg.row===undefined||m.hardwarePaletteRow===cfg.row));
  assert.ok(visible.length,'Actual scene renders candidate source pixels');
  for(const f of cfg.frames??[])assert.ok(visible.some(m=>m.frame===f),'Original scene visibly executes expected frame '+f);
  if(cfg.row!==undefined){assert.ok(events.some(e=>e.location===cfg.id&&e.object===cfg.object&&e.opcode===0x33&&e.args[0]===cfg.row),'Original palette-row override executes');const words=palettes.find(p=>p.id===(cfg.npc===39?133:9)).words;assert.ok(visible.every(m=>m.cgramWords.every((w,i)=>w===words[i])));}
  assert.deepEqual(s.cart.data,rom);assert.ok(observations.size);
  const heapByLocation=[...new Set(heaps.map(h=>h.location))].map(location=>({location,min:Math.min(...heaps.filter(h=>h.location===location).map(h=>h.bytes)),max:Math.max(...heaps.filter(h=>h.location===location).map(h=>h.bytes))}));
  const report={status:'Passed',name,baseline,privateRomSha256:hash(rom),checkpoint:{...cfg,party:[0,1,2],endgameKit:true},nativeTicks:ticks,eventSha256:hash(eventPacket(rom,cfg.id)),eventsUnchanged:true,loads,events,messages,observations:[...observations.values()],shots,heapByLocation,rawStreamingUsed:true,cartridgeUnchanged:true,visibleFrames:[...new Set(visible.map(m=>m.frame))],scope:'Diagnostic location/story checkpoint only. All subsequent target scene scripts, animation, palette-row assignment and rendering are native. Representative authored staging; no complete service transaction, festival route, ending or full chapter is claimed.'};
  await writeFile(out+name+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({name,frames:report.visibleFrames,heapByLocation,location:u16(s.ram,0x100)}));
 }catch(error){shot('failure');await writeFile(dir+'/private-qa/'+name+'-failure-state.json',JSON.stringify(snapshot(s)));await writeFile(out+name+'-failure.json',JSON.stringify({error:String(error),cfg,ticks,location:u16(s.ram,0x100),loads,events,messages,observations:[...observations.values()],shots,unfilteredMatches:Array.from({length:31},(_,frame)=>{const match=locate(bank,frame,oamCells(s));return match?{frame,origin:match.origin,cells:match.cells.map(x=>({entry:x.entry,x:x.x,y:x.y,palette:x.palette})),colors:[...s.ppu.cgram.slice(129+match.cells[0].palette*16,141+match.cells[0].palette*16)]}:null;}).filter(Boolean),objectRam:Object.fromEntries([0xd00,0xf00,0xf80,0x1600,0x1680,0x1800,0x1880,0x1900,0x1980,0x1a00].map(a=>[a.toString(16),[...s.ram.slice(a+cfg.object*2,a+cfg.object*2+2)]]))},null,2)+'\n');throw error;}
 finally{d.dispose();h.dispose();}
}
