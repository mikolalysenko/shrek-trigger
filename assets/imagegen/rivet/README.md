# Rivet — frozen inactive source packet

This package replaces Rivet's full shared field bank, six racing projections and two miniature icons with actual generated raster art. It does not activate any production resource. The brass face/goggles, teal cap and jacket, red scarf, winding key and integrated folding tricycle are one consistent model.

The approved field sheet is [review/field-native-1x.png](review/field-native-1x.png); the native timing review is [review/motion-review.html](review/motion-review.html). The enlarged field/race/miniature sheets are adjacent. The 8×8 miniature icons read as vehicle silhouettes; facial readability is not claimed at that size.

## Ownership and original roles

- NPC2 and enemy244 share gfx37, asm26 and exclusive palette157. There are no graphics, assembly or palette pointer aliases. NPC2 retains animation77; enemy244 retains142. Both headers and the46-byte enemy AI remain unchanged.
- All25 original field slots remain visible. Native source mirrors are3←2,7←6,13←12,20←18,21←19 and24←14. Slot23 reuses6 with its original1-pixel lower placement. All original signed cell XY bytes are preserved.
- Source slots8/9 are opposite-foot front gait contacts. Slots10–13 retain alternate wheel phases and native bob;14–16 are unfolded lean/large heel exhaust/small exhaust;17 raises both hands;18–21 are low racing crouch beats;22 is half-folded;24 faces right. The earlier-art simplifications of these roles are not copied.
- Original NPC2 locations are93,223,225 and239. `events-source-audit.json` records their owning objects and functions. The actual racecourse introduction and both returns are proven; the other story/cameo scenes are audited, not claimed as complete playthroughs. No original source event loads enemy244; its full native bank/animation remains separately tested.
- Cinematic packet2 is exactly9,216 raw-index bytes: six24×24 views at offsets0,1536,3072,4608,6144,7680 with64-byte row stride. Every unused40-column suffix remains zero. Views0–2 are profile motion beats,3 is a genuine rear-quarter,4 front and5 rear.
- Only bytes128–255 of packet1 belong to Rivet's two8×8 miniatures. Its first128cart bytes remain exact. All512packet3 palette bytes, including both existing15-color Rivet rows9/13, remain exact; these generated sources consume the first12opaque colors. Packet0, packets4–12, race code, all HUD/scenery, and the separate parked-cart BG37/tileset7 are untouched.

## Source and geometry

The five original source PNGs and their five prompts are listed in `provenance.json`. They came from the built-in imagegen tool. There was no API fallback or manual pixel painting. Field artwork uses18source poses; the race adds one generated rear-quarter pose and resamples five approved riding poses. Miniatures are mechanical resamples of the real front/rear riding source.

The first source sheet's two attempted walking poses both led with the same foot. They are explicitly excluded; separately generated opposite-foot/opposite-arm sources replace them. Native mirroring, translation and quantization are fully specified in the draft specs. The large/small exhaust imports are translated3/2pixels right from their initial component centering to align their heads with the unfolded pose; the entire sampled steam remains inside its original cells.

Field sprites use a48×48 logical sampling canvas, `anchor:[0,3]` and25sets of the four original16×16 cell origins. This changes no hardware reservation. `compile-draft.mjs` proves every source pixel survives4bpp/assembly round-trip, all200original XY bytes agree, and there is no cell overlap or clipping. Remove the earlier actor's `frameOffsets` when applying the supplied geometry, otherwise its bob would be applied twice.

| Resource | Candidate | Original CT | Active earlier art |
| --- | ---: | ---: | ---: |
| Field raw graphics | 6,944 | 4,480 | 3,328 |
| Field compressed graphics | 4,281 | 3,762 | 1,624 |
| Field assembly | 1,000 | 1,000 | 1,000 |
| Race projection compressed | 1,174 | 1,650 | 950 |
| Combined miniature packet compressed | 83 | 197 | 101 |
| Compressed resources + assembly | **6,538** | **6,609** | **3,675** |

Candidate payload growth is **+2,863bytes versus active earlier art**, or **−71bytes versus original CT**. These are asset-size differences, not an allocator reclamation claim. The miniature compressed cost assumes the preserved current cart half. Root may stream the6,944-byte field bank under the proven≤32KiB contract; raw streaming adds that raw payload to its selected storage plan. No extra WRAM/VRAM is required by the art or racing formats.

The private compressed proof used saved ROM`2e2a574e…`, with candidate ROM hash`376207d55c4b2f5e33caf29361f048b92ad931fc99472cfc740fda7f0b6d6ca3`. Conservative saved-build whole-location bank unions are28,192bytes in93,10,496 in223/225 and29,856 in239. These are not measurements of root's newer integrated streamed batch. Root owns capacity selection and integrated scene checks.

## Verification

- `native-verification/manifest.json`: **50exact uploads and21,846exact displayed-pixel checks**, all25slots through both actual native owners. Each frame settles through the normal queue before PPU capture.
- `motion-verification/manifest.json`: **72original direction/mode lists and12,960native ticks**:44lists for NPC77 and28for enemy142. Native mode state is initialized once per180-tick observation; individual poses are not injected during timing checks.
- `race-verification/manifest.json`: the original introduction, ordinary course walking, one actual boost, controller victories in both modes, no-boost camera turns/restoration, and native earned record**706**. Read-only bus tracing proves consumption of all six projection views and every128Rivet miniature source byte, excluding decompressor back-reference reads.
- Packet1 temporarily decodes at7F:8A00. Native code consumes the miniature images before packet2 overwrites that buffer with racing projections. A retained full miniature buffer after racing starts is therefore not a valid assertion.
- Source projection buffers, all existing racing palettes and preserved packets match exactly. Actual PPU race screenshots are visual output evidence, not a mathematical pixel-by-pixel proof of the perspective projector. No independent core, hardware or complete future chapter claim is made here.

Useful actual captures are `native-verification/npc2-6.png`, `race-verification/native-introduction-complete.png`, `native-boost-race.png`, `native-turned-camera.png` and `native-no-boost-record.png`. The displayed cart and surrounding cast belong to the fixed saved build.

## Reproduction and root integration

Run from the repository root, with the existing source ROM and fixed saved QA ROM available:

```sh
node assets/imagegen/rivet/audit-native.mjs
node assets/imagegen/rivet/audit-events.mjs
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/rivet/field-import-spec.draft.json
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/rivet/race-import-spec.draft.json
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/rivet/minimap-import-spec.draft.json
node assets/imagegen/rivet/compile-draft.mjs
node assets/imagegen/rivet/verify-native.mjs
node assets/imagegen/rivet/verify-motion.mjs
node assets/imagegen/rivet/verify-racing.mjs
node assets/imagegen/rivet/build-motion-review.mjs
node assets/imagegen/rivet/verify-frozen.mjs
```

All proof overlays exist only in emulator memory; the scripts write no cartridge or checkpoint. The importer is preview-only. `integration-proposal.json` provides root's exact actor geometry, registry keys, binary hashes, guarded packet operations and suggested integrated checks. `reproducibility-files.txt` is the exact minimal commit whitelist; exploratory previews, diagnostic dumps and obsolete probe scripts are excluded. Do not activate any draft until root's scoped integration.
