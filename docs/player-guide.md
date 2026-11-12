# Shrek Trigger player guide

## Apply the patch

Shrek Trigger is distributed as a **BPS patch**, not as a cartridge image. You must supply your own unheadered **Chrono Trigger (USA)** ROM:

- Size: **4,194,304 bytes**
- SHA-256: `06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9`
- A 512-byte copier header must be removed before applying the patch.

With [Floating IPS](https://github.com/Alcaro/Flips), apply `shrek-trigger-0.1.0.bps` to that file. The rebuilt game is **8 MiB, ExHiROM / mapper 35**. Verify the output against `CHECKSUMS.txt` before playing. Other regions and revisions are unsupported. Do not upload or distribute the original ROM with the patch.

## Emulator and hardware requirements

Use a current Snes9x or bsnes core with ExHiROM/mapper-35 support. The release acceptance suite runs the native cartridge in both; the browser is only a development frontend and is not required to play.

**Physical-cartridge/flashcart compatibility is not established.** An 8 MiB ExHiROM image requires explicit mapper and SRAM support. Do not interpret emulator support as a promise that a particular flashcart, copier, or console cartridge will boot or preserve saves. See `acceptance.md` for the tested scope.

## Controls

| SNES input | Action |
| --- | --- |
| D-pad | Move; choose menus and dialogue options |
| A | Confirm; talk; inspect; select a technique, item, or target |
| B | Cancel; hold while moving to run |
| X | Open the native game menu |
| Start | Pause; confirm names and title selections |
| L / R | Used by specific native puzzles and race controls |
| L + R + A | Activate marked passage switches when the story permits |

Button-gated techniques use the named **equipment Buttons**, not a new controller mapping. Technique help identifies ordinary prerequisites and accessory-gated combinations.

## Saving and loading

- Save through the native menu on the overworld or at a real save point. Indoor rooms are not universally save-enabled.
- Three independent battery-backed slots are available. Select a slot once to focus it and again to write it.
- After a reset or power cycle, the title cursor remembers the most recently saved slot. Move to the desired slot and confirm to load it.
- Story progress, party, inventory, equipment, learned techniques, Dragon state, and optional-quest flags belong to the selected slot. Cancelling does not write a slot.
- Save compatibility across different development builds is not promised. Keep saves with the exact patch fingerprint used to create them.

## Content and affiliation

This is an unofficial fan adaptation. Chrono Trigger, Shrek, and related characters and settings belong to their respective owners. The project is not affiliated with Square Enix, DreamWorks, or the other rights holders. No original cartridge image, film recording, or commercial music recording is included. See `CREDITS.md` for art, music, source, and tooling provenance.
