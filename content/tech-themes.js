// Shrek-themed presentation for the techniques that keep their Chrono Trigger
// effect shapes (user decision, November 8: every technique gets a funny name
// and its own color theme; signature moves get full sprite redraws later).
// Mechanics, elements, targets, MP and progression are untouched. `short` is
// the menu label (10 characters beside a magic icon, otherwise 11).
//
// Themes recolor the effect palettes only while that technique is cast:
//   swamp  ogre green        pink   Fiona and Dragon pink
//   gold   waffle and butter  royal  Farquaad crimson and violet
//   wood   puppet pine        fairy  wish-star violet
//   onion  onion purple       icing  sugar-frosting rose white
export const techThemes={
 // Fiona
 10:{name:'Hi-Yah!',short:'Hi-Yah!',theme:'pink',concept:'A Matrix-style taunt that makes a foe come at her.'},
 16:{name:'True Kiss',short:'True Kiss',theme:'pink',concept:'True love’s kiss brings a fallen ally back on their feet.'},
 15:{name:'Balloon Pet',short:'BalloonPet',theme:'swamp',concept:'Fiona inflates a snake, twists it into a balloon animal and hands it to one ally.'},
 // Donkey
 19:{name:'Dragon Kiss',short:'DragonKiss',theme:'pink',concept:'Flaming hearts blown in Dragon’s pink fire.'},
 // Pinocchio
 26:{name:'Blue Fairy',short:'Blue Fairy',theme:'fairy',concept:'A ray of the Blue Fairy’s light restores one ally.'},
 27:{name:'Nose Spin',short:'Nose Spin',theme:'wood',concept:'He tells a whopper and spins; the nose does the rest.'},
 29:{name:'Wish Star',short:'Wish Star',theme:'fairy',concept:'When you wish upon a star, the whole party heals.'},
 31:{name:'Sawdust',short:'Sawdust',theme:'wood',concept:'A burst of splinters and sawdust around him.'},
 // Mongo
 45:{name:'Icing Patch',short:'Icing Patch',theme:'icing',concept:'Frosting piped over the whole party patches everyone up.'},
 // Farquaad
 50:{name:'Cold Snub',short:'Cold Snub',theme:'royal',concept:'The lord’s icy disdain, made literal.'},
 54:{name:'Duloc Fog',short:'Duloc Fog',theme:'royal',concept:'Perfectly regulated, perfectly gloomy Duloc fog.'},
 // Doubles
 57:{name:'Heal Fart',short:'Heal Fart',theme:'swamp',concept:'Shrek spins and lets one go; Fiona insists it is medicinal.'},
 58:{name:'Frosty Club',short:'Frosty Club',theme:'swamp',concept:'Fiona ices Shrek’s fist before he swings.'},
 59:{name:'Big Chill',short:'Big Chill',theme:'swamp',concept:'The same, with feelings.'},
 61:{name:'Torch Club',short:'Torch Club',theme:'gold',concept:'Donkey lights Shrek’s club. Donkey regrets nothing.'},
 62:{name:'Bonfire',short:'Bonfire',theme:'gold',concept:'A swamp bonfire, with an ogre in the middle.'},
 65:{name:'Nose Zap',short:'Nose Zap',theme:'wood',concept:'Shrek charges up Pinocchio’s nose like a lightning rod.'},
 67:{name:'Swashbuckle',short:'Swashbuckle',theme:'swamp',concept:'Puss shows Shrek how a gentleman fences.'},
 68:{name:'Rapier Rain',short:'Rapier Rain',theme:'swamp',concept:'A rain of tiny swords from a very small cat.'},
 70:{name:'Big Bite',short:'Big Bite',theme:'icing',concept:'Shrek takes a bite out of the problem.'},
 72:{name:'Hot & Cold',short:'Hot & Cold',theme:'pink',concept:'Fiona and Donkey argue about the thermostat.'},
 73:{name:'Hot & Cold 2',short:'Hot&Cold 2',theme:'pink',concept:'They are still arguing.'},
 74:{name:'Hot & Cold 3',short:'Hot&Cold 3',theme:'pink',concept:'Now everyone is involved.'},
 75:{name:'Fairy Ray',short:'Fairy Ray',theme:'fairy',concept:'Fiona aims Pinocchio’s fairy light.'},
 76:{name:'Snow Plow',short:'Snow Plow',theme:'wood',concept:'Pinocchio, iced and pushed headfirst.'},
 77:{name:'Patch Up',short:'Patch Up',theme:'fairy',concept:'Wood glue and a kiss on the boo-boo.'},
 78:{name:'Milkshake',short:'Milkshake',theme:'milk',concept:'Fiona chills Puss’s milk into a milkshake. Brain freeze for everyone.'},
 79:{name:'Brain Freeze',short:'BrainFreeze',theme:'milk',concept:'The milkshake, all at once.'},
 80:{name:'Group Hug',short:'Group Hug',theme:'pink',concept:'Fiona and Mongo hug the whole party better.'},
 82:{name:'Snowball',short:'Snowball',theme:'icing',concept:'Mongo throws one snowball. It is the size of a cottage.'},
 83:{name:'Sugar Cube',short:'Sugar Cube',theme:'icing',concept:'A sugar cube, also the size of a cottage.'},
 84:{name:'Kindling',short:'Kindling',theme:'wood',concept:'Donkey learns what pine is for.'},
 85:{name:'Hot Seat',short:'Hot Seat',theme:'wood',concept:'Pinocchio rides a rocket of Donkey’s breath.'},
 86:{name:'Firewood',short:'Firewood',theme:'wood',concept:'Two bombs, one puppet, no remorse.'},
 87:{name:'Oven Kick',short:'Oven Kick',theme:'gold',concept:'Donkey preheats Mongo, Mongo kicks.'},
 88:{name:'Bake Spin',short:'Bake Spin',theme:'gold',concept:'Gingerbread at 350 degrees, spinning.'},
 89:{name:'Burnt Toast',short:'Burnt Toast',theme:'gold',concept:'Mongo, slightly overdone, lands on someone.'},
 91:{name:'Bubble Bath',short:'BubbleBath',theme:'milk',concept:'Puss insists on a bath. Pinocchio provides the bubbles.'},
 92:{name:'Sugar Rush',short:'Sugar Rush',theme:'icing',concept:'Mongo and Pinocchio hand out candy until everyone feels better.'},
 96:{name:'Milk & Cookie',short:'MilkCookie',theme:'milk',concept:'Puss brings the milk, Mongo brings the cookie.'},
 97:{name:'Spit Bubble',short:'Spit Bubble',theme:'milk',concept:'A hairball, gift-wrapped in a bubble.'},
 99:{name:'Hot Pin',short:'Hot Pin',theme:'gold',concept:'Puss’s rapier, heated by Donkey.'},
 100:{name:'Fuse Line',short:'Fuse Line',theme:'gold',concept:'Puss lights the fuse with style.'},
 101:{name:'Cat Flare',short:'Cat Flare',theme:'onion',concept:'The big eyes, weaponized.'},
 // Triples
 102:{name:'Fairy Tale',short:'Fairy Tale',theme:'swamp',concept:'Ogre, princess and Donkey: once upon a time, then a beating.'},
 103:{name:'Rescue Team',short:'RescueTeam',theme:'fairy',concept:'Shrek, Fiona and Pinocchio revive everyone, eventually.'},
 104:{name:'Big Finish',short:'Big Finish',theme:'swamp',concept:'Shrek, Fiona and Puss end it like a movie.'},
 106:{name:'Barbecue',short:'Barbecue',theme:'gold',concept:'Shrek, Donkey and Pinocchio host a swamp cookout.'},
 107:{name:'Mud Storm',short:'Mud Storm',theme:'swamp',concept:'Shrek, Donkey and Puss whip up a swamp storm.'},
 112:{name:'Duloc Doom',short:'Duloc Doom',theme:'royal',concept:'Fiona, Donkey and Farquaad agree on one thing: doom.'},
 113:{name:'Onion Flare',short:'OnionFlare',theme:'onion',concept:'Every layer at once. Ogres are like onions.'},
 116:{name:'Ever After',short:'Ever After',theme:'pink',concept:'Shrek, Puss and Farquaad dream of happily ever after.'}
};
