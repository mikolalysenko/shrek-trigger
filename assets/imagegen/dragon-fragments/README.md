# Dragon harness fragments

`source-v3.png` (OpenAI Images API, `gpt-image-2.6-sunburst`, `prompt-v3.txt`) holds two rows of three chunky tumbling fragments. The `dragon-fragments` spec samples the top row (cells 0–2) one block per native pixel into Dragon's shared palette (`content/dragon-art.js`), after a recorded cyan key mask.

Rejected attempts:

| Prompt | Request ID | Why |
| --- | --- | --- |
| prompt-v1 (detailed leather, with the placeholder reference) | `req_3d253510d75741658d0ea70e67b4d5c8` | Fine leather texture became pink speckle in the shared crimson palette |
| prompt-v2 (chunky icon) | `req_34a4a39be9f640b48f6e433927dbb18a` | Drawn on a dark glowing backdrop that cannot be masked |
