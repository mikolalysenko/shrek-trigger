import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';
import{compileMeteor}from'./compile-meteor.mjs';import{sha}from'./sample-world.mjs';import{put16,put24,u24,fileOffset,applyRecords}from'../../../engine/rom.js';import{decompress}from'../../../engine/compression.js';
const root=path.resolve(import.meta.dirname,'../../..');
export function privateMeteorOverlay(){
 const c=compileMeteor(),baselinePath='.local/qa/party-art-2e2a574e5b11/shrek-trigger.sfc',baseline=new Uint8Array(fs.readFileSync(path.join(root,baselinePath)));assert.equal(sha(baseline),'2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066');assert.equal(fileOffset(u24(baseline,c.audit.pointerOffset)),c.audit.originalOffset);assert.deepEqual(decompress(baseline,c.audit.originalOffset).bytes,decompress(fs.readFileSync(path.join(root,'.local/chrono-trigger-usa.sfc')),c.audit.originalOffset).bytes);
 const offset=0x7d2000,pointer=new Uint8Array(3);put24(pointer,0,offset);assert.deepEqual(baseline.slice(offset,offset+c.compressed.length),baseline.slice(offset-0x400000,offset-0x400000+c.compressed.length));
 const rom=applyRecords(baseline,[{offset,bytes:c.compressed},{offset:c.audit.pointerOffset,bytes:pointer}]);for(const p of[0xffdc,0x40ffdc]){put16(rom,p,65535);put16(rom,p+2,0);}const sum=rom.reduce((n,v)=>(n+v)&65535,0);for(const p of[0xffdc,0x40ffdc]){put16(rom,p,sum^65535);put16(rom,p+2,sum);}
 const allowed=i=>i>=offset&&i<offset+c.compressed.length||i>=c.audit.pointerOffset&&i<c.audit.pointerOffset+3||i>=0xffdc&&i<0xffe0||i>=0x40ffdc&&i<0x40ffe0;for(let i=0;i<rom.length;i++)if(!allowed(i))assert.equal(rom[i],baseline[i],'Unrelated ROM byte '+i.toString(16));
 return{...c,rom,baseline,report:{...c.audit,baselinePath,baselineSha256:sha(baseline),privateRomSha256:sha(rom),privatePlacement:{offset,bytes:c.compressed.length,originalUpperMirrorProved:true},onlyResource0DGraphicsPointerPacketAndChecksumsChanged:true}};
}
