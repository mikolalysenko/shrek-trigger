import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {build,bedroom} from './helpers.mjs';
import {combatFixtures} from '../content/combat-sandbox.js';
import {endgameCheckpoints} from '../engine/endgame-checkpoints.js';
import {guardCheckpoints} from '../engine/guard-checkpoints.js';
import {courtSwampCheckpoints} from '../engine/court-swamp-checkpoints.js';
import {townsfolkCheckpoints} from '../engine/townsfolk-checkpoints.js';
import {townsfolk} from '../content/townsfolk.js';

// Runs its own loopback server so the user's active game is never restarted.
const port=Number(process.env.SHREK_TEST_PORT||5179),url=`http://127.0.0.1:${port}`;
const built=await build();await bedroom(built.rom);await mkdir('.local/qa',{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,SHREK_PORT:String(port)},stdio:'pipe'});
const browser=await chromium.launch({headless:true});
try {
  for(let i=0;i<50;i++){try{if((await fetch(url)).ok)break;}catch{}await delay(100);}
  const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/dev.html');await page.evaluate(()=>window.shrek.ready);
  await page.waitForFunction(()=>window.shrek.audit?.native===true);
  assert.equal(await page.locator('#roster button').count(),7);
  assert.equal(await page.evaluate(()=>window.shrek.audit.native),true);
  await page.screenshot({path:'.local/qa/browser-home.png',fullPage:true});
  await page.locator('#lab-toggle').click();
  await page.locator('#quick-start').click();await page.waitForFunction(()=>window.shrek.snes?.ram[0x100]===2);
  await page.evaluate(()=>window.shrek.pause(true));
  await page.evaluate(async()=>{await window.shrek.save();window.shrek.advance(10);await window.shrek.load();});
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),2);
  assert.deepEqual(await page.locator('#combat-fixture option').evaluateAll(options=>options.map(o=>o.value)),combatFixtures.map(f=>f.key));
  await page.locator('#tech').selectOption('1');assert.ok((await page.locator('#tech-info').textContent()).includes('25% poison'));
  assert.ok((await page.locator('#tech option:checked').textContent()).includes('Fart'));
  await page.locator('#tech').selectOption('2');assert.ok((await page.locator('#tech-info').textContent()).includes('Native cartridge effects implemented'));
  await page.locator('#tech').selectOption('8');assert.ok((await page.locator('#tech-info').textContent()).includes('Native cartridge effects implemented'));
  await page.locator('#tech').selectOption('5');assert.ok((await page.locator('#tech-info').textContent()).includes('Native cartridge effects implemented'));
  await page.locator('#tech').selectOption('6');assert.ok((await page.locator('#tech-info').textContent()).includes('Native cartridge effects implemented'));
  await page.locator('#tech').selectOption('7');assert.ok((await page.locator('#tech-info').textContent()).includes('Native cartridge effects implemented'));assert.ok((await page.locator('#tech-info').textContent()).includes('12 MP'));
  await page.locator('#tech').selectOption('1');
  await page.locator('#combat-fixture').selectOption('clowns');await page.locator('#combat-loadout').selectOption('test');await page.locator('#combat-start').click();
  await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(480);});
  assert.deepEqual(await page.evaluate(()=>window.shrek.dev.diagnostics().combat.actors.filter(a=>a.slot>=3).map(a=>a.id)),[151,152]);
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x29ae]),81);
  await page.locator('#combat-retry').click();await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(480);});
  assert.equal(await page.evaluate(()=>window.shrek.dev.diagnostics().combat.attempt),2);
  await page.locator('#combat-fixture').selectOption('milenko');await page.locator('#combat-start').click();
  await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(480);});
  assert.deepEqual(await page.evaluate(()=>window.shrek.dev.diagnostics().combat.actors.filter(a=>a.slot>=3).map(a=>a.id)),[153]);
  await page.screenshot({path:'.local/qa/browser-combat-sandbox.png',fullPage:true});
  await page.locator('#combat-return').click();assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),2);
  assert.equal(await page.evaluate(()=>window.shrek.dev.diagnostics().combat),null);
  await page.locator('#combat-loadout').selectOption('revival');await page.locator('#combat-start').click();
  await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(480);});
  assert.equal(await page.evaluate(()=>window.shrek.dev.diagnostics().combat.actors.find(a=>a.id===1&&a.slot<3).hp),0);
  await page.locator('#combat-retry').click();await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(480);});
  assert.equal(await page.evaluate(()=>window.shrek.dev.diagnostics().combat.actors.find(a=>a.id===1&&a.slot<3).hp),0);
  await page.screenshot({path:'.local/qa/browser-revival-sandbox.png',fullPage:true});
  await page.locator('#combat-return').click();assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),2);
  await page.locator('#combat-loadout').selectOption('test');
  for(const fixture of combatFixtures.slice(4)){
    await page.locator('#combat-fixture').selectOption(fixture.key);await page.locator('#combat-start').click();
    await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(480);});
    assert.deepEqual(await page.evaluate(()=>window.shrek.dev.diagnostics().combat.actors.filter(a=>a.slot>=3).map(a=>a.id)),fixture.enemies);
    assert.equal(await page.evaluate(()=>window.shrek.dev.diagnostics().fatal),null);
    await page.locator('#combat-return').click();assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),2);
  }
  await page.locator('#party-enable').check();await page.locator('#party-0').selectOption('6');
  await page.locator('#party-1').selectOption('3');await page.locator('#party-2').selectOption('4');
  await page.locator('#area').selectOption({label:'Sparring dummy · battle test'});await page.locator('#jump').click();
  await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(480);});
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),6);
  assert.deepEqual(await page.evaluate(()=>Array.from(window.shrek.snes.ram.slice(0x2980,0x2983))),[6,3,4]);
  await page.locator('#test-kit').click();await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(2);});
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x2830]),8);
  await page.locator('#step').click();
  await page.evaluate(()=>window.shrek.load());
  await page.locator('#party-enable').uncheck();
  await page.locator('#area').selectOption({label:'Dragon · escape after harness break'});
  await page.locator('#jump').click();
  await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(280);});
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]|window.shrek.snes.ram[0x101]<<8),474);
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100ce]),5);
  await page.screenshot({path:'.local/qa/browser-dragon-escape.png',fullPage:true});
  await page.locator('#undo-jump').click();
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),2);
  await page.locator('#native-actor').selectOption('fiona-human');
  await page.locator('#native-frame').selectOption('1');await page.locator('#native-preview').click();
  await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(280);});
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),1);
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x131f]),1);
  await page.locator('#native-frame').selectOption('17');
  await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(8);});
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x131f]),17);
  await page.locator('#undo-jump').click();
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),2);
  assert.equal(await page.evaluate(()=>window.shrek.dev.diagnostics().preview),null);
  const originalWeapon=await page.evaluate(()=>window.shrek.snes.ram[0x2769]);
  for(const [actor,frame]of[['great-milenko','19'],['carnival-hatchet','6'],['party-shrek','85'],['party-puss','51']]){
    await page.locator('#native-actor').selectOption(actor);await page.locator('#native-frame').selectOption(frame);await page.locator('#native-preview').click();
    await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(280);});
    assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x131f]),Number(frame));
    if(actor==='party-shrek'){
      await page.locator('#native-frame').selectOption('115');await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(8);});
      assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0xf1f]),115);
      await page.screenshot({path:'.local/qa/browser-shrek-cast-preview.png',fullPage:true});
    }
    if(actor==='party-puss'){
      const tiles=()=>page.evaluate(()=>Array.from(new Uint8Array(window.shrek.snes.ppu.vram.buffer).slice(0x3000,0x3100)));
      const rapier=await tiles();await page.locator('#native-weapon').selectOption('61');
      await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(8);});
      assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0xf1f]),51);assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x2769]),61);
      const hatchet=await tiles();assert.notDeepEqual(hatchet,rapier);
      await page.locator('#native-weapon').selectOption('66');await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(8);});
      assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x2769]),66);assert.deepEqual(await tiles(),hatchet);
      await page.screenshot({path:'.local/qa/browser-puss-hatchet-preview.png',fullPage:true});
    }
  }
  await page.locator('#undo-jump').click();assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),2);
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x2769]),originalWeapon);
  const oldStory=await page.evaluate(()=>window.shrek.snes.ram[0x10000]);
  await page.locator('#area').selectOption({label:'Guy Fieri · practice at level 99'});await page.locator('#jump').click();
  await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(400);});
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x2612]),99);
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x1414]|window.shrek.snes.ram[0x1415]<<8),0x1770);
  await page.locator('#undo-jump').click();
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),2);
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x10000]),oldStory);
  for(const label of['Resurrection · Steve remembers Shrek','Resurrection · Steve and the 24 eggs']){
    await page.locator('#area').selectOption({label});assert.ok(await page.locator('#party-enable').isDisabled());
    await page.locator('#jump').click();await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(400);});
    assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]|window.shrek.snes.ram[0x101]<<8),464);
    assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x10000]),203);
    assert.deepEqual(await page.evaluate(()=>Array.from(window.shrek.snes.ram.slice(0x2980,0x2983))),[1,2,3]);
    await page.locator('#undo-jump').click();assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),2);
    assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x10000]),oldStory);
  }
  await page.locator('#native-actor').selectOption('steve');await page.locator('#native-frame').selectOption('8');
  await page.locator('#native-preview').click();await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(280);});
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x131f]),8);
  await page.screenshot({path:'.local/qa/browser-steve-egg-preview.png',fullPage:true});
  await page.locator('#undo-jump').click();assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),2);
  await page.locator('#area').selectOption({label:'Carnival · clown challenge and fusion'});await page.locator('#jump').click();
  await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(400);});
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),151);assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x10000]),95);
  await page.locator('#undo-jump').click();assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x10000]),oldStory);
  await page.locator('#party-enable').check();
  for(const [label,map,story,party]of[
    ['Fiona disappears',122,15,[0,128,128]],['recruit Puss',129,18,[0,2,128]],
    ['impostor battle',198,26,[0,2,4]],['Fiona returns',122,28,[0,2,128]]
  ]){
    await page.locator('#area').selectOption({label:'Medieval rescue · '+label});assert.ok(await page.locator('#party-enable').isDisabled());
    await page.locator('#jump').click();await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(400);});
    assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]|window.shrek.snes.ram[0x101]<<8),map);
    assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x10000]),story);
    assert.deepEqual(await page.evaluate(()=>Array.from(window.shrek.snes.ram.subarray(0x2980,0x2983))),party);
    await page.locator('#undo-jump').click();assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x10000]),oldStory);
  }
  await page.locator('#native-actor').selectOption('masquerader');await page.locator('#native-frame').selectOption('16');await page.locator('#native-preview').click();
  await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(400);});
  assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0xf1f]),16);
  await page.screenshot({path:'.local/qa/browser-masquerader.png',fullPage:true});await page.locator('#undo-jump').click();
  for(const[label,map,story,party]of[
    ['Trial · helpful festival choices',27,44,[0,128,128]],['Trial · selfish festival choices',27,44,[0,128,128]],
    ['Prison · cell and countdown',71,45,[0,128,128]],['Prison · Donkey meets the escapee',29,45,[0,128,128]],
    ['Prison · Duloc Tank',28,46,[0,2,128]],['Escape · Fiona confronts Harold',21,46,[0,2,128]],
    ['Escape · forest gate',20,48,[0,2,1]]
  ]){
    await page.locator('#area').selectOption({label});assert.ok(await page.locator('#party-enable').isDisabled());
    await page.locator('#jump').click();await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(400);});
    assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]|window.shrek.snes.ram[0x101]<<8),map);
    assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x10000]),story);
    assert.deepEqual(await page.evaluate(()=>Array.from(window.shrek.snes.ram.subarray(0x2980,0x2983))),party);
    await page.locator('#undo-jump').click();assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x10000]),oldStory);
  }
  for(const[label,map,story,party]of[
    ['Future · arrival at the closed attraction',208,51,[0,1,2]],['Future · food store and seeds',344,53,[0,1,2]],
    ['Future · scavenger rats in Lab 16',212,52,[0,1,2]],
    ['Future · supply keeper',219,53,[0,1,2]],
    ['Future · rat chase and password',221,53,[0,1,2]],['Future · left passage switch',216,53,[0,1,2]],
    ['Future · right passage switch',216,53,[0,1,2]],
    ['Future · apocalypse archive',218,53,[0,1,2]],['Future · bring hope to the shelter',214,54,[0,1,2]],
    ['Rivet · meet the racecourse champion',223,55,[0,1,2]],['Rivet · race with Turbo Boost',223,55,[0,1,2]],
    ['Rivet · no-boost race and recorder',223,55,[0,1,2]],
    ['Future · ruined road and race recorder',224,55,[0,1,2]],
    ['Pinocchio · first repair and recruitment',226,55,[0,1,2]],['Pinocchio · workshop brothers with Donkey',230,63,[0,128,2]],
    ['Pinocchio · workshop brothers with Fiona',230,63,[0,128,1]],['Pinocchio · second repair and his choice',226,66,[0,1,2]],
    ['Future · sewer sound traps',237,52,[0,1,2]],
    ['Future · sewer entrance and frog guards',236,52,[0,1,2]],
    ['Factory · conveyor beetles',232,60,[0,3,2]],['Factory · Pinocchio opens security',228,60,[0,3,2]],['Factory · crane controls',231,60,[0,3,2]],
    ['Factory · lab defenses and ambush',230,60,[0,3,2]],
    ['Factory · four-button door lock',235,60,[0,3,2]],['Factory · generator and escape',235,60,[0,3,2]],
    ['Medina · cupboard arrival and welcome',36,77,[0,1,2]],['Medina · hostile inn',35,78,[0,1,2]],
    ['Medina · hostile market',39,78,[0,1,2]],['Medina · peaceful inn',35,203,[0,1,2]],
    ['Medina · peaceful market',39,203,[0,1,2]],['Cave · keeper battle and river shortcut',47,78,[0,1,2]],['Pyramid · charged seal and one gift',42,171,[0,1,2]],
    ['Bridge · captain requests rations',135,84,[0,1,2]],['Bridge · chef prepares Onion Bread',123,84,[0,1,2]],['Bridge · Onion Bread delivery',135,86,[0,1,2]],['Bridge · Horner and Bone Warden',135,87,[0,1,2]],
    ['Village · headman commissions Rowan',137,90,[0,1,2]],['Village · inn and lodging',138,90,[0,1,2]],['Village · secret portrait trade',136,90,[0,1,2]],['Village · Rowan information',138,90,[0,1,2]],
    ['Fortress · Briar Knight and guards',169,118,[0,4,1]],['Fortress · Moth Witch and decoy',173,118,[0,4,1]],['Hideout · Moth Witch rematch',183,203,[0,4,1]],['Hideout · Briar Knight rematch',184,203,[0,4,1]],['Fortress · Farquaad ritual',172,118,[0,4,1]],
    ['Hideout · complete Horner quest',177,203,[0,4,1]],['Hideout · blade trap and hidden armory',179,203,[0,4,1]],['Hideout · Horner floor-switch battle',181,203,[0,4,1]],['Hideout · cat defeats Horner',181,203,[0,4,1]],
    ['Bakery · mountain arrival and first chapter',273,108,[0,1,2]],['Bakery · feast and bread contest',280,111,[0,1,2]],
    ['Bakery · sky drakes and the second chapter',295,142,[0,4,1]],
    ['Bakery · wake and recruit Mongo',275,117,[0,1,2]],['Bakery · Gingy in the forest',282,120,[0,5,1]],
    ['Bakery · Glaze and the stolen Gate Key',289,123,[0,5,1]],['Bakery · Iron Kilnback',304,150,[0,5,1]],['Bakery · Furnace Maw and the catastrophe',301,151,[0,5,1]],['Buried lair · furnace beast',197,203,[0,5,1]]
  ]){
    await page.locator('#area').selectOption({label});assert.ok(await page.locator('#party-enable').isDisabled());
    await page.locator('#jump').click();await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(400);});
    assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]|window.shrek.snes.ram[0x101]<<8),map);
    assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x10000]),story);
    assert.deepEqual(await page.evaluate(()=>Array.from(window.shrek.snes.ram.subarray(0x2980,0x2983))),party);
    await page.locator('#undo-jump').click();assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x10000]),oldStory);
  }
  for(const key of['duloc-tank','tank-head','tank-wheel','duloc-civic-guard','spectral-sentry','workshop-puppet','sweep-mite','brass-usher','watch-bell','supply-keeper','rivet','scrap-rat','gremlin','lost-wisp','sour-slime','lye-slime','rootling','hungry-briar','briar-rider','mire-golem','iron-golem','cracked-pot','clay-pot','spore-pot','thorn-spore','ember-pot','spell-pot','moss-urn','scrap-beetle','briar-beetle','thorn-pod','sewer-pod','drain-imp','river-imp','lantern-bat','bog-bat','ember-bat','frost-bat','sir-sludge','bog-baron','pond-page','bog-squire','mire-squire','frog-guard','rain-squire','jack-horner','horner-fort','big-jack','crag-keeper','crag-echo','swamp-dozer','old-dozer',"bone-warden-legs","warden-echo-legs","bone-warden","warden-echo","faded-guard","moss-guard","bone-guard","ember-guard","briar-unarmed","briar-knight","briar-trio","briar-master","moth-witch","moth-trio","moth-master","master-glaze","kilnback","iron-kiln","crumb-hunter","kiln-hunter","furnace-maw","buried-kiln","bakery-porter","north-bakery-porter","bakery-baker","north-bakery-baker","bakery-child","north-bakery-child","bakery-elder","bakery-drummer","bakery-log-drummer","onion-bread-plate","sky-drake"]){
    await page.locator('#native-actor').selectOption(key);assert.ok(!(await page.locator('#native-frame').textContent()).includes('undefined'));
    await page.locator('#native-preview').click();await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(400);});
    assert.equal(await page.evaluate(()=>window.shrek.dev.diagnostics().fatal),null);await page.locator('#undo-jump').click();
  }
  for(const cfg of [...Object.values(endgameCheckpoints),...Object.values(guardCheckpoints).map(a=>({...a,party:[0,1,2]})),...Object.values(courtSwampCheckpoints).map(a=>({...a,party:[0,1,2]})),...Object.values(townsfolkCheckpoints).map(a=>({...a,party:[0,1,2]}))]){
    await page.locator('#area').selectOption({label:cfg.name});assert.ok(await page.locator('#party-enable').isDisabled());
    await page.locator('#jump').click();await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(400);});
    assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]|window.shrek.snes.ram[0x101]<<8),cfg.location);
    assert.deepEqual(await page.evaluate(()=>Array.from(window.shrek.snes.ram.slice(0x2980,0x2983))),cfg.party);
    assert.equal(await page.evaluate(()=>window.shrek.dev.diagnostics().fatal),null);
    await page.locator('#undo-jump').click();assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x100]),2);
    assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0x10000]),oldStory);
  }
  for(const[key,frame]of[...townsfolk.map(a=>[a.key,a.frames-1]),['great-milenko',19],['supply-keeper',2],['bone-warden-legs',9],['warden-echo-legs',6],['kilnback',13],['furnace-maw',1],['rumpel',27],['rumpel-king',27],['wish-golem',7],['wish-golem-boss',7],['godmother-giant',1],['godmother-left-hand',19],['godmother-right-hand',19],['cosmic-oven-left',11],['cosmic-oven-right',11],['tyson-reveal',7]]){
    await page.locator('#native-actor').selectOption(key);await page.locator('#native-preview').click();
    await page.evaluate(()=>{window.shrek.pause(true);window.shrek.advance(400);});await page.locator('#native-frame').selectOption(String(frame));
    await page.evaluate(()=>window.shrek.advance(48));assert.equal(await page.evaluate(()=>window.shrek.snes.ram[0xf1f]),frame);
    await page.locator('#undo-jump').click();
  }
  await page.screenshot({path:'.local/qa/browser-workshop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.local/qa/browser-mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile layout must not overflow');
  assert.deepEqual(errors,[]);
  for(const path of ['/.local/chrono-trigger-usa.sfc','/node_modules/@playwright/test/package.json'])assert.equal((await fetch(url+path)).status,403);
  assert.equal((await fetch(url+'/api/base-rom',{headers:{Origin:'https://example.com'}})).status,403);
  console.log('Browser checks passed: boot, quick start, party jump, checkpoint, test kit, Dragon escape, native actor and weapon previews, Guy Fieri, Carnival, medieval, trial, future, Medina, pyramid, bridge, village, fortress and Bakery presets, Duloc Tank, workshop puppets, future machines, Horner, cave guardian, swamp creatures, bridge guards, both enforcers, Bakery enemies, villagers, feast props and large-frame streaming, frame step, mobile layout and local file isolation.');
}finally{await browser.close();server.kill('SIGTERM');}
