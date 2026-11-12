# Remaining Shrek acting audit — inactive

The selected **Shrek: Dragon’s Tale V.Smile model remains intact**. This packet audits the 27 explicit source substitutions left after approved ROM `511e120ca47aa4f9c61371d4ecd264d0b1848061a649ee16b162cfe3f6bb109c`. It does not activate artwork or change an approved/frozen source file. No Shrek image-generation request was made; the earlier rejection remains in force.

The useful new result is a narrower interpretation of the airborne strike frames, plus two bounded selections from existing V.Smile pixels. The expressive story gaps remain honest pending work. All 168 V.Smile components, 205 mobile catalogue entries and 125 GBA components were inspected. The mobile catalogue includes effects, palette and editor remnants; it does not contain 205 usable body drawings.

## Review

- `remaining-native-comparison.png` compares all 27 original native poses and current Shrek pixels at the same pixel scale. Original cell offsets are respected before tight cropping. Magenta identifies original dynamic weapon/effect palette indices 13–15; those colors are diagnostic and never enter a proposed Shrek asset.
- `vsmile-candidates.png`, `mobile-candidates.png`, and `gba-candidates.png` show exact source crops, native reductions, and explicit role limitations. Every V.Smile preview sample equals the corresponding approved source sample exactly.
- `bounded-proposal.png` shows the two possible same-model improvements. `bounded-proposal.json` contains exact source choices, pixels, hashes and budgets. Root and the visual lead approved it for a later integration batch; it is still inactive.
- `motion-review.html` plays all 43 relevant original direction/mode lists at their original 60 Hz durations, with a single-tick control. The browser replay is separate from the native execution evidence.
- `scene-verification/` contains actual approved-ROM observations in ten ending destinations, including drinking, laughing, seated acting and the principal Moonlight Parade locations. The frame-labeled captures require the real PC0 graphics pointer, three stable native-cache ticks and exact uploaded tiles. Scene 398 places Shrek partly behind scenery; it is staging evidence, not an unobstructed full-body proof.

## What can improve with the selected model

| Native slot | Original role evidence | Bounded source proposal |
| --- | --- | --- |
|194|Upright rear body, weapon directed upward; native mode 57/facing 0.|Use authentic V.Smile source 20, a rear airborne drawing with raised arms, instead of crouch 35. This is an existing jump adapted to an upward strike.|
|219|Its original cropped pixels are byte-identical to 195; only cell placement differs. It is the downward stage of mode 61.|Reuse approved inverted airborne source 175, already used by 195, instead of inverted closed-eye standing source 174. Source 175 is a documented whole-source 180° permutation of V.Smile 71.|

Root and the visual lead approved both bounded selections as source-backed adaptations. Root still owns activation. The two changes reconstruct all 248 four-cell frames exactly, change only 194/219, and preserve 246 other frames plus all three native blanks. Proposed raw player graphics are **30,592 bytes**, packed assembly **4,520 bytes**, saving **416+40 bytes** from the approved 31,008+4,560. The existing 12-color palette and normalized 32×32/four-cell geometry are unchanged. These are raw player-bank costs, not compressed NPC-bank costs. Candidate-specific emulator/independent-core activation remains root-owned; the native execution below tested the approved ROM.

The active 27 pending labels remain untouched. The approved draft classifies 194, 195 and 219 consistently as adaptations, leaving 24 pending slots: source 60, adapted 161, fallback 24, blank 3. Slot 195 retains exactly its existing pixels. Neither pixel change supplies new authored expressive story art. `native-map.draft.json` contains the four justified role rows (194/195/219/220); `full-proposal-preview/import-spec.draft.json` is the complete inactive source specification. Its 176 source frames reproduce all 248 proposed native slots exactly.

## Semantic corrections and remaining work

`semantic-findings.json` records the evidence independently of any art decision. **220 is a horizontal airborne weapon strike**, not an unconscious body. Original mode 61 is 220→221→222→219, five ticks each. 194/221 are upright rising orientations; 195/219 are inverted descending orientations. The current role key `down` is not a reliable semantic description for 219/220. No source-scene use of these four gap slots was found in PC0-loaded objects; combat consumers are outside this event audit.

232/233 belong to the two-contact rear phase of the prison escort walking program 67, used alongside movement through the prison routes. The constrained-hand/escort interpretation follows the original body and choreography. The key `hold` is not evidence that an external item is present. Existing V.Smile rear arm gestures do not provide matching constrained-hand gait contacts.

`role-decisions.json` lists all 27 slots separately. No supplied same-model source provides a confirmed seated body, folded arms, full laugh performance, cup/sipping, one-eye wink or true lying/unconscious body. V.Smile mouth-open and raised-arm gestures are real drawings, but relabeling them as those performances would hide the gap.

The supplied mobile sheet has genuine seated/landing 161/162, inverted 59 and handstand 127/128/130 bodies. The anatomy, camera and expression differ from the selected model. Its tallest handstand would be 35 px at a 30 px standing reference; a uniform 25 px standing reference is used in this comparison to retain the whole figure inside 32 px. The supplied GBA Hurt/Dead strip has genuine prone bodies, but its much larger head and compact proportions differ markedly from V.Smile. Neither alternate model is approved for mixing. No body-part grafting or painted anatomy was attempted.

## Native and story evidence

`native-verification/manifest.json` records **27 exact native uploads**, **43 native direction/mode lists**, and **7,740 native ticks** on the fixed approved ROM. Each 180-tick list is initialized once and then run by the native engine; there are no per-frame pose writes. The frames, palette, animation bytes and cartridge remain unchanged.

`story-source-audit.json` checks each reference pointer against the original ROM location header and event table. It identifies 447 PC0-owning location entries, including 30 named ending destinations, and 39 potential locations using the remaining gap roles. This is a conservative static audit: branch conditions, current facing, shared function callers and player-controlled movement can narrow actual use. Three unused locations 461–463 have invalid shared LZ pointers and zero reference commands; they are explicitly excluded. Function 0 determines initialization; the lowest pointer is not necessarily function 0 when functions alias an earlier object's code.

The ten actual destination observations reached:

- 345: 246/247 drinking loop, via native initialization mode 73.
- 398: 204/205 laugh loop and 208 static state; the conditional folded-arm branch was not reached by this diagnostic entry.
- 399: 235/236 seated sequence.
- 46: 237 seated initialization followed by 204/205 laughter.
- 239, 79, 80, 81, 85, 86: original actor loading and ordinary poses; no additional pending pose was reached during the bounded observation.

These are native destination observations with late-game party setup and periodic controller A input. They are **not a completed playthrough of every ending**, and they do not claim all conditional story branches were exercised. The principal Moonlight Parade source objects do not explicitly request these 27 substitutions in the audited functions; their ordinary movement and other acting remain outside this narrow source-gap review.

## Reproduction and ownership

Run from the repository root. The original legally supplied CT ROM and saved approved `511e120c` artifact remain external test inputs; this packet contains neither ROM.

```sh
node assets/raster/shrek/acting-audit-remaining/verify-frozen.mjs
```

The verifier checks frozen hashes, exact source-crop provenance and the two complete 248-frame compiled candidates without depending on a later active Shrek mapping. The baseline snapshot contains all approved indexed frame pixels; `source-import-spec.json` preserves the approved sampler specification. `prepare-root-proposal.mjs` derives the accepted inactive spec and four role rows from those frozen inputs. Source images and original transform PNGs are referenced by exact hash in `provenance.json`; the pristine source images and transform are reused from their existing repository paths. The three component catalogues are snapshotted locally. The minimal whitelist omits duplicated per-crop/native PNG derivatives; their exact crops, hashes and standalone review pages remain included.

To regenerate the initial audit from the approved source state, run `prepare-audit.mjs`, then run the generic importer with `--preview-spec` on the three inactive `*-preview/import-spec.draft.json` files. `render-review.mjs` and `prepare-proposal.mjs` reproduce the review artifacts. Only the new audit directory is written. `verify-native.mjs` replays the fixed approved ROM; `--scenes-only` repeats just the destination observations after a fresh native opening.

Root approved the bounded selections and classifications; activation, full story/ending completion and independent-core verification remain root-owned. There are no new active import specifications, registry entries, engine edits, palette allocations, VRAM/WRAM allocations, canonical ROM writes, title changes or music changes here.
