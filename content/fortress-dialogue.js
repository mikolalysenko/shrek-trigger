import{carnivalDialogue}from'./carnival-dialogue.js';
const hideoutWelcome={
 145:'HORNER: Welcome to my private\ncollection. No touching anything.{page}Wait. You again?!{null}',
 146:'HORNER: Absolutely not!{null}',
 147:'HORNER: Lord Farquaad?\nWith them?{null}',
 148:'HORNER: Oh, and the rest of you.{null}',
 149:'HORNER: Staff! Handle this!{null}',
 150:'FARQUAAD: Still hoarding trinkets,\nHorner? How ambitious.{null}',
 151:'HORNER: You promised me magic!\nA whole kingdom of it!\nNow you bring these people here\nto rummage through my things?{null}',
 152:'HORNER: What happened to our deal?\nI got that one in writing!{null}'
};
const mothRematch={
 153:'MOTH WITCH: Stand back, Horner.\nI will dim their little lights.{null}',
 159:'HORNER: You persistent little...{page}My staff will make you regret\nevery door you opened!{null}',
 160:'HORNER: Moth Witch!{null}',
 162:'MOTH WITCH: You called?{null}',
 163:'MOTH WITCH: Lord Farquaad.\nHiding among the uninvited?\nHow very small of you.{null}',
 164:'MOTH WITCH: Back again?\nI had almost stopped loathing you.{null}',
 165:'HORNER: Do something useful!{null}',
 166:'MOTH WITCH: Come closer.\nThe wings are the harmless part.{null}',
 167:'MOTH WITCH: This is not over!\nThere is always another lamp.{null}'
};
const complaint={69:'HORNER: This costs money!{null}',70:'HORNER: They had warranties!{null}'};
export const fortressDialogue={
 162:hideoutWelcome,
 163:carnivalDialogue[163],
 164:{
  1:'Sealed by an unfamiliar power.{null}',
  2:'Found 1 {item}!{null}',
  199:'A warning scratched into the wall:{full}The fortress jugglers change\ntheir guard when you attack.\nWatch which defense they raise.{null}',
  200:'PUSS: You wield real magic.\nWho taught you?{null}',
  201:'Guy Fieri teaches magic at the\nEnd of Time. Go see him. He\'s\nloud, but he knows his stuff.{null}',
  202:'PINOCCHIO: Guy can help you\nat the End of Time.\nHe will shout. That is normal.{null}'
 },
 165:{
  2:'PUSS: There it stands.{null}',
  3:'PUSS: Farquaad\'s fortress.\nA monument to a very small man.{null}'
 },
 166:{
  4:'PUSS: Jack Horner!{null}',
  5:'HORNER: Puss! Still wearing the hat?\nHave your friends heard about Bram?\nOr do you save that for strangers?{page}Farquaad is busy with his ritual.\nYou can deal with his staff.\nI\'m in charge of magical assets.{page}The Briar Knight handles blades.\nThe Moth Witch handles persuasion.\nSHREK: And I handle doors.{null}',
  6:'HORNER: One hundred beasts.\nAll under contract.\nLet\'s see how far you get!{null}'
 },
 167:{
  67:'HORNER: Welcome to the next floor.{null}',
  68:'HORNER: Mind the machinery.\nIt has a very sharp learning curve.{null}',
  ...complaint
 },
 168:{...complaint},
 169:{
  0:'Found 1 {item}!{null}',
  7:'Please help us...{null}',
  8:'Let us out of here!{null}',
  9:'...{null}',
  16:'BRIAR KNIGHT: You broke my guards.\nTheir formation needed work.{null}',
  17:'PUSS: Still polishing your armor\nwhile others do the fighting?{null}',
  18:'BRIAR KNIGHT: Still making jokes?\nBram always stood between you\nand the consequences.{page}He is not here to do that now.{null}',
  19:'BRIAR KNIGHT: You would make\na fine addition to the guard.{null}',
  20:'BRIAR KNIGHT: Enough talk.\nI have been waiting for this.{null}',
  21:'BRIAR KNIGHT: No Bram.\nNo rescue. Just you and my blade.{null}',
  22:'BRIAR KNIGHT: Draw, then!{null}',
  23:'BRIAR KNIGHT: Impossible...\nI kept my oath to Farquaad...{null}',
  24:'BRIAR KNIGHT: What was it worth...?{null}',
  123:'PUSS: Fear me, if you dare!{delay 6}{delay 0}',
  124:'BRIAR KNIGHT: At last.\nA worthy target.{delay 12}{delay 0}'
 },
 170:{
  60:'HORNER: I have had quite enough!{null}',
  61:'HORNER: Moth Witch!{null}',
  62:'HORNER: Briar Knight!{null}',
  63:'PUSS: Your staff is indisposed.\nPerhaps you should answer the door.{null}',
  64:'HORNER: You boot-wearing furball!{null}',
  65:'HORNER: Jack...{page}Jack needs a better exit!{null}',
  66:'PUSS: Run, then! I enjoy a chase!{null}'
 },
 171:{
  0:'Found 1 {item}!{null}',9:'...{null}',10:'Hee hee... hee.{null}',11:'Play with us?{null}',12:'Such shiny treasure...{null}',
  13:'Would you like our treasure?\n   Yes.\n   No.{null}',
  14:'We kept the best things for you.{null}',
  15:'Then stay a little longer.{full}Play with us.\nPlease.\nForever would be nice.{null}',
  177:'Empty!{null}'
 },
 172:carnivalDialogue[172],
 173:{
  1:'Found 1 {item}!{null}',
  25:'PUSS: The Moth Witch, I presume?{null}',
  26:'PUSS: A decoy!\nWhere is the real witch?{null}',
  27:'Look up.\nYou never look up.{null}',
  28:'Miss me, little swordsman?{null}',
  29:'FIONA: The moth?{null}',
  30:'DONKEY: A moth just laughed at us!{null}',
  31:'PINOCCHIO: That moth changed shape.\nMoths should not do that.{null}',
  32:'PUSS: The Moth Witch.\nEvery pretty thing in this room\nis probably a trap.{null}',
  33:'MOTH WITCH: Pretty?\nI worked hard on terrifying.{null}',
  34:'FIONA: Terrifying? I\'ve seen\nscarier things in Shrek\'s sink.{null}',
  35:'DONKEY: I was terrified.\nVery supportive over here.{null}',
  36:'PINOCCHIO: I was not frightened.\nDo not look at my nose.{null}',
  37:'MOTH WITCH: A wingbeat, a whisper,\na harmless little light...\nThat is all it takes\nto make someone step closer.{null}',
  38:'MOTH WITCH: Bram saw through\nillusions. You hid behind him.{page}Let us see how brave you are\nwhen the room looks back.{null}',
  39:'MOTH WITCH: You brought friends.\nHow thoughtful.{null}',
  40:'MOTH WITCH: Let me enchant them.{null}',
  41:'MOTH WITCH: My wings...{page}Lord Farquaad...{null}',
  125:'MOTH WITCH: Such willing visitors.{delay 6}{delay 0}',
  126:'MOTH WITCH: Follow the light...{delay 6}{delay 0}'
 },
 174:{
  69:complaint[69],
  72:'PUSS: Nowhere left to run, Horner.{null}',
  73:'HORNER: You have no idea\nwhat Farquaad is summoning.{page}The greatest source of magic\nthe world has ever known!{page}Wait until the Muffin rises!{null}',
  74:'HORNER: This barrier is priceless!\nNo attack can break it!{null}',
  75:'HORNER: Worth every stolen toenail!{null}',
  76:'HORNER: Watch where you aim!\nThe fixtures are irreplaceable!{null}',
  77:'HORNER: Keep trying!{null}',
  78:'HORNER: What was that click?{null}',
  79:'FIONA: A very expensive mistake.{null}',
  80:'DONKEY: He forgot to buy a floor.{null}',
  81:'PINOCCHIO: Structural failure.\nThe barrier appears unharmed.{null}',
  82:'PUSS: Hurry! Farquaad awaits!{null}',
  127:'HORNER: You again?!{delay 6}{delay 0}'
 },
 175:{...complaint,71:'HORNER: That comes from wages!{null}'},
 177:hideoutWelcome,
 178:{
  149:hideoutWelcome[149],154:'HORNER: Welcome back!{null}',
  155:'HORNER: Common thieves!\nThose treasures belong to me!{page}I stole them fair and square!{null}',
  156:'HORNER: Here comes the staff!{null}',157:'HORNER: Jack\'s in a jam...{null}',158:'HORNER: Jack needs new staff!{null}'
 },
 179:{
  149:hideoutWelcome[149],157:'HORNER: Jack\'s in a jam...{null}',172:'HORNER: Jack didn\'t plan for this!{null}',
  177:'HORNER: Come along, little fools.{null}',
  178:'HORNER: Right where I wanted you!{null}',
  179:'HORNER: Don\'t you want that chest?\nGo on. It\'s very inviting.{null}',
  180:'Treasure! All for me!{null}',181:'Shiny things!{null}',255:'Found 1 {item}!{null}'
 },
 180:{
  171:'HORNER: This is outrageous!\nI was such a good boy!{null}',
  182:'HORNER: Not so fast.\nWe saved our best equipment.{null}',
  183:'HORNER: HornerCorn!{null}',184:'MOTH WITCH: SilkPjs!{null}',185:'BRIAR KNIGHT: ReedBetwn!{null}',
  186:'HORNER: Unique collector\'s items!\nMint condition! We are\npractically invincible!{null}'
 },
 181:{
  178:'HORNER: Right where I wanted you!{null}',
  187:'HORNER: I cannot lose!\nWhat would become of my collection?\nOther people might enjoy it!{null}',
  188:'HORNER: Farquaad!\nYou promised me a kingdom of magic!\nYou used me!{full}FARQUAAD: You were useful.\nBriefly.\nDo listen for the approaching end.{null}',
  189:'FARQUAAD: Your contract expired.\nTry keeping up.{null}',
  190:'HORNER: Never!\nYou will never take what is mine!{null}',
  191:'HORNER: Farewell, unwelcome guests!\nOne pull of my thumb and...{null}',
  192:'HORNER: No! Bad kitty!\nNot THAT switch!{null}',
  193:'FIONA: He stuck in his thumb\nand pulled out a cat.{null}',
  194:'DONKEY: All that magic, and he\nloses to a CAT. Don\'t tell Puss.{null}',
  195:'PINOCCHIO: His collection\nlacked a working safety switch.{null}',
  196:'PUSS: An excellent cat.\nNot as excellent as me, of course.{null}',
  197:'MONGO: Cat smart.\nBig man fall down.{null}'
 },
 182:mothRematch,183:mothRematch,
 184:{
  161:'HORNER: Briar Knight!{null}',
  168:'BRIAR KNIGHT: You called?{null}',
  169:'HORNER: Still here?{page}My knight will show you the door.\nPossibly in several pieces.{null}',
  170:'HORNER: Do not disappoint me!{null}',
  173:'BRIAR KNIGHT: You broke my guard\nonce. I have sharpened my answer.{null}',
  174:'BRIAR KNIGHT: The first defeat\nwas instruction.\nThis one will be yours.{null}',
  175:'BRIAR KNIGHT: Ready?{null}',176:'BRIAR KNIGHT: Not again...{null}'
 }
};
