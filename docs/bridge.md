# Bridge defense and southern villages

The bridge and neighboring villages now use the Shrek Trigger cast. Jack Horner commands skeleton soldiers and summons the two-part Bone Warden. The captain's ration quest uses Onion Bread, native item 219. Its quest behavior is unchanged. The abbey's optional photograph is described as a secret serpent portrait, matching the village collector's exchange.

`content/bridge-dialogue.js` supplies 178 strings across locations 134–140, including the existing Carnival Hatchet and Sir Bram/Puss passages. The native programs, choice masks, treasure instructions, prices and branch conditions are unchanged; only their string-table pointers move. Both bridge aliases are rebuilt. Location 135 is the playable bridge; location 134 has an unused placeholder map and is deliberately absent from the workshop shortcuts.

## Native artwork

The bridge enemies use their original Chrono Trigger art. Jack Horner keeps his custom sprite (see [medina](medina.md)); the November 6 art-scope tightening (see [decisions](decisions.md)) retired the bridge redraws because neither the boss nor its soldiers is a story character or a Shrek reference.

| Actors | Graphics / assembly | Battle names |
| --- | --- | --- |
| Zombor legs and its later echo (179, 181) | 170 / 163 | Bone Warden, Warden Echo (retained) |
| Zombor crown and its later echo (180, 182) | 171 / 164 | Bone Crown, Echo Crown (retained) |
| Defunct, Departed, Deceased, Decedent (43–46) | 108 / 71 | stock |

Graphics, assemblies, palettes, headers, AI, stats, elemental behavior and rewards are byte-identical to the base cartridge. The retired generated sources remain in `engine/bridge-art.js` and `assets/imagegen/` as inactive history.

## Route checks and shortcuts

Four reversible workshop shortcuts prepare the ration request, castle chef, supply delivery and bridge defense. All fixture state is set before a native `E0` transition. Exact undo and unchanged cartridge bytes are checked; the IPS contains none of these diagnostic injections.

`tests/bridge-controller.mjs` receives only memory reads, controller input and screenshots. It checks:

- The captain's request sets `$7F00A9` bit 2.
- Speaking to the chef, walking through the kitchen and dining room, taking the real staircase to the main hall, and crossing the native handoff trigger earns one Onion Bread and one Orange Faygo. The route then walks out of the castle into the overworld. The fixture includes the earlier castle-visit flag, preventing the first-visit guard scene from replaying.
- Declining the delivery preserves the bread and story state. Accepting consumes it through the native inventory instruction and advances story to 87.
- Declining the captain's request to fight leaves the battle flags clear. Accepting awards the original item 128.
- Two skirmishes load native formations containing two and three skeleton soldiers alongside Horner. The final formation contains both Warden actors. Ordinary attacks complete the fights with a strong diagnostic loadout.
- Fiona, Donkey and Pinocchio each deliver their applicable reactions. Victory advances story to 90 and the real western bridge exit reaches overworld 497.

The same routes run in SnesJs, Snes9x and bsnes. Controller waypoints thread the actual gaps around the captain and fallen soldiers. There are no gameplay writes after entering a fixture.

## Village services and Rowan's commission

Four more reversible shortcuts prepare the headman's commission, village inn, portrait collector and Rowan's information. They use story 90 and the early party, retain unrelated flags, and restore exact machine state on undo. The inn fixture starts with depleted HP/MP. The collector fixture prepares the earlier portrait discovery; the player still has to inspect the locked chest, negotiate and collect the reward.

The shared `tests/village-controller.mjs` driver checks these native branches in SnesJs, Snes9x and bsnes:

- The inn accepts or declines a 50 G stay, restores all active HP/MP after payment, accepts exactly 50 G and refuses 49 G without charging or healing.
- The collector offers the portrait exchange only after the locked chest is inspected. Refusal leaves it locked. Acceptance unlocks it, and opening it awards one Blue Faygo (item 206). A missing portrait prevents the offer, and an already-claimed chest cannot award a second item. The portrait discovery is a story flag, not an inventory item consumed by the trade.
- Rowan's information costs 30 G. Refusal still yields his free Rainbow Shell hint; 29 G is insufficient. A repeated conversation after payment repeats the information without another charge.
- A continuous route starts at the headman's doorway, plays all four commission lines, earns `$7F00F2` bit 0, walks out into the overworld, enters the inn, buys Rowan's information, then walks back out. No checkpoint or gameplay write occurs between those scenes. Native payment sets bit 1 of the same flag.

`tests/world-controller.mjs` observes the native overworld position and entrance table, then uses ordinary button presses to finish eight-pixel grid steps. It validates the entrance's destination before pressing A. This is test navigation only and adds no cartridge code. Message completion checks both the native textbox state and player control, because some nonblocking conversations leave movement enabled while their text is still open.

These checks establish native scene and route behavior with diagnostic equipment. Fresh-campaign balance, continuous overworld travel between the castle and bridge, the later Warden Echo encounter, and the remaining village/optional-quest conversations still need acceptance work.
