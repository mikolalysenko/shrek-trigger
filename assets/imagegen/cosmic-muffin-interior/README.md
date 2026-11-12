# Cosmic Muffin oven interior — inactive source packet

The generated living oven heart and paired baked arms replace scene475's native background body and enemies204/205. Enemy203 remains the original blank two-frame placeholder, preserving its shared graphics/assembly with9/10/241. The body, warm exclusive ramps, actual lower attachments and three pulsing regions were visually approved by root. [Review at native scale](review/index.html) includes all12 compound poses, original animation controls and a72-frame actual-PPU pulse capture.

The two arms each retain12 cells and12 native slots. Twelve generated source poses supply one12,640-byte indexed bank, with explicit whole-source reflections and original integer offsets for the other side. The shared packet compresses to12,128 bytes and each already-adjusted assembly is1,440 bytes. Only guard frames3/4 permit overlap; every duplicated opaque pixel agrees. Original incidental remote pixels in right-side6 and nonidentical details in5/11 are not claimed retained. The accepted sampling retains the original top anchors while reducing each source's native pose height to90% and using horizontal scale0.9; full per-frame bounds are in the audit.

The body repacks its dedicated layer0 metatiles without clipping to the old nonblank footprint. Map32, collision, metatile0, lower/cave metatiles144–511, cave resources and all event/AI programs remain exact. BG181 and only the owned body portion of BG182 change. BG56/slot7 and OBJ226 receive the approved warm15-/12-color ramps; they have no outside palette owners. The blank center sprite, Tyson and final Ward/Core are untouched.

All three native pulse regions remain at their original destinations416–427 and original metatile references. Actual generated dim/base/bright images supply the original A/B/C/B sequence. Only shared BG22 source tiles116–163 change;208 other tiles remain exact. The five BG22 consumers, every pointer alias, world-table alias and layer3 usage were audited: the changed48 source tiles belong exclusively to tileset46. Every original animation byte is unchanged. Original/generated execution traces match over1,200 native ticks and3,600 exact128-byte destination checks, including the observed one shorter interval. No falsely constant-cycle timing claim is made. The72-frame framebuffer sample verifies52,992 pulse pixels outside the original battle-announcement rectangle.

Native evidence is pinned to historical cartridge`2e2a574e5b11…` with private overlay`a9302e4da4c4…`, not the newer canonical release. All24 arm uploads,288 cells and35,892 displayed pixels pass. The original animation182 programs pass88 cases/9,568 ticks, with at most one video-frame delay at a complete native DMA boundary. The actual background checkpoint proves9,143 exposed body pixels;705 are hidden by the arms and248 are above the original viewport. Original field objects205/204 stay at[78,109]/[178,109]; observed OAM origins are[78,93]/[178,93], with the renderer's8-pixel framebuffer offset.

The original scene475 introduction, formation, fight, defeat and reveal pass after a diagnostic jump with the documented level60 endgame kit. Normal controller input executes19 AoE techs and consumes3 MegaElixirs, with0 revives and no damage, AI, event or victory-flag changes. The subsequent3,759-tick cutscene uses13 confirm taps and reaches the actual scene479 formation. Complete natural predecessor traversal remains a campaign check. The historical interim humanoid reveal actor still appears between these scenes; this separate sprite is explicitly outside this body/arms/pulse packet.

The historical build decompresses both arm copies and reaches32,352 of32,768 heap bytes. Production must explicitly stream gfx208/209 through the established12-cell native path; do not extrapolate current campaign co-load safety from416 bytes of historical headroom. No extra VRAM, OAM cells or WRAM reservation is introduced. The shared arms compress6,893 bytes smaller than the original pair; background/metatile/pulse compression grows286 bytes. See `integration-proposal.json` for exact final bytes, ownership, palettes and already-adjusted assembly hashes. Root owns production allocation, naming and independent-core branch validation.

Reproduce the frozen source-to-native assets (no image generation, active registry or canonical output writes):

```sh
node assets/imagegen/cosmic-muffin-interior/reproduce-draft.mjs
```

Reproduce native evidence using the locally held original and pinned private ROMs:

```sh
node assets/imagegen/cosmic-muffin-interior/verify-native.mjs
node assets/imagegen/cosmic-muffin-interior/verify-motion.mjs
node assets/imagegen/cosmic-muffin-interior/verify-pulse.mjs
node assets/imagegen/cosmic-muffin-interior/verify-scene.mjs
node assets/imagegen/cosmic-muffin-interior/verify-background.mjs
node assets/imagegen/cosmic-muffin-interior/capture-pulse.mjs
node assets/imagegen/cosmic-muffin-interior/verify-reveal.mjs
```

The final three scripts consume genuine scene checkpoints created by `verify-scene.mjs`. Private ROMs, save states, original-game reference images, failed driver runs and unused sampling candidates are excluded from the frozen file list.
