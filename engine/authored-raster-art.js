import {completeShrekArt} from '../assets/raster/shrek/acting-complete/art.mjs';

// Authored indexed art lives beside the imported registry so every cartridge
// consumer and review tool sees the same pixels and provenance. Shrek's
// acting set is built from the user's supplied game sheets. The former
// hand-drawn props (Carnival Hatchet, Faygo, Dragon fragments, sky drake)
// are now generated sources under assets/imagegen/ and import normally.
export const authoredRasterArt={shrek:completeShrekArt};
