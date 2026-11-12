import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {applyRecords, u24, put16, put24} from '../../../engine/rom.js';
import {npcGraphicsStreamTable} from '../../../engine/npc-graphics-streaming.js';
import {cartridgeOffset} from '../../../engine/expanded-rom.js';
import {assertUnusedSpriteSlot, spriteHeaders} from '../../../engine/native-sprites.js';
import {decompress} from '../../../engine/compression.js';

export const sha = data => createHash('sha256').update(data).digest('hex');
export function privateOverlay() {
  const dir = import.meta.dirname;
  const read = file => JSON.parse(fs.readFileSync(path.join(dir, file)));
  const audit = read('native-audit.json');
  const compiled = read('full-area/audit.json');
  const base = new Uint8Array(fs.readFileSync(path.join(dir, 'private/baseline-af3383746691.sfc')));
  assert.equal(sha(base), audit.baselineSha256);
  const table = npcGraphicsStreamTable(base);
  assert.ok(table); assert.equal(u24(base, table + 125 * 3), 0);
  assert.deepEqual(spriteHeaders(base).filter(h => base[h.offset + 1] === 188).map(h => [h.kind,h.id]), [['npc',14],['npc',79]]);
  const graphics = new Uint8Array(fs.readFileSync(path.join(dir, 'full-area/graphics.4bpp')));
  const compressed = new Uint8Array(fs.readFileSync(path.join(dir, 'full-area/graphics.ct-lz')));
  const assembly = new Uint8Array(fs.readFileSync(path.join(dir, 'full-area/assembly.bin')));
  for (const [bytes, hash] of [[graphics, compiled.graphicsSha256], [compressed, compiled.compressedSha256], [assembly, compiled.assemblySha256]]) assert.equal(sha(bytes), hash);
  const records = [], placements = [];
  let cursor = 0x7c0000;
  function add(bytes, label, pointer) {
    const offset = cursor; cursor += (bytes.length + 15) & ~15;
    assert.ok(cursor <= 0x7c8000);
    assert.deepEqual(base.slice(offset, offset + bytes.length), base.slice(offset - 0x400000, offset - 0x400000 + bytes.length), 'Private placement is an unused original mirror');
    records.push({offset, bytes, label});
    const value = new Uint8Array(3); put24(value, 0, offset);
    records.push({offset: pointer, bytes: value, label: label + ' pointer'});
    placements.push({offset, bytes: bytes.length, sha256: sha(bytes), label, pointer});
    return offset;
  }
  add(compressed, 'Private town resident compressed graphics', 0x242000 + 125 * 3);
  add(assembly, 'Private town resident assembly188', 0x242300 + 188 * 3);
  const raw = add(graphics, 'Private town resident raw stream', table + 125 * 3);
  const rom = applyRecords(base, records);
  for (const h of [0xffc0, 0x40ffc0]) {put16(rom, h + 28, 65535); put16(rom, h + 30, 0);}
  const sum = rom.reduce((n, b) => (n + b) & 65535, 0);
  for (const h of [0xffc0, 0x40ffc0]) {put16(rom, h + 28, sum ^ 65535); put16(rom, h + 30, sum);}
  assert.deepEqual(decompress(rom, cartridgeOffset(u24(rom, 0x242000 + 125 * 3), rom)).bytes, graphics);
  assert.deepEqual(rom.slice(raw, raw + graphics.length), graphics);
  for (const h of spriteHeaders(base)) {
    const count = h.kind === 'npc' ? 5 : 10;
    const expected = base.slice(h.offset, h.offset + count);

    assert.deepEqual(rom.slice(h.offset, h.offset + count), expected, `Header ownership ${h.kind}${h.id}`);
  }
  for (const p of audit.palettes) assert.equal(sha(rom.slice(p.offset, p.offset + p.bytes)), p.sha256);
  assert.equal(u24(rom, 0x242300 + 7 * 3), u24(base, 0x242300 + 7 * 3));
  assert.equal(sha(rom.slice(audit.assembly.offset, audit.assembly.end)), audit.assembly.sha256);
  const an = audit.animationProgram;
  assert.equal(sha(rom.slice(an.offset, an.end)), an.sha256);
  assert.equal(sha(rom.slice(an.durationOffset, an.durationEnd)), an.durationSha256);
  let changedBytes = 0;
  for (let i = 0; i < rom.length; i++) if (rom[i] !== base[i]) {
    changedBytes++;
    assert.ok(records.some(r => i >= r.offset && i < r.offset + r.bytes.length) || [0xffdc, 0x40ffdc].some(p => i >= p && i < p + 4), 'Every changed byte explicitly owned');
  }
  const report = {baselinePath: 'assets/imagegen/town-civilians-gfx125/private/baseline-af3383746691.sfc', baselineSha256: sha(base), privateSha256: sha(rom), streamTable: table, streamedGraphics: [125], rawPointer: raw, placements, changedBytes, exclusiveAssembly: 188, changedHeaderFields: [], sharedAssembly7Unchanged: true, sharedAnimation7Unchanged: true, sharedPalettesUnchanged: true, allUnrelatedHeadersUnchanged: true, nativeStreamingHelperUnchanged: true, extraWramBytes: 0, extraVramBytes: 0, privateOnly: true};
  fs.writeFileSync(path.join(dir, 'private/candidate.sfc'), rom);
  fs.writeFileSync(path.join(dir, 'private/candidate.json'), JSON.stringify(report, null, 2) + '\n');
  return {rom, base, audit: {...audit, animation: an}, compiled, bank: {key: 'duloc-town-resident', gfx: 125, asm: 188, size: 0, cells: 4, frames: 20, graphics, assembly, compressed}, report};
}
