import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {privateOverlay, sha} from './private-overlay.mjs';
import {uploaded, oamCells, locate, pixelProof} from './native-proof-utils.mjs';
import {createCore} from '../../../scripts/core.mjs';
import {runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';
import {createDevTools} from '../../../engine/devtools.js';
import {areas} from '../../../content/areas.js';
import {u16, u24} from '../../../engine/rom.js';
import {decompress} from '../../../engine/compression.js';
import {cartridgeOffset} from '../../../engine/expanded-rom.js';
import {restore} from '../../../engine/save.js';

const dir = import.meta.dirname, root = path.resolve(dir, '../../..');
const out = path.join(dir, 'scene-verification'), c = privateOverlay();
fs.mkdirSync(out, {recursive: true});
const scopes = c.audit.scenes.map(scene => {
  const banks = scene.banks.map(b => ({...b, decodedBytes: b.gfx === 11 ? c.compiled.rawBytes : b.decodedBytes, streamed: b.gfx === 11 || b.streamed}));
  const event = u16(c.rom, 0x360008 + scene.location * 14);
  const read = rom => decompress(rom, cartridgeOffset(u24(rom, 0x3cf9f0 + event * 3), rom)).bytes;
  assert.deepEqual(read(c.rom), read(c.base));
  return {location: scene.location, name: scene.name, banks, unstreamedActorUnion: banks.reduce((n, b) => n + (b.streamed ? 0 : b.decodedBytes), 0), eventSha256: sha(read(c.rom)), scope: 'All-branch source-bank union excluding common resources; not simultaneous heap consumption.'};
});
fs.writeFileSync(path.join(dir, 'scene-resource-audit.json'), JSON.stringify({...c.report, scenes: scopes}, null, 2) + '\n');
const selected = process.argv.slice(2);
for (const name of selected.length ? selected : ['market-present', 'market-middle', 'inn-middle', 'medina-inn', 'court-trial', 'dream-home']) {
  const s = await createCore(c.rom);
  restore(s, JSON.parse(fs.readFileSync(path.join(dir, 'private/newgame-' + c.report.privateSha256.slice(0, 12) + '.json'))));
  const h = installHooks(s, JSON.parse(fs.readFileSync(path.join(root, 'content/hooks.json'))));
  const dev = createDevTools(s, h), loads = [], events = [], messages = [], shots = [], observations = new Map(), heaps = [];
  let ticks = 0, setup, result;
  h.on('event.init', e => {if (e.opcode === 0x82) loads.push({...e, id: s.ram[0x12002 + e.scriptPC]});});
  h.on('event.dispatch', e => {if ([0x8e, 0xc8, 0xe0, 0xe1].includes(e.opcode)) events.push({...e, args: [...s.ram.slice(0x12002 + e.scriptPC, 0x12007 + e.scriptPC)]});});
  h.on('dialogue.render', e => messages.push(e));
  function observe() {
    assert.equal(dev.diagnostics().fatal, null);
    const location = u16(s.ram, 0x100), heap = u16(s.ram, 0x171) - 32768;
    if (heap >= 0 && heap <= 32768) heaps.push(heap);
    if (s.ram[0x117] & 1) return;
    for (const l of loads.filter(l => l.location === location && [22, 49, 89].includes(l.id))) {
      const x = l.object * 2, pointer = s.ram[0x1200 + x] * 65536 + u16(s.ram, 0x1280 + x);
      if (pointer !== c.report.rawPointer) continue;
      const owner = c.audit.owners.find(o => o.id === l.id), palette = owner.header[2], frame = s.ram[0xf01 + x];
      assert.equal(u16(s.ram, 0x1400 + x), u16(c.rom, 0x242a00 + palette * 2));
      if (frame >= 19) continue;
      const key = [location, l.object, l.id, frame, palette].join(':');
      const previous = observations.get(key) ?? {location, object: l.object, id: l.id, frame, palette, sampledTicks: 0, exactUploads: 0};
      previous.sampledTicks++; if (uploaded(s, c.bank, l.object, frame).exact) previous.exactUploads++;
      observations.set(key, previous);
    }
  }
  function wait(n, keys = 0) {for (let i = 0; i < n; i++) {runFrames(s, 1, keys); ticks++; if (!(ticks & 7)) observe();}}
  function tap(keys = 256, gap = 100) {wait(3, keys); wait(gap);}
  function shot(key) {
    const png = new PNG({width: 512, height: 480}); s.setPixels(png.data);
    fs.writeFileSync(path.join(out, name + '-' + key + '.png'), PNG.sync.write(png));
    const matches = [];
    for (const palette of c.audit.palettes) {
      let cells = oamCells(s, palette.words);
      for (let f = 0; f < 19; f++) for (let tries = 0; tries < 10; tries++) {
        const entry = locate(c.bank, f, cells); if (!entry) break;
        const pixels = pixelProof(s, [entry], palette.words);
        matches.push({frame: f, palette: palette.id, objPaletteRow: entry.cells[0].palette, cgramWords: Array.from({length: 12}, (_, i) => s.ppu.cgram[129 + entry.cells[0].palette * 16 + i]), origin: entry.origin, visibleExact: pixels.exact, occludedOrDifferent: pixels.mismatches, cells: entry.cells.map(x => x.entry)});
        const used = new Set(entry.cells.map(x => x.entry)); cells = cells.filter(x => !used.has(x.entry));
      }
    }
    shots.push({key, ticks, location: u16(s.ram, 0x100), brightness: s.ppu.brightness, dialogue: s.ram[0x12a], nativeMatches: matches});
    return matches;
  }
  try {
    if (name === 'court-trial') {
      setup = areas.find(a => a.trialScene === 'trial-kind'); dev.jump(setup); wait(400); shot('arrival');
      const chosen = new Set();
      for (let i = 0; i < 280 && u16(s.ram, 0x100) !== 71; i++) {
        const last = messages.at(-1);
        if (last?.location === 27 && [141, 159, 165, 168].includes(last.stringId) && !chosen.has(last.stringId)) {
          chosen.add(last.stringId);
          if ([141, 159].includes(last.stringId)) {
            for (let n = 0; n < 600 && s.ram[0x162] !== 2; n++) wait(1);
            assert.equal(s.ram[0x162], 2); const row = s.ram[0x164];
            for (let n = 0; n < 4 && s.ram[0x163] !== row; n++) {wait(3, 32); wait(6);}
            assert.equal(s.ram[0x163], row);
          } else wait(120);
        }
        tap(); if ([27, 29].includes(u16(s.ram, 0x100)) && i % 18 === 0) shot('court-' + i);
        if (messages.at(-1)?.location === 27 && [149, 152, 153].includes(messages.at(-1).stringId) && !shots.some(q => q.key === 'pierre-' + messages.at(-1).stringId)) shot('pierre-' + messages.at(-1).stringId);
      }
      assert.equal(u16(s.ram, 0x100), 71); assert.equal(s.ram[0x10000], 45); assert.equal(s.ram[0x10051], 0);
      assert.ok(messages.some(m => m.location === 27 && [149, 152, 153].includes(m.stringId)), 'Existing Pierre dialogue executed');
      shot('prison-intake'); result = {location: 71, story: 45, juryVotes: 0, scope: 'Actual helpful trial, Pierre questioning, flashbacks, verdict and prison intake by controller after diagnostic entry.'};
    } else {
      const config = {
        'market-present': {id: 54, x: 38, y: 44, facing: 0},
        'market-middle': {id: 118, x: 56, y: 10, facing: 0},
        'inn-middle': {id: 156, x: 28, y: 29, facing: 0},
        'medina-inn': {...areas.find(a => a.medinaScene === 'medina-peaceful-inn'), x: 58, y: 12},
        'dream-home': {id: 338, x: 10, y: 12, facing: 0, party: [0, 1, 2], endgame: true},
      };
      setup = config[name]; assert.ok(setup); dev.jump(setup); wait(500); shot('arrival');
      if (name !== 'dream-home') {wait(12, 128); tap(); shot('interaction');}
      wait(400); shot('settled');
      assert.equal(u16(s.ram, 0x100), setup.id);
      assert.ok(loads.some(l => l.location === setup.id && [22, 49, 89].includes(l.id)));
      assert.ok(shots.some(q => q.nativeMatches.some(m => m.visibleExact > 0)), 'Actual original scene displays candidate source pixels');
      result = {location: setup.id, sourceFrames: [...new Set(shots.flatMap(q => q.nativeMatches.map(m => m.frame)))], scope: 'Diagnostic entry to an unchanged original location; original initialization and bounded controller interaction only. No complete service transaction or ending claimed.'};
    }
    assert.deepEqual(s.cart.data, c.rom);
    assert.ok(observations.size, 'Actual native field bank observed');
    fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify({...c.report, status: 'Passed', name, setup, result, nativeTicks: ticks, heapMin: Math.min(...heaps), heapMax: Math.max(...heaps), loads, events, messages, observations: [...observations.values()], shots}, null, 2) + '\n');
    console.log(JSON.stringify({name, ticks, result}));
  } catch (error) {
    shot('failure'); fs.writeFileSync(path.join(out, name + '-failure.json'), JSON.stringify({...c.report, error: String(error), setup, ticks, location: u16(s.ram, 0x100), loads, events, messages, actorStates: loads.map(l => ({...l, pointer: s.ram[0x1200 + l.object * 2] * 65536 + u16(s.ram, 0x1280 + l.object * 2), palettePointer: u16(s.ram, 0x1400 + l.object * 2), frame: s.ram[0xf01 + l.object * 2]})), observations: [...observations.values()], shots}, null, 2) + '\n'); throw error;
  } finally {dev.dispose(); h.dispose();}
}
