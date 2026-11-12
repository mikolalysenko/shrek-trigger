# Cosmic Muffin world and meteor — inactive source packet

Two actual image-generation outputs adapt the accepted Cosmic Muffin shell model to the original overworld eruption and Mode7 arrival resources. The source RGBA images are preserved verbatim with exact prompts and reference hashes. Sampling uses original hardware palettes; no anatomy is drawn by code.

The world model occupies a 64×41 native compound. Its original eight-cell base and four-cell rising front reconstruct the full sampled image at rest. Forty-eight source-owned tiles change; the other 208 tiles, including eruption rims, debris, bolts and impact effects, remain byte-identical. Root accepted the actual disaster staging: foreground effects hide most of the short wrapper while the glowing crust dome emerges. The separate large battle shell shows the full silhouette.

The meteor fits the original 48×56 map and 39-tile resource. Its 48×48 sampled body is entirely inside the existing nonblank cells; no pixels are clipped, and blank tile 0 plus unused tile 36 stay exact. The format is packed four-bit pixels, **low nibble first**, expanded by the native loader into 2,496 Mode7 texture bytes. It is not SNES planar 4bpp. The original map, palette, planet, stars and rotation/scaling procedures are unchanged.

| Resource | Decoded | Compressed | Compressed delta |
| --- | ---: | ---: | ---: |
| World graphics 2 | 8,192 | 3,962 | +37 |
| Mode7 graphics 0D | 1,248 | 1,036 | −118 |
| Total | 9,440 | 4,998 | −81 |

There is no additional WRAM, VRAM or OAM allocation. Root owns production placement and activation; the two private overlay addresses are diagnostic locations, not production reservations.

## Review

Open `review/native-scenes.html` for native-size sources and the actual captured world/Mode7 phases. It is self-contained and offers 1×/2× scene display. The captures are sampled phases, not a fabricated full animation.

- `draft/compound-1x.png` / `compound-6x.png`: complete native world model.
- `native-verification/world-0611.png`, `world-0898.png`, `world-1034.png`: original eruption staging.
- `meteor/native-1x.png` / `native-6x.png`: exact packed-texture reconstruction.
- `meteor/native-verification/meteor-0240.png`, `meteor-0600.png`, `meteor-1440.png`: original rotation and approach.

## Native evidence

Both private candidates use historical baseline `2e2a574e5b111f119e91a24a03868f6ec588fcefc46ff8fe9559eaf241bc3066`. They do not claim to be the current canonical cartridge.

The world proof enters the existing future-archive diagnostic checkpoint at location 218, then follows the original recording events through locations 498/503 and returns to 218 with story progression 53→54. It verifies 2,135 exact OAM/palette ticks, 1,091 exact full 8,192-byte uploads, and 5,416 visible source pixels. Another 8,446 candidate pixel positions are conservatively excluded because an earlier effect object's rectangle covers them. The effects and their native coordinates remain exact.

The meteor proof injects one actual `FF 24` command at a native event dispatch from the bedroom checkpoint. The original scene then executes and returns. This is a diagnostic entry, not a claim to have traversed the original predecessor boss at location 301. It verifies 1,747 complete expanded texture uploads, 382,079 matching visible transform scanlines, and 3,007 transformed source pixels. Twenty-seven comparisons are explicitly covered by original star pixels.

The native star RNG at `$C3:02DD` reads PPU counters `$213C/$213D`. The smaller compressed packet finishes seven scanlines earlier during the initial black transition and therefore produces different legitimate random star positions. One scanline of the final brightness-1 fade also changes; two additional black-transition lines differ. The map, textures, palettes, native RNG and transformation code remain exact. **There is no claim of cycle-identical setup or star placement.**

The private world fingerprint is `2857484b3b6535b7d093a4f5a645ccdbf7bb33c7044a0a3423d81749835a1cf9`; meteor is `3ac620135867b084789936abe4fa311cbedc968aee8818a854d5900e62e6e1ca`.

## Reproduction

From the project root:

```sh
node assets/imagegen/cosmic-muffin-world/reproduce-draft.mjs
```

This checks the minimal freeze and recompiles both native graphics packets, compression round trips and native PNGs. It requires the user's original ROM at `.local/chrono-trigger-usa.sfc`, SHA-256 `06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9`, plus the normal project dependencies. The ROM is not included in the source manifest.

The full scene proofs additionally require the pinned historical baseline at `.local/qa/party-art-2e2a574e5b11/shrek-trigger.sfc`:

```sh
node assets/imagegen/cosmic-muffin-world/verify-native-archive.mjs
node assets/imagegen/cosmic-muffin-world/verify-native-meteor.mjs
```

`integration-proposal.json` gives the exact packet and pointer ownership. `packet-audit.json` records the loader, raw-palette and shared-resource evidence. `appearance-scope.json` separates this work from the frozen shell/Ward/Core packages and lists remaining natural approaches, disaster variants, offspring and intermediate oven-heart art. Those are not marked complete here.
