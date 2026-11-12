# Swamp Piledriver

Tech 4 replaces Spincut's presentation with a grab, paired jump, Shrek somersault and slam. It retains the original single-target physical damage, 4 MP cost, prerequisites and combo records. The existing Golden Stud reduces the diagnostic loadout's cost to 1 MP. No stun, poison or lasting displacement is added.

The cartridge runs the entire move. The browser sandbox starts an ordinary native encounter and observes it; no JavaScript gameplay callback supplies the animation or target behavior.

## Native implementation

The 206-byte scene occupies the exclusive prefix of Spincut's program at `CE:0BB2–0C7F`. Seven unused prefix bytes and the shared tail at `CE:0C87–0C93` remain exact. Animation packages 25, 27 and 30 also reference `0C87`; the ownership guard deliberately excludes that tail. All shared subscripts, Rock Throw resources and player frame/timing lists remain unchanged.

The normal caster and target channels synchronize through the existing counter B. The enemy rises sixteen pixels into Shrek's hands; both then rise thirty-two pixels. Shrek uses native frames 194, 196, 195 and 197 for the turn, then descends. The target uses its existing hit pose and slam reaction. Both return through native cleanup; Shrek waits for the target's damage display and height-lock cleanup before ending the action.

A guarded four-byte JSL replaces the native scene-pointer load at `C1:4617`. Its shared 101-byte helper changes only the existing `A0B3` alternate-scene selector for player techs 4 and 7. Four Layer Slam added four bytes to the original 97-byte helper; the Piledriver choreography is unchanged. It preserves the source instruction's accumulator, flags, X, Y, DB, DP and stack behavior. No new WRAM, VRAM, palettes, object cells or samples are required.

Targets anchor if their current native category includes flying or either immovable boss tier (`category & 0x62`), or their current cartridge sprite header uses a larger/special layout (`size & 0xFE`). Ordinary four/eight-cell targets may lift. The original miss branch also selects the anchored presentation. The helper never changes `AE94`, damage results or target eligibility, so an oversized boss still takes Spincut's normal damage. Anchored target scripts contain no movement or height commands. Shrek uses the native 7:1 caster/target approach point for this ground-slam variant, keeping the turn visible in front of a large fixed/background body. The earlier private candidate could place him behind the tank’s body; phase-triggered captures exposed that occlusion despite its passing damage/cleanup checks. The final scene corrects the approach and retains the same target impact.

The sounds are the resident lift and impact cues `6B/6C`. The launch height keeps ordinary targets visible in the tested scenes. The gallery includes actual cartridge stills and an animated capture.

## Verification

`node --test tests/swamp-piledriver.test.mjs` checks byte ownership and mechanics, all 256 enemy headers in all three party slots with and without the native miss selector, other commands/techs, invalid targets and CPU preservation. Actual sandbox casts cover all three party slots, an eight-cell target and Great Milenko, then a following Eye Lasers turn. Captures and native traces check all four rotation poses, both sounds, target-only damage, exact starting/ending actor coordinates, zero remaining height offsets/locks and the final channel synchronization.

`npm run test:piledriver-cores -- all` runs Snes9x and bsnes without gameplay hooks. It casts from all party slots in the original clown battle, continues through the native fusion for the anchored Milenko case, and enters the original three-part Duloc Tank fight. Every cast is followed by a normal Eye Lasers turn. Checkpoint writes stop before each authored encounter begins; the tests use a strong diagnostic loadout, not a normal-level balance claim.

Evidence is under `.local/qa/piledriver-e4c95d048193/`. The initial JS assertion compared coordinates before menu selection, when an enemy could still finish its prior movement; the corrected assertion captures them at native animation selection. No ROM change was needed for that fixture correction. Physical hardware and a full campaign rerun are outside this focused acceptance.
