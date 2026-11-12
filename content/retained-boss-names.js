import {futureWildlife,stockWildlifeFamilyKeys,wildlifeFamilies} from './future-wildlife.js';
import {medinaActors,stockMedinaFamilyKeys,medinaFamilies} from './medina-actors.js';
import {bridgeActors,stockBridgeFamilyKeys,bridgeFamilies} from './bridge-actors.js';
import {bakeryActors,stockBakeryFamilyKeys,bakeryFamilies} from './bakery-actors.js';
import {supplyKeeper,stockMachineGraphics} from './future-machines.js';

// Route bosses whose custom sprites were retired. Their graphics, assemblies,
// palettes and headers are stock Chrono Trigger, but dialogue, world labels
// and scenes still call them by these names, so only the battle names stay.
const keys=new Set(['sir-sludge','bog-baron','crag-keeper','crag-echo','bone-warden-legs','warden-echo-legs','bone-warden','warden-echo','kilnback','iron-kiln','supply-keeper']);
const stock=[
  ...futureWildlife.filter(a=>stockWildlifeFamilyKeys.has(wildlifeFamilies.find(f=>f.gfx===a.gfx).key)),
  ...medinaActors.filter(a=>stockMedinaFamilyKeys.has(medinaFamilies.find(f=>f.gfx===a.gfx).key)),
  ...bridgeActors.filter(a=>stockBridgeFamilyKeys.has(bridgeFamilies.find(f=>f.gfx===a.gfx).key)),
  ...bakeryActors.filter(a=>stockBakeryFamilyKeys.has(bakeryFamilies.find(f=>f.gfx===a.gfx).key)),
  ...(stockMachineGraphics.has(supplyKeeper.gfx)?[supplyKeeper]:[]),
];
export const retainedBossNames=stock.filter(a=>keys.has(a.key)).map(({key,name,short,enemy})=>({key,name,short,enemy}));
if(retainedBossNames.length!==keys.size)throw Error('Retained boss name has no stock-restored actor');

// Stock-art story enemies whose source names contradict the adapted plot:
// Godmother is the Queen of Ohio, the Muffin replaces Lavos, Farquaad takes
// Magus's role, Ohio's Mammon Machine is the Wish Engine and the fortress
// decoy imitates the Moth Witch. Art, AI and stats stay stock.
export const storyBattleNames=[
  {enemy:0x0a,source:'Mammon M.',short:'Wish Engine'},
  {enemy:0x25,source:'Zeal',short:'Godmother'},
  {enemy:0xcd,source:'Lavos',short:'The Muffin'},
  {enemy:0xf0,source:'Flea?',short:'Moth Witch?'},
  {enemy:0xf9,source:'Magus',short:'Farquaad'},
  {enemy:0xfa,source:'Magus',short:'Farquaad'},
];
