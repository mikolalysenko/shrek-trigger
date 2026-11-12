# Swamp creatures and the forest pyramid

Swamp Dozer and Old Dozer use their original Chrono Trigger artwork. They are ordinary enemy/utility actors rather than named story characters, so the former moss/peat replacement is no longer active.

Graphics99, assembly58, palette57 and native animation93 retain their original pointers and bytes. All 24 poses per actor, native AI, statistics, rewards and four-cell geometry are unchanged. `tests/swamp-creatures.test.mjs` compares the complete stock bank and uploads all 48 native frames. Guy Fieri's master tier remains independently relocated to graphics252/assembly237/palette250.

The historical editable replacement remains in `engine/swamp-creature-art.js` for reference only; it is not used by the active build or gallery.

## Pyramid route

The forest pyramid route is unchanged by the stock-art restoration. `tests/pyramid-controller.mjs` uses only ordinary controller input and observations after entering location42:

- Before native story value171, approaching the seal does not open it or grant an item.
- With the charged-pendant story state, each companion delivers the appropriate reaction. The seal opens, the guardian explains the builders' gifts, and control returns.
- The left object grants Safe Helm (item138); the right grants Swift Reed (item83). A second gift cannot be claimed.
- The route follows the real forest exit, preserving the opened-seal and claimed-gift flags.

The seal uses `$7F019C` bit2; the one-gift flag uses `$7F01A0` bit0. All event instructions and treasure IDs remain native. The **Pyramid · charged seal and one gift** shortcut prepares the diagnostic story state and restores the complete previous machine on undo.
