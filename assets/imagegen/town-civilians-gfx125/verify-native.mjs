import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {privateOverlay, sha} from './private-overlay.mjs';
import {uploaded, oamCells, locate, pixelProof} from './native-proof-utils.mjs';
import {nativeSpriteBank, nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {createCore} from '../../../scripts/core.mjs';
import {newGame, runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {previewActors} from '../../../content/native-preview.js';
import {u16} from '../../../engine/rom.js';
import {snapshot, restore} from '../../../engine/save.js';

const dir = import.meta.dirname, root = path.resolve(dir, '../../..');
const out = path.join(dir, 'native-verification'), c = privateOverlay(), rows = [];
fs.mkdirSync(out, {recursive: true});
const s = await createCore(c.rom);
const checkpoint = path.join(dir, 'private/newgame-' + c.report.privateSha256.slice(0, 12) + '.json');
if (fs.existsSync(checkpoint)) restore(s, JSON.parse(fs.readFileSync(checkpoint)));
else { await newGame(s); fs.writeFileSync(checkpoint, JSON.stringify(snapshot(s))); }
const h = installHooks(s, JSON.parse(fs.readFileSync(path.join(root, 'content/hooks.json'))));
const dev = createDevTools(s, h), start = previewActors.length;
const targets = c.audit.owners.map(o => ({...o, frames: 20, target: true}));
for (const [id, frames] of [[21, 19], [22, 19], [39, 4]]) {
  const offset = 0x24f000 + (id + 7) * 5;
  targets.push({kind: 'npc', id, offset, header: [...c.base.slice(offset, offset + 5)], frames, target: false});
}
try {
  for (const owner of targets) {
    const [gfx, asm, paletteId, , size] = owner.header;
    const key = 'town-resident-proof-' + owner.id;
    const bank = owner.target ? c.bank : {...nativeSpriteBank(c.base, {gfx, asm, palette: paletteId, size, frames: owner.frames}), key};
    const paletteAt = 0x240000 + u16(c.base, 0x242a00 + paletteId * 2);
    const palette = Array.from({length: 12}, (_, i) => u16(c.base, paletteAt + i * 2));
    previewActors.push({key, npc: owner.id, gfx, asm, palette: paletteId, size, frames: owner.frames});
    dev.previewActor(key); runFrames(s, 300);
    assert.equal(dev.diagnostics().fatal, null);
    const object = dev.diagnostics().preview.object;
    assert.equal(object, 15);
    if (owner.target) assert.equal(s.ram[0x1200 + object * 2] * 65536 + u16(s.ram, 0x1280 + object * 2), c.report.rawPointer);
    assert.equal(u16(s.ram, 0x1400 + object * 2), u16(c.rom, 0x242a00 + paletteId * 2));
    for (let frame = 0; frame < owner.frames; frame++) {
      dev.previewFrame(frame); runFrames(s, 24);
      assert.equal(s.ram[0xf01 + object * 2], frame);
      const upload = uploaded(s, bank, object, frame);
      assert.equal(upload.exact, true, key + '/' + frame + ' native upload');
      const cells = oamCells(s, palette), entry = locate(bank, frame, cells);
      const visible = nativeSpriteCells(bank, frame).some(cell => cell.pixels.some(Boolean));
      if (!visible) {
        assert.equal(entry, null);
        rows.push({owner: owner.id, target: owner.target, frame, palette: paletteId, upload, blank: true, exactCells: 0, pixels: {exact: 0, mismatches: 0}});
        continue;
      }
      assert.ok(entry, key + '/' + frame + ' native placement');
      for (const expected of nativeSpriteCells(bank, frame)) assert.ok(cells.some(actual => actual.x === entry.origin[0] + expected.x && actual.y === entry.origin[1] + expected.y && actual.hash === sha(expected.pixels)), 'Every native cell reservation rendered');
      const pixels = pixelProof(s, [entry], palette);
      assert.equal(pixels.mismatches, 0, key + '/' + frame + ' visible source pixels');
      assert.ok(pixels.exact);
      let screenshot;
      if (owner.target) {
        const png = new PNG({width: 512, height: 480}); s.setPixels(png.data);
        screenshot = 'npc' + owner.id + '-' + frame + '.png';
        fs.writeFileSync(path.join(out, screenshot), PNG.sync.write(png));
      }
      rows.push({owner: owner.id, target: owner.target, frame, palette: paletteId, upload, origin: entry.origin, exactCells: 4, pixels, heapBytes: u16(s.ram, 0x171) - 0x8000, screenshot});
      assert.equal(dev.diagnostics().fatal, null);
    }
    dev.undo();
    console.log(key + ' all' + owner.frames + ' native frames passed');
  }
} finally { previewActors.splice(start); dev.dispose(); h.dispose(); }
assert.deepEqual(s.cart.data, c.rom);
const selected = rows.filter(r => r.target), sentinels = rows.filter(r => !r.target);
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({
  ...c.report, status: 'All target and unrelated shared-resource sentinel uploads passed',
  targetUploads: selected.length, sentinelUploads: sentinels.length,
  targetExactCells: selected.reduce((n, r) => n + r.exactCells, 0),
  targetExactOpaquePixels: selected.reduce((n, r) => n + r.pixels.exact, 0),
  sentinelExactOpaquePixels: sentinels.reduce((n, r) => n + r.pixels.exact, 0),
  setup: 'Reversible isolated original native actor previews. NPC14/79 use the private source-based gfx125/asm188. NPC21/22 preserve shared AA7/asm7 and palette135; NPC39 checks unrelated palette133 artwork. No header, palette, animation or event writes.',
  rows
}, null, 2) + '\n');
