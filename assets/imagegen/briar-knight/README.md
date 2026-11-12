# Briar Knight — frozen inactive candidate

The four selected generated sheets supply all **86 native slots: 83 visible and three original blanks**. The knight keeps the closed steel helm, forked leaf crest, thorn plates, berry tabard, gold rose clasp and short green cape. The sprite-art lead approved the 38-pixel standing scale and full gesture sheet at actual size. Fine eye and thorn details are small; armor, cloth, weapon silhouette and body movement carry the identity.

Review [the actual-size native sheet](draft/native-1x.png), [the enlarged sheet](draft/native-4x.png), and the settled native [sword sweep](native-verification/native-frame-20.png), [downward plunge](native-verification/native-frame-84.png), and [overhead strike](native-verification/native-frame-85.png). The draft remains inactive. There is no `import-spec.json`, registry edit, active engine edit or canonical ROM write.

## Sources and exact roles

`source-base-v1.png`, `source-combat-v2.png`, `source-reactions-v1.png` and `source-aerial-v1.png` are actual built-in `image_gen` results. Their exact prompts, alpha-channel checks, output paths and hashes are in [provenance.json](provenance.json). Combat v1 had clipped blade tips; it is retained only as the documented input to the framing correction and is never sampled. No procedural anatomy, replacement weapon or pixel painting was added.

The four 16-cell sheets contain 64 source poses; **59 are consumed**. The unused five are scale anchors or redundant alternatives, listed in the spec. Source pixels are area-sampled into the existing twelve opaque palette colors, with transparent alpha retained. Horizontal reflection and whole-pose offsets are explicit. Original shadow, sweat flecks and landing dust are replaced by pose acting; the generated rapid-punch gauntlet afterimages are retained. This is a source-based adaptation of the full native role set, not a claim to reproduce the original sprite pixels.

[The role map](native-roles.json) follows viewed original sprites and animation programs, rather than inaccurate earlier procedural labels:

- Frames 9–17 are folded-arm hover/walk phases, without a visible sword.
- Native pairs 18/37, 23/36, 26/38, 44/45, 46/47, 48/49, 53/54 and 58/59 retain their distinct armed and unarmed states.
- The aerial spins have genuine front, back, left and right views. Frames 63/69 and 65/71 are different front/back poses; 74/80 and 76/82 are translated copies, not mirrored views.
- Frames 39, 40 and 41 remain completely blank.
- Frame 84 is a **downward sword plunge**, not a fallen unarmed body. Frame 85 is the overhead upward sword strike.

Original animation IDs **125/126**, all 432 animation bytes, all four enemy headers and AI programs remain unchanged in the private proof. All four variants share the full table; the unarmed variant's original program continues to select its proper subset. The proof intentionally scrubs every native slot for every owner.

## Native resources and geometry

| Resource | Original | Candidate |
|---|---:|---:|
| GFX 166 decoded graphics | 12,384 bytes | **25,856 bytes / 808 tiles** |
| Compressed packet | 9,105 bytes | **16,905 bytes** |
| ASM 158 | 86 × 80 = 6,880 bytes | **6,880 bytes** |
| Palette 200 | 12 opaque colors | Same project palette, 24 bytes |
| Per-frame reservation | Eight 16×16 cells, size 1 | Same eight cells |
| Native canvas | 64×80 | 64×80 |

The exclusive owners are enemies **157, 158, 165 and 186**. Palette 200 has no pointer aliases. [native-audit.json](native-audit.json) preserves every original cell coordinate, header, animation and AI hash, original bounds and scene inventory. Its `legacyDescriptor` is explicitly historical; the corrected meanings are separate.

The full weapon and gauntlet silhouettes require row-specific cell placements. [draft/family.json](draft/family.json) is the exact proposed family descriptor, including every eight-cell placement. The compiler searches nonoverlapping 16-pixel row bands and minimizes new exact tiles using hardware horizontal reflection. It never removes opaque pixels. All 440,320 packed canvas pixels reconstruct exactly from the emitted native tile words. Each native frame still uploads 1,024 bytes to its existing cell reservation.

Whole-pose floating offsets are in the import sequence. Frames 74–83 retain their native left/right origin shifts. Frame 66 uses the original lowered recovery anchor `[0,2]`; frame 84 retains `[0,14]`. The upward strike is anchored 22 pixels above the ordinary source floor. These decisions are explicit in the role map and family descriptor, rather than hidden in painted pixels.

Graphics SHA-256: `0f7d13ea0c257f5ac70d8ceb26cf536301438edb3a5eecf1e0000754d9f311e7`.
Assembly SHA-256: `522a37b6753e03cf30737fe0dfd138678cd97d011d824191a64edf3b2bcf8117`.

## Verification and remaining integration work

`verify-native.mjs` passed **344 exact native uploads**: four owners × 86 frames. It checked all **178,584 opaque PPU pixels**, all twelve observed colors, all blank uploads, palette ownership and every pose's actual placement. Captures wait at least 30 settled frames after the native frame selection. All four isolated previews used **26,816 bytes** of the existing sprite heap and had no native halt. The script creates its private overlay in memory and does not save a ROM or checkpoint.

The saved active input is `.local/qa/party-art-2e2a574e5b11/shrek-trigger.sfc`, SHA-256 `2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066`. The private overlay hash is `379a3a1f71ec918c636467cc1f788552b2d53d0a2ea2503ac6e96031ae0fc1b1`. The compressed packet and assembly use a checked, unused lower-half mirror of that saved build at `0x7D0000` and `0x7D4210`. Neither palette slots nor VRAM reservations grow.

The original decoded family-size guard is **unchanged and deliberately rejects this larger bank**. The current saved build's whole-location load unions with the candidate are:

| Location | Candidate decoded bytes | 32 KiB budget |
|---|---:|---|
| 63 | 36,480 | Exceeds by 3,712 |
| 92 | 37,664 | Exceeds by 4,896 |
| 169 | 38,688 | Exceeds by 5,920 |
| 180 | 34,272 | Exceeds by 1,504 |
| 184 | 30,592 | 2,176 spare |

These are conservative unions across original event branches, using actual saved-build headers; they do not assert that every listed actor is resident simultaneously. [draft/current-co-loads.json](draft/current-co-loads.json) lists the actual banks. Original-resource unions and ownership are retained separately. Later Horner and Moth candidates change these totals again.

**Complete fortress transitions, trio/hideout combat, ordinary attack timing and independent emulator proofs remain integration work.** No unsafe multi-actor compressed test was run. Root must prove size-1 direct-ROM streaming or complete scene residency before activation, consume the explicit family geometry and corrected role meanings, then run original controller routes and independent cores. This isolated art proof is not a large-actor streaming proof.

## Reproduction

From the repository root, with the legally supplied original ROM and the saved input build already present:

```sh
node assets/imagegen/briar-knight/audit-native.mjs
node assets/imagegen/briar-knight/prepare-draft.mjs
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/briar-knight/import-spec.draft.json
node assets/imagegen/briar-knight/compile-draft.mjs
node assets/imagegen/briar-knight/verify-native.mjs
```

The first command writes extracted original sprites only under `.local/qa/briar-knight/`. Preview import never writes the shared registry. The selected source PNGs are immutable inputs; generation itself is not expected to be bit-reproducible. Conversion and native packing are deterministic, with hashes in [freeze.json](freeze.json). [reproducibility-files.txt](reproducibility-files.txt) lists the source, derivation and review handoff files, excluding the preliminary base-only preview.
