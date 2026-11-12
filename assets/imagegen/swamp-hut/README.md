# Swamp home (present-day world map) — generated art pass

The user said the world-map swamp home looked like a placeholder: it was a plain brown cabin drawn from code rectangles. It is now a mossy tree-stump hut, generated with OpenAI `gpt-image-2`.

- **Generation.** A guide + mask edit of `sources/guide-hut.png` with `prompts/prompt-hut-v1.txt`, drawn inside the native footprint. The request ID is in `generation-log.jsonl`.
- **Conversion.** `node scripts/import-swamp-hut-art.mjs` converts `sources/hut.png` into `content/swamp-hut-art.js`. It area-averages to 32×32, clips to the footprint, maps to world palette row 3 and adds a near-black outline. The round door and window are hand-finished, because they are too small to survive the resample.
- **Footprint.** It is the original house's four world metatiles (`9D 9E AD AE`) in present-day world assembly 0. Their top-right 8×8 and bottom-left 16×8 cells are empty, so the art leaves those clear. The pixels go into Codex's cloned present-day house bank (graphics 42), so other eras are unchanged.
- **Palette.** Row 5, the original house row, is shared with buildings and has only teal greens; the moss came out brown in it. Row 3 is the map's own foliage palette. Only the hut's fourteen tile words in present-day assembly 0 switch from palette 5 to palette 3, and no palette colors change.

`review/` has the generated options and an 8× before/after.
