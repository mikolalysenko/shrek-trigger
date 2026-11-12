# Wisps and workshop residues — frozen inactive source

This packet covers gfx 102 / asm 64: Lost Wisp 102, Gilt Wisp 104, Sour Slime 105, Lye Slime 106, Ash Slime 107 and Cinder Slime 108. All 13 native slots, four cells, full size byte 0, original headers, AI, stats and event behavior remain unchanged. The two wisps keep animation 157; the four residues keep animation 52. Root owns integration.

All five palette packets (70, 72, 73, 74, 75) remain byte-identical to original CT. Palette 72 also belongs to enemy 71; palette 70 also belongs to enemy 127. The private proof writes no palette bytes and checks those unrelated owners' headers, graphics and assemblies unchanged. Source sampling uses cyan as the logical index-5 core highlight; emitted palette 72 still has its original lavender index 5. This changes source-to-index matching only.

Three unchanged built-in imagegen PNGs supply 13 selected source poses. `source-wisps-v1.png` cells 0/1/2/3/4/6/7 supply the hover, sweep, curl and two motes. `source-creeping-v1.png` cells 0–4 supply the low residue phases and splash. `source-stretch-v2.png` supplies the corrected 48-pixel stretch. The original sheet's wider stretch is excluded. No anatomy, effect pixels, clothing or faces are drawn by code; no native slots are mirrored or collapsed. Nearest sampling is uniform per pose. Only the tiny native mote 12 uses area sampling to preserve its seven-pixel height.

`residue/import-spec.draft.json` reproduces the 13 indexed source images. `residue/native-frame-map.draft.json` records the complete native map, authored cell origins and XY offsets. Every original total silhouette height and lowest opaque Y is exact; horizontal centers round by at most half a pixel. Explicit width changes include curl 22 vs 27, stretch 23 vs 31, larger mote 11 vs 16, side splash 27 vs 20 and tiny mote 6 vs 8 pixels. The new larger mote is an upright diamond; its original role was a flattened glint. Both root and art lead approved the model and width differences.

The bank is **3,424 decoded / 2,758 compressed / 520 assembly bytes**, 107 tiles. It fits the original 3,616-byte ceiling and uses ordinary decompression and the original cache. Against original CT: −192 decoded / −61 compressed-plus-assembly bytes (−62 aligned). Against cb2983 earlier art: +288 decoded / +1,095 compressed-plus-assembly bytes (+1,094 aligned). No raw stream selection, extra WRAM or extra VRAM is needed. Keep the default decoded guard strict.

Source reproduction:

```sh
node assets/imagegen/workshop-residues/prepare-draft.mjs
node assets/imagegen/workshop-residues/review-draft.mjs
node assets/imagegen/workshop-residues/freeze-draft.mjs
```

`freeze.json` separates selected minimal source files from proof runners/manifests. Expanded native screenshots, traces, APNGs and private ROM stay in `.local/qa/workshop-residues-native-proof/`. Private addresses are proof-only; production must use its allocator.

Native evidence on cb2983 baseline / fd1336e2d6d7 candidate: 78 exact owner/pose uploads, 312 cells and 20,376 opaque pixels. Both complete animation tables remain unchanged. Fifty-four native cases run 108 cycles / 6,296 video ticks with exact VRAM and OAM every tick. All four direction blocks match within each program; every valid action runs for each owner and movement runs in all four directions. Native slot 12 is not referenced by either AA program, so its full-table preservation and display are proved without inventing a combat role.

Actual Lab 32 route 224→225 completes four original battles, spends native magic MP against five Lost Wisps, earns the recorder and exits normally. Factory 230 completes its terminal and original five-residue ambush, native damage/victory and flag 101. Original Gilt Wisp scene 70 and Ash/Cinder scene 291 initialize with correct palette/program/cache ownership; these are not full battle-route claims. Native battle motion captures contain 120 wisp frames and 160 residue frames at 60 Hz. All fixtures preserve cartridge bytes and exact undo.

The conservative nine-scene original-load union peaks at 8,544 / 32,768 bytes. Actual field heaps: road 8,160; factory 4,384; scene 70 8,544; scene 291 6,880. These figures use the saved published baseline and do not assume newer private art. Production placement, independent emulator execution and remaining campaign routes are integration checks.
