import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,bedroom} from '../tests/helpers.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {snapshot,restore} from '../engine/save.js';
import {runFrames} from '../engine/automation.js';
import {decompress} from '../engine/compression.js';
import {u16,u24} from '../engine/rom.js';
import {cartridgeOffset} from '../engine/expanded-rom.js';

const built=await build(),sha=createHash('sha256').update(built.rom).digest('hex');
const specs=JSON.parse(await readFile('content/hooks.json','utf8'));
const s=await bedroom(built.rom),h=installHooks(s,specs),dev=createDevTools(s,h);
const report={sha256:sha,coverage:{},shops:[],naming:[],saveSlots:[],failures:[],complete:false};
const pixels=new Uint8Array(512*480*4),mask=new Uint8Array(512*480/8);
let dispatched=false,ended=false,base;
h.on('event.dispatch',e=>{
  if(e.scriptPC!==0x38d)return;
  if(e.opcode===0xc8)dispatched=true;
  if(e.opcode===0xb2)ended=true;
});
const gold=()=>u24(s.ram,0x2c53);
const setGold=value=>{s.ram[0x2c53]=value&255;s.ram[0x2c54]=value>>8&255;s.ram[0x2c55]=value>>16&255;};
const roster=()=>[...s.ram.subarray(0x2980,0x2983)];
const nameOf=id=>[...s.ram.subarray(0x2c23+id*6,0x2c29+id*6)];
const quantity=id=>{let n=0;for(let i=0;i<256;i++)if(s.ram[0x2400+i]===id)n+=s.ram[0x2500+i];return n;};
function nativeCheck(){
  if(s.cpu.stopped)throw Error('native CPU halted');
  const fatal=dev.diagnostics().fatal;if(fatal)throw Error(`native fatal: ${JSON.stringify(fatal)}`);
}
function capture(region=[24,40,488,432]){
  s.setPixels(pixels);mask.fill(0);let bright=0;
  const[x0,y0,x1,y1]=region;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const p=(y*512+x)*4;
    if(pixels[p]>210&&pixels[p+1]>210&&pixels[p+2]>210){const bit=y*512+x;mask[bit>>3]|=1<<(bit&7);bright++;}
  }
  return{bright,hash:createHash('sha256').update(mask).digest('hex')};
}
function glyphs(captureResult,minimum=20){
  if(captureResult.bright<minimum)throw Error(`only ${captureResult.bright} bright glyph pixels`);
}
function moved(before,after){
  if(before.hash===after.hash)throw Error('cursor input did not change native menu pixels');
}
function tap(button,gap=60){runFrames(s,3,button);runFrames(s,gap);nativeCheck();}
function openMenu(command){
  dispatched=false;ended=false;s.ram.set([0xc8,command,0xb2],0x1238e);runFrames(s,360);nativeCheck();
  if(!dispatched)throw Error(`C8 ${command.toString(16)} was not dispatched`);
  if(ended)throw Error(`C8 ${command.toString(16)} returned before input`);
}
function waitClosed(){
  for(let i=0;i<360&&!ended;i++)runFrames(s,1);
  nativeCheck();if(!ended)throw Error('native menu did not return to its B2 event command');
}
function closeShop(){tap(1);tap(1);tap(1);waitClosed();}
function shopIds(){
  const ids=new Set();
  for(let location=0;location<512;location++){
    const eventId=u16(built.base,0x360000+location*14+8);if(eventId===0xffff)continue;
    let event;try{event=decompress(built.rom,cartridgeOffset(u24(built.rom,0x3cf9f0+eventId*3),built.rom)).bytes;}catch{continue;}
    for(let p=0;p+1<event.length;p++)if(event[p]===0xc8&&event[p+1]>=0x80&&event[p+1]<=0x9f)ids.add(event[p+1]);
  }
  return[...ids].sort((a,b)=>a-b);
}
function runtimeShopList(){
  const items=[];for(let i=0;i<32&&s.ram[0x1000+i]!==0;i++)items.push(s.ram[0x1000+i]);
  if(!items.length)throw Error('native shop has an empty or unterminated item list');
  if(items.length===32)throw Error('native shop item list exceeds 32 entries');
  return items;
}
function romListOffset(items){return Buffer.from(built.rom).indexOf(Buffer.from([...items,0]));}
async function runCase(name,fn){
  try{
    restore(s,base);dispatched=false;ended=false;
    const result=await fn();nativeCheck();return result;
  }catch(error){report.failures.push({case:name,error:String(error?.message??error)});return null;}
  finally{restore(s,base);dispatched=false;ended=false;}
}
async function auditShop(id){
  return runCase(`shop ${id.toString(16)} buy/cancel`,async()=>{
    setGold(2000000);openMenu(id);const opened=capture();glyphs(opened);
    const internalId=s.ram[0xd13],beforeRight=capture([0,88,256,144]);tap(128);const afterRight=capture([0,88,256,144]);moved(beforeRight,afterRight);
    tap(64);tap(256,120);const listCapture=capture([16,88,208,320]);glyphs(listCapture);
    const items=runtimeShopList(),romOffset=romListOffset(items);if(romOffset<0)throw Error(`runtime item list is absent from ROM: ${items.join(',')}`);
    if(items.length>1){const beforeDown=capture([0,88,208,320]);tap(32);const afterDown=capture([0,88,208,320]);moved(beforeDown,afterDown);tap(16);}
    const item=items[0],price=u16(s.ram,0x6e00+item*2),goldBefore=gold(),quantityBefore=quantity(item);
    tap(256,120);tap(256,180);
    const goldAfter=gold(),quantityAfter=quantity(item);
    if(quantityAfter!==quantityBefore+1)throw Error(`buy item ${item}: quantity ${quantityBefore} -> ${quantityAfter}`);
    if(goldAfter!==goldBefore-price)throw Error(`buy item ${item}: gold ${goldBefore} -> ${goldAfter}, expected ${goldBefore-price} (price ${price})`);
    closeShop();
    return{id:id.toString(16).padStart(2,'0'),internalId,options:items.length,items,romOffset,glyphPixels:opened.bright,cursor:true,buy:{item,price,goldDelta:goldAfter-goldBefore,quantityDelta:1},closed:true};
  });
}
async function auditSell(){
  return runCase('shop 80 sell',async()=>{
    if(s.ram[0x2400]||s.ram[0x2500])throw Error('sell fixture inventory slot is occupied');
    s.ram[0x2400]=2;s.ram[0x2500]=2;openMenu(0x80);tap(128);tap(256,120);glyphs(capture());
    const price=u16(s.ram,0x6e00+2*2),goldBefore=gold();if(price<=0)throw Error('sell fixture has no native price');
    tap(256,120);tap(256,180);
    const proceeds=gold()-goldBefore,expected=Math.floor(price/2),remaining=quantity(2);
    if(remaining!==1)throw Error(`sell left quantity ${remaining}, expected 1`);
    if(proceeds!==expected)throw Error(`sell proceeds ${proceeds}, expected ${expected}`);
    closeShop();return{shop:'80',item:2,price,proceeds,quantityDelta:-1,closed:true};
  });
}
async function auditShopCancel(){
  return runCase('shop 80 cancel',async()=>{
    setGold(12345);const inventory=s.ram.slice(0x2400,0x2600),before=gold();openMenu(0x80);tap(1);waitClosed();
    if(gold()!==before)throw Error('cancel changed gold');
    if(!s.ram.subarray(0x2400,0x2600).every((v,i)=>v===inventory[i]))throw Error('cancel changed inventory');
    return{shop:'80',unchanged:true,closed:true};
  });
}
async function auditParty(replace){
  return runCase(`party ${replace?'replace':'cancel'}`,async()=>{
    const before=roster();if(before.join(',')!=='0,1,2')throw Error(`unexpected staged roster ${before}`);
    openMenu(0);const opened=capture();glyphs(opened,100);
    if(!replace){tap(1);waitClosed();if(roster().join(',')!==before.join(','))throw Error('cancel changed roster');return{cancel:true,roster:before};}
    const initial=capture([0,128,512,240]);tap(32);const down=capture([0,128,512,240]);moved(initial,down);tap(16);
    tap(256);tap(128);tap(256,120);
    const after=roster(),expected=[0,4,2];if(after.join(',')!==expected.join(','))throw Error(`native replacement produced ${after}, expected ${expected}`);
    tap(1);waitClosed();return{cursor:true,replacement:{from:1,to:4},roster:after,glyphPixels:opened.bright,closed:true};
  });
}
async function auditNaming(id){
  return runCase(`naming ${id}`,async()=>{
    const before=nameOf(id);openMenu(0xc0+id);const opened=capture();glyphs(opened,100);
    const initial=capture([48,152,176,224]);tap(128);const right=capture([48,152,176,224]);moved(initial,right);
    tap(8);waitClosed();const after=nameOf(id);
    if(!after.every((v,i)=>v===before[i]))throw Error(`Start changed name ${before} to ${after}`);
    return{id,command:(0xc0+id).toString(16),name:before,cursor:true,startConfirmed:true,glyphPixels:opened.bright};
  });
}
const changedBytes=(before,start,end)=>{let n=0;for(let i=start;i<end;i++)if(before[i]!==s.cart.sram[i])n++;return n;};
async function auditSave(slot){
  return runCase(`save slot ${slot+1}`,async()=>{
    const before=s.cart.sram.slice();openMenu(0x40);const opened=capture([32,48,480,240]);glyphs(opened,50);
    for(let i=0;i<slot;i++)tap(32);
    tap(256,240);const written=capture([32,48,480,432]);glyphs(written,50);moved(opened,written);
    // Each 0xA00-byte stride contains a 0x9E0-byte slot payload. Bytes at
    // 0x1FE0 and above are global slot-present flags and checksums.
    const selectedOffset=0x200+slot*0xa00,selectedChanges=changedBytes(before,selectedOffset,selectedOffset+0x9e0);
    if(selectedChanges<100)throw Error(`slot ${slot+1} changed only ${selectedChanges} SRAM data bytes`);
    const otherChanges=[];for(let i=0;i<3;i++)if(i!==slot){const offset=0x200+i*0xa00,n=changedBytes(before,offset,offset+0x9e0);if(n)otherChanges.push({slot:i+1,changed:n});}
    if(otherChanges.length)throw Error(`save slot ${slot+1} changed other slots: ${JSON.stringify(otherChanges)}`);
    tap(1);waitClosed();return{slot:slot+1,sramOffset:selectedOffset,changedBytes:selectedChanges,otherSlotChanges:0,cursor:slot>0,closed:true};
  });
}
async function auditSaveCancel(){
  return runCase('save cancel',async()=>{
    const before=s.cart.sram.slice();openMenu(0x40);tap(1);waitClosed();
    if(!s.cart.sram.every((v,i)=>v===before[i]))throw Error('cancel changed SRAM');return{unchanged:true,closed:true};
  });
}

try{
  dev.jump({id:2,x:8,y:8,party:[0,1,2]});runFrames(s,400);s.ram[0x1238e]=0xb2;runFrames(s,8);base=snapshot(s);nativeCheck();
  const ids=shopIds();if(ids.length!==22)throw Error(`expected 22 unique C8 80-9F shop IDs, found ${ids.length}: ${ids.map(x=>x.toString(16))}`);
  for(const id of ids){const result=await auditShop(id);if(result)report.shops.push(result);}
  report.sell=await auditSell();report.shopCancel=await auditShopCancel();
  report.partyReplacement=await auditParty(true);report.partyCancel=await auditParty(false);
  for(let id=0;id<8;id++){const result=await auditNaming(id);if(result)report.naming.push(result);}
  for(let slot=0;slot<3;slot++){const result=await auditSave(slot);if(result)report.saveSlots.push(result);}
  report.saveCancel=await auditSaveCancel();
  report.coverage={
    shops:{expected:ids.length,openedAndBought:report.shops.length,options:report.shops.reduce((n,x)=>n+x.options,0),romListsMatched:report.shops.filter(x=>x.romOffset>=0).length,sell:!!report.sell,cancel:!!report.shopCancel},
    party:{replacement:!!report.partyReplacement,cancel:!!report.partyCancel},
    naming:{expected:8,startConfirmed:report.naming.length},
    save:{expectedSlots:3,savedSlots:report.saveSlots.length,cancel:!!report.saveCancel}
  };
  report.complete=report.failures.length===0&&report.shops.length===22&&report.naming.length===8&&report.saveSlots.length===3&&!!report.sell&&!!report.shopCancel&&!!report.partyReplacement&&!!report.partyCancel&&!!report.saveCancel;
}finally{
  dev.dispose();h.dispose();await mkdir('.local/qa',{recursive:true});
  await writeFile(`.local/qa/menus-${sha.slice(0,12)}.json`,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({report:`.local/qa/menus-${sha.slice(0,12)}.json`,sha256:sha,coverage:report.coverage,failures:report.failures,complete:report.complete},null,2));
if(!report.complete)process.exitCode=1;
