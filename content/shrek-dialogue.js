// Authored responses at native conversational pauses. IDs refer to the
// original field message, not a new event opcode. The builder rejects timed
// messages and choice boxes; those keep their original pacing and options.
// The cartridge checks all three active party slots before showing a reply.
const enhasaReplies={
 0:'SHREK: A dream with fine print.\nSo, a contract.',
 1:'SHREK: Look down. It\'s\nalways whoever\'s underneath.',
 2:'SHREK: Wash the pillow.\nThat\'ll settle it.',
 3:'SHREK: Water, Air, Fire.\nA clown recipe. Lovely.',
 7:'SHREK: I\'ve met persuasive.\nIt had a torch and a pitchfork.',
 11:'SHREK: Mine says “alone, in\na swamp.” I\'m behind schedule.',
 14:'SHREK: Knowledge opens doors.\nSo do I. Mine\'s quicker.',
 26:'SHREK: Cheerful lad. Does\nhe do parties?',
 32:'SHREK: It\'s too clean. Never\ntrust a place with no mud.',
 35:'SHREK: Aye. And if it\'s\nme, avenge me loudly.'
};
export const shrekReplies = {
  335:enhasaReplies,
  355:enhasaReplies,
  1: {
    10: 'SHREK: Donkey. I\'ve tried\nforgetting. It doesn\'t take.',
    11: 'SHREK: He can build a machine\nbut not a sandwich.',
    12: 'SHREK: Toenails and Smash Mouth.\nA sensible morning.',
    13: 'SHREK: Life savings, on a fair.\nDonkey owes me a jar.',
    16: 'SHREK: Home smells like feet.\nThat\'s not a complaint.',
    37: 'SHREK: By choice. It took years\nto get it this empty.',
    46: 'SHREK: Don\'t spoil it. That\nchair has to live with me.',
    52: 'SHREK: His name\'s Cat. He\ndoesn\'t answer to that either.',
    58: 'SHREK: I built it out of spite.\nSpite holds.',
    60: 'SHREK: Mind your head on the\nway out. Kidding. You\'re fine.',
    62: 'SHREK: Free shade. I still\nwant it off my lawn.'
  },
  2: {
    6: 'SHREK: I\'m up! Ogres have layers.\nOne\'s still asleep.',
    7: 'SHREK: It can have the morning.\nI wasn\'t using it.',
    8: 'SHREK: Donkey and a machine.\nI\'ll bring the toenails and\na bucket of water.',
    9: 'SHREK: Best conversation\nI\'ll have all day.'
  },
  5: {
    27: 'SHREK: A shopkeeper turning\ndown toenails. Now I\'m worried.',
    49: 'SHREK: I enjoy myself\nout of order.',
    54: 'SHREK: Most things are.',
    57: 'SHREK: Unauthorized. So there\'s\na form. I\'ll fill it in mud.',
    58: 'SHREK: Close enough for Duloc.\nI\'ll watch one turnip.',
    60: 'SHREK: I know Donkey. Stand\nfarther back.',
    71: 'SHREK: Needs mud. Otherwise,\na lovely day.'
  },
  6: {
    3: 'SHREK: I\'ll mind the paint.\nThe rest of you, no promises.',
    4: 'SHREK: Polite applause.\nI\'ve had warmer pitchforks.'
  },
  8: {
    82: 'SHREK: Reinforced. So you\nweighed me from a distance.',
    86: 'SHREK: The second “right” is\nwhat worries me.',
    88: 'SHREK: I counted them. One\'s\nstill over there.',
    92: 'SHREK: “Actually.” Thank you,\nDonkey.',
    95: 'SHREK: Staying put. That one\nI can do.',
    110: 'SHREK: “Anywhere” is a big\nplace, Donkey. Narrow it down.',
    112: 'SHREK: I know. I\'m going.\nStop making the face.',
    121: 'SHREK: Same sky. Same bell.\nI missed one.',
    123: 'SHREK: Next time invent\na cart.',
    125: 'SHREK: Fix it less. It was\nsafer broken.',
    127: 'SHREK: Aye. Slowly. It\'s been\na long four hundred years.'
  },
  439: {
    38: 'SHREK: I\'m fine. People don\'t\nusually run toward me.',
    39: 'SHREK: Shiny thing, on the\nground. Even I can find that.',
    45: 'SHREK: Kind? Tell nobody.\nI have a reputation.',
    47: 'SHREK: Shrek. Ogre. That\'s\nusually where people run.',
    48: 'SHREK: “We.” That happened\nfast. You pick.',
    63: 'SHREK: Standing still is my\nsecond-best talent.',
    65: 'SHREK: Waiting. I\'m told\nI loom when I do it.',
    67: 'SHREK: I had nowhere to be.\nI never do. It\'s lovely.',
    68: 'SHREK: It was unattended.\nIn the swamp that means free.',
    69: 'SHREK: The cat was in my way.\nThat\'s my story.',
    70: 'SHREK: Beats losing.'
  },
  113: {
    169: 'SHREK: Don\'t tell him that.\nHe\'ll build another one.',
    175: 'SHREK: My door barely\nremembers to shut.',
    177: 'SHREK: A key. Good. Now make\na lock for my swamp.'
  },
  114: {
    154: 'SHREK: Four centuries early.\nDonkey has explaining to do.',
    155: 'SHREK: Keep planting. I\'m good\nwith things that won\'t leave.',
    197: 'SHREK: A long nap. Finally,\nsomeone with a plan.'
  },
  115: {
    156: 'SHREK: So it\'s your fault.\nFour hundred years of it.',
    158: 'SHREK: Named hammers hit\nharder. Let her.',
    160: 'SHREK: Supper I\'ll get up for.\nRing it for that.'
  },
  116: {
    137: 'SHREK: To be left alone.\nI\'d bet my jar on it.',
    144: 'SHREK: What year is it?\n...No reason.',
    148: 'SHREK: Finish it anyway.\nI want to hear the door bit.',
    149: 'SHREK: We\'ll look. Your tab\nis your own quest.',
    195: 'SHREK: Awkward I can do.'
  },
  118: {
    161: 'SHREK: Depends on your prices.',
    163: 'SHREK: Tell Donkey. He\'s been\nluggage for days.'
  },
  120: {
    1: 'SHREK: Looking for Fiona.\nGreen, stubborn, came through.',
    8: 'SHREK: Shouting at guards.\nI knew I liked her.',
    86: 'SHREK: Found her. Then she\nvanished mid-sentence. Rude.',
    92: 'SHREK: She\'ll want paying.\nPanic about that later.',
    96: 'SHREK: You came back, Puss.\nThat counts.',
    127: 'SHREK: The doors started it.'
  },
  122: {
    27: 'SHREK: The voice gave you away.\nSo did the green.',
    29: 'SHREK: Aye. Did the pillows\ntalk back? Donkey would.',
    32: 'SHREK: Stay close. No more\nvanishing.',
    34: 'SHREK: Fiona! Take my hand!',
    104: 'SHREK: You\'re here now.\nI\'ve got you.',
    108: 'SHREK: I\'ve wanted forty years\nwithout neighbors. I get it.',
    112: 'SHREK: Onion. If you\'re going\nto insult me, get it right.'
  },
  129: {
    1: 'SHREK: Donkey is not lunch.\nStop picturing potatoes.',
    6: 'SHREK: Queens drop things. Donkeys\nfind them. Keep looking.',
    7: 'SHREK: Too stringy. Pretty\ndidn\'t come into it.',
    10: 'SHREK: Fine. But the donkey\ncounts as half a blade.',
    12: 'SHREK: I\'ve seen a talking\ndonkey. A cat in boots is tidy.',
    20: 'SHREK: Shrek. The smell\'s\nstructural.',
    22: 'SHREK: Neither can I. I knock\nuntil one shows up.'
  },
  198: {
    31: 'SHREK: I did. Leave the queen\nor I open you too.',
    35: 'SHREK: You said “my secret\ndoor.” Out loud. To us.',
    41: 'SHREK: One bow. No hugging.\nThe donkey will try.',
    45: 'SHREK: Folded. And you still\ntalk this much.'
  },
  20: {
    9: 'SHREK: It goes away from\nthem. Good enough.',
    17: 'SHREK: She\'s the one who\nran into me.'
  },
  21: {
    28: 'SHREK: She came like this.\nI can\'t take the credit.',
    33: 'SHREK: Coming. Nice castle.\nShame about the family.',
    38: 'SHREK: Mine\'s never been\nout of the box.',
    49: 'SHREK: You practiced that\nin a mirror. I can tell.'
  },
  27: {
    135: 'SHREK: She knocked me over.\nI\'m the one who got abducted.',
    138: 'SHREK: You\'ll get them.\nYou won\'t like them.',
    144: 'SHREK: A Donkey invention.\nThey all end like that.',
    151: 'SHREK: Keep hold of that cat.\nI\'m not chasing it twice.',
    156: 'SHREK: No. I didn\'t.\nSorry, kid.',
    162: 'SHREK: I owe you a lunch.\nI don\'t owe him my head.',
    174: 'SHREK: I was getting to it.\nOgres hand things back slowly.',
    185: 'SHREK: Three days alone.\nThen you ruin it.',
    186: 'SHREK: Innocent and jailed.\nAt least it\'s quiet in there.',
    192: 'SHREK: It\'s fine, Fiona.\nI like small dark rooms.'
  },
  28: {
    40: 'SHREK: He brought a tank\nto a jailbreak. Flattering.',
    42: 'SHREK: I\'ve not heard the\nfirst of it. I wasn\'t listening.'
  },
  29: {
    4: 'SHREK: She stole me. Nobody\nwrites that down.',
    29: 'SHREK: I rescued myself.\nYou can carry things.',
    37: 'SHREK: Do it on the way out.\nQuietly.',
    44: 'SHREK: Head first. Same way\nI deal with everything.'
  },
  30: {
    28: 'SHREK: Aye. “Donkey\'s late.”',
    29: 'SHREK: Donkey! Cutting it\nfine. Literally.',
    33: 'SHREK: Call it “the harness.”\nNow run.'
  },
  71: {
    13: 'SHREK: If there\'s a file in it,\nI\'m eating that too.',
    15: 'SHREK: Open the door or\nI hum.',
    18: 'SHREK: Home. You\'re welcome\nto not come.',
    25: 'SHREK: Three days already?\nI was just settling in.'
  },
  208: {
    4: 'SHREK: That\'s not floor.\nThat\'s me.',
    5: 'SHREK: First good thing about\nthis place. Might be the last.'
  },
  210: {
    10: 'SHREK: I\'ve eaten worse than\nnothing. Not often.',
    15: 'SHREK: Plenty green at home.\nSome of it moves.',
    17: 'SHREK: They\'re just as\ncheerful. You\'ll get on.',
    20: 'SHREK: Nobody ate it. That\'s\nthe best news all century.'
  },
  214: {
    32: 'SHREK: On purpose. It\'s new\nfor me too.',
    37: 'SHREK: That\'s the plan.\nIt\'s most of the plan.',
    38: 'SHREK: Stubborn sprout.\nI like it.',
    51: 'SHREK: We\'ll look for him.',
    92: 'SHREK: Spite, mostly.\nIt keeps.',
    98: 'SHREK: I don\'t smile. I\'ll\nsettle for going fast.',
    100: 'SHREK: I\'m sorry. He did right\nby you. Plant them deep.'
  },
  218: {
    57: 'SHREK: Search. I\'ll stand\nhere and not touch things.',
    68: 'SHREK: My swamp was under\nthat. All of it.',
    74: 'SHREK: Aye. I saw it too.',
    79: 'SHREK: Right. Somebody\'s\ngoing to pay for my swamp.',
    82: 'SHREK: Proto Dome. Cheerful\nplace, I bet.'
  },
  219: {
    12: 'SHREK: I\'ve seen tomorrow.\nYou did a rotten job.'
  },
  221: {
    4: 'SHREK: L and R, then A.\nNo bashing? Fine.'
  },
  226: {
    35: 'SHREK: You think. That\'s\nthe part I listen for.',
    38: 'SHREK: Then they were wrong.',
    40: 'SHREK: Small tools. Big hammer\nstays with me.',
    46: 'SHREK: It\'s all right, lad.\nThe face is permanent.',
    50: 'SHREK: I talk to one daily.\nHe\'s got a point.',
    66: 'SHREK: No more waiting alone.',
    75: 'SHREK: You don\'t owe us. But\nI won\'t turn down a doorman.',
    85: 'SHREK: Not me. I\'d use a\nhammer. Donkey might.',
    92: 'SHREK: Your answer, lad.\nTake your time.',
    97: 'SHREK: Good. You\'re the only\none who asked first.',
    99: 'SHREK: You\'re Pinocchio.\nThat\'s enough for us.'
  },
  230: {
    44: 'SHREK: He\'s the only one\nhere that works.',
    48: 'SHREK: Hands off! I know\nyour hinges.',
    54: 'SHREK: I\'ve been removed by\nbetter. You\'re kindling.',
    59: 'SHREK: I\'ve got him. Gently,\nDonkey.'
  },
  464: {
    106: 'SHREK: A swamp. Then a fair.\nThen it got complicated.',
    112: 'SHREK: Three at a time.\nBest rule I\'ve heard all trip.',
    114: 'SHREK: Somebody stays with\nthe kettle. Don\'t all cheer.',
    122: 'SHREK: The end of the world\'s\nin a bucket. Of course it is.',
    124: 'SHREK: Guy Fieri? If this is\ntable manners, I am out.',
    133: 'SHREK: I picked you so I\ncould keep an eye on you.',
    139: 'SHREK: Magnificent is fine.\nQuiet is better.',
    142: 'SHREK: Good. Stand in front.\nAll of the front.',
    146: 'SHREK: I needed someone to\nreach the low shelves.',
    209: 'SHREK: Aye. I\'m here.\nYou came and got me.',
    210: 'SHREK: I died to get out of\nthat speech. Nearly worked.',
    211: 'SHREK: It is, lad.',
    212: 'SHREK: You can have the next\none. I\'m not doing it twice.',
    213: 'SHREK: Easy, Mongo! My ribs\njust came back.',
    214: 'SHREK: Missed you too.',
    215: 'SHREK: Not a word. Thanks,\nSteve. For all of it.',
    217: 'SHREK: Saving a swamp? At last,\na sensible quest.',
    223: 'SHREK: Friend. I\'ve been\ncalled worse. We\'ll go.',
    224: 'SHREK: We\'ll give it one.\nThen breakfast.'
  },
  465: {
    135: 'SHREK: I\'ve got the appetite.\nThe learning, we\'ll see.',
    139: 'SHREK: That wasn\'t magic.\nThat was the onions.',
    144: 'SHREK: Three laps? I hoped\nfor three lunches.',
    146: 'SHREK: I walked in a circle.\nI\'m exactly where I started.',
    148: 'SHREK: Magic. As if I wasn\'t\nenough trouble with an axe.'
  },
  33: {
    213: 'SHREK: “Great” and “Farquaad.”\nPick one.',
    215: 'SHREK: You missed a spot.\nIt\'s the whole floor.',
    217: 'SHREK: Leave them up.\nFeels like home.'
  },
  35: {
    182: 'SHREK: I\'ve been shown better\ndoors by worse people.',
    184: 'SHREK: Funny what a thumping\ndoes for the memory.',
    186: 'SHREK: I\'ve tried both.\nNeither took.'
  },
  36: {
    165: 'SHREK: Sorry. Your cupboard\'s\nnicer than my house.',
    168: 'SHREK: Suspicious of strangers.\nMy kind of town.',
    170: 'SHREK: Soup first. Best plan\nanyone\'s had all week.',
    172: 'SHREK: You\'re a good neighbor.\nI\'ve met the other kind.',
    208: 'SHREK: Proper door this time.\nMostly on purpose.'
  },
  39: {
    185: 'SHREK: Big and green. The\nperfect spy. Nobody notices.',
    189: 'SHREK: The shelves never\nrefused to serve me.',
    191: 'SHREK: First free thing\nin the whole shop.'
  },
  42: {
    231: 'SHREK: One. I guard my onions\nthe same way.'
  },
  47: {
    235: 'SHREK: A world on fire, all\nyours. Check the “on fire” bit.',
    239: 'SHREK: Thump Farquaad, save\nthe world. I\'d do it for less.',
    242: 'SHREK: Ruining evenings.\nFinally, my line of work.'
  },
  123: {
    175: 'SHREK: Panic into a pot.\nThe bridge needs feeding.'
  },
  135: {
    56: 'SHREK: I\'ll go and ask the\nchef. I won\'t eat it on the way.\nMuch.',
    65: 'SHREK: Tell him yourself.\nI\'m not delivering a review.',
    74: 'SHREK: Same as houseguests.\nKeep throwing them out.',
    87: 'SHREK: Small? You work for\nFarquaad. Mind your words.',
    92: 'SHREK: A centerpiece. He\'s\nsetting a table with bones.',
    96: 'SHREK: Aim for the bony bits.\nSo, anywhere.'
  },
  136: {
    58: 'SHREK: Staying in and counting\nthings. You\'d make an ogre.',
    192: 'SHREK: Fair trade. Portrait,\nstop scaring guests.',
    193: 'SHREK: My walls have mold that\ndoes that. No complaints.'
  },
  137: {
    61: 'SHREK: Nobody\'s managed it yet.\nPlenty have tried.',
    63: 'SHREK: Three lieutenants to\nreach the top shelf for him.'
  },
  138: {
    82: 'SHREK: Louder than the wind.\nThey\'ve not met Donkey.',
    96: 'SHREK: Eye Lasers. I was\nsaving those for Donkey.'
  },
  40: {
    104: 'SHREK: I\'ll take the defending\nkind. My shelves are fine.',
    116: 'SHREK: A mountain, two clowns\nand a sad cat. Long week.',
    125: 'SHREK: Dreamstone. Of course\nit isn\'t just glue.',
    131: 'SHREK: “When.” Ask me when.\nThen sit down.',
    135: 'SHREK: All that for a hatchet.\nIt had better chop.',
    164: 'SHREK: Best report. Only\nthree sentences.'
  },
  41: {
    152: 'SHREK: All my noises are\nplanned.',
    153: 'SHREK: Wood, minding a fire.\nYou take your time, lad.'
  },
  73: {
    26: 'SHREK: He asked you to live, Puss.\nYou have kept that promise.',
    36: 'SHREK: He would be proud\nof the cat standing here.'
  },
  141: {
    112: 'SHREK: No lessons. I came\nfor the cat, not the act.',
    115: 'SHREK: Hiding in a hole. I do\nthat. It doesn\'t help.',
    116: 'SHREK: Then I\'ll take the\nhat. It showed up last time.',
    120: 'SHREK: Find it first. Sulk\nabout it after.',
    135: 'SHREK: Think quietly. I sleep\nloud.',
    162: 'SHREK: He can wait a bit more.\nHe\'s not going to grow.',
    163: 'SHREK: Aye. That\'s why you\'re\ngoing in front.'
  },
  151: {
    14: 'SHREK: I don\'t have hair.\nI\'m here about a hatchet.',
    18: 'SHREK: There\'s two of them.\nOf course there\'s two.',
    22: 'SHREK: I don\'t want to be a\nlegend. I want the hatchet.',
    25: 'SHREK: Ask Donkey. Bring a\nchair and lunch.',
    29: 'SHREK: Then he\'s heard the\nmagnets question too.',
    34: 'SHREK: Two clowns in one.\nSame amount of noise.',
    38: 'SHREK: Don\'t say “our people.”\nI came for the hatchet.',
    39: 'SHREK: It\'s a hatchet.\nIt\'ll take care of us.'
  },
  165: {
    3: 'SHREK: Small man. Huge\nstepladder budget.'
  },
  166: {
    6: 'SHREK: Under contract. So\nthey stop at five o\'clock.'
  },
  169: {
    18: 'SHREK: Leave Bram out of it.\nHe earned better.',
    21: 'SHREK: You\'ve miscounted.\nI\'m the big green one.'
  },
  170: {
    64: 'SHREK: He\'s heard worse.\nMostly from me.'
  },
  173: {
    32: 'SHREK: Good. Stand next to\nme. I\'m safe.',
    38: 'SHREK: Rooms have looked at me\nfunny my whole life.',
    40: 'SHREK: No thanks. I\'m already\nas pretty as I\'m getting.'
  },
  174: {
    73: 'SHREK: You\'re collecting\na muffin. Think about that.',
    76: 'SHREK: Those fixtures?',
    82: 'SHREK: Good. Let him stand\non something while he waits.'
  },
  172: {
    87: 'SHREK: The hat\'s taller than\nyou. That\'s what stings.',
    102: 'SHREK: It eats the world and\nyou rang the dinner bell.',
    110: 'SHREK: Put it in writing.\nUse small letters.',
    112: 'SHREK: Grab hold of me!'
  },
  177: {
    145: 'SHREK: Me again. I\'m going\nto touch everything.',
    151: 'SHREK: We rummage. He\nsupervises. From down there.'
  },
  178: {
    155: 'SHREK: Then so did we.\nSame rules.'
  },
  273: {
    1: 'SHREK: Second worst. Duloc\'s\nhad a song.',
    18: 'SHREK: Nobody keeps Shrek.\n...Put me down first.',
    29: 'SHREK: Nobody baked me.\nThe rest, aye. Same.',
    30: 'SHREK: A swamp. A long way\noff. Longer than you think.',
    37: 'SHREK: Brought them. Lead on.'
  },
  275: {
    163: 'SHREK: Tell the gumdrops\nit\'s fine. You, I\'m watching.',
    241: 'SHREK: Promise kept. Most\ncrumbs too.',
    243: 'SHREK: We\'ll bring him back.\nHe\'s hard to lose.'
  },
  276: {
    45: 'SHREK: It keeps the smell in.\nYou\'re welcome.',
    132: 'SHREK: Thanks. Donkey, no\nshortcuts.',
    236: 'SHREK: You are safe here.\nStay near the others.'
  },
  279: {
    55: 'SHREK: He found us. I don\'t\ncollect people. They stick.',
    106: 'SHREK: My head says it still\nis. Keep your voice down.',
    107: 'SHREK: That loaf had a ribbon.',
    114: 'SHREK: You had one job.\nIt was a key.',
    119: 'SHREK: Aye. He\'s easy to\nfind. Look up.',
    218: 'SHREK: Gingerbread, running\nat a fire. Come on.'
  },
  280: {
    63: 'SHREK: Better than most welcomes.\nAnd all prisons.',
    68: 'SHREK: Eat first, Mongo. Dance\nunder protest.',
    69: 'SHREK: One evening. Then I\nwant them back.',
    77: 'SHREK: Amateur. Stand back.',
    84: 'SHREK: I\'ve met her sort.\nUsually they\'re shorter.',
    93: 'SHREK: An eating contest.\nYou poor, sweet biscuit.'
  },
  282: {
    9: 'SHREK: Next time, ask badly.\nIt still counts.',
    13: 'SHREK: I\'ve been robbed by\nworse. You said sorry.',
    15: 'SHREK: So it\'s been stolen\ntwice. Popular key.',
    19: 'SHREK: He will. I\'ll carry\nthe ones he drops.'
  },
  289: {
    144: 'SHREK: Donkey made it. Got\nan afternoon? Thought not.',
    147: 'SHREK: Pressure. On an ogre.\nBring more of it.',
    149: 'SHREK: You did point it at us.',
    152: 'SHREK: So is my patience.',
    157: 'SHREK: Aye. I\'m carrying\nthe key this time.'
  },
  295: {
    4: 'SHREK: Aye. That\'s every\nplace we go. Lead on.',
    6: 'SHREK: For once, aye.\nDon\'t get used to it.',
    8: 'SHREK: Right. I wasn\'t\ngoing to argue with you.',
    10: 'SHREK: Ready. Hat on tight.',
    11: 'SHREK: Now, these flying\nthings. Do they take ogres?'
  },
  299: {
    100: 'SHREK: He usually is.\nDon\'t tell him. Go home.'
  },
  302: {
    85: 'SHREK: I\'m not a delivery.\nI\'m a complaint.',
    91: 'SHREK: You\'re a biscuit.\nBreaking locks is my job.',
    99: 'SHREK: Lead on. If it\'s\nbiscuit-sized, I\'ll widen it.'
  },
  304: {
    94: 'SHREK: That\'s what the\nfirst one said.',
    95: 'SHREK: Aye. Through you.\nIt\'s the short way.'
  },
  301: {
    66: 'SHREK: One of them\'s standing\nnext to me. He\'s bigger.',
    73: 'SHREK: We keep them warm.\nYou keep losing.',
    78: 'SHREK: Everyone onto the drakes!',
    86: 'SHREK: You offered, Mongo.\nI can\'t carry an oven.'
  },
  261: {
    105: 'SHREK: Aye. It\'s a big target.\nHard to miss.'
  },
  241: {
    33: 'SHREK: Sealed door. Got it.\nRest, Keeper.'
  },
  242: {
    25: 'SHREK: I\'ll be kind. She\nbreathes fire. It\'s easy.'
  },
  243: {
    28: 'SHREK: Easy, girl. Nobody is\nputting you back in there.',
    39: 'SHREK: I\'ll sit. She steers.\nThat\'s the arrangement.',
    41: 'SHREK: Friend. Got it. Buttons\nare harder.'
  },
  367: {
    96: 'SHREK: She\'s got a temper\nand so have I. Come on.'
  },
  377: {
    125: 'SHREK: That throne has teeth,\nRumpel. And a husband.'
  },
  472: {
    25: 'SHREK: Aye. And mine\'s\nat home, with the door shut.',
    26: 'SHREK: First thing that\nMuffin\'s done for me.',
    27: 'SHREK: Together, lad.',
    28: 'SHREK: Destiny\'s a muffin.\nSharper than that will do.',
    29: 'SHREK: Aye. Nobody move\nthe big one. He\'s cover.',
    30: 'SHREK: We agree, Farquaad.\nWorrying.'
  },
  432: {
    25: 'SHREK: Aye. And mine\'s\nat home, with the door shut.',
    26: 'SHREK: First thing that\nMuffin\'s done for me.',
    27: 'SHREK: Together, lad.',
    28: 'SHREK: Destiny\'s a muffin.\nSharper than that will do.',
    29: 'SHREK: Aye. Nobody move\nthe big one. He\'s cover.',
    30: 'SHREK: We agree, Farquaad.\nWorrying.'
  },
  382: {
    95: 'SHREK: Sorted by usefulness.\nI\'d not make the first pile.',
    120: 'SHREK: I\'ve stood against\nworse. Shorter, mostly.',
    134: 'SHREK: Hit the heart with\nthe hatchet. My kind of plan.'
  },
  401: {
    10: 'SHREK: Forest beats a stamp.\nSmells better too.',
    15: 'SHREK: Knows too much and\nfits nowhere. I\'d watch him.',
    24: 'SHREK: Quietly. You\'ve\nnot met my friends.'
  },
  415: {
    139: 'SHREK: Behind me, lass.\nI\'m built like a wall.',
    148: 'SHREK: Aye! One swing.\nI don\'t do delicate.',
    149: 'SHREK: It\'s a hatchet, Donkey.\nEverything\'s an off-switch.',
    150: 'SHREK: Wood power. Aye, lad.\nStand clear of the axe.',
    151: 'SHREK: Striking! No finesse.\nLook away, Puss.',
    152: 'SHREK: It\'s not little.\nYou\'re just enormous.',
    161: 'SHREK: Now she tells me.'
  },
  466: {
    25: 'SHREK: Aye. And mine\'s\nat home, with the door shut.',
    26: 'SHREK: First thing that\nMuffin\'s done for me.',
    27: 'SHREK: Together, lad.',
    28: 'SHREK: Destiny\'s a muffin.\nSharper than that will do.',
    29: 'SHREK: Aye. Nobody move\nthe big one. He\'s cover.',
    30: 'SHREK: We agree, Farquaad.\nWorrying.',
    38: 'SHREK: In through the crust.\nI\'ve eaten pies the same way.',
    39: 'SHREK: We did that. You\nhelped. Somewhat.',
    40: 'SHREK: So do my eyes, lad.\nIt\'s a very big hole.',
    41: 'SHREK: Nobody else is up\nhere, Puss. It was us.',
    42: 'SHREK: Good hole, Mongo. Do\nnot eat it.',
    43: 'SHREK: Do I look like I\'m\ncelebrating?',
    44: 'SHREK: Aye. Things I hit\nonce tend to need twice.',
    45: 'SHREK: Your nose is the\nsmartest part of you. Go on.',
    46: 'SHREK: So the filling\'s\nalive. Lovely.',
    47: 'SHREK: Don\'t look at me.\nMine don\'t fight back.',
    48: 'SHREK: Then we hit\nthe strong part.',
    49: 'SHREK: You\'d know. You\nwoke it up.',
    50: 'SHREK: Together, Fiona. Home\nfor supper after.',
    51: 'SHREK: You\'ve said worse\nsentences. Daily. In.',
    52: 'SHREK: To the starter, lad.\nStraight through.',
    53: 'SHREK: Then we unwrap it.\nBoots first.',
    54: 'SHREK: Good. I\'m right\nbehind you. It\'s safer.',
    55: 'SHREK: After you. You\'ll fit\nthrough the small gaps.'
  }
};
