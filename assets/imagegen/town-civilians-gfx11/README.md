This is an inactive generated-raster replacement for the shared town-keeper graphics bank 11, covering NPCs 22, 49 and 89. The character is an ordinary Duloc shopkeeper, innkeeper or civic professional; the same original model also plays Pierre in the trial. The new rounded cap, moustache, waistcoat and body are actual generated source artwork, not a recolor of the old sprite.

The two selected PNGs were made with the built-in image-generation tool. Their exact prompts, source hashes, selected cells and reference provenance are stored beside them. Nine authored poses provide sixteen directional body slots through the original whole-source mirror relationships. Slot 16 stays blank. Slots 17/18 are the upper eight rows of the sampled left-profile source and its mirror. No anatomy is painted in code.

The source and proof are pinned to cartridge `5606e43282e04214c20d55f8c72713657bebebdaacaff0864f41ab9c3dd3aaf9`. The private test overlay is `99c1e0a108b32f25240268369690e6ce76fad77e8f497aae779bdd61fb0fdd88`. ROM files and snapshots are ignored and excluded from the source whitelist.

Shared assembly 7 has 25 header owners; animation 7 has 29. The proposal reserves private assembly 247 only for NPC 22/49/89. All other headers, original assembly 7, animation 7, and palettes 9/133 remain byte-exact. All 152 signed assembly coordinate bytes are retained, with four nonoverlapping cells per frame. Parent integration must repeat the unused-slot check and activate the scoped graphics-11 raw-stream contract; the old shared assembly cannot be reclaimed.

Selected native data is 4,192 raw graphics bytes, 3,092 compressed bytes and a new 760-byte private assembly. Stored growth is 6,568 bytes before alignment, keeping the shared old assembly. Streaming removes this bank from the field decompression heap and adds no WRAM or VRAM reservation.

Verification recorded in the packet:

- 57 exact native owner/frame uploads, including three transparent slot-16 uploads; 216 cell-coordinate checks and 16,809 exact visible source pixels for the nonblank frames.
- All 48 original animation-7 direction/mode cases, 3,744 native ticks, no measured display delay.
- Six original scene cases over 23,165 ticks: present and medieval markets, a medieval inn, Medina inn, Dream Project home, and the full helpful trial through Pierre's questioning, verdict and prison intake. These begin through diagnostic entry. Shop transactions, full endings and natural campaign approach are not claimed.
- Both actual palette rows and original counter/dialogue occlusion are recorded. An initial direct Truce Market 17 setup left NPC 22 hidden at native frame 255; no visible-art claim is made for that branch. Porre Market 54 supplies the present-market proof.
- Seventeen deterministic import, fragment, pixel, tile and assembly outputs reproduce byte for byte from the saved source PNGs.

Open `review/contact-sheet-1x.png`, `review/role-review.html`, `review/gait-contacts.png` or `review/motion-review.html`. The motion viewer follows the original 60 Hz lists and offers native size, enlargement, palette selection and tick stepping. This viewer is separate from the emulator execution evidence.

From the project root, run the deterministic source reproduction with:

```sh
node assets/imagegen/town-civilians-gfx11/reproduce-draft.mjs
```

With the ignored pinned baseline ROM restored, the private emulator checks are:

```sh
node assets/imagegen/town-civilians-gfx11/verify-native.mjs
node assets/imagegen/town-civilians-gfx11/verify-motion.mjs
node assets/imagegen/town-civilians-gfx11/verify-scenes.mjs
```

`integration-proposal.json` contains the precise owner changes and native hashes. `handoff.json` distinguishes tested scenes from the 25 audited source programs and records remaining coverage. The parent owns production allocation, active catalogue changes, independent-core acceptance and campaign regression.
