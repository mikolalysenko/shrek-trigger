# Shrek native portrait

The active 48×48 portrait samples the smirking Shrek icon from DanSoup’s Shrek SuperSlam sheet, [asset72575](https://www.spriters-resource.com/gamecube/shreksuperslam/asset/72575/). The full source and exact 64×64 crop are preserved with hashes in `provenance.json`. Area sampling and a material reference palette map the source into Shrek’s unchanged twelve-color hardware palette; no facial features were painted into the result.

Reproduce it with `node scripts/import-raster-art.mjs`. The result occupies the original 36-tile/1,152-byte menu slot. Native menu controls and both Snes9x/bsnes verify the displayed portrait on cartridge `0b946326f923cdd2af5066c5ffa12005423859d5e709432b6f4fc3538093f6a5`.
