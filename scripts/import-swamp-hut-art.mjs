// Regenerates content/swamp-hut-art.js from the selected image-generation
// source in assets/imagegen/swamp-hut. Needs the base ROM for the native
// world palette.
// usage: node scripts/import-swamp-hut-art.mjs [base.sfc]
import {readFile,writeFile} from 'node:fs/promises';
import {convertSwampHut} from '../assets/imagegen/swamp-hut/convert.mjs';

const base=new Uint8Array(await readFile(process.argv[2]??'.local/chrono-trigger-usa.sfc'));
const text=convertSwampHut(base);
await writeFile(new URL('../content/swamp-hut-art.js',import.meta.url),text);
console.log('Wrote content/swamp-hut-art.js',text.length,'bytes');
