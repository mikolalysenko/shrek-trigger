import {combatFixtures} from '../content/combat-sandbox.js';
import {u16,u24} from './rom.js';
import {decompress} from './compression.js';
import {cartridgeOffset} from './expanded-rom.js';
import {npcGraphicsStreamTable} from './npc-graphics-streaming.js';

export function combatFixture(key){const f=combatFixtures.find(f=>f.key===key);if(!f)throw Error('Unknown combat fixture');return f;}

// An ordinary location event, small enough to sit below the built-in party
// scripts at 7F:3700. The debug loader supplies this event in WRAM only. All
// object loads, formation setup, battle execution and rewards are native.
export function makeCombatEvent(enemies,{song,slots}={}){
  if(!Array.isArray(enemies)||enemies.length<1||enemies.length>3||enemies.some(n=>!Number.isInteger(n)||n<0||n>255))throw Error('Arena needs one to three native enemies');
  if(song!==undefined&&(!Number.isInteger(song)||song<0||song>=83))throw Error('Unknown native arena music');
  // Native enemy slots 3-10. Paired enemy techniques address their partner by
  // slot, so a fixture can name the slots its original encounter uses.
  slots??=enemies.map((_,i)=>i+3);
  if(slots.length!==enemies.length||new Set(slots).size!==slots.length||slots.some(n=>!Number.isInteger(n)||n<3||n>10))throw Error('Arena enemy slots must be distinct native slots 3 to 10');
  const count=8+enemies.length,out=new Array(1+count*32).fill(0);out[0]=count;
  const object=(id,init,main)=>{
    const start=out.length-1;out.push(...init,0,...main);const end=out.length-1;out.push(0);
    for(let f=0;f<16;f++){const p=f===0?start:end;out[1+id*32+f*2]=p&255;out[2+id*32+f*2]=p>>8;}
  };
  // Native no-game-over, fixed enemy positions, bottom menu, no running.
  // In particular the attract-mode RNG override (bit 20) is NOT enabled.
  object(0,[],[0xad,0x20,...(song===undefined?[]:[0xea,song]),0xd9,8,11,6,12,10,12,0xd8,0x92,song===undefined?0x20:0x60,0xda,0xb2]);
  for(let id=0;id<7;id++)object(id+1,[0x80,id],[0xb0]);
  const positions=enemies.length===1?[[8,8]]:[[7,7],[10,7],[8,9]];
  enemies.forEach((id,i)=>object(8+i,[0x83,id,0x80|slots[i],0x8b,...positions[i],0x87,1],[0xb2]));
  if(out.length>=0x1700)throw Error('Arena event overlaps native party scripts');
  return Uint8Array.from(out);
}

export function combatResourceBudget(rom,enemies,party){
  const banks=new Set(),streamedBanks=[],table=npcGraphicsStreamTable(rom);let bytes=0;
  // PC frames stream from uncompressed cartridge banks, outside this heap.
  for(const id of enemies)banks.add(rom[0x24f600+id*10]);
  for(const id of banks){
    const decoded=decompress(rom,cartridgeOffset(u24(rom,0x242000+id*3),rom)).bytes;
    const stream=table===null?0:u24(rom,table+id*3);
    if(stream){
      if(stream<0x400000||stream>=0x7e0000||(stream&65535)+decoded.length>0x8000||
        !decoded.every((v,i)=>rom[cartridgeOffset(stream,rom)+i]===v))throw Error('Arena sprite stream does not match its cartridge resource');
      streamedBanks.push(id);
    }else bytes+=decoded.length;
  }
  if(bytes>0x8000)throw Error('This party and formation exceed the native 32 KiB sprite heap');
  return{spriteBytes:bytes,spriteLimit:0x8000,graphicsBanks:[...banks],streamedBanks,partySlots:party.filter(id=>id<7).length};
}

export function combatState(snes,initialized=true){
  const r=snes.ram,inBattle=initialized&&!!(r[0x117]&1);
  return{inBattle,readyActor:r[0x95d5],command:r[0x95db],target:r[0xa62d],rng:r[0x26],actors:!inBattle?[]:Array.from({length:11},(_,slot)=>{
    const p=0x5e2d+slot*128;
    return{slot,id:slot<3?r[0x2980+slot]:r[0xaf02+slot-3],hp:u16(r,p+3),maxHp:u16(r,p+5),mp:u16(r,p+7),maxMp:u16(r,p+9),status:[...r.slice(p+0x1d,p+0x22)],poison:!!(r[p+0x1e]&0x40)};
  }).filter(a=>a.id!==255&&a.id!==128)};
}
