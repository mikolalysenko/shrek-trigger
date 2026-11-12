// Browser-compatible inactive compiler; no allocations, registrations or ROM writes.
import {compileSpriteFrames} from '../../../engine/native-sprites.js';
import {compress} from '../../../engine/compression.js';
export const jugglerNativeCellOrigins=[[[0,-55],[-15,-55],[0,-39],[-15,-39]],[[0,-56],[-15,-56],[0,-40],[-15,-40]],[[0,-58],[-15,-58],[0,-42],[-15,-42]],[[0,-56],[-15,-56],[0,-40],[-15,-40]],[[0,-54],[-15,-54],[0,-38],[-15,-38]],[[0,-56],[-15,-56],[0,-40],[-15,-40]],[[0,-56],[-15,-56],[0,-40],[-15,-40]],[[0,-56],[-15,-56],[0,-40],[-15,-40]],[[0,-30],[-15,-30],[0,-14],[-15,-14]]];
export const jugglerPalette={"id":40,"colors":["292910","ffffff","ffdede","ffc6bd","e7ce4a","de5a63","73948c","c68c10","9c2129","6b5200","185a52","393929"],"words":[2213,32767,28543,24351,10044,12667,17998,2616,5267,333,10595,5351]};
export function compileFortressJugglers(art,geometry){
 if(art.width!==64||art.height!==80||art.frames?.length!==9||JSON.stringify(art.palette)!==JSON.stringify(jugglerPalette.colors))throw Error('Juggler source/palette contract changed');
 if(geometry.size!==0||geometry.cells!==4||geometry.nativeFrames!==9||JSON.stringify(geometry.fullSizeFlags)!=='[224,192]'||JSON.stringify(geometry.anchor)!=='[0,16]'||JSON.stringify(geometry.cellOverlapFrames)!=='[0,1,2,3,4,5,6,7,8]'||geometry.frameOffsets?.some(p=>p.some(Boolean)))throw Error('Juggler cell contract changed');
 const origins=jugglerNativeCellOrigins.map(a=>a.map(([x,y])=>[x+32,y+64]));
 if(JSON.stringify(geometry.frames.map(f=>f.cellOrigins))!==JSON.stringify(origins))throw Error('Juggler original cell geometry changed');
 if(art.frames[1]!==art.frames[3])throw Error('Juggler exact native duplicate changed');
 const frames=art.frames.map(s=>{if(typeof s!=='string'||s.length!==5120||!/^[0-9abc]+$/.test(s))throw Error('Invalid Juggler raster');return Uint8Array.from(s,c=>parseInt(c,16));});
 const compiled=compileSpriteFrames(frames,{width:64,height:80,size:224,frameCellOrigins:origins,cellOverlapFrames:geometry.cellOverlapFrames});
 for(let f=0;f<9;f++)for(let c=0;c<4;c++)compiled.assembly[f*40+32+c*2+1]=(compiled.assembly[f*40+32+c*2+1]+16)&255;
 const compressed=compress(compiled.graphics);
 if(compiled.graphics.length!==4000||compressed.length!==3535||compiled.assembly.length!==360)throw Error('Juggler candidate resource costs changed');
 return{...compiled,compressed};
}
