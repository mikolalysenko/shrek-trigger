// Eleven-byte native fields include a leading icon: ten visible characters.
// Mechanics, prices, drops, equip masks and shop contents remain ROM-owned.
import {equipment} from './equipment.js';
import {faygoItems} from './faygo.js';
import {itemHelp} from './item-help.js';
export const items = [...equipment,...faygoItems,...[
  // Toenails are money. Healing is spicy root vegetables: onions for HP,
  // garlic for MP, then horseradish, wasabi and ginger at the top.
  [189,'Onion','Onion'],[190,'Mid Onion','Mid Onion'],[191,'High Onion','High Onion'],
  [192,'Garlic','Garlic'],[193,'Mid Garlic','Mid Garlic'],[194,'High Garlic','HighGarlic'],
  [195,'Horseradish','HorseRadsh'],[196,'Wasabi','Wasabi'],[197,'Ginger Root','GingerRoot'],
  [198,'Mud Bath','Mud Bath'],[199,'Sock Whiff','Sock Whiff'],[200,'Outhouse','Outhouse'],
  [201,'Mystery Pie','MysteryPie'],[202,'Radish Bunch','RadishBnch'],
  [203,'Emotional Barrier','EmoBarrier'],[204,'Insecurity Shield','InsecShld'],
  [208,'Onion Petal','OnionPetal'],[209,'Donkey Fang','DonkeyFang'],[210,'Duloc Horn','Duloc Horn'],
  [211,'Puss Feather','PussFeathr'],[212,'Onion Seed','Onion Seed'],[213,'Turbo Onion Key','TurboOnion'],
  [214,'Plot Pendant','PlotPendnt'],[215,"Donkey's Gate Key",'Donkey Key'],[216,'Rainbow Crumb','RnbwCrumb'],
  [217,'Second Chance','2nd Chance'],[218,"Donkey's Tiny Tools",'Tiny Tools'],[219,'Onion Bread','OnionBread'],
  [220,'Dreamstone','Dreamstone'],[221,'Lap Top','Lap Top'],[222,'Moon Onion Stone','Moon Onion'],
  [223,'Sun Onion Stone','Sun Onion'],[224,'Ruby Hatchet','Ruby Axe'],[225,'Duloc Dungeon Key','Duloc Key'],
  [226,'Shrek Stand-in','Ogre Doll'],[227,"Rowan's Onion Pop",'Rowan Pop'],
  [228,'Two Onion Petals','2OniPetals'],[229,'Two Donkey Fangs','2DonkFangs'],
  [230,'Two Duloc Horns','2DulcHorns'],[231,'Two Puss Feathers','2PussFthr']
].map(([id,name,short])=>({id,name,short}))];

// Help lines for every item live in content/item-help.js.
for(const item of items)if(itemHelp[item.id])item.help=itemHelp[item.id];
