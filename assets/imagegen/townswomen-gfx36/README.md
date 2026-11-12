# Storybook townswomen — frozen inactive graphics36 candidate

This packet replaces the original townswoman family with an ordinary adult storybook civilian: tied kerchief, low brown bun, rolled linen sleeves, cool ivory apron, slate bodice, full skirt and flat shoes. She has no permanent trade prop or celebrity identity. All art is sampled from saved built-in imagegen PNGs; no anatomy, facial pixels or effects were painted by code. Nothing here registers active art, changes engine/content files, writes a canonical cartridge, or changes title/music.

The immutable audit/proof baseline is published `0758f532bcbf0322997553f1e11b40463e15ab463a54555e4a624b4cd4bacd3f`. The final private candidate is `eabf983889993b502a41c6eb1332766064fe881523ab44167a36110cddc88471`. Root later published townsfolk/parade fixes as `417914abe589d25e377b774009f983867c14617cbf7a7f176c52691c8c9f2e35`; this packet deliberately retains its earlier pinned evidence.

## Ownership and native contract

Graphics36 / assembly25 / animation16 has exactly NPC13,40,213, with exact source palettes9,131,8. No graphics/assembly alias or additional owner exists. The palettes remain byte-identical to original USA, including other palette9 users and palette131 NPC21. Separate Granny NPC37/215 shares animation16; her graphics249/assembly231 and every animation byte remain untouched.

All21 original nonblank slots remain distinct: four idles, genuine opposed gait contacts, passing phases, startled16 with real source sweat droplets, front/rear raised17/18, and left/right seated hands-in-lap19/20. The latter are seated poses, not the earlier Granny wrapper labels bow/recoil. Six whole-raster mirror relationships are explicit; seat20 is exactly mirror19 with dx+1,dy−1. Every original visible foot bottom is preserved. The source map distinguishes authored source poses from mirror adaptations.

All168 original signed XY bytes are exact. There are four16×16 native cells, size0, no overlaps, no clipped pixels, no extra WRAM/VRAM, and no private assembly slot. The64×48 authoring canvas uses origin[32,40] / anchor[0,8]. See `family.draft.json`, `geometry-proposal.json` and `source-details-proof.json`.

## Saved source and sampling

Five selected sheets provide15 source cells: `base-face-apron-v2.png`, `gait-source-v3.png`, `front-face-source-v4.png`, `actions-source-v1.png`, `front-passing-source-v2.png`. The original base, intermediate face source and exact reference crops remain as generation ancestry. Prompts and original tool paths/hashes are in `provenance.json`; the built-in tool was used, with no external API fallback.

AREA sampling is used except the approved passing source for native9/11: nearest sampling plus horizontal scale1.04 normalizes its rounded width13→14px while retaining genuine eye clusters. Height stays30px, with the original passing bob and foot bottom. The exact width is14px, correcting an earlier preview estimate of15px. The face/source corrections and close-foot passing correction are genuine imagegen outputs. Unselected actions-sheet cells1/3 repeated long contacts and are not mapped.

Startled16 uses union-component sampling. Its generated source has a body and four detached droplets; at native resolution these resolve into three detached8-connected groups totaling16pixels, plus441body pixels. No original-ROM effect pixels are reused. The complete457pixel pose is proven in native PPU output and the actual workshop scene.

## Cost and proof

Final graphics are4,608raw bytes /144tiles,3,100compressed bytes; assembly is840bytes. Compressed graphics+assembly total3,940, growth+882 versus both original CT and the pinned active art (2,218+840=3,058). Raw growth is+1,760 from2,848. The proven raw-stream configuration allocates a separate4,608-byte stream, so total candidate graphics+assembly+stream is8,548bytes, growth+5,490 versus the original stored packets. Production allocation remains root-owned.

All63 owner/frame native uploads pass, with23,271exact displayed PPU pixels. NPC40 executes all20 nonempty AA16 facing/mode programs through actual A6/AA/B2 dispatch, with4,800exact frame+remaining-timer ticks. NPC13/213 share those identical programs and have separate complete upload proofs. Empty mode2 stays empty. No per-frame animation-state injection is used for the timing proof.

The authored-scene checks preserve every event packet:

- Choras58: NPC13/palette9 seat20 and NPC40/palette131 seat19 appear together;371exact visible pixels each; actor heap4,672bytes.
- Family room9: NPC213/palette8 seated19 and the original recovered walking/REAR raised18 branch; seated371pixels and raised426pixels unobstructed; heap3,936bytes. Later party overlap is measured separately.
- Workshop4: actual approach and startled16; all457pixels exact including the16 detached effects; heap7,008bytes. Diagnostic story/flag entry and ordinary A dialogue advances lead through native E1 to location10. This is not a successful rescue or whole sidequest claim.
- Parade80: original NPC213 sourcepalette8→OBJrow6 at body3116 and seated19 at3133; heap16,640bytes. The camera is moved by diagnostic entry to avoid party occlusion. Other actors retain the older0758 row7 regression, already fixed separately by root; this packet does not claim correct colors for the entire parade.

All scenes begin at explicit diagnostic location/story/flag checkpoints. They prove bounded native choreography, source loading, palettes, cells and appearances—not connected chapter/ending completion or all15 static ownership sites. Independent-core production checks, updated parade integration and full routes remain root-owned. Original LARA/TABAN/Donkey dialogue strings and exact IDs are recorded for a later dialogue pass, not changed here.

## Review and reproduction

Root approved the complete21-role native sheet and opposed contacts. The lead approved the source face/costume, bounded passing sampler, all static acting roles, and actual Choras/recovered/workshop/parade appearance. Static approval is separate from the execution evidence above.

Open `review/contact-sheet-1x.png`, `review/native-palette9-6x.png` (also131/8), `review/gait-contacts.png`, and `review/motion-review.html`. The HTML motion view uses the original AA16 order/durations and is explicitly an offline source visualization; its20 list boundaries are checked. Actual native timing is in `motion-verification/manifest.json`. Scene and isolated native captures are linked in `integration-handoff.json`.

Run `node assets/imagegen/townswomen-gfx36/verify-frozen.mjs` to check the exact manifest and compile outputs. Run `node assets/imagegen/townswomen-gfx36/reproduce.mjs` to regenerate the inactive raster/geometry/4bpp pipeline and check the frozen hashes. These commands do not activate the spec. Full native proofs can be repeated with `verify-native.mjs`, `verify-motion.mjs`, and `verify-scenes.mjs` using the externally supplied pinned baseline at `private/baseline.sfc`. ROMs, save states, failed driver assertions, unselected previews and full event dumps are excluded from the minimal whitelist. Audit reconstruction also requires the documented original USA ROM and local opcode references.
