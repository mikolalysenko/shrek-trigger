import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {carnivalCast,carnivalFields,hatchetProps,carnivalColors} from '../content/carnival.js';
import {carnivalDialogue} from '../content/carnival-dialogue.js';
import {items} from '../content/items.js';
import {u16,u24,fileOffset,put16} from '../engine/rom.js';
import {createCore} from '../scripts/core.mjs';
import {decompress} from '../engine/compression.js';
import {encodeDialogue} from '../engine/text.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {snesColor} from '../engine/sprites.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {musicEventEdits} from '../engine/music.js';
const built=await build(),specs=JSON.parse(await readFile('content/hooks.json')),layouts=JSON.parse(await readFile('content/event-layouts.json'));

test('native equipped-hatchet dispatch selects all field, battle and menu frames without changing stack or graphics banks',async()=>{
  const s=await createCore(built.rom),c=s.cpu,alt=0xc00000|built.audit.carnival.equippedWeapon.assembly,normal=u24(built.rom,0x24230c);
  const start=(pc,db,dp,x)=>{
    s.ram.fill(0);c.reset();c.e=false;c.m=false;c.x=false;c.i=true;c.cyclesLeft=0;c.r[0]=db;c.r[1]=pc>>16;c.br[4]=pc&65535;c.br[5]=dp;c.br[3]=0x7ff;c.br[1]=x;c.br[2]=0x4567;
  };
  const until=pc=>{let n=0;while(((c.r[1]<<16)|c.br[4])!==pc&&n++<10000)c.cycle();assert.ok(n<10000);assert.equal(c.br[2],0x4567);assert.equal(c.x,false);};
  for(const weapon of[59,61,66,65])for(const frame of[0,1,84,243])for(const puss of[true,false]){
    const chosen=puss&&[61,66].includes(weapon)?alt:normal,source=puss?0:0x4000,bank=puss?0xd3:0xd2,offset=frame*40;
    start(0xc0cc34,0,0x100,2);s.ram[0x2769]=weapon;put16(s.ram,0x1282,source);s.ram[0x1202]=bank;put16(s.ram,0x1382,normal&65535);s.ram[0x1d5]=normal>>16;
    s.write(0x4202,frame);s.write(0x4203,40);until(0xc0cc3b);
    assert.equal(c.br[0],(chosen+offset)&65535);assert.equal(s.ram[0x1d5],chosen>>16);assert.equal(c.br[3],0x7ff);assert.equal(c.m,false);assert.equal(c.br[1],2);
    start(0xc11c89,0x7e,0,6);s.ram[0x2769]=weapon;put16(s.ram,0x1c5d,source);s.ram[0x1c5f]=bank;put16(s.ram,0x1c7e,normal&65535);s.ram[0x1c80]=normal>>16;put16(s.ram,0xa9,offset);
    until(0xc11ca4);assert.equal(u16(s.ram,0xba),(chosen+offset)&65535);assert.equal(s.ram[0xbc],chosen>>16);assert.equal(u16(s.ram,0xbd),source);assert.equal(c.br[3],0x7fd);assert.equal(s.ram[0x7ff],0x7e);assert.equal(s.ram[0x7fe],bank);assert.equal(c.br[0],bank);assert.equal(c.m,true);assert.equal(c.br[1],6);
    start(0xc2f4ad,0x7e,0x1900,puss?0x230c:0x2300);s.ram[0x2769]=weapon;until(0xc2f4b9);
    assert.equal(u24(s.ram,0x1907),puss?chosen:u24(built.rom,0x242300));assert.equal(c.br[3],0x7ff);assert.equal(c.m,false);
  }
  const pc=built.audit.characters[4],gfx=built.records.find(r=>r.label==='Puss in Boots 4bpp tiles');
  for(let f=0;f<pc.frameCount;f++)for(let i=0;i<16;i++)assert.ok((u16(built.rom,(alt&0x3fffff)+pc.assembly.frameMap[f]*40+i*2)&2047)*32<gfx.bytes.length);
  assert.equal(pc.assembly.bytes,built.audit.carnival.equippedWeapon.assemblyBytes,'both weapons use the same proven frame grouping');
});

test('Carnival actors preserve native combat and palette ownership; every frame fits the cartridge cell and tile budget',()=>{
  for(const a of carnivalCast){
    const p=0x24f600+a.enemy*10;
    assert.deepEqual(built.rom.slice(p+3,p+10),built.base.slice(p+3,p+10),'native animation, size and combat geometry');
    const ai=readEnemyAI(built.base,a.enemy);
    assert.deepEqual(built.rom.slice(ai.start,ai.start+ai.bytes),built.base.slice(ai.start,ai.start+ai.bytes),'native AI and fusion behavior');
  }
  for(const npc of[46,96,97,98,99,100,101,105,106,124,181]){
    const p=0x24f000+(npc+7)*5;assert.deepEqual(built.rom.slice(p,p+5),built.base.slice(p,p+5),'unrelated NPC '+npc);
  }
  for(const id of[9,171,173]){const p=0x240000+u16(built.base,0x242a00+id*2);assert.deepEqual(built.rom.slice(p,p+24),built.base.slice(p,p+24),'shared palette '+id);}
  for(const id of[11,96,109])assert.deepEqual(built.rom.slice(0x242300+id*3,0x242303+id*3),built.base.slice(0x242300+id*3,0x242303+id*3),'shared prop/child assembly');
  for(const a of built.audit.carnival.actors){
    const gfx=decompress(built.rom,fileOffset(u24(built.rom,0x242000+a.gfx*3))).bytes,asm=fileOffset(u24(built.rom,0x242300+a.asm*3));
    assert.equal(gfx.length,a.graphicsBytes);assert.ok(gfx.slice(0,32).every(v=>v===0));assert.ok(a.tiles<=1024);
    const cells=a.assemblyBytes/a.frames/10;assert.equal(cells,a.size===2?12:4);
    for(let f=0;f<a.frames;f++)for(let i=0;i<cells*4;i++)assert.ok((u16(built.rom,asm+f*cells*10+i*2)&1023)*32<gfx.length,`${a.key} frame ${f}`);
    // All four bitplanes must encode at most the twelve native OBJ colors.
    for(let p=0;p<gfx.length;p+=32)for(let y=0;y<8;y++)for(let x=0;x<8;x++){
      let v=0;for(let k=0;k<4;k++)v|=(gfx[p+(k>>1)*16+y*2+(k&1)]>>(7-x)&1)<<k;assert.ok(v<=12);
    }
  }
  assert.notEqual(built.rom[0x24f600+151*10],built.rom[0x24f600+152*10],'distinct clown graphics');
  assert.notEqual(built.rom[0x24f600+153*10],built.rom[0x24f600+228*10],'Guy Fieri isolated from Milenko');
  for(const id of[61,66,80,81,82,224])assert.ok(/Hatchet|Haft/.test(items.find(i=>i.id===id).name));
  assert.ok(built.audit.resources.freeReclaimedBytes>0);assert.equal(built.rom.length,built.audit.resources.romLimit);assert.ok(built.rom.length<=0x800000);
  for(const pool of built.audit.resources.reclaimedSprites)for(const id of pool.aliases)assert.ok(built.records.some(r=>r.offset===pool.table+id*3&&r.bytes.length===3));
});

test('the hatchet quest retains every event branch, reward and timed cue while replacing local clown disguises',()=>{
  for(const location of Object.keys(carnivalDialogue).map(Number)){
    const l=layouts.find(l=>l.location===location),original=decompress(built.base,l.eventPointer).bytes,patched=decompress(built.rom,fileOffset(u24(built.rom,0x3cf9f0+l.eventId*3))).bytes;
    assert.equal(original.length,patched.length);
    const edits=new Set(l.tableCommands.flatMap(p=>[p+1,p+2,p+3]));
    for(const[pc,,song]of musicEventEdits[location]??[]){edits.add(pc+2);assert.equal(patched[pc+2],song);}
    if(location===151)for(const [pos,npc]of[[0x594,216],[0x5fe,217],[0x768,216],[0x7d5,217]]){edits.add(pos+2);assert.equal(patched[pos+2],npc);}
    if(location===119)for(const [pos,npc]of[[2230,53],[2284,54]]){edits.add(pos+2);assert.equal(patched[pos+2],npc);}
    if(location===401){edits.add(1696);assert.equal(patched[1696],152,'Shaggy retains his own sprite in antiquity');}
    for(let p=0;p<original.length;p++)if(!edits.has(p))assert.equal(patched[p],original[p],`event ${location}:${p.toString(16)}`);
  }
  for(const lines of Object.values(carnivalDialogue))for(const t of Object.values(lines)){
    assert.ok(t.endsWith('{null}')||t.endsWith('{delay 0}'));
    for(const line of t.replace(/\{(?:page3|page|full)\}/g,'\n').replace(/\{[^}]+\}/g,'').split('\n'))assert.ok(line.length<=36,line);
    assert.ok(!/Masamune|MASA:|MUNE:|Nine Lives Blade|Melchior|Cyrus|Glenn/.test(t));
  }
  const cues=bytes=>{const out=[];for(let p=0;p<bytes.length;p++){const c=bytes[p];if(c===3)out.push(c,bytes[++p]);else if(c===10)out.push(c);}return out;};
  const l=layouts.find(l=>l.location===172);
  for(const id of[90,91,92,128,129,130,131,132,133,134]){
    const s=l.strings.find(s=>s.id===id);assert.deepEqual(cues(encodeDialogue(carnivalDialogue[172][id],built.base)),cues(built.base.slice(s.address,s.address+s.capacity)),`timed line ${id}`);
  }
  for(const [loc,id,row]of[[40,103,2],[40,129,1],[40,138,1],[151,16,1],[151,44,1]]){
    const page=carnivalDialogue[loc][id].replace('{null}','').split('{page}').at(-1).split('\n');assert.ok(page[row].startsWith('   '));assert.ok(page[row+1].startsWith('   '));assert.equal(page.length,row+2);
  }
  assert.match(carnivalDialogue[40][164],/DONKEY: I refined the Dreamstone\.\nThe Muffin Man fixed the rest\./,'post-repair credit matches the actual helper and Muffin Man roles');
});

test('all clown, fusion and hatchet poses render through native field loaders and preview undo restores the game',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),start=s.frames;
  for(const a of[...carnivalCast,...carnivalFields,...hatchetProps]){
    dev.previewActor(a.key,0);runFrames(s,280);const d=dev.diagnostics();assert.equal(d.preview.object,15);assert.ok(d.preview.script);
    assert.equal(u16(s.ram,0x141e),u16(built.rom,0x242a00+a.palette*2));
    const colors=carnivalColors[a.art??(a.enemy===undefined?'hatchet':a.key)].map(snesColor);
    assert.ok(Array.from({length:8},(_,i)=>129+i*16).some(p=>colors.every((v,k)=>s.ppu.cgram[p+k]===v)),a.key+' native palette');
    for(let f=0;f<a.frames;f++){dev.previewFrame(f);runFrames(s,8);assert.equal(s.ram[0x131f],f);assert.equal(dev.diagnostics().preview.script,d.preview.script);assert.ok(!s.cpu.stopped);}
    dev.previewFrame(a.enemy===undefined?0:4);runFrames(s,8);await screenshot(s,`.local/qa/${a.key}-tested.png`);
  }
  dev.undo();assert.equal(u16(s.ram,0x100),2);assert.ok(s.frames-start<=1);dev.dispose();h.dispose();
});

test('native mountain dialogue, both battles, Milenko fusion and hatchet-head reward complete through controller input',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),messages=[],formations=new Set(),music=[],originalStory=s.ram[0x10000];
  h.on('dialogue.render',e=>{if(e.location===151)messages.push(e.stringId);});
  h.on('battle.initialized',e=>{if(e.location===151)music.push(s.ram[0x29ae]);});
  assert.throws(()=>dev.jump({id:1,x:8,y:13,carnivalChallenge:true}),/mountain/);
  dev.jump({id:151,x:8,y:13,facing:0,party:[0,1,2],carnivalChallenge:true});runFrames(s,420);
  assert.equal(u16(s.ram,256),151);assert.equal(s.ram[0x10000],0x5f);
  // The shortcut establishes a party/loadout and pre-quest story state.
  // From arrival onward there are no WRAM writes, enemy-HP edits or event skips.
  runFrames(s,75,16);runFrames(s,90);
  const press=()=>{runFrames(s,3,256);runFrames(s,90);};
  for(let i=0;i<400;i++){
    press();for(const id of s.ram.slice(0xaf02,0xaf0a))if([151,152,153].includes(id))formations.add(id);
    if(i===25)await screenshot(s,'.local/qa/carnival-duo-battle.png');
    if(i===63)await screenshot(s,'.local/qa/carnival-milenko-battle.png');
    if(formations.has(153)&&!(s.ram[0x117]&1)&&messages.includes(38)&&!s.ram[0x126]&&s.ram[0x11f])break;
  }
  assert.equal(s.ram[0x117]&1,0);assert.equal(s.ram[0x126],0);assert.equal(s.ram[0x11f],1);
  assert.deepEqual([...formations].sort(),[151,152,153]);
  assert.deepEqual(music,[81,81],'both native guardian phases play Hatchet Carnival');
  for(const id of[15,16,18,19,20,27,28,29,30,31,32,33,34,35,36,37,38])assert.ok(messages.includes(id),'quest line '+id);
  // Walk back up the steps to collect the head. The native trigger moves the
  // party away from the pickup; holding a direction cannot bypass that scene.
  for(let i=0;i<160&&s.ram[0x10000]!==0x60;i++){
    const dx=136-u16(s.ram,0x1802)/16,dy=127-u16(s.ram,0x1882)/16;
    runFrames(s,4,(Math.abs(dx)>3?(dx>0?128:64):0)|(Math.abs(dy)>3?(dy>0?32:16):0));
  }
  for(let i=0;i<40&&s.ram[0x10000]!==0x60;i++)press();
  assert.equal(s.ram[0x10000],0x60);assert.ok(messages.includes(41)&&messages.includes(43));
  const slot=s.ram.subarray(0x2400,0x2500).indexOf(80);assert.ok(slot>=0);assert.equal(s.ram[0x2500+slot],1,'one Broken Hatchet Head');
  for(let i=0;i<20&&u16(s.ram,256)===151;i++)press();
  assert.equal(u16(s.ram,256),497,'native wind ride returns to the medieval overworld');
  assert.ok(messages.includes(39)&&messages.includes(40));assert.ok(!s.cpu.stopped);
  await screenshot(s,'.local/qa/carnival-head-collected.png');
  dev.undo();assert.equal(u16(s.ram,256),2);assert.equal(s.ram[0x10000],originalStory);assert.equal(s.ram.subarray(0x2400,0x2500).indexOf(80),-1);dev.dispose();h.dispose();
});

test('the Muffin Man reforges both hatchet parts through native stairs, helper branches and the return scene',async()=>{
  for(const party of[[0,1,2],[0,3,4]]){
    const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),messages=[];
    h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
    s.ram[0x10000]=0x7e;s.ram[0x1019b]&=~48;s.ram.set([80,81,220],0x2400);s.ram.set([1,1,1],0x2500);
    dev.jump({id:40,x:40,y:24,facing:0,party});runFrames(s,400);
    const press=()=>{runFrames(s,3,256);runFrames(s,100);};
    for(let i=0;i<24;i++)press();
    assert.ok(s.ram[0x1019b]&16,'native repair started');assert.ok(messages.some(([l,id])=>l===40&&id===130));
    function walk(tx,ty){for(let i=0;i<160&&u16(s.ram,256)===40;i++){
      const dx=tx*16+8-u16(s.ram,0x1802)/16,dy=ty*16+15-u16(s.ram,0x1882)/16;
      if(Math.abs(dx)<=3&&Math.abs(dy)<=3)break;
      runFrames(s,4,(Math.abs(dx)>3?(dx>0?128:64):0)|(Math.abs(dy)>3?(dy>0?32:16):0));
    }}
    walk(40,28);walk(42,28);runFrames(s,350);assert.equal(u16(s.ram,256),41,'walk through the original basement exit');
    for(let i=0;i<90&&s.ram[0x10000]!==0x81;i++)press();
    assert.equal(s.ram[0x10000],0x81);assert.equal(u16(s.ram,256),40,'forge returns upstairs');
    for(let i=0;i<12;i++)press();
    for(const id of[147,156,158])assert.ok(messages.some(([l,n])=>l===41&&n===id));
    assert.ok(messages.some(([l,id])=>l===40&&id===135),'restored hatchet presentation');
    const inv=s.ram.subarray(0x2400,0x2500);for(const id of[80,81,220])assert.equal(inv.indexOf(id),-1,'consumed quest material '+id);
    assert.ok(inv.includes(82),'restored Carnival Hatchet quest item');assert.equal(s.ram[0x1019b]&48,0);
    assert.ok(messages.some(([l,id])=>l===40&&id===(party.includes(2)?133:134)),'correct helper branch');
    // String 164 belongs to an unused call-only event function, so ordinary
    // input cannot display it. Verify its narrative without inventing a route.
    if(party.includes(2))assert.match(carnivalDialogue[40][164],/I refined the Dreamstone\.\nThe Muffin Man fixed the rest\./);
    await screenshot(s,`.local/qa/carnival-forge-helper-${party[1]}.png`);dev.dispose();h.dispose();
  }
});

test('the native shrine reunion awakens the hatchet and equips its original upgrade',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),messages=[];
  h.on('dialogue.render',e=>{if(e.location===73)messages.push(e.stringId);});
  s.ram[0x10000]=0xc0;s.ram[0x101a3]=(s.ram[0x101a3]|16)&~64;s.ram[0x2769]=61;
  dev.jump({id:73,x:40,y:43,facing:0,party:[4,0,1]});runFrames(s,400);runFrames(s,15,16);runFrames(s,40);
  for(let i=0;i<120&&!(s.ram[0x101a3]&64);i++){runFrames(s,3,256);runFrames(s,100);}
  assert.ok(s.ram[0x101a3]&64);assert.ok(s.ram[0x101f4]&64);assert.equal(s.ram[0x2769],66,'awakened equipment ID');
  for(const id of[18,19,20,21,22,23,24,25,26,28,30,31,32,33,34,35,36,37])assert.ok(messages.includes(id),'shrine line '+id);
  assert.equal(s.ram.subarray(0x2400,0x2500).indexOf(61),-1,'no duplicate basic hatchet remains');
  await screenshot(s,'.local/qa/carnival-awakened-hatchet.png');dev.dispose();h.dispose();
});

test('Puss accepts the repaired hatchet through all native flashbacks and opens the fortress route',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),messages=[];
  h.on('dialogue.render',e=>messages.push([e.location,e.stringId]));
  s.ram[0x10000]=0x81;s.ram[0x1019b]&=~48;s.ram[0x2400]=82;s.ram[0x2500]=1;
  dev.jump({id:141,x:9,y:8,facing:0,party:[0,1,2]});runFrames(s,400);runFrames(s,48,64);runFrames(s,40);
  const press=(button=256)=>{runFrames(s,3,button);runFrames(s,100);};
  for(let i=0;i<220&&s.ram[0x10000]!==0x84;i++)press();
  assert.equal(s.ram[0x10000],0x84);for(let i=0;i<8;i++)press();for(let i=0;i<3;i++)press(1);
  assert.ok(s.ram.subarray(0x2980,0x2983).includes(4),'Puss joins through the native party selector');
  for(const [l,ids]of[[206,[0,1,2,3,4,5,6,7,8,9,10]],[204,[11,12,13]],[205,[136,139,149,155,159]],[271,[188]],[141,[133,134,135,160,162]]])for(const id of ids)assert.ok(messages.some(([loc,n])=>loc===l&&n===id),`flashback ${l}:${id}`);
  // A diagnostic transition connects two independently gated quest scenes.
  // The handoff, equipment swap and cave opening below are native events.
  dev.jump({id:163,x:11,y:13,facing:0,party:[0,4,1]});runFrames(s,400);
  for(let i=0;i<240&&s.ram[0x10000]!==0x87;i++)press();
  for(let i=0;i<2400&&u16(s.ram,256)!==164;i++)s.runFrame();assert.equal(s.ram[0x10000],0x87);assert.equal(u16(s.ram,256),164);
  assert.equal(s.ram[0x2769],61);assert.equal(s.ram.subarray(0x2400,0x2500).indexOf(82),-1,'quest object converted to equipped hatchet');assert.ok(s.ram.subarray(0x2400,0x2500).includes(59),'previous weapon returns to inventory');
  for(const [l,ids]of[[119,[80,81,82,83,84,85,86]],[135,[97,98,99,100,101,102]],[142,[195]],[163,[196,197,198]]])for(const id of ids)assert.ok(messages.some(([loc,n])=>loc===l&&n===id),`handoff ${l}:${id}`);
  assert.equal(dev.diagnostics().fatal,null);await screenshot(s,'.local/qa/carnival-fortress-opened.png');dev.dispose();h.dispose();
});

test('equipped hatchets render in a live field, menu and battle through the three native dispatchers',async()=>{
  const s=await bedroom(built.rom),extra=[[0xc0cc3b,'hatchet.field'],[0xc11ca4,'hatchet.battle'],[0xc2f4b9,'hatchet.menu']].map(([address,name])=>({address,name,expected:[built.rom[address&0x3fffff]]})),h=installHooks(s,[...specs,...extra]),dev=createDevTools(s,h),seen={};
  const alt=0xc00000|built.audit.carnival.equippedWeapon.assembly;
  h.on('hatchet.field',()=>{const c=s.cpu,x=c.br[1];if(s.ram[0x1200+x]===0xd3&&u16(s.ram,0x1280+x)===0){assert.equal(c.br[0]|s.ram[c.br[5]+0xd5]<<16,alt+built.audit.characters[4].assembly.frameMap[s.ram[0xf01+x]]*40);seen.field=true;}});
  h.on('hatchet.battle',()=>{const c=s.cpu,x=c.br[1];if(s.ram[0x1c59+x]===0xd3&&u16(s.ram,0x1c57+x)===0){assert.equal(u24(s.ram,c.br[5]+0xba),alt+u16(s.ram,c.br[5]+0xa9));seen.battle=true;}});
  h.on('hatchet.menu',()=>{const c=s.cpu;if(c.br[1]===0x230c){assert.equal(u24(s.ram,c.br[5]+7),alt);seen.menu=true;}});
  s.ram[0x2769]=61;dev.jump({id:5,x:27,y:32,party:[4,0,1]});runFrames(s,400);assert.equal(dev.diagnostics().fatal,null);assert.ok(seen.field);await screenshot(s,'.local/qa/hatchet-equipped-field.png');
  runFrames(s,3,512);runFrames(s,300);assert.ok(seen.menu);await screenshot(s,'.local/qa/hatchet-equipped-menu.png');runFrames(s,3,1);runFrames(s,150);
  dev.jump({id:151,x:8,y:13,facing:0,party:[4,0,1],carnivalChallenge:true});runFrames(s,420);runFrames(s,75,16);runFrames(s,90);
  for(let i=0;i<40&&!seen.battle;i++){runFrames(s,3,256);runFrames(s,90);}
  assert.ok(seen.battle);assert.equal(s.ram[0x2769],66);runFrames(s,120);await screenshot(s,'.local/qa/hatchet-equipped-battle.png');dev.dispose();h.dispose();
});
