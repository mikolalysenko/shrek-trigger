# Waffle Toss

`source-v2.png` (OpenAI Images API, `prompt-v2.txt`) supplies Donkey's tumbling waffles for single tech 17 (Waffle Toss, formerly Flame Toss): the first row, cells 0 and 1. `source-v1.png` came back with the same dark glowing background and is kept for provenance.

Sampled with

```sh
SIZE=16 node scripts/sample-effect-art.mjs assets/imagegen/waffle-toss/source-v2.png 2 2 14 70 \
  '{"1":"f8f8f8","2":"787850","3":"382818","4":"f8b850","5":"805818","6":"a87828","7":"403018"}' preview.png frames.json
```

into Flame Toss's own effect palette (OBJ palette 0, indices 1-7), so the native palette and every other fire effect are unchanged. Frames live in `content/tech-effect-art.json`.

## Status (November 8)

Not yet wired in. The first attempt replaced only Flame Toss's first effect graphics chunk (235), but a cast decodes chunks 235–238 (trace: `CD:1368` with X = 235, 236, 237, 238, then 0 and 1), and the visible flame trail draws from the later chunks with its own cell layout. The redraw needs all four chunks (or the trail's own assembly) replaced while tech 17 is active. Until then Waffle Toss uses the gold color theme on the native flames.
