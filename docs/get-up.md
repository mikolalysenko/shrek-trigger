# Love & Life (formerly Get Up)

Shrek revives a fallen ally with a closed-eye inhale, open-mouth wake-up roar and the original Life revival effect. The source healing formula, fallen-ally targeting, 10 MP cost, progression and combination records stay unchanged. Menu help reads **Wake fallen ally**. The existing angels and halo remain; this implementation does not add new fume graphics.

Five bytes change inside Life's exclusive 34-byte caster sequence at `CE:0E12`: facing, inhale pose, the resident ogre roar and the native mouth loop. All timing, counters, target/effect channels and cleanup remain exact. Build guards reject changed source bytes, another header/channel/subscript/tech owner, a shared help string or a missing resident roar. No additional ROM allocation, CPU hook, WRAM, VRAM, sample, palette slot or object cell is needed.

## Try it

In the browser, open **F1 → Quick start in the swamp → Combat sandbox**. Choose the clown encounter and **Revival test · Fiona down**, then Start. Use Shrek's Tech menu to select **Get Up**. Retry restores Fiona's initial KO and the same battle RNG; Return restores the exact pre-sandbox game. The diagnostic Gold Stud reduces the original 10 MP cost to 3 MP.

The sandbox only prepares the entry state. Target selection, the revival, healing, audiovisual effects and subsequent turns execute through the cartridge's ordinary battle engine. The standalone ROM uses the same patched technique without the browser tools.

## Validation

Cartridge `0758f532bcbf0322997553f1e11b40463e15ab463a54555e4a624b4cd4bacd3f` changes 21 bytes from `af3383746691`: five caster bytes, twelve help bytes and four header-checksum bytes. All graphics banks, shared animation channels, combat mechanics, event programs and resource allocations are byte-identical.

The focused native test revives either other ally from all three Shrek party positions. Each case observes native healing and KO removal, both mouth poses, roar and revival sound, bounded audio, renderer cleanup, original discounted MP cost and a following Eye Lasers turn. Separate checks verify source ownership guards and exact restoration/retry of the public revival sandbox.

Snes9x and bsnes each pass all six cases in the original two-clown encounter, then cast Eye Lasers normally. Initial diagnostic setup ends before entering the original scene; no battle-state writes or JavaScript hooks perform the revival. The runs cover 49,978 and 50,056 frames respectively. These strong diagnostic loadouts establish execution, not normal-level balance or full-campaign completion.

Run `node --test tests/get-up.test.mjs` or `npm run test:get-up-cores`. Evidence is `.local/qa/get-up-0758f532bcbf/`, with focused logs `get-up-tests.txt`, `get-up-sandbox-tests.txt` and `get-up-cores.txt` under `.local/qa/`.

## Review and reproduction

The gallery adds a seventh native technique recording, including Fiona's actual revival. Unchanged court/swamp, guard and endgame scene captures retain their original `af3383746691` provenance in captions and `cartridgeSha256` fields; they are not relabeled as new route runs. Current technique recordings and sprite atlases identify the new cartridge.

The publication directory records exact staged-source reproduction, independent Floating IPS reconstruction, the bounded ROM delta and desktop/mobile review checks. Earlier campaign evidence keeps its original cartridge fingerprint. The full game remains in development, with 109 technique presentations still pending.
