import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {nativeSpriteBank, nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {compress, decompress} from '../../../engine/compression.js';

const dir = import.meta.dirname;
const method = process.argv[2] ?? 'area';
const out = path.join(dir, `full-${method}`);
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name)));
const audit = read('native-audit.json');
const roles = read('native-role-notes.json');
const raster = read(`full-${method}/preview-raster.json`);
const spec = read(`import-spec.full-${method}.json`);
const sha = data => createHash('sha256').update(data).digest('hex');
const source = raster.frames.map(s => Uint8Array.from(s, c => parseInt(c, 16)));
const bounds = pixels => {
  const points = Array.from(pixels).flatMap((k, i) => k ? [[i % 64, Math.floor(i / 64)]] : []);
  return points.length ? [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])) + 1, Math.max(...points.map(p => p[1])) + 1] : null;
};
const rom = new Uint8Array(fs.readFileSync(path.join(dir, 'private/baseline-af3383746691.sfc')));
const originalBank = nativeSpriteBank(rom, {gfx: 125, asm: 188, palette: 135, size: 0, frames: 20});
const originalStartle = new Uint8Array(4096);
for (const cell of nativeSpriteCells(originalBank, 16)) for (let i = 0; i < 256; i++) if (cell.pixels[i]) originalStartle[(cell.y + 52 + (i >> 4)) * 64 + cell.x + 32 + i % 16] = cell.pixels[i];
const sweat = [[31,20,2],[37,21,2],[25,22,2]];
for (const [x,y,k] of sweat) assert.equal(originalStartle[y*64+x], k);
const overlayPixels = new Array(13*3).fill(0);
for (const [x,y,k] of sweat) overlayPixels[(y-20)*13+x-25] = k;
const overlay = {sourceType: 'original-ROM-raster', baselineSha256: audit.baselineSha256, gfx: 125, asm: 188, sourceFrame: 16, width: 13, height: 3, frames: [{frame: 16, bounds: [25,20,13,3], pixels: overlayPixels}], note: 'Exactly three isolated original sweat pixels, palette index2; generated anatomy remains separate.'};
fs.writeFileSync(path.join(dir, 'original-sweat-raster.json'), JSON.stringify(overlay,null,2)+'\n');
const frames = [], reports = [], origins = [], composition = [];
for (let f = 0; f < 20; f++) {
  const rawEntry = spec.sequences.native[1][f];
  const entry = typeof rawEntry === 'number' ? {frame: rawEntry} : {frame: rawEntry.frame, ...(rawEntry.flip ? {flip: true} : {}), ...(rawEntry.dissolve !== undefined ? {dissolve: rawEntry.dissolve} : {})};
  const p = source[entry.frame];
  assert.ok(p);
  const mirrored = entry.flip ? Uint8Array.from(p, (_, i) => p[Math.floor(i / 64) * 64 + 63 - i % 64]) : p;
  const b = bounds(mirrored);
  const original = audit.nativeGeometry[f].bounds;
  const result = new Uint8Array(4096);
  let dx = 0, dy = 0;
  {
    assert.ok(original && b);
    dx = Math.round((original[0] + original[2] - 1) / 2 + 32 - (b[0] + b[2] - 1) / 2);
    dy = original[3] + 52 - b[3];
    for (let i = 0; i < mirrored.length; i++) if (mirrored[i]) {
      const x = i % 64 + dx, y = Math.floor(i / 64) + dy;
      assert.ok(x >= 0 && x < 64 && y >= 0 && y < 64, `Frame ${f} source clips the staging canvas`);
      result[y * 64 + x] = mirrored[i];
    }
  }
  const bodyBounds = bounds(result);
  composition.push({frame:f, source:entry.frame === undefined ? entry : {frame:entry.frame, ...(entry.flip ? {flip:true} : {})}, sourceBounds:b, bodyBounds, translation:[0,0], shadowBounds:f === 16 ? [25,20,13,3] : null});
  if (f === 16) for (const [x,y,k] of sweat) {assert.equal(result[y*64+x], 0, 'Original sweat must not overwrite generated anatomy'); result[y*64+x]=k;}
  const old = audit.nativeGeometry[f].cellOrigins.map(([x, y]) => [x + 32, y + 52]);
  if (f === 19) old[3][1] -= 5; // Proposed lower-left row closes the original gap; no opaque pixel is deleted.
  const cover = new Uint8Array(4096);
  for (const [x, y] of old) {
    assert.ok(x >= 0 && y >= 0 && x + 16 <= 64 && y + 16 <= 64);
    for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 16; xx++) cover[(y + yy) * 64 + x + xx]++;
  }
  assert.ok(!result.some((k, i) => k && !cover[i]), `Frame ${f} does not fit the four original cells`);
  if (cover.some(k => k > 1)) console.log('Native original rectangle overlap', f);
  const finalBounds = bounds(result)?.map((v, i) => v - (i % 2 ? 52 : 32)) ?? null;
  assert.equal(finalBounds[3], original[3]);

  spec.sequences.native[1][f] = {...entry, ...(dx ? {dx} : {}), ...(dy ? {dy} : {})};
  frames.push(result); origins.push(old);
  reports.push({frame: f, role: roles.frames[f].label, sourceFrame: entry.frame, flip: !!entry.flip, blank: false, sourceTranslation: [dx, dy], originalBounds: original, nativeBounds: finalBounds, opaquePixels: result.filter(Boolean).length, pixelsSha256: sha(result), originalCellOrigins: audit.nativeGeometry[f].cellOrigins, cellOrigins: old});
}
const compiled = compileSpriteFrames(frames, {width: 64, height: 64, size: 0, frameCellOrigins: origins});
for (let f = 0; f < 20; f++) for (let cell = 0; cell < 4; cell++) compiled.assembly[f * 40 + 33 + cell * 2] += 12;
for (let f = 0; f < 20; f++) {
  const image = new Uint8Array(4096);
  const cells = nativeSpriteCells({...compiled, cells: 4, frames: 20}, f);
  const expected = audit.nativeGeometry[f].cellOrigins.map(p => [...p]);
  if (f === 19) expected[3][1] -= 5;
  assert.deepEqual(cells.map(c => [c.x, c.y]), expected, 'Declared signed XY proposal is exact');
  for (const c of cells) for (let i = 0; i < 256; i++) if (c.pixels[i]) image[(c.y + 52 + Math.floor(i / 16)) * 64 + c.x + 32 + i % 16] = c.pixels[i];
  assert.deepEqual(image, frames[f], `Frame ${f} complete source pixel round trip`);
}
const packed = compress(compiled.graphics);
assert.deepEqual(decompress(packed, 0).bytes, compiled.graphics);
for (const [name, data] of [['graphics.4bpp', compiled.graphics], ['graphics.ct-lz', packed], ['assembly.bin', compiled.assembly]]) fs.writeFileSync(path.join(out, name), data);
fs.writeFileSync(path.join(dir, `import-spec.full-${method}.json`), JSON.stringify(spec, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'native-composition.json'), JSON.stringify(composition, null, 2)+'\n');
fs.writeFileSync(path.join(out, 'native-source-map.json'), JSON.stringify(reports, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'native-frames.json'), JSON.stringify(frames.map(p => Array.from(p, n => n.toString(16)).join(''))) + '\n');
for (const palette of audit.palettes) for (const scale of [1, 4]) {
  const png = new PNG({width: 5 * 64 * scale, height: 4 * 64 * scale});
  for (let i = 0; i < png.data.length; i += 4) png.data.set([38, 50, 56, 255], i);
  frames.forEach((pixels, f) => pixels.forEach((k, i) => {
    if (!k) return;
    const w = palette.words[k - 1];
    const rgb = [0, 5, 10].map(s => { const v = w >> s & 31; return v << 3 | v >> 2; });
    for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) {
      const px = ((f % 5) * 64 + i % 64) * scale + x;
      const py = (Math.floor(f / 5) * 64 + Math.floor(i / 64)) * scale + y;
      png.data.set([...rgb, 255], (py * png.width + px) * 4);
    }
  }));
  fs.writeFileSync(path.join(out, `palette${palette.id}-${scale}x.png`), PNG.sync.write(png));
}
const result = {status: 'Inactive compiled source raster; emulator execution not yet claimed', method, frames: 20, authoredSourcePoses: 16, sourceDerivedFragments: 0, preservedOriginalEffectPixels: 3, blankFrames: [], fragmentFrames: [], cells: 4, width: 64, height: 64, origin: [32, 52], rawBytes: compiled.graphics.length, compressedBytes: packed.length, assemblyBytes: compiled.assembly.length, graphicsSha256: sha(compiled.graphics), compressedSha256: sha(packed), assemblySha256: sha(compiled.assembly), originalSignedXYBytesPreserved: 159, proposedCoordinateChanges: [{frame: 19, cell: 3, axis: 'y', before: -9, after: -14}], frameCellOrigins: origins, paletteWrites: 0, timingWrites: 0, exclusiveAssembly: 188, newAssemblyIds: [], activation: false};
fs.writeFileSync(path.join(out, 'audit.json'), JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'family.json'), JSON.stringify({key: 'duloc-town-resident', gfx: 125, owners: [14, 79], groups: [{key: 'duloc-town-resident', asm: 188, art: 'duloc-town-resident', width: 64, height: 64, size: 0, frames: 20, anchor: [0, 12], frameCellOrigins: origins}]}, null, 2) + '\n');
const draft = {...spec, directory:'assets/imagegen/town-civilians-gfx125/draft-preview', nativeComposition:{map:`assets/imagegen/town-civilians-gfx125/full-${method}/native-composition.json`,overlay:'assets/imagegen/town-civilians-gfx125/original-sweat-raster.json'}, sequences:{native:{1:Array.from({length:20},(_,i)=>i)}}};
fs.writeFileSync(path.join(dir, `import-spec.composed-${method}.json`), JSON.stringify(draft,null,2)+'\n');
console.log(JSON.stringify({...result, frameCellOrigins:undefined}));
