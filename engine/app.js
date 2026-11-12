import {cast} from '../content/cast.js';
import {previewActors} from '../content/native-preview.js';
import {areas} from '../content/areas.js';
import {sprite} from './sprites.js';
import {validateRom} from './rom.js';
import {buildPatch} from './patch.js';
import {installHooks} from './hooks.js';
import {snapshot,restore,checkpoint} from './save.js';
import {createDevTools} from './devtools.js';
import {newGame,finishOpening} from './automation.js';
import {combatFixtures} from '../content/combat-sandbox.js';

const $=id=>document.getElementById(id),ctx=$('game').getContext('2d',{alpha:false}),buffer=document.createElement('canvas');
buffer.width=512;buffer.height=480;
const bctx=buffer.getContext('2d',{alpha:false}),pixels=bctx.createImageData(512,480);
const keys={ArrowUp:4,ArrowDown:5,ArrowLeft:6,ArrowRight:7,KeyW:4,KeyS:5,KeyA:6,KeyD:7,KeyZ:8,KeyX:0,KeyC:9,KeyV:1,Enter:3,ShiftLeft:2,KeyQ:10,KeyE:11};
let source=null,result=null,snes=null,hooks=null,dev=null,running=false,lastTime=0,carry=0,drawTick=0,speed=1,held=new Set(),touch=new Set();
let audioContext=null,audioOn=false,nextAudio=0,lastBattery='',toastTimer,wasVisibleRunning=false;
const assets=Promise.all(['techs','event-layouts','hooks'].map(n=>fetch(`content/${n}.json`).then(r=>{if(!r.ok)throw Error('Cannot load '+n);return r.json();}))).then(([techs,layouts,hookSpecs])=>({techs,layouts,hookSpecs}));

function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
function error(e){console.error(e);toast(e.message||String(e));}
function download(name,data,type='application/json'){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function draw(){if(!snes)return;snes.setPixels(pixels.data);bctx.putImageData(pixels,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(buffer,0,16,512,448,0,0,512,448);}
function pause(value=!running){running=!value&&!!snes;held.clear();touch.clear();if(snes)snes.joypad1State=0;carry=0;nextAudio=0;$('pause-overlay').hidden=!value||!snes;$('pause').textContent=running?'Ⅱ Pause':'▶ Resume';}
function audioFrame(){
  if(!audioContext||!audioOn||!running||speed!==1){if(snes)snes.apu.dsp.sampleOffset=0;return;}
  const n=Math.round(audioContext.sampleRate/60),b=audioContext.createBuffer(2,n,audioContext.sampleRate);
  snes.setSamples(b.getChannelData(0),b.getChannelData(1),n);
  if(nextAudio<audioContext.currentTime||nextAudio>audioContext.currentTime+.15)nextAudio=audioContext.currentTime+.025;
  const node=audioContext.createBufferSource(),gain=audioContext.createGain();gain.gain.value=.32;node.buffer=b;node.connect(gain);gain.connect(audioContext.destination);node.onended=()=>{node.disconnect();gain.disconnect();};node.start(nextAudio);nextAudio+=b.duration;
}
async function sound(){audioOn=!audioOn;if(audioOn){audioContext??=new AudioContext();await audioContext.resume();}nextAudio=0;$('audio').textContent=audioOn?'♪ Sound on':'♪ Sound off';$('audio').setAttribute('aria-pressed',String(audioOn));}
function battery(){
  if(!snes)return;
  const data=Array.from(snes.cart.sram).join(',');if(data===lastBattery)return;
  try{localStorage.setItem('shrek-trigger-sram-v1',data);lastBattery=data;}catch{toast('Browser storage is full. Export a checkpoint from the console.');}
}
async function boot(){
  if(!source)throw Error('Choose the original US .sfc or .smc ROM first.');
  const data=await assets;
  result=buildPatch(source,data);hooks?.dispose();dev?.dispose();
  snes=new Snes();if(!snes.loadRom(result.rom,true))throw Error('SnesJs could not load this cartridge.');snes.reset(true);
  const stored=localStorage.getItem('shrek-trigger-sram-v1');
  if(stored){const bytes=stored.split(',').map(Number);if(bytes.length===snes.cart.sram.length&&bytes.every(n=>Number.isInteger(n)&&n>=0&&n<=255))snes.cart.sram.set(bytes);}
  lastBattery=Array.from(snes.cart.sram).join(',');
  hooks=installHooks(snes,data.hookSpecs);dev=createDevTools(snes,hooks);
  $('cover').hidden=true;for(const id of ['pause','save','load'])$(id).disabled=false;
  $('screen-status').textContent='SHREK TRIGGER · RUNNING';$('game').focus();pause(false);draw();
  return snes;
}
async function quickStart(){
  $('quick-start').disabled=true;
  try {
    await boot();pause(true);
    let restored=false;
    try{const r=await fetch('api/checkpoint/bedroom');if(r.ok){restore(snes,await r.json());restored=true;}}catch{/* A changed build needs a new native boot. */}
    const yieldOpening=async()=>{draw();await new Promise(r=>setTimeout(r,0));};
    if(!restored){toast('Advancing a fresh game to the swamp…');await newGame(snes,yieldOpening);}
    else await finishOpening(snes,yieldOpening);
    draw();pause(false);toast('Swamp checkpoint ready. Area shortcuts and party selection are available below.');
  }finally{$('quick-start').disabled=false;}
}
async function runChecks(){
  $('run-checks').disabled=true;
  try {
    let r=await fetch('api/tests',{method:'POST'}).then(r=>{if(!r.ok)throw Error('Checks require npm start on this machine.');return r.json();});
    for(;;){$('check-output').textContent=r.output;if(!r.running){toast(r.exitCode===0?'Cartridge checks passed.':'A check failed; see the test output.');break;}await new Promise(r=>setTimeout(r,700));r=await fetch('api/tests').then(r=>r.json());}
  }finally{$('run-checks').disabled=false;}
}
function gamepadMask(){const p=[...navigator.getGamepads()].find(Boolean);if(!p)return 0;let m=0;const map={0:0,1:8,2:1,3:9,4:10,5:11,8:2,9:3,12:4,13:5,14:6,15:7};for(const [i,b]of Object.entries(map))if(p.buttons[i]?.pressed)m|=1<<b;if(p.axes[0]<-.45)m|=1<<6;if(p.axes[0]>.45)m|=1<<7;if(p.axes[1]<-.45)m|=1<<4;if(p.axes[1]>.45)m|=1<<5;return m;}
function advance(frames,input=0){if(!snes)throw Error('Boot first');for(let i=0;i<frames;i++){snes.joypad1State=input;snes.runFrame();}snes.joypad1State=0;draw();return dev.diagnostics();}
async function save(){if(!snes)return;const was=running;pause(true);await checkpoint(snapshot(snes));pause(!was);toast('Checkpoint saved on this browser.');}
async function load(){if(!snes)return;const s=await checkpoint();if(!s)throw Error('No checkpoint saved yet.');dev.cancel();restore(snes,s);draw();toast('Checkpoint restored.');}
function jump(spec){if(!dev)throw Error('Start the cartridge and reach a field area first.');dev.jump(spec);pause(false);toast('Jump queued for the next field event. A return checkpoint will be kept.');}
function selectedArea(){return areas[Number($('area').value)];}
function withParty(area){return !area.rescueScene&&!area.trialScene&&!area.futureScene&&!area.medinaScene&&!area.bridgeScene&&!area.villageScene&&!area.fortressScene&&!area.bakeryScene&&!area.resurrectionScene&&!area.endgameScene&&!area.guardScene&&!area.courtSwampScene&&!area.townsfolkScene&&$('party-enable').checked?{...area,party:[0,1,2].map(i=>Number($('party-'+i).value))}:area;}
function inspect(){
  if(!snes)return;const d=dev.diagnostics(),r=d.registers,hex=(n,w=4)=>n.toString(16).toUpperCase().padStart(w,'0');
  $('frame-status').textContent=`FRAME ${d.frame} · ${speed}×`;
  if($('workshop').hidden)return;
  $('registers').textContent=`PC $${hex(r.pc,6)}   A $${hex(r.a)}\nX  $${hex(r.x)}     Y $${hex(r.y)}\nSP $${hex(r.sp)}    DP $${hex(r.dp)}\nDB $${hex(r.db,2)}   M${r.m?8:16} / X${r.x8?8:16}\nMAP $${hex(d.location,3)}  PARTY ${d.party.join(' / ')}\n${d.fatal?'GAME HALTED — return from jump or reset':d.pending?'JUMP PENDING (close menus / enter a field)':'Native game running'}`;
  $('hook-counts').textContent=Object.entries(hooks.counts).map(([k,v])=>`${k.padEnd(18)} ${v}`).join('\n');$('hook-counts').style.whiteSpace='pre';
  $('trace').textContent=hooks.timeline.slice(-12).map(e=>`${String(e.frame).padStart(6)} ${e.name} $${hex(e.location,3)}${e.stringId!==undefined?' #'+e.stringId:''}${e.techId?' tech '+e.techId:''}`).join('\n');
  const battle=d.combat;
  $('combat-state').textContent=battle?`${battle.name} · attempt ${battle.attempt}\n${battle.inBattle?'Native battle':battle.stage==='loading'?'Loading arena':'Battle finished'} · RNG ${battle.rng}\n`+battle.actors.map(a=>`${a.slot<3?cast[a.id]?.name??'Party':`Enemy ${a.id} [${a.slot}]`}: HP ${a.hp}/${a.maxHp} · MP ${a.mp}/${a.maxMp}${a.poison?' · POISON':''}`).join('\n')+'\n'+battle.log.slice(-8).map(e=>`${e.frame} ${e.name}${e.techId===undefined?'':` tech ${e.techId}`}${e.target===undefined?'':` → slot ${e.target}: ${e.value}`}`).join('\n'):'Choose an encounter. Return restores your game before the sandbox.';
}
function paintSprite(canvas,id,facing=1,pose='idle',phase=0){const c=canvas.getContext('2d'),s=sprite(id,facing,pose,phase),im=c.createImageData(32,32);for(let i=0;i<s.length;i++){if(!s[i])continue;const hex=cast[id].palette[s[i]-1],n=parseInt(hex,16);im.data.set([n>>16,n>>8&255,n&255,255],i*4);}const off=document.createElement('canvas');off.width=32;off.height=32;off.getContext('2d').putImageData(im,0,0);c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;c.drawImage(off,0,0,canvas.width,canvas.height);}
function bench(){
  const id=Number($('character').value),a=result?.audit.characters[id];
  paintSprite($('sprite-preview'),id,Number($('facing').value),$('pose').value,Math.floor(performance.now()/180)%3);
  $('sprite-note').textContent=a?`${a.frameCount-a.provisionalFrames} / ${a.frameCount} native frames authored. ${a.provisionalFrames?'Unmapped poses use stand-ins.':'Use the native preview below to inspect story poses.'}`:'Native indexed tile art.';
}
function workshop(){const open=$('workshop').hidden;$('workshop').hidden=!open;$('lab-toggle').setAttribute('aria-expanded',String(open));if(open)$('workshop').scrollIntoView({behavior:'smooth',block:'start'});}
function frame(now){
  if(running&&snes){carry+=Math.min(100,now-lastTime)*60/1000*speed;const count=Math.min(Math.floor(carry),8);carry-=count;let mask=gamepadMask();for(const n of held)mask|=1<<n;for(const n of touch)mask|=1<<n;snes.joypad1State=mask;try{for(let i=0;i<count;i++){snes.runFrame();audioFrame();}if(count)draw();}catch(e){pause(true);error(e);}}
  lastTime=now;if(++drawTick%12===0){inspect();if(!$('workshop').hidden)bench();}requestAnimationFrame(frame);
}
for(const c of cast){const b=document.createElement('button'),canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;b.append(canvas);const label=document.createElement('strong');label.textContent=c.name;b.append(label);const sub=document.createElement('small');sub.textContent=c.source.toUpperCase()+' SLOT';b.append(sub);paintSprite(canvas,c.id);b.onclick=()=>{$('character').value=c.id;if($('workshop').hidden)workshop();bench();};$('roster').append(b);$('character').add(new Option(c.name,c.id));}
areas.forEach((a,i)=>$('area').add(new Option(a.name,i)));
for(const c of previewActors)$('native-actor').add(new Option(c.name,c.key));
function nativeFrames(){
  const c=previewActors.find(c=>c.key===$('native-actor').value),map=c.pc!==undefined?result?.audit.characters[c.pc]?.map:result?.audit.supportingCast.find(a=>a.key===c.key)?.frames??result?.audit.carnival.actors.find(a=>a.key===c.key)?.frameMap??(result?.audit.courtBeasts.actors.some(a=>a.key===c.key)?result.audit.courtBeasts.frameMap:undefined)??c.roles?.map(pose=>({pose}));
  $('native-frame').replaceChildren();
  $('native-weapon-choice').hidden=c.pc!==4;
  for(let f=0;f<c.frames;f++){const p=map?.[f];$('native-frame').add(new Option(`${f.toString(16).padStart(2,'0')} · ${p?p.pose+(p.facing===undefined?'':' / '+['back','front','left','right'][p.facing])+(p.provisional?' · stand-in':''):'frame '+f}`,f));}
}
$('native-actor').onchange=nativeFrames;nativeFrames();
$('native-preview').onclick=()=>{try{if(!dev)throw Error('Quick start or reach a field first.');dev.previewActor($('native-actor').value,Number($('native-frame').value),{weapon:Number($('native-weapon').value)});pause(false);toast('Native sprite preview queued. Return from jump restores your game.');}catch(e){error(e);}};
$('native-frame').onchange=()=>{try{if(dev?.diagnostics().preview?.key===$('native-actor').value){dev.previewFrame(Number($('native-frame').value));pause(false);}}catch(e){error(e);}};
$('native-weapon').onchange=()=>{try{if(dev?.diagnostics().preview?.key==='party-puss'&&$('native-actor').value==='party-puss'){dev.previewWeapon(Number($('native-weapon').value));pause(false);}}catch(e){error(e);}};
for(let i=0;i<3;i++){for(const c of cast)$('party-'+i).add(new Option(c.name,c.id));$('party-'+i).value=i;}
$('area').onchange=()=>{
  const a=selectedArea();$('map-id').value=a.id.toString(16);$('map-x').value=a.x;$('map-y').value=a.y;
  for(const id of['party-enable','party-0','party-1','party-2']){$(id).disabled=!!(a.rescueScene||a.trialScene||a.futureScene||a.medinaScene||a.bridgeScene||a.villageScene||a.fortressScene||a.bakeryScene||a.resurrectionScene||a.endgameScene||a.guardScene||a.courtSwampScene||a.townsfolkScene);$(id).title=a.rescueScene||a.trialScene||a.futureScene||a.medinaScene||a.bridgeScene||a.villageScene||a.fortressScene||a.bakeryScene||a.resurrectionScene||a.endgameScene||a.guardScene||a.courtSwampScene||a.townsfolkScene?'This story checkpoint uses its original party.':'';}
};
$('lab-toggle').onclick=workshop;$('play').onclick=()=>boot().catch(error);$('pause').onclick=()=>pause(running);$('audio').onclick=()=>sound().catch(error);$('save').onclick=()=>save().catch(error);$('load').onclick=()=>load().catch(error);
$('speed').onchange=()=>{speed=Number($('speed').value);nextAudio=0;};$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else $('screen').requestFullscreen().catch(error);};
$('jump').onclick=()=>{try{jump(withParty(selectedArea()));}catch(e){error(e);}};$('custom-jump').onclick=()=>{try{jump(withParty({id:parseInt($('map-id').value,16),x:Number($('map-x').value),y:Number($('map-y').value)}));}catch(e){error(e);}};
$('quick-start').onclick=()=>quickStart().catch(error);$('run-checks').onclick=()=>runChecks().catch(error);
for(const f of combatFixtures)$('combat-fixture').add(new Option(f.name,f.key));
$('combat-start').onclick=()=>{try{if(!dev)throw Error('Quick start or reach a field first.');dev.startCombat({fixture:$('combat-fixture').value,loadout:$('combat-loadout').value,unlockTechs:$('combat-unlock').checked});pause(false);toast('Combat sandbox queued. Your return checkpoint is preserved.');}catch(e){error(e);}};
$('combat-retry').onclick=()=>{try{dev.restartCombat();pause(false);toast('Restarting the same encounter and RNG state.');}catch(e){error(e);}};
$('combat-return').onclick=()=>{try{if(!dev?.diagnostics().combat)throw Error('No combat sandbox is open');dev.undo();draw();inspect();toast('Returned from the combat sandbox.');}catch(e){error(e);}};
$('combat-export').onclick=()=>{try{const combat=dev?.diagnostics().combat;if(!combat)throw Error('No combat sandbox is open');download('shrek-trigger-combat.json',JSON.stringify(combat,null,2));}catch(e){error(e);}};
$('test-kit').onclick=()=>{try{if(!dev)throw Error('Start a game first.');dev.grantTestKit();pause(false);toast('Test kit queued for the next field event.');}catch(e){error(e);}};
$('undo-jump').onclick=()=>{try{dev.undo();draw();toast('Returned to before the area jump.');}catch(e){error(e);}};
$('step').onclick=()=>{try{pause(true);advance(1);inspect();}catch(e){error(e);}};$('restart').onclick=()=>boot().catch(error);$('export-trace').onclick=()=>{if(dev)download('shrek-trigger-trace.json',JSON.stringify({diagnostics:dev.diagnostics(),events:hooks.timeline},null,2));};
for(const id of ['character','facing','pose'])$(id).onchange=bench;
$('rom-file').onchange=async e=>{try{source=await validateRom(await e.target.files[0].arrayBuffer());$('rom-status').textContent='US cartridge verified. Ready to play.';toast('ROM verified.');}catch(err){error(err);}};
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  const actions={F1:workshop,F5:()=>save().catch(error),F8:()=>load().catch(error),F6:()=>{if(snes){pause(true);advance(1);inspect();}},Escape:()=>{if(snes)pause(running);}};
  if(actions[e.code]){e.preventDefault();if(!e.repeat)actions[e.code]();return;}
  if(e.code in keys&&snes){e.preventDefault();held.add(keys[e.code]);}
});
document.addEventListener('keyup',e=>{if(e.code in keys)held.delete(keys[e.code]);});
window.addEventListener('blur',()=>{held.clear();touch.clear();if(snes)snes.joypad1State=0;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){wasVisibleRunning=running;if(running)pause(true);battery();}else if(wasVisibleRunning){pause(false);wasVisibleRunning=false;}});
window.addEventListener('beforeunload',battery);
for(const b of document.querySelectorAll('[data-pad]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch.add(Number(b.dataset.pad));};b.onpointerup=b.onpointercancel=()=>touch.delete(Number(b.dataset.pad));}
setInterval(battery,4000);requestAnimationFrame(frame);
window.shrek={boot,quickStart,runChecks,advance,pause,save,load,jump,paintSprite,exportCheckpoint:()=>download('shrek-trigger-checkpoint.json',JSON.stringify(snapshot(snes))),restoreCheckpoint:s=>{dev.cancel();restore(snes,s);draw();},get snes(){return snes;},get hooks(){return hooks;},get dev(){return dev;},get audit(){return result?.audit;},get running(){return running;},get source(){return source;}};
window.shrek.ready=(async()=>{
  const data=await assets;data.techs.forEach(t=>$('tech').add(new Option(`${t.id.toString(16).padStart(2,'0')} · ${t.name}`,t.id)));
  $('tech').onchange=()=>{const t=data.techs.find(t=>t.id===Number($('tech').value));$('tech-info').textContent=t.concept+(t.status.includes('animation-pending')?' Native name and original mechanics; new effect animation pending.':' Native cartridge effects implemented.');};$('tech').onchange();bench();
  try{const response=await fetch('api/base-rom');if(response.ok)source=await validateRom(await response.arrayBuffer());}catch{/* Manual chooser is available. */}
  $('rom-status').textContent=source?'US cartridge verified · no upload required':'Choose your US .sfc or .smc ROM to begin.';
  if(source){result=buildPatch(source,data);nativeFrames();$('coverage').textContent=`${result.audit.techs} techniques · ${result.audit.items} items · ${result.audit.dialogues} dialogue entries · 7 playable characters.`;}
})().catch(error);
