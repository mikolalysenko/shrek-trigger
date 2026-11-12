# Scavenger rats — frozen inactive generated source

This packet replaces only the shared gfx105 / asm68 artwork: Scrap Rat enemy134, field NPC164, and Gremlin enemy135. Root owns activation. NPC164 keeps program44; both enemies keep97. Palettes84/85, full size0, four cells, all13 slots, headers, AI, stats and original events stay unchanged.

The selected source is `source-v1.png` cells0/1/2/3/7 plus `source-profile-v3.png` cells0/1/2. Both are unchanged built-in imagegen rasters with saved prompts and provenance. The wider first-sheet profiles and an intermediate profile-v2 trial are excluded. Whole-source horizontal mirrors are used only for five exact mirrored pairs found in the original bank. No anatomy, clothing, face or tail pixels are drawn by code. Nearest sampling uses per-pose uniform scale calibration; no nonuniform scaling or clipping is used.

`rat/import-spec.draft.json` reproduces the8 indexed source poses. `rat/native-frame-map.draft.json` maps them to13 unique native images and records all authored cell origins and offsets. Every original total silhouette height and lowest opaque Y is exact; horizontal center rounding is at most0.5px. Passing profiles7/10 narrow from32px to24px with their more upright bodies and curled tails. The original baked dark ground-shadow pixels are not copied; the bottom anchor describes the full original silhouette, not a separate anatomical foot joint.

The bank is **2,560 decoded /2,039 compressed /520 assembly bytes**,80 tiles. Against original CT: +192 decoded and +244 compressed+assembly bytes. Against the immutable e136 earlier art: +576 decoded and +1,031 compressed+assembly bytes (+1,032 after word alignment). Explicit gfx105 streaming is required; preserve the default original decoded-size guard for unselected families. Source width/height is64×64 only for sampling/packing, with the original four native16×16 cells and no added WRAM or VRAM.

Source reproduction:

```sh
node assets/imagegen/scavenger-rats/prepare-draft.mjs
node assets/imagegen/scavenger-rats/review-draft.mjs
node assets/imagegen/scavenger-rats/freeze-draft.mjs
```

`freeze.json` lists the selected minimal source files separately from native proof tools and manifests. Expanded screenshots, APNG, traces and private ROM live under `.local/qa/scavenger-rats-native-proof/`; private addresses are not integration instructions. `handoff.json` gives exact compiler dependencies, owner contracts and resource deltas.

Native evidence on e136 baseline /eaa494d1fb07 candidate:39 owner/pose uploads,156 cells,13,434 exact opaque pixels.55 native action cases run110 cycles /2,122 video ticks with exact VRAM and OAM every tick. NPC44 contains additional shared lists referencing13–25 for unrelated owners; those untouched lists are intentionally not invoked for the rat's13-slot bank.

Six Lab16 theft branches pass with original item/gold behavior, followed by the real password-rat warning, dash, capture and reward. The96-frame patrol capture occurs before theft contact. Every approach through contact has exact requested/source VRAM frames; post-retreat raw cache snapshots are retained as diagnostics and do not establish visible timing. Original locations91 and164 additionally prove shared NPC/Gremlin initialization, programs, palettes and heap, without claiming their full story or combat routes. All scene tests preserve cartridge bytes and exact fixture undo. Static branch-union heap is at most15,264/32,768 bytes after selecting gfx105 on the saved baseline; newer private art is not assumed.

Root and the art lead approved the complete native model and the compact profile gait. Production allocation, independent emulator execution and broader encounter coverage remain root integration checks.
