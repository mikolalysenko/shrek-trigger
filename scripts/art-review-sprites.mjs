import {mkdir,writeFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
import {cast} from '../content/cast.js';
import {sprite,snesColor} from '../engine/sprites.js';
import {rasterArtInfo} from '../engine/raster-art.js';
import {supportingCast} from '../content/supporting-cast.js';
import {supportingFrames} from '../engine/supporting-cast.js';
import {onionJar,caretakerFrames} from '../content/caretaker.js';
import {onionJarSprite} from '../engine/native-sprites.js';
import {onionJarArt} from '../content/onion-jar-art.js';
import {carnivalCast,carnivalFields,carnivalColors} from '../content/carnival.js';
import {carnivalFrameMap,carnivalFieldMap,clownSprite} from '../engine/carnival-art.js';
import {customMedinaActors as medinaActors} from '../content/medina-actors.js';
import {enforcerActors,briarFrames} from '../content/enforcer-actors.js';
import {ghostActors} from '../content/ghost-actors.js';
import {guyFieriTiers} from '../content/guy-fieri.js';
import {guyFieriFrameMap} from '../engine/guy-fieri.js';
import {nativeSpriteBank,nativeSpriteAtlas,nativeSpriteCells,nativeCellAtlas} from './native-sprite-view.mjs';
import {customBakeryActors as bakeryActors} from '../content/bakery-actors.js';
import {bakeryVillagers} from '../content/bakery-villagers.js';
import {customBridgeActors as bridgeActors} from '../content/bridge-actors.js';
import {courtBeasts} from '../content/court-beasts.js';
import {customFutureMachines as futureMachines} from '../content/future-machines.js';
import {customFutureWildlife as futureWildlife} from '../content/future-wildlife.js';
import {nativeGuards} from '../content/native-guards.js';
import {customCourtPalaceActors as courtPalaceActors} from '../content/court-palace.js';
import {customTownsfolk as townsfolk} from '../content/townsfolk.js';
import {customStorybookActors as storybookActors} from '../content/storybook-actors.js';
import {magicMirror} from '../content/magic-mirror.js';
import {dulocTank} from '../content/duloc-tank.js';
import {finaleCompanions} from '../content/finale.js';
import {cosmicMuffinActors,cosmicMuffinSpawnActors} from '../content/cosmic-muffin.js';
import {endgameActors} from '../content/endgame-actors.js';
import {cosmicInteriorActors} from '../content/cosmic-interior.js';
import {tysonReveal} from '../content/tyson-reveal.js';

// Snapshot the actual indexed generators with the build. The review page
// needs no emulator, source ROM, runtime hooks or live generator imports.
export async function writeSpriteReview(out,build,sha256){
  await mkdir(`${out}/frames`,{recursive:true});
  const actors=[];
  for(const c of cast)for(const weapon of c.id===4?['rapier','hatchet']:['rapier']){
    const audit=build.audit.characters[c.id],coverage=audit.rasterCoverage.byWeapon[weapon];
    const previous=new Set(coverage.remaining.map(f=>f.frame));
    const origin=rasterArtInfo(c.id===4&&weapon==='hatchet'?'puss-hatchet':c.key)?.sourceType;
    const frames=audit.map.map((f,i)=>({...f,art:f.pose==='blank'?'intentional blank':previous.has(i)?'earlier artwork':origin==='image-generation'?'generated raster':'reused game raster',semantic:audit.semanticCoverage?.frames[i]??null}));
    const palette=c.palette.map(hex=>{const n=snesColor(hex);return[0,5,10].map(shift=>{const v=n>>shift&31;return v<<3|v>>2;});});
    const atlas=new PNG({width:512,height:Math.ceil(frames.length/16)*32});
    frames.forEach((f,i)=>{
      const pixels=sprite(c.id,f.facing,f.pose,f.phase,{weapon});
      pixels.forEach((v,p)=>{if(v)atlas.data.set([...palette[v-1],255],(((i>>4)*32+(p>>5))*512+(i%16)*32+(p%32))*4);});
    });
    const file=`frames/${c.key}${c.id===4?'-'+weapon:''}.png`;
    await writeFile(`${out}/${file}`,PNG.sync.write(atlas));
    actors.push({name:c.name+(c.id===4?' · '+weapon:''),file,frames,width:32,height:32,columns:16,palette:palette.map(rgb=>'rgb('+rgb.join(',')+')'),bytes:audit.bytes,capacity:audit.capacity,coverage:{raster:coverage.rasterFrames,pending:coverage.proceduralFrames,blank:coverage.blankFrames,actingSubstitutions:audit.semanticCoverage?.counts.fallback??0}});
  }
  function addStoryActor(a,map,images,colors,rasterKey=a.key){
    const origin=rasterArtInfo(rasterKey),frames=map.map(f=>({...f,art:origin?.sourceType==='image-generation'?'generated raster':origin?'reused game raster':'earlier artwork',semantic:null}));
    const palette=colors.map(hex=>{const n=snesColor(hex);return[0,5,10].map(shift=>{const v=n>>shift&31;return v<<3|v>>2;});});
    const atlas=new PNG({width:512,height:Math.ceil(frames.length/16)*32});
    images.forEach((pixels,i)=>pixels.forEach((v,p)=>{if(v)atlas.data.set([...palette[v-1],255],(((i>>4)*32+(p>>5))*512+(i%16)*32+(p%32))*4);}));
    const file=`frames/${a.key}.png`,stream=build.audit.resources.npcGraphicsStreaming.streams.find(s=>s.gfx===a.gfx);
    actors.push({name:a.name,file,frames,width:32,height:32,columns:16,palette:palette.map(rgb=>'rgb('+rgb.join(',')+')'),bytes:stream.bytes,capacity:stream.bytes,coverage:{raster:origin?frames.length:0,pending:origin?0:frames.length,blank:0,actingSubstitutions:0}});
    return writeFile(`${out}/${file}`,PNG.sync.write(atlas));
  }
  await addStoryActor(onionJar,caretakerFrames,caretakerFrames.map(onionJarSprite),onionJarArt.palette);
  for(const a of supportingCast){const {map,frames}=supportingFrames(build.base,a);await addStoryActor(a,map,frames,a.colors??cast[a.partyArt].palette,a.artAlias??(a.partyArt!==undefined?cast[a.partyArt].key:a.key));}
  for(const a of[...carnivalCast.filter(a=>a.size===0),...carnivalFields]){const key=a.art??a.key,map=a.enemy===undefined?carnivalFieldMap():carnivalFrameMap(key);await addStoryActor(a,map,map.map(p=>clownSprite(key,p)),carnivalColors[key],key);}
  const bosses=[carnivalCast.find(a=>a.key==='great-milenko'),medinaActors.find(a=>a.gfx===155),...medinaActors.filter(a=>a.gfx===140),enforcerActors.find(a=>a.enemy===158),enforcerActors.find(a=>a.gfx===182),...ghostActors,
    ...guyFieriTiers.map((a,tier)=>({...a,key:'guy-fieri-'+tier,name:'Guy Fieri · '+a.name,gfx:252,art:'guy-fieri',map:guyFieriFrameMap(tier)}))];
  async function addNativeActor(a,bank,view){
    const {width,height,origin,images}=view;
    const columns=Math.max(1,Math.floor(512/width)),atlas=new PNG({width:columns*width,height:Math.ceil(a.frames/columns)*height});
    const source=rasterArtInfo(a.art??a.key),frames=images.map((pixels,i)=>({pose:a.map?.[i].pose??(a.gfx===166?briarFrames[i].role:'native animation'),facing:a.map?.[i].facing??null,phase:a.map?.[i].phase??i,art:pixels.some(Boolean)?(a.sourceType??source?.sourceType)==='image-generation'?'generated raster':'reused game raster':'intentional blank',semantic:null}));
    images.forEach((pixels,f)=>pixels.forEach((index,p)=>{if(index)atlas.data.set([...bank.palette[index-1],255],((Math.floor(f/columns)*height+Math.floor(p/width))*atlas.width+(f%columns)*width+p%width)*4);}));
    const file='frames/'+a.key+'.png';await writeFile(out+'/'+file,PNG.sync.write(atlas));
    const blank=frames.filter(f=>f.art==='intentional blank').length;
    actors.push({name:a.name,file,frames,width,height,columns,origin,nativeCells:bank.cells,palette:bank.palette.map(rgb=>'rgb('+rgb.join(',')+')'),bytes:bank.graphics.length,capacity:0x8000,coverage:{raster:frames.length-blank,pending:0,blank,actingSubstitutions:0}});
  }
  bosses.push(cosmicMuffinActors[0],cosmicMuffinActors.at(-1),...cosmicMuffinSpawnActors,...bakeryActors,...courtBeasts.map(a=>({...a,art:'court-beast'})),
    ...bridgeActors.map(a=>({...a,art:a.gfx===108?'bone-guards':a.art})),...bakeryVillagers,
    ...futureMachines.filter(a=>[96,97,197].includes(a.gfx)).map(a=>({...a,art:{96:'future-mites',97:'future-ushers',197:'future-bells'}[a.gfx]})),
    ...nativeGuards,...courtPalaceActors,...townsfolk,...storybookActors,...futureWildlife.filter(a=>[82,89,92,93,98,102,104,105,110,112,154].includes(a.gfx)).map(a=>({...a,art:{93:'drain-imps',102:'workshop-residues',104:'lantern-bats',105:'scavenger-rats',110:'sewer-pods',154:'mire-golems'}[a.gfx]??a.art})),
    ...dulocTank,...finaleCompanions,...futureMachines.filter(a=>a.gfx===37),...endgameActors,...cosmicInteriorActors,tysonReveal);
  for(const a of bosses){const bank=nativeSpriteBank(build.rom,a);await addNativeActor(a,bank,nativeSpriteAtlas(bank));}
  const mirrorBanks=magicMirror.model.actors.map(a=>nativeSpriteBank(build.rom,{...magicMirror.model,...a}));
  const compound=Array.from({length:2},(_,frame)=>mirrorBanks.flatMap(b=>nativeSpriteCells(b,frame)));
  await addNativeActor({key:'magic-mirror',name:'Magic Mirror · complete assembly',frames:2},{...mirrorBanks[0],cells:20},nativeCellAtlas(compound));
  const displayBank=nativeSpriteBank(build.rom,magicMirror.display);
  await addNativeActor({...magicMirror.display,name:'Echo Mirror'},displayBank,nativeSpriteAtlas(displayBank));
  const data=JSON.stringify({sha256,actors}).replaceAll('<','\\u003c');
  await writeFile(`${out}/sprites.html`,String.raw`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shrek Trigger · every sprite frame</title>
<style>
*{box-sizing:border-box}body{margin:0 auto;padding:28px;max-width:1200px;background:#141d23;color:#e9efdd;font:16px system-ui,sans-serif}h1{font-size:28px;margin:20px 0 8px}p{color:#b8c4c0;line-height:1.5}a{color:#cce792}nav{display:flex;gap:24px;flex-wrap:wrap}.controls{display:flex;flex-wrap:wrap;gap:16px;margin:24px 0}label{display:grid;gap:6px;font-size:13px;color:#bacd99}select,button{font:inherit;color:#e9efdd;background:#243337;border:1px solid #597065;border-radius:5px;padding:10px;min-height:44px}button{cursor:pointer}button:disabled{opacity:.5}main{display:grid;grid-template-columns:1fr 1fr;gap:24px}.panel{background:#1c292c;border:1px solid #38413c;border-radius:8px;padding:20px;min-width:0}.views{display:flex;align-items:flex-end;gap:32px;min-height:230px}figure{margin:0;text-align:center}figcaption{color:#a7b8b2;font-size:12px;margin-top:8px}canvas,img{image-rendering:pixelated}canvas,#atlas{background:#e8e3d7}body[data-background="dark"] canvas,body[data-background="dark"] #atlas{background:#243337}body[data-background="checker"] canvas,body[data-background="checker"] #atlas{background:repeating-conic-gradient(#d5d0c4 0 25%,#f0ece2 0 50%) 0/16px 16px}.atlas-wrap{overflow-x:auto}#large,#native{max-width:none}.views{overflow-x:auto}#position{width:100%;margin:24px 0}#detail{min-height:48px;color:#e9efdd;font-family:monospace}.buttons{display:flex;flex-wrap:wrap;gap:10px}#palette{display:flex;gap:4px;margin:20px 0}#palette span{height:22px;flex:1;border:1px solid #59615b}#atlas{width:100%;min-width:768px;height:auto;cursor:crosshair}h2{font-size:19px;margin:0 0 14px}footer{font:12px monospace;color:#92a29c;overflow-wrap:anywhere;margin-top:24px}#budget{font-size:13px}@media(max-width:760px){body{padding:16px}main{grid-template-columns:1fr}.views{gap:24px}.controls label:first-child{width:100%}}
</style>
<nav><a href="index.html">← Art and combat review</a><a href="/">Open the game</a></nav>
<h1>Party, story and boss sprite frames</h1>
<p>Review all seven playable characters, both Puss weapons, the story cast, clowns and current large bosses. Frames use the cartridge’s twelve-color palettes. Bosses retain their native cell positions, including tall effects and attack offsets. Select a pose and direction, then step through its frames.</p>
<div class="controls"><label>Character<select id="actor"></select></label><label>Pose<select id="pose"></select></label><label>Facing<select id="facing"><option value="all">All directions</option><option value="1">Front</option><option value="2">Left</option><option value="0">Back</option><option value="3">Right</option></select></label><label>Background<select id="background"><option value="light">Light · show line work</option><option value="dark">Dark · scene contrast</option><option value="checker">Transparency checker</option></select></label></div>
<main><section class="panel"><div class="views"><figure><canvas id="large" width="32" height="32"></canvas><figcaption id="scale">6× · nearest neighbor</figcaption></figure><figure><canvas id="native" width="32" height="32"></canvas><figcaption>1× · native size</figcaption></figure></div><p id="detail" aria-live="polite"></p><label>Frame in this selection<input id="position" type="range" min="0" value="0" step="1"></label><div class="buttons"><button id="previous" aria-label="Previous frame">← Previous</button><button id="play">Play</button><button id="next" aria-label="Next frame">Next →</button></div><p>Review playback is 8 frames per second. The game retains its original animation timing.</p><div id="palette" aria-label="SNES palette"></div><p id="budget"></p></section><section class="panel"><h2>Complete frame atlas</h2><p>Click any cell to inspect its native frame. Empty cells can be intentional animation roles. Scroll the enlarged atlas horizontally when needed.</p><div class="atlas-wrap"><img id="atlas" alt="All native frames for the selected character"></div></section></main><footer id="fingerprint"></footer>
<script type="application/json" id="data">`+data+String.raw`</script>
<script>
const data=JSON.parse(document.getElementById('data').textContent),el=id=>document.getElementById(id),directions=['back','front','left','right'];
let actor,indices=[],index=0,timer=null,loadToken=0;
const atlas=el('atlas');
function stop(){clearInterval(timer);timer=null;el('play').textContent='Play';}
function draw(){
  const frame=indices[index],f=actor.frames[frame],{width,height,columns}=actor;
  for(const name of['large','native']){const ctx=el(name).getContext('2d');ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;if(atlas.complete&&atlas.naturalWidth)ctx.drawImage(atlas,(frame%columns)*width,Math.floor(frame/columns)*height,width,height,0,0,width,height);}
  el('position').value=index;el('detail').textContent='Frame '+frame+' / '+(actor.frames.length-1)+' · '+f.pose+(f.facing===null?'':' · '+directions[f.facing])+' · phase '+f.phase+' · '+f.art+(f.semantic?' · '+(f.semantic.kind==='fallback'?'temporary acting substitution':f.semantic.kind)+'. '+f.semantic.reason:'');
  el('previous').disabled=el('next').disabled=el('play').disabled=indices.length<2;
}
function filter(){stop();indices=actor.frames.flatMap((f,i)=>(el('pose').value==='all'||f.pose===el('pose').value)&&(el('facing').value==='all'||f.facing===Number(el('facing').value))?[i]:[]);if(!indices.length){el('facing').value='all';return filter();}index=0;el('position').max=indices.length-1;draw();}
async function select(){
  stop();const token=++loadToken;actor=data.actors[Number(el('actor').value)];
  const scale=Math.max(1,Math.min(6,Math.floor(256/Math.max(actor.width,actor.height))));
  for(const name of['large','native']){const canvas=el(name),n=name==='large'?scale:1;canvas.width=actor.width;canvas.height=actor.height;canvas.style.width=actor.width*n+'px';canvas.style.height=actor.height*n+'px';}
  el('scale').textContent=scale+'× · nearest neighbor';
  el('pose').replaceChildren(new Option('All poses','all'),...Array.from(new Set(actor.frames.map(f=>f.pose))).sort().map(p=>new Option(p,p)));
  el('pose').value=actor.frames.some(f=>f.pose==='run')?'run':actor.frames.some(f=>f.pose==='walk')?'walk':actor.frames.some(f=>f.pose==='idle')?'idle':'all';el('facing').value='1';
  el('palette').replaceChildren(...actor.palette.map((c,i)=>{const swatch=document.createElement('span');swatch.style.background=c;swatch.title='Index '+(i+1)+' · '+c;return swatch;}));
  el('budget').textContent=actor.coverage.raster+' raster frames · '+actor.coverage.pending+' awaiting artwork replacement · '+actor.coverage.blank+' intentional blanks. '+(actor.coverage.actingSubstitutions?actor.coverage.actingSubstitutions+' raster frames still use temporary acting substitutions. ':'')+actor.bytes.toLocaleString()+' / '+actor.capacity.toLocaleString()+' bytes in the assigned cartridge tile region. '+actor.width+' × '+actor.height+' pixel review window'+(actor.nativeCells?' · '+actor.nativeCells+' native cells per frame.':'.');
  atlas.alt=actor.name+' complete native frame atlas';atlas.src=actor.file;filter();await atlas.decode();if(token===loadToken)draw();
}
el('actor').replaceChildren(...data.actors.map((a,i)=>new Option(a.name,i)));
el('actor').onchange=select;el('pose').onchange=el('facing').onchange=filter;
el('background').onchange=()=>{document.body.dataset.background=el('background').value;};document.body.dataset.background='light';
el('position').oninput=()=>{stop();index=Number(el('position').value);draw();};
function step(delta){index=(index+delta+indices.length)%indices.length;draw();}
el('previous').onclick=()=>{stop();step(-1);};el('next').onclick=()=>{stop();step(1);};
el('play').onclick=()=>{if(timer)return stop();el('play').textContent='Pause';timer=setInterval(()=>step(1),125);};
atlas.onclick=e=>{const rect=atlas.getBoundingClientRect(),x=Math.floor((e.clientX-rect.left)*atlas.naturalWidth/rect.width/actor.width),y=Math.floor((e.clientY-rect.top)*atlas.naturalHeight/rect.height/actor.height),frame=y*actor.columns+x;if(frame>=actor.frames.length)return;el('pose').value='all';el('facing').value='all';filter();index=frame;draw();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
el('fingerprint').textContent='Build '+data.sha256+' · '+data.actors.reduce((n,a)=>n+a.frames.length,0).toLocaleString()+' mapped frames including both weapons';
select();
</script></html>`);
  return{page:'sprites.html',atlases:actors.length,frames:actors.reduce((n,a)=>n+a.frames.length,0)};
}
