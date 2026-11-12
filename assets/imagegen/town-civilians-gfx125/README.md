# Duloc town resident — inactive gfx125 packet

The generated adult resident replaces only the artwork shared by NPC14 and NPC79. His copper hair, clean-shaven face, laced doublet and rolled sleeves suit the existing fair, inn, house, trial and ending roles without assigning a permanent trade. Root approved the native model, directional contacts, special poses and geometry.

This packet is inactive. It does not modify the live catalogue, generated engine module, ROM or server. The pinned source cartridge is `af338374669168012da0165d385209c5d3aa9789bb713ef488ef7dcb06e555a7`; the private proof overlay is `76089bdcc69d5e29eb97845d40845fe145ca7bd960e0309bc86bb870d10a3371`.

## Integration contract

- Import `import-spec.draft.json` with the existing raster importer. Its native composition combines sixteen actual generated poses, recorded whole-source mirrors/translations, and exactly three isolated original sweat pixels. No anatomy is painted in code.
- Compile the twenty resulting64×64 staging images with `full-area/family.json`: four cells, exclusive assembly188, anchor `[0,12]`. This reproduces `full-area/assembly.bin` after the anchor is applied. All original coordinate bytes except frame19 lower-left Y−9→−14 remain exact; no opaque pixel is clipped or overlapped.
- Graphics125 needs an explicit native streaming ownership contract. The selected bank is 4,992 raw bytes / 3,586 compressed bytes; assembly remains 800 bytes. Keeping both graphics representations grows storage 6,374 bytes before alignment. No extra WRAM/VRAM or assembly ID is needed. Assembly247 remains reserved for the separate gfx11 family.
- Keep both owner headers, palettes135/133, shared AA7 and unrelated asm7 exact. Both gfx125 and asm188 are exclusive to NPC14/79; palette133 and AA7 have many other owners.

All twenty slots are visible. Slot16 is startled,17/18 are seated, and19 is a real kneeling source with no observed campaign consumer. There are no blank or cap-fragment slots in this family.

## Evidence and limits

`review/role-review.png`, `gait-contacts.png` and `motion-review.html` provide labeled native and enlarged comparisons. Native proof passes 40 target uploads, 160 cells and 13,778 exact opaque pixels. Another 42 unchanged shared-resource sentinel uploads pass 12,348 pixels. Both target headers execute the original AA7 in 32 cases / 2,496 ticks with zero display delay.

Five original scenes pass after documented diagnostic entry: Truce inn12, merchant inn62, Marco158, post-parade80 and Dream Project379. They preserve the original events and reach the selected actors' original dialogue. These are bounded art/context checks, not complete natural campaign routes or endings.

The pinned parade has a separate existing row7 palette collision. NPC79/object35 uses its exact source tiles and native seating, but later initialization overwrites intended palette133. Its captured colors match the actual hardware row7, not the intended ramp. `integration-proposal.json` and `scene-verification/parade.json` record the exact CGRAM words, visible pixels and foreground occlusion. Root owns correction; this packet changes no palettes or event code.

## Reproduce

Supply the pinned cartridge at ignored `private/baseline-af3383746691.sfc` and the original USA ROM at `.local/chrono-trigger-usa.sfc`; neither ROM is distributed in this packet. With the repository dependencies installed:

```sh
node assets/imagegen/town-civilians-gfx125/reproduce-draft.mjs
node assets/imagegen/town-civilians-gfx125/verify-native.mjs
node assets/imagegen/town-civilians-gfx125/verify-motion.mjs
node assets/imagegen/town-civilians-gfx125/verify-scenes.mjs
```

The first command reuses the preserved source PNG and reproduces 21 selected import/compiler outputs byte for byte, including all twenty runtime frame strings. It does not call image generation or write active assets. The native verifier creates the ignored private cartridge/checkpoint used by the following tests.

The earlier read-only scene audit can be rebuilt with `extract-events.mjs`, `audit-event-uses.py`, `audit-native.mjs` and `audit-dialogue.mjs`; its optional external decoder and lookup dependencies are recorded in `freeze.json`. All 512 locations were attempted; eight unrelated invalid source packets remain explicit errors.

`reproducibility-files.txt` is the minimal selected whitelist. Unselected nearest samples, failed diagnostic approaches, private ROMs/states and redundant screenshots remain excluded. Production placement, current-cartridge independent cores and final activation belong to root.
