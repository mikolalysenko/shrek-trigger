import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom,finalArena,screenshot} from './helpers.mjs';
import {createCore} from '../scripts/core.mjs';
import {u16,put16} from '../engine/rom.js';
import {installHooks} from '../engine/hooks.js';
import {readEnemyAI} from '../engine/enemy-ai.js';
import {runFrames} from '../engine/automation.js';
import {snapshot,restore} from '../engine/save.js';
import {attackNativeEnemy} from './battle-controller.mjs';
import {createDevTools} from '../engine/devtools.js';
import {decodeSourceDialogue} from '../engine/source-dialogue.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';

const built=await build(),specs=JSON.parse(await readFile('content/hooks.json'));

test('native battle messages use the adapted cast and final threat',()=>{
 const table=(built.rom[0xd02a0]<<16)|u16(built.rom,0xd0299),stale=/\b(?:Crono|Marle|Lucca|Robo|Ayla|Magus|Guardia|Leene|Cyrus|Glenn|Melchior|Gaspar|Belthasar|Schala|Janus|Dalton|Lavos|Masamune|Doreen|Spekkio|Enhasa|Kajar|Zeal|Mammon|Blackbird|Black Omen)\b/i;
 for(let id=0;id<227;id++){
  const address=cartridgeOffset((table&0xff0000)|u16(built.rom,(table&0x3fffff)+id*2),built.rom),text=decodeSourceDialogue(built.rom,address);assert.ok(!stale.test(text),`battle message ${id}: ${text}`);
 }
 assert.equal(decodeSourceDialogue(built.rom,cartridgeOffset((table&0xff0000)|u16(built.rom,(table&0x3fffff)+175*2),built.rom)),'The Carnival Hatchet lowers the Muffin\'s M def!{null}');
});

test('uppercut uses an unused native effect and no AI operand aliases the FE delimiter',()=>{
  const ai=readEnemyAI(built.rom,206);
  assert.ok(ai.bytes<=readEnemyAI(built.base,206).bytes);
  for(const section of ai.sections)for(const block of section)for(const a of block.actions)assert.ok(!a.bytes.includes(254));
  assert.equal(built.rom[0xc7ac9+built.audit.finaleAI.uppercut*12],4);
  for(const section of ai.sections)for(const block of section)assert.ok(block.conditions.length<=2,'native AI supports at most two predicates');
});

test('the native shout predicate requires the first Tyson cycle, a living Shrek and a living selected target',async()=>{
  const s=await createCore(built.rom),ai=readEnemyAI(built.rom,206);
  const starts=ai.sections[0].filter(block=>block.conditions[0][0]===0x1c).map(block=>block.actions[0].offset-5);
  assert.equal(starts.length,3);
  for(const party of [[0,1,2],[1,0,2],[1,2,0],[1,2,4],[255,1,2],[1,255,0]])for(const phase of [0,1,2,3,4,5])for(let slot=0;slot<3;slot++)for(const actor of [0,1]){
    const c=s.cpu;s.ram.fill(0);c.reset();c.e=false;c.m=true;c.x=false;c.i=true;c.cyclesLeft=0;c.r[0]=0x7e;c.r[1]=0xc1;c.br[4]=0x96d4;c.br[5]=0;c.br[3]=0x7fd;
    put16(s.ram,0x7fe,0xb7ff);put16(s.ram,0xb1d2,starts[slot]&65535);
    s.ram.set(party,0xaeff);s.ram[0xaf02]=206;s.ram[0xb252]=actor;s.ram[0x5fe4]=phase;
    let n=0;while(c.br[4]!==0x8c3e&&c.br[4]!==0xb800){c.cycle();assert.ok(n++<1000);}
    const pass=actor===0&&phase===0&&party.includes(0)&&party[slot]!==255;
    assert.equal(c.br[4]===0x8c3e,pass,JSON.stringify({party,phase,slot,actor}));
    if(!pass)assert.equal(s.ram[0xaf24],1);
    assert.deepEqual([...s.ram.slice(0xaeff,0xaf02)],party,'predicate never changes party identity or KO state');
    assert.equal(s.ram[0x5fe4],phase,'only the native AI action advances the cycle');
  }
});

test('native uppercut stages exact lethal damage regardless of defense and cancels a changed target',async()=>{
  const rom=built.rom.slice();rom[0x1d370]=0xdb; // Test return sentinel in the old unused type-4 stub.
  const s=await createCore(rom);
  for(const hp of [1,99,999])for(const defense of [0,127,255])for(const slot of [0,1,2]){
    s.ram.fill(0);s.cpu.reset();const c=s.cpu;
    c.e=false;c.m=true;c.x=false;c.i=true;c.cyclesLeft=0;c.r[1]=0xc1;c.r[0]=0x7e;c.br[4]=0xd9ed;c.br[5]=0;c.br[3]=0x7fd;
    put16(s.ram,0x7fe,0xd36f);s.ram[0xb18b]=3;s.ram[0xad8d]=1;s.ram[0xad8e]=slot;s.ram[0x5fe4]=slot+1;
    put16(s.ram,0x5e30+slot*128,hp);s.ram[0x5e6b+slot*128]=defense;s.ram[0x5e4b+slot*128]=0x30;
    s.ram[0x5e4e+slot*128]=0xff;s.ram[0x5e53+slot*128]=0xff;
    let ticks=0;while(!c.stopped&&ticks++<30000)c.cycle();
    assert.ok(c.stopped);assert.equal(u16(s.ram,0xad9c+slot*4),hp);assert.equal(s.ram[0x5fe4],4);
    assert.equal(u16(s.ram,0x5e30+slot*128),hp,'normal engine applies staged damage later');
    assert.equal(s.ram[0xad8d],0);
  }
  s.ram.fill(0);s.cpu.reset();const c=s.cpu;c.e=false;c.m=true;c.x=false;c.i=true;c.cyclesLeft=0;c.r[1]=0xc1;c.r[0]=0x7e;c.br[4]=0xd9ed;c.br[5]=0;c.br[3]=0x7fd;
  put16(s.ram,0x7fe,0xd36f);s.ram[0xb18b]=3;s.ram[0xad8d]=1;s.ram[0xad8e]=1;s.ram[0x5fe4]=1;put16(s.ram,0x5eb0,999);
  let ticks=0;while(!c.stopped&&ticks++<30000)c.cycle();assert.ok(c.stopped);assert.equal(u16(s.ram,0xada0),0);assert.equal(s.ram[0x5fe4],4);
});

test('native final battle names its target, winds up, knocks out that slot and recovers',async()=>{
  const s=await finalArena(built.rom),h=installHooks(s,specs),messages=[],strikes=[];
  h.on('battle.message',e=>messages.push(e));
  h.on('battle.enemy-tech',e=>{if(e.operand===built.audit.finaleAI.uppercut)strikes.push(e);});
  let warned=false,knockedOut=false,recovered=false;
  for(let i=0;i<5200;i++){
    s.runFrame();
    if(!warned&&messages.some(e=>e.messageId===247)) {warned=true;for(let j=0;j<240;j++)s.runFrame();assert.equal(s.ram[0x990a],24,'stable native windup frame');await screenshot(s,'.local/qa/finale-windup.png');}
    if(strikes.length&&s.ram[0xaeff]===255){knockedOut=true;assert.equal(u16(s.ram,0x5e30),0);assert.equal(s.ram[0x5fe4],4);}
    if(knockedOut&&messages.some(e=>e.messageId===251)){recovered=true;break;}
  }
  assert.ok(warned&&knockedOut&&recovered);assert.equal(strikes.length,1);
  const tell=messages.find(e=>e.messageId===247);assert.ok(strikes[0].frame-tell.frame>=120,'at least two seconds at default speed');
  assert.ok(!s.cpu.stopped);await screenshot(s,'.local/qa/finale-recovery.png');h.dispose();
});

test('Shrek shouts inside the actual Tyson fight from any living party slot, and an absent Shrek does not speak',async()=>{
  for(const party of [[0,1,2],[1,0,2],[1,2,0],[1,2,4]]){
    const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h),messages=[];
    let shoutFrame;
    h.on('battle.message',e=>{messages.push(e.messageId);if(e.messageId===245)shoutFrame=e.frame;});
    dev.jump({id:479,x:7,y:10,party,endgame:true});
    for(let n=0;n<4000&&!messages.some(id=>id>=247&&id<=249);n++){
      s.runFrame();
      if(shoutFrame!==undefined&&s.frames===shoutFrame+30){
        assert.equal(s.ram[0xaf02],206,'Tyson is in the real formation');
        assert.ok(s.ram[0x117]&1,'the native battle is running');
        await screenshot(s,`.local/qa/shrek-tyson-shout-slot-${party.indexOf(0)}.png`);
      }
    }
    assert.ok(messages.some(id=>id>=247&&id<=249),'native first uppercut tell');
    assert.equal(messages.filter(id=>id===245).length,party.includes(0)?1:0,'conditional native Shrek line');
    assert.equal(dev.diagnostics().fatal,null);dev.undo();dev.dispose();h.dispose();
  }
});

test('Sock Whiff revives the uppercut victim through the native battle menu and consumes one item',async()=>{
  const s=await finalArena(built.rom);let dead=false;
  for(let i=0;i<4200;i++){s.runFrame();if(s.ram[0xaeff]===255){dead=true;break;}}
  assert.ok(dead);runFrames(s,100);
  // Isolate item behavior from the other two enemies' damage during menu QA.
  for(const j of [1,2])put16(s.ram,0x5e30+j*128,999);
  const press=b=>{runFrames(s,3,b);runFrames(s,10);};
  press(32);press(32);press(256);runFrames(s,30);
  for(let i=0;i<10;i++)press(32);press(256);press(256);
  let revived=false;
  for(let i=0;i<1000;i++){s.runFrame();if(s.ram[0xaeff]!==255){revived=true;break;}}
  assert.ok(revived);assert.equal(s.ram[0xaeff],0);assert.equal(u16(s.ram,0x5e30),50);
  let quantity=-1;for(let p=0x1580;p<0x1a80;p+=5)if(s.ram[p]===199){quantity=s.ram[p+3];break;}
  assert.equal(quantity,19,'battle inventory is merged back to the field after combat');
  await screenshot(s,'.local/qa/finale-onion-revival.png');
});

test('ward and guardian deaths open rebuild branches; killing the muffin wins with Tyson standing',async()=>{
  const s=await finalArena(built.rom),start=snapshot(s),h=installHooks(s,specs);
  let messages=[],strikes=[];
  h.on('battle.message',e=>messages.push(e));h.on('battle.enemy-tech',e=>{if(e.operand===built.audit.finaleAI.uppercut)strikes.push(e);});
  const press=b=>{runFrames(s,3,b);runFrames(s,10);};
  for(const victim of [7,3,9]){
    restore(s,start);messages=[];strikes=[];runFrames(s,1000);
    // Set up the death boundary; actual targeting, attack, KO reactions,
    // exposure, revival and ending transition all execute in the cartridge.
    put16(s.ram,0x5e30+victim*128,1);
    const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),wait:n=>runFrames(s,n),tap:(k,n=12)=>{runFrames(s,3,k);runFrames(s,n);}};
    await attackNativeEnemy(io,s.ram[0xaeff+victim],{targetSlot:victim});
    let dead=false,exposed=false,rebuilt=false,win=false,coreDefeated=false,deadFrame=0,reviveFrame=0;
    for(let i=0;i<5000;i++){
      s.runFrame();
      // The guardian's AI removes him as soon as the core reaches zero HP,
      // before the core's long death animation clears its actor ID.
      if(victim===9&&!coreDefeated&&u16(s.ram,0x5e30+9*128)===0){coreDefeated=true;assert.ok(u16(s.ram,0x5e30+3*128)>0,'true core can die while Tyson has HP remaining');}
      if(!dead&&s.ram[0xaeff+victim]!==255&&u16(s.ram,0x5e30+victim*128)>1)put16(s.ram,0x5e30+victim*128,1);
      for(let j=0;j<3;j++)if(s.ram[0xaeff+j]!==255)put16(s.ram,0x5e30+j*128,999);
      if(!dead&&s.ram[0xaeff+victim]===255){dead=true;deadFrame=s.frames;}
      if(dead&&victim!==9&&s.ram[0x62eb]===127)exposed=true; // core work +3E
      if(dead&&victim!==9&&s.ram[0xaeff+victim]!==255&&u16(s.ram,0x5e30+victim*128)>0){
        rebuilt=true;reviveFrame=s.frames;
        // Actor IDs can briefly be restored with zero HP during death-list
        // reconciliation. A real rebuild restores HP as well. Its message
        // can follow the queued animation, so wait for that native event.
        for(let settle=0;settle<600&&!messages.some(e=>e.messageId===195);settle++)s.runFrame();
        break;
      }
      if(u16(s.ram,0x100)!==479){win=true;break;}
    }
    assert.ok(dead,`slot ${victim} must die through the native attack`);
    if(victim===9){assert.ok(coreDefeated&&win);assert.equal(u16(s.ram,0x100),82);}
    else {assert.ok(exposed&&rebuilt,`slot ${victim} exposure/rebuild: ${JSON.stringify({dead,exposed,rebuilt,deadFrame,reviveFrame,frame:s.frames,hp:u16(s.ram,0x5e30+victim*128),coreDefense:s.ram[0x62eb],messages:messages.map(e=>[e.frame,e.messageId])})}`);assert.ok(messages.some(e=>e.messageId===195),`unconditional muffin revival hint for ${victim}: ${messages.map(e=>e.messageId)}`);}
    if(victim===3)assert.equal(strikes.filter(e=>e.frame>=deadFrame&&e.frame<reviveFrame).length,0,'dead guardian cannot release a queued strike');
  }
  h.dispose();
});
