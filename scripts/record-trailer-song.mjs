// Teaser trailer soundtrack: the game's own All Star Trigger arrangement (song
// 0x18) recorded clean from the emulator, by swapping the song a quiet room asks for.
import {readFile} from 'node:fs/promises';
import {build,bedroom} from '../tests/helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {record} from './trailer-lib.mjs';
const song=+(process.argv[2]??0x18),b=await build(),specs=JSON.parse(await readFile('content/hooks.json'));
specs.push({name:'sound.command',address:0xc70004,expected:Array.from(b.rom.slice(0x70004,0x70008)),description:'Sound driver entry'});
const s=await bedroom(b.rom),h=installHooks(s,specs),d=createDevTools(s,h);
let swaps=0;h.on('sound.command',()=>{if((s.ram[0x1e00]&0xfe)===0x10){s.ram[0x1e01]=song;swaps++;}});
d.jump({id:2,x:8,y:8});
await record(s,'.local/trailer/song',60*60);
console.log('song commands swapped',swaps);d.dispose();h.dispose();
