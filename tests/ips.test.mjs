// IPS for the expanded cartridge (engine/ips.js): exact round trip and the
// reserved "EOF" offset.
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeIps,applyIps} from '../engine/ips.js';
import {build} from './helpers.mjs';

const starts=ips=>{const out=[];let p=5;for(;;){const o=ips[p]<<16|ips[p+1]<<8|ips[p+2];p+=3;if(o===0x454f46)return out;out.push(o);const s=ips[p]<<8|ips[p+1];p+=2;p+=s?s:3;}};

test('the IPS patch rebuilds the expanded cartridge exactly',async()=>{
 const b=await build(),ips=makeIps(b.base,b.rom);
 assert.deepEqual(applyIps(b.base,ips),b.rom);
 assert.ok(!starts(ips).includes(0x454f46));
});
test('no record starts at the EOF offset, after literal, RLE or split records',()=>{
 const base=new Uint8Array(0x470000);
 const cases=[
  t=>{t[0x454f46]=1;t[0x454f47]=2;},
  t=>t.fill(7,0x454f30,0x454f46).fill(9,0x454f46,0x454f50),          // RLE ends at EOF, literal follows
  t=>t.fill(7,0x454f40,0x454f60),                                     // RLE spans EOF
  t=>{for(let i=0x454f46-0xffff;i<0x454f50;i++)t[i]=(i*7+1)&255||1;}, // literal split lands on EOF
 ];
 for(const c of cases){const t=base.slice();c(t);const ips=makeIps(base,t);assert.deepEqual(applyIps(base,ips),t);assert.ok(!starts(ips).includes(0x454f46));}
});
