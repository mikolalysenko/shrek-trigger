# Remaining character art audit — published 5018f48b599c

This is a read-only inventory of ROM `5018f48b599c67f33131c3d05350115484625450d2e8b44e5389f27144e21770`, compared with the original USA ROM and the accepted character/boss manifests. No artwork was generated, activated or changed. The Swamp Imp packet remains frozen.

The next approved compact family is **gfx81 / asm36, shared Kilwala NPC77 and enemy3**: 15 nonblank four-cell poses, one exact palette19 and native animation28. It has no graphics, assembly or palette aliases or unrelated owners. **Guy Fieri enemy225 still shares AA28 after relocation to gfx252**, so its frame and duration tables must remain unchanged.

Root approved this source direction after reviewing the original 15-slot sheet: a small cream-furred woodland sprite with a shaggy crown, dark russet ear tips/paws, warm muzzle and olive lower fringe. Preserve its broad arm-spread front/rear dance, narrow profiles, low recoil and alternating rocking poses. This follows the existing generic fairy-tale creature brief; no new celebrity or named major counterpart is assigned. Actual image generation is authorized in a separate inactive packet, with static review before freeze. The original CT atlas is in `review/kilwala-original-1x.png` and `kilwala-original-4x.png`, with five columns in native order 0–14. These are audit references, not replacement art.

Current/original cost is **3,104 decoded bytes, 1,735 compressed bytes and 600 assembly bytes**; total compressed plus assembly is 2,335. The source remains legacy-loaded. All ten verified load locations have conservative actor unions below 32 KiB; the largest is 23,520 bytes. A generated bank exceeding its original 3,104-byte ceiling would require explicit guarded streaming, even if a particular room has spare heap. No growth is authorized by this audit.

Normal uses include the Snail Stop dance53, forest119, Denadoro vista148, Bekkler minigame434 and enemy3 encounters in Mystic Mountain274 and Forest Maze282. Four ending rooms also load the field actor. Every selected load matches its current event offset. These are authored-use records, not new live encounter proofs. `kilwala-native-audit.json` contains complete owners/aliases, palettes, all signed cell origins, frame/list hashes, AI, co-loaded banks and scene offsets; `kilwala-role-audit.json` explains all 15 poses and timings.

The larger visible gaps rank as follows. Counts mean verified authored-load locations, not guaranteed simultaneous visibility.

| Priority | Remaining original family | Why it matters / scope |
| --- | --- | --- |
| 1 | Town NPCs gfx11,35,125 | 25,25,23 locations across fair, shops, inns, courts and story rooms. Gfx11’s assembly7 serves 25 NPC headers across 13 banks; gfx35 includes the family/mentor artisan role. |
| 2 | Hench83, serpents87, gargoyles111 | 13,15,11 locations through cathedral rescue, Medina, fortress and later areas. Respectively 37, 63 across three assemblies, and 41 native slots. |
| 3 | Troops109; lancers94; juggler91 | Blackbird, Ocean Palace and fortress gaps. Troops alone use 49 slots across two assemblies and 15 locations. Assigned Hexer90/sergeant158 are excluded. |
| 4 | First Bakery/woodland fauna80,88,85,101,107,81 | Several recognizable CT creatures remain. Kilwala81 is recommended next because it closes a complete field/combat family with only 15 slots and isolated graphics/assembly/palette ownership. |
| 5 | Gato/Cybot123, Atropos192, Mutants184/185, Giga Gaia205–207 | Conspicuous practice-machine, optional-story and later-boss gaps. Atropos needs a cast decision; compound bosses need their background/attachment audit before generation. |

`review/remaining-character-overview.png` shows representative **original** pixels for 20 of these banks. `proposal.json` carries individual owner/resource records and the detailed next-family proposal.

The inventory identifies 82 banks with accepted or declared raster coverage, 155 unchanged original banks, seven confirmed earlier procedural banks and nine excluded/assigned banks. **155 is not a missing-character count**: it includes tiny effects, props, blank/decorative owners and unused resources. Forty-three unchanged banks have enemy owners, also including compound/effect records. Exact accepted-bank hash mismatches are limited to gfx78/82/98, which correctly remain root’s pending guard/Sludge/frog batch.

Confirmed earlier procedural resources include the hatchet props72/73/121, Faygo bottle229 and Dragon’s fragments/seats/small vehicle actors151/202/212. Dragon’s broader world, boarding and Mode7 rendering also uses procedural code and needs a coordinated vehicle source plan. That is distinct from the excluded, previously rejected Sky Drake42 generation. Shrek and Pinocchio generation are excluded too.

The complete header-bank comparison is in `inventory.json`. Scene discovery verifies original parsed load sites against current packet bytes;11 offsets in rewritten End of Time464 and Lavos Tunnel474 remain unresolved, and dynamic selectors/backgrounds are outside this scan. Party-derived Puss/Shrek story actors, Steve’s alias and Granny are recognized as raster reuse, not falsely listed as new gaps. There is no scene-execution or per-pose acceptance claim for unselected families.
