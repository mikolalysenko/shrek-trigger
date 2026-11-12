# Cosmic Muffin offspring — frozen inactive art

Three actual generated source poses replace the native Lavos/Elder Spawn body and two mouth phases. All four owners (heads110/216, shells111/215) retain palette208, original headers, AI, animation programs and encounter choreography. The selected pixels match the accepted Cosmic Muffin shell/world design. [Native and scene review](review/index.html) shows the closed, open and headless platform states.

The body uses24 native cells and2 assembly slots; slot1 remains genuinely transparent. Its original fixed size3 field renderer always uses slot0, including when a table or AC request contains1. The packet preserves blank data without claiming a new blank animation. The head has2 ordinary four-cell phases. Six selectable owner/frames upload exactly, with64 exact native cells and1,212 head framebuffer pixels; full compound display is separately proven in original scenes.

The body is2,528 raw/2,249 compressed bytes; the head is608 raw/430 compressed. Combined raw size3,136 is32 bytes below the original pair, and compressed size2,679 saves204 bytes. Assembly remains560 bytes. The head individually grows64 bytes, so integration needs an explicit gfx176 storage/growth contract. The body remains under its original2,624-byte fixed-loader limit. No extra VRAM, OAM cells or background resources are used.

Two body cells move from the unused top-spike positions into the fuller muffin silhouette. The other22 positions and original assembly anchor are unchanged. The lowest opaque body pixel is one pixel lower than the original (Y7 versusY6), explicitly accepted after functional proof. Head bottoms remainY5. Original blank-frame XY coordinates are unchanged. See `integration-proposal.json` for final signed coordinates and already-adjusted assembly hashes; do not apply anchors twice.

Native evidence uses a pinned historical cartridge `2e2a574e…` and an in-memory overlay `7496a07c…`. Original programs passed104 owner/mode/facing cases and7,136 video ticks with no observed request/display delay. Four original encounters passed at locations96,247,264,495 after reversible diagnostic jumps and an endgame test loadout. Controller input then advances original reveal, targeting, attacks, death and return-to-field behavior. Exact closed/open compound pixels are4,050–4,074 per captured state. Location495 also proves the native push and successful three-party climb to the upper ledge, taking original returnPC684 rather than fallback699.

Natural complete mountain/Black Omen approaches, scene clones76–78, final production allocation and independent-core execution remain integration checks. Original weather/color math and moving-camera frames can change final framebuffer colors; the proofs retain these observations and separately identify exact unobscured captures. Kitchen foreground masks part of the large body, so it is not counted as a complete body framebuffer test. No active source registration, canonical ROM or gameplay file was changed.

Reproduce selected source pixels and final native bytes:

```sh
node assets/imagegen/cosmic-muffin-spawn/reproduce-draft.mjs
```

Reproduce native execution with the privately available ROMs:

```sh
node assets/imagegen/cosmic-muffin-spawn/verify-native.mjs
node assets/imagegen/cosmic-muffin-spawn/verify-motion.mjs
node assets/imagegen/cosmic-muffin-spawn/verify-scene.mjs 264
node assets/imagegen/cosmic-muffin-spawn/verify-scene.mjs 247
node assets/imagegen/cosmic-muffin-spawn/verify-scene.mjs 96
node assets/imagegen/cosmic-muffin-spawn/verify-scene.mjs 495
node assets/imagegen/cosmic-muffin-spawn/verify-platform.mjs
```

The platform verifier consumes the genuine local checkpoint written by the495 encounter verifier. Private ROMs, save states, original-game reference sheets, rejected sampling trials and historical probes are excluded from the minimal file list.
