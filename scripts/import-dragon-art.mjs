// Regenerates content/dragon-art.js from the selected image-generation sources
// in assets/imagegen/dragon. Needs the base ROM for the native tile layout.
// usage: node scripts/import-dragon-art.mjs [base.sfc]
import {readFile,writeFile} from 'node:fs/promises';
import {convertDragonArt} from '../assets/imagegen/dragon/convert.mjs';

const basePath=process.argv[2]??'.local/chrono-trigger-usa.sfc';
const base=new Uint8Array(await readFile(basePath));
const text=convertDragonArt(base);
await writeFile(new URL('../content/dragon-art.js',import.meta.url),text);
console.log('Wrote content/dragon-art.js',text.length,'bytes');
