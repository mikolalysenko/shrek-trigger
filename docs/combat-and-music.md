# Combat sandbox, Fart and native music

Open the workshop with **F1**, then use **Combat sandbox**. Ten fixtures cover one target, three targets, the clown duo, Great Milenko, the Masquerader, Kilnback, Glaze, Crumb Hunters, Bone Guards and Clockwork Ushers. Current party mode preserves the party's statistics and equipment. The separate level-60 loadout and optional tech unlock are temporary diagnostic setup. **Retry** restores the complete machine immediately before the native battle command, including the RNG. **Return** restores the complete game from before entering the sandbox. The exported log contains bounded native tech, enemy-action, message and per-target result events.

The sandbox installs an ordinary event at `C0:5703`, immediately after decompression and before native setup. This runs on both entry and the post-battle field reload, so the native object/pointer layout stays consistent after a win or loss. Native commands load actors, place the formation and launch battle. The cartridge runs its own ATB, menus, targeting, AI, effects, damage, status and rewards. No browser combat simulator or HP-writing shortcut is involved. The event stays below the built-in party scripts at `7F:3700`; unique enemy graphics are checked against the existing 32 KiB field heap. The budget reads both verified native streaming helpers and compares each raw bank to its compressed resource, so selected direct-ROM banks are excluded from the decoded heap. The arena uses the native no-game-over flag. All setup and logging remain outside the distributable ROM patch.

## Fart

Single tech `01`, formerly Cyclone, is named **Fart**, with the help text **Gas attack / 25% poison**. Source power, targeting radius, progression and 2 MP base cost are preserved. Equipment can still reduce that cost. Combination techniques keep their source component records and animations.

The native live-property hook adds poison only while preparing single tech `01`. A private operand selects a modulo-four native RNG roll: exactly 64 of 256 source RNG states succeed. It consumes one source random value per target and respects the original poison-immunity bit. Shared effect tables are unchanged.

The spin repeats twelve direction frames with a `1,1,2` tick cadence: three turns in sixteen animation ticks. A guarded native scheduler removes the source two-frame minimum only for this rotation. The live acceptance check observes two complete sixteen-frame periods during an actual cast, from each party slot. Startup can still wait for the original sprite/effect queues.

Two generated 32×32 gas puffs (`assets/imagegen/fart-cloud/`) replace the source wind graphics through the native tile decoder. They retain four 16×16 OBJ cells and reuse the casting Shrek's green palette in any of the three party positions. No extra VRAM, WRAM or palette slot is reserved. The 2 KiB tile data and three small cell-layout packets live in reclaimed cartridge space.

A twelve-byte falling-buzz program occupies verified padding in both resident SPC sound banks. A guarded native sound hook substitutes it for this tech's spin cue only. It uses a resident sample, loops during the spin and stops at the original stop command. Other source effects and combo sound cues remain intact.

| Native boundary | Purpose |
| --- | --- |
| `C1:D5FD`, `C1:E976` | Live tech property and native probability roll |
| `C1:42D0`, `C1:4300`, `C1:430A` | Rotation duration, frame selection and sprite scheduling |
| `CD:1368`, `C1:486D` | Isolated tiles and party-specific cell palette selection |
| `C1:619F` | Isolated sound cue substitution |

Every boundary verifies its original instruction bytes before patching. All helpers and data fit the original 4 MiB HiROM image.

## Eye Lasers

Single tech `02` retains Slash's native line targets, Air damage and 2 MP base
cost. Sixteen paired-beam angles and four short target-fire frames (a generated two-frame flicker, `assets/imagegen/eye-laser-flames/`) replace its
visuals. The fire flashes are animation, with no added burn damage or status.
Shrek uses his focus pose; the beams follow his facing and the source line
trajectory. Each visible effect frame occupies one existing 16×16 OBJ cell.

`engine/eye-lasers-art.js` generates the three-color art. It stores 2 KiB of
two-plane data, expanded by native code into the existing 4 KiB effect upload.
The source fire-effect palette cycle supplies the warm colors. No party or
enemy palette, additional VRAM, working RAM or animation slot is allocated.

`engine/native-tech-effects.js` owns the shared tile and assembly boundaries
for both Fart and Eye Lasers. Each variant checks the acting party slot,
single-tech action, tech ID and source asset before selecting its private data.
Other actions execute the original instructions. Three further guarded helpers
bind each native secondary target's flame, position that existing visual object
at its target, and select the beam angle. They leave real battler coordinates
and the damage target list intact.

`tests/eye-lasers.test.mjs` executes every beam angle and facing, all party slots,
target bindings, exact tile expansion and unrelated-action fallbacks. Real
controller-selected casts cover three-target enemies and Great Milenko.
`npm run test:eye-laser-cores` also casts through the authored clown encounter
in Snes9x and bsnes, with Shrek in each party position. It checks target flame
activation, source MP consumption, enemy damage and exact Snes9x VRAM. Cartridge
`d8ef5a4a819501b861608fb89c03fd33086dd086582a2da89417bc90d0732a11`
passes at 21,552 and 21,549 frames respectively; screenshots and reports are
under `.local/qa/eye-lasers-d8ef5a4a8195/`. The detailed cast revision `7136406a9505a74e9a2bec64300eb2e5f719c0c4c69e7cc0c5207bc67c697e63` also passes every party position in both cores; its captures are under `.local/qa/eye-lasers-7136406a9505/`.

## Ogre Roar

Single tech 03 uses native mouth poses, expanding shockwaves and the existing Tyrano roar cue. Only the selected enemy takes damage; Lightning's Air mechanics and 2 MP base cost remain unchanged. The 44-byte choreography fits its original scene and uses existing graphics, palette and sound resources, with no new CPU hook or memory allocation. All party positions, renderer cleanup and a subsequent Eye Lasers turn pass in both independent cores. See [Ogre Roar's implementation and evidence](ogre-roar.md).

## Music

The one-shot morning cue is unchanged. The title theme, the boot title cue and the flight theme are now All Star mashups (below). The swamp's regular indoor music uses the user's supplied **SMASH MOUTH.All star.mid**, SHA-256 `d1b6d92ff41231632925f7279685c628b4d2c2d3a8873e6e2529c66c6c2b3803`. The original file stays private under `.local/music/`; its transformed note score is `content/music-all-star.js`. Reimport with:

```sh
npm run music:import -- '/path/to/SMASH MOUTH.All star.mid'
```

The source MIDI has 336 beats, including three silent beats before its opening pickup. The arrangement joins that pickup to the final chord's first three beats, making a 332-beat loop with no silent pause at the join. Every note onset is retained; only the four final sustained notes are shortened. Six monophonic voices use wind flute, harp, guitar, electric bass, kick/snare and hi-hat. The harp sits left of center to balance the intro and its highest phrases fold down an octave to fit the sample's DSP pitch range. The compiled sequence is 3,568 bytes. Repeated bars use the driver's bounded repeat stack; an independent reader verifies every arranged note, tie and loop boundary.

**Hatchet Carnival** is an original sixteen-bar organ, harp, guitar, bass and drum composition for both guardian phases and their sandbox fixtures. A short organ motif alternates with harp answers, then a fuller middle section and final reprise. Percussion shares one voice. The score uses nine native instruments and compiles to 1,108 bytes. Claude Code supplied this revision at the user's request, using `claude-opus-5-5` at maximum effort; its composition and All Star mix review were based on score data, not audio listening. It is not a transcription of an ICP recording. The mountain dialogue includes the requested magnet question. Smash Mouth references also appear in the swamp, festival, Bakery feast and future race dialogue.

Both pieces execute as native AKAO4 sequences using the original game samples. Unused source song slots 81 and 82 are checked for location/event ownership before replacement. Each song stays below SPC `2F00`, leaving the resident sound library intact, and uses six voices so the two native effect voices remain free. No new BRR samples or music runtime hooks are required. Other eras retain their source soundtrack.

### Title, pendulum and flight mashups

Three stock songs are rewritten in place as blends of All Star with the music they replace. Each keeps its song pointer, its instrument slots and its percussion-kit table, so the title, attract and story events that call it, its sample upload and its kit entries are unchanged. The sequences fit inside the stock songs' own bytes, so they use no reclaimed cartridge space. Parts quoted from the stock songs are read from the player's ROM at build time by `engine/music-stock.js`. No cartridge note data is stored in the repository. The All Star melody phrases in `content/music-all-star-phrases.js` are quoted from the supplied MIDI. A test checks every quoted onset and pitch against the derived swamp score.

**All Star Trigger** replaces the *Chrono Trigger* theme (song `0x18`): `content/music-all-star-trigger.js`, 2,274 of 2,829 bytes, at the stock tempo (about 130 BPM as measured in the emulator) and in A major. It keeps the stock form exactly: a 48-tick pickup and 8-bar introduction, then a 16-bar loop whose last bar tests the driver's condition. When sound command `$88` has set that condition, a 25-bar finale follows and ends the song. The native attract sequence uses this: it sends `$88 1` (frame 7501 in the stock attract), the stock theme enters its finale and ends, and the attract restarts. The new song keeps those cues within a few frames of the stock timing.

- The introduction is the stock rising string line and its harmony moved into A major.
- The loop sets the All Star verse and chorus on the stock lead with its vibrato. Underneath, the strings play the stock theme's main melody an octave lower, in A major, as a counter-melody.
- The original snare-march part plays verbatim. The stock timpani rhythm, the theme's syncopated bass and its 3+3+2 string stabs follow the All Star chords.
- The finale turns the stock quiet section into the All Star bridge on soft strings over harp, then brings back the instrumental hook. It builds on the stock snare crescendo and climax rhythms, sends the chorus an octave higher, and closes on A.

**All Star · Wings arrangement** replaces *Wings that Cross Time* (song `0x13`, the flight music): `content/music-all-star-wings.js`, 2,034 of 2,513 bytes, at the stock tempo (about 137 BPM) and in the theme's own B-flat register. The stock four-bar introduction now turns through C minor and F into a 32-bar loop:

- The All Star verse and chorus play on the stock lead, over the flight theme's syncopated bright piano, rocking guitar riff, staccato bass and drums.
- Then fourteen bars of the flight theme play with all their stock parts. Its last phrase is re-harmonised over F so that "Some-body" leads back into the verse.
- The stock kick/snare and hi-hat voices share one native kit voice, keeping the hats' accents, so the song still leaves two voices for sound effects.

**All Star Pendulum** replaces the one-shot cue under the pendulum and the Shrek Trigger logo when the game boots (song `0x30`, started only by the title cinematic): `content/music-all-star-title.js`, 644 of 651 bytes, at the stock tempo (about 98 BPM) and in D. It keeps the stock cue's thirteen bars, eight voices, instruments (strings, piano, choir, timpani, cymbal and woodblock) and arc: a build in the dark, a bloom on the logo and a long settle. Its beats land on the stock cue's frames, each within a frame: the clock's first tick at frame 139, the roll at 729 and the logo reveal at 876. Like the stock cue, it plays once and ends. It is silent from frame 2044, before the game fades the logo at frame 2134.

- Bars 0–4, in the dark: the stock woodblock clock ticks every half note with its faint echo. A music-box piano sings the verse's first line ("Somebody once told me … in the shed"). Beneath it, the cue's own twinkling piano triplets fade in on the verse's chords, with the stock pan sweep. Under "shed", the stock timpani roll and a choir swell on A lead into the logo.
- Bars 5–8, on the logo: the choir carries its swell straight into the All Star chorus, and the music box sings the first two bars with it. Underneath are a second choir voice, strings, timpani, the twinkle and the stock cymbal; a second cymbal marks TRIGGER. The twinkle's A chord is the stock cue's A-sus4 figure.
- Bars 9–12: the music box alone sings the chorus's second half ("…only shooting stars break the mold") over soft choir chords and the twinkle. It closes from G to D and fades with the clock still ticking.

The form compiler writes one-shot cues that end with `EB` instead of looping. It accepts the stock pan sweep (`CD`), and it moves a known octave by one with the one-byte `D7`/`D8`. The octave change made the two looping mashups 166 and 70 bytes smaller without changing a note.

These three pieces use 30,330, 25,848 and 28,728 bytes of samples, the stock songs' own instrument sets. Claude Code arranged them at the user's request, using `claude-opus-5-5`. The arrangements were checked through score data, a semitone-clash audit, emulator level measurements and DSP register checks. They were not reviewed by listening.

### Fireball · Boss Battle 2 (Mr. Worldwide superboss)

The superboss fight plays **Fireball · Boss Battle 2**, a rearrangement of “Fireball” with Boss Battle 2 mixed in. The source is the user's supplied **fireball.mid**, SHA-256 `2f193bce00891e4e3765470f6ae53b51406008141cfa411a9c0b0c53e45c251b`. It is a single-track file at 123 BPM in F with this shape:
- **Verse (bars 2–16):** a strummed F to E-flat vamp, a low sax chop, Latin percussion and a reverse-cymbal riser.
- **Stop (bar 17):** one floor-tom hit, where Pitbull shouts "Fireball!".
- **Drop (bar 18 on):** trumpet, tenor sax and brass play the riff in unison over the bass riff and a four-on-the-floor kick with offbeat hats and timbales.

The file stays private under `.local/music/`. `npm run music:import-fireball` quotes only the phrases used into `content/music-fireball-phrases.js`:
- the two-bar trumpet riff;
- the bass riff;
- the strummed vamp (top and inner voices);
- four bars of the sax chop;
- the drop's groove and the fill into the stop.

Boss Battle 2's parts are read from the player's ROM at build time. `stockVoice` also follows its one-time note lengths (`E8`), pan sweep and tempo fades.

The song lives in stock slot `0x4F`, a two-bar one-shot fanfare. No location music byte, event EA command or code immediate song request plays that slot, and the build checks all three. Boss Battle 2 keeps its own slot, bytes, instruments and kit.

`content/music-fireball.js` compiles to 3,032 bytes of six voices, leaving two for battle effects:
- **Instruments:** Boss Battle 2's five (brass, strings, bass, harp, flute) followed by the native kick, snare, hi-hat, crash cymbal and timpani, 32,841 bytes of samples in all. The harp and flute slots stay only because Boss Battle 2's slots come first. Stock songs played in battle already use up to 34,146 bytes.
- **Tempo:** 136. The driver's tempo byte is beats per minute (measured in the emulator), so this is a little above the file's 123. The first version ran at 116 and sounded too relaxed (see [decisions](decisions.md)).
- **Mix:** echo is light (volume 14, feedback 40) and off for the drums and bass.

Fireball moves down a minor third into Boss Battle 2's D minor. Its riff and bass riff have no third, so they fit unchanged, and the vamp becomes D minor to C. After Boss Battle 2's two-note brass pickup over a timpani roll, the 32-bar loop runs:

| Bars | Section | What plays |
| --- | --- | --- |
| 0–3 | Trumpet riff | The riff an octave up on the brass lead, doubled at pitch on the second brass voice, over the strummed vamp, a four-on-the-floor kick and the file's hats; the bass riff enters in bar 2. |
| 4–6 | Build | The sax chop on brass, a D pedal in eighths, a chromatic string tremolo rising A to D, and a snare roll from eighths to thirty-seconds. The file's tom fill closes it on timpani under a brass run. |
| 7 | FIRE–BALL | Two full-band D minor hits with timpani and crash on beats one and two, silence where the shout goes, then a timpani-and-snare pickup. |
| 8–15 | Drop | The riff in octaves, the bass riff, and a sixteenth-note string ostinato on the strum's own voicing. The drums are the file's kick, offbeat hats and timbales plus a snare on two and four, with a crash every four bars. |
| 16–23 | Boss Battle 2 | Its second statement: melody and bass quoted, its pads as the sixteenth-note ostinato, timpani on the downbeats. The riff answers on brass, an octave up on D, a fourth down for the G minor bars, then on D; Boss Battle 2's own brass harmony fills bars 20–21. |
| 24–26 | Turnaround | Boss Battle 2's turnaround with its melody in octaves, into the tom fill. |
| 27 | FIRE–BALL | The stop again. |
| 28–31 | Drop | The riff and bass riff, with Boss Battle 2's opening melody as a string counter-melody. A snare roll leads back to bar 0. |

A semitone-clash audit of every pair of melodic voices finds three kinds of rub:
- the build's C♯ tremolo against the D pedal, which is intended tension;
- Boss Battle 2's own major-seventh chords and suspensions in its sections;
- passing notes of 6–18 ticks.

Emulator levels peak at the DSP's full scale on two isolated samples per minute, about 26% louder RMS than the first version.

Claude Code arranged it at the user's request, using `claude-opus-5-5`, from score data. It was not reviewed by listening.

## Verification

`tests/swamp-spin.test.mjs` executes the native helpers, checks CPU/stack preservation, exhaustive RNG distribution, immunity, shared effects, tile decoding, palette ownership and sound-bank bounds. `tests/combat-sandbox.test.mjs` exercises all ten formations, exact machine/RNG retry, exact return, ordinary enemy actions and real Fart casts in all party positions. `tests/music.test.mjs` covers MIDI input, note reconstruction (including the title theme's finale path), bytecode limits, the in-place stock-song rewrites with their slots and kits, the provenance of every quoted All Star note, the preserved morning cue and native SPC playback: the swamp, the title, dragon flight, a `$88`-armed finale that ends within 90 frames of the stock theme's ending, and the boot title cue (uploaded at boot, its first tick, roll and logo reveal on the stock cue's frames, silent before the logo fades). It also checks the superboss theme: the spare slot `0x4F` and Boss Battle 2 left intact; every note through its loop; every Fireball quote at its fixed transposition (re-derived from the private MIDI when present); the Boss Battle 2 parts against the ROM; and native playback past the loop point. The browser test uses the visible combat controls.

`npm run test:combat-cores` checks the same cartridge in Snes9x and bsnes, starting fresh games, playing full swamp and guardian-song loops and casting Fart in the authored guardian battle. It uses diagnostic party/story setup before arrival, then ordinary controller inputs. A complete native battle snapshot restores the cast starting point after the boss-song loop check. Reports and screenshots stay in `.local/qa/combat-music-*`. This does not establish a completed campaign or physical-hardware compatibility.
