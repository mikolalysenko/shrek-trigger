import {supportingCast} from './supporting-cast.js';
import {mrWorldwide} from './mr-worldwide.js';
import {carnivalCast,carnivalFields,hatchetProps} from './carnival.js';
import {cast} from './cast.js';
import {playerFrameCounts} from './player-frames.js';
import {courtBeasts} from './court-beasts.js';
import {dulocTank} from './duloc-tank.js';
import {workshopPuppet} from './workshop-puppets.js';
import {futureMachines,supplyKeeper} from './future-machines.js';
import {futureWildlife} from './future-wildlife.js';
import {nativeGuards} from './native-guards.js';
import {courtPalaceActors} from './court-palace.js';
import {swampImps} from './swamp-imps.js';
import {townsfolk} from './townsfolk.js';
import {storybookActors} from './storybook-actors.js';
import {medinaActors} from './medina-actors.js';
import {swampCreatures} from './swamp-creatures.js';
import {bridgeActors} from './bridge-actors.js';
import {enforcerActors} from './enforcer-actors.js';
import {ghostActors} from './ghost-actors.js';
import {guyFieriActors} from './guy-fieri.js';
import {bakeryActors} from './bakery-actors.js';
import {bakeryVillagers} from './bakery-villagers.js';
import {skyDrakes} from './sky-drakes.js';
import {faygoActors} from './faygo.js';
import {caretaker,onionJar} from './caretaker.js';
import {donkeyFamily} from './donkey-family.js';
import {finaleCompanions} from './finale.js';
import {cosmicMuffinActors,cosmicMuffinSpawnActors} from './cosmic-muffin.js';
import {endgameActors} from './endgame-actors.js';
import {cosmicInteriorActors} from './cosmic-interior.js';
import {tysonReveal} from './tyson-reveal.js';
export const previewActors=[
  caretaker,onionJar,...donkeyFamily,
  ...supportingCast.map(a=>({...a,npc:a.npcs[0]})),
  ...carnivalCast,...carnivalFields,...hatchetProps,
  ...courtBeasts,
  ...dulocTank,
  ...futureMachines,
  ...futureWildlife,
  ...nativeGuards,...courtPalaceActors,...swampImps,...townsfolk,...storybookActors,
  ...medinaActors,
  ...swampCreatures,
  ...bridgeActors,
  ...enforcerActors,
  ...ghostActors,
  ...guyFieriActors,
  ...bakeryActors,
  ...bakeryVillagers,
  ...skyDrakes,
  ...faygoActors,
  ...finaleCompanions,
  ...cosmicMuffinActors,
  ...endgameActors,
  ...cosmicInteriorActors,
  tysonReveal,
  ...cosmicMuffinSpawnActors.filter(a=>a.gfx===176),
  {...supplyKeeper,name:'Supply Keeper · moving mechanisms'},
  workshopPuppet,
  // The source enemy program omits four valid assembly slots. The preview
  // borrows immutable frame-index bytes only; his cartridge program stays166.
  {key:'tyson',name:'Mike Tyson',enemy:206,gfx:214,asm:208,palette:233,frames:45,size:2,width:48,height:64,previewAnimation:0},
  {key:mrWorldwide.key,name:'Mr. Worldwide · optional superboss',enemy:mrWorldwide.enemy,gfx:mrWorldwide.gfx,asm:mrWorldwide.asm,palette:mrWorldwide.palette,frames:mrWorldwide.frames,size:mrWorldwide.size,width:mrWorldwide.width,height:mrWorldwide.height,animation:mrWorldwide.animation},
  ...cast.map(c=>({key:'party-'+c.key,name:c.name+' · party frames',pc:c.id,frames:playerFrameCounts[c.id]}))
];
