// Regenerates content/onion-kart-art.js from the selected image-generation
// sources in assets/imagegen/onion-kart.
// usage: node scripts/import-onion-kart-art.mjs
import {writeFile} from 'node:fs/promises';
import {convertOnionKart} from '../assets/imagegen/onion-kart/convert.mjs';

const text=convertOnionKart();
await writeFile(new URL('../content/onion-kart-art.js',import.meta.url),text);
console.log('Wrote content/onion-kart-art.js',text.length,'bytes');
