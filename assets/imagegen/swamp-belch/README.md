# Swamp Belch source packet

The eight-cloud atlas is an actual imagegen output. The cartridge uses its final cloud, sampled into 64×64 pixels with three opaque SNES colors and transparency, then enlarged exactly 3×. Its contour is derived from those same pixels. The native script grows the contour, holds it, then lifts and contracts it using the existing effect renderer.

`source-v1.png`, `prompt-v1.txt` and `provenance-v1.json` retain the source and original study record. The historical provenance describes the study before integration; `integration.json` records the accepted cartridge use and validation.

Reproduce the indexed artwork and active module:

```sh
node assets/imagegen/swamp-belch/build-preview.mjs
node scripts/import-swamp-belch.mjs
```

The sampler also exports optional 32-pixel previews and all eight source phases. Only phase 7 of the 64-pixel variant is used in the cartridge. Those optional previews consume no ROM space. No manually drawn cloud replacement or runtime image generator is used.

See [native implementation](../../../docs/swamp-belch.md) for memory, CPU guards, animation and test coverage. `reproducibility-files.txt` is the minimal source packet; the much larger local study/review directory is intentionally excluded.
