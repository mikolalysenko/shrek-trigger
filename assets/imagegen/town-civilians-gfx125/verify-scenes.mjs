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
  const banks = scene.banks.map(b => ({...b, decodedBytes: b.gfx === 125 ? c.compiled.rawBytes : b.decodedBytes, streamed: b.gfx === 125 || b.streamed}));
  const event = u16(c.rom, 0x360008 + scene.location * 14);
  const read = rom => decompress(rom, cartridgeOffset(u24(rom, 0x3cf9f0 + event * 3), rom)).bytes;
  assert.deepEqual(read(c.rom), read(c.base));
  return {location: scene.location, name: scene.name, banks, unstreamedActorUnion: banks.reduce((n, b) => n + (b.streamed ? 0 : b.decodedBytes), 0), eventSha256: sha(read(c.rom)), scope: 'All-branch source-bank union excluding common resources; not simultaneous heap consumption.'};
});
fs.writeFileSync(path.join(dir, 'scene-resource-audit.json'), JSON.stringify({...c.report, scenes: scopes}, null, 2) + '\n');
const selected = process.argv.slice(2);
for (const name of selected.length ? selected : ['truce-inn', 'merchant-inn', 'marco', 'parade', 'dream-end-time']) {
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
    for (const l of loads.filter(l => l.location === location && [14, 79].includes(l.id))) {
      const x = l.object * 2, pointer = s.ram[0x1200 + x] * 65536 + u16(s.ram, 0x1280 + x);
      if (pointer !== c.report.rawPointer) continue;
      const owner = c.audit.owners.find(o => o.id === l.id), palette = owner.header[2], frame = s.ram[0xf01 + x];
      assert.equal(u16(s.ram, 0x1400 + x), u16(c.rom, 0x242a00 + palette * 2));
      if (frame >= 20) continue;
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
      for (let f = 0; f < 20; f++) for (let tries = 0; tries < 10; tries++) {
        const entry = locate(c.bank, f, cells); if (!entry) break;
        const pixels = pixelProof(s, [entry], palette.words);
        matches.push({frame: f, palette: palette.id, objPaletteRow: entry.cells[0].palette, cgramWords: Array.from({length: 12}, (_, i) => s.ppu.cgram[129 + entry.cells[0].palette * 16 + i]), origin: entry.origin, visibleExact: pixels.exact, occludedOrDifferent: pixels.mismatches, cells: entry.cells.map(x => x.entry)});
        const used = new Set(entry.cells.map(x => x.entry)); cells = cells.filter(x => !used.has(x.entry));
      }
    }
    for (let f = 0; f < 20; f++) { const entry = locate(c.bank, f, oamCells(s)); if (entry && !matches.some(m=>m.frame===f && JSON.stringify(m.origin)===JSON.stringify(entry.origin))) { const words=Array.from({length:12},(_,i)=>s.ppu.cgram[129+entry.cells[0].palette*16+i]);const pixels=pixelProof(s,[entry],words);matches.push({frame:f,palette:'native-row-override',objPaletteRow:entry.cells[0].palette,cgramWords:words,origin:entry.origin,visibleExact:pixels.exact,occludedOrDifferent:pixels.mismatches,cells:entry.cells.map(x=>x.entry)}); }}
    shots.push({key, ticks, positions:loads.filter(l=>[14,79].includes(l.id)).map(l=>({object:l.object,id:l.id,x:u16(s.ram,0x1800+l.object*2)/16,y:u16(s.ram,0x1880+l.object*2)/16})),leader:{object:u16(s.ram,0x197)/2,x:u16(s.ram,0x1800+u16(s.ram,0x197))/16,y:u16(s.ram,0x1880+u16(s.ram,0x197))/16}, location: u16(s.ram, 0x100), brightness: s.ppu.brightness, dialogue: s.ram[0x12a], nativeMatches: matches});
    return matches;
  }
  try {
    const config = {
      'truce-inn': {id:12, x:54, y:13, facing:0},
      'merchant-inn': {id:62, x:3, y:26, facing:0},
      'marco': {id:158, x:60, y:56, facing:0},
      'parade': {id:80, x:10, y:33, facing:2, story:200, party:[0,1,2], endgame:true},
      'dream-end-time': {id:379, x:33, y:19, facing:0, party:[0,1,2], endgame:true},
    };
    setup = config[name]; assert.ok(setup);
    if(name === 'marco') {s.ram[0x100f7] |= 2; setup={...setup, diagnosticSeed:{address:'7F00F7', setBits:2, reason:'Original returned-husband load condition'}};}
    if(name === 'parade') {s.ram[0x10000] = 200;s.ram[0x1006d] |= 64; setup={...setup, diagnosticSeed:{storyAddress:'7F0000', storyValue:200, address:'7F006D', setBits:64, reason:'Original post-parade branch; story200 and a diagnostic entry avoid replaying the completed procession'}};}
    dev.jump(setup); wait(500); shot('arrival');
    const target={ 'truce-inn':10,'merchant-inn':12,'marco':9,'parade':35,'dream-end-time':10 }[name];
    const wanted={ 'truce-inn':[79,80,81,82],'merchant-inn':[56],'marco':[106,107,108,109,110],'parade':[56],'dream-end-time':[35] }[name];
    for(let n=0;n<1000&&!messages.some(m=>m.location===setup.id&&wanted.includes(m.stringId));n++) {
      const leader=u16(s.ram,0x197),dx=(u16(s.ram,0x1800+target*2)-u16(s.ram,0x1800+leader))/16,dy=(u16(s.ram,0x1880+target*2)-u16(s.ram,0x1880+leader))/16;
      let key=0;
      if(Math.abs(dx)>4) key=dx>0?128:64;
      else if(Math.abs(dy)>12) key=dy>0?32:16;
      else key=Math.abs(dx)>Math.abs(dy)?(dx>0?128:64):(dy>0?32:16);
      wait(1,key|(n%30<3?256:0));
    }
    shot('interaction');
    for(let n=0;n<4;n++){tap(256,120);if(messages.length)shot('dialogue-'+n);}
    const matched=messages.filter(m=>m.location===setup.id&&wanted.includes(m.stringId));
    assert.ok(matched.length, 'Original target dialogue reached by controller: '+name);
    wait(300); shot('settled');
    assert.equal(u16(s.ram,0x100),setup.id);
    assert.ok(loads.some(l=>l.location===setup.id && [14,79].includes(l.id)));
    assert.ok(shots.some(q=>q.nativeMatches.some(m=>m.visibleExact>0)), 'Actual original scene displays source pixels');
    result={location:setup.id, sourceFrames:[...new Set(shots.flatMap(q=>q.nativeMatches.map(m=>m.frame)))], dialogueIds:[...new Set(messages.filter(m=>m.location===setup.id).map(m=>m.stringId))], scope:'Diagnostic E0 entry into unchanged original event; original initialization, dialogue and bounded controller interaction. Any prerequisite story bits are explicitly recorded in setup. No complete service transaction, natural approach or ending completion is claimed.'};
    assert.deepEqual(s.cart.data, c.rom);
    assert.ok(observations.size, 'Actual native field bank observed');
    fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify({...c.report, status: 'Passed', name, setup, result, nativeTicks: ticks, heapMin: Math.min(...heaps), heapMax: Math.max(...heaps), loads, events, messages, observations: [...observations.values()], shots}, null, 2) + '\n');
    console.log(JSON.stringify({name, ticks, result}));
  } catch (error) {
    shot('failure'); fs.writeFileSync(path.join(out, name + '-failure.json'), JSON.stringify({...c.report, error: String(error), setup, ticks, location: u16(s.ram, 0x100), loads, events, messages, actorStates: loads.map(l => ({...l, pointer: s.ram[0x1200 + l.object * 2] * 65536 + u16(s.ram, 0x1280 + l.object * 2), palettePointer: u16(s.ram, 0x1400 + l.object * 2), frame: s.ram[0xf01 + l.object * 2]})), observations: [...observations.values()], shots}, null, 2) + '\n'); throw error;
  } finally {dev.dispose(); h.dispose();}
}
