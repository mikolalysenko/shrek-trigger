Graphics 35 is an unchanged original town-man family on published cartridge `5606e43282e04214c20d55f8c72713657bebebdaacaff0864f41ab9c3dd3aaf9`. This directory is an inactive audit and source review, not replacement art. Root approved the flexible storybook tradesman/yeoman direction after reviewing both palettes and gait contacts. Subsequent generation belongs in a separate inactive packet.

NPC 25 and 52 use `[gfx35, asm24, palette9, animation15, size0]`; NPC 39 uses palette133. These are the only graphics, assembly and animation owners, and none of those pointers has another index alias. All 31 source slots are nonblank. The reservation is four 16×16 cells, with 40 assembly bytes per frame: sixteen tile words followed by eight signed XY bytes.

| Resource | Exact file span, end exclusive | Bytes |
| --- | --- | ---: |
| Compressed graphics35, SNES `D9:C7CA` | `0x19C7CA–0x19D2BC` | 2,802 |
| Decoded graphics, all 123 tiles referenced | SHA `91fb13cbe16c72c30d6e1ac91ee3a957aa226597253879a18ab61cd230f4141d` | 3,936 |
| Assembly24 | `0x1DE8D0–0x1DEDA8` | 1,240 |
| Animation15 frame lists | `0x2451D0–0x245270` | 160 |
| Animation15 durations | `0x24B6C0–0x24B6E8` | 40 |
| Palette9 | `0x2400D8–0x2400F0` | 24 |
| Palette133 | `0x240C78–0x240C90` | 24 |

Both original-CT and pinned-active compressed graphics plus assembly total **4,042 bytes**. Candidate growth is unknown before new art. A theoretical unshared 31-frame four-cell tile bank is at most 15,904 bytes including tile zero, below the 32 KiB raw contract; this is not a measured candidate or a scene heap proof.

Palette9 has 11 current header owners and palette133 has 43, including reserved/default headers. `native-audit.json` records every header, pointer alias, twelve-color value and hash. These counts are header ownership, not claims that all those actors appear. No palette recoloring is authorized. Ending38 object15 uses event `33 06` and ending80 object40 uses `33 07`; native `C0:3711–3756` copies the existing source palette into hardware rows6/7. Those operands do not introduce source palette6/7.

The 31 roles include four idles, full directional walks, a left-facing two-phase hammer, left/right seated and standing drinking pairs, empty-handed seated profiles and three expressive gestures. All 36 nonempty facing/mode programs and their timing bytes are retained. Walks use 15 ticks per phase; hammer uses10+10; drinks15+15. Mode2 is an empty program, not a blank source pose. Empty-seat frames26/27 remain required even though no direct AA6/AB6 or AC26/27 occurred in the audited target functions.

[Both palettes at native size](review/contact-sheet-1x.png), [all labeled roles](review/role-review-4x.png), [opposed gait contacts](review/gait-contacts.png), [geometry plan](review/geometry-review.png), and [offline timing player](review/motion-review.html) are original cartridge pixels. Root reviewed the role and gait sheets before authorizing generation.

The geometry proposal preserves all 248 original XY bytes and cell order. Original opaque pixels occupy a 32×40 atlas, but the cell rectangles span X[-26,26), Y[-32,2). A 64×48 authoring canvas with origin[32,40] holds every source cell. After compilation, restore each frame's original XY bytes; the generic compiler otherwise anchors at Y48. The memory-only compile/redecode proof reproduces all 12,094 displayed indexed pixels in all31 source frames. Frame17 alone has intersecting cell rectangles; original opaque samples do not overlap. Any generated opaque overlap must agree and pass exact displayed-pixel proof. The larger authoring surface does not increase the four-cell reservation.

The current event scan attempted all512 location records: 504 decoded, with 25 locations and29 source-load objects using the family. Eight records labelled corrupt/empty by the local catalogue fail decompression identically in original and current ROMs; their exact IDs, pointers and errors are retained rather than silently ignored. All25 target packets pass function-boundary checks. `scene-contexts.json` records each object's source offsets, functions, commands, co-loaded palette owners and scene purpose. Static source-load ownership is not execution, visibility or connected-route proof.

Important shared uses include the required transport demonstration8, workshop/family scenes4/9, royal tutor23, bridge attendants32, mayor50, smith115, carpenters62/65/186/188, inn patrons116/138, soda host439, fortress doppelganger125, ending doubles80/81/90, conditional endings38/398 and credit room338. In125 the disguise hides before other enemy owners fight. In90 three independent copies act simultaneously. Preserve all their original staging.

The styling proposal is a sturdy human commoner: russet hair/moustache, cloth headband, green waistcoat/rolled linen sleeves, blue trousers and boots. Keep hands free except the original prop poses. A permanent baker hat, blacksmith apron or hammer would conflict with the other roles. No new named or celebrity cameo is proposed.

`dialogue-context.json` decodes current text and `scene-contexts.json.dialogueFollowup` records exact location/object/string IDs for the later dialogue pass. Exhibit8 already calls NPC39 **BAKER** (including strings79–84,94,98–99,106,108–109,111,114); workshop4 still calls him **TABAN** (7–12,30), family room9 uses TABAN/LARA (5/6), and Moonlight Parade80/81 retains TABAN (60/61/139). These inconsistencies remain unchanged. The same sprite also portrays Tata's father and a developer-room credit.

Reproduce from the repository root, using the hash-checked private baseline or the same published cartridge:

```sh
node assets/raster/town-npc35-audit/audit-native.mjs
python3 assets/raster/town-npc35-audit/decode-events.py
node assets/raster/town-npc35-audit/build-proposal.mjs
node assets/raster/town-npc35-audit/build-review.mjs
node assets/raster/town-npc35-audit/manifest.mjs
```

The private ROM and packet dumps are excluded from the audit manifest. No source art, engine, registry, dialogue or canonical build was modified. No native scheduler or campaign execution is claimed at this audit stage.
