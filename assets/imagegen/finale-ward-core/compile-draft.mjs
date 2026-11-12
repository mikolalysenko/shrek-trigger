import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {compress,decompress} from '../../../engine/compression.js';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),read=p=>JSON.parse(fs.readFileSync(path.join(d,p))),sha=b=>createHash('sha256').update(b).digest('hex');
export function compileFinaleDraft(){return read('source-actors.json').map(actor=>{const part=actor.key==='sugar-ward'?'ward':'core',folder=part+'-area',asset=read(folder+'/preview-raster.json'),audit=read(folder+'/draft-audit.json'),frames=asset.frames.map(h=>Uint8Array.from(h,c=>parseInt(c,16)));for(const s of asset.provenance)assert.equal(sha(fs.readFileSync(path.join(root,s.file))),s.sha256);assert.deepEqual(asset.palette,actor.colors);const c=compileSpriteFrames(frames),compressed=compress(c.graphics);assert.equal(sha(c.graphics),audit.graphicsSha256);assert.equal(sha(c.assembly),audit.assemblySha256);assert.equal(sha(compressed),audit.compressedSha256);assert.deepEqual(decompress(compressed,0).bytes,c.graphics);for(const[file,b]of[['graphics.4bpp',c.graphics],['graphics.ct-lz',compressed],['assembly.bin',c.assembly]])assert.deepEqual(new Uint8Array(fs.readFileSync(path.join(d,folder,file))),b);return{actor,part,folder,asset,audit,...c,frames,compressed};});}
