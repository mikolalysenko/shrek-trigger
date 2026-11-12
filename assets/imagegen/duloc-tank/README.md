# Duloc Tank source pass — frozen inactive candidate

This package replaces the earlier procedural wooden siege-cart art with three actual built-in image-generation sources. It preserves the established teal boiler, timber hull, brass crown/nozzle, D shield and iron/wood wheel. Root and the visual lead approved all eight native poses and compound proportions. Root accepted the actual battle and recovery evidence before this freeze.

The chassis, head and wheel remain enemy 147 /173 /148, gfx 124 /145 /144, asm 119 /139 /138. Shared palette 184 keeps the current twelve colors byte for byte; it has no unrelated owners or pointer aliases. All headers, AI, animation lists/durations, event target slots and collapse choreography remain unchanged. There are no active registry, engine, canonical ROM, title or music writes.

| Part | Native frames/cells | Decoded bytes | Compressed | Assembly |
|---|---:|---:|---:|---:|
| Chassis | 1 /24 | 2432 | 1654 | 240 |
| Repair head | 5 /4 | 2112 | 1293 | 200 |
| Wheel | 2 /4 | 1024 | 768 | 80 |
| Total | 8 | 5568 | 3715 | 520 |

Compressed graphics plus usable assembly total4235 bytes: **+1468** versus current earlier art, **+290** versus original CT usable resources. Decoded growth is+992 /+1056 respectively. The fixed size-class 3 chassis is below its original2944-byte decoded allocation; its native 96-tile upload is3072 bytes. The other two banks use ordinary four-cell loading. This private proof uses compressed loading throughout and makes no new streaming claim.

The chassis is the entire generated source scaled to81 pixels high and sampled into128×112. Every opaque pixel fits the original24 irregular cells, with no clipping, overlap, cropped extremity or cell movement. Head and wheel remain32×32 with existing project anchors [32,-49] and [-2,6]; chassis anchor [0,16] is unchanged. The old dragon jaw's per-frame8 pixel origin compensation is documented in the source audit, separately from the already-normalized project mechanical head geometry. Original head 4 is a closed-jaw copy shifted down1 pixel; the project repair-glint interpretation is retained explicitly.

The unused chassis assembly record is **not entirely zero**: its192 tile bytes are zero, but its48 XY bytes contain offsets. All240 bytes stay reserved and unchanged. It is not a second generated chassis pose.

## Evidence and review

- `review/contact-sheet-1x.png` and `compound-4x.png`: all head states with original compound anchors, plus both wheel phases.
- `review/motion-review.html`: exact60Hz native-list arithmetic, selectable facing/scale and one-tick stepping. Its four moving panels animate one component at a time; a separate panel holds static repair4. The GIF is a convenient review with centisecond-rounded timing.
- `native-verification/manifest.json`: all8 actual native uploads and3810 exact displayed pixels for the seven head/wheel frames; exact shared palette. Large chassis kitchen foreground occlusion is not claimed as a full pixel proof.
- `motion-verification/manifest.json`: all48 valid head/wheel mode/facing lists pass7200 native ticks. Head 4 is not in the inspected timed lists; original location28 uses it as a static operand during approach. Size-class 3 does not animate through the ordinary frame path.
- `scene-verification/manifest.json`: original location28 loads the three owners in objects 13/14/15, uses24800decoded heap bytes, wins with57 controller taps, completes7F021A=1 and returns through bridge recovery. The test kit/checkpoint is reversible; after entry only controller input advances events. The manifest records original nozzle commands and all part movement.
- Charging/firing captures `original-field-head-2.png` and `original-field-head-3.png` each prove32 actual OAM cells and their relative XY coordinates. All538 /549 turret pixels match exactly. In each frame61chassis and176wheel pixels lie behind the original foreground rail at nativey144–155. These recorded mismatches are intentional scene occlusion; they are not clipped source pixels. The approach capture is partially offscreen and is not a complete compound-cell proof.
- `original-tank-battle.png`, `original-collapse-descent.png` and `original-bridge-recovered.png`: actual native fight, separated falling chassis and recovery. The earlier battle-start flag7F0199 is not treated as the completed-collapse flag.

The second original scene347 is audited for ownership and source function use, but is not executed here. This is not an independent-core proof or a fresh-campaign/full-prison playthrough. Root owns integrated co-load checks and Snes9x/bsnes verification.

## Reproduction

Run from the repository root, with the existing local original ROM and saved QA cartridge. No API key or fresh generation is needed.

```sh
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/duloc-tank/chassis-import-spec.draft.json
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/duloc-tank/head-import-spec.draft.json
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/duloc-tank/wheel-import-spec.draft.json
node assets/imagegen/duloc-tank/compile-draft.mjs
node assets/imagegen/duloc-tank/verify-frozen.mjs
```

The three draft specs are intentionally inactive. `integration-proposal.json` supplies root-applicable active-spec destinations, strict raster roles, native geometry, exact bank hashes and verification commands. `provenance.json` records each original output, prompt and reference hash. `earlier-art-frames.json` freezes the prior prototype solely for reference and cost reproduction; none of those pixels substitute for final generated artwork.

`reproducibility-files.txt` is the minimal explicit whitelist. It excludes scratch logs, redundant original atlases, the misleading first-pass capture named `original-collapse-start.png`, and partially loaded diagnostic captures. The freeze checks every listed artifact and recompiles all three banks. The saved private proof uses ROM2e2a574e… and in-memory candidate2d7ddfa7…; no ROM image or checkpoint is written.
