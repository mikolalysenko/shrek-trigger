import fs from 'node:fs';
import path from 'node:path';
const dir = import.meta.dirname, base = 'assets/imagegen/town-civilians-gfx125';
const audit = JSON.parse(fs.readFileSync(path.join(dir, 'native-audit.json')));
const methods = process.argv[2] ? [process.argv[2]] : ['area', 'nearest'];
for (const method of methods) {
  if (!['area', 'nearest'].includes(method)) throw Error('Expected area or nearest');
  const spec = {
    key: 'duloc-town-resident', sourceType: 'image-generation',
    directory: `${base}/full-${method}`, width: 64, height: 64,
    palette: audit.palettes.find(p => p.id === 135).colors,
    sheets: [{file: `${base}/source-base-v1.png`, columns: 4, rows: 4,
      nativeHeight: 32, scaleCells: [0, 1, 2], componentAlpha: 128,
      sample: {method, bottom: 51, alphaThreshold: 128},
      overrides: {8: {scale: 32 / 31}, 11: {scale: 31 / 32}, 13: {scale: 30 / 31}, 14: {scale: 30 / 27}, 15: {scale: 27 / 26}}}],
    sequences: {native: {1: [0, 1, 2, {frame: 2, flip: true},
      3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      {frame: 11, flip: true}, {frame: 12, flip: true},
      13, 14, {frame: 14, flip: true}, 15]}}
  };
  fs.writeFileSync(path.join(dir, `import-spec.full-${method}.json`), JSON.stringify(spec, null, 2) + '\n');
}
