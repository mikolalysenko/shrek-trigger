import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {validateRom} from '../engine/rom.js';
const path=process.argv[2];
if(!path)throw Error('Usage: npm run rom:import -- /path/to/Chrono Trigger (USA).sfc (or .zip)');
let bytes;
if(path.toLowerCase().endsWith('.zip')) {
  const names=execFileSync('unzip',['-Z1',path],{encoding:'utf8'}).split('\n').filter(x=>/\.(sfc|smc)$/i.test(x));
  if(names.length!==1)throw Error('ZIP must contain exactly one .sfc or .smc');
  bytes=execFileSync('unzip',['-p',path,names[0]],{maxBuffer:8*1024*1024});
} else bytes=await readFile(path);
const rom=await validateRom(bytes);
await mkdir(new URL('../.local/',import.meta.url),{recursive:true});
await writeFile(new URL('../.local/chrono-trigger-usa.sfc',import.meta.url),rom);
console.log('Verified US ROM imported locally. Run npm run build, then npm start.');
