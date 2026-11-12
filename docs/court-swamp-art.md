# Court and palace artwork

The court officer, the Mage enemies and the swamp imp family all use their original Chrono Trigger sprites. None is a story character or a direct Shrek reference, so the November 6 art-scope tightening retired the former Duloc court sergeant and Palace Hexer redraws.

| Family | Graphics / assemblies | Native owners |
| --- | --- | --- |
| Court officer (former Duloc court sergeant) | 158 / 151 | NPC16 |
| Mage (former Palace Hexer) | 90 / 47 | Enemy59 |

The officer keeps his unarmed court, prison, sleeping and 1999 acting roles, and the Mage takes back its stock battle name. Graphics, assemblies, palettes, headers, animation programs, AI and rewards are byte-identical to the base cartridge, and neither bank is reclaimed or streamed. The Duloc civic and spectral guards in graphics 78 stay custom; see [guard art](guard-art.md).

## Stock swamp family

Graphics86 and assemblies43/63/65 are restored exactly for NPC78 and enemies12–19/242. This covers the Swamp/Rain/Bog/Gold Imps, Moss/Sand/Plum/Ash Rollers and Imp Rider. Their encounter formations, native AI, labels, palette variants, friendly Medina worker and compound eight-cell rider timing are unchanged. The retired generated replacement remains only as inactive source material.

`tests/court-swamp-art.test.mjs` compares all 83 stock swamp frames, both restored court banks and every owner header against the base cartridge. ROM-based scene and independent-core checks continue to exercise the original canyon and rider encounters.

## Retired sources

The generated court sergeant and Palace Hexer packets remain in `assets/imagegen/` as inactive historical sources. They are not compiled into the cartridge.

## Diagnostics

```sh
node --test tests/court-swamp-art.test.mjs tests/court-swamp-scenes.test.mjs
npm run test:court-swamp-art-cores
npm run test:court-swamp-scenes
```

The scene driver still covers the trial and prison intake, countdown/rescue, castle escape, original canyon and rider encounters, Medina worker, palace piazza, connected lift, bounded ending, sleeping officer, ending jail and1999 initialization. Stock-art restoration changes pixels and names only; it does not remove any of these routes or native animation frames. Historical generated-art counts and cartridge hashes in `production.md` describe earlier builds.
