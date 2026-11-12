import test from 'node:test';
import assert from 'node:assert/strict';
import {assertReleaseScope} from '../engine/release-scope.js';

const untested='Physical flashcart/console compatibility remains unverified.';

test('hardware-unverified releases require an explicit emulator scope',()=>{
  assert.throws(()=>assertReleaseScope(`**release-ready**\n${untested}`),/approved emulator-only scope/);
  assert.throws(()=>assertReleaseScope(`**release-ready**\n${untested}\nThe team approved emulators.`),/approved emulator-only scope/);
  assert.doesNotThrow(()=>assertReleaseScope(`**release-ready**\n${untested}\nMikola explicitly approved an **emulator-scoped release** for Snes9x and bsnes.`));
  assert.doesNotThrow(()=>assertReleaseScope('**release-ready**\nPhysical hardware checks passed.'));
  assert.doesNotThrow(()=>assertReleaseScope(`**blocked — not release-ready**\n${untested}`));
});
