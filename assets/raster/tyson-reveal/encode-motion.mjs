import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const d=import.meta.dirname;
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
for(const[name,count]of[['emergence',700],['challenge',200]]){
  const out=path.join(d,'review/native-'+name+'.apng');
  execFileSync('ffmpeg',['-v','error','-y','-framerate','60','-i',path.join(d,'private',name,'%04d.png'),'-plays','0',out]);
  // ffmpeg rounds60Hz to1667/100000 by default. Restore the exact cartridge
  // clock in APNG control metadata; the recorded pixel chunks stay untouched.
  const bytes=fs.readFileSync(out);let frames=0;
  for(let at=8;at<bytes.length;){const length=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8);if(type==='fcTL'){assert.equal(length,26);bytes.writeUInt16BE(1,at+8+20);bytes.writeUInt16BE(60,at+8+22);bytes.writeUInt32BE(crc32(bytes.subarray(at+4,at+8+length)),at+8+length);frames++;}at+=12+length;}
  assert.equal(frames,count);fs.writeFileSync(out,bytes);
}
console.log('Encoded700+200 actual native frames with exact1/60s APNG delay.');
