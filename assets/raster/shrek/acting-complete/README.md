# Complete Shrek acting

`art.mjs` derives nineteen authored 32×32 indexed-pixel frames from the active V.Smile source actor. They supply the 24 native roles that were still marked `fallback`: fallen body, folded arms, laughter, sitting, horizontal airborne strike, rear escort gait, one-eye wink and drinking.

The module retains the source twelve-color ramp and native sequence directions/phase counts. It does not run on the SNES; the ordinary compiler converts these pixels into the same four-cell 4bpp frames as the source art. `engine/party-palette.js` subsequently applies the status-safe black/accent silhouette.

`manifest.json` freezes every native source and outlined-frame hash, semantic coverage and compiled resource hashes. The recorded delta from the preceding reviewed art contains the 24 acting roles plus 24 run slots corrected to use six genuine directional foot-contact drawings. From the repository root, regenerate it after an intentional reviewed edit with:

```sh
node assets/raster/shrek/acting-complete/freeze.mjs
node --test tests/shrek-acting.test.mjs tests/player-art.test.mjs tests/party-outlines.test.mjs tests/sprite-motion.test.mjs tests/overworld-controller.test.mjs
```

No mobile or GBA model pixels are used. The historical audit packets under `acting-review/` and `acting-audit-remaining/` remain unchanged as evidence for the earlier milestones.
