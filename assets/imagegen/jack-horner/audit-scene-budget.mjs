import{readFile,writeFile}from'node:fs/promises';
import assert from'node:assert/strict';
import{u16,u24,fileOffset}from'../../../engine/rom.js';
import{decompress}from'../../../engine/compression.js';
import{spriteHeaders}from'../../../engine/native-sprites.js';
import{medinaFamilies}from'../../../content/medina-actors.js';
import{createCore}from'../../../scripts/core.mjs';
import{restore}from'../../../engine/save.js';
import{installHooks}from'../../../engine/hooks.js';
import{createDevTools}from'../../../engine/devtools.js';
import{runFrames}from'../../../engine/automation.js';
const dir='assets/imagegen/jack-horner',rom=await readFile('.local/chrono-trigger-usa.sfc'),events=JSON.parse(await readFile('.local/reference/events.json','utf8')),headers=spriteHeaders(rom),family=medinaFamilies.find(f=>f.key==='horner'),native=JSON.parse(await readFile(dir+'/native-resource-audit.json','utf8'));
const variants=[166,167,168].map(id=>{const h=rom.slice(0x24f600+id*10,0x24f600+id*10+10),s=0x240000+u16(rom,0x242600+h[3]*2),e=0x240000+u16(rom,0x242602+h[3]*2);return{enemy:id,header:[...h],animation:h[3],animationStart:s,animationEnd:e,animationDirectionStride:(e-s)/4,animations:Array.from({length:4},(_,f)=>[...rom.slice(s+f*(e-s)/4,s+(f+1)*(e-s)/4)])};});
const sceneIds=[...new Set(native.sceneUses.map(u=>u.location))],scenes=sceneIds.map(id=>{
 const e=events.find(e=>e.location===id),loads=e.commands.filter(c=>[0x82,0x83].includes(c[1])).map(([offset,op,args])=>{const kind=op===0x82?'npc':'enemy',h=headers.find(h=>h.kind===kind&&h.id===args[0]),gfx=rom[h.offset],direct=kind==='enemy'&&h.id>=248,p=fileOffset(u24(rom,0x242000+gfx*3));return{offset,kind,id:h.id,graphics:gfx,assembly:rom[h.offset+1],palette:rom[h.offset+2],animation:rom[h.offset+3],size:rom[h.offset+4]&3,cells:(rom[h.offset+4]&1?8:4)*(rom[h.offset+4]&2?3:1),direct,bytes:direct?0:decompress(rom,p).bytes.length};}),banks=[...new Map(loads.filter(l=>!l.direct).map(l=>[l.graphics,l])).values()],sum=banks.reduce((s,b)=>s+b.bytes,0);
 return{location:id,eventPointer:e.eventPointer,loads,banks:banks.map(b=>({graphics:b.graphics,bytes:b.bytes})),allConditionalOriginalBytes:sum,allConditionalOtherBytes:sum-8192};
});
const non31=scenes.filter(s=>s.location!==31),ceiling=Math.floor((32767-Math.max(...non31.map(s=>s.allConditionalOtherBytes)))/32)*32;
assert.equal(ceiling,9824);
const aliases=Object.fromEntries([['graphics',0x242000,155],['assembly',0x242300,148]].map(([name,table,id])=>[name,Array.from({length:256},(_,i)=>i).filter(i=>u24(rom,table+i*3)===u24(rom,table+id*3))]));
const audit={key:'horner',status:'Native roles and scene budget audited before source generation; inactive',variants,source:{graphics:155,assembly:148,palette:196,size:1,cells:8,frames:30,graphicsBytes:8192,compressedBytes:native.compressedGraphicsBytes,assemblyBytes:2400,aliases},emittedPalette:family.actors[0].colors,originalFrameOffsets:family.groups[0].frameOffsets,scenes,scene31Exception:{reason:'All-branch union exceeds the heap, but the branches are mutually exclusive.',hornerCondition:'Story counter >= 138 and 7F01A1 bit 0x80 clear',hornerGraphics:[155,83,86],hornerOtherBytes:17632,entryReferences:[769,778,790,900,959,1025,1035,1107,1117,1191,1225,1247]},draftBudget:{targetBytes:8192,absoluteConservativeCeiling:9824,limitingScene:33,limitingOtherGraphics:[86,35,111,49],limitingOtherBytes:22912,headroomAtCeiling:32,strictNativeLimit:32768,condition:'Recompute using actual emitted bank sizes and owners at integration. ROM expansion does not change this WRAM limit.'},loaderProof:'../sir-bram-ghost/heap-audit.json',currentEnforcerCostsFromRoot:{166:9024,182:3680},extraWramBytes:0,extraVramBytes:0,activation:false};
if(process.argv.includes('--runtime')){
 const s=await createCore(rom),state=JSON.parse(await readFile('art-review/art-pass/sir-bram-ghost/base-bedroom.json','utf8')),specs=JSON.parse(await readFile('content/hooks.json','utf8'));
 for(const[name,address]of[['horner.enemy.after',0xc04840],['horner.npc.after',0xc046d7],['horner.fatal',0xc02e1e]])specs.push({name,address,expected:[...rom.slice(fileOffset(address),fileOffset(address)+4)]});
 restore(s,state);const h=installHooks(s,specs),dev=createDevTools(s,h);let current;
 h.on('*',e=>{if(!current||e.location!==current.location||!e.name.startsWith('horner.'))return;current.trace.push({name:e.name,object:e.object,graphics:s.ram[0x1e3],heapEnd:u16(s.ram,0x171),bytes:u16(s.ram,0x306)});});
 const cases=[['31-before',31,137,0,0],['31-horner',31,138,0,0],['31-after',31,203,128,0],['33-before',33,80,0,0],['33-all-optional',33,203,128,0],['170-upper-fortress',170,118,0,0],['175-fortress-traps',175,118,0,0],['180-trio',180,203,63,0]];
 audit.runtimeBase=[];
 try{for(const[name,location,story,a1,a4]of cases){restore(s,state);current={name,location,story,event1a1:a1,event1a4:a4,trace:[]};s.ram[0x10000]=story;s.ram[0x101a1]=a1;s.ram[0x101a4]=a4;dev.jump({id:location,x:8,y:10,party:[0,1,2],endgame:true});runFrames(s,300);current.finalLocation=u16(s.ram,0x100);current.graphicsIds=[...s.ram.slice(0x920,0x930)].filter(x=>x!==255);current.heapBytes=u16(s.ram,0x171)-32768;current.fatal=current.trace.some(t=>t.name==='horner.fatal');assert.equal(current.fatal,false);assert.equal(current.finalLocation,location);audit.runtimeBase.push(current);console.log(JSON.stringify({name,ids:current.graphicsIds,heap:current.heapBytes}));}}finally{current=null;dev.dispose();h.dispose();}
 const full=audit.runtimeBase.find(x=>x.name==='33-all-optional');assert.equal(full.heapBytes,31104);assert.deepEqual(full.graphicsIds,[155,86,35,111,49]);
 assert.deepEqual(audit.runtimeBase.find(x=>x.name==='31-horner').graphicsIds,[155,83,86]);
 audit.runtimeScope='Unmodified base ROM; diagnostic story seeds and native ChangeLocation only. No candidate activation or ROM file writes.';
}
await writeFile(dir+'/scene-budget-audit.json',JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({uniqueScenes:scenes.length,target:8192,ceiling,limitingScene:33,runtime:!!audit.runtimeBase}));
