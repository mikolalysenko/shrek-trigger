# Rootlings and snapping briars — inactive source packet

The approved generated model covers gfx89 and all seven native enemy owners. Nothing in this package activates art, changes a palette, edits gameplay or publishes a ROM. `handoff.json` is the integration contract; `freeze.json` separates the minimal source files from execution proofs and expanded private captures.

| Native group | Owners | Assembly | Poses | Cells / full size | Palette IDs | Animation |
| --- | --- | --- | --- | --- | --- | --- |
| Rootling | 34, 35, 36 | 46 | 17 | 4 / 0 | 33, 32, 32 | 35 |
| Snap Briar | 38, 39, 40 | 51 | 6 | 4 / 0 | 36, 37, 38 | 36 |
| Briar Rider | 175 | 50 | 24 | 8 / 1 | 32 | 158 |

The complete bank, assembly, palette and animation ownership audit finds no NPCs, outside owners or pointer aliases. The five **current approved** palette packets are exact; they are existing recolors of CT, not the original CT colors. No palette write is required.

## Source and reproduction

Six unchanged built-in ImageGen PNGs contain 28 selected generated images. Rootling passing/extension and Briar passing/open-attack corrections replace selected earlier cells; all unselected source cells remain in the unchanged sheets for provenance. Four guard components are composed with the exact sampled Rootling for Rider poses 0–16. Six generated whole-action poses cover Rider 17–22; 23 uses the source mirror of 21. The tiny indexed ground shadows in Rider 18/19/21/23 come from the original ROM and are recorded in `briar-rider/original-shadows.json`.

`provenance.json` records prompts, unchanged PNG hashes, tool output paths, selected cells and identity references. Sampling uses nearest pixels, alpha 128 and the approved 12-color logical palette. Composition is integer translation and source layering; anatomy is never drawn procedurally.

From the repository root, with dependencies installed and the original USA ROM at `.local/chrono-trigger-usa.sfc`:

```sh
node assets/imagegen/rootlings-briars/prepare-draft.mjs
node assets/imagegen/rootlings-briars/audit-geometry.mjs
node assets/imagegen/rootlings-briars/review-draft.mjs
node assets/imagegen/rootlings-briars/freeze-draft.mjs
```

The original ROM SHA-256 is `06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9`. It is not included in the source packet. The compiler reproduces the shared 4bpp bank, compressed packet, all three assemblies, composed rasters and five palette comparison files exactly.

**The child `import-spec.draft.json` files extract source images only.** They do not describe native slot order or Rider layering. Integration must consume each group's `native-raster.json`, `native-frame-map.draft.json` and the shared `native-family-proposal.draft.json`. Preserve group order Rootling → Briar Rider → Snap Briar to reproduce the frozen shared tile dictionary. The 64×64 working canvases do not change native size flags or cell counts.

All 47 native slots remain. Rootling 15/16 reuse 13/14 with original −12 Y translation; Rider 15/16 reuse 13/14 with −8 Y translation. These are genuine native translated duplicates, not newly distinct source poses. Rider 15/16 are absent from AA158 but remain in the assembly. Exact source profile mirrors and all native timing lists are audited separately.

All original lowest opaque Y values are exact. All heights are exact except Snap Briar slot 1, which is 29 px rather than 30. Single-body centers round by at most 0.5 px; independent guard/mount composition can move the total silhouette center by up to 2 px. Every width, height and center difference is recorded in `geometry-and-guards.json`.

## Storage and native requirements

The bank is 12,352 decoded bytes / 8,079 compressed bytes, with 2,840 assembly bytes and 386 tiles. Compressed-plus-assembly growth is +2,125 bytes against CT (+2,126 after alignment), or +4,881 against pinned earlier art (+4,882 aligned). An explicit raw gfx89 stream adds 12,352 ROM bytes. These are emitted-art byte comparisons, not reclaimable-space promises; asm50’s original reservation stays allocated. No additional WRAM or VRAM is needed.

The ordinary original 8,192-byte decoded guard must continue rejecting this bank. Select **all seven owners under explicit gfx89 streaming** and use the existing extended compressed storage allocator. The source guard test rejects every incomplete owner set. Conservative original scene branch unions reach 36,320 bytes on legacy loading; with the pinned baseline's existing streams plus gfx89 they peak at 23,968, leaving 8,800 of the original 32 KiB heap.

**Do not reclaim the original asm50 source extent.** Only its 1,920 used bytes are established; its final reservation extent is unproven. The private candidate leaves the entire tail `[0x23f140, 0x240000)` unchanged. This comparison is not an allocation-extent claim. Used assembly totals being unchanged does not authorize reclaiming asm50.

## Private execution evidence

Baseline: `cb2983da9aeaa3516e34e6017a05c4a62a87cbbeead40640282272adfd4d71c5`.
Private candidate: `deb6be67607ac8ceb06da2117e45d52e72ce81d79a9a862cd6b75eec0c20a985`.
Expanded evidence: `.local/qa/rootlings-briars-native-proof/`.

- `native-display-proof.json`: 93 owner/pose uploads, 468 exact cells and 32,301 exact opaque framebuffer pixels, including current palette words and native XY placement.
- `native-timing-proof.json`: 184 action/direction cases, 368 cycles and 7,536 video ticks. Original requests and timers are unchanged. Four-cell actors have no observed display delay. Rider has 24 steady phase boundaries with a one-video-frame display delay; all eight cells coherently show the complete preceding frame. Visible timing is therefore not claimed identical.
- `native-scene-proof.json`: western Lab 16's five original formations, native damage/victory, rat restoration and exit 213; original ending-room 342 dialogue and all four Rider actions; remaining original scene initializations 47/48/285/286/393. The first ambush required a 270-frame controller dwell in its original trigger zone, bounded to 480 in the private route adapter. No event, flag or position writes are used after entry.

The Rider appears only in the original developer ending room, so this packet proves its real demonstration rather than inventing a combat encounter. Root Guard 36 has no original event load; isolated owner/pose/timing checks cover it. Remaining scene checks prove loading, palette/program pointers and heap, not complete routes. Strong development parties prove event flow and sprites, not normal-level balance. Independent cores, final allocation and production scene validation remain integration checks.

Root and lead approved all native source sheets and special poses. Label spacing was corrected without changing pixels. Full native and actual scene timing evidence is distinct from that static visual approval.
