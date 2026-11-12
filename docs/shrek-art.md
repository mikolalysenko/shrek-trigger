# Shrek artwork

Shrek uses the user-selected V.Smile model from `506339.png`. The active import keeps one twelve-color palette, the original 248 frame IDs and animation timing, and the existing four native sprite cells. Every visible frame comes from the supplied artwork or a same-model indexed-pixel adaptation. Source crops, mirrors, whole-image rotations, visibility masks and authored acting are recorded under `assets/raster/shrek/`.

## Complete native acting and movement

`assets/raster/shrek/acting-complete/art.mjs` authors the 24 native roles that previously used explicit acting substitutes. Nineteen new source frames cover all of those roles without mixing in the mobile or GBA model:

| Native frames | Completed performance |
| --- | --- |
| 69–70 | Knocked out flat: his side profile laid on the ground line, face down and rear up (replaced a rotated front view that read as a curled ball). |
| 165–168 | Directional folded arms with crossed sleeves and opposite hands. |
| 204–209 | Two-phase directional belly laugh with closed eyes, open mouth, belly hands and rebound. |
| 210–212, 235–237 | Five seated stages with grounded hips, forward legs and hands on knees. |
| 220 | Leftward horizontal airborne lunge with a tucked trailing boot. |
| 232–233 | Two-contact rear prison-escort gait with clasped hands. |
| 234 | Upright one-eye wink using the matching genuine open/closed eye regions. |
| 246–247 | Two-stage foaming-mug lift and sip. |

The run slots **28–43 and 59–66** now use six distinct reviewed foot-contact drawings in each of the four directions rather than three poses with doubled phases. Running reuses those walking drawings at the original faster native cadence. Coverage remains **60 direct source roles, 185 adaptations, zero fallbacks and three intentional blanks**. The other 200 native images are byte-identical to the preceding reviewed source art. Native animation programs, directions, phase counts, frame IDs, palette convention and four-cell geometry remain unchanged. The complete bank uses 29,312 graphics bytes and a 4,800-byte packed assembly, within the existing allocation. `acting-complete/manifest.json` freezes all 248 source and outlined-frame hashes plus the compiled graphics and assembly hashes.

`tests/shrek-acting.test.mjs` verifies the exact 48-slot acting/run delta, zero semantic or procedural fallbacks, distinct loop stages, the one-eye-only wink edit and mirrored fallen body. The ordinary party suites check every native upload and the status-safe entries 1/12 outline. Run:

```sh
node --test tests/shrek-acting.test.mjs tests/player-art.test.mjs tests/party-outlines.test.mjs
npm run test:party-art-cores
```

## Earlier bounded airborne refinement

Published cartridge `f15558259cfb6e053dde8a7cb7d21f453016adbdc7e0863127dd66d125748237` changes only native images 194 and 219 from the preceding machine/wildlife build. Frame 194 uses the selected V.Smile rear airborne drawing with raised arms for its rising strike. Frame 219 now uses the same inverted airborne drawing as 195, matching the original shared body and descending choreography. The other 246 images, including all three blanks, remain exact. Frame 220 is correctly labeled a horizontal airborne strike and remains an explicit substitute.

Coverage is **60 direct source roles, 161 adaptations, 24 temporary substitutions and three intentional blanks**. The 24 gaps include expressive story acting that the selected sheet does not supply: folded arms, seated poses, drinking, a full laugh, a one-eye wink and a true fallen body. Existing drawings are not relabeled as new authored performances. Mobile/GBA alternatives remain excluded because their model differs from the selected V.Smile sheet.

The raw Shrek bank is 30,592 bytes and its packed assembly is 4,520 bytes, saving 416 and 40 bytes respectively. Native animation programs, palette, frame IDs and four-cell geometry are unchanged. `assets/raster/shrek/acting-audit-remaining/freeze.json` fixes the 59-path source/evidence packet; `integration.json` records activation separately. Its verifier reproduces both complete 248-frame versions, exact source crops and the previous native timing evidence without rewriting the frozen files.

The current source/packing contract, all 248 native SnesJs uploads and accepted non-player bank checks pass. Snes9x verifies 1,988 player variants; bsnes checks 108 displayed poses, including both changed images and their adjacent role corrections. Both also check shared workshop puppets, Puss's two weapons and all seven portraits. The independent report is `.local/qa/party-art-f15558259cfb/report.json`. The frozen packet's ten ending-destination observations belong to the preceding `511e120c` image and do not establish completed endings on this image.

Source-only regeneration reproduces both generated modules and the exact cartridge. Floating IPS independently reconstructs the 1,547,284-byte BPS (`70c7b512affafac2adc4fdfcd44ec429c3ec6fdabd7cc58706ddbb40ca475211`). All 103 gallery atlases and the three new role filters pass desktop/mobile checks. The 3,700-frame gallery, patch and cartridge are published together without resetting the live game; exact hashes are in `.local/qa/shrek-airborne-f15558259cfb/publication.json`.

## Earlier eleven-image correction

The earlier correction in cartridge `511e120ca47aa4f9c61371d4ecd264d0b1848061a649ee16b162cfe3f6bb109c` changed eleven images:

| Native frames | Correction |
| --- | --- |
| 69, 70 | Horizontal unconscious poses use the genuine closed-eye expression. |
| 159–164 | The original event closes the eyes while standing. These now use standing open/closed-eye drawings, replacing the incorrect crouch. |
| 195, 219 | The descending attack and fall face vertically head-first, replacing sideways knockout art. |
| 234 | The wink slot stays upright. Both closed eyes substitute for the missing one-eye expression. |

The other 237 images are byte-identical at the indexed-pixel level. The source bank shrinks from 31,104 to 31,008 bytes; the packed assembly shrinks from 4,600 to 4,560 bytes. Death Peak’s frozen Shrek also receives the closed-eye unconscious pose through its existing source alias.

Coverage at that milestone was **60 direct source roles, 158 adaptations, 27 temporary substitutions and three intentional blanks**. They remained labeled in the frame inspector. Rotating a source drawing improves orientation but does not manufacture missing body acting. The airborne refinement above supersedes the two affected images and three role classifications.

`assets/raster/shrek/acting-review/freeze.json` records the reviewed source and expected frame, graphics and assembly hashes. Its inactive status describes the source handoff before integration; `integration.json` records the accepted cartridge. Reproduce the frozen packet with:

```sh
node assets/raster/shrek/acting-review/reproduce-corrections.mjs
node assets/raster/shrek/acting-audit-remaining/verify-frozen.mjs
node --test tests/shrek-acting.test.mjs
node --test --test-name-pattern='all 248 Shrek' tests/player-art.test.mjs
node scripts/check-npc-art.mjs all --actor shrek-frozen
```

All 248 Shrek frames and all 470 streamed story/caretaker/clown frames pass exact native upload checks in SnesJs. Nine source, packing and accepted-art checks pass. Snes9x verifies all 1,988 player variants, shared workshop puppets, both weapons and seven portraits; bsnes verifies 106 displayed player poses, including every changed Shrek image, plus the same shared-actor and menu checks. Both cores verify all three frozen-Shrek frames and palette correspondence. These checks establish source fidelity and native rendering; complete story and ending choreography remains part of campaign acceptance.

## Overworld sprite

Shrek's eight native 16×16 overworld frames are hand-drawn in `content/overworld-heroes.js` (front idle/step/stride, back idle/step, left idle and two strides; OAM mirrors right). They use the first seven entries of his field palette. The automatic 32-to-16 reduction of the V.Smile art lost his face and turned his tunic into noise at that size. Fiona, Puss, Mongo and Farquaad have hand-drawn frames in the same file. Donkey and Pinocchio, which reduce cleanly, still use the reducer in `engine/environment.js`, each with its own seven-color overworld palette.

## Tunic shadow color

Palette entry 11 was a cool grey (`9da69c`) that the V.Smile import used for the shadows of Shrek's cream tunic, so in game it read as grey stains. It is now a warm tunic shadow (`b9a57a`). Only the color changed, not the pixels. Granny, the fart cloud and the onion kart share Shrek's palette and change with it; none of their visible features use that entry, and the kart's re-quantized conversion is visually identical.
