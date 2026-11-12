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
  const base = new Uint8Array(fs.readFileSync(path.resolve(dir, '../../raster/town-npc12-audit/private/baseline-0758f532bcbf.sfc')));
  assert.equal(sha(base), audit.baselineSha256);
  const table = npcGraphicsStreamTable(base);
  assert.ok(table); assert.equal(u24(base, table + 12 * 3), 0);
  assert.equal(u24(base, 0x242300 + 248 * 3), 0, 'Private assembly has an original zero pointer');
  assertUnusedSpriteSlot(base, 1, 248);
  assert.equal(spriteHeaders(base).filter(h => base[h.offset + 1] === 248).length, 0);
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
  add(compressed, 'Private household resident compressed graphics', 0x242000 + 12 * 3);
  add(assembly, 'Private household resident assembly248', 0x242300 + 248 * 3);
  const raw = add(graphics, 'Private household resident raw stream', table + 12 * 3);
  for (const owner of audit.owners) {
    assert.equal(owner.kind, 'npc'); assert.ok([21, 48].includes(owner.id));
    assert.equal(base[owner.offset + 1], 7);
    records.push({offset: owner.offset + 1, bytes: Uint8Array.of(248), label: `Private NPC${owner.id} assembly selection`});
  }
  const rom = applyRecords(base, records);
  for (const h of [0xffc0, 0x40ffc0]) {put16(rom, h + 28, 65535); put16(rom, h + 30, 0);}
  const sum = rom.reduce((n, b) => (n + b) & 65535, 0);
  for (const h of [0xffc0, 0x40ffc0]) {put16(rom, h + 28, sum ^ 65535); put16(rom, h + 30, sum);}
  assert.deepEqual(decompress(rom, cartridgeOffset(u24(rom, 0x242000 + 12 * 3), rom)).bytes, graphics);
  assert.deepEqual(rom.slice(raw, raw + graphics.length), graphics);
  for (const h of spriteHeaders(base)) {
    const count = h.kind === 'npc' ? 5 : 10;
    const expected = base.slice(h.offset, h.offset + count);
    if (h.kind === 'npc' && [21, 48].includes(h.id)) expected[1] = 248;
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
  const report = {baselinePath: 'assets/raster/town-npc12-audit/private/baseline-0758f532bcbf.sfc', baselineSha256: sha(base), privateSha256: sha(rom), streamTable: table, streamedGraphics: [12], rawPointer: raw, placements, changedBytes, privateAssembly: 248, changedHeaderFields: audit.owners.map(h => ({kind: h.kind, id: h.id, field: 1, from: 7, to: 248})), sharedAssembly7Unchanged: true, sharedAnimation7Unchanged: true, sharedPalettesUnchanged: true, allUnrelatedHeadersUnchanged: true, nativeStreamingHelperUnchanged: true, extraWramBytes: 0, extraVramBytes: 0, privateOnly: true};
  fs.writeFileSync(path.join(dir, 'private/candidate.sfc'), rom);
  fs.writeFileSync(path.join(dir, 'private/candidate.json'), JSON.stringify(report, null, 2) + '\n');
  return {rom, base, audit: {...audit, animation: an}, compiled, bank: {key: 'duloc-household-resident', gfx: 12, asm: 248, size: 0, cells: 4, frames: 19, graphics, assembly, compressed}, report};
}
