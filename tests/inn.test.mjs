import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,screenshot} from './helpers.mjs';
import {guyFieriTiers,guyFieriColors} from '../content/guy-fieri.js';
import {guyFieriFrameMap,guyFieriSprite} from '../engine/guy-fieri.js';
import {innDialogue} from '../content/inn-dialogue.js';
import {u16,u24,fileOffset,put16} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {snesColor} from '../engine/sprites.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {snapshot,restore} from '../engine/save.js';
import {runFrames} from '../engine/automation.js';
import {encode} from '../engine/text.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
const built=await build(),specs=JSON.parse(await readFile('content/hooks.json')),layouts=JSON.parse(await readFile('content/event-layouts.json'));

test('Last Inn retains original functions and decision rows around the egg challenge; Guy Fieri preserves six tiers and other enemy headers',()=>{
  for(const location of[464,465]){
    const l=layouts.find(l=>l.location===location),a=decompress(built.base,l.eventPointer).bytes,b=decompress(built.rom,fileOffset(u24(built.rom,0x3cf9f0+l.eventId*3))).bytes;
    const pointers=new Set(l.tableCommands.flatMap(p=>[p+1,p+2,p+3]));
    if(location===464){
      assert.ok(b.length<=0x1700,'native Last Inn event buffer');
      pointers.add(0x1180); // Steve leaves Pinocchio's palette for his guru's slot7.
      const steveInit=u16(b,1+28*32);
      assert.equal(b[steveInit+8],0x33);assert.equal(b[steveInit+9],7);
      const starts=[...new Set(Array.from({length:a[0]*16},(_,i)=>u16(a,1+i*2)))].sort((x,y)=>x-y);
      for(let i=0;i<a[0]*16;i++){
        if(i===5||i===28*16+9)continue; // Egg handoff and the new chewing helper.
        const old=u16(a,1+i*2),now=u16(b,1+i*2),length=(starts[starts.indexOf(old)+1]??a.length-1)-old;
        for(let k=1;k<=length;k++)if(!pointers.has(old+k))assert.equal(b[now+k],a[old+k],`unchanged Last Inn function ${i}, byte ${k}`);
      }
    }else{
      // The Walmart greeter appends object 21 (tests/mr-worldwide.test.mjs).
      // Every source function keeps its bytes after the uniform 32-byte
      // table growth; Guy's startup and practice calls are untouched.
      assert.equal(b[0],a[0]+1);assert.ok(b.length<=0x1700);
      const starts=[...new Set(Array.from({length:a[0]*16},(_,i)=>u16(a,1+i*2)))].sort((x,y)=>x-y);
      for(let i=0;i<a[0]*16;i++){
        const old=u16(a,1+i*2),now=u16(b,1+i*2),length=(starts[starts.indexOf(old)+1]??a.length-1)-old;
        assert.equal(now,old+32,`lesson-room function ${i} moves with the table`);
        for(let k=1;k<=length;k++)if(!pointers.has(old+k))assert.equal(b[now+k],a[old+k],`unchanged lesson-room function ${i}, byte ${k}`);
      }
      // Guy's two practice calls stay direct calls into his own function.
      for(const p of[0x557,0x6ea]){assert.deepEqual([...a.slice(p,p+3)],[0x04,0x00,0x43]);assert.deepEqual([...b.slice(p+32,p+35)],[0x04,0x00,0x43],'practice call '+p);}
    }
    assert.equal(Object.keys(innDialogue[location]).length,l.strings.length,'complete local string coverage');
  }
  const choiceRows={464:{128:1,129:1,132:2,135:1,138:2,141:2,145:1,148:2,149:2,150:2,151:2,152:2,153:2,154:2,155:2,156:2,157:2,165:1},465:{136:1,152:2,154:2}};
  for(const[loc,rows]of Object.entries(choiceRows))for(const[id,row]of Object.entries(rows)){
    const lines=innDialogue[loc][id].replace('{null}','').split('\n');assert.ok(lines[row].startsWith('   '));assert.ok(lines[row+1].startsWith('   '));assert.equal(lines.length,row+2);
  }
  for(const lines of Object.values(innDialogue))for(const text of Object.values(lines)){
    assert.ok(text.endsWith('{null}'));for(const line of text.replace(/\{(?:full|page)\}/g,'\n').replace(/\{(?:shrek|fiona|donkey|pinocchio|puss|mongo|farquaad|pc1|item)\}/g,'WWWWW').replace('{null}','').split('\n'))assert.ok(line.length<=36,line);
    assert.ok(!/DORIS|Doris|Spekkio|Lavos|Gaspar|Ether|Elixir|Magic Tab|Speed Tab|Power Tab/.test(text));
  }
  const guyText=Object.values(innDialogue[465]).join('\n');
  assert.ok((guyText.match(/Flavortown/g)||[]).length>=3,'Flavortown recurs throughout the lessons');
  assert.match(guyText,/Diners, Drive-Ins and Dives/,'Guy explicitly calls back to his road-trip show');
  assert.match(guyText,/diner,[\s\S]*drive-in or dive/,'the road-trip callback continues after the introduction');
  assert.equal(new Set(guyFieriTiers.map((_,tier)=>guyFieriColors(tier).join())).size,6,'every training form has a distinct palette');
  for(const[tier,pose]of[[1,'unarmed-cast'],[2,'attack']]){
    const spec=guyFieriFrameMap(tier).find(p=>p.pose===pose&&p.facing===1);
    assert.notDeepEqual(guyFieriSprite(tier,spec),guyFieriSprite(0,spec),`tier ${tier} adds its signature action effect`);
  }
  for(const spec of guyFieriFrameMap(5))assert.notDeepEqual(guyFieriSprite(5,spec),guyFieriSprite(0,spec),'the master form keeps its golden crown in every native slot');
  for(let i=0;i<256;i++){
    const p=0x24f600+i*10;if(i>=224&&i<=229)assert.deepEqual(built.rom.slice(p+3,p+10),built.base.slice(p+3,p+10));
    else if([0,3,6,0x4c,0x4d,0x4e,0x4f,0x71,0x74,0x7c,0x82,0x91].includes(i))assert.deepEqual(built.rom.slice(p,p+10),built.base.slice(p,p+10),'ordinary enemy headers');
  }
  for(const tier of guyFieriTiers){
    assert.deepEqual(built.rom.slice(0xc6500+tier.id*11,0xc6500+(tier.id+1)*11),encode('Guy Fieri',{length:11}),'every native battle form is Guy Fieri');
    for(const[table,stride]of [[0xc4700,23],[0xc5e00,7]])assert.deepEqual(built.rom.slice(table+tier.id*stride,table+(tier.id+1)*stride),built.base.slice(table+tier.id*stride,table+(tier.id+1)*stride),'original training progression and resistances');
    const ai=readEnemyAI(built.base,tier.id);assert.deepEqual(built.rom.slice(ai.start,ai.start+ai.bytes),built.base.slice(ai.start,ai.start+ai.bytes),'original training AI');
  }
  for(const id of[84,115])assert.deepEqual(built.rom.slice(0x242000+id*3,0x242003+id*3),built.base.slice(0x242000+id*3,0x242003+id*3),'shared original graphics pointer');
  // The Kilwala bank81 is stock again. Guy225 retains its separate bank while
  // sharing unchanged AA28 timing.
  assert.ok(!built.audit.townsfolk.actors.some(a=>a.gfx===81));
  assert.equal(u24(built.rom,0x242000+81*3),u24(built.base,0x242000+81*3));
  assert.notEqual(u24(built.rom,0x242000+81*3),u24(built.rom,0x242000+252*3));
  // The frogs' bank 98 is stock after Guy Fieri leaves it. Its five remaining
  // owners retain their headers and never use Guy Fieri's bank 252.
  assert.ok(!built.audit.futureWildlife.actors.some(a=>a.gfx===98));
  assert.equal(u24(built.rom,0x242000+98*3),u24(built.base,0x242000+98*3));
  for(const id of[76,77,78,79,145])assert.equal(built.rom[0x24f600+id*10],98);
  assert.notEqual(u24(built.rom,0x242000+98*3),u24(built.rom,0x242000+252*3));
  // Ordinary swamp creatures return to the stock bank after the master lesson
  // moves into Guy Fieri's private resources. Both native headers stay intact.
  assert.deepEqual(built.audit.swampCreatures.actors,[]);
  assert.equal(u24(built.rom,0x242000+99*3),u24(built.base,0x242000+99*3));
  assert.deepEqual([...built.rom.slice(0x24f600+229*10,0x24f603+229*10)],[252,237,250]);
  assert.notEqual(built.rom[0x24f600+228*10],built.rom[0x24f600+153*10],'Guy Fieri is isolated from Great Milenko');
  assert.ok(built.audit.guyFieri.tiles<1024);
});

test('Guy Fieri keeps the original leader-level selection and all 133 native frame slots render within their original cell budgets',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),initial=snapshot(s);let actor=null,script=0,loaded=[];
  h.on('event.init',e=>{if(e.location===465&&e.opcode===0x83){loaded.push(s.ram[0x12002+e.scriptPC]);actor=e.object;}});
  h.on('event.dispatch',e=>{if(e.location!==465||actor===null||script||e.object!==actor)return;script=0x12001+e.scriptPC;s.ram.set([0xa6,1,0xac,0,0xad,1,0x11,5],script);});
  for(let tier=0;tier<6;tier++){
    restore(s,initial);actor=null;script=0;loaded=[];s.ram[0x2612]=[1,10,20,30,40,99][tier];
    dev.jump({id:465,x:8,y:11,party:[0,1,2]});runFrames(s,300);
    assert.deepEqual(loaded,[224+tier]);assert.equal(actor,10);assert.ok(script);
    const colors=guyFieriColors(tier).map(snesColor);assert.ok(Array.from({length:8},(_,i)=>129+i*16).some(p=>colors.every((v,k)=>s.ppu.cgram[p+k]===v)),'native Guy Fieri palette');
    for(let f=0;f<guyFieriTiers[tier].frames;f++){s.ram[script+3]=f;runFrames(s,8);assert.equal(s.ram[0x1301+actor*2],f);assert.ok(!s.cpu.stopped);}
    s.ram[script+3]=4;runFrames(s,8);await screenshot(s,`.local/qa/guy-fieri-tier-${tier}.png`);
  }
  dev.dispose();h.dispose();
});

test('Guy Fieri practice uses native decisions, a real magic attack and the victory event',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),messages=[],techs=[];
  h.on('dialogue.render',e=>{if(e.location===465)messages.push(e.stringId);});h.on('battle.tech',e=>techs.push(e.techId));
  const story=s.ram[0x10000],level=s.ram[0x2612];
  assert.throws(()=>dev.jump({id:1,x:7,y:10,trainingLevel:1}),/Guy Fieri/);
  dev.jump({id:465,x:7,y:10,facing:0,party:[0,1,2],trainingLevel:1});runFrames(s,300);
  const press=b=>{runFrames(s,3,b);runFrames(s,90);};
  for(let i=0;i<16&&s.ram[0xaf02]!==224;i++){press(256);runFrames(s,120);}
  runFrames(s,300);assert.equal(s.ram[0xaf02],224);assert.ok(messages.includes(154)&&messages.includes(153),'practice decision accepted');
  await screenshot(s,'.local/qa/guy-fieri-practice-battle.png');
  // Isolate native action/victory presentation. The ordinary HP/stat tables
  // remain untouched; this setup changes one combatant's temporary battle HP.
  put16(s.ram,0x5e30+3*128,1);
  press(32);press(256);press(32);press(32);press(256);press(256);runFrames(s,1400);
  assert.ok(techs.some(t=>[3,11].includes(t)),'native lightning or ice action');
  assert.ok(messages.includes(156),'Guy Fieri victory dialogue returned');assert.equal(u16(s.ram,0x100),465);assert.ok(!s.cpu.stopped);
  dev.undo();assert.equal(u16(s.ram,0x100),2);assert.equal(s.ram[0x10000],story);assert.equal(s.ram[0x2612],level);
  dev.dispose();h.dispose();
});

test('the first lesson accepts three clockwise laps through real movement and grants the original magic unlocks',async()=>{
  const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),messages=[];
  h.on('dialogue.render',e=>{if(e.location===465)messages.push(e.stringId);});
  // Scenario setup ends at arrival. From the introductory conversation onward,
  // all progression below comes from controller input and the native scripts.
  s.ram[0x10000]=0x4b;dev.jump({id:465,x:7,y:10,facing:0,party:[0,1,2]});runFrames(s,300);
  const press=()=>{runFrames(s,3,256);runFrames(s,180);};
  for(let i=0;i<40&&s.ram[0x10000]!==0x4c;i++)press();runFrames(s,30);
  assert.equal(s.ram[0x10000],0x4c);assert.ok(messages.includes(135)&&messages.includes(144));
  const position=()=>[u16(s.ram,0x1802)/16,u16(s.ram,0x1882)/16];
  function walk(tx,ty){
    const target=[tx*16+8,ty*16+15];let stationary=0,previous='';
    for(let i=0;i<200;i++){
      const [x,y]=position(),dx=target[0]-x,dy=target[1]-y;if(Math.abs(dx)<5&&Math.abs(dy)<5)break;
      const input=(Math.abs(dx)>=5?(dx>0?128:64):0)|(Math.abs(dy)>=5?(dy>0?32:16):0);
      runFrames(s,4,input);const current=position().join(',');stationary=current===previous?stationary+1:0;previous=current;
      // Wall collision can stop the body before the invisible trigger's center.
      if(stationary>15)break;
    }
    runFrames(s,6);
  }
  walk(5,13);
  for(let lap=0;lap<3;lap++){
    for(const [i,[x,y]]of [[1,12],[5,3],[13,7],[9,15]].entries()){
      walk(x,y);assert.equal(s.ram[0x10214+i*2],lap+1,`lap ${lap+1}, corner ${i+1}`);
    }
    walk(5,13);
  }
  assert.equal(s.ram[0x1021c],3,'native lap-completion state');
  walk(7,10);runFrames(s,1,16);runFrames(s,20);
  for(let i=0;i<12&&s.ram[0x10000]!==0x4d;i++)press();
  assert.equal(s.ram[0x10000],0x4d);assert.equal(s.ram[0x101e0]&7,7);
  assert.deepEqual(Array.from(s.ram.slice(0x2830,0x2833)),[3,3,3]);
  for(const line of[146,147,148,149,150,152])assert.ok(messages.includes(line),`lesson line ${line}`);
  await screenshot(s,'.local/qa/guy-fieri-first-lesson-complete.png');dev.dispose();h.dispose();
});
