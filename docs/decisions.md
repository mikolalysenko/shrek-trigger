# Shrek Trigger design decisions

This log records decisions from the supplied design and the conversation, consolidated through the November 1 scope revision. Entries are ordered by topic and conversation sequence; they do not invent individual message timestamps. [Game design](game-design.md) is the consolidated current specification. [Production status](production.md) records implementation evidence separately.

## Confirmed scope and workflow

| Decision | Current result | Basis |
| --- | --- | --- |
| Project and source | Build in `Projects/shrek-trigger/` using the user's Downloads ROM/design. | Initial request. |
| Reversing reference | Consult Secret of Goku's approach and native-emulator tooling. | Initial request. |
| Prototype | Browser SnesJs, direct ROM patches plus specific CPU hooks/diagnostics. | Initial request. |
| Cartridge destination | Maintain a clean route to a real SNES cartridge; keep the prototype lightweight. Native data/routines should replace prototype dependencies as they are proven. | Follow-up architecture request. |
| Full objective | Finish the game end to end: graphics, characters, dialogue, cutscenes, techs and gameplay. A prototype milestone does not complete the goal. | Explicit `/goal` and repeated continuation requests. |
| Balance | Preserve Chrono Trigger's ordinary progression and stats; use the same native battle code in the combat sandbox. | Combat/progression request. |
| Development support | Area shortcuts, diagnostics, unit tests, combat sandbox, reviewable sprite sheets and visible progress. | Multiple requests. |
| Documentation | Keep a current design and log containing conversation updates while implementation continues. | Latest documentation request. |

## Cast, story and world changes

| Decision | Superseded proposal or detail | Current requirement |
| --- | --- | --- |
| Main cast | The seven original slot assignments remain fixed. | Shrek, Fiona, Donkey, Pinocchio, Puss, Mongo and Farquaad; Dragon replaces Epoch. |
| Swamp opening | A renamed Crono house alone is insufficient. | Rework the house/mom into Shrek's swamp and caretaker, with overworld changes too. Granny is the current caretaker implementation. |
| Talking Shrek | Silent Crono behavior. | Authored Shrek speech throughout dialogues and cutscenes; exact final-battle line “GET OUT OF MY SWAMP!” |
| ICP guardians | Original Masa/Mune and later Nine Lives Blade proposal. | Violent J and Shaggy 2 Dope, fusion as Great Milenko, final quest object a hatchet; correct all associated artwork. |
| Ohio spirits | Leaving small Masa/Mune-like figures as source art, or only changing Enhasa. | **All** such story spirits in Ohio must become juggalos or ICP, including palace/cutscene appearances and variants; do not leave any of these spirits as source art. Reconfirmed by the user after the documentation request. |
| Kingdom rebrand | The former kingdom of Zeal and its original setting treatment. | The kingdom is **Ohio**. Rewrite player-facing captions, dialogue and objectives, and adapt setting themes and story-relevant NPCs around Ohio rather than changing only the name. Preserve native map topology, encounters, choices and progression. Generic enemies still use stock Chrono Trigger art. November 1 scope revision. |
| Magic joke | Generic mechanical explanation for Pinocchio. | “Fucking magnets,” the question about how they work, and the supplied scientist complaint when corrected. Use only the provided four-line Miracles excerpt. |
| Element names | Lightning and Shadow labels. | Air = Lightning, Dirt = Shadow; Fire/Water unchanged. Apply to status/menu/help/dialogue. Shrek is Air; Farquaad is Dirt. |
| Spekkio | Earlier Doris casting, including the six-tier art candidate. | **Guy Fieri in all six forms**, lessons, practice fights and related dialogue. User explicitly marked this important; highest-priority current character change. |
| Queen of Ohio (source role: Queen Zeal) | No new casting change required. | Fairy Godmother remains in this role, including the giant face/hand encounter; the setting and dialogue receive the Ohio rebrand. |
| Dalton and summoned golems | No counterpart was named in the supplied design or conversation. | Rumpelstiltskin and matching enchanted wishworks golems. Root selected this during the full-cast art audit; this is an implementation decision, not an additional user-named cameo. Keep the original encounters and mechanics. |
| Gaspar | Original design proposed Big Bad Wolf. | Steve Harwell, Smash Mouth lead singer, including his other guru appearance. |
| Resurrection | Immediate original Time Egg handoff. | Antagonize Steve into eating 24 ordinary eggs as the critical prerequisite; then retain the rest of the resurrection quest. |
| Cameo scope | Original “Tyson is the only unrelated celebrity” rule. | ICP, Steve and Guy Fieri are user-approved exceptions. |

## Guard artwork integration choices

This section is historical provenance for work already integrated. Its generic guard, frog and sewer-monster art is superseded as a production requirement by the November 1 enemy-art scope; no further mob replacement or acceptance work follows from it.

The shared civic guard/Sentry bank becomes a human Duloc soldier and its original spectral recolor. The sewer bosses retain Sir Sludge/Bog Baron and receive generated troll/mace artwork. Frog guards and squires retain generated cap/tunic designs and their original indexed shadows. These are implementation details within the full-graphics request, not new user-named cameos. Guy Fieri’s private art and shared native animation remain unchanged. The unrelated blue court/jail officer uses another bank and is handled separately. See [native guard art](guard-art.md).

## Combat and inventory changes

| Decision | Current requirement | Status of the choice |
| --- | --- | --- |
| Cyclone | Name it **Fart**, retain a similar spin, spin 3× faster, fart over enemies, farty sound, chance to poison. | User-confirmed. Earlier Swamp Spin name is superseded. |
| Poison tuning | 25% chance, respecting immunity, with original damage and 2 MP. | Current implementation choice within the requested poison mechanic. |
| Luminaire | Earlier stock-Luminaire scope revision and the native Swamp Belch implementation. | **Swamp Belch** replaces Luminaire's name and presentation with the giant translucent fart cloud. Preserve the original Air damage, all-enemy targeting, 20 MP cost, progression and combinations. The user explicitly reconfirmed that the cloud was better than stock Luminaire on November 1. |
| Eye Lasers | Paired eye beams and brief target flames; original line/Air effect, no burn mechanic. | Required by supplied design; native presentation implemented and still subject to campaign review. |
| Piledriver | Safe grab/jump/rotation/slam, plus anchored fallback for oversized or multipart bosses. | Native paired jump, Shrek somersault, slam and synchronized cleanup; a shared 101-byte classifier selects the anchored presentation for techs 4 and 7 without altering damage. |
| Four Layer Slam | Three impacts and one finishing throw, preserving Confuse’s four hits and 12 MP. | Native 239-byte scene; shared anchored-target selector. All three emulator checks pass. |
| Magic preservation | Earlier renamed or reanimated elemental, healing, revival, status and magical combination techniques. | Stock magic keeps its exact Chrono Trigger name, animation and mechanics for party members, enemies and shared resources, except for the explicitly approved **Swamp Belch** cloud. Other custom work is limited to physical/character-driven moves and explicit exceptions. This supersedes Ogre Roar, Storm Breath, Get Up and the other magical rename plans, but not Swamp Belch. | November 1 technique-scope revision with the user's subsequent Swamp Belch exception. |
| Puss/Mongo skill exchange | Puss had Heal and Cure II; Mongo had Charm. | Puss gets **Charm** with Ayla's steal mechanics in the old Heal slot; Mongo gets Frog's stock **Heal** in the old Charm slot. Puss's Slurp becomes **Cat Kiss**, and his Cure II becomes **Nine Lives**, healing a living ally with Cure II strength or reviving a fallen ally like Life II while retaining Cure II's unlock and MP cost. | User-requested ownership/mechanics exception. |
| Combination participants after the exchange | Double Cure, Twin Charm, Cure Wave and Boogie used the old skill owners. | Move them respectively to Fiona + Mongo, Fiona + Puss, Pinocchio + Mongo and Pinocchio + Puss. IDs and underlying effects stay intact; every ordinary pair retains three doubles. | Required to keep combination prerequisites coherent after the exchange. |
| Stat tabs | Replace every Power/Magic/Speed Tab with colored Faygo. | User-confirmed, superseding onion stat tabs. |
| Faygo colors | Orange Power +1, Blue Magic +1, Red Speed +1. | Current implementation mapping; underlying item effects unchanged. |
| Healing | Keep the onion consumable system. | Original confirmed design; Faygo applies to permanent stat tabs, not all healing. |
| Combat sandbox | Same native engine and techniques as the game, with reversible fixtures, retry and logs. | User-confirmed. |

## Art direction and source decisions

| Decision | Current result |
| --- | --- |
| Quality target | Recognizable Shrek counterparts with Chrono Trigger-consistent SNES pixel art; full frame-by-frame review, not just standing poses. |
| Enemy-art scope | Custom sprite art is kept only for the playable cast, characters critical to the plot and direct Shrek references. Generic/random enemies, ordinary townspeople and route bosses with no story role keep their original Chrono Trigger sprites, palettes and animations; random or obscure redraws only make the patch larger. Retired boss redraws keep the battle names their dialogue uses. November 1 scope revision, tightened on November 6 at the user's request (see below). |
| Delegation | Sprite work is explicitly delegated across characters; accepted work returns as source files, role maps, palettes and native proofs for integration. |
| Production method | Use actual image generation or authentic supplied game art/model references. Geometric placeholder anatomy is not final art. |
| References | GBA Shrek art is a style reference; user supplied mobile Shrek, V.Smile Shrek/Puss sheets, and local downloads. |
| Shrek selection | User chose **V.Smile reference on the right**. Use the model from `~/Downloads/506339.png` consistently. |
| Shrek review | Earlier Shrek sheet was rejected. The selected V.Smile model now has all 24 former acting gaps authored and verified; no fallback or provisional native frames remain. |
| Fiona review | User found Fiona more acceptable; this does not waive full animation/scene review. |
| Tyson | Use `~/Downloads/32931.png` as the approved reference/source. |
| API fallback | User authorized a locally configured image-generation API fallback. Credentials stay outside tracked source and documentation; no key is recorded here. Rejected Shrek/Pinocchio requests were not treated as completed artwork. |
| Title logo | Fading logo must say **Shrek Trigger**, with Shrek ears/antennae on “Shrek” and the dramatic style of the original opening. |

The user-provided visual links were the Shrek mobile sheet at `spriters-resource.com/mobile/shrekforeverafterthemobilegamejava/asset/256482/`, Puss at `spriters-resource.com/v_smile/shrekdragonstale/asset/215812/`, and Shrek at `spriters-resource.com/v_smile/shrekdragonstale/asset/506339/`. Local accepted sources and their hashes are the reproducible build inputs.

## Music decisions and Claude coordination

1. The user requested All Star in the intro or swamp, an SNES arrangement, recurring Smash Mouth references, and reworked ICP fight music.
2. After supplying the MIDI, the user preferred the original opening's epic character and initially suggested restricting the changed theme to the swamp.
3. The user requested native-cart-like instrument voices and authorized a narrowly focused Claude Code music task using Opus 5.5 at maximum effort.
4. A separate Claude agent then took ownership of soundtrack adjustments, explicitly including the Chrono Trigger and Epoch themes. The current direction therefore includes those arrangements while preserving the source themes' style and structure.
5. Claude's `.local/claude-music-handoff.md` records integrated All Star Trigger, Wings and Pendulum work. The latest recorded music commit is `1396f24`, Pendulum v2. Its smooth build/reveal and fade supersede the earlier pendulum arrangement. The morning cue remains unchanged.
6. The user assigned Claude the **title sequence**. Its supplied-logo implementation from `e86161b` is integrated as `77fe3bb`, preserving the stock clock dial, hands and native fade. Read the handoff and current source before follow-up changes; do not overwrite its music/title work from an older snapshot.

Current composition roles: supplied-MIDI All Star for the swamp; All Star mashups for title/attract, boot pendulum and Dragon flight; original Hatchet Carnival for both ICP phases. Keep native samples, timing/cue compatibility and effect-voice budgets. Historical test totals in Claude's handoff remain tied to their original revisions.

## Current ownership and integration rules

| Area | Owner or workflow |
| --- | --- |
| Title sequence | Claude's supplied-logo implementation is integrated; coordinate follow-up through the handoff. |
| Chrono Trigger, pendulum and Epoch/Dragon music | Claude's integrated work; coordinate any follow-up through the handoff. |
| Game implementation, native loading, campaign, tests and design log | Codex/root integration work. |
| Sprite source passes | Explicitly delegated art tasks, then reviewed and integrated by root. |
| User's live browser game | Preserve it; use separate diagnostic sessions and private candidate ROMs for tests. |

## November 2 design lock

The user asked to finish the remaining design projects and lock in the game design. The first complete version is now frozen to this document and the consolidated game design: 78 stock techniques and 38 custom or explicitly modified techniques, only the eighteen catalogued custom combination presentations, stock Water/Water II rather than Milk variants, stock generic NPC/enemy artwork, the established cast and four celebrity exceptions, and the existing native campaign/finale structure. Remaining work is ROM implementation, integration, connected playthroughs, independent-emulator/hardware acceptance and release packaging. Scope expansion requires a new explicit user decision; do not revive branch experiments as new requirements.

The subsequent merge-all request includes the completed **Hot Sauce** follow-up as an explicit amendment: Flare keeps its damage, 20 MP cost, targets and progression but receives Donkey's native chili-bottle presentation. The amended totals are **77 stock and 39 custom or explicitly modified techniques**. The older Milk and all-custom-combo branch experiments remain excluded.

## November 4 superboss amendment

The user asked for an optional super boss with custom graphics as a late-game bonus encounter, funny, challenging and rewarding. This explicit request amends the design lock with one optional encounter: the **Onion Ogre**, Guy Fieri's sentient blooming onion, in the End of Time lesson room after the Ocean Palace. It uses an unused native enemy record, native AI, cloned enemy techniques, battle messages and an appended field object; Guy's lessons and practice fights keep their behavior. Image generation was unavailable when it was built, so its sprite is provisional hand-authored pixel art with an image-generation prompt kept for a later pass. See the Onion Ogre (since replaced by [Mr. Worldwide](mr-worldwide.md)).

## Build evidence at this documentation update

The Guy Fieri and boss milestone is cartridge `9c71e7a894d94b3f00cc02e195478c4cb0141a2b39b0822967b41f9918fdf287`. Guy Fieri’s generated artwork, all six training forms and related dialogue are integrated. Horner, Briar Knight, Moth Witch, Dozer, spectral Sir Bram, Crag Keeper and Magic Mirror are active. All thirteen Ohio/Ocean Palace spirit loads select ICP or Great Milenko.

The regression suite passes 242/242, both independent cores pass all 738 boss-owner frames, and the original Magic Mirror battle passes through victory in all three emulators. The exact fingerprints, final Mirror-label delta and scene-coverage limits are recorded in [production status](production.md). Floating IPS reconstructs the final BPS exactly. This remains a development milestone; complete campaign and remaining art/tech choreography are required.

The subsequent Shrek correction is active in cartridge `511e120ca47aa4f9c61371d4ecd264d0b1848061a649ee16b162cfe3f6bb109c`. It changes eleven images while retaining the selected V.Smile model and all other 237 native images. All 248 player uploads and the affected frozen-Shrek NPC pass; both independent cores verify the changed poses. Twenty-seven acting gaps remain. Details and reproduction are in [Shrek artwork](shrek-art.md). Bakery and Court Beast source-art passes remain delegated and inactive.

New conversation decisions should update both this log and the corresponding section of [game design](game-design.md).

## Endgame graphics integration

The endgame source packets are accepted into published cartridge `21abd2c3bb7b`: Rumpel, Wishworks Golems, giant Godmother, oven interior and supplied-sheet Tyson emergence. Original combat mechanics and sprite-cell limits stay intact. Spekkio remains Guy Fieri in all six implemented forms; the Ohio spirits remain ICP/Great Milenko. The new endgame art does not supersede those conversation requirements or imply that remaining late-game dialogue is finished. See [endgame artwork](endgame-art.md).

## Court and swamp artwork integration

The generated Duloc court sergeant is the original unarmed NPC16 officer, distinct from the civic/spectral sword guards. The Palace Hexer and swamp imp/roller/rider families preserve original combat mechanics and all palette variants. Independent rider and mount cells are retained rather than flattening their covered source pixels. Battle names adapt the creature variants; no major-character casting is changed. Guy Fieri remains Spekkio in all six forms, and Ohio spirits remain ICP. See [court and swamp artwork](court-swamp-art.md) for the implementation and bounded scene evidence.

## Art scope tightened to plot and Shrek references (November 6)

The user asked to revert enemy and NPC redraws such as the forest Kilwala and the Hench, keeping only characters critical to the plot or direct Shrek references, because random obscure redraws are pointless and enlarge the patch. The user then chose to revert five route bosses with no story role and the Reptites, and to keep the baked Bakery villagers (the Gingy/Mongo gingerbread tie the era's dialogue relies on).

Restored to stock art: Kilwala (former Woodland Sprite), both Hench, household residents, townswomen, bats, the Juggler and its Flea decoy, the bridge skeletons, the sewer frogs, Proto 2/3/4 (former Ushers), the Mage (former Palace Hexer), the court officer NPC16 (former Duloc sergeant), Reptites (former Crumb Hunters), and the bosses Krawlie and Hexapod (Sir Sludge, Bog Baron), Heckran and Tubster (Crag Keeper, Crag Echo), Zombor (Bone Warden and its echo), Nizbel and Nizbel II (Kilnback, Iron Kilnback) and the Guardian (Supply Keeper, including its background body). Generic enemies also take back their stock battle names; the bosses keep their adapted names because dialogue and labels use them.

Kept custom: the playable cast and supporting cast, Duloc guards, the Masquerader, Duloc Tank, Rivet, Jack Horner, Briar Knight, Moth Witch, Sir Bram's ghost, Master Glaze and the Furnace Maw, the Bakery villagers and sky drakes, ICP, Guy Fieri, Magic Mirror, Rumpelstiltskin, the Wishworks Golems, the Fairy Godmother, the Cosmic Muffin family, Tyson and the Onion Ogre.

Restored stock banks use the native decompressed path again instead of raw streams. The exception is the four townsfolk banks of the crowded ending scenes (11, 12, 35 and 36), which keep the raw streams of the verified candidate: decompressing them shifts those scenes' timing enough that the development emulator (SnesJs, which does not model the short odd-frame scanline) phase-locks the native vblank poll in "What the Prophet Seeks", although Snes9x and bsnes pass either way. The BPS shrinks from 2,119,913 to 1,770,421 bytes (−16.5%).

## Superboss replaced by Mr. Worldwide (November 7)

The user asked for weirder superboss ideas than the Onion Ogre, in the spirit of ICP and Guy Fieri, and chose **Mr. Worldwide (Pitbull)**. The requirements were:
- fire-themed attacks;
- battle music that rearranges "Fireball" with a Chrono Trigger boss theme mixed in;
- a fight in a secret location in a Kodiak, Alaska Walmart, which Pitbull calls his exile;
- kept simple, with a straightforward unlock that works within the game's limits.

The user supplied the Fireball MIDI (kept private, like All Star), and the arrangement quotes only that file plus Boss Battle 2 read from the player's ROM. Melody was never written from memory.

Chrono Trigger has no spare interior location: every apparently empty slot belongs to an ending or the developers' room. So the stockroom borrows the aisle-shelving Arris Dome storeroom map (344) only while a visit flag is set, and the visit is a self-contained scene that always returns to Guy's kitchen. A lost Walmart greeter (stock NPC 28) in Guy's kitchen is the unlock. The Onion Ogre's enemy record, sprite slots, battle messages, technique slots and flag byte are reused; its art, room strings and test suite are retired. The story gate, reward, balance bands and no-game-over rules are unchanged.

## Remaining hand-drawn graphics replaced with generated art (November 7)

After reviewing Mr. Worldwide's provisional sprite, the user asked to fix the review's issues and to "use imagegen via openai for all the remaining sprites", then to "fix all the placeholder graphics and make sure all the sprites look great". The user supplied an OpenAI API key for direct Images API access (stored outside the repository) and directed the newer `gpt-image-2.6` models, with backgrounds masked out.

Generated with `gpt-image-2.6-sunburst`, sampled through the shared importer with recorded key-color masks, and checked at native size and in game:
- Mr. Worldwide's eight poses;
- the Carnival Hatchet, Ruby Hatchet and broken hatchet parts;
- the Faygo bottle;
- Dragon's harness fragments;
- the sky drakes' field and world poses (the earlier moderation block did not recur);
- the Fart gas puffs and the Eye Lasers target flames.

Three importer steps are recorded integer transforms of generated pixels, not drawing:
- breathing shifts;
- spin flips;
- the key-color mask.

Each source folder lists its rejected attempts by request ID.

Kept as code-drawn by design: the Eye Lasers beams (straight lines at sixteen angles) and the element status badges (text labels like the stock badges). The portrait and supporting-cast drawing code is a dormant fallback; every shipped frame comes from raster sources.

## Superboss theme reworked around the drop (November 7)

After listening, the user found Fireball · Boss Battle 2 "not intense enough … too mellow/relaxed" and asked to "really get the original intense fireball theme with the trumpets and then the drop/FIREBALL". Measured on the driver, the old arrangement ran at 116 BPM (the tempo byte is beats per minute), slower than the file's 123. It also led with the file's verse material (strummed vamp, sax chop, Latin verse percussion), played the hook on harp and leaned on long string pads under heavy echo.

The new form follows the file's own shape instead:
- the trumpet riff in octaves;
- a build (the sax chop, a string riser, a snare roll and the file's tom fill);
- the one-hit stop at file bar 17, where Pitbull shouts "Fireball!", as two full-band "FIRE–BALL" hits and silence;
- the drop, with the file's four-on-the-floor kick, offbeat hats and timbales plus a snare backbeat, and a sixteenth-note string ostinato on the vamp's own voicing.

Boss Battle 2 stays as the middle section over the same beat. The tempo is 136. Echo is lighter and dry on the drums and bass. Two voices still stay free for battle effects. It is still Boss Battle 2 rather than the faster Boss Battle 1, which the user did not ask to change.


## Technique presentation reopened (November 8)

The user asked that **every** technique have a funny, visually unique, Shrek-themed animation, and to avoid changing the original Chrono Trigger balance ("it was already pretty good"). This supersedes the November 1 magic-preservation rule and the November 2 lock for presentation only:

| Decision | Current result | Basis |
| --- | --- | --- |
| Technique presentation | All 116 techniques get distinct Shrek-themed effect art and, where funnier, a new menu name. Shared art between techniques (for example the reused cookie and heart sprites) is replaced so each one reads differently. | User request, November 8. |
| Technique mechanics | Damage, MP cost, targets, elements, status effects, prerequisites and TP thresholds stay exactly as in Chrono Trigger. Effect colors do not change elements. | Same request: keep the original balance. |
| Boss difficulty | Bosses keep their original stats; campaign routes use real tactics (items, target order, healing techniques) rather than easier fights. | Same conversation. |
| Party portraits | The 32px party art and portraits stay as they are. | Same conversation ("the portraits are fine"). |
| Milk spells | Puss’s Water and Water II become **Milk** and **Milk 2**: same Water damage, targets and MP, with the water effect palette swapped to milk white instead of blue. This replaces the earlier "no Milk spell variants" rule. | User request, November 8. |
| Stock technique scope | **Mix**: every remaining stock technique gets a Shrek-themed menu name and its own color theme (effect palettes recolored only while that technique is cast); then full sprite redraws for about 15–20 signature moves, one at a time (Waffle Toss first). Shapes of the other stock effects stay native. | User choice, November 8, after the Waffle Toss pilot showed each stock effect's sprites must be traced individually. |


## Polish pass (November 10)

The user asked for a pass over the art, design and techniques to improve visual and aesthetic quality, keep everything playable, fun, funny and working, and allowed edits to any aspect of the game. Within the standing rules (original balance, approved party portraits and 32px party art):

| Decision | Result |
| --- | --- |
| Technique help text | Every technique gets its own Shrek-flavored help line that still states the effect and target. Text only. |
| Menu labels | Clipped labels are replaced with whole words; two moves are renamed to fit (Are We There Yet?, Cold Snub). |
| Swamp Belch | Same cloud, same mechanics; its outline is precomputed so the effect no longer blanks alternate frames. |
| Overworld heroes | Donkey and Pinocchio get hand-drawn 16×16 map sprites, completing the set of seven. |


## Empty house, ogre stats, onion money and a script pass (November 10)

The user asked to punch up the dialogue, get rid of Granny ("that character makes no sense"), and update stat names, currency and items, then chose among options:

| Decision | Result |
| --- | --- |
| Granny | **Nobody: Shrek lives alone.** Removed. Duloc's bell and a note wake him, the 200 coins come from an onion jar by the stove, visitors react to the house, and the cat bolts on its own in the ending. This supersedes the "Swamp opening" caretaker row above. |
| Stand-in recovery | The user asked that the Shrek doll stay recoverable for the resurrection once Granny is gone. Her event object and every flag are kept; the doll itself already starts the handoff scene, which now plays as the party robbing an empty house. Covered by `tests/empty-house.test.mjs`. |
| Currency | **Onions.** An onion glyph follows amounts in menus, shops and battle; field text says "200 onions". |
| Healing items | Because onions are money, the onion consumables become swamp food (Weed Rat, Fish Eye, Swamp Toad Soup, Sock Whiff, Outhouse and so on). This amends "Healing: keep the onion consumable system": the system and every effect stay, the names change. Quest items keep their names. |
| Stat names | **BEEF, ZOOM, AIM, SLY, MOJO, LAYER, EARWAX** for Power, Speed, Hit, Evade, Magic, Stamina and Magic Defense, on the status screen and in item help. |
| Dialogue | A full pass over the field script for voice and jokes under `docs/writing-guide.md`: facts, hints, choices, control codes and layout are fixed; wording is not. Contractions are allowed. |

## Funny techniques and joke mechanics (November 11)

The user asked for "funny techs for all party members", with a Dragon summon as Donkey's ultimate, and then: "make sure the tech concepts are funny. they need to be unique and shrek themed for all characters, make whatever changes would be more hilarious. its ok to over power/nerf techs if its a good joke", followed by free rein to change whatever makes the game more fun, entertaining and unique.

| Decision | Result |
| --- | --- |
| Donkey's ultimate | **Call My Wife** on Flare: Luminaire's scene record with a generated Dragon picture, Flare's damage, targets and MP. This supersedes the Hot Sauce amendment for tech 24; **Hot Sauce** is now the name of his Fire II (tech 22). |
| Technique balance | Party techniques may differ from their source mechanics for a joke. This amends "stock magic stays stock" and the technique freeze. Boss and encounter balance stays as it was. |
| Love & Life | Full revival (Life II's effect record) at Life's MP. |
| Some May Die | 0 MP; each other party member drops to 1 HP when Farquaad queues it. Nobody is killed outright, so it cannot end a battle by itself. |
| Names | My Swamp!, Run Away!, Fresh Eggs, Web Candy, Balloon Pet, Big Eyes, My Buttons!, Compensate replace Ogre Roar, Storm Breath, Fairy Dust, Kung Fu, Wish Dust, Charm, Gumdrop Stomp and Tantrum. Source files and older documents keep the earlier names. |

## Toenail money, spicy roots and a meowing cat (November 12)

The user's notes after playtesting: Puss "should meow not ribbit"; "weed rat makes no sense... it's fine for healing items to be something like onion/mid onion/high onion and mp to be garlic... go with spicy root vegetables for healing items. currency can be switched to toe nails."

| Topic | Decision |
| --- | --- |
| Currency | **Toenails.** A toenail-clipping glyph follows amounts in menus, shops and battle; field text says "200 toenails". Supersedes "Currency: Onions" (November 10). |
| Healing items | **Spicy root vegetables.** Onion / Mid Onion / High Onion (HP), Garlic / Mid Garlic / High Garlic (MP), Horseradish (full HP and MP), Wasabi (full MP), Ginger Root (whole party), Radish Bunch (party HP). Mud Bath, Sock Whiff, Outhouse and Mystery Pie keep their names. Effects, prices and drops are unchanged. Supersedes the swamp-food names (November 10). |
| Frog's croak | Field events that play the frog croak (sound $6E) play the cat meow ($4E) instead, through the sound driver hook in `engine/tech-juice.js`. |
