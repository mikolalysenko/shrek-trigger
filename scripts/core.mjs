import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
export async function createCore(rom) {
  const context = vm.createContext({console, Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array, Float32Array, Float64Array, Uint8ClampedArray, clearArray:a=>a.fill(0), log:()=>{}, getByteRep:v=>v.toString(16), getWordRep:v=>v.toString(16), getLongRep:v=>v.toString(16)});
  for (const name of ['cpu','pipu','dsp','spc','apu','cart','snes']) vm.runInContext(await readFile(new URL(`../vendor/snes/${name}.js`,import.meta.url),'utf8'), context);
  const snes = new context.Snes();
  if(!snes.loadRom(rom,true)) throw Error('Core rejected ROM');
  snes.reset(true); return snes;
}
