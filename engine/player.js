// The public player: choose your own Chrono Trigger (USA) ROM, apply the
// release BPS patch in the browser and play. The ROM is cached in this
// browser's IndexedDB so returning players can press Play; in-game saves
// (cartridge SRAM) are kept in localStorage. Debug tools live in dev.html.
// Self-hosting: a ROM next to this page (rom.sfc, chrono-trigger.sfc, ...) or
// one named in the URL (?rom=path/to/file.sfc) is loaded and patched
// automatically, so the visitor only has to press Play.
import {validateRom} from './rom.js';
import {applyBps} from './bps-apply.js';

const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false}),buffer=document.createElement('canvas');
buffer.width=512;buffer.height=480;
const bctx=buffer.getContext('2d',{alpha:false}),pixels=bctx.createImageData(512,480);
// Joypad bits: 0 B, 1 Y, 2 Select, 3 Start, 4 up, 5 down, 6 left, 7 right, 8 A, 9 X, 10 L, 11 R.
const keys={ArrowUp:4,ArrowDown:5,ArrowLeft:6,ArrowRight:7,KeyW:4,KeyS:5,KeyA:6,KeyD:7,KeyZ:8,KeyX:0,KeyC:9,KeyV:1,Enter:3,ShiftLeft:2,ShiftRight:2,KeyQ:10,KeyE:11};
const SRAM_KEY='shrek-trigger-sram-v1';
let snes=null,base=null,running=false,lastTime=0,carry=0,held=new Set(),touchMask=0,resumeOnShow=false;
let audio=null,soundOn=true,nextAudio=0,lastSram='',toastTimer;

function toast(text,ms=2500){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),ms);}
function note(html){$('start-note').innerHTML=html;}
function draw(){snes.setPixels(pixels.data);bctx.putImageData(pixels,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(buffer,0,16,512,448,0,0,512,448);}

// ROM cache (IndexedDB): the validated, unheadered base ROM only.
function db(){return new Promise((ok,fail)=>{const r=indexedDB.open('shrek-trigger',1);r.onupgradeneeded=()=>r.result.createObjectStore('rom');r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);});}
async function cacheRom(bytes){try{const d=await db();await new Promise((ok,fail)=>{const t=d.transaction('rom','readwrite');t.objectStore('rom').put(bytes,'base');t.oncomplete=ok;t.onerror=()=>fail(t.error);});}catch{/* Private mode: play without caching. */}}
async function cachedRom(){try{const d=await db();return await new Promise(ok=>{const r=d.transaction('rom').objectStore('rom').get('base');r.onsuccess=()=>ok(r.result??null);r.onerror=()=>ok(null);});}catch{return null;}}

async function fetchPatch(){
  let r=await fetch('shrek-trigger.bps');
  if(!r.ok){const m=await fetch('dist/manifest.json').then(r=>r.ok?r.json():null).catch(()=>null);if(m?.patch?.file)r=await fetch('dist/'+m.patch.file);}
  if(!r.ok)throw Error('Could not download the patch.');
  return new Uint8Array(await r.arrayBuffer());
}
const patchReady=fetchPatch();

// ROM files the launcher looks for beside itself when self-hosted.
const LOCAL_ROMS=['rom.sfc','rom.smc','chrono-trigger.sfc','Chrono Trigger (USA).sfc'];
async function fetchRom(url){
  try{const r=await fetch(url,{cache:'no-cache'});if(!r.ok)return null;const b=await r.arrayBuffer();return b.byteLength>=0x400000?b:null;}catch{return null;}
}
// A ROM named in the URL wins, then the first ROM found beside the launcher.
async function hostedRom(){
  const named=new URLSearchParams(location.search).get('rom');
  if(named){const b=await fetchRom(new URL(named,location.href));if(b)return{bytes:b,name:named};}
  const found=await Promise.all(LOCAL_ROMS.map(n=>fetchRom(new URL(n,location.href))));
  const i=found.findIndex(Boolean);return i<0?null:{bytes:found[i],name:LOCAL_ROMS[i]};
}

let patched=null;
function ready(bytes,cached,source){
  base=bytes;patched=null;$('choose').hidden=true;$('play').hidden=false;$('play').focus();
  note(source?'Found <b></b> beside the launcher. Patching…':cached?'Your ROM is remembered on this device. <a href="#" id="forget">Use a different ROM</a>':'ROM verified. It stays on this device.');
  if(source){
    $('start-note').querySelector('b').textContent=source;
    // Patch now so Play starts at once (audio still needs that first click).
    patchReady.then(p=>{if(base!==bytes)return;patched=applyBps(bytes,p);note('Loaded and patched <b></b>. Press Play.');$('start-note').querySelector('b').textContent=source;})
      .catch(e=>{note(e.message);console.error(e);});
  }
  $('forget')?.addEventListener('click',e=>{e.preventDefault();base=null;$('play').hidden=true;$('choose').hidden=false;note('Choose your Chrono Trigger (USA) ROM.');});
}
async function init(){
  // The local dev server (npm start) can hand over the developer's ROM.
  if(['127.0.0.1','localhost'].includes(location.hostname))try{const r=await fetch('api/base-rom');if(r.ok){ready(await validateRom(await r.arrayBuffer()),false);return;}}catch{/* Static server. */}
  const hosted=await hostedRom();
  if(hosted){try{ready(await validateRom(hosted.bytes),false,hosted.name);return;}catch(e){console.warn(`${hosted.name} is not Chrono Trigger (USA)`,e);}}
  const cached=await cachedRom();
  if(cached){try{ready(await validateRom(cached),true);return;}catch{/* A stale cache falls through. */}}
  $('choose').hidden=false;note('Choose your own <b>Chrono Trigger (USA)</b> ROM (.sfc or .smc). It is checked and patched on this device, never uploaded.');
}
$('rom-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{const bytes=await validateRom(await file.arrayBuffer());await cacheRom(bytes);ready(bytes,false);}
  catch(err){note('That file is not Chrono Trigger (USA). The game needs the original 4 MiB US ROM; a 512-byte header is fine.');console.error(err);}
  e.target.value='';
};

async function play(){
  if(!base)return;
  $('play').disabled=true;note('Patching…');
  try{
    if(soundOn){audio??=new AudioContext();await audio.resume();}
    const rom=patched??applyBps(base,await patchReady);
    snes=new Snes();if(!snes.loadRom(rom,true))throw Error('The emulator rejected the cartridge.');snes.reset(true);
    loadSram();$('start').hidden=true;$('pause').disabled=false;pause(false);canvas.focus?.();
  }catch(e){note(e.message);console.error(e);}
  finally{$('play').disabled=false;}
}
$('play').onclick=play;

// In-game saves: cartridge SRAM <-> localStorage.
function loadSram(){
  try{const s=localStorage.getItem(SRAM_KEY);if(s){const b=s.split(',').map(Number);if(b.length===snes.cart.sram.length&&b.every(n=>n>=0&&n<=255))snes.cart.sram.set(b);}}catch{/* Storage blocked. */}
  lastSram=Array.from(snes.cart.sram).join(',');
}
function saveSram(announce=true){
  if(!snes)return;const s=Array.from(snes.cart.sram).join(',');if(s===lastSram)return;
  try{localStorage.setItem(SRAM_KEY,s);lastSram=s;if(announce)toast('Saved to this browser');}
  catch{toast('Could not save: browser storage is full or blocked',5000);}
}
setInterval(saveSram,2000);
addEventListener('pagehide',()=>saveSram(false));
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){saveSram(false);resumeOnShow=running;if(running)pause(true);}
  else if(resumeOnShow){resumeOnShow=false;pause(false);}
});

function pause(value){
  if(!snes)return;running=!value;held.clear();snes.joypad1State=0;carry=0;nextAudio=0;
  $('paused').hidden=running;$('pause').textContent=running?'Pause':'Resume';
}
$('pause').onclick=()=>pause(running);
$('paused').onclick=()=>pause(false);

function audioFrame(){
  if(!audio||!soundOn){snes.apu.dsp.sampleOffset=0;return;}
  const n=Math.round(audio.sampleRate/60),b=audio.createBuffer(2,n,audio.sampleRate);
  snes.setSamples(b.getChannelData(0),b.getChannelData(1),n);
  if(nextAudio<audio.currentTime||nextAudio>audio.currentTime+.15)nextAudio=audio.currentTime+.03;
  const node=audio.createBufferSource(),gain=audio.createGain();gain.gain.value=.35;node.buffer=b;node.connect(gain);gain.connect(audio.destination);node.onended=()=>{node.disconnect();gain.disconnect();};node.start(nextAudio);nextAudio+=b.duration;
}
async function toggleSound(){soundOn=!soundOn;if(soundOn){audio??=new AudioContext();await audio.resume();}nextAudio=0;$('sound').textContent=soundOn?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(soundOn));}
$('sound').onclick=toggleSound;

// Full screen covers the whole page so the touch pad comes along.
const fsElement=()=>document.fullscreenElement??document.webkitFullscreenElement;
const fsSupported=document.fullscreenEnabled||document.webkitFullscreenEnabled;
async function toggleFullscreen(){
  const root=document.documentElement;
  try{if(fsElement())await(document.exitFullscreen?.()??document.webkitExitFullscreen?.());else await(root.requestFullscreen?.({navigationUI:'hide'})??root.webkitRequestFullscreen?.());}
  catch{toast('Full screen is not available here');}
}
if(!fsSupported)$('fullscreen').hidden=true;
$('fullscreen').onclick=toggleFullscreen;
for(const ev of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(ev,()=>document.documentElement.classList.toggle('fullscreen',!!fsElement()));

// Keyboard and gamepad.
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.code==='Escape'||e.code==='KeyP'){if(snes){e.preventDefault();pause(running);}return;}
  if(e.code==='KeyF'){e.preventDefault();if(!e.repeat)toggleFullscreen();return;}
  if(e.code==='KeyM'){e.preventDefault();if(!e.repeat)toggleSound();return;}
  if(e.code in keys&&snes){e.preventDefault();held.add(keys[e.code]);}
});
document.addEventListener('keyup',e=>{if(e.code in keys)held.delete(keys[e.code]);});
addEventListener('blur',()=>{held.clear();});
function gamepadMask(){
  const p=[...(navigator.getGamepads?.()??[])].find(Boolean);if(!p)return 0;let m=0;
  const map={0:0,1:8,2:1,3:9,4:10,5:11,8:2,9:3,12:4,13:5,14:6,15:7};
  for(const[i,b]of Object.entries(map))if(p.buttons[i]?.pressed)m|=1<<b;
  if(p.axes[0]<-.45)m|=1<<6;if(p.axes[0]>.45)m|=1<<7;if(p.axes[1]<-.45)m|=1<<4;if(p.axes[1]>.45)m|=1<<5;return m;
}

// Touch pad: every finger is tracked on its own and may slide between
// buttons; the D-pad reads eight directions from the finger's angle.
const pad=$('pad'),dpad=$('dpad'),fingers=new Map();
if(matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0)document.documentElement.classList.add('touch');
addEventListener('touchstart',()=>document.documentElement.classList.add('touch'),{once:true,passive:true});
function fingerMask(x,y){
  const r=dpad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=x-cx,dy=y-cy,reach=r.width*.75;
  if(Math.hypot(dx,dy)<=reach&&Math.abs(dx)<=reach&&Math.abs(dy)<=reach){
    if(Math.hypot(dx,dy)<r.width*.12)return 0;
    const sector=Math.round(Math.atan2(dy,dx)/(Math.PI/4));let m=0; // 0 right, 2 down, -2 up, ±4 left
    if([-1,0,1].includes(sector))m|=1<<7;if([3,4,-4,-3].includes(sector))m|=1<<6;
    if([1,2,3].includes(sector))m|=1<<5;if([-1,-2,-3].includes(sector))m|=1<<4;return m;
  }
  const el=document.elementFromPoint(x,y)?.closest?.('#pad button');
  return el?1<<Number(el.dataset.b):0;
}
function refreshPad(){
  let m=0;for(const v of fingers.values())m|=v;
  if(m&~touchMask&&navigator.vibrate)navigator.vibrate(8);
  touchMask=m;
  for(const b of pad.querySelectorAll('button'))b.classList.toggle('on',!!(m&1<<Number(b.dataset.b)));
  for(const[cls,bit]of[['up',4],['down',5],['left',6],['right',7]])dpad.querySelector('.'+cls).classList.toggle('on',!!(m&1<<bit));
}
pad.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&!document.documentElement.classList.contains('touch'))return;e.preventDefault();try{pad.setPointerCapture(e.pointerId);}catch{/* Synthetic or finished pointer. */}fingers.set(e.pointerId,fingerMask(e.clientX,e.clientY));refreshPad();});
pad.addEventListener('pointermove',e=>{if(!fingers.has(e.pointerId))return;e.preventDefault();fingers.set(e.pointerId,fingerMask(e.clientX,e.clientY));refreshPad();});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(ev,e=>{if(fingers.delete(e.pointerId))refreshPad();});
pad.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('dblclick',e=>e.preventDefault());

function frame(now){
  if(running&&snes){
    carry+=Math.min(100,now-lastTime)*60/1000;const count=Math.min(Math.floor(carry),4);carry-=count;
    let mask=gamepadMask()|touchMask;for(const n of held)mask|=1<<n;snes.joypad1State=mask;
    try{for(let i=0;i<count;i++){snes.runFrame();audioFrame();}if(count)draw();}catch(e){pause(true);toast(e.message,6000);console.error(e);}
  }
  lastTime=now;requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.shrekPlayer={get snes(){return snes;},get running(){return running;},pause,saveSram};
init().catch(e=>{note(e.message);console.error(e);});
