# Dragon's native vehicle formats

All offsets are headerless USA file offsets. The generated art uses twelve opaque 15-bit colors and transparency; all changes are emitted as cartridge bytes.

| Presentation | Native storage |
| --- | --- |
| World boarding, landing, four directions, early time travel | 4 KiB packet at pointer `$06FDF3`; animation IDs 24–30 and 45 |
| World colors | Dedicated OBJ palette 7; map palette packets 4–10 and fixed row `$06F620` |
| Large folded and unfolded Dragon | Location graphics banks 116/117, tilesets 39/26 |
| Harness seats, small flying actor, fragments | NPC operands 169/174/144, exclusive palette 219 |
| First-person saddle | Mode 7 resource `$24`, 6 KiB 4bpp; original BG/OBJ composition |
| Approach model and banking | Resources `$26` and `$27`, linear projection and 4bpp respectively |
| Ending model | Resource `$46`, 19 KiB linear indices; raw palette resource `$35` |
| Approach dive colors | Raw palette resource `$23`, loaded into OBJ row 4 when the approach dives |
| Visible dive escape | One appended actor in location 474's native event, called only by the crash arrival |

The world loader overwrites CGRAM row 15 from `$06F620` after loading its map palette. Both sources must agree. Vehicle-only palette instructions select that row so year signs and unrelated objects keep their colors.

The large art keeps the original mirrored cell placements, rider coordinates and map collision. Alternate field maps use separate wing attachment tiles from unreferenced slots in the same banks. Tile 1016 is also used as a flat time-tunnel mask: that mask is moved to an unused flat tile before the saddle artwork changes. Palette colors 13–15 remain intact for the mask and shared effects.

PC/NPC descriptors order their five bytes as graphics, assembly, palette, animation and size. They do not order animation before palette. The seat actor needs two 80-byte assembly frames; the other two vehicle actors use 40-byte frames. Palette 219 is checked for exclusive ownership before reuse. `assets/raster/dragon-fragments/art.mjs` supplies NPC144's three tumbling harness fragments with dark leather outlines and bright buckles; no procedural fragment slots remain.

World flight faces the direction of travel: the native **back** selector (flying north) uses the head-up rear art, and the native **front** selector (flying south) uses the head-down art. A November 1 change had made both selectors head-down, so Dragon flew north tail-first; a controller capture of north flight confirmed it, and the November 8 fix restores the rear art. Mode 7 views follow the original Epoch table in resource `$46`: heading 0 faces the camera (head-down art), heading π flies away (rear art, head up), and the Epoch's nose points left at every angle, so the ending's side views lead with the head on the left. The November 1 change had made the ending's away-from-camera views show her face. Side views remain head-leading horizontally. `tests/dragon-art.test.mjs` guards both selectors and the angle-zero/angle-π views.

The projection streams have 64-byte rows, with only the left 32 pixels populated. Resource `$46` has one 32×32 image followed by seventeen 32×16 views. Resource `$35` is a raw 32-byte palette, not compressed data. The first-person scene uses interlaced output; a single newly allocated screenshot buffer contains only one field. The browser preserves both fields, and the independent host captures native interlaced output.

The escape event adds a 32-byte function-pointer row and relocates all original function pointers. Existing object IDs and relative branches remain unchanged. The arrival calls the added actor, shows Dragon for forty frames, flies her beyond the scene edge, and resumes the original party-recovery function. The broken-harness progression flag remains set.

Tests cover native boarding/landing, early time travel, palette isolation, tunnel masks, projection bounds, event relocation and the escape handoff. Full acquisition, upgrade and alternate-ending progression remains on the production checklist.
