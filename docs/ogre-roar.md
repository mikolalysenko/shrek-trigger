# Ogre Roar

Single tech 03 replaces Lightning's presentation with a windup, open-mouth roar, expanding green shockwaves and a selected-enemy hit reaction. Lightning's Air damage, one-enemy targeting, 2 MP base cost, unlock and combination data remain unchanged. It adds no status effect. The menu help reads **Air roar on foe**.

The presentation runs entirely in cartridge data. Its 44-byte program occupies the original 334-byte Lightning scene at `CE:0A64`; no space is reclaimed from the unused tail. The build rejects another animation, channel or subscript owning that region. It selects the original Hypno Wave graphics and background cleanup while leaving that shared scene and all sleep-effect records unchanged. The native Tyrano roar cue uses the existing sound library and samples. No CPU hook, ROM allocation, working RAM, VRAM, palette slot or object cell is added.

The caster closes his eyes, starts the existing background wave, plays his two mouth phases and releases the selected target's original hit subscript through native counter B. The original background completion signal restores the renderer. The current supplied-sheet Shrek pose mapping is used; remaining acting substitutions are tracked in [Shrek artwork](shrek-art.md).

`tests/ogre-roar.test.mjs` checks source ownership, unchanged mechanics, every party slot, the clown duo and Great Milenko, exact HP/MP changes, native mouth and sound requests, selected-target reaction, renderer cleanup and a following Eye Lasers turn. `npm run test:ogre-roar-cores` performs controller-selected casts in the original clown encounter in Snes9x and bsnes, with each party position, audio clipping checks and a following Eye Lasers turn. Diagnostic setup ends before entering the encounter.

The first independent candidate, `68af39c1c681eb615cfbaf57f6f1ed18ce5b3e01de7303646f1a6caccc252ba1`, passed 28,305 frames in Snes9x and 28,310 in bsnes. Integration changed the menu help to include Air, producing `cb2983da9aeaa3516e34e6017a05c4a62a87cbbeead40640282272adfd4d71c5`. The exact difference is thirteen description bytes and four checksum bytes; all executable, animation, graphics, palette, sound and gameplay data are identical. Evidence remains under each fingerprint rather than being relabeled. Integrated regression, browser, gallery and source-reproduction checks are recorded with the current milestone in [production status](production.md).

The gallery exporter includes three native stills and an animated cast. The combat sandbox selects the same tech through the ordinary Tech menu.
