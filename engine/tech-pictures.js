// Full-screen picture techniques: each borrows Luminaire's scene record (as
// Swamp Belch does) and shows its own generated picture on BG3, revealed
// through a window in the picture's outline that grows, holds and lifts away.
// Damage, element, targets, MP and status stay those of the technique's own
// records. `grow` is pixels of radius per frame (1 or 2); `hold` is frames.
// `enter:'drop'` brings the picture down from the top of the screen instead.
import {callMyWifeRaster} from './call-my-wife-raster.js';
import {compensateRaster} from './tech-pictures/compensate.js';
import {someMayDieRaster} from './tech-pictures/some-may-die.js';
import {magnetsRaster} from './tech-pictures/magnets.js';
import {birdPopRaster} from './tech-pictures/bird-pop-giant.js';
import {areWeThereYetRaster} from './tech-pictures/are-we-there-yet.js';
import {torchMobRaster} from './tech-pictures/torch-mob.js';
import {dungeonRaster} from './tech-pictures/dungeon.js';
import {royalDecreeRaster} from './tech-pictures/royal-decree.js';

export const techPictures=[
 // Donkey calls his wife: Dragon fills the sky.
 {tech:24,name:'Call My Wife',raster:callMyWifeRaster,grow:2,hold:90},
 // "Do you think he's compensating for something?" A very tall tower rises, slowly.
 {tech:52,name:'Compensate',raster:compensateRaster,grow:1,hold:60},
 // Farquaad looms, smug, while it costs everyone else.
 {tech:56,name:'Some May Die',raster:someMayDieRaster,grow:2,hold:90},
 // Nobody knows how they work.
 {tech:32,name:'Magnets!',raster:magnetsRaster,grow:2,hold:70,enter:'drop'},
 // The bluebird, at the top of the aria.
 {tech:14,name:'Bird Pop',raster:birdPopRaster,grow:1,hold:30},
 // Donkey, much too close, for much too long.
 {tech:18,name:'Are We There Yet?',raster:areWeThereYetRaster,grow:2,hold:150},
 // A loyal mob with torches and pitchforks, on command.
 {tech:51,name:'Torch Mob',raster:torchMobRaster,grow:2,hold:80},
 // Off to the dungeon with them: the cage drops fast.
 {tech:55,name:'Dungeon',raster:dungeonRaster,grow:2,hold:50},
 // By order of Lord Farquaad: the proclamation unrolls at its own pace.
 {tech:49,name:'Royal Decree',raster:royalDecreeRaster,grow:1,hold:50}
];
