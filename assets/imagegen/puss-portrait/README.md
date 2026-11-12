# Puss in Boots generated menu portrait draft

One new portrait generated with the built-in image_gen.imagegen tool from the frozen character sprite model. Exact prompt, original source path, reference image and source hash are retained in prompt-v1.txt and provenance-v1.json. The saved source PNG is the art input; the converter does not draw facial features or costume details.

The draft import-spec.draft.json converts the complete source silhouette into one 48×48 frame with the unchanged twelve-color cast palette. The sequence is idle / facing 1 / frame 0 under the key puss-portrait. The standard importer can reproduce it:

```sh
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/puss-portrait/import-spec.draft.json
```

review-v1.html shows the source, actual-size native preview and 6× enlargement. review-v1.json records native/palette/4bpp validation and hashes. preview-tiles.4bpp is 36 tiles, 1,152 bytes, exactly matching the current native portrait slot. Both source and native result have been visually checked. Native menu upload is pending shared portrait-loader integration.

Draft only: no import-spec.json, active registry entry or engine/portraits.js edit is included.
