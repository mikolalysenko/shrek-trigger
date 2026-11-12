// Private read-only extraction for the recorded ownership/context audit.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {u16, u24} from '../../../engine/rom.js';
import {cartridgeOffset} from '../../../engine/expanded-rom.js';
import {decompress} from '../../../engine/compression.js';

const dir = import.meta.dirname;
const rom = new Uint8Array(fs.readFileSync(path.join(dir, 'private/baseline-417914abe589.sfc')));
assert.equal(createHash('sha256').update(rom).digest('hex'), '417914abe589d25e377b774009f983867c14617cbf7a7f176c52691c8c9f2e35');
const results = [];
for (let location = 0; location < 512; location++) {
  const eventId = u16(rom, 0x360008 + location * 14);
  try {
    const offset = cartridgeOffset(u24(rom, 0x3cf9f0 + eventId * 3), rom);
    const decoded = decompress(rom, offset);
    results.push({location, eventId, offset, bytes: Buffer.from(decoded.bytes).toString('base64')});
  } catch (error) {
    results.push({location, eventId, error: String(error)});
  }
}
fs.writeFileSync(path.join(dir, 'private/current-events.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify({attempted: 512, decoded: results.filter(x => !x.error).length, errors: results.filter(x => x.error).map(x => x.location)}));
