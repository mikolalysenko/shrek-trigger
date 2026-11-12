# Storybook town tradesmen — frozen inactive source packet

This packet replaces graphics35 for NPC25, NPC39 and NPC52 with one flexible human tradesman model. The headband, dark moustache, green waistcoat and blue trousers distinguish him from the capped town keeper. The original jobs and story roles remain: smith, carpenter, workshop father, inn patron, fair host and ending civilian. No permanent trade prop or new celebrity identity was added. Root approved the model, all31 roles, opposed gait and source-driven cell geometry; the art lead also approved the actual hammer and seated-drink scene appearance.

Five actual built-in imagegen outputs and their prompts/provenance are retained. Four selected sheets provide23 sampled source poses; whole-raster mirrors cover eight additional native roles. No procedural replacement anatomy, painted facial features, blank substitutions or fallback frames are used. The first base is retained as a generation reference; its failed gait alternatives and the sampling experiments are excluded from the selected map. The approved face correction and isolated opposite profile contact are genuine source edits.

## Exact native contract

- Graphics35, assembly24, animation15;31 nonblank native slots and all three NPC headers unchanged. Assembly24 and graphics35 have no other owners or pointer aliases. No private assembly slot is needed.
- Original twelve-color palettes9 and133 remain byte-for-byte exact, including all other shared owners. Palette9 has11 NPC header owners; palette133 has43, including reserved/default headers. Header ownership does not imply scene visibility.
- Four16×16 native cells, size0, build canvas64×48, origin[32,40], anchor[0,8]. No new VRAM or WRAM reservation.
-18 poses retain original cell XY.13 poses move only an original upper/lower cell pair by1–3px to cover the real generated source;210 of248 XY bytes remain exact. Actor anchors and complete source pixels remain fixed. Five frames have overlapping cell rectangles; only three opaque samples overlap, and all agree under original OAM order.
- Every original animation15 frame and duration byte is retained, including empty mode2,15-tick gait phases,10-tick hammer phases and15-tick drink phases. Seated versus standing cups, empty seats, distress and raised-hand roles stay distinct.

The exact proposal is `family.draft.json` plus `geometry-proposal.json`; source selections, scale, mirrors and translations are explicit in `draft/import-spec.draft.json` and `native-role-map.json`. Root owns activation. Do not activate an import spec or copy the private ROM as part of source review.

## Cost and fingerprints

Raw graphics are10,112 bytes; compressed graphics6,199 plus assembly1,240 total7,439 bytes. Both original USA and the pinned active art were3,936 raw /2,802 compressed +1,240 assembly. Growth is therefore +6,176 raw and **+3,397 compressed+assembly**. The proved integration contract additionally allocates a separate10,112-byte raw stream; it is safely below32KiB. The old decoded allocation must not be used for this larger bank.

| Artifact | SHA-256 |
|---|---|
| Raw graphics | `e1c2ac0fed846720b1897a9e1a39df5f02797c635ab440ba769aba048c8bcc9f` |
| Compressed graphics | `2d1d50ebaa8071344ea312e6bb7230eff0de7070f5f1306480aea6c0db9bafe6` |
| Assembly24 | `4c5065aa61f080c5e23e1e4deb82b514be12d2da830e229d30710a3b9be35180` |

The original audit used cartridge5606e43282e0. Final native evidence uses immutable **af338374669168012da0165d385209c5d3aa9789bb713ef488ef7dcb06e555a7**; every relevant graphics/assembly/header/palette/AA resource was rechecked unchanged before the private overlay. The exact private candidate is **fc9fa6cd47aabe251f9a2d5363f6409d909ea9e883bb563a55a69c07fc6d9e36**. Root explicitly retained af338 after publishing the21-byte Get Up correction; no newer canonical ROM was substituted.

## Verification and limits

Source→4bpp→assembly reconstruction covers12,860 indexed opaque pixels exactly. Native JS proof passed **93 owner/frame uploads and38,580 displayed pixel checks**, with settled DMA and actual82 source-header loads for every owner. Actual native A6/AA/B2 dispatch then exercised all36 nonempty facing/mode lists for **8,640 exact frame-and-timer ticks**. These are separate from the offline motion player.

Five representative original scene scenarios pass: Truce Smithy hammer; its later walk-to-table standing drink loop; Choras Inn seated drink; Telepod Exhibit staging; and the Legendary Hero throne ending's original sourcepalette9→hardware-row6 override. Target-location heap peaks are3,648 /14,464 /10,496 /5,472 bytes respectively. Native table/background priority hides some hands/cup pixels in the original scenes; every pixel was separately checked unobstructed in the isolated native proof. The scene checks use explicit diagnostic story/location checkpoints. They do not claim complete services, festival routes, all25 shared locations, a full ending or whole chapters.

The parade row7 investigation found an **earlier replacement regression**, not a defect introduced by this source packet. Original USA NPC215 has header[36,25,133,16,0]. On af338 it is[249,231,138,16,0]. The unchanged scene80 body3191 copies that palette into shared row7 after NPC39/body3160, recoloring all source133 actors. NPC0 also changed133→139 and writes earlier at3101. Actual USA, af338 and candidate runs prove original row7 stays133 while both modified cartridges end at138. NPC0, NPC39 and NPC215 appear together; NPC79/gfx125 and NPC215 also appear together. Row4 is unused in the three observed post-parade camera views, while other rows remain assigned even when their actors are offscreen. A safe fix and broader phase checks belong to root. `parade-palette-sharing.json` and `parade-row-ownership.json` preserve exact headers, command order/timing, row occupancy and screenshots. The packet does **not** claim correct parade source colors.

Small facial details remain limited by the32px body. Source silhouette, costume, posture and prop changes carry the model. Independent Snes9x/bsnes verification, production allocator integration, all shared ending branches and the inherited palette correction remain root-owned. The separate audit records the existing BAKER/TABAN dialogue inconsistency with exact location/string IDs for a later dialogue pass; this art packet changes no text.

## Reproduction

Run from the repository root, with the source files in `source-whitelist.txt` and the shared importer/compiler dependencies recorded in `integration-handoff.json`:

```sh
node assets/imagegen/town-tradesmen/prepare-import.mjs
node assets/imagegen/town-tradesmen/prepare-geometry.mjs
node assets/imagegen/town-tradesmen/compile-draft.mjs
node assets/imagegen/town-tradesmen/build-review.mjs
node assets/imagegen/town-tradesmen/verify-frozen.mjs
```

The importer invocation is preview-only and never writes the generated registry. Native replay additionally needs the locally held immutable af338 ROM at the path in `proof-baseline.json`; ROMs and emulator states are excluded from the source commit:

```sh
node assets/imagegen/town-tradesmen/verify-native.mjs
node assets/imagegen/town-tradesmen/verify-motion.mjs
node assets/imagegen/town-tradesmen/verify-scenes.mjs
node assets/imagegen/town-tradesmen/verify-parade-sharing.mjs
node assets/imagegen/town-tradesmen/audit-parade-rows.mjs
```

The final two commands also require the original USA ROM locally for the comparison (the row-occupancy command uses the saved af338 checkpoint created by the comparison). Review entry points are `review/contact-sheet-1x.png`, `review/native-palette9-6x.png`, `review/native-palette133-6x.png`, `review/gait-contacts.png`, `review/geometry-review.png` and `review/motion-review.html`. The exact minimal handoff and file hashes are in `source-whitelist.txt` and `freeze.json`; private ROMs, states, exploratory samplings and failed initial scene probes are excluded.
