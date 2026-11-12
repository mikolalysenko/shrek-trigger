# Pinocchio: cel-shaded model sprites

These are the active Pinocchio sprites (all 190 authored frames behind his 194 visible native roles) and his 48×48 menu portrait. The user found the earlier fixed-grid renders (`../pinocchio-model`) muddy and hard to read, with weak line work. They wanted sprites that fit in Chrono Trigger.

## What changed

The same archived Shrek SuperSlam mesh, authored joint poses, projections and native role maps are reused unchanged from `../pinocchio-model`. Only the rasterization changed. The earlier pass took one textured, lit sample per native pixel; `render.mjs` instead draws each pose the way Chrono Trigger sprites are drawn:

- **Flat materials.** Each texel is classified into a material (wood, hair, gold hat, white shirt and socks, navy suspenders, blue shorts, red shoes and cheeks, black pupils and brows, blue iris). Each texture may only produce its own materials, so shading never changes the material.
- **Supersampling.** Each native pixel takes the majority material of an 8×8 block. Pupils and brows win when they cover a visible share.
- **Cel shading.** Light from the screen's upper left picks one of two or three tones per material.
- **Thick limbs.** Arms, legs, shoes and the nose are thickened in raster space so they keep a readable two- to three-pixel body.
- **Outline.** A one-pixel outline is drawn outside the figure: black beside dark colors, the dark accent beside lit ones. Gaps the outline closes are black, and black contours mark where one part overlaps another.
- **No leaf.** The leaf sprouting from the nose has no green in a twelve-color palette and read as a blob over the eye, so it is left out.

## Palette

The 12 colors follow the party outline convention (`engine/party-palette.js`): 1 outline black, 2 white, 3–5 wood, 6–7 gold, 8 cloth shade, 9–10 blue, 11 red, 12 dark accent outline. When a status lands, the battle engine cycles entries 1 and 12 through the status color, so only the outline glows. The workshop puppet enemies reuse these pixels with their own burgundy coat palette (`content/workshop-puppets.js`), which maps the same entries.

## Reproduce

```sh
node assets/raster/pinocchio-clean/render.mjs
```

This rewrites `content/pinocchio-clean-art.js` byte for byte, plus `review/`:

- all frames;
- earlier versus new frames on the semantic review poses;
- portrait before and after;
- the workshop puppet palette.

`engine/raster-art.js` overlays this art on the imported registry. `tests/party-outlines.test.mjs` checks:

- reproducibility;
- that native roles are unchanged;
- that every silhouette pixel is outline and no body pixel uses entry 12;
- a live Haste glow.

Provenance is the archived model files and the authored pose manifest, with their SHA-256 hashes (`provenance` in the generated module). See `../pinocchio-model/README.md` for the model's source, terms and the authored poses.
