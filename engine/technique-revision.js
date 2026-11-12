import {put16,put24,u16} from './rom.js';
import {nativeRoutine} from './asm.js';

const TARGET=0xc1acd;
const CONTROL=0xc1beb;
const PROPERTY=0xc214b;
const MP=0xc253b;
const HELP=0xc3a09;
const ANIMATION=0xd45a6;
const SCENE=0xd5ef0;
const ATTACK=0xd5ec6;

const target=(id)=>TARGET+(id-1)*2;
const control=(id)=>CONTROL+id*11;
const property=(id)=>PROPERTY+(id-1)*12;
const animation=(id)=>ANIMATION+id*7;

function copyRecord(base,add,from,to,size,offset,label,{keepFirst=false}={}){
 const bytes=base.slice(offset(from),offset(from)+size);
 if(keepFirst)bytes[0]=base[offset(to)];
 add(offset(to),bytes,label);
}

// November 2026 technique revision. Ordinary source mechanics stay in their
// native records; only the explicitly requested Puss/Mongo skill exchange and
// its four combination participants differ from the original cartridge.
export function patchTechniqueRevision(base,allocate,add){
 for(const[id,source]of[[36,45],[45,36]]){
  copyRecord(base,add,source,id,2,target,`tech ${id} native targeting`);
  if(id===36){
   const record=base.slice(control(source),control(source)+11);record[0]=50;add(control(id),record,'Puss Charm native control and participant');
  }else{
   const record=base.slice(control(source),control(source)+11);record[0]=0x85;add(control(id),record,'Mongo Heal native control and participant');
  }
  copyRecord(base,add,source,id,12,property,`tech ${id} native properties`);
  copyRecord(base,add,36,id,7,animation,`tech ${id} native animation resources`,{keepFirst:true});
  add(MP+id,Uint8Array.of(base[MP+source]),`tech ${id} native MP cost`);
  const pointer=new Uint8Array(2);put16(pointer,0,u16(base,HELP+source*2));
  add(HELP+id*2,pointer,`tech ${id} native help`);
  const scene=new Uint8Array(2);put16(scene,0,u16(base,SCENE+36*2));
  add(SCENE+id*2,scene,`tech ${id} native scene script`);
  const attack=new Uint8Array(2);put16(attack,0,u16(base,ATTACK+36*2));
  add(ATTACK+id*2,attack,`tech ${id} native attack script`);
 }
 // Joke mechanics (user decision, November 11: a technique may be stronger or
 // weaker than its source when the joke is worth it).
 // Love & Life: Shrek is life, so his revival restores everything, as Life II does.
 copyRecord(base,add,16,6,12,property,'Love & Life full revival');
 // Some May Die: a sacrifice Farquaad is willing to make costs him nothing.
 // His allies pay instead (engine/nine-lives.js, command-queue hook).
 add(MP+56,Uint8Array.of(0),'Some May Die costs Farquaad nothing');
 // Ayla's Charm participant pattern rejects Puss before MP validation. Give
 // Puss the same enemy target mode with his own participant index.
 for(let id=1;id<=116;id++)if((base[control(id)]&0x3f)===50)throw Error('Puss Charm target pattern is shared');
 add(0xc249f+50*3,Uint8Array.of(4,4,255),'Puss Charm native target pattern');

 // Move only the participant-pattern references. Tech IDs, components, MP
 // costs and effect records remain those of the displayed combination.
 const components=new Map([[80,[15,45]],[81,[10,36]],[92,[26,45]],[93,[28,36]]]);
 for(const[id,pattern]of[[80,43],[81,42],[92,47],[93,18]]){
  if((base[control(id)]&0x3f)!==[14,43,46,47][[80,81,92,93].indexOf(id)])throw Error(`Combo ${id} participant boundary changed`);
  add(control(id),Uint8Array.of(pattern),`tech ${id} revised native participants`);
 }

 // The locked catalogue also assigns the rock triples to Shrek-led parties.
 // Patterns 11 and 15 are unused; the other two parties already have records.
 const rockPatterns=new Map([[113,11],[114,30],[115,25],[116,15]]);
 for(const[id,pattern]of rockPatterns){
  if((base[control(id)]&0x3f)!==id-80)throw Error(`Rock triple ${id} participant boundary changed`);
  add(control(id),Uint8Array.of(pattern),`rock triple ${id} revised native participants`);
 }
 for(const[pattern,expected,replacement]of[[11,[0,5,255],[0,2,6]],[15,[1,5,255],[0,4,6]]]){
  for(let id=1;id<=116;id++)if((base[control(id)]&0x3f)===pattern)throw Error(`Rock participant pattern ${pattern} is shared`);
  const offset=0xc249f+pattern*3;
  if(!expected.every((v,i)=>base[offset+i]===v))throw Error(`Rock participant pattern ${pattern} changed`);
  add(offset,Uint8Array.from(replacement),`rock participant pattern ${pattern}`);
 }
 // Native animation loops restart type-2 programs when their frame byte is
 // zero. Select populated records for the revised Omega participants.
 add(0xe7b75,Uint8Array.of(0x35),'Omega Flare opening animation');
 add(0xe7b83,Uint8Array.of(0x45),'Omega Flare finishing animation');

 // Swamp Hoedown also needs the timing/frame records behind its operands.
 add(0xe7ea3,Uint8Array.of(0x15),'Swamp Hoedown opening animation');
 copyRecord(base,add,0x24a854,0x24a850,4,x=>x,'Swamp Hoedown Crono animation timing');
 copyRecord(base,add,0x243054,0x243050,4,x=>x,'Swamp Hoedown Crono animation frames');
 copyRecord(base,add,0x24adc4,0x24adc0,4,x=>x,'Swamp Hoedown Mongo animation timing');
 copyRecord(base,add,0x244614,0x244610,4,x=>x,'Swamp Hoedown Mongo animation frames');
 copyRecord(base,add,0x24a8fc,0x24a8f8,4,x=>x,'Swamp Hoedown Crono follow-up timing');
 copyRecord(base,add,0x2430fc,0x2430f8,4,x=>x,'Swamp Hoedown Crono follow-up frames');

 const rockTriples=[
  [113,0xa2,[5,24,56],'Shrek + Donkey + Farquaad'],
  [114,0x94,[4,28,47],'Shrek + Pinocchio + Mongo'],
  [115,0xc4,[1,10,46],'Shrek + Fiona + Mongo'],
  [116,0x8a,[6,40,56],'Shrek + Puss + Farquaad']
 ];
 for(const[id,mask,requirements,participants]of rockTriples){
  const maskOffset=0xc2983+(id-112),reqOffset=0xc2953+(id-112)*3;
  add(maskOffset,Uint8Array.of(mask),`rock triple ${id} native party mask`);
  add(reqOffset,Uint8Array.from(requirements),`rock triple ${id} native required singles`);
  components.set(id,requirements);
 }
 add(0xc2983,Uint8Array.of(0x62),'Dark Eternal stock party mask');
 add(0xc297c,Uint8Array.from([0xc4,0xb0,0xa8,0xa4,0x98,0x94,0x8c]),'ordinary triple availability masks');
 // The native builder supports one triple per party. Prefer the equipped
 // Button's gated triple over the ordinary triple for the two Shrek-led
 // parties that have both; unavailable records take the original skip path.
 const rockSelectorOffset=0x1cd0d,rockSelectorExpected=[0xa5,0x0c,0x29,0x80];
 if(!rockSelectorExpected.every((v,i)=>base[rockSelectorOffset+i]===v))throw Error('Rock triple selector boundary changed');
 const rockSelectorCode=nativeRoutine(a=>{
  a.emit(0xda,0xa5,0x08,0xc9,110);a.branch(0xf0,'silver');
  a.emit(0xc9,105);a.branch(0xf0,'white');
  a.label('original');a.emit(0xfa,0xa5,0x0c,0x29,0x80,0x6b);
  for(const[label,item]of[['silver',176],['white',177]]){
   a.label(label);a.emit(0xa2,0,0);
   a.label(label+'Loop');a.emit(0xbd,0xba,0xb3,0xc9,item);a.branch(0xf0,'found');
   a.emit(0xe8,0xe0,3,0);a.branch(0xd0,label+'Loop');a.branch(0x80,'original');
  }
  a.label('found');a.emit(0xfa,0x7b,0x6b);
 });
 const rockSelectorAddress=allocate(rockSelectorCode,'Button-gated triple preference'),rockSelectorCall=Uint8Array.of(0x22,0,0,0);put24(rockSelectorCall,1,rockSelectorAddress|0xc00000);
 add(rockSelectorOffset,rockSelectorCall,'Button-gated triple preference');
 // The post-battle learner still scans the original pair groups. Give the
 // moved entry the new pair's component thresholds, then select that entry's
 // learned bit when the native battle-menu builder asks for the tech.
 const requirements=[
  [80,0xc2842,[2,5,255],[7,5,255]],
  [81,0xc283f,[7,7,255],[2,4,255]],
  [92,0xc2866,[4,5,255],[2,5,255]],
  [93,0xc2863,[5,7,255],[4,4,255]]
 ];
 for(const[id,offset,expected,replacement]of requirements){
  if(!expected.every((v,i)=>base[offset+i]===v))throw Error(`Combo ${id} prerequisite boundary changed`);
  add(offset,Uint8Array.from(replacement),`tech ${id} revised native prerequisites`);
 }
 const offset=0x1ca56,expected=[0xbd,0x3e,0x28,0x85,0x0c];
 if(!expected.every((v,i)=>base[offset+i]===v))throw Error('Double-tech learned-bit boundary changed');
 const code=nativeRoutine(a=>{
  a.emit(0xda);
  for(const[id,group]of[[80,8],[81,7],[92,12],[93,11]]){
   a.emit(0xa5,0x08,0xc9,id);a.branch(0xd0,'next'+id);a.emit(0xa2,group,0);a.branch(0x80,'load');a.label('next'+id);
  }
  a.label('load');a.emit(0xbd,0x3e,0x28,0xfa,0x85,0x0c,0x6b);
 });
 const address=allocate(code,'Revised double-tech learned-bit groups'),call=Uint8Array.of(0x22,0,0,0,0xea);put24(call,1,address|0xc00000);
 add(offset,call,'Revised double-tech learned-bit lookup');
 const continuation=0x1cb26;
 if(!expected.every((v,i)=>base[continuation+i]===v))throw Error('Double-tech learned-bit continuation changed');
 add(continuation,call,'Revised double-tech learned-bit continuation');
 return{swapped:[{id:36,source:45,name:'Charm'},{id:45,source:36,name:'Heal'}],charmTargetPattern:50,components:Object.fromEntries(components),participants:{80:'Fiona + Mongo',81:'Fiona + Puss',92:'Pinocchio + Mongo',93:'Pinocchio + Puss',...Object.fromEntries(rockTriples.map(([id,,,participants])=>[id,participants]))},requirements:Object.fromEntries(requirements.map(([id,offset,,values])=>[id,{offset,values}])),rockTriples:rockTriples.map(([id,mask,requirements,participants])=>({id,mask,requirements,participants,pattern:rockPatterns.get(id),availabilityOffset:0xc2983+(id-112),gateIndex:id-112})),learnedBitHook:{offset,continuation,address,bytes:code.length},rockSelectorHook:{offset:rockSelectorOffset,address:rockSelectorAddress,bytes:rockSelectorCode.length},unrelatedMechanics:'stock',extraVramBytes:0,extraWramBytes:0};
}

export const techniqueTables={TARGET,CONTROL,PROPERTY,MP,HELP,ANIMATION,SCENE,ATTACK,target,control,property,animation};
