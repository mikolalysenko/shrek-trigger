# Duloc household resident — inactive gfx12 source packet

This packet replaces the shared artwork for NPC21 and NPC48 with an ordinary adult court/household resident: copper braid, cream collar, periwinkle gown and waist cord. It uses three preserved actual image-generation outputs. All anatomy comes from those rasters; code only samples, mirrors, translates, crops the upper hair fragment and packs SNES tiles.

The selected 19-slot sheet is [review/role-review.html](review/role-review.html). [review/motion-review.html](review/motion-review.html) compares the original and proposed artwork at the original 60 Hz frame-list timing. The default display is native size. Both shared palette variants are available.

The packet is inactive. Root owns production allocation and activation. No active source catalogue, engine registry, canonical cartridge or server was changed.

## Native contract

- Gfx12 has exactly NPC21 and NPC48 as header owners on pinned `0758f532bcbf0322997553f1e11b40463e15ab463a54555e4a624b4cd4bacd3f`.
- Both headers retain their existing palette135/131 and animation7. Shared original assembly7 remains byte-exact and cannot be reclaimed. Root reserved private assembly248 for these two headers only; the private overlay verifies its zero pointer and lack of owners.
- All19 slots retain four cells and all152 original signed XY bytes, with no overlap or clipping. The compiler's logical64×64 canvas is staging only: it adds no native cells or memory. Apply the family anchor `[0,12]` exactly once.
- Slot16 is genuinely blank. Slots17/18 retain the original six opaque rows of upper hair, derived pointwise from the generated profile. The original cell stencil is8px high; it does not contain eight opaque hair rows.
- The selected bank is3,584 raw bytes,2,883 compressed bytes and760 new assembly bytes. Original graphics were2,336 raw/1,456 compressed. Scoped raw streaming is required; the frozen proposal has5,771 bytes net stored growth before alignment, no extra WRAM or VRAM, and removes the old decoded bank from the field heap.
- Original palette packets, assembly7, AA7's80 program/20 duration bytes, event packets, AI, stats, collision, scene anchors, music and unrelated headers stay unchanged.

`integration-proposal.json` is the exact allocation/header contract. `import-spec.draft.json` and `full-area/family.json` are the source import and native geometry inputs. The committed audit is historical pre-generation evidence, not a current claim that generation is still pending.

## Source selection

The base atlas supplies cells1,2,4,5,13. The targeted face edit supplies0,8,9 only; the other revised figures are excluded. A separate actual generated profile contact supplies the near-hand-leading counterpart. Native-proven whole-source mirrors supply rear/front/right counterparts, and are not counted as additional authored poses.

AREA sampling uses the unchanged twelve-color palette135. Both palette variants display those same indices. Whole-source scale corrections retain30px rear bodies and29px profile contacts without horizontal distortion. The long gown conceals some upper-leg ownership; the two genuine profile contacts visibly oppose their near-hand silhouette. This limitation is recorded rather than claiming independently visible alternating knees.

The three exact prompts, PNG hashes and output provenance are beside the sources. `derived-hair-fragment-area.json` records the pointwise crop and native indexed hash. No rejected Shrek, Pinocchio or Sky Drake request was retried.

## Verification

- All38 target owner/frame uploads passed, including both blank uploads,144 nonblank cell placements and10,308 exact visible native pixels.
- Both owners executed all16 nonempty AA7 lists:32 cases and2,496 ticks, with zero display delay.
- Unchanged NPC22/14/40 sentinels passed60 uploads and19,522 visible pixels. Shared AA7 also passed8 sentinel gait cases/960 ticks. These sentinel appearances are the pinned0758 versions, not the later published art.
- Seven original locations execute on the private cartridge: inn12, household58, court22/121, Bram flashback206 and hostile doubles169/469. Six actual controller interactions reach the original dialogue; the flashback shows both residents and dialogue0–4. Exact CGRAM rows and visible-pixel/occlusion counts are recorded. Maximum observed field heap is22,208 bytes.
- These are diagnostic entries followed by original native event/controller execution. They do not prove natural campaign approach, paid inn service, hostile battle victory, complete flashback return or endings. The other12 source-load locations remain untraversed in this packet.

Private candidate SHA-256: `d07c661ca3168cf654c05b6005c8064d9fd33e16f97b494529c0b97789957b35`.

## Reproduce

From the project root:

```sh
node assets/imagegen/town-household-gfx12/reproduce-draft.mjs
node assets/imagegen/town-household-gfx12/verify-native.mjs
node assets/imagegen/town-household-gfx12/verify-motion.mjs
node assets/imagegen/town-household-gfx12/verify-shared-sentinels.mjs
node assets/imagegen/town-household-gfx12/verify-scenes.mjs
```

The first command regenerates and compares17 selected importer/compiler artifacts byte for byte; it never writes the active registry. Native proofs require the pinned cartridge at `assets/raster/town-npc12-audit/private/baseline-0758f532bcbf.sfc`, create only private overlay/snapshot files and reuse the existing native stream loader. ROMs, private checkpoints, unselected sampling trials and controller-calibration failures are excluded from the minimal whitelist.

The read-only ownership audit can be regenerated from the four scripts in `assets/raster/town-npc12-audit/`; those require the original USA ROM and the recorded local event decoder. Full current-cartridge allocation, independent cores and campaign regression remain root integration work.
