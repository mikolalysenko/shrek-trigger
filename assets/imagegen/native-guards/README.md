# Native Duloc guards — inactive source packet

This package replaces the original Guard/Sentry graphics with an image-generated human Duloc civic soldier. The visor, short plume, red cloth, round shield and sword remain readable in the original twelve-color palettes. Palette 15 supplies the original spectral purple Sentry. There is no machine redesign, palette edit, procedural anatomy, extra sprite cell or active cartridge change.

The three owners are enemy 49, enemy 50 and NPC 75. They exclusively share graphics 78, assembly 33 and animation 25. All 26 nonblank slots are present. Twenty actual generated source poses supply the slots; the six original mirrored roles use whole-source reflections. The four original 16×16 cells cover every sampled opaque pixel without overlap. Both compact windups and the three sword sweeps were corrected through image generation. Rejected source cells remain documented and are not imported.

Open [the native contact sheet](review/contact-sheet.html), [the enlarged roles](review/role-review.html), or [the motion comparison](review/motion-review.html). The motion page defaults to 1× and compares original/candidate pixels with original frame order and durations. It is an offline review, separate from the executed cartridge evidence.

## Native evidence

- 78 exact uploads: all 26 slots for NPC 75 and both enemy owners, with 312 exact cells, both unchanged CGRAM ramps and 32,649 exact displayed source pixels.
- All 84 original owner/direction/mode cases, 7,200 executed native ticks, zero request-to-display delay. Animation 25 frame and duration bytes are unchanged.
- The original cell breakout, guard battle and return to exploration complete with controller input.
- The original countdown and Donkey rescue reach room 30 and display both knocked-out NPC 75 guards using frame 25. Original `AC 19` event consumers in rooms 30, 71 and 72 are recorded.
- The original Northern Ruins encounter loads two Sentries, accepts Swamp Belch through the native tech menu, consumes MP, defeats both 1,280-HP targets and returns to the field. No physical-immunity claim is made. The actual fight retains normal spectral effects and party occlusion.
- The original festival NPC and Dream Project room initialize and act. The latter simultaneously loads the palette-14 field guard and palette-15 Sentry.

These are diagnostic entries to unchanged authored scenes, followed by controller input. They are not claims of a continuous new-game route or complete ending. The isolated preview proves fully visible source pixels; scene captures separately record original occlusion and rendering effects. Independent emulator acceptance belongs to production integration.

## Resource contract

The final bank is 9,088 decoded/raw bytes, 6,646 compressed bytes and 1,040 assembly bytes. The original bank is 7,104 decoded / 5,719 compressed, with the same assembly length. A selected graphics-78 native stream is required; the general decoded-size guard must remain in place. Storing the full raw stream plus compressed delta adds 10,015 ROM bytes before alignment. It adds no WRAM or VRAM.

`draft/family.json` records each four-cell placement. The 64×64 source staging canvas uses origin `[32,52]`; compilation applies the recorded `anchor:[0,12]`. Original opaque bottom positions are preserved, with horizontal center rounded by at most half a pixel. The fallen pose is a compact 36×16 body versus the old 42×26 silhouette. The rear sword sweep uses a documented 0.97 uniform sample of the complete generated pose. No anatomy is cropped to fit.

The pinned private baseline is `e4c95d0481930abd79320855dbc5a2f8f9f2c018ac2e881c91ee2456d846d001`; the private candidate is `3e391158bb31e62de259da97c188586e47342c3c74279b95dfba08294ceb1aac`. Its raw and compressed copies occupy verified unused mirror space only. Active ROM, source registry, headers, AI, stats, palettes, scene events and native streaming helper code remain untouched.

## Reproduction

Run `node assets/imagegen/native-guards/reproduce-draft.mjs` from the project root. It imports only the inactive spec, compiles exact 4bpp/assembly bytes, rebuilds the review and verifies the frozen hashes. The user-provided ROMs in the ignored `private/` directory and `.local/chrono-trigger-usa.sfc` are required for original comparison and native execution; no ROM is included in the whitelist.

`verify-native.mjs`, `verify-motion.mjs` and `verify-scenes.mjs` reproduce the bounded native evidence. `freeze.json` and `reproducibility-files.txt` define the minimal selected packet. `integration-proposal.json` defines the future activation contract; it does not activate anything.
