# Faygo bottle

`source-v3.png` (OpenAI Images API, `gpt-image-2.6-sunburst`, `prompt-v3.txt`) is a sheet of four chunky bottle icons. The three flavor specs (`faygo-orange`, `faygo-blue`, `faygo-red`) all sample cell 0 with the orange palette as the sampling palette:
- **Shared pixels:** every flavor gets identical indices, and its own palette recolors them.
- **Fit:** point sampling at 0.94 of a 16-row height keeps the label's "F" legible. The bottle stays within the original sparkle's five-tile (160-byte) budget, on its original bottom row 30.

Rejected attempts:

| Prompt | Request ID | Why |
| --- | --- | --- |
| prompt-v1 (detailed bottle, with the placeholder reference) | `req_736175e4b60b41059a314848cabccd01` | At 15 native rows the bubbles and the label's "F" turned to noise |
| prompt-v2 (chunky 12×15 icon) | `req_1003b56de5884b828a0bc2ba3794cb13` | Drawn 19 blocks tall; within the budget the "F" could not resolve |
