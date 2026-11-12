// Names change; the original damage flags, resistances and progression do not.
export const elements=[
 {name:'Air',source:'Lightning',mask:0x80,menuType:0,characters:[0]},
 {name:'Dirt',source:'Shadow',mask:0x40,menuType:1,characters:[6]},
 {name:'Water',source:'Water',mask:0x20,menuType:2,characters:[1,4]},
 {name:'Fire',source:'Fire',mask:0x10,menuType:3,characters:[2]}
];
export const elementHelp=[
 {kind:'item',id:113,address:0xc3215,source:'Absorbs “Lightning” hits',text:'Absorbs “Air” hits'},
 {kind:'item',id:114,address:0xc3227,source:'Absorbs “Shadow” hits',text:'Absorbs “Dirt” hits'},
 {kind:'item',id:117,address:0xc325b,source:'Absorbs 50% of “Lightning” hits',text:'Absorbs 50% of “Air” hits'},
 {kind:'item',id:118,address:0xc3273,source:'Absorbs 50% of “Shadow” hits',text:'Absorbs 50% of “Dirt” hits'},
 {kind:'item',id:136,address:0xc32fa,source:'Cuts “Shadow” hits by 50%',text:'Cuts “Dirt” hits by 50%'},
 {kind:'item',id:146,address:0xc3394,source:'Cuts “Lightning” hits by 50%',text:'Cuts “Air” hits by 50%'},
 {kind:'tech',id:3,address:0xc3b2b,source:'Attack using Lightning',text:'Air roar on foe'},
 {kind:'tech',id:49,address:0xc3e76,source:'Damage enemies w/ Lightning',text:'Damage enemies w/ Air'}
];
