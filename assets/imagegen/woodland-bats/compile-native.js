// Browser-compatible inactive compiler; no allocation, registration or ROM writes.
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {compress} from '../../../engine/compression.js';
export const batNativeCellOrigins=[[[-8,-56],[-24,-56],[-8,-40],[8,-56]],[[-8,-59],[-24,-59],[-8,-43],[8,-59]],[[-8,-58],[-24,-50],[-8,-42],[8,-50]],[[5,-62],[-11,-62],[5,-46],[-11,-46]],[[-16,-64],[-1,-64],[-16,-48],[-1,-48]],[[-14,-41],[-9,-47],[7,-31],[-9,-31]],[[-14,-42],[-9,-47],[7,-31],[-9,-31]],[[-16,-64],[-1,-64],[-16,-48],[-1,-48]]];
export const batPalettes=[{"id":78,"colors":["212118","ffffff","d6d6c6","a5a58c","7b7b5a","636342","6b3900","424221","422100","291800","181800","313131"],"words":[3204,32767,25434,18068,11759,8588,237,4360,136,101,99,6342]},{"id":79,"colors":["212118","ffffff","ffd6a5","e7ad84","c68473","8c5a5a","42394a","4a2142","312939","292131","181800","313131"],"words":[3204,32767,21343,17084,14872,11633,9448,8329,7334,6277,99,6342]}];
export function compileWoodlandBats(art,geometry){
 if(art.width!==64||art.height!==80||art.frames?.length!==8||JSON.stringify(art.palette)!==JSON.stringify(batPalettes[0].colors))throw Error('Bat source/palette contract changed');
 if(geometry.size!==0||geometry.cells!==4||geometry.nativeFrames!==8||JSON.stringify(geometry.fullSizeFlags)!=='[192,224]'||JSON.stringify(geometry.anchor)!=='[0,16]'||JSON.stringify(geometry.cellOverlapFrames)!=='[4,5,6,7]'||geometry.frameOffsets?.some(p=>p.some(Boolean)))throw Error('Bat native cell contract changed');
 const origins=batNativeCellOrigins.map(a=>a.map(([x,y])=>[x+32,y+64]));
 if(JSON.stringify(geometry.frames.map(f=>f.cellOrigins))!==JSON.stringify(origins))throw Error('Bat original cell geometry changed');
 const frames=art.frames.map(s=>{if(typeof s!=='string'||s.length!==5120||!/^[0-9abc]+$/.test(s))throw Error('Invalid Bat raster');return Uint8Array.from(s,c=>parseInt(c,16));});
 const compiled=compileSpriteFrames(frames,{width:64,height:80,size:192,frameCellOrigins:origins,cellOverlapFrames:geometry.cellOverlapFrames});
 for(let f=0;f<8;f++)for(let c=0;c<4;c++)compiled.assembly[f*40+32+c*2+1]=(compiled.assembly[f*40+32+c*2+1]+16)&255;
 const compressed=compress(compiled.graphics);
 if(compiled.graphics.length!==3008||compressed.length!==2225||compiled.assembly.length!==320)throw Error('Bat candidate resource costs changed');
 return{...compiled,compressed};
}
