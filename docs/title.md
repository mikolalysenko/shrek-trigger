# Native Shrek title

Claude's supplied-logo implementation, source commit `e86161b`, is integrated as `77fe3bb`. It uses the user's `Shrek-Logo-500x281.png`, SHA-256 `3c9c3d83a0545a79e699c77f42a66ebdd23b5e620ed63ba3c217f34ca9662a85`. The frozen indexed logo is in `content/title-logo.js`; ordinary cartridge builds need no image decoder or browser overlay.

The S and its ears fly into the original clock dial. The stock arcs, minute marks, numerals and hands remain. The stock Square copyright is replaced by the native sprite text `NOT AFFILIATED WITH SQUARE OR DREAMWORKS`. H, R, E and K then slide out together using the native sixteen-pixel sprite routine. The original palette fade and the integrated All Star Pendulum timing remain in control.

The title uses 252 object tiles, 95 OAM entries, at most 23 sprites and 31 eight-pixel slivers per scanline. These fit the SNES limits and the existing title VRAM allocation. The seven logo tables use 311 of their original 327 bytes; the disclaimer uses ten 16×16 sprites in the existing copyright-table space. All code and table changes are in the cartridge's existing cinematic program; no new runtime buffer is needed.

The isolated integration cartridge is `61c4b042a2238957f3ad26fb32a6f5b5b83815fa94f5da125ad61b3ccc64b679`, built on the generated character pass. All 38 title, music, Dragon, cartridge, player-placement and allocation checks pass on this image. The title checks compare every displayed logo pixel, preserve the original hand tiles, verify the native disclaimer sprites, check fly-in and slide motion, and enforce per-line hardware limits. Its complete independent chapter routes and the next art integration remain separate validation work.

To regenerate the frozen logo from the same supplied PNG:

```sh
npm run title:import -- '/path/to/Shrek-Logo-500x281.png'
```

The importer records the source hash and retains a private source copy under `.local/title/`. It deterministically samples five separate letter shapes onto an eleven-color SNES green ramp. The title builder combines that art with the dial extracted from the verified base ROM. Source regeneration must reproduce the checked-in module exactly before accepting a new image.
