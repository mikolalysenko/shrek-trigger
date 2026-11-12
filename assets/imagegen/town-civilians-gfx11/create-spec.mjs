import fs from 'node:fs';
import path from 'node:path';

const dir = import.meta.dirname;
const rootPath = 'assets/imagegen/town-civilians-gfx11';
const audit = JSON.parse(fs.readFileSync(path.join(dir, 'native-audit.json')));

for (const method of ['area', 'nearest']) {
  const spec = {
    key: 'duloc-town-keeper',
    sourceType: 'image-generation',
    directory: `${rootPath}/base-${method}`,
    width: 64,
    height: 64,
    palette: audit.palettes.find(p => p.id === 9).colors,
    sheets: [{
      file: `${rootPath}/source-base-v1.png`,
      columns: 3,
      rows: 3,
      nativeHeight: 32,
      scaleCells: [0, 1, 2],
      componentAlpha: 128,
      sample: {method, bottom: 51, alphaThreshold: 128},
    }],
    sequences: {source: {1: [0, 1, 2, 3, 4, 5, 6, 7, 8]}},
  };
  fs.writeFileSync(path.join(dir, `import-spec.base-${method}.json`), JSON.stringify(spec, null, 2) + '\n');
}
