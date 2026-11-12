# Woodland sprite — inactive generated source packet

This packet replaces the original Kilwala body shared by **NPC 77 and enemy 3**, using **gfx 81 / asm 36 / palette 19 / AA28 / size 0**. It is an original cream-furred woodland creature within the established fairy-tale setting, with expressive peach face, russet ears/paws and olive fringe. Root and the art lead approved the native appearance. Activation remains root-owned.

The baseline is immutable published ROM `5018f48b599c67f33131c3d05350115484625450d2e8b44e5389f27144e21770`. Its selected graphics, assembly, palette and animation still match the original USA ROM. The preceding remaining-art inventory is separate in `assets/raster/remaining-art-5018f48b599c/`.

Three unmodified built-in imagegen PNGs and their saved prompts produce nine authored source poses and all **15 distinct native images**. The original six whole-pose mirror relationships are verified. V1's profile poses were superseded: V2 supplies the first profile contact and passing phase, while V3 supplies the opposing trailing-arm contact. No anatomy is drawn by code. Twelve isolated original single-pixel motion dots are retained in slots 12–14, with no overlap with the generated body.

`review/native-frames-1x.png` and the three enlarged pages compare every original and new pose. `review/motion-original-vs-new.html` plays the original lists and durations; it is a source comparison, separate from emulator evidence. Every vertical bound and lowest pixel is preserved. Front/rear bounds match exactly. Profiles are 22/20 pixels wide versus 18; spinning poses are 27 versus 23. Recoil is 25 versus 26 pixels wide, giving a half-pixel center rounding difference. To contain the complete spin raster, slot 13's cell grid moves left 2 pixels and slot 14's left 1 pixel. Their body centers remain unchanged. All other cell origins and the original one-pixel cell overlap in slots 1/4 remain exact. Four cells are reserved throughout; nothing is clipped.

| Resource | Original CT and published 5018 | Draft | Growth |
| --- | ---: | ---: | ---: |
| Decoded 4bpp | 3,104 | 4,416 | +1,312 |
| Compressed packet | 1,735 | 3,134 | +1,399 |
| Assembly | 600 | 600 | 0 |
| Compressed plus assembly | 2,335 | 3,734 | +1,399 |

**Gfx 81 requires explicit native streaming**, preserving the default decoded-size guard for unselected banks. The raw stream adds 4,416 ROM bytes; compressed, raw and assembly total 8,150, or +5,815 versus the prior packed bank. Runtime sprite memory remains the original 32 KiB. The audited maximum all-branch legacy union is 23,520 bytes on the pinned baseline, and becomes 20,416 when gfx 81 is excluded through its explicit stream. These unions are conservative source-load bounds, not full route residency proofs.

Palette 19's 24 bytes remain exact, and no palette write is proposed. Graphics, assembly and palette have only the two listed owners and no pointer aliases. **Guy Fieri enemy 225 still shares AA28**, despite owning gfx 252 / asm 233 / palette 10. Its complete graphics, 15-slot assembly, palette and header are preserved, and it is included as an external native sentinel. AA28's repeated action-0 sequence and all original sentinels, frame requests and durations remain unchanged. Original headers, AI, stats, names, event packets and gameplay are untouched.

Private candidate `984969b0477edfcb36fe1b0f82eca24190196456681b6a96038ca56f11827460` is under `.local/qa/woodland-sprites-native-proof/`. Native evidence passes:

- Both owners: 30 exact uploads, 120 displayed cells and 13,426 exact displayed pixels.
- Unchanged Guy 225 sentinel: 15 exact uploads, 60 cells and 6,568 pixels.
- All 72 original AA28 owner/action/facing cases: 144 scored cycles, 5,064 scored ticks and 4,536 startup/alignment ticks. No field request-to-display delay was observed.
- Original Mystic Mountain 274 formation `[3,3,3,3]`: original AI, damage and victory after controller input; observed field heap 4,064 bytes.
- Original Snail Stop 53 NPC 77: dialogue 46 and its native spinning dance/gait, with controller input and a 11,264-byte observed field heap.

Actual battle layer accounting is separate from the field timing result. One moving attacker displays the preceding coherent frame/XY state for one video tick; its overlap with the party hides 398 of 434 source pixels in the selected sample. The other three sampled layers each display all 460 pixels exactly. The recorded APNGs include the native interaction dance, returning gait and battle motion. They are not synthetic frame timing.

These are bounded diagnostics after reversible native location entry with the development party kit, not a full campaign or normal-level balance proof. Other authored uses have ownership/resource audits only. Independent Snes9x/bsnes and final production allocation checks remain root integration work. No active registry, engine, canonical ROM, gallery, title or music changes are made by this packet.

Reproduce source composition with `node scripts/import-raster-art.mjs --preview-spec assets/imagegen/woodland-sprites/import-spec.draft.json`. The spec includes the recorded composition and original-effect files, so the ordinary importer reproduces all 15 native frames directly. `compile-native.js` exports synchronous, browser-compatible `compileWoodlandSprite(art, geometry)` and reproduces the exact 4bpp, compressed packet, 600-byte assembly and palette bytes. `prepare-draft.mjs` re-derives the full proposal from the saved PNGs and hash-pinned original ROM. `native-family-proposal.draft.json` supplies all owner and geometry fields for root's integration.

Run `node assets/imagegen/woodland-sprites/verify-frozen.mjs --sources --proof` to validate the minimal source record, exact compiler outputs and pinned private evidence. `freeze.json` separates minimal reproduction files from review and private proof artifacts.
