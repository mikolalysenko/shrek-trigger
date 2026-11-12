# Future wildlife and sewer characters

All future wildlife and sewer actors use their original Chrono Trigger artwork. The November 6 art-scope tightening (see [decisions](decisions.md)) retired the last two custom families, Sir Sludge and the frog guards, because they are neither plot-critical nor Shrek references.

## Stock generic encounters

The active build restores the original graphics, assemblies, headers, palettes and animation programs for these eleven families:

- Scavenger rats and Gremlins
- Wisps and workshop slimes/residues
- Rootlings, snapping briars and the Briar Rider
- Mire and Iron Golems
- Enchanted pots and beetles
- Sewer pods
- Drain and River Imps
- Lantern bats
- Krawlie and Hexapod (former Sir Sludge and Bog Baron)
- T'pole, Croaker, Amphibite, Bull Frog and Rain Frog (former Pond Pages, squires and Frog Guards)

The former generated banks remain under `assets/imagegen/` and the editable historical sources remain under `engine/future-*-art.js`; they are not active replacements. `tests/future-wildlife.test.mjs` compares every restored graphics pointer, decoded bank, assembly and native owner header against the base cartridge. Native encounters, theft branches, AI, rewards and scene routes are unchanged.

## Retained names

Krawlie and the Hexapod keep the battle names **Sir Sludge** and **Bog Baron**, because the sewer and chapter dialogue still name them. The frogs take back their stock names; the dialogue calls them guards. Guy Fieri's earlier private graphics/assembly/palette relocation remains required and is checked independently of the stock wildlife restoration.

## Scene and diagnostic checks

The existing scavenger theft, both ruins maps, conveyor battle, ruined-road route, recorder/race route and quiet/noisy sewer routes still run with the same enemy IDs and native programs. Restored stock sprites do not remove encounters or change collision, AI, rewards or progression.

```sh
node --test tests/future-wildlife.test.mjs tests/sewer.test.mjs tests/guard-art.test.mjs
npm run test:machine-art-cores
npm run test:woodland-art-cores
npm run test:guard-art-cores
```

The native actor preview and independent ROM-based checks may inspect restored stock slots as well as the custom sewer family. Pixel-source comparison and gallery generation use only the active custom sewer artwork, avoiding false comparisons against retired generated pixels. Historical generated-art cartridge hashes and acceptance counts in `production.md` describe earlier builds, not the current stock-art scope.
