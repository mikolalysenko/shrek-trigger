import assert from 'node:assert/strict';
import {eggChallenge} from '../content/resurrection.js';
import {supportingCast} from '../content/supporting-cast.js';
import {snesColor} from '../engine/sprites.js';

// Shared controller-only route. No game state, flags or inventory writes.
export async function challengeSteve(io,{refuseFirst=true}={}){
  const messages=new Set(),poses={bite:0,chew:0};let previous=-1;
  async function verifyPalette(){
    const colors=supportingCast.find(a=>a.key==='steve').colors;
    const bytes=colors.flatMap(hex=>{const c=snesColor(hex);return[c&255,c>>8];});
    assert.equal(await io.read(0xf81+eggChallenge.object*2),14,'Steve uses OBJ palette7');
    assert.deepEqual(Array.from(await io.bytes(0x21e2,24)),bytes,'native Steve palette keeps the generated shirt and face colors');
  }
  async function observe(){
    if(await io.read(0x126))messages.add(await io.read(0x12a));
    const pose=await io.read(0x1301+eggChallenge.object*2);
    if(pose!==previous){if(pose===8)poses.bite++;if(pose===9)poses.chew++;previous=pose;}
  }
  async function quantity(){const r=await io.bytes(0x2400,512);let n=0;for(let i=0;i<256;i++)if(r[i]===217)n+=r[i+256];return n;}
  async function close(){
    for(let n=0;n<100&&(await io.read(0x126)||!await io.read(0x11f));n++){await observe();await io.tap(256,90);}
    assert.equal(await io.read(0x126),0);assert.equal(await io.read(0x11f),1);
  }
  async function open(){
    await close();await io.hold(16,40);await io.wait(6);await io.tap(256,90);
    for(let n=0;n<20&&!(await io.read(0x12a)===240&&await io.read(0x162)===2);n++)await io.tap(256,60);
    assert.equal(await io.read(0x12a),240,'Steve offers the native egg challenge');
    assert.equal(await io.read(0x162),2);assert.ok([2,3].includes(await io.read(0x163)));
    messages.add(240);
  }
  assert.equal(await io.read(0x100,2),464);assert.equal(await quantity(),0);
  const initialFlags=await io.read(0x100d8),story=await io.read(0x10000);
  await open();await io.shot('steve-egg-choice');
  if(refuseFirst){
    if(await io.read(0x163)!==3)await io.tap(32,12);
    await io.tap(256,90);assert.equal(await io.read(0x12a),241);messages.add(241);
    await close();assert.equal(await quantity(),0);assert.equal(await io.read(0x100d8),initialFlags);
    assert.deepEqual(poses,{bite:0,chew:0});await io.shot('steve-eggs-declined');await open();
  }
  if(await io.read(0x163)!==2)await io.tap(16,12);
  await io.tap(256,30);let sinceTap=0,shotBite=false,shotChew=false,shotComplete=false;
  for(let n=0;n<6000;n++){
    await observe();
    if(!shotBite&&poses.bite){await io.wait(6);await verifyPalette();await io.shot('steve-first-egg');shotBite=true;}
    if(!shotChew&&poses.chew){await io.wait(6);await verifyPalette();await io.shot('steve-chewing');shotChew=true;}
    if(!shotComplete&&await io.read(0x12a)===246&&sinceTap>=75){await io.shot('steve-24-eggs');shotComplete=true;}
    if((await io.read(0x100d8)&2)&&!await io.read(0x126)&&await io.read(0x11f))break;
    if(await io.read(0x126)&&sinceTap>=90){await io.tap(256,0);sinceTap=0;}
    else{await io.wait(3);sinceTap+=3;}
  }
  await observe();assert.deepEqual(poses,{bite:24,chew:24},'exactly 24 native bite/chew pairs');
  assert.equal(await quantity(),1,'Second Chance awarded exactly once');
  assert.equal(await io.read(0x100d8)&3,3);assert.equal(await io.read(0x10000),story);
  assert.equal(await io.read(0x126),0);assert.equal(await io.read(0x11f),1);
  for(const id of[242,243,244,245,246,190,195,201,0])assert.ok(messages.has(id),'native message '+id);
  await io.shot('steve-second-chance');
  const before={...poses};await io.hold(16,40);await io.tap(256,120);await observe();
  assert.equal(await io.read(0x12a),195,'repeat visit gives rescue guidance');await close();
  assert.equal(await quantity(),1);assert.deepEqual(poses,before);
  return{refused:refuseFirst,eggs:poses.bite,chews:poses.chew,item:217,quantity:1,repeatedWithoutReward:true,messages:[...messages]};
}
