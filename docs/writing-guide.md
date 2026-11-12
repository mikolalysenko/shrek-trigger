# Writing guide

How field dialogue in Shrek Trigger is written, and the rules a rewrite has to keep so the cartridge still works. `scripts/check-dialogue-style.mjs` enforces the mechanical rules; this page covers the rest.

## What the game is

Chrono Trigger's story, scene for scene, played by the Shrek cast with a straight face. The plot beats, quests, hints and choices are Chrono Trigger's. The voice is Shrek's: grumpy, fast, a little crude, and funnier when it is specific than when it is loud.

| Role | Played by | Voice |
| --- | --- | --- |
| Crono | **Shrek** | Blunt, dry, short sentences. Wants to be left alone and keeps helping anyway. Insults are affectionate. He speaks (Crono did not). |
| Marle | **Fiona** | Sharp, capable, impatient with protocol. Fights better than the men and knows it. |
| Lucca | **Donkey** | Motor-mouth inventor. Cannot stop talking, takes credit, panics, comes through. |
| Robo | **Pinocchio** | Earnest wooden puppet, literal, anxious, polite. Lies badly. Believes in magnets, not explanations. |
| Frog | **Puss in Boots** | Gallant swordsman, flowery, proud, the occasional "amigo" or "señor". Never more than one Spanish word per line. |
| Ayla | **Mongo** | Giant gingerbread man. Very few words, third person ("Mongo help."), enormous heart. |
| Magus | **Lord Farquaad** | Pompous, petty, precise. Short jokes land on him; he never notices. |
| Epoch | **Dragon** | Donkey's wife. Flies. Does not speak. |
| Queen Zeal | **Fairy Godmother** | Showbiz villain, sweet until crossed. Her kingdom, Zeal, is **Ohio**. |
| Lavos | **the Cosmic Muffin** | A thing that fell from the sky and is baking the planet from inside. |
| Spekkio | **Guy Fieri** | Flavortown. Loud, generous, food metaphors. |
| Gaspar | **Steve Harwell** | Smash Mouth's singer, tired and kind, at the Last Inn. |
| Masa and Mune | **Violent J and Shaggy 2 Dope** | Juggalo carnival barkers. Faygo. "Fucking magnets" belongs to them and Pinocchio. |
| Final boss | **Mike Tyson** | Says little. |

Duloc is the present-day kingdom (Guardia). Other renamed people and places appear in the files; keep whatever name a line already uses.

## What makes a line better

- **Specific beats general.** "The ears are too small" is funnier than "that is a bad drawing".
- **Short.** Cut the setup. One joke per box. If a line is already good, leave it.
- **In character.** The joke should only work from that speaker.
- **Play it straight.** Villagers believe their world. The comedy is ogres, donkeys and Guy Fieri taking a time-travel epic seriously, not winks at the player.
- **Natural speech.** Contractions are fine and usually better ("I'm", "don't", "it's"), except for Mongo, who speaks in fragments, and for formal speakers where stiffness is the joke (Farquaad, court officials, Pinocchio when nervous).
- **Variety.** Not every joke is an onion, a layer or a swamp. Use them where they earn it.
- **Keep it PG-13.** The one sanctioned swear is the magnets line.

Do not add pop-culture references beyond the cast above, real people who are not already in the game, or anything that dates the script.

## What must not change

A line is also an instruction to the player. Keep, exactly:

- **Facts and hints**: where to go, what to bring, who has what, prices and other numbers, passwords, the order of steps.
- **Who is speaking.** Keep the `NAME:` label a string starts with.
- **Choices.** Rows that are menu options (`   Yes.` / `   No.`) stay character for character, on the same rows.
- **Control codes.** Every `{...}` code stays, in the same order: `{null}`, `{page}`, `{full}`, `{delay 12}`, `{shrek}`, `{item}`, `{value 8}` and the rest. Text between them is yours. Timed lines (`{delay n}`) are synchronized to a cutscene; keep them about the same length.
- **Which strings exist.** Never add, remove or renumber one.
- **Quoted material**: the Miracles excerpt, any line with "magnets", `GET OUT OF MY SWAMP!`, and "left my sandwich in 600" stay as they are.

## Layout

- A row is at most **34 characters**. Name codes count as 5 (`{shrek}`), `{item}` as 10, `{value}` as 3.
- A page (the text between two control codes) is at most **3 rows**, or as many as it had before if that was 4.
- Break rows with `\n` where a person would pause. Do not leave one word alone on a row.
- Only these characters exist in the font: letters, digits, space and `! ? / “ ” : & ( ) ' . , = - + % ♪ ♥ …`. Use curly double quotes `“ ”`, a straight apostrophe `'`, and `…` or `...` for ellipses. No dashes other than `-`, no semicolons, no asterisks, no accents (write "senor").

## Terms

- **Money is onions.** "That'll be 200 onions." Never `G`, gold or coins. Shrek keeps his savings in a jar. People are paid, taxed and robbed in onions, and nobody finds that odd.
- **Shrek lives alone.** There is no Granny, mother or housekeeper in his swamp house: a jar of onions, a cat, and whoever barges in.
- **Food heals.** Because onions are money, the healing items are the rest of an ogre's diet:

| Was | Now | Effect |
| --- | --- | --- |
| Onion | Weed Rat | 50 HP |
| Sweet Onion | Weed Rat Stew | 200 HP |
| Blooming Onion | Rotisserie Rat | 500 HP |
| Onion Broth | Fish Eye | 10 MP |
| Onion Soup | Fish Eye Tartare | 30 MP |
| Rich Onion Soup | Eyeball Martini | 60 MP |
| Golden Onion | Swamp Toad Soup | all HP and MP |
| Onion Stock | Slug Shake | all MP |
| Onion Feast | Swamp Feast | HP and MP for everyone |
| Pickled Onion | Mud Bath | cures status |
| Onion Juice | Sock Whiff | revives |
| Onion Picnic | Outhouse | rest at a save point |
| Mystery Onion | Mystery Pie | |
| Onion Platter | Rat Kebabs | 200 HP for everyone |

  Quest items keep their names (Onion Petal, Onion Seed, Onion Bread, Sun and Moon Onion Stone, Turbo Onion Key, Ruby Hatchet, Shrek Stand-in, Second Chance and so on). The stat drinks are Orange, Blue and Red Faygo.
- **Stats** are Beef (power), Zoom (speed), Aim (hit), Sly (evade), Mojo (magic), Layer (stamina) and Earwax (magic defense). Use them only where a line names a stat; "magic" as an idea is still magic.
- **Elements** are Air (was Lightning), Dirt (was Shadow), Water and Fire.
- No Chrono Trigger names: not Crono, Marle, Lucca, Robo, Frog, Ayla, Magus, Lavos, Zeal, Guardia, Epoch, Spekkio or Gaspar.

## Checking a rewrite

```sh
node scripts/check-dialogue-style.mjs --list content/medieval-dialogue.js   # the file's strings, with any Shrek reply that follows
node scripts/check-dialogue-style.mjs content/medieval-dialogue.js          # rules above; exits 1 on a problem
npm run test:dialogue-all                                                   # renders every string in the cartridge
```

Some strings are followed by a separate Shrek reply when he is in the party (shown by `--list` as `then "SHREK: ..."`). If you rewrite such a string, the reply must still make sense after it.
