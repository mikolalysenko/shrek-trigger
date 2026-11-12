# Carnival Hatchet props

`source-v3.png` (OpenAI Images API, `gpt-image-2.6-sunburst`, `prompt-v3.txt`, no reference image) supplies three registry actors through their own specs:
- **carnival-hatchet:** spin frames 0–2 come from cells 0–2. Frames 3–5 are their recorded horizontal flips and frame 6 is frame 0 flipped vertically, as the native spin requires. The haft is nudged onto the native anchor at x 15/16, row 29.
- **ruby-hatchet:** cell 7, the ruby variant.
- **hatchet-parts:** cells 8 and 9, the broken head and haft.

All three sample into the fixed hatchet palette (`content/carnival.js`) after a recorded cyan key mask.

Rejected attempts (both drew the items on a dark glowing display backdrop that cannot be masked from their dark outlines):

| Prompt | Request ID |
| --- | --- |
| prompt-v1, with the placeholder reference | `req_e457012918254619a46891261afe275c` |
| prompt-v2, with the placeholder reference | `req_f81bb24b1c6942eda202f3698b9b9398` |
