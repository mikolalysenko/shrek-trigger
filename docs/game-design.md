# Shrek Trigger game design

Shrek Trigger is being built as a complete adaptation of the English SNES Chrono Trigger into a Shrek adventure. It keeps the original exploration, time travel, three-character party, progression and combat framework while replacing the cast, dialogue, cutscenes, graphics, items, technique presentation and major story motifs. The final threat is a Cosmic Muffin whose last guardian is Mike Tyson.

This is the current design, incorporating the supplied **Shrek Trigger ROM Hack Design, version 1.2, October 30, 2026**, and subsequent conversation decisions through the November 1 scope revision. The later decisions below override conflicting proposals in that document. Implementation evidence belongs in [production status](production.md); a design requirement here is not a claim that it is finished. The [decision log](decisions.md) records the changes and their ownership.

**Design lock — November 2, 2026.** The first-complete-version scope is frozen at the user’s request. The 77 stock and 39 custom/modified techniques, established cast and cameos, Ohio rebrand, stock generic NPC/enemy art, item/equipment families, Dragon routes, resurrection challenge, and Tyson finale are the authoritative target. The later Hot Sauce follow-up and the optional superboss (November 4, recast as Mr. Worldwide on November 7) are included as explicit amendments. Do not add Milk spell variants, rename stock combinations, commission generic mob art, add playable slots, or introduce another combat/engine layer. Further changes to this document are limited to correcting contradictions or recording explicit user decisions; remaining production items are implementation and acceptance work, not open design projects.

Three scope decisions now govern all remaining work: generic/random enemies, ordinary townspeople and route bosses with no story role keep their original Chrono Trigger artwork, while custom art is reserved for the playable cast, characters critical to the plot and direct Shrek references (tightened November 6); the former kingdom of Zeal is **Ohio**, requiring a setting-wide dialogue, theme and NPC rebrand rather than a name-only substitution; and techniques keep their original mechanics while every one receives distinct Shrek-themed presentation (November 8 reopening; see [decisions](decisions.md#technique-presentation-reopened-november-8)).

## Scope and creative direction

The intended result is a functional game from a new save through the campaign, optional quests, retained alternate endings and New Game Plus routes. A technical prototype, complete set of renamed labels, or passing sprite preview alone does not meet that goal.

Preserve Chrono Trigger's map topology, recruitment order, gate destinations, equipment progression, ordinary statistics, learning thresholds, MP costs, targeting, resistances, dual/triple prerequisites and inventory economy unless an explicit mechanic below changes them. Reuse maps and native systems where they support the story. New playable slots, a new combat engine, free-form voice acting and a new world map are outside the first complete version.

The tone combines fairy-tale absurdity with sincere character stakes. Shrek is irritable, observant and protective; Fiona chooses her own life; Donkey is loyal and inventive; Puss treats honor seriously; Pinocchio earns belonging through choices; Mongo protects fragile friends; Farquaad remains a selfish, unwilling ally. Tender scenes should survive the jokes. References must not hide quest instructions or combat rules.

The original design limited unrelated cameos to Tyson. The user subsequently added **Insane Clown Posse, Steve Harwell and Guy Fieri**; those are now explicit exceptions. No further celebrity cast is implied.

## Playable cast

| Native slot | Character | Combat identity and equipment | Story and visual requirements |
| --- | --- | --- | --- |
| Crono | Shrek | Ogre swords; Air | Speaking protagonist. Broad head, ogre ears, vest and compact strong silhouette. Defends his swamp, then everyone's right to a home. |
| Marle | Fiona | Royal crossbows; Water/ice and healing | Ogre form in the normal party; separate human court presentation. Transformation is narrative/cosmetic, not an additional combat-form system. |
| Lucca | Donkey | Harness launchers; Fire and support | Quadruped silhouette. A hoof lever, bite cord or body motion fires the harness; no human hands or new ammunition economy. Dragon remains his partner rather than an ordinary attack summon. |
| Robo | Pinocchio | Puppet arm assemblies; original physical and mixed-element techniques | Hinges, wooden limbs and readable nose. His operation is repeatedly explained as “fucking magnets”; his emotional story still concerns loyalty and personhood. |
| Frog | Puss in Boots | Rapiers and dueling swords; Water/healing | Hat, cape and readable blade. Exiled duelist; Sir Bram is his lost companion. The legendary quest weapon becomes the Carnival Hatchet and its awakened form. |
| Ayla | Mongo | Unarmed cookie fists; source level-driven fist progression | Party-sized body, cookie texture and gumdrops. Express scale through staging and effects; keep him able to use normal doors and formations. Gingy is his friend and spokesman. |
| Magus | Lord Farquaad | Royal polearms; innate Dirt, with the original borrowed Air/Fire/Water spells | Tiny silhouette, dramatic staging and stolen magic. Optional recruitment remains possible without requiring forgiveness. Young and disguised versions must match his identity. |

All seven require complete field directions, movement, combat, casting, reactions, knockout, victory, story acting, portraits, special equipment poses and ending appearances. Explicit source-frame mappings must distinguish direct matches, adaptations, provisional substitutions and genuine native blanks.

### Speaking Shrek

Shrek must speak throughout dialogue and cutscenes rather than inheriting Crono's silence. Author responses for the actual scene, speaker and branch; do not insert the same generic reaction into every text box. Preserve decision rows, party substitutions, scene timing and situations where Shrek is absent or dead.

The final Tyson encounter must include the exact line **“GET OUT OF MY SWAMP!”** The native battle message already contains it. Broader campaign coverage remains subject to scene-by-scene review; see [speaking Shrek](speaking-shrek.md).

## Supporting cast and recurring roles

| Original role | Current design |
| --- | --- |
| Crono's mother/home caretaker | Nobody. Shrek lives alone. Her event object still runs each scene with nobody drawn; downstairs it is his onion jar by the stove, which hands over the 200 onions. Unrelated townswomen keep their stock art. |
| Present king | King Harold. Queen Lillian can appear where the family story requires her. |
| Medieval king and Leene | King Alder and Queen Elowen, distinct royal ancestors. |
| Present chancellor | Prince Charming. |
| Medieval chancellor | A court impostor using a Charming-like disguise; explain the difference from present Charming. |
| Melchior | The Muffin Man, maker of enchanted tools and inherited recipes. |
| Gaspar, including his displaced-guru appearance | Steve Harwell, Smash Mouth's lead singer, as keeper of the Last Inn. This replaces the earlier Big Bad Wolf proposal. |
| Belthasar | Straw, Sticks and Brick, the Three Little Pigs, sharing the builder/exposition role. |
| Spekkio | **Guy Fieri**, across all six native training tiers, with native level selection and rewards. This supersedes Doris and is a user-prioritized change. |
| Kino | Gingy, Mongo's friend and village spokesman. |
| Toma | Rowan the Storyteller. |
| Queen of Ohio (source role: Queen Zeal) | Fairy Godmother, including the giant face and hands. |
| Dalton and summoned golems | Rumpelstiltskin and enchanted wishworks golems. Implementation casting selected during the full-cast audit; preserve their native encounters and mechanics. |
| Schala | Lyra, an original apprentice fairy. |
| Janus | Young Farquaad. |
| False Prophet | Disguised Farquaad. |
| Cyrus | Sir Bram, including a separate spectral hostile appearance. |
| Young/human Glenn variants | Puss before exile and honored Puss. |
| Masa and Mune | Violent J and Shaggy 2 Dope. |
| Their combined boss | The Great Milenko. |
| Masa/Mune-like spirits throughout Ohio | Juggalos or ICP, including Enhasa, palace/cutscene appearances and their variants; do not leave any of these spirits as source art. |
| Ozzie, Slash and Flea | Jack Horner, Briar Knight and Moth Witch. |
| Mother Brain and displays | Magic Mirror and matching enchanted screens. Retain the real compound encounter. |
| Nu and utility creatures | Recurring swamp creatures/Dozers, with Guy Fieri's training versions kept separate. |
| Epoch | Dragon, with a temporal harness and later restored flight. |

Story-relevant villagers, guards, bakers, puppets, witches, beasts and refugees should fit their era and the Shrek world. Named characters, scene-specific story doubles and plot-critical bosses may require their own artwork and ownership checks; a field NPC replacement does not automatically replace its story or ending counterpart. Generic/random enemies, ordinary monster variants, non-story bestiary entries and route bosses with no story role or Shrek tie instead retain their original Chrono Trigger art; random or obscure redraws only make the patch larger. They need no reskin, redraw, pose-replacement or bespoke art-acceptance work, and the earlier replacements in that category have been restored to stock. A retired boss redraw keeps its adapted battle name where dialogue uses it.

## World and campaign

| Era or hub | Adaptation |
| --- | --- |
| Present | Duloc's regimented festival/public spaces and Far Far Away's royal court. |
| Shrek's starting home | A swamp dwelling with nobody else in it (an onion jar and a cat), appropriate indoor ground/props, and a matching overworld hut and surrounding swamp treatment. Keep exits, collision and opening progression functional. |
| Middle Ages | Overgrown fairy-tale kingdoms, outlaw creatures, old courts and Farquaad's fortress. |
| Ruined future | An abandoned happy ending: hungry survivors, broken puppet workshops and systems still promising perfection. |
| Prehistory | The First Bakery and wild lands, inhabited by living baked people and threatened by predators and a confectioner tyrant. |
| Antiquity/Ohio | Fairy Godmother's kingdom and industrial wish production, sustained by excluded people below. Rebrand the former Zeal setting, dialogue, themes and story-relevant NPCs around Ohio while retaining the native maps and plot role. |
| End of Time | The Last Inn, hosted by Steve; keep the native doors, lamps and destination logic. |
| Black Omen | The Ever After Factory, Godmother's last production line across eras. |
| Final threat | Cosmic Muffin exterior, living oven interior, Tyson, sugar ward and the small living starter. |

The campaign retains the source route while adapting its meaning:

1. **Swamp and festival.** Shrek leaves home on an ordinary errand, meets incognito Fiona, and follows her through Donkey's failed transport demonstration. Trial evidence remains understandable and under the player's control.
2. **Medieval rescue.** Fiona is mistaken for Queen Elowen. Shrek and Donkey join Puss, expose the impostor and restore the threatened timeline.
3. **Trial and future.** Charming prosecutes Shrek; Fiona rejects the court's judgment. The escape reveals the ruined future and Cosmic Muffin disaster. The party repairs and accepts Pinocchio despite rejection by other puppets.
4. **Last Inn and hatchet.** Steve and Guy Fieri explain travel and magic. The ICP guardians, First Bakery material and Muffin Man's repair restore the Carnival Hatchet. Puss accepts his abandoned duty.
5. **Farquaad and First Bakery.** The fortress's imposing staging reveals tiny but dangerous Farquaad. His ritual displaces the party. Mongo and Gingy's community, the feast, stolen Gate Key, rescue and furnace threats lead into the Muffin's catastrophic arrival.
6. **Godmother's kingdom.** Approved citizens receive assigned perfect endings. Lyra helps the outsiders; young Farquaad learns the kingdom's conditional view of affection and status. Shrek protects the party during the Ocean Palace disaster and is removed from it.
7. **Return and resurrection.** Dragon restores travel freedom. Farquaad can be recruited or confronted. The party antagonizes Steve into eating 24 eggs before receiving Second Chance, obtains a Shrek stand-in, and rescues the real Shrek at the critical instant.
8. **Breaking the recipe.** Optional quests restore relationships and homes, the Ever After Factory confronts Godmother, and the party destroys the living starter protected by Tyson. The ending resolves the party's choices without explaining the Tyson cameo.

### Ohio, formerly Zeal

The kingdom formerly called Zeal is **Ohio** everywhere in player-facing story material. This is a setting rebrand, not merely a search-and-replace: rewrite location captions, dialogue, objective text and NPC conversations so Ohio is the place characters actually discuss. Adapt its setting themes, story-relevant props and environment treatment, and give its important NPCs appropriate Ohio-centered roles and voices. Fairy Godmother, Lyra, young/disguised Farquaad, Rumpelstiltskin and the ICP dream spirits keep their plot functions while participating in that revised setting.

Preserve the original map topology, gates, encounters, choices, progression and chapter mechanics. Existing native identifiers and historical implementation notes may continue to use `zeal` when referring to Chrono Trigger internals, but new player-facing design and dialogue should use Ohio. Generic monsters encountered in Ohio still keep their stock Chrono Trigger artwork; the rebrand does not authorize another bestiary art pass.

### Dragon and time travel

The Three Pigs build the harness from displaced research. Dragon's first state permits time jumps; repairing her wings enables flight. Replace every required vehicle presentation: world directions, parked/field forms, boarding, seats, saddle view, approach, upgrade, escape and endings. Preserve landing rules, gate destinations and endgame alternatives.

Donkey addresses Dragon as a partner. The final dive/crash route must show Dragon escape alive even if the harness breaks. The First Bakery predates the Muffin Man; inherited recipes do not make him secretly the origin of all baked life.

### Optional quests and endings

Preserve Pinocchio's rejection of Magic Mirror's approved identity, long-term swamp reclamation, Fiona's reconciliation with Harold, the adaptation of Donkey's family/mentor rescue, Puss's shrine and companion story, Mongo's rebuilt community, and the optional Horner/enforcer encounters. Write absent-party alternatives rather than assuming all seven have joined.

Retain normal ending variations for Shrek present/absent, Farquaad recruited/defeated, and Dragon intact/used in the dive. Retained alternate endings and New Game Plus routes must remain completable, including early finale access. A late-game tutorial or particular companion must not be necessary to understand the finale.

## ICP, magic and the Carnival Hatchet

Violent J and Shaggy 2 Dope replace both mountain guardians, with distinct matching sprite sets. Their fusion is The Great Milenko. Repair, material collection, flashbacks, confrontation, equipment appearance and awakening lead to a **hatchet**, replacing the earlier Nine Lives Blade proposal. Puss must display the correct ordinary rapier, Carnival Hatchet or awakened hatchet for his equipment.

The guardian fight references magnets and how they work. Ohio's little dream spirits also become ICP. The Pinocchio explanation uses “fucking magnets”; attempts to correct it prompt the scientist complaint. The user supplied this exact excerpt for the magic theme:

> Water, fire, air and dirt
> Fucking magnets, how do they work?
> And I don't wanna talk to a scientist
> Y'all motherfuckers lying, and getting me pissed

Use the supplied section with native text-window limits and appropriate call-and-response staging. Do not expand it into further song lyrics. The central text source is [content/miracles.js](../content/miracles.js).

### Elements

| Display name | Source mechanics | Innate identity |
| --- | --- | --- |
| Air | Lightning damage/resistance flag | Shrek |
| Fire | Fire, unchanged | Donkey |
| Water | Water/ice, unchanged | Fiona and Puss |
| Dirt | Shadow damage/resistance flag | Farquaad |

Apply these names consistently to status badges, menus, technique/item help, lessons and dialogue. Pinocchio and Mongo keep their source non-elemental status; individual mixed-element techniques retain their actual flags. Farquaad's existing spells of other elements remain those elements. An effect's visible color does not change damage type.

## Combat and techniques

Keep the original balance and progression as the baseline. The complete roster is **116 techniques: 56 singles, 45 doubles and 15 triples**. Preserve the fifteen ordinary pairings, ten ordinary Shrek-led trios, five accessory-gated trios and all prerequisites except for the explicit Puss/Mongo skill exchange, its four combination participant changes and the locked rock-triple party assignments in the catalogue. Farquaad keeps eight singles, no ordinary doubles and his three gated triples. The five rocks become colored Buttons with unchanged unlock behavior.

The [technique catalogue](techniques.md) is the current design target and `content/techs.json` tracks the native build. The revised scope has **77 stock techniques and 39 custom or explicitly modified techniques**. Stock magic—including elemental, healing, revival, status and magical combination techniques—keeps its exact Chrono Trigger name, animation and mechanics for party members, enemies and shared resources, except for the explicitly approved **Swamp Belch** and **Hot Sauce** presentations. Hot Sauce replaces Flare's presentation with Donkey's chili-bottle blast while retaining Flare's damage, 20 MP cost, targets and progression. Other custom presentation is limited to character-driven physical techniques and the catalogue's explicit exceptions.

### Shrek's required signatures

| Source move | Current name | Required behavior |
| --- | --- | --- |
| Cyclone | **Fart** | Similar close-area spin, at three times Crono's spin rate, spraying gas around enemies. Farty sound. Preserve source damage, target rules and 2 MP cost; add a poison chance that respects immunity. The implemented chance is 25%, a tuning choice within the user's request. |
| Slash | **Eye Lasers** | Two eye-origin beams across the original line target, brief flames on struck enemies. Preserve Air damage and 2 MP; the flames do not add Fire damage or burn status. |
| Spincut | **Swamp Piledriver** | Grab, jump, rotate and slam a movable enemy, then restore both actors. Preserve source single-target physical damage/cost; no added stun or displacement mechanic. |
| Confuse | **Four Layer Slam** | Four-hit wrestling sequence with a finishing throw, without four slow grab sequences. |
| Lightning | **Lightning** | Stock name, animation and mechanics. |
| Lightning II | **Lightning II** | Stock name, animation and mechanics. |
| Life | **Life** | Stock name, animation and mechanics. |
| Luminaire | **Swamp Belch** | A giant translucent fart cloud expands around every enemy, then rises and dissipates. Preserve Luminaire's Air damage, targets and 20 MP. |

For the piledriver, rooted, oversized and multipart bosses receive a downward strike at their existing anchor with the same damage and impact. If literal target movement cannot be restored safely, a presentation overlay must still communicate grab, rotation and slam for normal targets. Do not shrink or duplicate a boss, leave an actor displaced, or change targeting through animation.

The target has five custom Shrek singles and three stock magic singles. Earlier Ogre Roar, Storm Breath and Get Up implementations are historical design experiments superseded by the stock-magic rule; they are not requirements to preserve. Fart, Eye Lasers, Swamp Piledriver, Four Layer Slam and **Swamp Belch** retain their approved custom presentations and source mechanics except Fart's explicit poison chance. Swamp Belch is the user's confirmed exception to stock Luminaire presentation.

Fiona and Donkey retain their stock spell names and animations. Pinocchio customizes only physical techniques: Nose Job, Timber! and Wood Chipper. Puss receives **Cat Kiss** in the Slurp slot, **Charm** with Ayla's steal mechanics in place of Heal, and **Nine Lives** in the Cure II slot, which heals a living ally with Cure II strength or revives a fallen ally like Life II. His physical techniques use Hook & Whisker, Flying Fur and Yarn Bomb. Mongo receives Frog's stock **Heal** in place of Charm while retaining Kiss; his custom physical techniques are Ginger Roll, Crumb & Punishment, Dough Hurl, Crumb Cyclone, Last Crumb and Gumdrop Stomp. Farquaad's eight spells remain entirely stock.

Double Cure, Twin Charm, Cure Wave and Boogie move participants with the exchanged skills: respectively Fiona + Mongo, Fiona + Puss, Pinocchio + Mongo and Pinocchio + Puss. Their native combination IDs and effects remain intact, and every ordinary pair retains three doubles. Other magical combinations stay stock; custom combination art is limited to the physical or character-driven concepts named in the catalogue.

The Button-gated participant and required-single mappings are explicit in [the technique catalogue](techniques.md#button-gated-triple-techniques): Omega Flare, Three-Ring Circus, Swamp Hoedown and Grand Dream use their listed Shrek-led parties, while Dark Eternal retains its stock party. These mappings are part of the November 2 design lock, not new progression mechanics.

### Combat sandbox and diagnostics

The browser sandbox must enter the **same native battle engine, AI, stats, damage resolution and technique paths as the campaign**. Do not maintain a separate JavaScript battle simulation for tuning. Temporary formations, equipment and training stats are clearly identified as fixtures. Retry restores machine state and RNG; Return restores the prior game.

Keep quick area/chapter jumps, party selection, actor/frame scrubbing, weapon variants, test technique/item grants, checkpoints, frame stepping, CPU registers, bounded traces and native fatal-loop diagnostics. Unit tests cover native routines and resource guards; integration checks use actual controller input and campaign transitions. Diagnostic visits do not prove connected progression.

## Items, equipment and economy

Money is onions (an onion sign follows amounts in menus, shops and battle; field text says "200 onions"), so healing, MP recovery, revival and status-curing consumables are the rest of an ogre's diet. Keep their actual source amounts, restrictions, prices, drops, quantities and inventory limits; descriptions explain the effect before flavor. The names are Weed Rat, Weed Rat Stew, Rotisserie Rat, Fish Eye, Fish Eye Tartare, Eyeball Martini, Swamp Toad Soup, Slug Shake, Swamp Feast, Mud Bath, Sock Whiff, Outhouse, Mystery Pie and Rat Kebabs; `docs/writing-guide.md` maps each to its effect. Quest items keep their onion names. Stats are Beef, Zoom, Aim, Sly, Mojo, Layer and Earwax on the status screen and in help text. Audit shops, treasure, rewards, menus and dialogue together.

The permanent stat tabs are the explicit exception to the earlier onion-tab proposal:

| Source item | Current replacement | Effect |
| --- | --- | --- |
| Power Tab | Orange Faygo | Beef +1 |
| Magic Tab | Blue Faygo | Mojo +1 |
| Speed Tab | Red Faygo | Zoom +1 |

The user requested different colored Faygo; these color-to-stat assignments are the current implementation choice. Bottles, pickups, labels and descriptions must agree. Ordinary eggs in Steve's challenge are quest props; Second Chance is a key item, not a healing consumable.

Keep one replacement per equipment ID and all equip masks, scaling, crit formulas, random/conditional damage, status effects, resistances, prices and acquisition conditions. Mongo retains level-driven fists rather than a new shop weapon ladder. Shared armor and helmets stay shared. The Carnival Hatchet retains the original legendary weapon's upgrade conditions and mechanical significance. A reliable Onion Juice supply must be available before the finale.

The current item/equipment mapping is [content/items.js](../content/items.js), with detailed families in [content/equipment.js](../content/equipment.js). Its 212 mapped entries cover every named native inventory slot, with stable IDs and unchanged mechanics.

The user-requested weird-item rethemes preserve their native balance and acquisition paths: **Tin Foil Hat** replaces Vigil Hat and keeps negative-status immunity (“Mind proof”), **Pocket Lint** replaces Rage Band and keeps its 50% counterattack (“50% backtalk”), and **Left Sock** replaces Berserker and keeps automatic battle actions (“Auto sock attack”). Their short labels and descriptions must fit the original native slots.

## Guy Fieri and magic training

Guy Fieri replaces Spekkio in every lesson, practice fight and all six level-dependent forms. This explicitly supersedes the earlier Doris casting. His artwork should read as Guy at native scale: spiky blond hair, sunglasses, goatee, flame shirt and stocky chef silhouette. Match the Chrono Trigger style and retain the original four-, eight- and twelve-cell reservations across all 133 native slots.

The forms must become visually more impressive rather than merely swapping labels. Keep the classic black/orange starter, then introduce cyan diner flamework and casting sparks, crimson/gold grill-master flamework and attack embers, a brighter orange flame mantle, a blue/cyan inferno halo, and finally a royal purple/gold Flavortown master with golden utensils, persistent crown/ember effects and a fuller casting aura. Preserve the generated body artwork and shared bank's ten-bit tile limit; use distinct palettes and bounded indexed effects rather than adding native cells or frame IDs.

Rewrite introductions, magic explanations, practice invitations, rewards, rematches, outside references and development labels for Guy. Preserve the three clockwise laps, actual elemental unlocks, party-specific eligibility, training level thresholds, battle rules and original reward quantities. Flavortown should recur beyond the introduction, with explicit *Diners, Drive-Ins and Dives* and road-trip callbacks in the lesson, practice, victory and reward dialogue. Keep the instructions and the magnets/scientist call-and-response clear. Guy's complete generated source set and all 133 native slots are integrated, with the six practice presets and cartridge checks described in [guy-fieri.md](guy-fieri.md). The earlier Doris artwork is retired.

## Optional superboss: Mr. Worldwide

On November 4 the user asked for an optional late-game super boss with custom graphics that is funny, challenging and rewarding. This is an explicit amendment to the design lock. It adds one optional encounter, not a new combat layer, playable slot or campaign requirement. On November 7 the user replaced the first version, the Onion Ogre, with something stranger:
- Pitbull, Mr. Worldwide, with fire-themed attacks;
- music that rearranges "Fireball" (from a MIDI the user supplied) with a Chrono Trigger boss theme;
- a fight in a secret Kodiak, Alaska Walmart, which Pitbull calls his exile;
- a straightforward unlock that stays within the game's native limits.

After the Ocean Palace a lost Walmart greeter appears in Guy Fieri's End of Time kitchen and offers a shortcut to Kodiak. The stockroom scene is self-contained: Pitbull explains his exile, and leaving, winning or losing always returns the party to Guy's kitchen. Both offers are refusable, and the battle has no game over.

His four phases are world-tour stops (Miami heat, Penthouse suite, Fireball mode, Kodiak exile), each with a different elemental weakness, defense profile and attack rotation. He also has a telegraphed party-wide FIREBALL. Every damaging move but one is Fire.

Victory grants large battle rewards plus his shades (Spectacular Specs) with Swamp Feasts. Guy's lessons, practice fights and rewards remain available and unchanged in behavior, and ordinary visits to the borrowed storeroom map stay stock. Implementation, artwork, music and checks are in [Mr. Worldwide](mr-worldwide.md).

## Steve and Shrek's resurrection

Steve Harwell replaces Gaspar at the Last Inn and in his time-displacement appearance. The player can antagonize him into eating **24 ordinary eggs**. This is a required step before receiving the Time Egg/Second Chance for Shrek's resurrection.

Refusing leaves the reward unclaimed and permits a later attempt. Accepting plays all 24 bite/chew pairs with escalating dialogue after 6, 12, 18 and 24. Only completion unlocks the original handoff. Preserve saved quest flags, prevent duplicate rewards, and retain the Three Pigs' guidance, festival stand-in and mountain rescue sequence. Steve eating eggs is not a replacement for the rest of the resurrection quest.

The native handoff and refusal/repeat cases are implemented; the complete connected memorial-to-rescue journey and alternate-party/save continuations still require acceptance. See [resurrection](resurrection.md).

## Cosmic Muffin and Mike Tyson

The threat remains enormous and serious before the final reveal. Replace the outer shell with cratered crust, wrapper ridges and a glowing center; retain route-dependent historical boss callbacks. The interior is a living oven of baked layers and sugar veins. Do not reveal Tyson in the archival apocalypse or intermediate oven-heart encounter.

The final native formation has three roles: **Tyson**, **sugar ward**, and the **small muffin starter**. Tyson is silent. Use the supplied `~/Downloads/32931.png` as his approved sprite source/reference and preserve readable boxing poses.

| State | Design |
| --- | --- |
| Opening | A normal jab cycle introduces the formation; the starter demonstrates rebuilding. |
| Tell | Stable charge pose, text and optional flash/bell identify one living target. No rule depends on hearing the sound or recognizing Punch-Out!!. |
| Windup | A deterministic action window permits preparation. The implemented native design uses a two-turn windup. |
| Uppercut | One defense-independent KO, not an opening party wipe. At most one charged uppercut per complete guardian cycle. |
| Recovery | A recovery window; current native design uses three turns. |
| Ward broken | A damage opportunity on the starter. |
| Rebuild | The starter restores the guardian and later protection while it survives. Repeatedly beating Tyson alone cannot win. |
| Victory | Destroying the starter wins even if Tyson is standing. Bell/pause/silent departure or collapse; no explanatory Tyson speech. |

Defeating or disabling Tyson during windup should cancel the queued strike where supported. Validate target death/change, simultaneous damage, counters, revival and victory during rebuilding. Universal hints must explain the starter when Donkey is absent. Shrek's required swamp line accompanies the final encounter.

Complete the shell/disaster art, oven interior, boxing reactions/revival, bell cues and final branch matrix. Test ordinary and low-resource parties, legal party combinations, Active/Wait and supported speeds; a default-speed timing test alone is insufficient.

## Visual direction and asset production

Aim for recognizable Shrek characters rendered consistently with Chrono Trigger's SNES pixel-art scale, silhouettes, shading and animation. Final character art uses **actual image generation or authentic supplied game artwork/model references**. Procedural boxes, ovals and geometric stand-ins are not accepted final character artwork. Pixel conversion, palette quantization, cell packing and whole-source mirroring are build processes, not substitutes for authored anatomy and poses.

The user selected the **V.Smile reference on the right** for Shrek, from the supplied `~/Downloads/506339.png`. It is the current model direction. Preserve that identity across the full set; do not silently switch back to the rejected earlier sheet. Fiona was considered more acceptable, but still receives full native-scale review. Shrek’s 24 remaining acting substitutions stay explicit work: fallen-body acting, folded arms, dives, laughter, sitting, rear item holding, a one-eye wink and drinking need compatible source art. The reviewed standing eye-close and fall-orientation corrections are active; see [Shrek artwork](shrek-art.md).

Custom visual production is limited to the playable cast, named or otherwise plot-important supporting characters and bosses, Dragon, story-critical props, title/cinematic work, and environment changes needed to sell an adapted setting such as Ohio. Do not commission or schedule replacement art for random encounters, ordinary enemy recolors, non-story monster families or bestiary completion. Those use the original Chrono Trigger sprites and animations. Stock enemy art is an explicit final-art choice, not a placeholder or unfinished task.

Reference material includes the supplied Shrek mobile and V.Smile sheets, Puss in Boots sheets, GBA Shrek art for stylistic reference, and the Tyson sheet. The accepted Pinocchio source uses an authentic Shrek SuperSlam model with authored joint poses. All imported/generated assets retain source files, provenance, sampling decisions, palette and native-role maps.

Every sprite must fit actual native cell reservations and tile-index limits, use bounded SNES palettes, preserve transparent tile zero and handle shared graphics/palette owners. Inspect at 1× and integer zoom on bright and dark maps. Review full movement and acting sequences, weapon anchors, foreground overlap and actual story staging. Avoid excessive flashing; tells combine text and a stable pose.

The fading title reads **Shrek Trigger**, with Shrek's ogre ears/antennae integrated into the “Shrek” lettering and a presentation consistent with the original dramatic opening. Claude's supplied-logo rework is integrated: the S and ears fly into the original clock dial, the remaining letters slide out, and the stock hands and native fade remain. See [title implementation and checks](title.md).

## Music and sound

The direction is a SNES arrangement using voices consistent with Chrono Trigger's cartridge. The supplied `SMASH MOUTH.All star.mid` is the source for All Star material. Shrek's swamp uses it; Smash Mouth references recur in dialogue without replacing the game's emotional tone.

The earlier preference to leave the epic opening intact evolved into Claude's authorized theme work. Preserve the original opening's style, form and dramatic timing while integrating the current arrangements. The morning cue remains unchanged.

| Cue | Current arrangement and purpose |
| --- | --- |
| Swamp interior | All Star arrangement from the supplied MIDI, in native instruments. |
| Chrono Trigger/title/attract theme | All Star Trigger, retaining stock form and the native conditional finale. |
| Boot pendulum/logo cue | All Star Pendulum v2: gradual build, chorus continuity across the reveal, then a native fade to silence. |
| Epoch/Dragon flight | All Star Wings arrangement using the flight theme's register, instruments and quoted parts. |
| ICP guardian phases | Hatchet Carnival, an original boss composition; not a transcription of an ICP recording. |

Claude's handoff records the music already landed through commit `1396f24`; its supplied-logo title work from `e86161b` is now integrated. The music uses native AKAO4 sequences and original samples. Looping arrangements reserve two voices for effects; the one-shot title cue uses eight as the stock cue does. Fart has its own falling-buzz/farty effect. Boxing bell, onion, puppet and Dragon cues remain part of presentation review.

See [combat and music](combat-and-music.md) for implementation and validation. The private coordination source is `.local/claude-music-handoff.md`; historical byte budgets/test totals there apply to its recorded revisions, not automatically to today's build.

## Browser prototype and cartridge architecture

The project lives at `Projects/shrek-trigger/`. The browser runs the real patched cartridge in **SnesJs** and displays the native PPU framebuffer. Signature-checked CPU hooks provide discovery, diagnostics and reversible event staging. Production text, graphics, music and proven gameplay behavior are compiled into ROM patches/native routines so the same game can run without JavaScript gameplay hooks.

Keep this lightweight: bounded traces, existing event/AI/animation systems, deterministic transforms, owned ROM allocations, original VRAM/cell budgets and no unnecessary per-frame browser overlays. Use Secret of Goku's reproducible patches, tracing and independent-emulator tooling as a reversing reference; never assume its addresses apply to Chrono Trigger.

The supported base is the headerless Chrono Trigger USA image, 4,194,304 bytes, SHA-256 `06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9`. A copier header is stripped before validation; mismatched revisions are rejected. Keep the base ROM, saves, keys and research extracts private. Deliver the patch and its provenance, not the base ROM.

The current art requires an **8 MiB ExHiROM** layout. Code and ordinary compressed resources remain in the original half; selected raw tile banks occupy verified lower-half extended banks, preserving upper-half mirrors. Native loaders stream approved party/story/boss graphics without adding WRAM or VRAM. Unselected families retain their original decoded-budget guard; the fixed-frame size-three loader remains excluded from the generic NPC streaming path. Hardware/cartridge compatibility still requires physical testing.

Builds validate pointers, ownership, overlap, compression, bank boundaries and checksums, then emit the private ROM, BPS patch and audit manifests. Preserve a reproducible path from source PNG/MIDI/text/data to cartridge bytes. Independent tests use Snes9x and bsnes; the browser remains a development frontend rather than a second game implementation.

## Acceptance and remaining production work

Completion requires all of the following:

- All seven complete actor/portrait sets and every required story-character, Shrek-reference, plot-boss, Dragon, title, prop and ending asset are recognizable and reviewed in context; no undisclosed placeholder poses remain in that scoped set. Generic/random enemies intentionally retain stock Chrono Trigger art.
- Every mandatory chapter, side quest, recruitment branch and retained ending has adapted dialogue/cutscenes, clear objectives, valid absent-party behavior and a speaking role for Shrek where he participates. Ohio's captions, dialogue, setting themes and story-relevant NPCs form one coherent rebrand rather than leftover Zeal references.
- All 116 techniques deliver their documented presentation and source mechanics, with stock magic unchanged except for the approved Swamp Belch cloud and the Fart, Puss/Mongo ownership, Nine Lives, combination-participant and finale exceptions; no displaced, missing or clipped actors remain after actions.
- Items, equipment, elemental terms, Faygo and onion naming agree across menus, shops, pickups, treasure, rewards and dialogue while retaining the intended mechanics.
- The complete Steve challenge and resurrection route, ICP/fusion/hatchet chain, Dragon acquisition/upgrade/dive and final Muffin/Tyson branch matrix work through normal progression.
- Fresh builds and fresh saves complete normal and alternate routes, with chapter save/load checks, party changes, special equipment, Active/Wait and speed coverage. No known crash, softlock, corrupted save or impossible mandatory encounter remains.
- Independent emulator playthroughs support release claims. Hardware is called compatible only after physical validation.
- Release output includes the exact base fingerprint, patch/application instructions, credits/provenance, change log, known issues and spoiler-separated player notes.

The current implementation has substantial native content and all 39 scoped custom technique presentations. Late campaign/ending acceptance, environment/boss polish and in-context review remain. [Production status](production.md) and per-build reports track that work without narrowing this design.

## Current endgame visual implementation

Rumpel and his usurper form, the two Wishworks Golem variants, giant Fairy Godmother’s face and hands, the Cosmic Muffin oven and Tyson’s emergence now have source-backed native art. Their original combat progression and timings remain intact. Six reversible endgame shortcuts and all ten actor previews support iteration. See [endgame artwork](endgame-art.md); connected late-chapter review and the full ending matrix remain required by this design.
