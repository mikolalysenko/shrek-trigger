# Tyson’s interim reveal — frozen inactive art

This packet replaces enemy11’s old humanoid reveal between the living oven’s defeat in location475 and the final Tyson formation in479. All eight poses reuse the approved Punch-Out!! Tyson pixels supplied by the user in `Downloads/32931.png`. It does not redraw Tyson or change gameplay.

Open [the native review](review/index.html) for all eight poses at1×, the original60Hz animation lists, and actual native emergence/challenge recordings. [The real final formation](scene-verification/native-final-formation.png) follows the original event, with the existing final combat artwork unchanged.

## Source and semantics

The pristine shared source is `assets/raster/tyson/source-user-32931.png`. The import duplicates the approved final Tyson sampling and its twelve palette indices exactly. Eight selected approved rasters are translated as complete images into the old reveal’s native anchors. No anatomical pixels are drawn, erased or recolored.

| Native frame | Approved sheet cell | Role in this adaptation |
|---|---:|---|
|0|23|Crouched emergence|
|1|24|Rise with glove|
|2|6|Boxing guard; original mode5, not requested in the observed475 event|
|3|0|Standing low guard|
|4|11|Glove beside head, adapting the old humanoid challenge|
|5|25|Raised uppercut glove, adapting the original raised-arms gesture|
|6|1|Idle weight shiftA|
|7|2|Idle weight shiftB|

Original frames6/7 vary the old humanoid’s lighting/face. This adaptation uses distinct approved Tyson weight shifts; they are not claimed to be newly authored eye-motion poses. The eight source frames remain at the approved final Tyson scale, rather than stretching his anatomy to the old humanoid silhouette. Every original opaque bottom and the original actor anchor are preserved. Six of96 cell positions move to fit complete source pixels; no cells are added. The exact moves and bounds are in `draft-frame-map.json` and `draft/audit.json`.

## Native contract

Enemy11 is the only owner of graphics238, assembly224 and animation187. It uses twelve cells, eight nonblank120-byte assemblies, and palette233. That palette is also used by206/237/239; all24 palette bytes remain untouched. All final Tyson/Ward/Core source graphics, assemblies and AI bytes are separately checked against the pinned baseline.

The new bank is6,880 decoded bytes (215 tiles),3,228 compressed bytes and960 assembly bytes. The old bank is5,024 decoded /4,094 compressed /960 assembly. The inactive proposal uses the already proven size2 native raw-stream path for238: no additional WRAM, VRAM or OAM reservation. Keeping both packed and raw copies adds6,014 cartridge bytes after reclaiming the old packed graphics, before allocator alignment. The raw bank fits a32KiB lower-half bank.

`import-spec.draft.json` is the direct production-compatible raster spec: key`tyson-reveal`,96×128 staging canvas, native origin[48,80], source-native sequence0..7. `prepare-draft.mjs` compiles the exact cell placement and adds48 to emitted Y bytes to retain that origin. Root owns promotion, runtime selection and stream-table registration. No active files were changed by this packet.

## Verification and limits

- Isolated native proof: all8 uploads,96 cells,8,533 exact displayed pixels and shared palette233.
- Original animation187:28 nonempty direction/mode cases,2,288 ticks, original request timing. Native DMA boundaries can display the complete prior pose for one tick; no torn frame is accepted.
- Actual original475 introduction and battle after a diagnostic entry:19 ordinary tech commands,3 MegaElixirs,0 revives; victory returns through the real event. The private combined interior/reveal stream configuration uses2,944 heap bytes.
- Actual475→479 continuation:3,763 ticks,14 confirm taps only when dialogue is active. Source-indexed pixels match all seven requested reveal poses at field[128,127], rendered OAM origin[128,111]. The original final formation is206/237/239.
- Emergence0/1 and early3 deliberately use the original white-silhouette fade. Canonical shared233 colors are separately proved on later3/4/5/6/7. Frame2 is covered by isolated/original-list proof, not claimed to appear in this event.

The source-native upload proof and the real transition are separate tests. Field tile allocation wraps its VRAM tile layout in this compound scene; the reveal proof therefore checks each actual OAM cell’s complete indexed pixels, coordinate, palette and displayed RGB. It does not infer an invalid contiguous block from the object’s initial tile number.

The private proof is pinned to canonical`f33843436880bf0b7988308e2d684065c8ef6c715641cfc0d3038232f1f8ca15`, plus the separately frozen oven interior packet and this reveal. The resulting private SHA is`2ecae664d4aa4ebf0abbefd900dac48f52ab05c4a1c7781c2d05eb59c647ff40`. No native helper code changes. Complete preceding shell/world campaign traversal, the final battle’s full branch matrix and independent-core checks belong to root integration QA.

## Reproduce

From the repository root:

```sh
node assets/raster/tyson-reveal/reproduce-draft.mjs
```

This verifies the frozen manifest, imports the approved source and direct reveal spec, recompiles the graphics/assembly, exports the review, then verifies all hashes again. It writes only this inactive packet. The private original ROM and pinned8MiB baseline are not distributed.

To rerun native proof, provide the privately held baseline at `private/base-f33843436880.sfc` and the original user ROM at `.local/chrono-trigger-usa.sfc`, then run `verify-native.mjs`, `verify-motion.mjs`, `verify-scene.mjs`, `verify-reveal.mjs --animation` and `verify-ownership.mjs` from this directory. The first native script creates the local new-game checkpoint. The real battle/reveal checkpoint is earned through the original controller path. Frozen interior source files are read as a separate proof dependency and never modified.

The two APNGs are exact60Hz native recordings:700 emergence ticks (500–1199 after the victory checkpoint) and200 glove-challenge ticks (2800–2999). Their source capture frames and save states stay in ignored `private/`.
