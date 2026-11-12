import {compileSwampImpCells} from '../assets/imagegen/swamp-imps/compile-native-cells.js';
import {generatedSwampImpArt} from './generated-swamp-imp-art.js';

// The accepted cell compiler preserves hidden rider/mount pixels and native
// ordering. All header, palette, allocation and stream guards remain in the
// ordinary actor-family patcher.
export function compileSwampImpFamily(family){
 if(family.gfx!==86)throw Error('Swamp imp compiler belongs only to graphics86');
 const result=compileSwampImpCells(generatedSwampImpArt);
 return{...result,groups:result.groups.map((g,i)=>({...family.groups[i],cells:g.cells,assembly:g.assembly}))};
}
