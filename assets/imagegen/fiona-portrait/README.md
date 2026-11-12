# Fiona reused-source portrait draft

This inactive 48×48 portrait uses an exact RGBA crop from an already approved, full-resolution generated field atlas. It is not new portrait generation and does not enlarge the 32×32 native field tiles. New portrait generation returned no image; that original request and error remain in prompt-v1.txt and provenance-v1.json.

The selected source crop, original source path, exact rectangle, SHA-256 hashes, and palette sampling are recorded in provenance-crop-v1.json. Every native opaque pixel is sampled from that crop. No anatomy, expression, clothing, or alpha pixels were drawn.

The lead and root approved the tight frontal crop with area sampling; crown, both ears, broad face and gown neckline remain clear. The rear braid is not visible in this source pose.

Reproduce the inactive preview with:

```sh
node scripts/import-raster-art.mjs --preview-spec assets/imagegen/fiona-portrait/import-spec.draft.json
```

review-v1.png and review-v1.html compare the previous portrait and chosen draft at 1× and 6×. sampling-comparison.png retains all crop and sampler alternatives. review-v1.json records exact source-crop RGBA validation, unchanged cast palette, and a complete 4bpp encode/decode round-trip. preview-tiles.4bpp is 36 tiles, 1,152 bytes: zero growth over the existing portrait slot.

Draft only. No active import-spec.json, generated registry, palette, or engine file was changed. Root handles activation and native menu upload checks.
