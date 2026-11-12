# Rumpelstiltskin and Wishworks Golems — inactive source packet

This packet replaces Dalton/Dalton Plus with Rumpelstiltskin and their summoned Golem/Golem Boss with matching enchanted wishworks constructs. Root approved this implementation casting decision under the full-cast request and consolidated it in the design log. The packet remains **inactive**. It contains no active import specification, engine/content change, canonical ROM, gallery or live-server update. Root owns production integration and independent-core checks.

Rumpel uses a compact, hunched model with red hair, a long pointed profile, pale face, rust sleeves and a dark vest. The floating brass/porcelain golems use a narrow finial, pale mask, jeweled rounded body, hinged jaw and articulated hands. Root and the lead art agent approved the full native sheets, both golem palettes and the corrected opposed gait contacts.

## Original ownership and geometry

| Graphics / assembly | Native enemy owners | Palette | Original slots / cells |
| --- | --- | --- | --- |
| 143 / 137 | 161 Dalton, 162 Dalton Plus | 192 | 28 / four |
| 216 / 209 | 149 Golem, 243 Golem Boss | 234, 235 | 8 / twelve |

There are no NPC owners or aliased resource pointers. All 36 unique slots are nonblank; the four owners expose 72 slots. Keep enemy size flags 64/0/66/66 exactly, including their upper bits. All three twelve-color palettes remain byte-identical; no palette writes are required. The golems' four native facing tables intentionally share frontal poses.

`family.draft.json` is the complete geometry proposal. Rumpel uses a 64×80 logical canvas, origin `[32,64]`, anchor `[0,16]`, and a 27-pixel body. Golems use a 96×112 logical canvas, origin `[48,96]`, anchor `[0,16]`, and a roughly 52-pixel body. The corrected reaction includes a vertical spark column, sampled at 60 pixels total. These logical canvases allocate no extra cells, VRAM or WRAM.

Each frame's cell origins are the original signed XY positions translated into the logical canvas. All **416 original signed XY bytes** survive compilation. Complete sampled sources receive only the declared integer translations: Rumpel16 shifts +3 in X; golem3/4/5 shift −4/+2/+4 in Y. All opaque source pixels fit. Rumpel26 and golem0/1/2/3/6/7 overlap native cell rectangles; all **373 duplicate opaque samples agree**, and original OAM order reconstructs the exact image without clipped extremities.

## Source correction and native roles

Five selected built-in image-generation PNGs contain 38 figures; 32 are consumed to fill the 36 unique native slots. `provenance.json` records prompts, hashes, references and the unused quality iteration. The official DreamWorks craft PDF is an identity/clothing reference, with its copyright and source URL recorded; no license transfer is asserted. No source anatomy is painted or procedurally rebuilt.

The original gait is **passing → contact A → passing → contact B**, at **10/15/10/15 ticks**. The repeated passing frame sits one pixel higher. The first sheet repeated some contacts, so the final pipeline uses an explicit front whole-source mirror and a separately generated profile contact B. The complete right cycle mirrors the left cycle. Native source cell8's wrong facing and the unsuccessful two-figure correction are unused. See `review/gait-contacts.png` and the labeled `review/role-review.html`.

All cloak/hand, airborne, reaction, speaking, laugh, turning and crouch roles retain their original indices and timing. The three airborne native offsets remain intact. The golem reaction uses the corrected narrow-spark source, preserving the finial and full body inside the original crown/hand cells. `native-role-notes.json` separates original source observations from their generated adaptations.

The final candidate is **b8640dd2f77cd6109cfa366ddbe973a95f8e9135fe33a6f2b9cf74d0af8a3c40**, on pinned baseline **f33843436880bf0b7988308e2d684065c8ef6c715641cfc0d3038232f1f8ca15**. The older successful candidate `9f3260b9…` predates the gait correction and is not final evidence. Its two manifests are retained under `proof-history/`; `proof-history.json` distinguishes the results.

## Verification

The final native proof passed **72 exact owner uploads and 35,738 visible PPU pixels**, including both Rumpel owners and both golem palettes. It uses the native four/twelve-cell raw loader, waits for settled DMA, and checks original palette pointers, complete source coverage, unchanged cartridge data and bounded heap use. No frame substitution is hidden as an idle pose.

The native animation scheduler executed all **68 nonempty original facing/mode lists over 16,320 ticks**. State is initialized once per list; frames are not injected tick by tick. `review/motion-review.html` is a separate offline visualization of the same original timing, with tested actor/list/pause/step controls.

Four authored encounters ran for **31,995 native ticks** on the final candidate:

| Original scene | Actual outcome |
| --- | --- |
| Night throne334 | Rumpel161 defeated with controller attacks; story189 and field control restored |
| Antechamber414 | Both Golem149 owners defeated with controller-selected elemental attacks and two recovery items; story201 and field control restored |
| Blackbird wing363 | Boss243 performs its original fear/countdown/retreat without attacks; D2=1 and original transition to special-purpose scene271 |
| Dragon deck377 | Rumpel162 defeated, original Y prompt accepted, D2=8 and original transition back to wing363 |

Every party survives. Measured scene heap peaks at **4,416 bytes**. These checks retain current event bytes, original actor IDs, formations, statistics, rewards, AI, animation programs and all palettes. Initial diagnostic entry/story flags and the endgame party are explicit in each report; no event/pose/enemy writes occur after entry. Blackbird requires recovered-equipment flags and story207. Story210 incorrectly starts a later Dragon branch concurrently and is excluded from acceptance.

`current-co-loads.json` audits unchanged current events and conservative actor unions for all ten shared locations, including the throne summon332, Dream Project340, scaffolding362, hangar367, abduction382 and usurpation424. The largest candidate union needs 23,744 decoded heap bytes before common runtime overhead. A loaded actor union is not a simultaneous-formation or visibility claim. Those remaining story branches and a connected whole-chapter route remain root's integration checks.

## Costs and integration

| Bank | Raw | Compressed | Assembly | Compressed + assembly | Growth vs original/current |
| --- | ---: | ---: | ---: | ---: | ---: |
| Rumpel143 | 8,256 | 5,334 | 1,120 | 6,454 | −387 |
| Wishworks216 | 8,000 | 6,313 | 960 | 7,273 | +3,696 |
| Total | **16,256** | **11,647** | **2,080** | **13,727** | **+3,309** |

The selected active baseline graphics/assemblies match original CT. Raw growth is 1,600 and 4,736 bytes; allocating full raw stream mirrors costs 16,256 bytes before alignment. Both banks fit the proven ≤32KiB bound. Root should use the current resource allocator, preserve original size flags and apply `family.draft.json` without extra frame offsets. Private 7D0000 proof addresses are not production allocations.

`integration-handoff.json` contains exact graphics/compressed/assembly/palette hashes, every frame origin, ownership, source-spec paths and limits. Register active copies of the two draft specs in distinct catalogue entries and keep active output outside this frozen directory. Battle names and dialogue intentionally remain unchanged in the private overlay; root should consolidate those with the approved casting decision during integration.

## Reproduction

From the repository root:

```sh
node assets/imagegen/rumpelstiltskin-wishworks/verify-frozen.mjs
```

This verifies the exact whitelist, source/prompt/reference hashes, recorded source crop, deterministic preview import and all graphics/assembly/palette bytes, then checks the accepted proof manifests. It does not write a canonical ROM or active registry. The source-only check uses the frozen family audit, not a moving active ROM.

With the pinned private baseline and original local reference available, the native proofs can be rerun with:

```sh
node assets/imagegen/rumpelstiltskin-wishworks/verify-native.mjs
node assets/imagegen/rumpelstiltskin-wishworks/verify-motion.mjs
node assets/imagegen/rumpelstiltskin-wishworks/verify-scenes.mjs night-throne golem-twins blackbird-wing dragon-deck
```

The whitelist excludes unused source iterations, exploratory probes, unfinished scene diagnostics, logs and superseded preview candidates. Small face/hand details remain limited by the 27-pixel model; silhouette and gesture carry identity. Independent-core and connected chapter verification remain separate production work.
