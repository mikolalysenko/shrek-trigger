import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from './helpers.mjs';
import {dialogue} from '../content/dialogue.js';
import {shrekReplies} from '../content/shrek-dialogue.js';
import {decompress} from '../engine/compression.js';
import {carnivalEvent} from '../engine/carnival.js';
import {u16,u24} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';

const b=await build(),layouts=JSON.parse(await readFile('content/event-layouts.json')),decisionManifest=JSON.parse(await readFile('content/dialogue-decisions.json'));
const dictionary=[];
for(let i=0;i<127;i++){
  const a=0x1e0000+u16(b.base,0x1efa00+i*2);
  dictionary.push(b.base.subarray(a+1,a+1+b.base[a]));
}
const symbols=['!','?','/','“','”',':','&','(',')',"'",'.',',','=','-','+','%','♪',' ','♥','…'];
function originalText(address){
  let out='';
  function emit(code){
    if(code>=0xa0&&code<0xba)out+=String.fromCharCode(code-0xa0+65);
    else if(code>=0xba&&code<0xd4)out+=String.fromCharCode(code-0xba+97);
    else if(code>=0xd4&&code<0xde)out+=String.fromCharCode(code-0xd4+48);
    else if(code>=0xde&&code<=0xf2)out+=symbols[code-0xde];
    else if(code===0xff)out+=' ';
    else if(code===6||code===10||code===11||code===12)out+='\n';
    else if((code>=13&&code<=15)||(code>=19&&code<=32))out+='{argument}';
    else if(code>=0x21&&code<0xa0)for(const x of dictionary[code-0x21])emit(x);
  }
  for(let p=address;p<b.base.length;){
    const code=b.base[p++];if(code===0)break;
    if([1,2,3,18].includes(code)){const operand=b.base[p++];if(code===3&&operand===0)break;out+='{argument}';continue;}
    emit(code);
  }
  return out;
}
function choiceRows(text,{original=false}={}){
  // Native option lists are contiguous rows indented by three spaces (the
  // first row can have six or seven). Wider indentation centers rewards and narration.
  // Racing's equally indented controller help is not a third selection.
  const rows=text.replace(/\{(?:page|full|page3)\}/g,'\n').split('\n').filter(row=>!original||!row.includes('L & R change perspective'));
  let best=[],current=[];
  for(const row of rows){
    if(/^ {3,7}(?:\S|$)/.test(row))current.push(row.trim());
    else{if(current.length>best.length)best=current;current=[];}
  }
  if(current.length>best.length)best=current;
  return best.length>=2?best:[];
}

test('every native dialogue selection retains its option count across the whole game',()=>{
  let selections=0;const mismatches=[];
  for(const layout of layouts)for(const s of layout.strings){
    const before=choiceRows(originalText(s.address),{original:true}),after=choiceRows(dialogue[layout.location]?.[s.id]??'');
    if(before.length)selections++;
    if(before.length!==after.length)mismatches.push({location:layout.location,id:s.id,before,after});
  }
  assert.ok(selections>=140,'the audit covers the complete native selection inventory');
  assert.deepEqual(mismatches,[]);
});

test('dialogue rewrites preserve every native event branch instruction',()=>{
  const separatelyVerifiedEvents=new Set([0,344,464,465,474]); // title, Kodiak storeroom, resurrection, greeter lesson room and Dragon-dive scripts have their own complete checks
  const presentationOnlyChanges={
    // Rooms 1, 2, 80, 85 and 125 also carry the empty-house edits (engine/home-event.js).
    1:[618,1334,1346,1347,1371,1372,1427,1428,1429,1467,1468,1469,1470,1471,1472,1473,1474,1475,1476,1478,1481,1488,1489,1490,1499,1509,1510],2:[883,1311,1651,2371],5:[2134,2383,2417],151:[2233,2394],
    282:[1666,1667,1668,1669,2195,2196,2214,2215,2226,2227],
    // Rooms 4, 8, 9, 80, 81 and 125 load Ma, Beans and young Donkey on their own NPC rows (engine/donkey-family.js).
    4:[941,1097,1200],8:[1405],9:[367,418],81:[2329],
    80:[3103,3116,3160,3193,3201,3202,3203,3204,3205],85:[3393],125:[995,1472],
    243:[1628], // hangar seat actor drawn behind the floor (dragonHangarEvent)
  };
  for(const layout of layouts){
    if(separatelyVerifiedEvents.has(layout.location))continue;
    const source=decompress(b.base,layout.eventPointer).bytes,expected=carnivalEvent(source,layout.location),now=decompress(b.rom,cartridgeOffset(u24(b.rom,0x3cf9f0+layout.eventId*3),b.rom)).bytes;
    assert.equal(now.length,expected.length,`event length ${layout.location}`);
    const changed=new Set(layout.tableCommands.flatMap(p=>[p+1,p+2,p+3])),unexpected=[];
    for(let i=0;i<expected.length;i++)if(!changed.has(i)&&now[i]!==expected[i])unexpected.push(i);
    assert.deepEqual(unexpected,presentationOnlyChanges[layout.location]??[],`native branch bytes ${layout.location}`);
  }
});

test('every adapted choice matches its native first and last row mask',()=>{
  const mismatches=[];
  for(const decision of decisionManifest){
    const text=dialogue[decision.location]?.[decision.id];if(!text)continue;
    const rows=text.replace('{null}','').split(/\{(?:page|full|page3)\}/).at(-1).split('\n'),selected=rows.flatMap((row,i)=>/^ {3,7}(?:\S|$)/.test(row)?[i]:[]);
    if(selected[0]!==decision.first||selected.at(-1)!==decision.last)mismatches.push({location:decision.location,id:decision.id,expected:[decision.first,decision.last],actual:[selected[0],selected.at(-1)]});
  }
  assert.deepEqual(mismatches,[]);
});

test('every adapted selection fits the native final-page choice window',()=>{
  let checked=0;const invalid=[];
  for(const[location,strings]of Object.entries(dialogue))for(const[id,text]of Object.entries(strings)){
    const options=choiceRows(text);if(!options.length)continue;
    const rows=text.replace('{null}','').replace('\nL and R change the viewpoint.','').split(/\{(?:page|full|page3)\}/).at(-1).split('\n'),selected=rows.flatMap((row,i)=>/^ {3,7}(?:\S|$)/.test(row)?[i]:[]),expected=Array.from({length:options.length},(_,i)=>rows.length-options.length+i);
    checked++;
    if(JSON.stringify(selected)!==JSON.stringify(expected))invalid.push({location,id,rows,selected,expected});
  }
  assert.ok(checked>=140,'covers every adapted selection');
  assert.deepEqual(invalid,[]);
});

test('Fiona pendant and recruitment choices occupy their exact native selectable rows',()=>{
  const page=id=>dialogue[439][id].replace('{null}','').split(/\{(?:page|full|page3)\}/).at(-1).split('\n');
  assert.deepEqual(page(41).slice(1,3),['   Yes.','   No.']);
  assert.deepEqual(page(43).slice(2,4),['   Sure.','   Sorry.']);
  assert.deepEqual(page(44).slice(2,4),['   All right.','   No.']);
  assert.match(dialogue[439][59],/Fiona[\s\S]*fair\nvendors/,'the setup hint names Fiona and the fair vendors');
});

test('no conditional Shrek reply is attached to a native selection',()=>{
  for(const[location,replies]of Object.entries(shrekReplies))for(const id of Object.keys(replies))assert.equal(choiceRows(dialogue[location]?.[id]??'').length,0,`Shrek reply ${location}:${id}`);
});
