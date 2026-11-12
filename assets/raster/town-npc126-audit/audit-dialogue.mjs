// Read the pinned event string tables without altering the cartridge.
import fs from 'node:fs';
import path from 'node:path';
import {u16} from '../../../engine/rom.js';
import {cartridgeOffset} from '../../../engine/expanded-rom.js';
import {dialogueLength, decode} from '../../../engine/text.js';

const dir = import.meta.dirname;
const rom = new Uint8Array(fs.readFileSync(path.join(dir, 'private/baseline-417914abe589.sfc')));
const events = JSON.parse(fs.readFileSync(path.join(dir, 'current-event-audit.json')));
const dictionary = Array.from({length: 127}, (_, i) => {
  const at = 0x1e0000 + u16(rom, 0x1efa00 + i * 2);
  return [...rom.slice(at + 1, at + 1 + rom[at])];
});
const controls = {
  0: 'null', 1: 'extended', 2: 'extended', 3: 'delay', 6: 'br',
  9: 'instant', 10: 'page3', 11: 'full', 12: 'page',
  13: 'value8', 14: 'value16', 15: 'value24', 18: 'entity',
  19: 'shrek', 20: 'fiona', 21: 'donkey', 22: 'pinocchio',
  23: 'puss', 24: 'mongo', 25: 'farquaad', 27: 'pc1', 28: 'pc2',
  29: 'pc3', 31: 'item', 32: 'dragon'
};
function text(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c >= 0x21 && c < 0xa0) result += text(dictionary[c - 0x21]);
    else if (c < 0x21) {
      const operand = [1, 2, 3, 18].includes(c) ? ' ' + bytes[++i] : '';
      result += '{' + (controls[c] ?? 'control-' + c) + operand + '}';
    } else result += decode([c]) || (c === 0xef || c === 0xff ? ' ' : '');
  }
  return result;
}

const report = events.scenes.map(scene => {
  const tables = [...new Set(scene.stringTables.map(c => c.args[0]))];
  const commands = scene.actorCommands.filter(c => [0xbb, 0xc0, 0xc1, 0xc2, 0xc3, 0xc4].includes(c.opcode));
  return {
    location: scene.location, objects: scene.objects, tables,
    limits: 'String calls belong to the loaded objects, but may direct dialogue spoken by other characters. Read actor staging before attributing speech.',
    messages: commands.map(c => ({
      offset: c.offset, opcode: c.opcode, stringId: c.args[0], owners: c.owners,
      candidates: tables.map(pointer => {
        const table = cartridgeOffset(pointer, rom);
        const snes = (pointer & 0xff0000) | u16(rom, table + c.args[0] * 2);
        const at = cartridgeOffset(snes, rom);
        const bytes = rom.slice(at, at + dialogueLength(rom, at));
        return {tablePointer: pointer, stringPointer: snes, physicalOffset: at, text: text(bytes)};
      })
    }))
  };
});
fs.writeFileSync(path.join(dir, 'dialogue-context-audit.json'), JSON.stringify({
  status: 'Read-only source-table decoding; not an execution or speaker-attribution proof',
  baselineSha256: '417914abe589d25e377b774009f983867c14617cbf7a7f176c52691c8c9f2e35',
  scenes: report
}, null, 2) + '\n');
for (const scene of report) {
  const unique = [...new Map(scene.messages.map(m => [m.stringId, m])).values()];
  console.log(JSON.stringify({location: scene.location, tables: scene.tables,
    messages: unique.map(m => [m.stringId, m.candidates.map(c => c.text)])}));
}
