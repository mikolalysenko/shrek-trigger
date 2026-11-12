// Native inventory IDs remain stable. Blank/unused slots are deliberately
// excluded; original equip masks, prices, special routines and stats survive.
// Each short label fits the native ten-character field after its leading icon.
const groups=[
  [1,'Fence Post|RustPeace|OgreChoppr|MossBoss|Hot Slice|SizzleStik|Bog Log|OldSplintr|Fang You|Root Canal|Star Onion|PlotDevice|Dulocious|Royal Pain|Shock Jock|ReedWeep'],
  [17,'Twiggy|HeavyMetal|CrossBow|WantedBow|SageAdvic|Daydreamer|CometVomit|GottaFast|DramaQueen|BansheeWow'],
  [31,'Peashooter|Seedious|Donkey Gun|BogusCanon|Sparky|RubyDucky|DreamStrem|Ogre 9000|Boom Box|WaffleShot|Burp Gun'],
  [46,'Pine Fresh|Mallet U|PalmReadr|Oak Doke|ThornID|Emberassed|HammerTime|High Five|Royal We|Iron Woody|Disarmed|Wish Arms'],
  [59,'DuelIntnt|Steel Wool|Hatchet|FlashPan|PearlWiz|RuneWithIt|NobleSteed|Hatchet +|OgreFrend'],
  [68,'Soft Serve|Hard Candy|Icing King|Iron Chef|Bronze Age'],
  [75,'ParadeRain|Glaive It|Glaive Off|Tall Order|Swamp Mop|Axe Head|Oak Haft|Hatchet|ReedMind|ReedBetwn|DawnOgre'],
  [91,'Trail Mix|Quilt Trip|Mail Call|Lawsuit|Irony|OgreDress|GoldDigr|RubyTues|Dusk2Dawn|MistOpp|BreadThrd|WishThink|FlashDanc|MossAppeal|SuitYself|Cape Fear|Guarded|DressStres|Moon Unit|RubyRhub|RavenLun|Gloom Room|White Lie|Blackmail|Blue Plate|Red Tape|Vest Day|VestShow|Blue Suede|VestFrnds|SheepCloth|Night Gown'],
  [124,'Cap Nap|HelmDeep|Iron Head|Bird Brain|Goldilocks|Stonehenge|FossilFool|GlowGettr|Moss Head|HelmSweet|PrismBrk|Ogrethink|DarkHelmet|Doom Gloom|Safe Space|Blindfold|SightUnsn|MemoryFoam|Time Out|TinFoilHat|HornerCorn|HastePaste|Rainbro|MermaidAid'],
  [149,'Scarf Face|Bow Wow|GloveAct|SealAppr|Scarf Ace|CharmOnin|RingLead|Aim High|Ring Ogre|FairyGodR|Wallflower|Hoop Dream|Hoopla|Pin Pal|Pinhead|Rose Lens|Bow Peep|PocketLint|Wild Thing|Cat Scan|PurseFirst|DreamOnion|Left Sock|Power Hour|Belt It'],
  [174,'EmoButton|Sad Button|CtrlButton|AltButton|DelButton'],
  [179,'Hero Badge|OgreGainz|SilkPjs|Abracaseal|SealTeam6|Locket Up|Fairy Pop|Shady|Spectacle']
];
export const equipment=groups.flatMap(([first,names])=>names.split('|').map((short,i)=>({id:first+i,name:short,short,category:first<91?'weapon':first<124?'armor':first<149?'helmet':'accessory',mechanics:'preserved'})));
const fullNames={
  2:'Rust in Peace',3:'Ogre Chopper',4:'Moss Is Boss',6:'Sizzle Stick',8:'Old Splinter',9:'Fang You Very Much',
  12:'Plot Device',16:"Reed 'Em and Weep",17:'Twiggy Crossbow',18:'Heavy Metal Crossbow',19:'Cross Crossbow',
  20:'Wanted Crossbow',21:'Sage Advice',24:'Gotta Go Fast',26:'Banshee Wow Crossbow',32:'Seedious Shot',
  33:"Donkey's Harness Gun",34:'Bogus Cannon',35:'Sparky Jet',36:'Ruby Ducky Nozzle',37:'Dream Stream',
  38:'Ogre Blast 9000',40:'Waffle Shot',41:'Dragon Burp Gun',47:'Mallet U Arms',48:'Palm Reader',
  49:'Okey-Dokey Oak Arms',50:'Thorn Identity',51:'Emberassed Hand',52:'Hammer Time',54:'Royal We Arms',
  56:'Disarming Arms',57:'Wish Upon an Arm',59:'Duel Intentions',61:'Carnival Hatchet',62:'Flash in the Pan',
  63:'Pearl of Wisdom',64:'Rune With It',65:'Noble Steed',66:'Awakened Carnival Hatchet',67:'Ogre Friendly',75:'Parade Rain',
  76:'Glaive It a Rest',77:'Glaive Off',80:'Broken Hatchet Head',81:'Carved Oak Haft',82:'Carnival Hatchet',
  83:'Reed My Mind',84:'Reed Between the Lines',85:'Dawn of Ogre',91:'Trail Mix Coat',95:'Irony Coat',
  96:'Ogre Dressed',97:'Gold Digger Coat',98:'Ruby Tuesday Vest',99:'Dusk Till Dawn Mail',
  100:'Mist Opportunity Robe',101:'Bread Thread Mail',102:'Wishful Thinking Robe',103:'Flash Dance Mail',
  104:'Moss Appeal Vest',105:'Suit Yourself',107:'Royally Guarded',108:'Dress Stress',110:'Ruby Rhubarb Armor',
  111:'Raven Lunatic Armor',113:'White Lie Mail',115:'Blue Plate Special',116:'Red Tape Mail',117:'Vest Day Ever',
  118:'Vest in Show',119:'Blue Suede Vest',120:'Vest Friends',121:"Sheep's Clothing",122:'Big Bad Nightgown',
  125:"Helm's Deep",127:'Bird Brain Cap',129:'Stonehenge Cap',130:'Fossil Fool Cap',131:'Glow Getter Cap',
  133:'Helm Sweet Helm',134:'Prism Break',135:'Ogrethinking Cap',136:'Dark Helmet',140:'Sight Unseen Cap',141:'Memory Foam Cap',
  143:'Tin Foil Hat',144:"Horner's Corner Hat",145:'Haste Paste',146:'Rainbro Cap',147:'Mermaid Aid Cap',
  151:'Glove Actually',152:'Seal of Approval',154:'Charming Onion',155:'Ring Leader',158:'Fairy Godring',
  160:'Hoop Dream Earrings',161:'Hoopla Earrings',164:'Rose-Tinted Lens',166:'Pocket Lint',169:'Purse First',
  170:'Dream Onion',171:'Left Sock',174:'Emo Button',176:'Silver Ctrl Button',177:'White Alt Button',178:'Golden Delete Button',
  180:'Ogre Gainz Band',181:'Silk Pajamas',183:'Seal Team 6',185:'Fairy Pop Song',186:'Shady Sun Shades',
  187:'Spectacular Specs'
};
for(const item of equipment)if(fullNames[item.id])item.name=fullNames[item.id];
