// Real controller input for a clean new game. No fabricated RAM or save file.
export const newGameSequence = [
  [400,0],[12,8],[360,0],[12,256],[360,0],[12,8],[360,0],
  [12,8],[3360,0],...Array.from({length:16},()=>[[8,256],[240,0]]).flat()
];
export function runFrames(snes,frames,input=0) {
  snes.joypad1State=input;
  for(let i=0;i<frames;i++)snes.runFrame();
  snes.joypad1State=0;
}
export function openingReady(snes) {
  return (snes.ram[0x100]|snes.ram[0x101]<<8)===2&&snes.ram[0x126]===0&&snes.ram[0x11f]===1;
}
// Added speaking pages must finish before a diagnostic jump can reuse the
// opening. Observe the native message/input flags; never clear them in RAM.
export async function finishOpening(snes,yieldFrame=async()=>{}) {
  for(let i=0;i<80&&!openingReady(snes);i++) {
    if((snes.ram[0x100]|snes.ram[0x101]<<8)!==2)throw Error('Opening checkpoint is not in the bedroom.');
    runFrames(snes,3,snes.ram[0x126]?256:0);runFrames(snes,117);
    await yieldFrame(snes.frames);
  }
  if(!openingReady(snes))throw Error('Opening dialogue did not return control to Shrek.');
}
export async function newGame(snes,yieldFrame=async()=>{}) {
  for(const [frames,input] of newGameSequence) {
    for(let n=0;n<frames;n+=120) {
      runFrames(snes,Math.min(120,frames-n),input);
      await yieldFrame(snes.frames);
    }
  }
  if((snes.ram[0x100]|snes.ram[0x101]<<8)!==2)throw Error('New-game automation did not reach the bedroom. Reset and use normal controls.');
  await finishOpening(snes,yieldFrame);
}
