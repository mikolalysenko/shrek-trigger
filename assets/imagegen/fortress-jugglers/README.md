# Fortress jugglers — frozen inactive artwork

This packet replaces gfx 91 / assembly 48 with a generated storybook court fool while retaining Juggler enemy 57 and the original Flea? decoy enemy 240. Both full owner headers, E0/C0 size flags, palette 40, AA82, AI, stats, names and events remain unchanged. Current and original ownership audits find no outside graphics, assembly, palette or program aliases and no NPC header owners.

Root and the art lead approved all nine native slots: [full native sheet](review/native-frames-1x.png), [poses 0–5](review/native-frames-0-5-3x.png), [poses 6–8](review/native-frames-6-8-3x.png). The cap, gold face, teal sleeves and rose coat tails retain one model across hovering, recoil, guarded, open and inverted poses. `source-v1.png` is an unmodified built-in imagegen output; its prompt, exact output path and hashes are in `provenance.json`. Eight actual generated bodies fill nine slots because native 1 and 3 are the sole proven exact duplicate. No source mirrors or procedural anatomy are used.

All original visible bounds, lowest pixels and four-cell coordinates/order match exactly. Whole-source nearest sampling uses recorded per-pose aspect factors; no native cell grid is moved. The canvas is 64×80 with origin [32,64] and group anchor [0,16]. All nine frames have native cell overlap, and low inverted pose 8 retains its original 32-pixel displacement from the hovering set.

The [effect reference](review/original-effects-proposal-4x.png) shows each original frame beside its selected effect. Three recoil dots, 12 flash flecks and 348 original bright radial pixels remain exact source rasters at their authored coordinates. The flash intentionally covers 247 generated body pixels. The generated body and original effects stay separate in the reproduction recipe; no original body layer is retained. AA82 action 8 still requests poses 5/6/7 for 47/5/31 ticks. The original palette is preserved word for word.

| Resource | Original CT / published 417914 | Candidate | Change |
| --- | ---: | ---: | ---: |
| Decoded 4bpp | 2,432 | 4,000 | +1,568 |
| Compressed graphics | 2,324 | 3,535 | +1,211 |
| Assembly | 360 | 360 | 0 |
| Compressed + assembly | 2,684 | 3,895 | +1,211 |

The candidate requires explicit gfx 91 selection in the established native stream contract. Keep the default original-size guard for unselected banks. Compressed + raw stream + assembly costs 7,895 bytes, or 5,211 net ROM bytes after reclaiming the old 2,684. No extra WRAM/VRAM or native helper changes were used. The largest audited all-branch legacy scene union is 22,208 bytes; spare heap does not waive the original 2,432-byte per-bank ceiling.

The pinned published baseline is `417914abe589d25e377b774009f983867c14617cbf7a7f176c52691c8c9f2e35`. The private proof cartridge is `241264e89c0e735106a7d4ab6efae798209dfd49ad6d345ed1cc9994bd814bbd`. This packet does not publish that candidate.

- All 18 owner/pose uploads pass: 72 exact cells and 10,218 exact unobstructed final palette pixels. The room 1 diagnostic uses origin [200,191] for poses 0–7 and [200,159] for low pose 8 to avoid foreground occlusion. Relative native cell offsets remain unchanged.
- All 64 AA82 owner/action/facing cases pass: 128 cycles, 6,624 scored ticks plus 5,336 startup ticks. Requests, timers and complete transfers match the unchanged original lists, including the five-tick flash. No isolated display delay was observed.
- Original location 175 reaches formation [52,52,57,57], native damage and victory. Its measured field heap is 19,616 bytes. Two sampled Juggler layers preserve complete cells/palette/anchors, with 460/501 and 501/501 final pixels visible; original party overlap hides the remaining 41 in the first layer.
- Original location 173 follows decoy 240 → Moth Witch 159, awards item 206 exactly once, then exits to 125. The existing `defeatMothWitch` controller-only acceptance driver passes. The decoy sample has all 524 final pixels visible; the unchanged Moth Witch reveal verifies eight native cells and 657 final pixels. NPC 126 and 112 dependencies remain loaded unchanged. The measured scene 173 heap is 736 bytes; destination 125 uses 7,040.
- All three Juggler/decoy battle samples show zero request/display delay at the sampled moment. Eight screenshots and four native APNGs are recorded. Every route restores the pre-entry RAM snapshot exactly and leaves the cartridge unchanged.

These are bounded routes after reversible diagnostic starting conditions with development party resources. They do not prove ordinary-level balance, every AI counter branch, three other audited locations, or full campaign traversal. Independent cores and final production placement remain root-owned integration checks. Native timing evidence is distinct from the source playback in `review/motion-original-vs-new.html`.

`source-proposal.json` preserves the pre-generation owner/scene audit. In scene 173, all 389 non-text parsed instruction spans remain original; only the existing published text pointer at body offset 448 is relocated. Preserve that relocation, the current accepted Moth Witch art, and the original reveal/reward/exit choreography during integration.

Reproduce from the repository root:

```sh
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/fortress-jugglers/import-spec.draft.json
node assets/imagegen/fortress-jugglers/verify-frozen.mjs --sources --proof
```

The ordinary importer produces eight sampled bodies. `composeJugglerArt(sampledSource, nativeComposition, originalEffects)` then emits nine final frames, and `compileFortressJugglers(art, geometry)` reproduces the exact 4bpp, compressed packet and assembly. This explicit compositor is necessary because the flash covers body pixels; the generic non-overlapping shadow compositor is unsuitable. `verify-frozen.mjs` checks this complete reproduction and every retained original effect pixel.

`freeze.json` separates minimal source/reproduction files from expanded review/proof records. `handoff.json` contains the exact integration and reclamation contracts. All work remains inactive under this directory and its private QA output; the accepted bat packet, active modules, canonical ROM, title and music remain untouched.
