# Sky Drakes

The drakes are generated art (OpenAI Images API, `gpt-image-2.6-sunburst`, November 7):
- **Field frames:** `source-field-v2.png` (prompt `prompt-field-v2.txt`, with the earlier placeholder as reference) supplies the four field frames through the `sky-drake` spec in this folder. It samples into the stock shared palette 129 after a recorded cyan key mask.
- **World poses:** `source-world-v2.png` (prompt `prompt-world-v2.txt`) supplies the nine overworld poses through `assets/imagegen/sky-drake-world/import-spec.json`. It samples into the eight shared mount colors, which `engine/sky-drake-art.js` maps onto indices 8–15.
- **Retired:** the earlier hand-authored `assets/raster/sky-drakes/art.mjs`.

The generated field drake has more unique tiles than the stock bank allowed in the field heap, so graphics 42 now streams raw from ROM like the other larger custom banks; its eight-cell layouts, animation 56 and palette 129 are unchanged. The overworld poses keep native mirroring, the exact 88-tile footprint and the riders' seats.

`prompt-field-v1.txt` and `generation-rejection.json` remain the record of the earlier moderation-blocked attempt. The first world sheet (`prompt-world-v1.txt`, request `req_3feb076102c94f2faadea9d5304b2168`) was rejected because it used greens; the real mount colors (read from the running game's sprite palette 4) are salmon, peach, white and browns, which v2 uses.

## Native constraints

Field graphics are gfx42/asm31 for NPC8: four frames streamed raw from ROM, with 320 assembly bytes. Animation 56 retains idle 0 for five ticks, open 1 for 40 then 2 for five, and flight 2 for eight then 3 for 16. Field story scenes are 95, 238, 261, 266, 295, 301 and 390.

The overworld mount bank remains exactly 4,096 bytes at pointer `0x6fe0e`. Only world3/slot0 selects bank10. Front/back store a 16-column half and mirror to 31 pixels wide. The third left pose stores only rows8–23 of its 32×32 canvas.

## Historical source audit

`generation-rejection.json` preserves the earlier built-in image-generation rejection. There were no retries or API fallbacks; the finished art above is hand-authored from the existing custom design, not output from that request. `native-audit.json` records the original ownership, palette and geometry audit. `review/original-*` shows the original cartridge; `review/earlier-*` is the historical procedural-design review, not a new generated-source claim. `audit-native.mjs` reproduces the native audit and review images.
