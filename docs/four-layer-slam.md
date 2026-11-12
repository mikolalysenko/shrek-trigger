# Four Layer Slam

Shrek's seventh single tech replaces Confuse with three body blows and one finishing throw. The original four damage rolls, their aggregate, one-enemy targeting, 12 MP cost, prerequisites and combo records remain unchanged. The native damage displays show all four hits. There is no new status or persistent displacement.

The complete animation runs in the cartridge. Its 239-byte program fits inside Confuse's exclusive 250-byte scene at `CE:0E96–0F8F`; the eleven unused tail bytes remain exact. Source-byte, channel, header, subscript and resource ownership guards reject an incompatible base. The scene borrows unchanged resident Rock Throw resources and the existing lift/impact sounds, adding no graphics, samples, palettes, cells, WRAM or VRAM.

The caster and target synchronize through native counter B. The first three impacts leave the target grounded. The finishing grab lifts it sixteen pixels, then Shrek rises another twenty-four pixels with the enemy overhead. The target reaches forty pixels total before the slam. Both return to their original coordinates and clear their height locks before the action ends. Flying, large and rooted targets use the stationary version; Shrek approaches the original 7:1 caster/target point so a large body cannot hide the strike.

The existing Piledriver selector at `C1:4617` now recognizes techs 4 and 7. That change grows its shared helper from 97 to 101 bytes; it adds no hook boundary. The helper still preserves CPU state, the original miss selector and every unrelated action. Its allocated bytes are counted once in the Piledriver audit; Four Layer Slam records its shared dependency.

## Verification

Cartridge `2dfb1bdb243fceff45293869ac50c7fec32bd1db4418b2f7ffa67fc1f5ac438c` passes the browser core's six casts: all three party positions, an eight-cell enemy, anchored Milenko and a lethal clown hit. Tests observe all four native damage displays, each computed hit plus its sum, the native HP commit, lift timing, resident sound calls, unclipped audio and exact actor cleanup. The five surviving-target cases also accept Eye Lasers. The shared selector test covers all 256 enemy headers, all party slots, both techs, misses, invalid targets and unrelated actions.

Snes9x and bsnes each run five controller-driven casts in original encounters: the two clowns from all party positions, their Milenko fusion and the multipart tank. Runs cover 43,100 and 43,089 frames respectively. They check all four damage values/displays, actual HP changes, native grab/landing captures, cleanup and the next Eye Lasers turn. Test setup equips a starter weapon and power 20 so the first cast leaves a target alive; it ends before entering each scene. A separate browser test retains the strong loadout to check a lethal hit. These diagnostics do not establish normal-level balance or a complete campaign run.

Run `node --test tests/four-layer-slam.test.mjs tests/swamp-piledriver.test.mjs` and `npm run test:four-layer-cores -- all`. Evidence is under `.local/qa/four-layer-2dfb1bdb243f/`; the original Piledriver also receives independent-core regression checks because it shares the selector. Physical hardware remains untested.

In the browser, choose **Combat sandbox → Level 60 test party**, then **Layer Slams** in Shrek's native Tech menu. Retry restores the same initial machine state; Return restores the prior game. The review gallery includes the full native animation and still frames.
