// Each fixture uses the cartridge's ordinary enemy records and AI. Large
// multi-part bosses keep their authored encounters in the area shortcuts.
export const combatFixtures=[
  {key:'swamp-pack',name:'Swamp Dozers · three targets',enemies:[0,0,0]},
  {key:'sparring',name:'Sparring dummy · one target',enemies:[146]},
  // The clowns' paired attack addresses its partner by native enemy slot, so
  // they keep the two slots of their own encounter.
  {key:'clowns',name:'Violent J & Shaggy 2 Dope',enemies:[151,152],slots:[9,10],song:81},
  {key:'milenko',name:'Great Milenko',enemies:[153],song:81},
  {key:'court-beast',name:'The Masquerader',enemies:[144]},
  {key:'kilnback',name:'Kilnback',enemies:[155]},
  {key:'master-glaze',name:'Master Glaze',enemies:[154]},
  {key:'crumb-hunters',name:'Crumb Hunters',enemies:[1,61,1]},
  {key:'bone-guards',name:'Bone Guards',enemies:[43,44,45]},
  {key:'future-ushers',name:'Clockwork Ushers',enemies:[137,138,139]},
  {key:'mr-worldwide',name:'Mr. Worldwide · superboss',enemies:[0x24],song:0x4f}
];
