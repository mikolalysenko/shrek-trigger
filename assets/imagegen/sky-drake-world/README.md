# Sky-drake world poses

Sampling spec for the nine overworld mount poses. The source and its provenance live in `../sky-drakes/` (`source-world-v2.png`, `provenance-world-v2.json`). The twelve-entry palette holds the eight shared mount colors (sprite palette 4, indices 8–15 in the game), padded with repeats that the quantizer never selects. `engine/sky-drake-art.js` adds 7 to each index. The low side pose is anchored to row 23 because only rows 8–23 of that canvas are stored.
