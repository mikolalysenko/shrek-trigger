import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {PNG} from 'pngjs';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {build,bedroom,screenshot} from '../tests/helpers.mjs';
import {cast} from '../content/cast.js';
import {sprite,snesColor} from '../engine/sprites.js';
import {rasterArtInfo} from '../engine/raster-art.js';
import {portrait} from '../engine/portraits.js';
import {carnivalCast,carnivalColors,hatchetProps} from '../content/carnival.js';
import {carnivalFrameMap,clownSprite,milenkoSprite,hatchetSprite} from '../engine/carnival-art.js';
import {faygoActors} from '../content/faygo.js';
import {faygoBottle} from '../engine/faygo-art.js';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames,openingReady} from '../engine/automation.js';
import {u16,u24,put16,fileOffset} from '../engine/rom.js';
import {decompress} from '../engine/compression.js';
import {chooseNativeTech} from '../tests/battle-controller.mjs';
import {writeSpriteReview} from './art-review-sprites.mjs';
import {supportingCast} from '../content/supporting-cast.js';
import {supportingFrames} from '../engine/supporting-cast.js';
import {onionJar,caretakerFrames} from '../content/caretaker.js';
import {onionJarSprite} from '../engine/native-sprites.js';
import {onionJarArt} from '../content/onion-jar-art.js';
import {challengeSteve} from '../tests/resurrection-controller.mjs';
import {tysonNativeSprite,finalePalette} from '../engine/finale.js';
import {guyFieriActors} from '../content/guy-fieri.js';
import {guyFieriFrameMap} from '../engine/guy-fieri.js';
import {nativeSpriteBank,nativeSpriteAtlas} from './native-sprite-view.mjs';
import {createCore} from './core.mjs';
import {overworldHeroSprite,overworldHeroPalette} from '../engine/environment.js';
import {areas} from '../content/areas.js';
import {copyEndgameReview} from './art-review-endgame.mjs';
import {copyGuardReview} from './art-review-guards.mjs';
import {copyCourtSwampReview} from './art-review-court-swamp.mjs';
import {copyTownsfolkReview} from './art-review-townsfolk.mjs';

const outArgument=process.argv.indexOf('--out');
const out=outArgument<0?'art-review':process.argv[outArgument+1];
assert.ok(out&&!out.startsWith('--'),'--out requires a directory');
const evidenceArgument=process.argv.indexOf('--endgame-evidence');
const endgameEvidence=evidenceArgument<0?null:process.argv[evidenceArgument+1];
assert.ok(evidenceArgument<0||endgameEvidence&&!endgameEvidence.startsWith('--'),'--endgame-evidence requires a scene-check directory');
const guardArgument=process.argv.indexOf('--guard-evidence');
const guardEvidence=guardArgument<0?null:process.argv[guardArgument+1];
assert.ok(guardArgument<0||guardEvidence&&!guardEvidence.startsWith('--'),'--guard-evidence requires a scene-check directory');
const courtSwampArgument=process.argv.indexOf('--court-swamp-evidence');
const courtSwampEvidence=courtSwampArgument<0?null:process.argv[courtSwampArgument+1];
assert.ok(courtSwampArgument<0||courtSwampEvidence&&!courtSwampEvidence.startsWith('--'),'--court-swamp-evidence requires a scene-check directory');
const townsfolkArgument=process.argv.indexOf('--townsfolk-evidence');
const townsfolkEvidence=townsfolkArgument<0?null:process.argv[townsfolkArgument+1];
assert.ok(townsfolkArgument<0||townsfolkEvidence&&!townsfolkEvidence.startsWith('--'),'--townsfolk-evidence requires a scene-check directory');
await mkdir(out,{recursive:true});
const b=await build(),sha256=createHash('sha256').update(b.rom).digest('hex');
// A small tech-only update may retain explicitly identified earlier scene
// captures. Never silently relabel their source cartridge as the new build.
const sceneRomArgument=process.argv.indexOf('--scene-evidence-rom'),sceneRom=sceneRomArgument<0?null:process.argv[sceneRomArgument+1];
assert.ok(sceneRomArgument<0||sceneRom&&!sceneRom.startsWith('--'),'--scene-evidence-rom requires a cartridge file');
const sceneEvidenceSha256=sceneRom?createHash('sha256').update(await readFile(sceneRom)).digest('hex'):sha256;
const townsfolkRomArgument=process.argv.indexOf('--townsfolk-evidence-rom'),townsfolkRom=townsfolkRomArgument<0?null:process.argv[townsfolkRomArgument+1];
assert.ok(townsfolkRomArgument<0||townsfolkRom&&!townsfolkRom.startsWith('--'),'--townsfolk-evidence-rom requires a cartridge file');
const townsfolkEvidenceSha256=townsfolkRom?createHash('sha256').update(await readFile(townsfolkRom)).digest('hex'):sha256;
const specs=JSON.parse(await readFile('content/hooks.json'));
const rasterProgress=b.audit.characters.map(a=>({id:a.id,name:a.name,frames:a.frameCount,
  raster:a.rasterCoverage.rasterFrames,pending:a.rasterCoverage.proceduralFrames,blank:a.rasterCoverage.blankFrames,
  actingSubstitutions:a.semanticCoverage?.counts.fallback??0}));
function image(pixels,width,colors){
  const png=new PNG({width,height:pixels.length/width});
  const palette=colors.map(hex=>{const c=snesColor(hex);return[0,5,10].map(n=>{const v=c>>n&31;return v<<3|v>>2;});});
  pixels.forEach((v,i)=>{if(v)png.data.set([...palette[v-1],255],i*4);});
  return 'data:image/png;base64,'+PNG.sync.write(png).toString('base64');
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const img=(src,width,height)=>`<img class="sprite" src="${src}" style="width:${width}px;height:${height}px" alt="">`;
const style=`*{box-sizing:border-box}body{margin:0;padding:32px;background:#141d23;color:#e9efdd;font:15px system-ui,sans-serif}h1{font-size:27px;margin:0 0 8px}p{color:#b8c4c0;margin:0 0 24px}table{border-collapse:collapse;width:100%;table-layout:fixed}th{text-align:left;padding:12px;color:#bacd99;font-size:13px}td{padding:12px;border-top:1px solid #38413c;text-align:center;background:#1c292c}td:first-child{text-align:left;width:170px;background:#172226}small{display:block;color:#a7b8b2;font-size:11px;margin-top:8px}img{image-rendering:pixelated;object-fit:contain;vertical-align:bottom}.sprite{background:#e8e3d7}.items{display:flex;gap:22px;flex-wrap:wrap}.item{text-align:center;background:#1c292c;padding:14px;min-width:145px}.item b{display:block;margin-top:10px}footer{margin-top:20px;color:#92a29c;font:12px monospace}`;
const browser=await chromium.launch({headless:true});
async function sheet(file,title,description,body,width){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  await page.setContent(`<style>${style}</style><h1>${esc(title)}</h1><p>${esc(description)}</p>${body}<footer>Development build ${sha256.slice(0,12)} · Actual indexed art, SNES BGR555 colors · Nearest-neighbor enlargement</footer>`);
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await page.screenshot({path:`${out}/${file}`,fullPage:true});await page.close();
}
try{
  const spriteReview=await writeSpriteReview(out,b,sha256);
  const endgameReview=await copyEndgameReview(endgameEvidence,out,sceneEvidenceSha256);
  const guardReview=await copyGuardReview(guardEvidence,out,sceneEvidenceSha256);
  const courtSwampReview=await copyCourtSwampReview(courtSwampEvidence,out,sceneEvidenceSha256);
  const townsfolkReview=await copyTownsfolkReview(townsfolkEvidence,out,townsfolkEvidenceSha256,sha256);
  for(const capture of[...endgameReview,...guardReview,...courtSwampReview]){
    capture.cartridgeSha256=sceneEvidenceSha256;
    if(sceneEvidenceSha256!==sha256)capture.caption+=' Retained scene capture from build '+sceneEvidenceSha256.slice(0,12)+'.';
  }
  const muffinCore=await bedroom(b.rom),muffinHooks=installHooks(muffinCore,specs),muffinDev=createDevTools(muffinCore,muffinHooks);
  muffinDev.jump({id:467,x:7,y:10,party:[0,1,2],endgame:true});runFrames(muffinCore,900);
  await screenshot(muffinCore,`${out}/cosmic-muffin-shell.png`);assert.equal(muffinDev.diagnostics().fatal,null);muffinDev.undo();
  muffinDev.jump({id:264,x:5,y:24,party:[0,1,2],endgame:true});runFrames(muffinCore,500);runFrames(muffinCore,36,16);runFrames(muffinCore,600);
  assert.equal(muffinCore.ram[0xaf02],215);await screenshot(muffinCore,`${out}/cosmic-muffin-offspring.png`);assert.equal(muffinDev.diagnostics().fatal,null);
  muffinDev.undo();muffinDev.dispose();muffinHooks.dispose();
  const cosmicMuffin={shell:'cosmic-muffin-shell.png',offspring:'cosmic-muffin-offspring.png',native:true,offspringLocation:264};
  const columns=[['Front',p=>p.facing===1&&p.pose==='idle'],['Side',p=>p.facing===2&&p.pose==='idle'],['Back',p=>p.facing===0&&p.pose==='idle'],['Walk',p=>p.facing===1&&p.pose==='walk'&&p.phase===1],['Attack',p=>p.facing===2&&p.phase===1&&['slash','shoot','punch','swing','attack'].includes(p.pose)],['Cast',p=>p.facing===1&&p.pose==='cast'],['Reaction',p=>p.facing===1&&['hit','surprise'].includes(p.pose)],['Down',p=>p.pose==='down']];
  const rows=cast.map(c=>{const a=b.audit.characters[c.id];return `<tr><td><b>${esc(c.name)}</b><small>${a.frameCount} native frames<br>${a.rasterCoverage.rasterFrames} raster source<br>${a.rasterCoverage.proceduralFrames} awaiting artwork${a.semanticCoverage?.counts.fallback?`<br>${a.semanticCoverage.counts.fallback} acting substitutions`:''}</small></td>`+columns.map(([,match])=>{
    let f=a.map.findIndex(p=>!p.provisional&&match(p));if(f<0)f=a.map.findIndex(match);if(f<0)return '<td>—</td>';
    const p=a.map[f];return `<td>${img(image(sprite(c.id,p.facing,p.pose,p.phase),32,c.palette),96,96)}<small>Frame ${f}${p.provisional?' · provisional':''}${a.semanticCoverage?.frames[f].kind==='fallback'?' · acting substitution':''}</small></td>`;
  }).join('')+'</tr>';}).join('');
  await sheet('party-sprites.png','Shrek Trigger · party sprites','Seven playable characters. Selected frames from the current cartridge animation tables, enlarged 3×.',`<table><thead><tr><th>Character</th>${columns.map(([name])=>'<th>'+name+'</th>').join('')}</tr></thead><tbody>${rows}</tbody></table>`,1330);
  const directionNames={0:'Back',1:'Front',2:'Left',3:'Right'},directionOrder=[1,3,0,2];
  const motionRows=cast.flatMap(c=>{const info=rasterArtInfo(c.key);return directionOrder.map(facing=>{
    const cells=pose=>{const sequence=info.sequences[pose]?.[facing]??info.sequences[pose]?.[2]??[];return Array.from({length:6},(_,phase)=>phase<sequence.length?`<td>${img(image(sprite(c.id,facing,pose,phase),32,c.palette),64,64)}<small>${phase}</small></td>`:'<td>—</td>').join('');};
    return `<tr><td><b>${esc(c.name)}</b></td><td>${directionNames[facing]}</td>${cells('walk')}${cells('run')}</tr>`;
  });});
  await sheet('party-motion.png','Shrek Trigger · complete walk and run cycles','Every playable character, all four directions, and every source animation phase at 2×. Blank cells are shorter native cycles, not repeated static poses.',`<table><thead><tr><th>Character</th><th>Direction</th>${Array.from({length:6},(_,i)=>'<th>Walk '+i+'</th>').join('')}${Array.from({length:6},(_,i)=>'<th>Run '+i+'</th>').join('')}</tr></thead><tbody>${motionRows.join('')}</tbody></table>`,1170);
  const worldRows=cast.map(c=>`<tr><td><b>${esc(c.name)}</b><small>Seven opaque colors · 16 × 16</small></td>`+directionOrder.map(facing=>[false,true].map(walking=>`<td>${img(image(overworldHeroSprite(c.id,facing,walking),16,overworldHeroPalette(c.id)),96,96)}<small>${directionNames[facing]} · ${walking?'step':'idle'}</small></td>`).join('')).join('')+'</tr>').join('');
  await sheet('overworld-sprites.png','Shrek Trigger · overworld heroes','Actual seven-color, 16 × 16 cartridge conversions. Each direction shows its idle and genuine stepping pose at 6×.',`<table><thead><tr><th>Character</th>${directionOrder.map(f=>`<th>${directionNames[f]}</th><th>${directionNames[f]} step</th>`).join('')}</tr></thead><tbody>${worldRows}</tbody></table>`,1110);
  await sheet('portraits.png','Shrek Trigger · menu portraits','The current 48 × 48 pixel portraits, enlarged 3×. The game uses these in its native menus.',`<div class="items">${cast.map(c=>`<div class="item">${img(image(portrait(c.id),48,c.palette),144,144)}<b>${esc(c.name)}</b><small>${b.audit.portraits[c.id].artwork.kind==='raster'?'Raster source':'Awaiting artwork replacement'}</small></div>`).join('')}</div>`,1350);
  const story=[{...onionJar,colors:onionJarArt.palette,map:caretakerFrames,pixels:caretakerFrames.map(onionJarSprite)},...supportingCast.map(a=>{const {map,frames}=supportingFrames(b.base,a);return{...a,map,pixels:frames,colors:a.colors??cast[a.partyArt].palette};})];
  await sheet('supporting-sprites.png','Shrek Trigger · story characters','Current cartridge art for the onion jar and the supporting cast. Front, profile and story gestures, enlarged 3×.',`<div class="items">${story.map(a=>{
    const choices=[a.map.findIndex(p=>p.facing===1&&p.pose==='idle'),a.map.findIndex(p=>p.facing===2),a.map.findIndex(p=>!['idle','walk'].includes(p.pose))].map(i=>i<0?0:i);
    return `<div class="item"><b>${esc(a.name)}</b>${choices.map(i=>img(image(a.pixels[i],32,a.colors),96,96)).join('')}<small>${a.map.length} native animation slots</small></div>`;
  }).join('')}</div>`,1280);
  let body='';
  for(const c of carnivalCast){
    const map=carnivalFrameMap(c.key),frames=[0,Math.floor(map.length/3),Math.floor(map.length*2/3),map.length-1];
    body+=`<h2>${esc(c.name)}</h2><div class="items">${frames.map(f=>`<div class="item">${img(image(c.key==='great-milenko'?milenkoSprite(map[f]):clownSprite(c.key,map[f]),c.width,carnivalColors[c.key]),c.width*3,c.height*3)}<small>Frame ${f} · ${esc(map[f].pose)}</small></div>`).join('')}</div>`;
  }
  body+='<h2>Hatchets and Faygo</h2><div class="items">'+hatchetProps.map(c=>`<div class="item">${img(image(hatchetSprite(c.key,0),32,carnivalColors.hatchet),96,96)}<b>${esc(c.name)}</b></div>`).join('')+faygoActors.map(c=>`<div class="item">${img(image(faygoBottle(),32,c.colors),96,96)}<b>${esc(c.name)}</b><small>${c.stat} +1</small></div>`).join('')+'</div>';
  await sheet('carnival-and-faygo.png','Shrek Trigger · Carnival and items','Current battle actors, quest props and stat-up bottles. Enhasa’s dream projections also use the clown sprites.',body,1120);
  await sheet('tyson-sprites.png','Shrek Trigger · Mike Tyson','The supplied Punch-Out!! sheet, converted to the final formation’s 12-color palette and native 48 × 64 frames.',
    `<div class="items">${[0,4,8,12,16,20,24,28,32,36,40,44].map(frame=>`<div class="item">${img(image(tysonNativeSprite(frame),48,finalePalette),144,192)}<small>Frame ${frame}${frame===24?' · uppercut windup':''}</small></div>`).join('')}</div>`,1120);
  const guySheets=guyFieriActors.map((actor,tier)=>{
    const bank=nativeSpriteBank(b.rom,actor),view=nativeSpriteAtlas(bank),map=guyFieriFrameMap(tier);
    const frames=[map.findIndex(p=>p.facing===1&&p.pose==='walk'&&p.phase===0),map.findIndex(p=>p.facing===2&&p.pose==='walk'),map.findIndex(p=>p.facing===1&&p.pose.includes('cast')),map.findIndex(p=>p.facing===1&&p.pose.includes('attack'))].filter((f,i,a)=>f>=0&&a.indexOf(f)===i);
    const colors=bank.palette.map(rgb=>rgb.map(v=>v.toString(16).padStart(2,'0')).join(''));
    return `<div class="item"><b>${esc(actor.name)}</b><small>Leader level ${actor.level} · ${actor.frames} native slots</small>${frames.map(f=>img(image(view.images[f],view.width,colors),view.width*3,view.height*3)).join('')}</div>`;
  }).join('');
  await sheet('guy-fieri-sprites.png','Shrek Trigger · Guy Fieri','All six magic-teacher forms. These images decode the cartridge’s tiles, palettes and cell positions. Cyan diner sparks and crimson grill embers lead into the orange mantle, blue inferno halo and purple/gold Flavortown master.',`<div class="items">${guySheets}</div>`,1360);
  // Controller input selects the real tech. After entry, this only observes
  // cartridge execution; it never draws replacement actors or deals damage.
  const combat=[];
  const titleCore=await createCore(b.rom);runFrames(titleCore,1950);
  await screenshot(titleCore,`${out}/shrek-title.png`);
  const title={file:'shrek-title.png',frame:1950,native:true};
  const keeperCore=await bedroom(b.rom),keeperHooks=installHooks(keeperCore,specs),keeperDev=createDevTools(keeperCore,keeperHooks);
  keeperDev.jump(areas.find(a=>a.futureScene==='future-keeper'));runFrames(keeperCore,400);runFrames(keeperCore,24,16);
  for(let i=0;i<50&&keeperCore.ram[0xaf02]!==212;i++){runFrames(keeperCore,3,256);runFrames(keeperCore,100);}
  assert.equal(keeperCore.ram[0xaf02],212,'Storekeeper original reveal');
  assert.equal([...keeperCore.ram.slice(0xaf02,0xaf0a)].filter(id=>id===207).length,2);
  runFrames(keeperCore,300);
  // The Guardian keeps its stock background body (the Storekeeper redraw is retired).
  assert.deepEqual(new Uint8Array(keeperCore.ppu.vram.buffer).slice(0x7000,0x8000),decompress(b.base,fileOffset(u24(b.base,0x362220+186*3))).bytes);
  await screenshot(keeperCore,`${out}/storekeeper-battle.png`);assert.equal(keeperDev.diagnostics().fatal,null);
  const storekeeper={file:'storekeeper-battle.png',location:219,formation:[...keeperCore.ram.slice(0xaf02,0xaf0a)]};
  keeperDev.undo();keeperDev.dispose();keeperHooks.dispose();
  const guyFieri=[];
  for(const tier of [0,4]){
    const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
    let ready=false;h.on('battle.initialized',()=>{ready=true;});
    d.jump({id:465,x:7,y:10,facing:0,party:[0,1,2],trainingLevel:guyFieriActors[tier].level});runFrames(s,300);
    for(let frame=0;frame<5000&&!ready;frame++)runFrames(s,1,frame%90<3?256:0);
    assert.ok(ready,'Guy Fieri native practice decision');assert.equal(s.ram[0xaf02],224+tier);runFrames(s,31);
    const file=`guy-fieri-tier-${tier}.png`;await screenshot(s,`${out}/${file}`);
    assert.equal(d.diagnostics().fatal,null);guyFieri.push({tier,level:guyFieriActors[tier].level,file});d.undo();d.dispose();h.dispose();
  }
  const mirrorCore=await bedroom(b.rom),mirrorHooks=installHooks(mirrorCore,specs),mirrorDev=createDevTools(mirrorCore,mirrorHooks);
  let mirrorReady=false;mirrorHooks.on('battle.initialized',()=>{mirrorReady=true;});
  mirrorCore.ram[0x10000]=203;mirrorDev.jump({id:268,x:9,y:13,party:[3,0,2],endgame:true});runFrames(mirrorCore,300);
  for(let frame=0;frame<6000&&!mirrorReady;frame++)runFrames(mirrorCore,1,frame%90<3?256:0);
  assert.ok(mirrorReady,'Magic Mirror original reveal reaches battle');runFrames(mirrorCore,180);
  const mirrorFormation=[...mirrorCore.ram.slice(0xaf02,0xaf0a)];assert.deepEqual(mirrorFormation,[190,255,255,183,183,183,255,255]);
  await screenshot(mirrorCore,`${out}/magic-mirror-battle.png`);assert.equal(mirrorDev.diagnostics().fatal,null);
  const magicMirror={file:'magic-mirror-battle.png',location:268,formation:mirrorFormation};mirrorDev.undo();mirrorDev.dispose();mirrorHooks.dispose();
  for(const [id,name,fixture]of [[1,'Fart','clowns'],[2,'Eye Lasers','milenko'],[4,'Swamp Piledriver','clowns'],[7,'Four Layer Slam','clowns'],[8,'Swamp Belch','milenko']]){
    const s=await bedroom(b.rom);assert.ok(openingReady(s));const h=installHooks(s,specs),d=createDevTools(s,h);
    d.jump({id:1,x:8,y:8,party:[0,1,2],endgame:true});runFrames(s,300);if(id===6)put16(s.ram,0x2603+80,0);d.startCombat({fixture,unlockTechs:true});runFrames(s,400);
    let cast=false,elapsed=-1;const hits=[];h.on('battle.tech',e=>{if(e.techId===id&&!cast){cast=true;elapsed=0;}});h.on('battle.result',e=>{if(e.techId===id&&e.actor===0)hits.push(e);});
    const io={read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),tap:(key,gap=12)=>{runFrames(s,3,key);runFrames(s,gap);}};
    await chooseNativeTech(io,b.rom,0,id);const captures=[],frames=`.local/qa/art-review-tech-${id}`;await mkdir(frames,{recursive:true});let frameCount=0;
    for(let f=0;f<(id===8?1000:id===6?900:600);f++){s.runFrame();if(elapsed>=0){
      if((id===1?[90,115,140]:id===8?[150,240,330]:id===7?[80,312,336]:id===6?[130,220,400]:id===3?[75,110,150]:id===5?[110,230,300]:id===4?[80,110,135]:[50,70,95]).includes(elapsed)){const file=`combat-${id}-${elapsed}.png`;await screenshot(s,`${out}/${file}`);captures.push({file,frame:elapsed});}
      if(elapsed<(id===6?720:[5,7,8].includes(id)?480:240)&&elapsed%4===0)await screenshot(s,`${frames}/${String(frameCount++).padStart(3,'0')}.png`);
      elapsed++;
    }}
    assert.ok(cast,'native tech dispatch');assert.ok(hits.some(e=>id===6?e.target===1&&e.value>=0x8000:e.value>0),'native technique result');if(id===6){assert.ok(u16(s.ram,0x5eb0)>0);assert.equal(s.ram[0x5eca]&128,0);}assert.equal(d.diagnostics().fatal,null);
    assert.equal(captures.length,3,'three frames from the executing tech');
    await sheet(`combat-${id}.png`,`Shrek Trigger · ${name}`,`Actual cartridge battle against ${fixture==='clowns'?'Violent J and Shaggy 2 Dope':'Great Milenko'}. Captured through the same combat sandbox used in the browser.`,`<div class="items">${(await Promise.all(captures.map(async c=>`<div class="item">${img('data:image/png;base64,'+(await readFile(`${out}/${c.file}`)).toString('base64'),512,480)}<small>${c.frame} frames into the native attack</small></div>`))).join('')}</div>`,1750);
    let animation=null;
    try{await promisify(execFile)('ffmpeg',['-y','-hide_banner','-loglevel','error','-framerate','15','-i',`${frames}/%03d.png`,'-frames:v',String(frameCount),'-vf','crop=512:448:0:16','-plays','0','-f','apng',`${out}/combat-${id}-animation.png`]);animation=`combat-${id}-animation.png`;}
    catch(e){if(e.code!=='ENOENT')throw e;console.log('ffmpeg unavailable; still frames are ready.');}
    // Confuse computes four individual rolls and a fifth aggregate result;
    // the aggregate is not a fifth visual hit.
    if(id===7){assert.equal(hits.length,5);assert.equal(hits[4].value,hits.slice(0,4).reduce((sum,e)=>sum+e.value,0));}
    combat.push({id,name,fixture,nativeDispatch:cast,animation,
      ...(id===7?{aggregateDamage:hits[4].value,nativeResultEvents:hits.length}:{}),
      hits:(id===7?hits.slice(0,4):hits).map(e=>id===6?{target:e.target,healing:65536-e.value}:{target:e.target,damage:e.value})});d.undo();d.dispose();h.dispose();
  }
  const finaleCore=await bedroom(b.rom),finaleHooks=installHooks(finaleCore,specs),finaleDev=createDevTools(finaleCore,finaleHooks),finaleMessages=[],strikes=[];
  finaleHooks.on('battle.message',e=>finaleMessages.push(e));
  finaleHooks.on('battle.enemy-tech',e=>{if(e.operand===b.audit.finaleAI.uppercut)strikes.push(e);});
  finaleDev.jump({id:479,x:7,y:10,party:[0,1,2],endgame:true});
  let shout=false,windup=false,recovery=false;
  for(let frame=0;frame<6000&&!recovery;frame++){
    finaleCore.runFrame();
    const line=finaleMessages.find(e=>e.messageId===245),tell=finaleMessages.find(e=>e.messageId===247);
    if(!shout&&line&&finaleCore.frames>=line.frame+30){await screenshot(finaleCore,`${out}/tyson-shout.png`);shout=true;}
    if(!windup&&tell&&finaleCore.frames>=tell.frame+240){assert.equal(finaleCore.ram[0x990a],24);await screenshot(finaleCore,`${out}/tyson-windup.png`);windup=true;}
    if(finaleMessages.some(e=>e.messageId===251)){await screenshot(finaleCore,`${out}/tyson-recovery.png`);recovery=true;}
  }
  assert.ok(shout&&windup&&recovery,'Tyson review captures the actual shout, windup and recovery');
  assert.equal(strikes.length,1);assert.equal(finaleDev.diagnostics().fatal,null);
  const finale={source:'assets/raster/tyson/source-user-32931.png',frames:45,shout,windup,recovery,strikes:strikes.length};
  finaleDev.undo();finaleDev.dispose();finaleHooks.dispose();
  const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
  d.jump({id:464,x:29,y:23,facing:0,resurrectionScene:'resurrection-eggs'});runFrames(s,400);
  const resurrection=await challengeSteve({read:(p,n=1)=>n===2?u16(s.ram,p):s.ram[p],bytes:(p,n)=>s.ram.slice(p,p+n),
    hold:(input,n)=>runFrames(s,n,input),wait:n=>runFrames(s,n),tap:(input=256,gap=90)=>{runFrames(s,3,input);runFrames(s,gap);},
    shot:name=>screenshot(s,`${out}/${name}.png`)});
  assert.equal(d.diagnostics().fatal,null);d.undo();d.dispose();h.dispose();
  await writeFile(`${out}/manifest.json`,JSON.stringify({sha256,sceneEvidenceSha256,townsfolkEvidenceSha256,generatedAt:new Date().toISOString(),nativeColors:true,spriteReview,endgameReview,guardReview,courtSwampReview,townsfolkReview,cosmicMuffin,title,storekeeper,guyFieri,magicMirror,combat,finale,resurrection,rasterProgress,portraits:b.audit.portraits,characters:b.audit.characters.map(a=>({id:a.id,name:a.name,frames:a.frameCount,provisionalFrames:a.provisionalFrames,rasterCoverage:a.rasterCoverage,semanticCoverage:a.semanticCoverage}))},null,2)+'\n');
  const previewCards=combat.map(c=>`<article><h2>${esc(c.name)}</h2><p>${c.fixture==='clowns'?'Violent J and Shaggy 2 Dope':'The Great Milenko'} · recorded from native combat</p><a href="${c.animation??`combat-${c.id}.png`}"><img src="${c.animation??`combat-${c.id}.png`}" alt="${esc(c.name)} playing against ${esc(c.fixture)}"></a><p><a href="combat-${c.id}.png">View still frames</a></p></article>`).join('');
  const reviewCards=`<article><h2>Cosmic Muffin</h2><p>The generated shell and moving mouth use the original background and sprite layers.</p><a href="cosmic-muffin-shell.png"><img src="cosmic-muffin-shell.png" alt="Cosmic Muffin shell in its native arrival scene"></a><p><a href="cosmic-muffin-offspring.png">Offspring battle</a> · <a href="sprites.html">Inspect mouth and offspring frames</a></p></article><article><h2>Shrek Trigger · title</h2><p>The supplied Shrek logo and ogre ears appear in the original opening’s clock dial.</p><a href="shrek-title.png"><img src="shrek-title.png" alt="Shrek Trigger title with ogre ears in the native animated clock dial"></a></article><article><h2>Storekeeper</h2><p>The generated body and moving head appear in the original reveal and three-target battle.</p><a href="storekeeper-battle.png"><img src="storekeeper-battle.png" alt="Storekeeper and two Bits in the original native boss arena"></a><p><a href="sprites.html">Inspect the moving head frames</a></p></article><article><h2>Guy Fieri · magic lessons</h2><p>Guy teaches magic in all six original level-based forms. The practice fights retain their native progression and rewards.</p><a href="guy-fieri-tier-4.png"><img src="guy-fieri-tier-4.png" alt="Guy Fieri with his flame halo in the native practice battle"></a><p><a href="guy-fieri-sprites.png">All six forms</a> · <a href="guy-fieri-tier-0.png">First practice fight</a></p></article><article><h2>Magic Mirror</h2><p>The original reveal and three-mirror battle, using the adapted model within the cartridge’s existing sprite cells.</p><a href="magic-mirror-battle.png"><img src="magic-mirror-battle.png" alt="Magic Mirror and three Echo Mirrors in the original boss arena"></a><p><a href="sprites.html">Inspect the complete assembly</a></p></article>`+
    [['party-sprites.png','Seven playable characters'],['party-motion.png','Complete four-direction walk/run cycles'],['overworld-sprites.png','Seven-color overworld heroes'],['portraits.png','Menu portraits'],['supporting-sprites.png','The onion jar and the story cast'],['carnival-and-faygo.png','Clowns, hatchets and Faygo']].map(([file,label])=>`<article class="wide"><h2>${label}</h2><a href="${file}"><img src="${file}" alt="${label}"></a></article>`).join('')+
    `<article><h2>Mike Tyson · supplied sprite sheet</h2><p>All 45 frames use your supplied artwork. This capture shows the native uppercut windup.</p><a href="tyson-windup.png"><img src="tyson-windup.png" alt="Mike Tyson winding up in the final battle"></a><p><a href="tyson-sprites.png">Sprite sheet</a> · <a href="tyson-shout.png">Shrek’s shout</a> · <a href="tyson-recovery.png">Recovery</a> · <a href="/assets/raster/tyson/source-user-32931.png">Original source</a></p></article>`+
    `<article><h2>Steve Harwell · 24 eggs</h2><p>Actual cartridge scene. His completed dare is required for the Second Chance handoff.</p><a href="steve-first-egg.png"><img src="steve-first-egg.png" alt="Steve eating an egg in the Last Inn"></a><p><a href="steve-24-eggs.png">All 24 eggs</a> · <a href="steve-second-chance.png">Quest reward</a></p></article><article><h2>Steve · generated sprite source</h2><p>The generated atlas is reduced to 12 opaque colors and native 32 × 32 frames for the cartridge.</p><a href="/assets/imagegen/steve/source-v1.png"><img src="/assets/imagegen/steve/native-indexed.png" alt="Steve native sprite poses from image generation"></a><p><a href="/assets/imagegen/steve/source-v1.png">Generated source</a> · <a href="/assets/imagegen/steve/prompt-01.txt">Exact prompt</a></p></article>`;
  await writeFile(`${out}/index.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shrek Trigger · art review</title><style>${style}body{max-width:1440px;margin:auto}footer{overflow-wrap:anywhere}a{color:#cce792}nav{display:flex;flex-wrap:wrap;gap:24px;margin:24px 0}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}article{padding:20px;background:#1c292c;border:1px solid #38413c;border-radius:8px}h2{font-size:21px;margin:0 0 12px}article img{width:100%;height:auto}article p{margin:12px 0}.wide{grid-column:1/-1}@media(max-width:700px){body{padding:16px}main{grid-template-columns:1fr}}</style><h1>Shrek Trigger · work in progress</h1><p>Actual cartridge sprites and native combat captures. Click a sheet to inspect it at full size. The replacement pass is in progress: ${rasterProgress.reduce((n,a)=>n+a.raster,0)} player frames use raster source art, and ${rasterProgress.reduce((n,a)=>n+a.pending,0)} still use earlier artwork. Shrek uses your selected V.Smile artwork; ${rasterProgress.reduce((n,a)=>n+a.actingSubstitutions,0)} of his rarer acting frames still use temporary substitutions, identified in the frame inspector.</p><nav><a href="/">Open the game</a><a href="sprites.html">Inspect all ${spriteReview.frames.toLocaleString()} frames</a><a href="manifest.json">Capture details</a></nav><p>To try a battle: press <b>F1 → Quick start in the swamp → Combat sandbox</b>, select an encounter and <b>Level 60 test party</b>, then Start. For Life, choose <b>Revival test · Fiona down</b> and select Life in Shrek’s Tech menu. Z confirms, X cancels, and arrows move. Retry restores the same starting state and RNG; Return restores your game.</p><main>${previewCards}${[...townsfolkReview,...courtSwampReview,...endgameReview,...guardReview].map(c=>`<article><h2>${esc(c.title)}</h2><p>${esc(c.caption)}</p><a href="${c.file}"><img src="${c.file}" alt="${esc(c.title)} in the native scene"></a></article>`).join('')}${reviewCards}</main><footer>Captured build ${sha256} · SNES indexed art and 15-bit colors · Development preview</footer></html>`);
  console.log(JSON.stringify({directory:out,sha256,combat}));
}finally{await browser.close();}
