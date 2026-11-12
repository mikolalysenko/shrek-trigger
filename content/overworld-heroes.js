// Hand-drawn 16x16 overworld frames. The native overworld keeps seven opaque
// colors per hero; where a hero has authored frames here they replace the
// automatic 32-to-16 reduction (see engine/environment.js).
//
// Legend: . transparent, o outline, then palette entries 2-7 by letter.
// Frame order is the native one: front idle, front step, back step, back idle,
// left idle, left step A, left step B, front stride (OAM mirrors right).


// Symmetric front/back rows are written as their left eight pixels.
const mirror=rows=>rows.map(r=>r+[...r].reverse().join(''));

const shrekHead=[
  '................',
  '.....oooooo.....',
  '....oGGLLGGo....',
  '.o.oGGGGGGGGo.o.',
  '.oGoGGGGGGGGoGo.',
];
const shrekFace=[
  '..ooGoGGGGoGoo..',
  '...oGGGggGGGo...',
  '...ogGGGGGGgo...',
];
const shrekNape=[
  '..ooGGGGGGGGoo..',
  '...oGGGGGGGGo...',
  '...ogGGGGGGgo...',
];
const shrekFrontBody=[
  '..obbccccccbbo..',
  '.obbbccccccbbbo.',
  '.oGbbccccccbbGo.',
  '.oGottttttttoGo.',
  '..ooccccccccoo..',
];
const shrekBackBody=[
  '..obbbbbbbbbbo..',
  '.obbbbbbbbbbbbo.',
  '.oGbbbbbbbbbbGo.',
  '.oGottttttttoGo.',
  '..ooccccccccoo..',
];
const stand=['...obbboobbbo...','...obbo..obbo...','..oooo....oooo..'];
const stepLeft=['...obbboobbbo...','...obbo..oooo...','..oooo..........'];
const stepRight=['...obbboobbbo...','...oooo..obbo...','..........oooo..'];
const shrekSideHead=[
  '................',
  '......ooooo.....',
  '.....oGGLLGo....',
  '....oGGGGGGGo.o.',
  '...oGGGGGGGGoGo.',
  '...oGoGGGGGGo...',
  '...oLGGGGGGGo...',
  '...oggGGGGGgo...',
];
const shrekSideBody=[
  '....obccbbbbo...',
  '...occcbbbbbbo..',
  '...oGccbbbbbbo..',
  '...ottttttttto..',
  '....occcccccco..',
];
const sideStand=['.....obbbbbo....','.....obbobbo....','....ooooooo.....'];
const sideStrideA=['....obbboobbo...','...obbo...obbo..','..oooo.....oooo.'];
const sideStrideB=['.....obbbbo.....','....obboobbo....','...oooo.oooo....'];

const fionaHead=mirror(['.....ooo','....ohhh','...ohhhh','..ohhhHG']);
const fionaBackHead=mirror(['.....ooo','....ohhh','...ohhhh','..ohhhhh']);
const fionaFace=mirror(['..ohGoGG','..ohGGGL','..ohhGGo','...ohoGG']);
const fionaNape=mirror(['..ohhhhh','..ohhhhh','..ohhhhH','...ohhhh']);
const fionaFrontBody=mirror(['..ohdDDD','.oGdDDDD','.oGdDDDD','..odDDDD','..odDDDD']);
const fionaBackBody=mirror(['..odDDDh','.oGdDDDh','.oGdDDDh','..odDDDH','..odDDDD']);
const fionaStand=['.odDDDDDDDDDDdo.','.oddddddddddddo.','...odo....odo...'];
const fionaStepA=['..odDDDDDDDDDDdo','..oddddddddddddo','....odo...ooo...'];
const fionaStepB=['odDDDDDDDDDDdo..','oddddddddddddo..','...ooo...odo....'];
const fionaSideHead=[
  '................',
  '......oooo......',
  '.....ohhhho.....',
  '....ohhhhhho....',
  '...oGGhhhhhho...',
  '...oGoGhhhhho...',
  '..oLGGGhhhhho...',
  '...oGGGhhhhho...',
];
const fionaSideBody=[
  '....odDDDhhho...',
  '...oGdDDDDhho...',
  '...oGdDDDDDo....',
  '....odDDDDDo....',
  '....odDDDDDo....',
];
const fionaSideStand=['...odDDDDDDo....','...odddddddo....','....odo.odo.....'];
const fionaSideA=['...odDDDDDDo....','...odddddddo....','..odo....odo....'];
const fionaSideB=['...odDDDDDDo....','...odddddddo....','.....odoodoo....'];

const farquaadHead=mirror(['...oyoyo','..oyyyyy','.ohhhhhh','ohhhhhhh']);
const farquaadFace=mirror(['ohhsoSSS','ohhssssS','ohhssssr','.ohhhsss']);
const farquaadNape=mirror(['ohhhhhhh','ohhhhhhh','ohhhhhhh','.ohhhhhh']);
const farquaadFrontBody=mirror(['..oRRRRy','.osRRRRy','.osRRRRy','..oyyyyy','..orrrrr']);
const farquaadBackBody=mirror(['..oRRRRR','.osRRRRR','.osRRRRR','..oRRRRR','..orrrrr']);
const farquaadStand=mirror(['...orro.','...orro.','..oooo..']);
const farquaadStepA=['...orro..orro...','...orro..oooo...','..oooo..........'];
const farquaadStepB=['...orro..orro...','...oooo..orro...','..........oooo..'];
const farquaadSideHead=[
  '.....oyoyo......',
  '....oyyyyyo.....',
  '...ohhhhhhho....',
  '..ohhhhhhhhho...',
  '..oSSShhhhhho...',
  '.osSoShhhhhho...',
  '..osssShhhhho...',
  '...ossshhhho....',
];
const farquaadSideBody=[
  '....oyRRRRo.....',
  '...osRRRRRRo....',
  '...osRRRRRRo....',
  '....oyyyyyo.....',
  '....orrrrro.....',
];
const farquaadSideStand=['.....orrro......','.....orrro......','....ooooo.......'];
const farquaadSideA=['....orroorro....','...orro..orro...','..oooo....oooo..'];
const farquaadSideB=['.....orrro......','....orrorro.....','...oooooooo.....'];

const pussHat=[
  '..........cc....',
  '....oooooccco...',
  '...okkkkkkkkko..',
  '.ookkrrrrrrkkoo.',
  'okkkkkkkkkkkkkko',
];
const pussFace=['...oOOOOOOOOo...','...oOkOOOOkOo...','...oOOccccOOo...','....oOOccOOo....'];
const pussNape=['...oOOOOOOOOo...','...oOOOOOOOOo...','...oOOOOOOOOo...','....oOOOOOOo....'];
const pussFrontBody=['...odOccccOdo...','..oOdOccccOdOo..','..oOokkkkkkoOo..','...odOOOOOOdo...'];
const pussBackBody=['...odOOOOOOdo...','..oOdOOOOOOdOo..','..oOokkkkkkoOo..','...odOOOOOOdooL.'];
const pussStand=['...okkkookkko...','...okko..okko...','..ooooo..ooooo..'];
const pussStepA=['...okkkookkko...','...okko..oooo...','..ooooo.........'];
const pussStepB=['...okkkookkko...','...oooo..okko...','.........ooooo..'];
const pussSideHead=[
  '..........cc....',
  '.....oooooccc...',
  '....okkkkkkkko..',
  '....okrrrrrrko..',
  '..okkkkkkkkkkko.',
  '...oOOOOOOOOo...',
  '...okOOOOOOOo...',
  '..occOOOOOOo....',
  '...occOOOOo.....',
];
const pussSideBody=['....oOccdOo.....','...oOccOdOo.oLo.','....okkkkkooLo..','....odOOOdoLo...'];
const pussSideStand=['....okkkko......','....okkkko......','...oooooo.......'];
const pussSideA=['...okko.okko....','..okko...okko...','.ooooo...ooooo..'];
const pussSideB=['....okkkko......','...okkookko.....','..oooo.oooo.....'];

const mongoHead=mirror([
  '......oo',
  '....oomm',
  '...omlmm',
  '..omlmmm',
]);
const mongoFace=mirror(['..ommwom','..ommmmm','..omwmmm','...omwww']);
const mongoNape=mirror(['..ommmmm','..ommmmm','..ombmmm','...ommmm']);
const mongoFrontBody=mirror(['.oooommm','omwmmmmp','.ooommmm','...ommmp','...ommmm']);
const mongoBackBody=mirror(['.oooommm','omwmmmmm','.ooommmm','...ommmm','...ommmm']);
const mongoStand=mirror(['..ommmmo','..omwmo.','..oooo..']);
const mongoStepA=['..ommmmoommmmo..','..omwmo..oooo...','..oooo..........'];
const mongoStepB=['..ommmmoommmmo..','...oooo..omwmo..','..........oooo..'];
const mongoSideHead=[
  '................',
  '......oooo......',
  '....oommmlo.....',
  '...ommmmmllo....',
  '...owommmmmo....',
  '...ommmmmmmo....',
  '...owmmmmmmo....',
  '....owwmmmo.....',
];
const mongoSideBody=[
  '.....ommmmo.....',
  '....omwmmmmo....',
  '....ommmmpmo....',
  '.....ommmmo.....',
  '.....ommmmo.....',
];
const mongoSideStand=['.....ommmmo.....','.....omwwmo.....','....oooooo......'];
const mongoSideA=['....ommoommo....','...omwo..omwo...','..oooo....oooo..'];
const mongoSideB=['.....ommmo......','....omwomwo.....','...oooooooo.....'];

// Donkey: tall ears, cream muzzle, dark mane; a quadruped, so the side views
// are long and the front and back views show the two near legs.
const donkeyHead=mirror(['..oo....','..ogo...','..oggo..','...oggoo','...ogggd','..oggogg','..oggggg','...ommmm','...ommom','....ommm']);
const donkeyBackHead=mirror(['..oo....','..ogo...','..oggo..','...oggoo','...ogggd','..oggggd','..oggggd','...ogggd','...ogggd','....oggd']);
const donkeyFrontBody=mirror(['...ooggl','...ogggl','...ogggl']);
const donkeyBackBody=mirror(['...ooggg','...ogggd','...ogggd']);
const donkeyStand=['...ogdo..odgo...','...ogdo..odgo...','...oooo..oooo...'];
const donkeyStepA=['...ogdo..odgo...','...ogdo..oooo...','...oooo.........'];
const donkeyStepB=['...ogdo..odgo...','...oooo..odgo...','.........oooo...'];
const donkeySide=[
  '.....oo.oo......',
  '.....ogoogo.....',
  '.....ogoogo.....',
  '....oggggdo.....',
  '...ogoggggdo....',
  '..ommgggggdo....',
  '..omomgggdooooo.',
  '...ooogggggggggo',
  '.....oggggggggdo',
  '.....oglllllggdo',
  '.....ogllllllgo.',
  '.....oggggggggo.',
  '.....ogdoooogdo.',
];
const donkeySideStand=['.....ogo....ogo.','.....ogo....ogo.','.....ooo....ooo.'];
const donkeySideA=['....ogo.....ogo.','...ogo.......ogo','...ooo.......ooo'];
const donkeySideB=['......ogo..ogo..','.......ogoogo...','.......oooooo...'];

// Pinocchio: yellow hat, the nose, white shirt, red suspenders and shoes.
const pinocchioHat=mirror(['......oo','.....oyy','...ooyyy','...oyyyy']);
const pinocchioFace=mirror(['...odsss','...ososs','...osssd','....osss','.....ooo']);
const pinocchioNape=mirror(['...odddd','...odddd','...osddd','....osss','.....ooo']);
const pinocchioFrontBody=mirror(['...oowrw','..oswwrb','..ooobbb','....obbb']);
const pinocchioBackBody=mirror(['...oowrw','..oswwwr','..ooobbb','....obbb']);
const pinocchioStand=['....osdoodso....','....osdoodso....','...orrroorrro...'];
const pinocchioStepA=['....osdoodso....','....osdoorrro...','...orrro........'];
const pinocchioStepB=['....osdoodso....','...orrroodso....','........orrro...'];
const pinocchioSide=[
  '.......ooo......',
  '......oyyyo.....',
  '....ooyyyyyo....',
  '...oyyyyyyyyo...',
  '....osssdddo....',
  '....osossddo....',
  '.osssssssssdo...',
  '..ooosssssso....',
  '.....oooooo.....',
  '.....owrwwo.....',
  '....oswrwwo.....',
  '....oobbbbo.....',
  '.....obbbbo.....',
];
const pinocchioSideStand=['......osdo......','......osdo......','.....orrro......'];
const pinocchioSideA=['.....osoodo.....','....oso..odo....','...orro..orro...'];
const pinocchioSideB=['......osdo......','.....osodo......','....orrorro.....'];

export const overworldHeroArt={
  0:{
    colors:{o:1,g:2,G:3,L:4,c:5,b:6,t:7},
    frames:[
      [...shrekHead,...shrekFace,...shrekFrontBody,...stand],
      [...shrekHead,...shrekFace,...shrekFrontBody,...stepLeft],
      [...shrekHead,...shrekNape,...shrekBackBody,...stepRight],
      [...shrekHead,...shrekNape,...shrekBackBody,...stand],
      [...shrekSideHead,...shrekSideBody,...sideStand],
      [...shrekSideHead,...shrekSideBody,...sideStrideA],
      [...shrekSideHead,...shrekSideBody,...sideStrideB],
      [...shrekHead,...shrekFace,...shrekFrontBody,...stepRight],
    ],
  },
  1:{
    colors:{o:1,G:3,L:4,d:6,D:7,H:8,h:11},
    frames:[
      [...fionaHead,...fionaFace,...fionaFrontBody,...fionaStand],
      [...fionaHead,...fionaFace,...fionaFrontBody,...fionaStepA],
      [...fionaBackHead,...fionaNape,...fionaBackBody,...fionaStepB],
      [...fionaBackHead,...fionaNape,...fionaBackBody,...fionaStand],
      [...fionaSideHead,...fionaSideBody,...fionaSideStand],
      [...fionaSideHead,...fionaSideBody,...fionaSideA],
      [...fionaSideHead,...fionaSideBody,...fionaSideB],
      [...fionaHead,...fionaFace,...fionaFrontBody,...fionaStepB],
    ],
  },
  2:{
    colors:{o:1,d:2,g:3,l:4,m:5},
    frames:[
      [...donkeyHead,...donkeyFrontBody,...donkeyStand],
      [...donkeyHead,...donkeyFrontBody,...donkeyStepA],
      [...donkeyBackHead,...donkeyBackBody,...donkeyStepB],
      [...donkeyBackHead,...donkeyBackBody,...donkeyStand],
      [...donkeySide,...donkeySideStand],
      [...donkeySide,...donkeySideA],
      [...donkeySide,...donkeySideB],
      [...donkeyHead,...donkeyFrontBody,...donkeyStepB],
    ],
  },
  3:{
    colors:{o:1,w:2,s:3,d:4,y:6,b:9,r:11},
    frames:[
      [...pinocchioHat,...pinocchioFace,...pinocchioFrontBody,...pinocchioStand],
      [...pinocchioHat,...pinocchioFace,...pinocchioFrontBody,...pinocchioStepA],
      [...pinocchioHat,...pinocchioNape,...pinocchioBackBody,...pinocchioStepB],
      [...pinocchioHat,...pinocchioNape,...pinocchioBackBody,...pinocchioStand],
      [...pinocchioSide,...pinocchioSideStand],
      [...pinocchioSide,...pinocchioSideA],
      [...pinocchioSide,...pinocchioSideB],
      [...pinocchioHat,...pinocchioFace,...pinocchioFrontBody,...pinocchioStepB],
    ],
  },
  4:{
    colors:{o:1,d:2,O:3,L:4,c:5,k:6,r:10},
    frames:[
      [...pussHat,...pussFace,...pussFrontBody,...pussStand],
      [...pussHat,...pussFace,...pussFrontBody,...pussStepA],
      [...pussHat,...pussNape,...pussBackBody,...pussStepB],
      [...pussHat,...pussNape,...pussBackBody,...pussStand],
      [...pussSideHead,...pussSideBody,...pussSideStand],
      [...pussSideHead,...pussSideBody,...pussSideA],
      [...pussSideHead,...pussSideBody,...pussSideB],
      [...pussHat,...pussFace,...pussFrontBody,...pussStepB],
    ],
  },
  5:{
    colors:{o:1,b:3,m:4,l:5,w:6,p:8},
    frames:[
      [...mongoHead,...mongoFace,...mongoFrontBody,...mongoStand],
      [...mongoHead,...mongoFace,...mongoFrontBody,...mongoStepA],
      [...mongoHead,...mongoNape,...mongoBackBody,...mongoStepB],
      [...mongoHead,...mongoNape,...mongoBackBody,...mongoStand],
      [...mongoSideHead,...mongoSideBody,...mongoSideStand],
      [...mongoSideHead,...mongoSideBody,...mongoSideA],
      [...mongoSideHead,...mongoSideBody,...mongoSideB],
      [...mongoHead,...mongoFace,...mongoFrontBody,...mongoStepB],
    ],
  },
  6:{
    colors:{o:1,s:3,S:4,r:6,R:7,y:9,h:11},
    frames:[
      [...farquaadHead,...farquaadFace,...farquaadFrontBody,...farquaadStand],
      [...farquaadHead,...farquaadFace,...farquaadFrontBody,...farquaadStepA],
      [...farquaadHead,...farquaadNape,...farquaadBackBody,...farquaadStepB],
      [...farquaadHead,...farquaadNape,...farquaadBackBody,...farquaadStand],
      [...farquaadSideHead,...farquaadSideBody,...farquaadSideStand],
      [...farquaadSideHead,...farquaadSideBody,...farquaadSideA],
      [...farquaadSideHead,...farquaadSideBody,...farquaadSideB],
      [...farquaadHead,...farquaadFace,...farquaadFrontBody,...farquaadStepB],
    ],
  },
};
