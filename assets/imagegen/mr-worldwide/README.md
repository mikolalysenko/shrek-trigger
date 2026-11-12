# Mr. Worldwide source art

The eight native poses come from `source-v2.png`, generated with the OpenAI Images API (`gpt-image-2.6-sunburst`, edits endpoint) from `prompt-v2.txt` with `reference-current-v1.png` (the earlier hand-authored placeholder) as the pose reference. `provenance-v2.json` records the request ID, parameters and hashes. The PNG is unchanged from the API response.

`import-spec.json` turns it into native frames through `scripts/import-raster-art.mjs`:
- **Background:** a recorded edge flood-fill mask removes the flat magenta key (tolerance 110, plus two passes of key-hued fringe).
- **Scale and sampling:** figures are scaled to a 52-pixel idle height in the 48×64, twelve-cell box, with area-vote sampling.
- **Palette:** twelve colors picked by role from k-means clusters of the sheet and snapped to SNES 15-bit (`content/mr-worldwide-palette.js`).
- **Breathing frames:** frames 1 and 2 are the breathing shifts of frame 0. Rows above 45 move up or down one pixel, so the legs stay fixed.

Rejected candidates (not kept in the repository):

| Prompt and model | Request ID | Why |
| --- | --- | --- |
| prompt-v1, gpt-image-2.6-sunburst, with reference | `req_7b5ae83cdf49463bb7d8f6f99b26223b` | Ignored the flat background (dark smoky backdrop, too close to the outlines to mask) |
| prompt-v1, gpt-image-2.6-flare, with reference | `req_5fe8003202514759879f639d4c95e4f3` | Same background problem |
| prompt-v2 without the reference, gpt-image-2.6-sunburst | `req_8a7aece90e264dcfbab257baa965966a` | Clean background, but less consistent scale and facing; skin quantized too orange |

`gpt-image-2` rejected `background: transparent` ("Transparent background is not supported for this model"), which is why the key-color mask exists.
