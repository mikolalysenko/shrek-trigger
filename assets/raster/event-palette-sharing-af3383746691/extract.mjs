import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {u16,u24} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {cartridgeOffset} from '../../../engine/expanded-rom.js';
import {spriteHeaders} from '../../../engine/native-sprites.js';

const dir=import.meta.dirname,root=path.resolve(dir,'../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const files={original:'.local/chrono-trigger-usa.sfc',current:'assets/imagegen/town-civilians-gfx125/private/baseline-af3383746691.sfc'};
const expected={original:'06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9',current:'af338374669168012da0165d385209c5d3aa9789bb713ef488ef7dcb06e555a7'};
const report={status:'Read-only original versus pinned published palette-sharing audit',inputs:[],headers:{},excludedDetailedLocations:[80]};
for(const [name,file]of Object.entries(files)){
  const rom=new Uint8Array(fs.readFileSync(path.join(root,file)));assert.equal(sha(rom),expected[name]);
  report.inputs.push({name,path:file,sha256:sha(rom)});
  report.headers[name]=spriteHeaders(rom).map(h=>{const header=[...rom.slice(h.offset,h.offset+(h.kind==='enemy'?10:5))],palette=header[2],palettePointer=u16(rom,0x242a00+palette*2),words=Array.from({length:12},(_,i)=>u16(rom,0x240000+palettePointer+i*2));return{...h,header,palette,palettePointer,paletteWords:words,paletteSha256:sha(rom.slice(0x240000+palettePointer,0x240000+palettePointer+24))};});
  const packets=[];for(let location=0;location<512;location++){
    const eventId=u16(rom,0x360008+location*14);
    try{const offset=cartridgeOffset(u24(rom,0x3cf9f0+eventId*3),rom),decoded=decompress(rom,offset);packets.push({location,eventId,offset,decodedSha256:sha(decoded.bytes),bytes:Buffer.from(decoded.bytes).toString('base64')});}
    catch(error){packets.push({location,eventId,error:String(error)});}
  }
  fs.writeFileSync(path.join(dir,'private/events-'+name+'.json'),JSON.stringify(packets)+'\n');
}
fs.writeFileSync(path.join(dir,'headers.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({inputs:report.inputs,headers:Object.fromEntries(Object.entries(report.headers).map(([k,v])=>[k,v.length]))}));
