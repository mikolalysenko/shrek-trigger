// Donkey's ultimate (Call My Wife) and the joke mechanics of November 11:
// Love & Life revives fully, Some May Die is free and costs the allies.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom,needsSourceImages} from './helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {chooseNativeTech,useNativeItem} from './battle-controller.mjs';
import {u16} from '../engine/rom.js';
import {techniqueTables as table} from '../engine/technique-revision.js';
import {callMyWifeGraphics,techPictureGraphics,swampBelchWindow} from '../engine/swamp-belch-art.js';
import {techPictures} from '../engine/tech-pictures.js';
import {callMyWifeScene,techPictureScene,swampBelchScene} from '../engine/swamp-belch.js';

const b=await build(),specs=JSON.parse(await readFile(new URL('../content/hooks.json',import.meta.url)));

async function cast(id,{frames=420,loadout='current'}={}){
 const owner=Math.floor((id-1)/8),party=[owner,...[0,1,2,3].filter(x=>x!==owner).slice(0,2)];
 const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
 d.jump({id:1,x:7,y:8,party,endgame:true});runFrames(s,300);d.startCombat({fixture:'swamp-pack',loadout,unlockTechs:true});runFrames(s,400);
 for(let n=0;n<1800&&s.ram[0x95d5]>2;n++)s.runFrame();
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
 const results=[];h.on('battle.result',x=>results.push(x));
 const before={hp:[0,1,2].map(i=>u16(s.ram,0x5e30+i*128)),mp:[0,1,2].map(i=>u16(s.ram,0x5e34+i*128))};
 await chooseNativeTech(io,b.rom,0,id);
 let pinkLines=0;const pink=callMyWifeGraphics().palette[1];
 for(let f=0;f<frames;f++){s.runFrame();if(id===24&&f%8===0){let n=0;for(let i=0;i<4;i++)if(s.ppu.cgram[0x19+i]===pink||s.ppu.cgram[0x1d+i]===pink)n++;pinkLines=Math.max(pinkLines,n);}}
 const after={hp:[0,1,2].map(i=>u16(s.ram,0x5e30+i*128)),mp:[0,1,2].map(i=>u16(s.ram,0x5e34+i*128))};
 const fatal=d.diagnostics().fatal,stopped=s.cpu.stopped;d.dispose();h.dispose();
 return{results,before,after,fatal,stopped,pinkLines};
}

test('the Dragon picture is reproducible from its image-generation source and fits the native tile budget',{skip:needsSourceImages},async()=>{
 const g=callMyWifeGraphics(),source=await readFile(new URL('../'+g.source.source,import.meta.url));
 assert.equal(createHash('sha256').update(source).digest('hex'),g.source.sourceSha256);
 assert.equal(g.width,160);assert.equal(g.height,160);assert.ok(g.uniqueTiles<=0xee,'tiles '+g.uniqueTiles);
 // Mirrored: every row reads the same from either side.
 for(let y=0;y<160;y++)for(let x=0;x<80;x++)assert.equal(g.expanded[y*160+x],g.expanded[y*160+159-x]);
 // The window at full radius is exactly the picture's outline, centered.
 const rows=swampBelchWindow(g.radius,g.contour);assert.equal(rows.length,g.radius*4);
 for(let r=0;r<g.radius*2;r++)if(rows[r*2]!==255){assert.ok(rows[r*2]>=128-g.radius);assert.ok(rows[r*2+1]<=128+g.radius);}
});

test('Call My Wife keeps Flare mechanics and borrows only Luminaire\'s scene record',()=>{
 const a=b.audit.callMyWife;assert.equal(a.tech,24);assert.equal(a.name,'Call My Wife');
 assert.deepEqual(b.rom.subarray(table.animation(24),table.animation(24)+7),b.base.subarray(table.animation(8),table.animation(8)+7));
 for(const[start,size]of[[table.target(24),2],[table.control(24),11],[table.property(24),12]])assert.deepEqual(b.rom.subarray(start,start+size),b.base.subarray(start,start+size));
 assert.equal(b.rom[table.MP+24],b.base[table.MP+24]);
 const scene=callMyWifeScene(b.base),belch=swampBelchScene(b.base);
 assert.deepEqual(b.rom.subarray(a.script,a.script+scene.length),scene);assert.equal(scene.at(-1),0xff);
 assert.equal(scene.length,belch.length,'same script shape as Swamp Belch');
 assert.deepEqual(b.rom.subarray(a.graphics.tiles,a.graphics.tiles+4096),callMyWifeGraphics().graphics);
});

test('Donkey summons Dragon over the battlefield and every enemy takes Flare damage',async()=>{
 const r=await cast(24);
 assert.equal(r.fatal,null);assert.equal(r.stopped,false);
 const hits=r.results.filter(x=>x.techId===24);assert.equal(hits.length,3,'all three enemies');for(const h of hits)assert.ok(h.value>1000,'Flare-sized damage '+h.value);
 assert.ok(r.pinkLines>0,'Dragon\'s pink reaches the BG3 palette');
});

test('Some May Die costs Farquaad nothing and leaves both allies at 1 HP',async()=>{
 assert.equal(b.rom[table.MP+56],0);
 const r=await cast(56);
 assert.equal(r.fatal,null);
 assert.equal(r.results.filter(x=>x.techId===56).length,3);
 assert.equal(r.after.mp[0],r.before.mp[0],'no MP spent');
 assert.equal(r.after.hp[0],r.before.hp[0],'Farquaad is fine');
 assert.deepEqual(r.after.hp.slice(1),[1,1]);
});

test('Love & Life brings a fallen ally back at full health',async()=>{
 assert.deepEqual(b.rom.subarray(table.property(6),table.property(6)+12),b.base.subarray(table.property(16),table.property(16)+12));
 assert.equal(b.rom[table.MP+6],b.base[table.MP+6]);
 const r=await cast(6,{frames:700,loadout:'revival'});
 assert.equal(r.fatal,null);
 const fallen=r.before.hp.findIndex(v=>v===0);assert.ok(fallen>0,'the fixture starts an ally down');
 assert.equal(r.after.hp[fallen],999);
});

test('every picture technique has reproducible art in budget, its own script and only Luminaire\'s scene record',{skip:needsSourceImages},async()=>{
 assert.deepEqual(b.audit.techPictures.map(p=>p.tech),techPictures.map(p=>p.tech));
 assert.equal(new Set(techPictures.map(p=>p.tech)).size,techPictures.length);
 for(const[i,p]of techPictures.entries()){
  const g=techPictureGraphics(p),a=b.audit.techPictures[i],source=await readFile(new URL('../'+g.source.source,import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'),g.source.sourceSha256,p.name);
  assert.ok(g.uniqueTiles<=0xee,p.name+' tiles '+g.uniqueTiles);assert.equal(g.width,160);
  assert.deepEqual(b.rom.subarray(a.graphics.tiles,a.graphics.tiles+4096),g.graphics,p.name);
  assert.deepEqual(b.rom.subarray(a.graphics.map,a.graphics.map+2048),g.tilemap,p.name);
  const scene=techPictureScene(b.base,p);assert.deepEqual(b.rom.subarray(a.script,a.script+scene.length),scene,p.name);
  assert.deepEqual(b.rom.subarray(table.animation(p.tech),table.animation(p.tech)+7),b.base.subarray(table.animation(8),table.animation(8)+7),p.name);
  for(const[start,size]of[[table.target(p.tech),2],[table.control(p.tech),11],[table.property(p.tech),12]])assert.deepEqual(b.rom.subarray(start,start+size),b.base.subarray(start,start+size),p.name);
 }
});

test('each picture technique casts, hits all three enemies with its own effect and leaves the battle running',async()=>{
 for(const p of techPictures.filter(p=>p.tech!==24&&p.tech!==56)){
  const r=await cast(p.tech);
  assert.equal(r.fatal,null,p.name);assert.equal(r.stopped,false,p.name);
  const hits=r.results.filter(x=>x.techId===p.tech);assert.equal(hits.length,3,p.name+' reaches every enemy');
  // Are We There Yet? (sleep) and Dungeon (Black Hole's removal chance) deal no damage.
  if(![18,55].includes(p.tech))for(const h of hits)assert.ok(h.value>300,p.name+' damage '+h.value);
 }
});

test('an item or attack whose id happens to be 56 never triggers the sacrifice',async()=>{
 // The command queue reuses $84 for item and attack ids; only a technique
 // command ($80 bit 5) may be Some May Die. Force the collision on an item.
 const s=await bedroom(b.rom),h=installHooks(s,[...specs,{name:'queue',address:0xc1170e,expected:[...b.rom.slice(0x1170e,0x11712)]}]),d=createDevTools(s,h);
 d.jump({id:1,x:7,y:8,party:[0,1,2],endgame:true});runFrames(s,300);d.startCombat({fixture:'swamp-pack',unlockTechs:true});runFrames(s,400);
 for(let n=0;n<1800&&s.ram[0x95d5]>2;n++)s.runFrame();
 const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
 let forced=0;h.on('queue',()=>{if(s.ram[0x80]===0x40){s.ram[0x84]=56;forced++;}});
 const before=[0,1,2].map(i=>u16(s.ram,0x5e30+i*128));
 await useNativeItem(io,197,null,{allowBattleEnd:true}).catch(()=>{});runFrames(s,30);
 assert.ok(forced>0,'an item command was queued');
 const after=[0,1,2].map(i=>u16(s.ram,0x5e30+i*128));
 // The sacrifice would leave both of the user's allies (slots 1 and 2) at 1 HP.
 // (The fixture's own enemies may still hit the user in slot 0.)
 for(const i of[1,2])assert.ok(after[i]>1,'slot '+i+' keeps its HP: '+before+' -> '+after);
 d.dispose();h.dispose();
});
