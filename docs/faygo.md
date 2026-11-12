# Faygo stat items

The three permanent stat consumables use colored Faygo bottles. Healing and
revival consumables keep their separate onion names.

| Native item | Replacement | Effect |
| --- | --- | --- |
| 205 · Power Tab | Orange Faygo | Power +1 |
| 206 · Magic Tab | Blue Faygo | Magic +1 |
| 207 · Speed Tab | Red Faygo | Speed +1 |

`content/faygo.js` defines the names, short inventory labels, colors and help
text. The original item properties, stat caps, permanent-growth behavior and
consumption routine are unchanged. Directly written gift dialogue uses the
same names; item-name control codes resolve to the new labels automatically.

The original floor items share generic Sparkle NPC 112 with unrelated events.
`content/faygo-pickups.js` identifies 36 verified location/object/item triples.
A 76-byte guarded helper at `C0:4595` substitutes one of three private NPC
headers only for those exact Sparkle loads. Other objects and NPCs retain the
source path. The bottle is generated art (`assets/imagegen/faygo/`): a chunky
icon with a white cap, orange body and a readable dark F on a cream label.
The five bottle frames intentionally share that static drawing while the
original sparkle program runs; they share 160 decoded graphics bytes and a
200-byte assembly table, and each color owns a private palette. The build audit
records fifteen raster frames and zero procedural frames. The native field
loader, pickup interaction, reward and story flag still execute normally.
No WRAM or VRAM allocation is added.

`tests/faygo.test.mjs` verifies inventory/help bytes, unchanged effect records
and cap/consumption instructions, all 36 selector cases and unrelated-object
fallbacks, CPU preservation, every bottle frame's uploaded pixels and palettes.
Existing chapter tests also verify the actual awarded item IDs and quantities.
The native actor preview offers Orange, Blue and Red Faygo, and
`npm run art:review` exports their current artwork alongside the hatchets.
