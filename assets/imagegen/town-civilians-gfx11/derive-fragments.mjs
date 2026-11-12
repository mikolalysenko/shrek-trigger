import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';

const dir = import.meta.dirname;
const prefix = 'assets/imagegen/town-civilians-gfx11';
const method = process.argv[2] ?? 'area';
const specPath = path.join(dir, `import-spec.full-${method}.json`);
const spec = JSON.parse(fs.readFileSync(specPath));
const raster = JSON.parse(fs.readFileSync(path.join(dir, `full-${method}/preview-raster.json`)));
const body = Uint8Array.from(raster.frames[2], c => parseInt(c, 16));
const top = Math.min(...Array.from(body).flatMap((v, i) => v ? [Math.floor(i / 64)] : []));
const indices = new Uint8Array(4096);
const image = new PNG({width: 64, height: 64});
let count = 0;
for (let y = top; y < top + 8; y++) for (let x = 0; x < 64; x++) {
  const k = body[y * 64 + x];
  if (!k) continue;
  indices[y * 64 + x] = k;
  const rgb = [0, 2, 4].map(n => parseInt(spec.palette[k - 1].slice(n, n + 2), 16));
  image.data.set([...rgb, 255], (y * 64 + x) * 4);
  count++;
}
assert.ok(count > 0);
const file = `derived-cap-fragment-${method}.png`;
fs.writeFileSync(path.join(dir, file), PNG.sync.write(image));
fs.writeFileSync(path.join(dir, `derived-cap-fragment-${method}.json`), JSON.stringify({
  source: `full-${method}/preview-raster.json`, sourceFrame: 2, sourceRole: 'Left idle',
  rectangle: [0, top, 64, 8], opaquePixels: count,
  pixelSha256: createHash('sha256').update(indices).digest('hex'),
  policy: 'Pointwise upper-eight-row crop of the generated left idle after native sampling. No anatomy or colors drawn. Right fragment is a complete horizontal mirror; the original blank remains empty.',
}, null, 2) + '\n');
spec.sheets = spec.sheets.slice(0, 2);
spec.sheets.push({file: `${prefix}/${file}`, columns: 1, rows: 1, nativeHeight: 8, scaleCells: [0], componentAlpha: 128, sample: {method: 'nearest', bottom: 51, alphaThreshold: 128}});
spec.sequences.native[1][17] = 9;
spec.sequences.native[1][18] = {frame: 9, flip: true};
fs.writeFileSync(specPath, JSON.stringify(spec, null, 2) + '\n');
