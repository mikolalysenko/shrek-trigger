# Implementation notes

For the current creative specification, see [game design](game-design.md), the [decision log](decisions.md) and the [116-technique catalogue](techniques.md). [Swamp Belch](swamp-belch.md) documents the generated gas effect and its native renderer contract. These implementation notes describe the native systems; [production status](production.md) records the remaining work and per-build evidence. The [standalone SNES release plan](release-plan.md) consolidates the complete JavaScript-hook audit and release requirements, and [the release agent goal](release-agent-goal.md) is a copy-ready follow-up assignment.

The browser runs the real patched cartridge in SnesJs. The game canvas is the native PPU framebuffer. The title, cast art, text and environment changes are cartridge bytes; they do not depend on a browser image overlay.

[Mr. Worldwide](mr-worldwide.md) documents the optional late-game superboss: Pitbull in exile in a Kodiak, Alaska Walmart, reached through a greeter in Guy Fieri's lesson room.

[The native title](title.md) documents the supplied Shrek logo, original clock dial/hands, fly-in, fade and sprite limits.

`engine/patch.js` is shared by the browser and CLI build. `content/` holds stable source-slot mappings. `engine/sprites.js`, `engine/title.js` and `engine/environment.js` generate indexed pixel art and encode SNES planar tiles. The build checks every write for overlap and range, validates event compression and updates the native checksum.

## Verified data

All offsets below are headerless file offsets. HiROM CPU addresses are normally `file offset | $C00000`.

| Resource | Location |
| --- | --- |
| PC/NPC sprite descriptors, five bytes each | `$24F000`; NPC operand adds seven |
| Sprite graphics / assembly pointers | `$242000` / `$242300` |
| Animation / duration / palette pointers | `$242600` / `$242800` / `$242A00` |
| Location records, fourteen bytes each | `$360000` |
| Event pointers | `$3CF9F0` |
| Item / tech names, eleven bytes each | `$0C0B5E` / `$0C15C4` |
| Menu portraits, 48×48 4bpp | `$3F0000 + id * $480` |
| Native cinematic pointer | `$3E0003`; loader bank operand `$03006B` |
| Title object graphics / palettes pointers | `$3E0048` / `$3E0051` |
| World player graphics / palette pointers | `$06FDF0` / `$06FEA0` |
| World vehicle graphics pointer / fixed vehicle palette | `$06FDF3` / `$06F620` |
| Mode 7 resource pointer table | `$3E0006`; resource IDs are hexadecimal |

## Regression findings

The native decompressor has an eight-literal fast path when a flag byte is zero. A short all-literal final group must set an unused flag bit; an ordinary JavaScript compressor/decompressor round trip does not catch that overrun. The tests execute `C3:0557` with guard bytes.

PC tile zero must remain blank. Native empty-tile paths reuse it; placing an ear there caused repeated artifacts in dialogue windows. The asset encoder reserves it before deduplication.

Native idle lists contain one frame, an `FF` terminator and zero alignment bytes. Those zero bytes are not frame references. Treating them as frames overwrote front/back idle directions during art assignment. `tests/player-art.test.mjs` checks the seven characters’ native idle IDs and all four directions through real controller movement.

`engine/resource-pools.js` also reclaims the exact consumed lengths of replaced title, cinematic and Dragon packets. A packet is retained if its complete source pointer occurs anywhere else in the base ROM. Every reclaimed pointer must receive a replacement record before the build can finish. Dragon and final-formation compressed sprite banks use the existing ownership audit. Sparse assembly pointers that cross a bank boundary do not establish a safe free span; the large gap after the original final-boss assembly is deliberately excluded. The current raster build uses the measured 8 MiB ExHiROM layout described in [native-port.md](native-port.md), with no added WRAM or VRAM.

The allocator coalesces exactly touching reclaimed spans inside one bank before
placing new resources. This prevents the detailed party art from fragmenting
the remaining space into holes smaller than a technique's graphics packet.
Ownership proofs still apply to every source span: gaps, original padding and
bank boundaries cannot be crossed. Exhaustion diagnostics report both the
largest usable span and total free bytes.

The native actor preview also accepts the seven player sets. It uses event opcode `81` to load the selected player independently of party status, then `AC` to scrub the existing frame assembly. All seven frame maps are explicit in `content/player-frames.js`: Shrek 248, Fiona 241, Donkey 244, Pinocchio 256, Puss 245, Mongo 255 and Farquaad 254. Player regressions compare both 256-byte VRAM upload rows against original indexed artwork for every frame, including mirrored and blank tiles. Puss’s preview offers rapier, Carnival Hatchet and awakened hatchet equipment. A same-pose equipment change invalidates only his preview frame cache; the normal loader selects the matching assembly, and undo restores the complete original state.

The LZ encoder evaluates the native 11-bit/34-byte and 12-bit/18-byte distance/length formats, choosing the smaller packet. Its build-time shortest-path planner accounts for flag groups and the partial final record. Each mode is executed in the cartridge decompressor during tests, including 4,095-byte references, overlapping runs and short literal tails. No decompression code, RAM budget or runtime format is changed.

Dedicated 48×48 portraits in `engine/portraits.js` occupy the original 36-tile blocks at file `$3F0000 + character*$480`. The native menu loads all seven to VRAM byte `$4020 + character*$480` and selects the visible character’s palette at CGRAM 48–63. Tests drive the real menu, compare every tile, and check all selected palettes; the independent runners also compare displayed portrait pixels at screen (120,24).

An actor reloaded with `81` during its regular event loop retains the previous static-frame cache. The independent test first selects frame one before checking frame zero; otherwise Granny’s cached zero can survive the actor swap. The browser bench replaces the load command during initialization, where the cache starts at `FF`.

An eight-cell NPC reloaded into that four-cell preview also retains the old tile-cache allocation. The independent sky-drake check verifies that native slots 12/13 are free, assigns the pair, and releases the old slot 24 while preserving the cat in slot 25. Its OAM base and tile base match the native allocator at `C0:6FB9`; the native streamer performs all decoding and DMA. This setup is confined to the independent diagnostic. Normal chapter and browser-preview initialization allocate the eight-cell actor directly. The preview waits for the observed kitchen idle loop instead of assuming a fixed map-loading duration.

Size-class-three actors such as the tank chassis use a fixed 96-tile upload at initialization (`C0:E12A`). The regular frame builder skips them. Their one 24-cell assembly must not consume the following zero padding as a second frame. An in-place preview also has to reserve that full tile range; the ordinary catwalk scene already does so through its native allocation.

Dialogue numeric controls `0D`, `0E` and `0F` read one, two or three bytes from the separate argument stream. They have no inline operand. Compression and string-boundary scanning must preserve the next glyph, and inline zero bytes in other controls must not terminate a string. Native formatter tests cover the complete unsigned ranges.

The event pointer table has 513 entries, including the last event used by location 449. Dialogue reclamation checks this full table and all known `B8` table commands before releasing replaced strings. It reserves every original 512-byte pointer table and protects live suffix aliases and complete direct pointers elsewhere in the ROM.

Party flags descend from bit 7 to bit 1 in the native table at `FF:F9BB`. The joined-character mask at `$7E29AF` must not use `1 << character`; Shrek is `$80` and Farquaad is `$02`. The roster has nine slots at `$7E2980`, with bit 7 marking inactive entries. Native recruitment and return-from-jump tests now check this convention. Naming screens use Start to accept the existing name; repeated A presses type letters.

Regular field scripts dispatch at `C0:5AA3`; `C0:5900` is initialization. The development warp injects an `E0 ChangeLocation` command at the regular dispatch. Native `E1` transitions also pass after fixing the emulator's vblank-status/NMI ordering; `E0` retains a useful fade for development jumps.

An undo checkpoint is taken at that CPU boundary, which may occur later within the current frame than the button press. It restores the CPU, PPU, APU, WRAM, DMA, cartridge SRAM and timing together. The serializer never stores the cartridge ROM or closures.

The opening shortcut now waits for both the bedroom event and normal walking
control, using real button input to finish the additional Shrek dialogue.
Matching but incomplete cached checkpoints are repaired through the same input
path. Field input being enabled does not by itself mean a textbox is closed:
ordinary conversations can block movement, while Mongo's repeating snore bubble
allows walking. The shared route driver waits for actual movement before deciding
to dismiss such a box. Trial tests wait for native decision mode `$0162 = 2`
and verify the selected row before confirming. The ruins driver follows the
floor around the rock after the first encounter instead of assuming that the
returned battle formation is still on the incoming waypoint.

The combat sandbox replaces a decompressed event at `C0:5703`, which runs on both initial entry and post-battle reload. Reapplying only during initial setup leaves the arena's object pointers paired with the source map event after combat. The sandbox retains native formations, statistics, AI and rewards; retry restores a complete pre-battle snapshot. Fart's guarded native helpers and the two native music arrangements are described in [combat-and-music.md](combat-and-music.md).

Size-class-2 actors ignore the incremental loader's static mode. The large-frame bench now holds an existing native animation-program byte and lets the ordinary animation queue upload it. Tests compare the displayed VRAM for all Great Milenko frames and Storekeeper overlays, rather than accepting only the requested frame register. The Storekeeper's large body remains a native background, with its original tile footprint and palette isolation; see [future-machines.md](future-machines.md).

The race's projected actors use raw indexed rows with a 64-byte stride, rather than planar OBJ tiles. Only the left 32 cart pixels or 24 Rivet pixels are sampled. The software projector and its work buffers remain native. The separate parked cart occupies 72 background tiles and its own fifteen-color row. Native controller checks cover both race modes and rare-score fixtures verify reward text against actual item IDs; see [racing.md](racing.md).

Graphics ownership does not imply palette ownership. The wisp/slime bank shares two color ramps with unrelated enemies. Its new art keeps those ramps unchanged; the family builder rejects a recolor unless all owners and pointer aliases are accounted for. The rat's NPC and enemy headers also select different native animation programs. See [future-wildlife.md](future-wildlife.md).

An eight-cell sprite need not occupy a solid 32×64 rectangle. The cave guardian uses six central cells and two side cells in a sparse 64×64 authoring canvas. Every opaque pixel must be covered by exactly one native cell; the compiler rejects missing or overlapping coverage. This retains its wide arms within the original memory reservation. See [medina.md](medina.md) for the 144-pose artwork and native scene checks.

## Current limits

All native party frame roles are assigned; their use across full campaign scenes still needs acceptance work. Remaining supporting art, signature tech effects and final encounter polish also require production work. Dragon's native travel and cinematics pass SnesJs, Snes9x and bsnes checks; her acquisition and upgrade still need full progression audits. These are targeted checks, not complete-game acceptance. Hardware validation remains pending.

- [Generated Bakery, court and machine artwork](character-art.md): nine-family integration, native cells, source manifests and extended compressed packets.
