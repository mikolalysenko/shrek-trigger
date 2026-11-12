# Air, Fire, Water and Dirt

The revised names retain Chrono Trigger's original four damage flags, resistance
rules, equipment effects, technique costs and progression.

| Name | Original element | Damage bit | Innate party members |
| --- | --- | --- | --- |
| Air | Lightning | `$80` | Shrek |
| Dirt | Shadow | `$40` | Lord Farquaad |
| Water | Water | `$20` | Fiona, Puss |
| Fire | Fire | `$10` | Donkey |

Pinocchio and Mongo keep their original non-elemental status. Farquaad's stolen
Air, Fire and Water spells retain their own original elements; his innate badge
and Dirt spells use Shadow's bit. Eye Lasers remains Air despite its warm beam
colors. Swamp Belch is the revised Luminaire name; its native translucent gas
cloud is integrated and retains the original Air damage and 20 MP cost.

`engine/elements.js` replaces the Lightning and Shadow status badges in their
original 48×16, twelve-tile allocations at file offsets `$3FD5E4` and `$3FD764`.
Their two original palette rows are rewritten in place. Water, Fire and all
native menu loading code remain unchanged. The replacement takes no additional
ROM allocation, WRAM or VRAM.

Eight guarded item/tech descriptions use the new names. Pointer and suffix-alias
checks reject a slot shared by another live description. Magic lessons, the
tank manual, the furnace vulnerability and Cleveland's book hint use the same terms.
The supplied “Miracles” excerpt is kept centrally in `content/miracles.js`.
All verbal field strings now have authored adaptations; connected campaign
playthroughs remain separate acceptance work.

`tests/elements.test.mjs` checks unchanged damage data and Water/Fire assets,
description bytes and the supplied excerpt's window lengths. It opens Shrek's
and Farquaad's actual status menus using controller input, then compares the
uploaded tiles and CGRAM palettes. Review captures are
`.local/qa/element-menu-air.png` and `.local/qa/element-menu-dirt.png`.
