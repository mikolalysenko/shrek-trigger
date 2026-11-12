# Hench gfx83 — inactive ownership and source proposal

This read-only audit is pinned to published **af338374669168012da0165d385209c5d3aa9789bb713ef488ef7dcb06e555a7** (root commit 210099e). It compares the original USA ROM **06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9**. No image generation or replacement candidate has started. The specific source direction awaits root review.

Propose **ordinary stout hobgoblin townsfolk and hired fists**: broad blunt nose, readable ears, soft work cap, rounded patched tunic, rolled sleeves, large bare fists and boots. The same creature must read as a peaceful Medina resident and a cathedral/fortress combatant. Keep the two exact original ramps: peach/purple for enemy 5, gold/blue for enemy 75, with gray cap/trim. No named cameo, new major faction or weapon is needed. This model should remain distinct from the frozen blue swamp Imps/Rolys and the named enforcers.

The brief follows the generic fairy-tale residents/creatures in [game design](../../../docs/game-design.md), Medina's [refugee and peaceful-business dialogue](../../../content/medina-dialogue.js), [contracted fortress beasts](../../../content/fortress-dialogue.js), and [cathedral staff/guard context](../../../content/medieval-dialogue.js). No existing dedicated Hench casting or accepted source was found; the lead confirms none is held in its inventory. The lead supports this proposal and independently checked original slots 12–17. The tumble interpretation is this worker's inspection, not a second review.

## Ownership and unchanged bytes

| Owner | Native header | Palette |
| --- | --- | --- |
| Enemy 5, Hench | 83,38,24,30,0,0,240,16,16,65 | 24 |
| Enemy 75, Hench | 83,38,23,30,0,0,240,12,20,65 | 23 |

Both are enemy headers, including when used as friendly townsfolk. There are **no NPC header owners or unrelated pointer aliases** for gfx83, asm38, palette23/24 or AA30's frame/duration programs. All graphics, assembly, palettes, animation bytes and AI match original CT. Full size flag is 0: four 16×16 cells per slot. Native stats/reward hashes are recorded without alteration.

| Resource | Original CT | Published af338 |
| --- | ---: | ---: |
| Decoded 4bpp gfx83 | 8,928 | 8,928 |
| Compressed gfx83 | 7,491 | 7,491 |
| asm38, 37 × 40 bytes | 1,480 | 1,480 |
| Compressed graphics + assembly | 8,971 | 8,971 |

The bank is currently legacy loaded. Prefer source/tile reuse within 8,928 bytes; if necessary, root can select gfx83 for the proven four-cell stream path and allocate compressed art in extended ROM. Keep the strict default guard, 32 KiB heap, original cells and fixed assembly extent. No replacement byte estimate is asserted before generation. The kitchen's 1,440 spare bytes are not permission to bypass the original bank guard.

## Complete pose and timing audit

There are **37 nonblank, referenced native slots**. Slots 0–11 are four directional three-phase gaits; slot 12 is a common curled/side-tilted recoil. Slots 13–24 are directional wind-up, long-arm sweep and recovery triplets. Slots 25–36 are directional body tumbles, retaining face/cap/back orientation rather than a uniform ball.

AA30 has 160 frame bytes and 40 duration bytes. Its 36 nonempty facing/action lists give 72 later owner-specific timing cases. Walk uses **20/10/20/10** ticks; the same strike poses run at **16/4/32** in action 4 and **10/4/10** in action 7. Actions 8/9 use **5/5/5**. Actions 0/3/6 hold idle for 5/31/5 ticks, action 5 holds recoil12 for 5, and action 2 is empty. No damage-window or combat interpretation is inferred from this static audit.

Exactly eight full-raster pairs mirror about x = −0.5: 6/9, 7/10, 8/11, 19/22, 20/23, 31/34, 32/35 and 33/36. Those permit 29 distinct authored source poses for 37 slots. The rear/front gait contacts, tumble 25–30 and nearly mirrored recovery 21/24 are **not exact duplicates**. Preserve their distinctions.

Authored four-cell reservations span x **−34..33**, y **−42..2** across the family; do not force all poses into a centered 32×32 canvas. The long left/right arm sweep reaches x −34 / x 33. Cell overlap/order is meaningful in frames 1, 4, 13–15 and 25–30. Every frame's exact cell origins, visible bounds, pixels and components are in [role-audit.json](role-audit.json). Only six isolated one-pixel index-4 motion flecks are identified in 14/17/20/23. Long arm arcs need actual generated/source-based artwork; no procedural anatomy or fabricated effects.

Review [all 37 poses at 1×](review/original-native-1x.png), enlarged [gait0–5](review/original-frames-0-5-3x.png), [gait6–11](review/original-frames-6-11-3x.png), [recoil/strikes12–17](review/original-frames-12-17-3x.png), [strikes18–23](review/original-frames-18-23-3x.png), [tumbles24–29](review/original-frames-24-29-3x.png), [tumbles30–35](review/original-frames-30-35-3x.png), and [slot36](review/original-frames-36-36-3x.png). [Original motion playback](review/original-motion.html) reproduces source lists at 60 Hz; it is not emulator execution.

## Scene consumers and loading

42 original-site loads are verified in the current bytes across 13 locations. No selected original load site is unresolved. Newly inserted loads and all control-flow branches have not been exhaustively decoded. The following are all-branch graphics unions with existing stream exclusions, **not observed simultaneous residency**.

| Location | Original scene name | Owner | Loads | Legacy union | With gfx83 streamed |
| ---: | --- | --- | ---: | ---: | ---: |
| 31 | Medina Square | 75 | 3 | 20,000 | 11,072 |
| 35 | Medina Inn | 75 | 1 | 21,504 | 12,576 |
| 39 | Medina Market | 75 | 1 | 18,176 | 9,248 |
| 48 | Heckran Cave Entrance | 75 | 2 | 10,656 | 1,728 |
| 60 | Castle Magus Hall of Aggression (Ending: Legendary Hero) | 5 | 2 | 16,896 | 7,968 |
| 125 | Castle Magus Doppleganger Corridor | 5 | 2 | 19,904 | 10,976 |
| 131 | Manoria Headquarters | 75 | 10 | 21,344 | 12,416 |
| 132 | Manoria Royal Guard Hall | 75 | 4 | 21,376 | 12,448 |
| 166 | Castle Magus Entrance | 5 | 4 | 11,424 | 2,496 |
| 170 | Castle Magus Hall of Aggression | 5 | 8 | 22,880 | 13,952 |
| 201 | Manoria Storage | 75 | 3 | 9,088 | 160 |
| 202 | Manoria Kitchen | 75 | 1 | 31,328 | 22,400 |
| 341 | Present Age Jail Cell (Ending: The Dream Project) | 75 | 1 | 13,888 | 4,960 |

The largest union is kitchen 202: gfx83 **8,928** + gfx87 **12,288** + gfx111 **10,112** = **31,328**, against 32,768. Explicit streaming of gfx83 would leave 22,400. Preserve all three resources and the kitchen dialogue; this is a context/load audit, not a completed gameplay proof.

Later native validation should cover 74 owner/pose uploads (296 cells), both exact palettes, 72 AA30 cases, peaceful and hostile Medina, a cathedral encounter and enemy 5's fortress encounter. Existing [Medina controller](../../../tests/medina-controller.mjs) and [independent runner](../../../scripts/independent-medina.mjs) provide native inn/market choreography; known formations are [75,72,72] and [75,124]. Keep real event/AI flow and verify display latency separately from timer equality. No such new-art execution is claimed here.

## Reproduction and limitations

Run from the repository root:

```sh
node assets/raster/hench-family-audit-af3383746691/audit-native.mjs
node assets/raster/hench-family-audit-af3383746691/audit-roles.mjs
node assets/raster/hench-family-audit-af3383746691/finalize-audit.mjs
```

The private baseline, source ROM, reference event JSON and CTViewer scene-name list are required; their fingerprints and code dependencies are recorded in [audit-manifest.json](audit-manifest.json). [native-audit.json](native-audit.json) contains exact ownership, source resource hashes, palettes, programs, geometry, source load offsets and unchanged selected battle instructions. [proposal.json](proposal.json) distinguishes the pending design and future proof plan from measured facts.

Event object hints use nearest function-entry heuristics; they are not runtime object proof. Static facing labels do not prove damage windows. This audit changes no active module, canonical ROM/gallery, title/music, or gfx11/35/81 packet. Actual image generation and a new inactive source directory remain subject to root's direction review.
