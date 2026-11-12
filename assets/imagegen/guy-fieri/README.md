# Guy Fieri training-master source art

This inactive package replaces all six training tiers with actual image-generated Guy Fieri artwork. The 133 native frame slots retain their original cell reservations, animation programs and authored X/Y offsets. No anatomy is drawn by code.

The selected sources are `source-base-v1.png`, `source-actions-v1.png`, `source-motion-v1.png`, `source-contact-v2.png` and `source-effects-v1.png`. Their exact prompts and provenance are beside them. The contact reference is an exact RGBA crop from the base atlas. The rejected first contact correction remains historical and is not consumed.

`handoff.json` gives the three import specs, native role table, six palette arrays, layer placement and budgets. The body consumes 35 source drawings; the mantle and halo each use two complete generated effects. Every effect includes the union of its source quadrant’s components, including detached flame tips. The side and rear sampling/mirror decisions are explicit in `source-roles.json`.

Review `native-frames.html` at native resolution and enlarged, and `motion.html` for the original frame-list order with authored offsets. Its 6 Hz clock is a review convenience. `walk-contact-strip.png` shows the four-step gait sequence for each direction. The rear alternate is a complete-source mirror, not a second independently generated pose. The side alternate changes the arm crossing but retains similar sole positions; it is not presented as a perfect opposing-foot contact.

All 133 native 4bpp reconstructions and the compression round trip pass. The complete bank uses 936 tiles, 29,952 decoded bytes, 21,693 compressed bytes and 7,760 assembly bytes. The original 4/8/12-cell reservations and twelve opaque colors remain. Bank 252 must use the existing native raw-ROM streaming route: ordinary decompression plus the training room’s possible props would exceed the 32 KiB heap by 256 bytes. Root confirmed that production already streams this bank; actual Guy frame uploads and practice-scene integration remain to be tested after activation.

Run `node assets/imagegen/guy-fieri/reproduce-draft.mjs` to verify selected source hashes, regenerate only the inactive preview outputs and compare the complete native bank and assembly hashes. This does not write the active raster registry or a ROM. `reproducibility-files.txt` is the minimal source/compiler handoff; `freeze.json` records hashes and expected native bytes.
