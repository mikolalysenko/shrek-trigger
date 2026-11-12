# Swamp Belch

Swamp Belch replaces Luminaire's presentation with a generated, translucent green cloud. It grows around the enemy group, holds briefly, then rises and contracts. The original Air damage formula, all-enemy target list, 20 MP cost, prerequisites and combination data remain unchanged. It adds no poison or other status. The two sound cues use Fart's existing falling-buzz sound 253 and resident sample.

This runs entirely in the cartridge. The browser's combat sandbox selects native tech 8 through the same menu and battle engine as normal gameplay; its CPU hooks only observe the action. `battle.tech` diagnostics now identify the acting slot as well as the tech ID.

## Source artwork and native representation

`assets/imagegen/swamp-belch/source-v1.png` contains eight actual imagegen cloud drawings. The accepted effect samples the final drawing into 64×64 indexed pixels, using three opaque colors plus transparency, then enlarges it exactly 3×. The source SHA256 is `57e2e1bf18b86af2d41a75c710811f189bf15c7f055863d74f626afbb1a4a6ea`. The exact prompt, provenance, sampling code and indexed source are retained. No code-drawn replacement shapes are used.

The 192×192 image occupies 227 distinct 2bpp tiles inside the existing 4KiB BG3 upload. Four native 512-byte quadrants position it on the original 256×256 tilemap. The effect selects 8-pixel BG3 cells, and the existing message-region display mode is preserved. Native half-add color math keeps the scene and enemies visible through the gas. The original reserved blank tiles EE/EF/FE/FF stay blank.

Its silhouette comes from the sampled source's left/right bounds on each row. The 65816 helper builds 65 floor and 65 ceiling coordinates in the original circle renderer's B800 scratch buffer, then emits the existing B900 window pairs. It uses integer lookup and remainder stepping, with no hardware multiply or divide and no added WRAM/VRAM. All 100 radii are checked against an independent integer reference in all three player slots. The largest isolated helper cost is 25,736 CPU cycles. An instrumented live cast measured 197,084 master ticks, including any interrupts, against 357,368 master ticks per NTSC frame.

## Isolation and cleanup

Every shared engine boundary checks player slot 0–2, action type 2, tech 8 and background 1. The script selector additionally requires native slot 0 and the original D1:A011 script pointer. Unrelated spells, enemies, backgrounds and combination records keep their original data and execution.

| CPU boundary | Replacement |
| --- | --- |
| CD:0FA9 | Copy each of four existing 1KiB background chunks |
| CD:1004 | Stage four quadrant maps and the private three-color rows |
| CD:1655 | Select a private native background script |
| CD:3189 | Build the source-derived gas silhouette in existing scratch space |
| C1:61A4 | Substitute only the two original Luminaire sound cues |

The 126-byte background script retains the original caster synchronization and renderer cleanup. It uploads quadrants while the mask is closed, expands, holds and lifts the cloud, then uses the original end-of-effect handshake. The native caster and target scripts remain untouched. Cleanup tests wait for the actual native completion state; a fixed frame count can expire while a prior enemy action is still running.

The build allocates 6,970 payload bytes, 6,972 with alignment, for tiles, quadrants, contour, script and five guarded helpers. No extra sample, sprite, DMA channel, WRAM or VRAM reservation is needed.

## Validation and remaining scope

Cartridge `e13648757bbeee05dff8ff1cd0048b9cf60c13a24851c5625d7f3623adf06500` passes five focused tests: unchanged mechanics/shared resources, exact reconstructed background pixels, all radius masks, alias/CPU-state guards, long-branch encoding and live casts. The live cases cover Shrek in every party position against three enemies, plus Great Milenko, native damage, discounted MP cost and renderer cleanup. The focused Fart/Eye Lasers regression also passes; its initial aggregate run's only failure was the new test driver's missing actor metadata, subsequently corrected.

`npm run test:swamp-belch-cores` passes 31,320 frames in each of Snes9x and bsnes. It enters the original two-clown encounter with Shrek in each party slot, verifies both targets take damage, observes native cleanup, and then verifies Eye Lasers dispatch, flame flashes and damage. Snes9x additionally compares the exact 4 KiB gas upload. The desktop/mobile browser suite passes, and the review pack contains native stills and an animated capture. A source-only staged checkout reproduces the exact cartridge; Floating IPS independently reconstructs it from the 1,301,237-byte BPS.

The initial unpublished candidate exposed a shared-effect fallback error in the long chapter regression. The corrected helper recreates the overwritten JSR's return address before entering the original circle routine. Its test now executes the complete fallback and compares the window, scratch data, registers, flags and stack against the base cartridge. All 248 unit/integration tests pass on the corrected fingerprint above. The canonical cartridge, BPS and review gallery now use that same image. Complete campaign formations, special final-battle rendering and physical hardware remain separate acceptance work.

## Restored release direction

The user explicitly retained Swamp Belch over stock Luminaire. Cartridge `c874b9974ed22bfaf52e647b8aa4c5248902ac9dcb2e2c3c855ec42e926ada76` restores the cloud, its native label and sound while preserving Luminaire's Air mechanics. The effect shares its three reserved upload/palette/glint hooks with Yarn Bomb rather than installing competing patches. All twelve focused catalogue/cloud/Yarn Bomb checks pass. Snes9x passes 31,317 frames and bsnes passes 31,320, covering every Shrek party position, both clown targets, native cleanup and a following Eye Lasers cast. Evidence is under `.local/qa/swamp-belch-c874b9974ed2/`.

## Frame budget fix (November 10)

A frame-by-frame capture showed the cloud blanking every other frame for about 210 frames, against every enemy group. Review stills sampled every fourth frame, so they showed either all good frames or all black ones and hid it.

The cause was the outline helper at CD:3189. It rebuilt the scanline window from the contour on every frame, up to about 25,700 CPU cycles, roughly half a frame. Together with the rest of the battle engine the frame overran, so the native interrupt at D1:FE97 blanked the display and the following frame stayed black. Stock Luminaire fits in a frame and never takes that path.

The helper now copies precomputed rows. `swampBelchWindowTable` builds, for each radius 1 to 100, the exact bytes the old helper wrote (the same `swampBelchWindow` reference the tests compare against): a 200-byte offset table followed by 4 × radius bytes per radius, 20,400 bytes of extended ROM in total. The routine looks up the radius, then block-moves that row set to `$7E:B900 + 2 × (128 − radius)`. It uses no scratch buffer and no extra WRAM or VRAM; the fallback paths for other effects are unchanged.

- Maximum helper cost: 2,961 CPU cycles (was about 25,700).
- All 100 radii in all three party slots still match the reference byte for byte.
- Blanked frames during the cast: 0 against the Nu pack, the sparring dummy and Great Milenko (was about 105 each).
- A scan of the other techniques found no sustained blanking; Fairy Tale Beatdown (stock 3D Attack choreography) drops two isolated frames.

The block move leaves the accumulator at `$FFFF`. The native continuation at CD:35A5 loads the radius into 8-bit A and transfers all 16 bits to Y, so the helper clears A before returning; without that the window rows are still correct but the cloud is drawn in the wrong place. The row check alone cannot see this, so the test also asserts the cleared high byte, and a live test checks that the full-size cloud tints the middle of the arena and that no frame of the cast is blanked.

To repeat the scan, step the core cycle by cycle during a cast and count frames whose visible lines are force-blanked; a fixed-interval screenshot cannot see a 30 Hz pattern.
