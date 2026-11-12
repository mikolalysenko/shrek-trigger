import assert from 'node:assert/strict';
import {newGameSequence} from '../engine/automation.js';

// Real directional input discovered against the unmodified native maps. B is
// held for ordinary running. No event, coordinate, flag or savestate is used.
const bedroomStairs=[64,80,80,160,80,80,16,32,64,128,64,80,64,128,128,128,144,16,64,32,16,32,80,32,16,160,16,144,144,128,80,32,160,144,144,80,144,32,32,64,32,64,32,32,144,128,96];
const kitchenExit=[32,96,32,80,80,80,32,128,80,32,96,96,160,144];

export async function reachOpeningOverworld(io){
 for(const[frames,buttons]of newGameSequence)await io.hold(buttons,frames);
 assert.equal(await io.read(0x100,2),2);assert.equal(await io.read(0x11f),1);assert.equal(await io.read(0x126),0);
 for(const input of bedroomStairs)await io.hold(input|1,30);
 await io.wait(500);assert.equal(await io.read(0x100,2),1);
 for(const input of kitchenExit){
  await io.hold(input|1,30);
  if(await io.read(0x126))await io.tap(256,60);
  else if(!await io.read(0x11f))await io.tap(8,120); // Donkey's native naming screen.
 }
 await io.wait(500);assert.equal(await io.read(0x100,2),496);assert.equal(await io.read(0x11f),1);
 await io.shot('opening-overworld');
}

export async function openNativeSave(io){
 await io.tap(512,180);for(let i=0;i<5;i++)await io.tap(128,60);
}

export async function saveNativeSlot(io,slot){
 assert.ok(slot>=0&&slot<3);await openNativeSave(io);
 await io.tap(256,120);for(let i=0;i<slot;i++)await io.tap(32,60);
 await io.tap(256,240);await io.shot(`saved-slot-${slot+1}`);
}

export async function loadNativeSlot(io,slot,{powerCycle=false}={}){
 assert.ok(slot>=0&&slot<3);
 // The caller performs the actual reset/reload request before this input.
 await io.wait(400);await io.tap(8,1000);await io.shot(`title-slot-${slot+1}${powerCycle?'-power-cycle':'-reset'}`);await io.tap(16,90);await io.tap(16,90);for(let i=0;i<slot;i++)await io.tap(32,90);
 await io.tap(256,1500);await io.shot(`load-result-slot-${slot+1}${powerCycle?'-power-cycle':'-reset'}`);assert.equal(await io.read(0x100,2),496);assert.equal(await io.read(0x11f),1);
 await io.shot(`loaded-slot-${slot+1}${powerCycle?'-power-cycle':'-reset'}`);
}
