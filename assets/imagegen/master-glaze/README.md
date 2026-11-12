# Master Glaze generated source draft

This inactive package replaces all twenty Master Glaze native sprite slots with pixels sampled from actual built-in image generation. Root approved the native model direction: a severe confectioner with hooked nose, dark moustache, white toque, plum coat, scorched ivory apron and gold measuring spoon. The character follows the First Bakery design in `docs/bakery.md`.

The four selected source PNGs, exact prompts, generation provenance and reference hashes are kept here. They are higher-resolution pixel-style source images; the importer reduces them to native 32×32 indexed frames using the unchanged twelve-color Master Glaze palette. No body, clothing, face or prop pixels are drawn in code. The gray reference composites exist only to make partially transparent source images visible to the generator; native sampling always reads the pristine transparent sources.

## Native contract

Enemy 154 alone owns graphics 141, assembly 135, palette 190 and animation 101. All 20 slots are visible and keep their original IDs, four-cell reservation, native per-frame X/Y offsets and animation order. The 800-byte assembly size is unchanged. Headers, AI, statistics, rewards and animation programs are outside this artwork package and are not edited.

Seventeen complete generated poses cover the twenty slots. Right-facing gait frames 9–11 use exact horizontal mirrors of left-facing frames 6–8, matching the original directional relationship. The remaining sources are distinct complete figures. The selected rear and frontal opposite contacts retain the spoon in the same hand; earlier candidates that switched hands or repeated the contact were rejected and remain identified in `native-roles.json`. The corrected profile contact bends and lifts the rearward leg. Rear and profile passing poses occlude the spoon behind the arm/body; slots 1, 7 and 10 have no visible gold spoon pixels. This source occlusion is retained explicitly.

The original nonwalking slots are retained as visible pose roles, without inventing mechanics from their appearance: raised-hands hold 12; tilted/centered emphatic gestures 13–14; bowed kneels 15–17; speaking/casting-expression pair 18–19. Slot 13 is a frontal body with an upward three-quarter head glance, preserving the source-native tilted gesture. Kneels remain smaller than standing figures and use the original low Y offsets. No idle fallback or omitted role is claimed.

`native-frames.html` shows every slot at 1× and 4× with authored offsets; `motion.html` runs the four exact native walk lists and four native action lists. Its 6 Hz clock is an inspection aid, not a replacement for cartridge timing. The muted source ivory needed a material sampling palette to reach the existing ivory/gray indices rather than peach skin indices. This affects quantization only; the hardware palette remains byte-identical.

## Reproduction and evidence

Run `node assets/imagegen/master-glaze/reproduce-draft.mjs` from the project root. It verifies all frozen inputs, recreates the exact reference composites, imports only this inactive spec, and proves all twenty 4bpp reconstructions, authored cell coordinates, compression round-trip and final binary hashes. It never writes the active registry or a ROM. The source packet assumes the repository's recorded Node dependencies; the manifest records the relevant importer/compiler dependencies.

The candidate uses 5,728 raw graphics bytes, 3,965 compressed bytes and 800 assembly bytes. Compared with the original native bank, decoded growth is 960 bytes and compressed storage falls 441 bytes. The original conservative whole-location union reaches 20,576 bytes with this candidate, below 32 KiB; this does not prove all later source-art combinations. The existing strict original-size guard should remain until root chooses the proven raw-ROM streaming path or validates complete current scene residency.

`verify-native.mjs` performs a separate, isolated native proof on the pinned saved cartridge recorded in `native-verification/manifest.json`. It creates an in-memory overlay in a proven unused expanded mirror region, preserving the active file. It verifies all 20 uploaded frames, palette 190, original offsets and every opaque PPU pixel. This is an isolated upload proof, not a complete Bakery battle or chapter acceptance run. Production activation, storage selection and complete-scene validation belong to root.

`private/` contains original-ROM pose inspection only and is ignored. Original source-game artwork is not part of the selected source packet or generated sprite pixels.
