import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {u16,put16,put24,applyRecords} from '../../../engine/rom.js';
import {snesColor} from '../../../engine/sprites.js';
import {compileFurnaceDraft} from './compile-draft.mjs';
import {compileBodyDraft} from './compile-body-draft.mjs';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
export async function privateFurnaceOverlay(){
 const head=compileFurnaceDraft(),body=await compileBodyDraft(),activePath='.local/qa/party-art-2e2a574e5b11/shrek-trigger.sfc',active=new Uint8Array(fs.readFileSync(path.join(root,activePath)));
 assert.equal(sha(active),'2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066');let cursor=0x7d0000;const records=[],placements=[];
 const place=(bytes,name)=>{cursor=Math.ceil(cursor/16)*16;const offset=cursor;cursor+=bytes.length;assert.ok(cursor<=0x7d8000);assert.deepEqual(active.slice(offset,cursor),active.slice(offset-0x400000,cursor-0x400000),'Private unused expanded mirror '+name);records.push({offset,bytes});placements.push({name,offset,bytes:bytes.length,sha256:sha(bytes)});return offset;};
 const pointer=(table,id,offset)=>{const bytes=new Uint8Array(3);put24(bytes,0,offset);records.push({offset:table+id*3,bytes});};
 pointer(0x242000,34,place(head.compressed,'Furnace head compressed graphics'));pointer(0x242300,23,place(head.assembly,'Furnace head assembly'));
 for(const b of body.banks)pointer(0x362220,b.id,place(b.compressed,'Furnace background'+b.id));
 const palettes=head.family.actors.map(a=>{const bytes=new Uint8Array(24);a.colors.forEach((c,i)=>put16(bytes,i*2,snesColor(c)));const offset=0x240000+u16(active,0x242a00+a.palette*2);assert.deepEqual(active.slice(offset,offset+24),bytes,'Existing head palette '+a.palette);return{id:a.palette,enemy:a.enemy,bytes};});
 for(const p of body.report.paletteGroups)for(const slot of p.slots){const bytes=new Uint8Array(30);[...p.colors,p.colors[1],p.colors[5],p.colors[4]].forEach((c,i)=>put16(bytes,i*2,snesColor(c)));const offset=0x3624c0+p.id*210+(slot-1)*30;assert.deepEqual(active.slice(offset,offset+30),bytes,'Existing body palette'+p.id+':'+slot);}
 const rom=applyRecords(active,records);for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,65535);put16(rom,h+30,0);}const sum=rom.reduce((n,b)=>(n+b)&65535,0);for(const h of[0xffc0,0x40ffc0]){put16(rom,h+28,sum^65535);put16(rom,h+30,sum);}
 const native=JSON.parse(fs.readFileSync(path.join(d,'native-audit.json')));for(const h of native.headers){const off=0x24f600+h.enemy*10;assert.deepEqual(rom.slice(off,off+10),active.slice(off,off+10));assert.deepEqual(rom.slice(h.ai.offset,h.ai.offset+h.ai.bytes),active.slice(h.ai.offset,h.ai.offset+h.ai.bytes));}
 assert.deepEqual(rom.slice(native.source.animationOffset,native.source.animationOffset+native.source.animationBytes),active.slice(native.source.animationOffset,native.source.animationOffset+native.source.animationBytes));
 return{rom,head,body,palettes,placements,report:{activeRomPath:activePath,activeRomSha256:sha(active),privateRomSha256:sha(rom),unusedExpandedMirrorProved:true,originalHeaderAnimationAiUnchanged:true,unchangedSizeByte:6,palettesUnchanged:true}};
}
