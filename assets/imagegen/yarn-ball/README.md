# Yarn Bomb (Puss's ultimate) — generated yarn ball

Puss's ultimate is native tech 40 (source Frog Squash). The user found the giant frog out of character and asked for a giant ball of yarn. Damage, targets, MP cost, the low-HP rule and the drop-and-bounce choreography stay native. The name is now **Yarn Bomb**, the frog is now a yarn ball, and a soft glint replaces the frog's rainbow.

`sources/yarn.png` is a `gpt-image-2` edit of `sources/guide-yarn.png` with `sources/mask-yarn.png`, using `prompts/prompt-yarn-v1.txt`. `guide.mjs` draws that guide and mask. Request IDs, sizes and token usage are in `generation-log.jsonl`; no keys are stored. Candidate 1 of 2 was selected (`review/candidates-v1.png`).

`node scripts/import-yarn-ball-art.mjs` converts the source deterministically into `content/yarn-ball-art.js`. `engine/yarn-ball.js` packs that art into the 256 BG3 tiles the native effect stages.

## Native constraints the conversion enforces

- **Footprint.** The native frog map is a 12×8 grid of 16×16 BG3 cells. Its right half repeats the left half with horizontal flips, so the art is the ball's left half (96×128), clipped to the cells the map draws. Tiles outside them stay blank, including the native blank cell `0EE`.
- **Ball only.** The guide also had two loose strands trailing to the ground. Mirrored, they read as legs, so the conversion keeps only the ball: centre (96,56), radius 54.
- **Colors.** BG3 is 2bpp, so the ball gets three reds for palette 6: a dark outline and strand shadow, red, and a pink highlight. They come from k-means in Lab seeded with the source's flat tones; quantile seeds merged the small pink highlight into the red. The mirror seam (column 95) gets no outline.

## Runtime

- **Hooks.** Swamp Belch's hooks at CD:0FA9 (tile staging) and CD:1004 (BG3 palettes) gain a branch for tech 40 with background 65. Tech 40 is the only user of that background.
- **Glint.** The frog's rainbow comes from opcode CD:2D44, which fills a 96-line HDMA color-math table at `$7E:BB05`; opcode CD:2D1F rotates that table one line per frame. A third hook at CD:2D5E writes the same CGADSUB bytes, but fills COLDATA with one soft white glint (`yarnBallGlint`). The native rotation then sweeps the glint up the ball. The hook leaves through the native exit with the native loops' final registers, flags and scratch byte.
- **Storage.** The three shared hook routines, the glint table and the raw tiles fill `$7D:6C00–$7D:7FFF`, the end of the last owned ExHiROM bank (`EFFECT_HOOKS_BLOCK`). `extendedDataPools()` stops bank `$7D`'s pool at `$7D:6C00`. Moving the two routines Swamp Belch already had frees their original-pool bytes, so this change uses no original-pool space.

`tests/yarn-bomb.test.mjs` checks:

- the conversion reproduces from the source;
- the hooks fire only for Yarn Bomb and match the stock opcode byte for byte everywhere else;
- live casts from all three party slots hit every enemy, show the exact tiles, palette and mirrored map, sweep the glint, and restore the renderer.

`review/` has before/after cast sheets from the JS core, plus the attract demo's cast in Snes9x (frame 7200) and bsnes (frame 6990).
