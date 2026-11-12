import fs from 'node:fs';
import path from 'node:path';

const dir = import.meta.dirname;
const rootPath = 'assets/imagegen/town-civilians-gfx11';
const audit = JSON.parse(fs.readFileSync(path.join(dir, 'native-audit.json')));
const method = process.argv[2] ?? 'area';
if (!['area', 'nearest'].includes(method)) throw Error('Choose area or nearest');
const spec = {
  key: 'duloc-town-keeper', sourceType: 'image-generation',
  directory: `${rootPath}/full-${method}`, width: 64, height: 64,
  palette: audit.palettes.find(p => p.id === 9).colors,
  sheets: [
    {file: `${rootPath}/source-base-v1.png`, columns: 3, rows: 3, cells: [0, 1, 2, 3, 5, 7], nativeHeight: 32, scaleCells: [0, 1, 2], componentAlpha: 128, sample: {method, bottom: 51, alphaThreshold: 128}, overrides: {3: {scale: 32 / 33}, 5: {scale: 32 / 34}, 7: {scale: 31 / 33}}},
    {file: `${rootPath}/source-contacts-v2.png`, columns: 3, rows: 1, nativeHeight: 31, scaleCells: [0, 1, 2], componentAlpha: 128, sample: {method, bottom: 51, alphaThreshold: 128}},
  ],
  sequences: {native: {1: [1, 0, 2, {frame: 2, flip: true}, 3, 6, {frame: 3, flip: true}, {frame: 6, flip: true}, 4, 7, {frame: 4, flip: true}, {frame: 7, flip: true}, 5, 8, {frame: 5, flip: true}, {frame: 8, flip: true}, {frame: 0, dissolve: 11}, 2, {frame: 2, flip: true}]}},
};
fs.writeFileSync(path.join(dir, `import-spec.full-${method}.json`), JSON.stringify(spec, null, 2) + '\n');
