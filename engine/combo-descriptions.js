import {techHelp} from '../content/tech-help.js';

export const comboPresentation=[
 [63,'Fart Rocket','Fart Rocket','Gas-powered puppet!'],[64,'Mega Fart','Mega Fart','The big one!'],
 [66,'Crop Duster','CropDuster','Crop dusted!'],[69,'Gas Drill','Gas Drill','Gas drill!'],
 [71,'Swamp Airlift','OgreAirlift','Airlift!'],[81,'Purrfect Heist','Purr Heist','Purr-loin!'],
 [90,'String Fencing','StringFence','String duel!'],[93,"Cat's Cradle",'Cat Cradle','Cat cradle!'],
 [94,'Cookie Lathe','CookieLathe','Cookie lathe!'],[95,'Cookie Catapult','Cookiepult','Cookie arc!'],
 [98,'Boots & Buttons','Boot&Button','Boot stomp!'],[105,'Royal Crumb Stomp','Royal Crumb','Crumb stomp!'],
 [108,'Ogre Bakery Brawl','BakeryBrawl','Bakery brawl!'],[109,'Pointy Trio','Pointy Trio','Pointy!'],
 [110,'Fart Tornado','FartTornado','Fart tornado!'],[111,'Silent But Deadly','S.B.D.','Silent. Deadly.'],
 [114,'Three-Ring Circus','3RingCircus','Three-ring circus!'],[115,'Swamp Hoedown','SwampDance','Swamp hoedown!']
].map(([id,name,short])=>({id,name,short,help:techHelp[id]}));

// Names and menu labels only. The help lines come from content/tech-help.js
// and are written with every other technique's by engine/tech-help.js.
export function patchComboDescriptions(){
 return{count:comboPresentation.length,extraVramBytes:0,extraWramBytes:0};
}
