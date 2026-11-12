// Browser-compatible compiler for the inactive, source-composed 15-slot draft.
// It performs no registration, allocation, ROM writes or palette replacement.
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {compress} from '../../../engine/compression.js';
import {snesColor} from '../../../engine/sprites.js';
import {put16} from '../../../engine/rom.js';
export const woodlandPalette19=['292910','ffffff','e7ded6','ffcead','ffa56b','c6bda5','adad52','b56342','8c7308','6b5a39','7b3942','393929'];
export function compileWoodlandSprite(art,geometry){
 if(art.width!==64||art.height!==64||art.frames?.length!==15||JSON.stringify(art.palette)!==JSON.stringify(woodlandPalette19))throw Error('Woodland native source/palette contract changed');
 if(geometry.nativeFrames!==15||geometry.size!==0||geometry.cells!==4||JSON.stringify(geometry.cellOverlapFrames)!=='[1,4]'||geometry.frames?.length!==15||geometry.frameOffsets?.some(p=>p.some(Boolean)))throw Error('Woodland native geometry contract changed');
 const frames=art.frames.map(s=>{if(typeof s!=='string'||s.length!==4096||!/^[0-9abc]+$/.test(s))throw Error('Invalid woodland native raster');return Uint8Array.from(s,c=>parseInt(c,16));});
 const compiled=compileSpriteFrames(frames,{width:64,height:64,size:0,frameCellOrigins:geometry.frames.map(f=>f.cellOrigins),cellOverlapFrames:geometry.cellOverlapFrames}),compressed=compress(compiled.graphics),palette=new Uint8Array(24);woodlandPalette19.forEach((c,i)=>put16(palette,i*2,snesColor(c)));
 if(compiled.graphics.length!==4416||compiled.assembly.length!==600||compressed.length!==3134)throw Error('Frozen woodland byte costs changed');
 return{...compiled,compressed,palette};
}
