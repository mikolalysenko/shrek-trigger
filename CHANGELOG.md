# Shrek Trigger changelog

## Unreleased

- **Rivet uses Johnny's original sprite again**, in the workshop, in battle and in the race. The generated redraw didn't match the rest of the game's art. His name and lines are unchanged.

## 1.0.0 — 2026-11-12

First public release.

- BPS and IPS patches for Chrono Trigger (USA), built with `npm run build`.
- A browser version on GitHub Pages: choose your own ROM and the patch is built and played in the browser.
- A public README with screenshots, patching steps and checksums; the developer guide moved to `docs/development.md`.
- Third-party reference sheets, source and review images, and emulator savestate dumps are no longer in the repository. The cartridge is byte-identical without them.

## Toenails, spicy roots and a cat that meows — 2026-11-12

- **Money is toenails.** A toenail-clipping sign follows every amount in menus, shops and battle, every price and reward in dialogue says toenails, and Shrek's savings jar is now a toenail jar, with new art.
- **Healing items are spicy root vegetables:** Onion, Mid Onion and High Onion (HP); Garlic, Mid Garlic and High Garlic (MP); Horseradish, Wasabi, Ginger Root and Radish Bunch. Effects, prices and drops are unchanged. Dialogue that hands them out or mentions them follows.
- **Puss meows.** Story scenes that played Frog's croak now play a cat meow.

## Text leftovers — 2026-11-11

- **Gift items** from Donkey's housemates now match them: Sheep's Clothing and the Big Bad Nightgown from the Wolf, and the Blindfold from the Mouse (were Vest in Bread, Birthday Suit, Muffin Top). Stats are unchanged.
- **Map labels:** Onion Keep (Sun Keep), Onion Vault (Sun Palace), Sinking Sands (Sunken Desert), Moaning Ruins (Northern Ruins), Puppet Works (Geno Dome), Buried Kiln (Giant's Claw) and the Poison Apple (Porre Inn). Dialogue that named these places follows.
- **Porre is Worcestershire.** "Like the sauce."
- Fixed hints: Mongo now points at the Rainbow Shell, the Ohio scholar says Rainbow Shell rather than Rainbow Crumb, the boy hero wears a badge rather than carrying a hatchet, and the future survivor knows Duloc as the gift shop.
- The credits room no longer says Claude Code did "Music only".

## Fart combinations and the locked technique list — 2026-11-11

- **Every combination built on Shrek's Fart is now a fart.** Ogre Waltz is **Heal Fart** (healing gas, in swamp green), Hot Hooves is **Flaming Fart** (Donkey holds the torch; fire shoots out of Shrek and burns everything nearby, with the Fart's gas clouds and buzz), and Ogre Carousel, Timber Tornado, Cross Purr-poses, Cookie Drill, Layers of Trouble and Fairy Tale Beatdown are **Fart Rocket**, **Mega Fart**, **Crop Duster**, **Gas Drill**, **Fart Tornado** and **Silent But Deadly**. Each toots where it launches, spins or crosses, except Silent But Deadly, which makes no sound at all. Damage, targets and MP are unchanged.
- **Magnets!** now drops its magnet in from the sky and pulls it back up, instead of fading it in.
- A new short toot sound joins the burp in the empty sound slots.
- `docs/technique-catalogue.md` lists all 116 techniques as locked: name, menu label, help line and what happens.

## Townsfolk, funnier — 2026-11-11

About 170 filler lines (townspeople, shopkeepers, guards, children, signs) were rewritten across the whole game, with a running gag per town. Every gameplay hint a line carried is still in it.

- **Duloc Castle:** the staff keep nearly noticing that King Harold is a frog. "He watches flies a LOT." "The king ordered flies. Fries. He said fries. Probably."
- **Porre** is run by the Three Bears: "Middle bed. The others are too hard and too soft. We've had complaints."
- **The fair:** "One of them is a blind mouse. He's winning. Don't tell him."
- **The monster village** is still sore about what its ancestors fetched at Farquaad's roundup: "Talking chairs went for eight. EIGHT."
- **The Bakery** feuds over whether the red star is a cherry or a gumdrop, and looks down on the North Bakery for using raisins. On purpose.
- **The ruined future:** "Who are you? Did the food send you?" A sign: "Visitors will be removed without warning. Except this one."
- **Ohio:** Approved citizens have rules for everything ("Please don't lick it"), Columbus reports that glitter is not food, and Undertown has two kinds of dirt now.
- **The bridge town:** "I forgave Ned his goat. Barely."
- The cafe line about Willa no longer mentions a great forest.

## The Wolf and the Blind Mouse — 2026-11-11

Donkey no longer has a generic "Mom" and "Dad" (and the short-lived Ma and Beans are gone). His housemates are two film characters, with their own sprites; 47 lines across his home, the fair teleporter, the parade and the red Gate quest were rewritten.

- **The Big Bad Wolf**, in Grandma's pink nightgown and bonnet, in bed or a chair, saying as little as possible. "What?"
- **One of the Three Blind Mice**, who builds machines by feel with his brothers and cannot see whether they work. He runs the teleporter at the fair ("Is it working? We wouldn't know. The onion hasn't complained.") and makes Donkey's gear: "Fireproof. We think. We can't see the fire."
- **The red Gate quest:** the Wolf's nightgown catches in the Mice's machine while young Donkey panics ("Did I mention I don't have thumbs?"). The password is still L, A, R, A: "We typed it by feel. It felt right."
- **The payoff:** save him and the Wolf can walk. "I can walk. I choose not to." Donkey's diary: "He went back to bed. Nobody can tell the difference."
- **Sprites:** the Wolf, the Mouse and a grey foal for young Donkey in the flashback, each on its own sprite row so the townsfolk who shared the old stock sprites are unchanged.

## Endgame quests, stupider — 2026-11-11

131 lines across the late optional quests were rewritten to be dumber and more Shrek. Every hint, item, place and choice a player needs is unchanged.

- **The Nose Heap (was the forest).** Left in the desert, Pinocchio decides the fastest way to make wood is to lie. He says "I'm a real boy" once every four seconds for four hundred years, saws off each nose and stacks it: 3,155,760,000 noses, which took root. The forest on the map is the heap, and the map now labels it **Nose Heap** (and **Willa's Hut**). Donkey: "Easy math! That's like... eleven a day!" The campfire speech ends: "Perhaps a lie told for friends grows into something real. Like a dump."
- **Rainbow Shell and Harold's trial.** Nobody in the quest knows what the shell is ("It's a shell. It's rainbow."), up to and including the court. The impostor: "IMPOSSIBLE!! I made that shell up!"
- **The puppet workshop.** The Magic Mirror runs it as the dating-game host ("my number three..."). Marion and the Mirror now call him P-66 until her memory returns, so "My name is Pinocchio. And I am a real boy." means something.
- **Sun Onion Stone.** "Nobody steals a rock." / "Who steals a ROCK?!" The mayor: "That glow in the cellar is a very large candle." A hint that named the wrong item (Onion Pop for Onion Bread) is fixed.
- **Jack Horner's hideout, Sir Bram's grave, the Ever After Factory** and **Steve's quest hints** got lighter touches; Steve now hints in All Star.
- Bar and shrine lines that still said "Fiona" for the desert woman (Willa) are fixed.

## Endings pass — 2026-11-11

- **Every ending was reread and 38 lines rewritten** for jokes and for consistency with the current story. No ending had original Chrono Trigger text left, and none mentions Granny, gold or the old stat names.
- **The Oath** no longer plays an invented scene in which Bram breaks Farquaad's spell before Farquaad has been fought. It is the camp it shows: Donkey fixing Pinocchio's knee, Shrek asleep, and Puss slipping away with "I have business with a very small man." Fiona: "Aim low."
- **What the Prophet Seeks:** two lines spoken by Rumpel were labelled as Farquaad's; they are Rumpel's again. Farquaad's own speech now ends on "some of you may die. That is a sacrifice I am willing to make."
- **The farewell** no longer has the cat bolt for a door and then be chased through a Gate that "will never open"; the chase reads as one scene. Shrek's last line: "Then it can find another ogre for the sequel."
- **Reunion without Shrek:** a line asking to "bring Shrek back" was attributed to Steve, who is then asked "Bring who back?"; it is unattributed, as in the source.
- Smaller punch-ups in Beyond Time, the wedding, the slide show, the apocalypse report and the developer room.

## Call My Wife and funnier techniques — 2026-11-11

- **Donkey calls his wife.** His ultimate (Flare) is now **Call My Wife**: Dragon fills the sky over the battlefield, eyelashes and lipstick included, and every foe takes Flare's damage for Flare's 20 MP. **Hot Sauce** moves down to his Fire II, replacing Dragon Fire.
- **New names and gags.** Shrek's Lightning is **My Swamp!** and Lightning II is **Run Away!**. Fiona's Cure is **Fresh Eggs** (courtesy of the bluebird from High C), Haste is **Web Candy** (spiderweb cotton candy, flies included) and Cure II is **Balloon Pet** (an inflated snake). Puss's Charm is **Big Eyes**, Mongo's Triple Kick is **My Buttons!** and Farquaad's Dark Bomb is **Compensate**.
- **New effect art** for High C (a bluebird), Fresh Eggs, Web Candy, Balloon Pet, Pinocchio's Blue Fairy and Sawdust, Mongo's Sugar Kiss and Farquaad's Mirror Wall. These replace the stock sprites inside the original animations; at 16 pixels some read better than others.
- **Love & Life revives at full health**, because Shrek is life. Same 10 MP.
- **Some May Die is a sacrifice Farquaad is willing to make.** It costs him 0 MP (was 20) and leaves each of his allies with 1 HP the moment he chooses it. Same damage.
- **Farquaad's court arrives in person.** **Torch Mob** marches an angry mob with torches and pitchforks over the field, **Dungeon** drops a huge iron cage, and **Royal Decree** unrolls a proclamation before the thunder.
- **Five more full-screen gags**, using the same machinery as Dragon: **Compensate** raises an absurdly tall tower before the blast, **Some May Die** fills the sky with Farquaad's smug face, **Magnets!** drops in a giant horseshoe magnet, **Bird Pop** swells a bluebird over the battlefield, and **Are We There Yet?** puts Donkey's grinning face much too close for much too long. Each keeps its own damage, targets, status and MP.
- **Swamp Belch has a real burp.** One long, low note on the fart's buzzing instrument: it slides down, wobbles for a couple of seconds while the cloud hangs, and curls back up at the end, about three seconds in all, with a slow rumble of the screen. It is a new two-voice sound program placed in empty sound slots, so the cartridge does have room for more custom sounds than I first thought.
- **Hits land.** Every heavy battle sound now shakes the screen: a tick for a slash or a weapon hit, a rumble for slams, explosions, thunder and roars, and the whole screen for Dark Matter, Dino Tail and the big finishers. This applies to enemies' attacks too. Shakes decay by themselves in under a second.
- **Recast sounds.** Dragon roars as she arrives and her fire lands with the Fire II blast; Fiona sings High C and the bluebird bursts; Bird Pop ends in a string of explosions; Fresh Eggs sizzle; Compensate is the game's biggest explosion; Run Away! ends in a crash. The cartridge has room for only one new sound program (the fart buzz has it), so these reuse stock battle sounds.
- Technique balance is no longer frozen: a technique may be stronger or weaker than its Chrono Trigger source when the joke is worth it. Bosses and encounters are unchanged.

## Mountain and hatchet routes — 2026-11-11

- **The fresh-save route now reaches the clown challenge.** `npm run test:campaign-mountain` follows the bridge with Dorino's store, the ogre ambush, the climb over the mountain and the clown challenge to the Broken Hatchet Head (story 96). It passes in Snes9x and bsnes.
- **The hatchet leg continues to the Bakery's Gate Key (story 124).** `npm run test:campaign-hatchet` adds Pip's confession (Hero Badge), Puss's haft, the canyon gate, the Muffin Man's request for Dreamstone, the Wildcrumb Mountain pillar and the whole Bakery chapter. It passes in the development harness; the two-core acceptance run is in progress.
- **Smarter route tactics, same bosses.** The cave keeper is never struck with blows and is fought behind a 75% healing gate with Aura Whirl. Milenko's tornado charge meets Eye Lasers. The kiln guardian is fought behind an 85% gate. Enemies that shrug off blows take aimed spells. Battles that start mid-transition use the leg's tactics.
## Empty house, ogre stats and a script pass — 2026-11-10

### Story

- **Shrek lives alone.** Granny is gone. Duloc's bell and a note on the wall wake him, the shutters open on their own, and his 200 onions come out of the onion jar by the stove. Party members who visit react to the house instead of to a housekeeper, and in the ending the cat bolts by itself.
- **The Stand-in is still recoverable.** After Shrek falls, the doll in his room starts the same handoff as before; it now plays as the party apologizing to an empty house and taking it anyway ("Nobody objects. Nobody is home to."). Touch the doll, watch the scene, touch it again to take it. A test plays this through.
- **The fortress illusion** that greeted Shrek as his mother is now his onion jar, begging him to take all he wants.
- The townswomen who shared Granny's sprite have their original art back.

### Terms

- **Stats** on the status screen are **BEEF, ZOOM, AIM, SLY, MOJO, LAYER** and **EARWAX** (Power, Speed, Hit, Evade, Magic, Stamina, Magic Defense). Faygo and equipment text use the same names: Orange Faygo is "Beef +1".
- **Money is onions.** Menus, shops and battle rewards show an onion sign after the amount; people say "200 onions".
- **Healing items are swamp food**, since nobody eats the currency: Weed Rat, Weed Rat Stew and Rotisserie Rat for HP; Fish Eye, Fish Eye Tartare and Eyeball Martini for MP; Swamp Toad Soup, Slug Shake, Swamp Feast, Mud Bath, Sock Whiff (revive), Outhouse (rest at a save point), Mystery Pie and Rat Kebabs. Effects, prices and shops are unchanged.
- **Every item with an effect has a rewritten help line**, and quest items now have one too ("Looks just like him. Rude." for the Stand-in). The Button accessories name the triple techniques by their current names.

### Techniques

- **Shrek's revival is Love & Life.** The technique that was Get Up (Chrono Trigger's Life) is now **Love & Life**, and its help line reads "Shrek is love. Shrek is life." The wake-up bellow, revival, target and MP cost are unchanged.

### Fixes

- **Battle messages show whole item and technique names.** Names with a space lost their first word after a fight ("Got 1x Slice!" for Hot Slice), because the build stored the space with the padding byte. Spaces inside names are now stored as the original tables store them.

### Writing

- **A pass over the whole field script** for voice and jokes: stiff carried-over lines are loosened, characters use contractions where they would, and about 1,200 of the 5,000 field strings and 299 of Shrek's 373 replies are rewritten. Hints, prices, choices and timing are unchanged; every string was rendered in the cartridge afterwards with no overflow. `docs/writing-guide.md` records the rules and `scripts/check-dialogue-style.mjs` enforces the mechanical ones.

## Polish pass — 2026-11-10

### Fixes

- **Swamp Belch no longer strobes.** The cloud's outline was rebuilt on the console every frame, which took about half a frame at full size. With the rest of the battle engine that overran the frame, and the game's own lag handling then blanked every other frame for about 3.5 seconds: a hard 30 Hz flicker, on every enemy group. The outline rows for all 100 cloud sizes are now precomputed (20 KiB of ROM, no extra RAM) and copied in one block move, about a tenth of the cost (2,961 CPU cycles at most, down from about 25,700). The cloud's shape is unchanged pixel for pixel, and a scan of all other techniques found no blanked stretches.

- **The clown test battle no longer corrupts the screen.** In the workshop's combat sandbox, Violent J and Shaggy 2 Dope stood in the wrong enemy slots, and their paired attack, which finds its partner by slot, overwrote all of video memory about 17 seconds in. A sandbox fixture can now name its encounter's own slots, and the clowns use theirs; the real boss fight was never affected.

### Techniques

- **Every technique has its own help line.** The line under the technique list, also shown across the top of the screen in battle, was still Chrono Trigger's for most moves ("Laser Spin / all enemies" under Nose Spin, "Phys. Att. w/ NewMasamune" under Ever After, "A savage cat attack" for Mongo). All 116 now say what the move does in Shrek's terms: "Better out than in! Air / all", "How do they work? Dirt on all", "Sing until foes fall asleep". Each line was checked against the game's own targeting data. Text only; no mechanics change.
- **Cleaner menu labels.** Storm Breath shows as **Storm Roar**, Annoying Song is **Are We There Yet?** (**ThereYet?**), Cold Shoulder is **Cold Snub**, and Gumdrop Stomp, Cookie Catapult and Fairy Tale Beatdown show as **Gum Stomp**, **Cookiepult** and **Beatdown** instead of clipped words.
- Catalogue notes for Wish Dust (one ally) and Icing Patch (whole party) now match what the moves do.

### Art

- **Donkey and Pinocchio on the world map.** Both now have hand-drawn 16×16 map sprites like the other five heroes, in place of the automatic reduction that left Donkey a thin scribble: Donkey has his ears, muzzle and four legs, and Pinocchio has his hat, suspenders and, in profile, the nose.

### Tests

- `npm run test:tech-blanking` steps through every technique and counts blanked frames, and `npm run art:tech-sheets` writes a contact sheet per technique. Swamp Belch's own test now checks the same thing live.
- A new check covers the help catalogue: every line fits, names no Chrono Trigger technique and sits inside the native text block or its padding.
- Three checks no longer depend on one lucky frame. The new map sprites shift the opening by a single frame, which exposed them: the palace piazza group spawns at one of several native positions chosen from the frame counter (the check now re-enters for the others), "What the Prophet Seeks" can phase-lock in the development emulator only (it may enter up to three frames later), and Crumb Cyclone is checked against enemies inside its range rather than the clowns, who stand outside it in their real fight too.

## Future chapter route — 2026-11-09

- **The future chapter plays through from a fresh save.** A new controller (`npm run test:campaign-future`) takes the party from the future arrival to Pinocchio's second repair at Steve's place, at original Chrono Trigger difficulty, in both Snes9x and bsnes.
- **Route tactics play smarter instead of easing bosses.** They count Onions by item ID, skip scenery enemies the cursor can't select, revive before casting area techs, and heal in the field with Fiona's Sing-Along and OnionBroth.
- **Redrawn spells accepted in both cores.** Wish Dust and the other signature redraws pass the emulator technique checks; a stale eye-laser test now uses a tech with stock graphics.

## Polish pass — 2026-11-08

### Fixes

- **Dragon faces where she flies.** On the overworld she flew north tail-first, because a November 1 change made both front and back views use her head-down art. In the ending's chase-camera flight she showed her face while flying away. North flight now uses her rear art, and the Mode 7 ending views follow the original Epoch table (heading 0 faces the camera, π flies away, side views lead with the head on the left).
- **Dragon stays pink during the approach dive.** That phase loads a separate raw palette (resource `$23`) that still held the Epoch's white and grey colors.
- **No stray Dragon block in the hangar.** After the naming scene, the Epoch's boarding-ladder object drew a detached chunk of Dragon's body below her tail. It is now drawn behind the hangar floor, keeping its native functions.
- **Battle names match the story.** Godmother, the Muffin, Farquaad, the Wish Engine and the Moth Witch decoy no longer appear as Zeal, Lavos, Magus, Mammon M. and Flea?.

### Art

- **Overworld heroes:**
  - Shrek, Fiona, Puss, Mongo and Farquaad have hand-drawn 16×16 sprites.
  - Donkey and Pinocchio keep a cleaner automatic reduction.
  - Every hero gets a dedicated seven-color overworld palette. Previously Fiona, Donkey and Farquaad were near-black blobs.
- **Shrek:**
  - His tunic shadow is warm tan instead of a cool grey that read as stains.
  - When knocked out he lies flat instead of curling into a ball.
- **Guy Fieri:** his face no longer turns cyan in the Diner and Blue Inferno lesson forms.
- **Farquaad and Donkey:** Farquaad's hair and Donkey's dark fur have a fill inside their outlines instead of merging into flat black.

### Techniques

- **Shrek's spells are Shrek again.** Lightning is **Ogre Roar** (an open-mouth roar with green shockwaves), Lightning II is **Storm Breath** (a planted inhale and roar that becomes the storm) and Life is **Get Up** (a wake-up bellow over the revival). Damage, MP, targets and progression are unchanged.
- **Puss casts Milk.** Water and Water II are **Milk** and **Milk 2**: the droplets, rings and tidal wave are milk white instead of blue, and Milk 2 dims the scene evenly instead of tinting it blue. Water damage, element, targets and MP are unchanged.

- **Waffle Toss, Waffle Bomb and Parfait Bomb.** Donkey's Flame Toss flings a trail of buttered waffles, Napalm lobs a waffle that bursts into a spray of waffles, and Mega Bomb throws a parfait that explodes into a pile of parfaits (generated sprites tiled across each effect's four graphics chunks). Damage, targets and MP are unchanged; Hot Sauce, which borrows Mega Bomb's animation, keeps its own bottles.
- **Fairy Dust, Wish Dust and Noble Steed.** Fiona's Cure and Cure II sprinkle fairy-godmother star sparkles, and Donkey's Protect rings the party with lucky golden horseshoes.
- **Sing-Along and Dragon Kiss.** Fiona's Aura fills the air with dancing gold music notes, and Donkey's Fire blows a stream of pink flaming hearts that bursts on the foe.
- **Every technique has a Shrek name and look.** The 71 techniques that keep Chrono Trigger's effect shapes now have Shrek-themed names (Fiona's High C and Bird Pop, Donkey's Dragon Kiss and Parfait Bomb, Pinocchio's Magnets!, Farquaad's Some May Die, combos like Milkshake, Group Hug and Onion Flare) and one of nine color themes: swamp green, Fiona and Dragon pink, waffle gold, Farquaad violet, puppet pine, fairy violet, onion purple, frosting and milk white. Colors change only while the party casts them; enemies' effects keep their colors, and all damage, MP, targets and progression are unchanged.

### Writing

- Sharper opening jokes from Shrek.

### Tests

- The "What the Prophet Seeks" ending check now observes until its final scene. Its fixture enters the ending directly, and the unmodified cartridge shows the same phase-dependent wait.

## 0.1.0 release candidate update — 2026-11-07

### Content

- Replaced the Onion Ogre with **Mr. Worldwide** (Pitbull), in exile in the stockroom of the Walmart in Kodiak, Alaska.
  - **Unlock:** after the Wish Palace, a lost Walmart greeter in Guy Fieri's End of Time kitchen offers a shortcut. The stockroom visit is self-contained and always returns to Guy's kitchen.
  - **Fight:** custom twelve-cell art (white suit, shades, fireballs) and four world-tour phases through native barrier writes. Fire-element attacks, with a telegraphed FIREBALL.
  - **Rules:** no-game-over losses with rematches and the same once-only reward.
  - **Native data:** it reuses the Ogre's enemy record, sprite slots, battle messages and technique slots, with no additional WRAM or VRAM.
- Replaced every remaining hand-drawn or code-drawn sprite with generated art (OpenAI Images API, `gpt-image-2.6`):
  - **Mr. Worldwide:** redone with the art review's fixes (stance, neck, hit pose, suit folds, steady breathing).
  - **Props:** the Carnival Hatchet and its ruby and broken variants, the Faygo bottle and Dragon's harness fragments.
  - **Sky drakes:** the field and world poses. The field drake now streams raw from ROM.
  - **Effects:** the Fart gas puffs and the Eye Lasers target flames.
- Added **Fireball · Boss Battle 2**, the superboss theme. It arranges "Fireball" from the MIDI the user supplied (kept private) with Boss Battle 2 parts read from the player's ROM, in the unused fanfare slot `0x4F`, using six voices.
  - Reworked after listening, because the first version was too relaxed. It now follows the original: the trumpet riff, a build, the "FIRE–BALL" stop and the drop with a four-on-the-floor beat, at 136 BPM instead of 116.

### Acceptance tooling

- `npm run test:mr-worldwide-cores` replaces the Onion Ogre core check, and `npm run music:import-fireball` re-derives the quoted Fireball phrases.
- The dialogue audits cover the greeter's and Mr. Worldwide's strings and choices: 5,018 strings, 224 decisions and 465 options.

## 0.1.0 release candidate update — 2026-11-06

### Content

- Added the **Onion Ogre**, an optional late-game superboss in Guy Fieri's End of Time lesson room after the Wish Palace. It has custom twelve-cell art, four elemental layers peeled through native barrier writes, a telegraphed Blooming Doom, no-game-over losses with rematches, and a once-only reward (9,999 XP, 15,000 G, 100 TP, Spectacular Specs and Onion Feasts). It uses an unused native enemy record, native AI, eight private enemy-technique clones, 16 battle messages and 10 room strings, with no additional WRAM or VRAM.
- Integrated the remaining humor and Shrek-voice writing pass for the Bakery, bridge, Dragon, empty-future and trial books (140 strings in 26 rooms), keeping the release line's earlier length trims.
- Merged the November 2 verification fixes from `main`: Bakery den diagnostics and waypoints, the browser test's configurable port, and the tolerant forest-pages formation check.

### Art scope

- Custom sprites now cover only the playable cast, characters critical to the plot and direct Shrek references. Generic enemies, ordinary townspeople and route bosses with no story role use their original Chrono Trigger art, palettes and animations again: the forest Kilwala, both Hench, household residents, townswomen, bats, jugglers, bridge skeletons, sewer frogs, Proto robots, the Mage, the court officer and the Reptites, plus Krawlie, Heckran, Zombor, Nizbel and the Guardian (including its background body).
- Generic enemies take back their stock battle names. The five route bosses keep the names their dialogue uses (Sir Sludge, Bog Baron, Crag Keeper, Bone Warden, Kilnback, Storekeeper and their variants).
- Restored stock banks use the native decompressed heap instead of raw streams, except the four townsfolk banks of the crowded ending scenes, which keep their verified streams. The BPS shrinks from 2,119,913 to 1,770,421 bytes (−16.5%).
- Kept custom: the Bakery's baked villagers and sky drakes, Master Glaze and the Furnace Maw, Duloc guards, the Masquerader, Duloc Tank, Rivet, Jack Horner, Briar Knight, Moth Witch, Sir Bram's ghost, ICP, Guy Fieri, Magic Mirror, Rumpelstiltskin, the Wishworks Golems, the Fairy Godmother, the Cosmic Muffin family, Tyson and the Onion Ogre.

### Acceptance tooling

- Added `npm run test:onion-ogre-cores` for the superboss in Snes9x and bsnes.
- Rooms whose rebuilt event gains an object share one offset helper (`engine/event-additions.js`); the dialogue audits now cover the Ogre's strings and its decision (223 decision sites).
- Fixed acceptance-harness defects that had been reported as failures: the actor-preview stage was saved after its scene moved on (the party-art suite now passes 1,988 Snes9x and 108 bsnes frames); the technique matrix's all-sections run continued its own persistence save instead of starting new games; its progression expectation counted Shrek's unreachable zero-cost third technique; concurrent core runs could boot a half-written candidate ROM; and the dev server refused a worktree's linked base ROM.

## 0.1.0 release candidate — 2026-11-04

### Campaign and endings

- Completed the native dialogue inventory from 160 to 335 runtime locations and from 3,042 to 5,003 authored replacements, including 175 previously omitted event owners.
- Authored Beyond Time/parade, Reunion, Dream Project, the Successor wedding payoff, The Oath, What the Prophet Seeks, A Slide Show?, Apocalypse, and the remaining Dino Age inn/fair material.
- Added Shrek-present and absent-party alternatives, Farquaad recruitment/defeat branches, and Dragon intact/dive dialogue variants without changing native ending selection logic.
- Replaced the original developer-room dialogue with Shrek Trigger characters and project credits. Slide Show has a new final joke that does not depend on a silent protagonist.
- Integrated the completed humor, choice-label, equipment, and inventory handoffs, including Tin Foil Hat, Pocket Lint, and Left Sock.

### Native cartridge

- Preserved the native 65C816 event/AI/animation implementation and all 116 techniques; no JavaScript gameplay engine or runtime callbacks were added.
- Added explicit cartridge data addresses for newly extended compressed event and dialogue packets. New packets use owned lower-half ExHiROM data banks; code and runtime WRAM/VRAM allocations are unchanged.
- Unified parade dialogue and palette ownership so the adapted scene is reclaimed and emitted exactly once.
- Added direct source-ownership and per-event pointer audits to prevent omitted locations and invalid extended pointers from passing as full coverage.

### Acceptance

- Added a controller-only fresh-game opening route and native save-menu driver.
- Added all-three-slot reset and power-cycle/title-load checks in Snes9x and bsnes, comparing story, party, inventory, equipment, techniques, Dragon, and quest-state projections without savestates or post-start writes.
- Extended the full render and native branch audits to extended event pointers.
- Preserved earlier native technique, art, chapter-fragment, and independent-emulator checks as candidate-specific evidence, not as a substitute for fresh-save campaign completion.

### Packaging and known limits

- Added BPS application instructions, controls, native save instructions, mapper requirements, provenance, non-affiliation notice, and spoiler-separated route notes.
- Physical flashcart/console compatibility remains unverified. Full connected fresh-save campaign and complete ending/mode/speed acceptance are tracked in `acceptance.md`; candidate packaging must not be read as a hardware-support claim.
