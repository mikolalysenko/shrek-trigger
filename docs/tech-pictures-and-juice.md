# Picture techniques, sound swaps and impact shake

Added November 11, 2026, when technique balance and presentation stopped being frozen (see `docs/decisions.md`, "Funny techniques and joke mechanics").

## Picture techniques

A picture technique shows one generated picture over the battlefield, the way Swamp Belch shows its cloud. The table is `engine/tech-pictures.js`:

| Technique | Picture |
| --- | --- |
| 24 Call My Wife (Donkey, Flare) | Dragon |
| 52 Compensate (Farquaad, Dark Bomb) | a very tall tower |
| 56 Some May Die (Farquaad, Dark Matter) | Farquaad's face |
| 32 Magnets! (Pinocchio, Shock) | a horseshoe magnet |
| 14 Bird Pop (Fiona, Ice II) | an inflated bluebird |
| 18 Are We There Yet? (Donkey, Hypno Wave) | Donkey's face |
| 51 Torch Mob (Farquaad, Fire II) | a mob with torches |
| 55 Dungeon (Farquaad, Black Hole) | an iron cage |
| 49 Royal Decree (Farquaad, Lightning II) | a proclamation |

How it works:

- The technique's 7-byte animation record is replaced with Luminaire's, the only stock record whose scene runs a background script. Targets, control, effect record and MP stay the technique's own, so damage, status and cost do not change.
- The picture is 160 by 160 screen pixels, three colors, drawn on BG3 with no color math. Only the left half is stored; the right half reuses the same tiles flipped, which keeps every picture under the 237 tiles the native loader allows.
- The picture is revealed through a window shaped like its own outline that grows (`grow` pixels of radius per frame), holds (`hold` frames) and then lifts away, using Swamp Belch's precomputed window rows.
- Each picture costs about 26 KiB of cartridge data (tiles, map, window rows) and no extra VRAM or WRAM.

To add one:

1. Write a prompt for a front-on, left-right symmetrical subject on flat green and generate it: `node scripts/openai-imagegen.mjs --prompt assets/imagegen/<key>/prompt-v1.txt --out assets/imagegen/<key>/source-v1.png --size 1024x1024`.
2. Import it: `node scripts/import-backdrop-art.mjs assets/imagegen/<key>/source-v1.png engine/tech-pictures/<key>.js <name>Raster 160`.
3. Add a row to `techPictures`, and give its two Luminaire cues (charge and blast) their own sounds in `content/tech-juice.js`.
4. Remove the technique's color theme from `content/tech-themes.js` and mark it `native-animation` in `content/techs.json`.
5. Check it: `node scripts/capture-techs.mjs <id>`, `node scripts/scan-tech-blanking.mjs <id>`, `node --test tests/call-my-wife.test.mjs`.

The scene lasts as long as Luminaire's, so this suits big spells, not something cast every turn.

## Sound swaps and impact shake

`engine/tech-juice.js` hooks the sound driver's play entry (`JSL C7:0004`). For a sound effect sent by the battle program it does two things, from the tables in `content/tech-juice.js`:

- **`soundSwaps`**: while a given party technique is active, one stock cue is replaced by another. A cue recast to sound `$3F` is dropped without interrupting what is playing.

New sounds are possible too. Both resident sound banks have a pointer table at SPC `$2F00 + id*4`, and sounds `$0E`-`$3F` are empty in both, which leaves about 200 bytes for new sequence programs. Swamp Belch's burp (`swampBurp` in `engine/swamp-belch.js`, sound `$FC`) lives there. The sequence commands are the driver's own (program `DC`, octave `D6`, vibrato `C9`, pitch slide `C8`, notes as note*14+length, `EB` to end); `.local/reference/sqspcmml.py` lists them. The in-house emulator exposes the sound chip (`s.apu.dsp.ram`), so a new sound's length and pitch curve can be measured even without listening.
- **`impacts`**: a sound in this table starts the native screen shake with an amplitude and a decay rate. It applies to every battle, enemy attacks included, and the shake stops by itself.

`node scripts/log-tech-sounds.mjs <ids>` prints the cues a technique sends, after swaps, and the largest shake offset it causes. The battle sound ids were named by which stock techniques play them; nobody has listened to them through this pipeline, so a swap should be checked by ear in an emulator.

## Joke mechanics

- **Love & Life** uses Life II's effect record: a full revival for Life's MP.
- **Some May Die** costs 0 MP. When Farquaad queues it, each other party member with more than 1 HP drops to 1 HP (`engine/nine-lives.js`, the command-queue hook, which acts only on technique commands).
