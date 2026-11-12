import {u16,put16} from './rom.js';
import {mrWorldwide} from '../content/mr-worldwide.js';
import {snapshot,restore} from './save.js';
import {previewActors} from '../content/native-preview.js';
import {rescueCheckpoints,seedRescueCheckpoint} from './rescue-checkpoints.js';
import {trialCheckpoints,seedTrialCheckpoint} from './trial-checkpoints.js';
import {futureCheckpoints,seedFutureCheckpoint} from './future-checkpoints.js';
import {medinaCheckpoints,seedMedinaCheckpoint} from './medina-checkpoints.js';
import {bridgeCheckpoints,seedBridgeCheckpoint} from './bridge-checkpoints.js';
import {villageCheckpoints,seedVillageCheckpoint} from './village-checkpoints.js';
import {fortressCheckpoints,seedFortressCheckpoint} from './fortress-checkpoints.js';
import {bakeryCheckpoints,seedBakeryCheckpoint} from './bakery-checkpoints.js';
import {resurrectionCheckpoints,seedResurrectionCheckpoint} from './resurrection-checkpoints.js';
import {endgameCheckpoints,seedEndgameCheckpoint} from './endgame-checkpoints.js';
import {guardCheckpoints,seedGuardCheckpoint} from './guard-checkpoints.js';
import {courtSwampCheckpoints,seedCourtSwampCheckpoint} from './court-swamp-checkpoints.js';
import {townsfolkCheckpoints,seedTownsfolkCheckpoint} from './townsfolk-checkpoints.js';
import {largePreviewFrameWrites} from './preview-frames.js';
import {combatFixture,makeCombatEvent,combatResourceBudget,combatState} from './combat-sandbox.js';
import {onionJar} from '../content/caretaker.js';

// Diagnostic transitions are injected as one native E0 ChangeLocation command
// at an actual event dispatch. No PC/stack/interrupt registers are redirected.
// This is deliberately browser-only tooling and is absent from the IPS output.
export function createDevTools(snes,hooks) {
  let pending=null,beforeJump=null,lastJump=null,preview=null,sandbox=null,battleStart=null;
  function kit(endgame=false) {
    snes.ram.fill(8,0x2830,0x2837);snes.ram.fill(0xff,0x2837,0x283e);
    snes.ram.fill(0xe0,0x283e,0x284d);snes.ram.fill(0x80,0x284d,0x285c);
    for(const id of [189,190,191,192,193,194,195,196,197,198,199,200,174,175,176,177,178]) {
      let slot=snes.ram.subarray(0x2400,0x2500).indexOf(id);
      if(slot<0)slot=snes.ram.subarray(0x2400,0x2500).indexOf(0);
      if(slot>=0){snes.ram[0x2400+slot]=id;snes.ram[0x2500+slot]=20;}
    }
    for(let id=0;id<7;id++){
      const p=0x2600+id*80;
      if(endgame){
        put16(snes.ram,p+5,999);put16(snes.ram,p+9,99);snes.ram[p+0x12]=60;
        snes.ram.set([65,60,12,60,60,50,60],p+0xb);snes.ram.set([65,60,12,60,60,50,60],p+0x36);
        snes.ram[p+0x27]=id===6?137:134;snes.ram[p+0x28]=[109,108,108,107,109,108,112][id];
        snes.ram[p+0x29]=[85,25,40,57,66,70,78][id];snes.ram[p+0x2a]=163;
        snes.ram[p+0x3d]=200;snes.ram[p+0x3e]=220;put16(snes.ram,p+0x3f,999);
      }
      put16(snes.ram,p+3,u16(snes.ram,p+5));put16(snes.ram,p+7,u16(snes.ram,p+9));
    }
  }
  const off=hooks.on('event.dispatch',({scriptPC,location})=>{
    if(!pending||location>=0x1f0)return;
    const p=0x12001+scriptPC;
    if(p<0x12001||p+5>=0x20000)throw Error('Event PC outside WRAM');
    if(!pending.keepReturn)beforeJump=snapshot(snes);
    if(pending.kit) {
      kit(pending.endgame);
      pending=null;return;
    }
    if(pending.endgame)kit(true);
    if(pending.endgameScene){kit(true);seedEndgameCheckpoint(snes.ram,pending.endgameScene);}
    if(pending.guardScene){kit(true);seedGuardCheckpoint(snes.ram,pending.guardScene);}
    if(pending.courtSwampScene){kit(true);seedCourtSwampCheckpoint(snes.ram,pending.courtSwampScene);}
    if(pending.townsfolkScene){kit(true);seedTownsfolkCheckpoint(snes.ram,pending.townsfolkScene);}
    if(pending.sandbox&&sandbox.unlockTechs){
      snes.ram.fill(8,0x2830,0x2837);snes.ram.fill(0xff,0x2837,0x283e);
      snes.ram.fill(0xe0,0x283e,0x284d);snes.ram.fill(0x80,0x284d,0x285c);
    }
    if(pending.trainingLevel!==undefined){
      kit(true);
      const leader=pending.party?.[0]??snes.ram[0x2980];
      snes.ram[0x2600+leader*80+0x12]=pending.trainingLevel;
      snes.ram[0x10000]=Math.max(0x4d,snes.ram[0x10000]);snes.ram[0x101e0]|=0x7f;
    }
    if(pending.carnivalChallenge){kit(true);snes.ram[0x10000]=0x5f;snes.ram[0x100f3]&=~32;}
    // A fresh, unmet Mr. Worldwide after his late-game gate. Return restores it.
    if(pending.superBoss){kit(true);snes.ram[0x10000]=Math.max(mrWorldwide.storyGate,snes.ram[0x10000]);snes.ram[0x10000+mrWorldwide.flag]=0;}
    if(pending.arrival==='dragon-dive') {
      snes.ram[0x100ce]=5;snes.ram[0x100aa]&=~4;
    }
    if(pending.dragon) {
      // Saved vehicle state, set before the native world loader runs. Both
      // presets park Dragon at the arrival point for immediate boarding QA.
      snes.ram[0x294]=pending.dragon==='flying'?0xa0:0x80;
      put16(snes.ram,0x290,pending.x*8);put16(snes.ram,0x292,pending.y*8);put16(snes.ram,0x29f,pending.id);
      snes.ram[0x27e]=0;snes.ram[0x28f]=0;snes.ram[0x100ec]|=4;
    }
    if(pending.party) {
      snes.ram.fill(0x80,0x2980,0x2989);
      snes.ram.set(pending.party,0x2980);
      const reserve=[0,1,2,3,4,5,6].filter(id=>!pending.party.includes(id));
      snes.ram.set(reserve,0x2983);snes.ram[0x29af]=0xfe;
      for(let id=0;id<7;id++){const a=0x2600+80*id;put16(snes.ram,a+3,u16(snes.ram,a+5));put16(snes.ram,a+7,u16(snes.ram,a+9));}
    }
    if(pending.rescueScene){kit(true);seedRescueCheckpoint(snes.ram,pending.rescueScene);}
    if(pending.trialScene){kit(true);seedTrialCheckpoint(snes.ram,pending.trialScene);}
    if(pending.futureScene){kit(true);seedFutureCheckpoint(snes.ram,pending.futureScene);}
    if(pending.medinaScene){kit(true);seedMedinaCheckpoint(snes.ram,pending.medinaScene);}
    if(pending.bridgeScene){kit(true);seedBridgeCheckpoint(snes.ram,pending.bridgeScene);}
    if(pending.villageScene){kit(true);seedVillageCheckpoint(snes.ram,pending.villageScene);}
    if(pending.fortressScene){kit(true);seedFortressCheckpoint(snes.ram,pending.fortressScene);}
    if(pending.bakeryScene){kit(true);seedBakeryCheckpoint(snes.ram,pending.bakeryScene);}
    if(pending.resurrectionScene){kit(true);seedResurrectionCheckpoint(snes.ram,pending.resurrectionScene);}
    if(pending.sandbox&&sandbox.loadout==='revival')put16(snes.ram,0x2603+80,0);
    const map=pending.id|((pending.facing??1)<<9);
    snes.ram.set([0xe0,map&255,map>>8,pending.x,pending.y,0xb2],p);
    lastJump={...pending,from:location,frame:snes.frames};pending=null;
  });
  const offArenaPrepare=hooks.on('event.prepare',({location})=>{
    if(!sandbox||location!==6)return;
    snes.ram.set(makeCombatEvent(sandbox.enemies,{song:sandbox.song,slots:sandbox.slots}),0x12000);
  });
  const offArenaStart=hooks.on('event.dispatch',({location,opcode})=>{
    if(!sandbox||location!==6||opcode!==0xd8||battleStart)return;
    battleStart=snapshot(snes);sandbox.stage='loading';
  });
  const offArenaReady=hooks.on('battle.initialized',({location})=>{if(sandbox&&location===6)sandbox.stage='battle';});
  const offArenaLog=hooks.on('*',e=>{
    if(!sandbox||!['battle.tech','battle.result','battle.enemy-tech','battle.message'].includes(e.name))return;
    sandbox.log.push({...e});if(sandbox.log.length>128)sandbox.log.shift();
  });
  const offInit=hooks.on('event.init',({location,opcode,scriptPC,object})=>{
    if(!preview||location!==1||opcode!==0x82)return;
    const p=0x12001+scriptPC;
    if(snes.ram[p+1]!==onionJar.npc)return;
    if(preview.pc!==undefined){
      // Native 81 loads a player sprite independently of active party status.
      if(preview.pc===4)snes.ram[0x2769]=preview.weapon;
      snes.ram.set([0x81,preview.pc,0x8b,12,8,0xa6,1,0],p);
    }else if(preview.enemy!==undefined){
      // The caretaker's initialization has ample room before its next
      // function. Load a static field enemy, position it, then end init.
      snes.ram.set([0x83,preview.enemy,0x83,0x8b,12,8,0xa6,1,0],p);
    }else{
      snes.ram[p+1]=preview.npc;
      // The home object now stays at the jar's spot by the stove. Previewed
      // actors stand in the open floor where the reviews expect them: rewrite
      // both of its initial Set Position operands in this WRAM copy only.
      for(const at of[7,12]){if(snes.ram[p+at]!==0x8b)throw Error('Home actor position command moved');snes.ram[p+at+1]=12;snes.ram[p+at+2]=8;}
    }
    preview.object=object;
  });
  const offPreview=hooks.on('event.dispatch',({location,scriptPC,object})=>{
    if(!preview||location!==1||preview.object===null)return;
    const p=0x12001+scriptPC;
    // The kitchen's controller and caretaker are isolated only during this
    // diagnostic. Undo restores the complete pre-lab machine and story state.
    if(object===0)snes.ram[p]=0xb2;
    if(object===preview.object&&!preview.script){
      if(p+8>0x20000)throw Error('Preview script outside event WRAM');
      // Face front; native AC selects an assembly frame; pause and loop. The
      // loop reuses eight bytes, so repeated frame scrubbing cannot grow it.
      snes.ram.set(preview.large?[0xa6,1,0xad,1,0x11,3]:[0xa6,1,0xac,preview.frame,0xad,1,0x11,5],p);preview.script=p;
    }
    if(object===preview.object&&preview.large){
      if(preview.applied!==preview.frame){
        const actor=previewActors.find(a=>a.key===preview.key);
        for(const[address,bytes]of largePreviewFrameWrites(snes.cart.data,actor,object,preview.frame))snes.ram.set(bytes,address);
        preview.applied=preview.frame;
      }else if(snes.ram[0xf01+object*2]===preview.frame)snes.ram[0x1601+object*2]=255;
    }
  });
  function previewFrame(frame){
    if(!preview)throw Error('Open a native actor preview first');
    if(!Number.isInteger(frame)||frame<0||frame>=preview.frames)throw Error('Actor frame outside native assembly');
    preview.frame=frame;if(preview.script&&!preview.large)snes.ram[preview.script+3]=frame;
  }
  function previewWeapon(weapon){
    if(preview?.pc!==4)throw Error('Open the Puss native preview first');
    if(![59,61,66].includes(weapon))throw Error('Choose a rapier or Carnival Hatchet');
    preview.weapon=weapon;
    if(preview.script&&u16(snes.ram,0x100)===1){
      snes.ram[0x2769]=weapon;
      // Equipment changes do not invalidate AC's cached frame themselves.
      // FF is outside Puss's 245 slots and forces the ordinary loader to refresh.
      snes.ram[0xf01+preview.object*2]=255;
    }
  }
  return {
    jump({id,x,y,facing=1,party,endgame=false,dragon,arrival,trainingLevel,carnivalChallenge=false,rescueScene,trialScene,futureScene,medinaScene,bridgeScene,villageScene,fortressScene,bakeryScene,resurrectionScene,endgameScene,guardScene,courtSwampScene,townsfolkScene,mrWorldwide:superBoss=false}) {
      if(![id,x,y,facing].every(Number.isInteger)||id<1||id>=0x1f8||x<0||x>255||y<0||y>255||facing<0||facing>3)throw Error('Invalid field / overworld map or coordinates');
      if(party&&(!Array.isArray(party)||party.length!==3||new Set(party).size!==3||party.some(id=>!Number.isInteger(id)||id<0||id>6)))throw Error('Choose three distinct party slots');
      if(typeof endgame!=='boolean')throw Error('Invalid test loadout');
      if(dragon!==undefined&&(!['grounded','flying'].includes(dragon)||id<0x1f0))throw Error('Dragon test state needs an overworld map');
      if(arrival!==undefined&&(arrival!=='dragon-dive'||id!==474))throw Error('Unknown cutscene arrival preset');
      if(trainingLevel!==undefined&&(id!==465||!Number.isInteger(trainingLevel)||trainingLevel<1||trainingLevel>99))throw Error('Guy Fieri training level must be 1–99 in the lesson room');
      if(typeof carnivalChallenge!=='boolean'||(carnivalChallenge&&id!==151))throw Error('Carnival challenge needs the mountain cave');
      if(typeof superBoss!=='boolean'||(superBoss&&(id!==mrWorldwide.kitchen.location||trainingLevel!==undefined)))throw Error('The Mr. Worldwide preset needs the lesson room');
      if(rescueScene!==undefined&&(!rescueCheckpoints[rescueScene]||rescueCheckpoints[rescueScene].location!==id||party||trainingLevel!==undefined||carnivalChallenge||dragon||arrival||trialScene||futureScene||medinaScene||bridgeScene||villageScene||fortressScene||bakeryScene||resurrectionScene))throw Error('Medieval rescue checkpoint needs its own location and party');
      if(trialScene!==undefined&&(!trialCheckpoints[trialScene]||trialCheckpoints[trialScene].location!==id||party||trainingLevel!==undefined||carnivalChallenge||dragon||arrival||rescueScene||futureScene||medinaScene||bridgeScene||villageScene||fortressScene||bakeryScene||resurrectionScene))throw Error('Trial checkpoint needs its own location and party');
      if(futureScene!==undefined&&(!futureCheckpoints[futureScene]||futureCheckpoints[futureScene].location!==id||party||trainingLevel!==undefined||carnivalChallenge||dragon||arrival||rescueScene||trialScene||medinaScene||bridgeScene||villageScene||fortressScene||bakeryScene||resurrectionScene))throw Error('Future checkpoint needs its own location and party');
      if(medinaScene!==undefined&&(!medinaCheckpoints[medinaScene]||medinaCheckpoints[medinaScene].location!==id||party||trainingLevel!==undefined||carnivalChallenge||dragon||arrival||rescueScene||trialScene||futureScene||bridgeScene||villageScene||fortressScene||bakeryScene||resurrectionScene))throw Error('Medina checkpoint needs its own location and party');
      if(bridgeScene!==undefined&&(!bridgeCheckpoints[bridgeScene]||bridgeCheckpoints[bridgeScene].location!==id||party||trainingLevel!==undefined||carnivalChallenge||dragon||arrival||rescueScene||trialScene||futureScene||medinaScene||villageScene||fortressScene||bakeryScene||resurrectionScene))throw Error('Bridge checkpoint needs its own location and party');
      if(villageScene!==undefined&&(!villageCheckpoints[villageScene]||villageCheckpoints[villageScene].location!==id||party||trainingLevel!==undefined||carnivalChallenge||dragon||arrival||rescueScene||trialScene||futureScene||medinaScene||bridgeScene||fortressScene||bakeryScene||resurrectionScene))throw Error('Village checkpoint needs its own location and party');
      if(fortressScene!==undefined&&(!fortressCheckpoints[fortressScene]||fortressCheckpoints[fortressScene].location!==id||party||trainingLevel!==undefined||carnivalChallenge||dragon||arrival||rescueScene||trialScene||futureScene||medinaScene||bridgeScene||villageScene||bakeryScene||resurrectionScene))throw Error('Fortress checkpoint needs its own location and party');
      if(bakeryScene!==undefined&&(!bakeryCheckpoints[bakeryScene]||bakeryCheckpoints[bakeryScene].location!==id||party||trainingLevel!==undefined||carnivalChallenge||dragon||arrival||rescueScene||trialScene||futureScene||medinaScene||bridgeScene||villageScene||fortressScene||resurrectionScene))throw Error('Bakery checkpoint needs its own location and party');
      if(resurrectionScene!==undefined&&(!resurrectionCheckpoints[resurrectionScene]||resurrectionCheckpoints[resurrectionScene].location!==id||party||trainingLevel!==undefined||carnivalChallenge||dragon||arrival||rescueScene||trialScene||futureScene||medinaScene||bridgeScene||villageScene||fortressScene||bakeryScene))throw Error('Resurrection checkpoint needs its own location and party');
      if(endgameScene!==undefined&&(!endgameCheckpoints[endgameScene]||endgameCheckpoints[endgameScene].location!==id||party||trainingLevel!==undefined||carnivalChallenge||dragon||arrival||rescueScene||trialScene||futureScene||medinaScene||bridgeScene||villageScene||fortressScene||bakeryScene||resurrectionScene))throw Error('Endgame checkpoint needs its own location and party');
      if(guardScene!==undefined&&(!guardCheckpoints[guardScene]||guardCheckpoints[guardScene].location!==id||party||trainingLevel!==undefined||carnivalChallenge||dragon||arrival||rescueScene||trialScene||futureScene||medinaScene||bridgeScene||villageScene||fortressScene||bakeryScene||resurrectionScene||endgameScene))throw Error('Guard checkpoint needs its own location and party');
      if(courtSwampScene!==undefined&&(!courtSwampCheckpoints[courtSwampScene]||courtSwampCheckpoints[courtSwampScene].location!==id||party||trainingLevel!==undefined||carnivalChallenge||dragon||arrival||rescueScene||trialScene||futureScene||medinaScene||bridgeScene||villageScene||fortressScene||bakeryScene||resurrectionScene||endgameScene||guardScene))throw Error('Court/swamp checkpoint needs its own location and party');
      if(townsfolkScene!==undefined&&(!townsfolkCheckpoints[townsfolkScene]||townsfolkCheckpoints[townsfolkScene].location!==id||party||trainingLevel!==undefined||carnivalChallenge||dragon||arrival||rescueScene||trialScene||futureScene||medinaScene||bridgeScene||villageScene||fortressScene||bakeryScene||resurrectionScene||endgameScene||guardScene||courtSwampScene))throw Error('Townsfolk checkpoint needs its own location and party');
      preview=null;sandbox=null;battleStart=null;pending={id,x,y,facing,party,endgame,dragon,arrival,trainingLevel,carnivalChallenge,superBoss,rescueScene,trialScene,futureScene,medinaScene,bridgeScene,villageScene,fortressScene,bakeryScene,resurrectionScene,endgameScene,guardScene,courtSwampScene,townsfolkScene};return pending;
    },
    startCombat({fixture='swamp-pack',loadout='current',unlockTechs=false}={}){
      if(!['current','test','revival'].includes(loadout)||typeof unlockTechs!=='boolean')throw Error('Invalid combat loadout');
      const f=combatFixture(fixture),keepReturn=!!(sandbox||preview)&&!!beforeJump;
      if(keepReturn)restore(snes,beforeJump);
      const party=loadout!=='current'?[0,1,2]:[...snes.ram.slice(0x2980,0x2983)];
      if(!party.some(id=>id<7))throw Error('Start a game and reach a field before opening combat');
      const budget=combatResourceBudget(snes.cart.data,f.enemies,party);
      sandbox={fixture,name:f.name,enemies:[...f.enemies],slots:f.slots,song:f.song,loadout,unlockTechs,budget,stage:'loading',attempt:1,log:[]};battleStart=null;preview=null;
      pending={id:6,x:8,y:11,facing:0,sandbox:true,keepReturn,...(loadout!=='current'?{party,endgame:true}:{})};return sandbox;
    },
    restartCombat(){
      if(!sandbox||!battleStart)throw Error('Wait for the combat sandbox to begin');
      restore(snes,battleStart);sandbox.log=[];sandbox.attempt++;sandbox.stage='loading';
    },
    previewActor(key,frame=0,{weapon=59}={}){
      const actor=previewActors.find(a=>a.key===key);
      if(!actor)throw Error('Unknown native actor');
      if(!Number.isInteger(frame)||frame<0||frame>=actor.frames)throw Error('Actor frame outside native assembly');
      if(actor.pc===4&&![59,61,66].includes(weapon))throw Error('Choose a rapier or Carnival Hatchet');
      if(preview?.key===key&&u16(snes.ram,0x100)===1){previewFrame(frame);if(actor.pc===4)previewWeapon(weapon);return;}
      const keepReturn=!!preview&&!!beforeJump;
      sandbox=null;battleStart=null;preview={key,npc:actor.npc,enemy:actor.enemy,pc:actor.pc,frames:actor.frames,frame,large:(actor.size&3)===2,applied:-1,object:null,script:0};
      if(actor.pc===4)preview.weapon=weapon;
      pending={id:1,x:8,y:8,facing:1,keepReturn};
    },
    previewFrame,previewWeapon,
    cancel(){pending=null;preview=null;sandbox=null;battleStart=null;},
    grantTestKit({endgame=false}={}){pending={kit:true,endgame,keepReturn:!!preview};},
    undo(){if(!beforeJump)throw Error('No area jump to undo');restore(snes,beforeJump);beforeJump=null;pending=null;preview=null;sandbox=null;battleStart=null;},
    get pending(){return pending;},get lastJump(){return lastJump;},
    dispose(){off();offInit();offPreview();offArenaPrepare();offArenaStart();offArenaReady();offArenaLog();},
    diagnostics(){const registers=hooks.registers(),pc=registers.pc&0x3fffff,fatal=pc===0x2e65?'native field halt':[0xff18,0xff1c].includes(pc)?'native interrupt halt':null;return{frame:snes.frames,location:u16(snes.ram,0x100),party:Array.from(snes.ram.subarray(0x2980,0x2983)),registers,fatal:fatal?{kind:fatal,color:snes.ppu.cgram[0],spriteHeapEnd:u16(snes.ram,0x171)}:null,counts:{...hooks.counts},pending,lastJump,preview:preview?{...preview}:null,combat:sandbox?{...sandbox,...combatState(snes,sandbox.stage==='battle')}:null};}
  };
}
