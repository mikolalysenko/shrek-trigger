import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';

const dir = import.meta.dirname;
const audit = JSON.parse(fs.readFileSync(path.join(dir, 'native-audit.json')));
for (const method of ['area', 'nearest']) {
  const raster = JSON.parse(fs.readFileSync(path.join(dir, `base-${method}/preview-raster.json`)));
  for (const palette of audit.palettes) {
    for (const scale of [1, 4]) {
      const image = new PNG({width: 3 * 64 * scale, height: 3 * 64 * scale});
      for (let i = 0; i < image.data.length; i += 4) image.data.set([38, 50, 56, 255], i);
      raster.frames.forEach((hex, f) => {
        for (let i = 0; i < hex.length; i++) {
          const k = parseInt(hex[i], 16);
          if (!k) continue;
          const word = palette.words[k - 1];
          const rgb = [0, 5, 10].map(s => { const v = (word >> s) & 31; return (v << 3) | (v >> 2); });
          for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) {
            const px = ((f % 3) * 64 + i % 64) * scale + x;
            const py = (Math.floor(f / 3) * 64 + Math.floor(i / 64)) * scale + y;
            image.data.set([...rgb, 255], (py * image.width + px) * 4);
          }
        }
      });
      fs.writeFileSync(path.join(dir, `review/base-${method}-palette${palette.id}-${scale}x.png`), PNG.sync.write(image));
    }
  }
}
