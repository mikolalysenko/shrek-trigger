import {mrWorldwide,mrWorldwidePalette,mrWorldwidePhases,mrWorldwideStats,mrWorldwideTechs,mrWorldwideText,mrWorldwideStates,greeterText} from '../content/mr-worldwide.js';
import {compileSpriteFrames,assertUnusedSpriteSlot,assertUnusedPalette} from './native-sprites.js';
import {compress} from './compression.js';
import {snesColor} from './sprites.js';
import {u16,put16,put24} from './rom.js';
import {encode} from './text.js';
import {readEnemyAI,encodeEnemyAI} from './enemy-ai.js';
import {mrWorldwideFrames} from './mr-worldwide-art.js';

// Bank-CC space released when the finale relocated the battle message table.
// The table's only reader is the LDX #$CBC9 / LDA #$CC pair at D0:0298; the
// finale rewrites both operands. Enemy AI pointers are bank-CC local.
export const releasedMessageSpan={start:0xccbc9,end:0xcddc6};
// Private clones live in enemy-tech slots that no source AI, technique
// sub-effect or other builder uses. The finale takes the highest free slot.
export const mrWorldwideTechIds=[0xe0,0xe1,0xe2,0xe3,0xe4,0xe5,0xe6,0xe7];

const STATE=0x37,HP_HIGH=4,SELF=3,RANDOM_PC=5;
const state=n=>[0x18,n,3,STATE],hpBelow=hi=>[0x0b,SELF,HP_HIGH,hi],always=[0,0,0,0],hitBy=bits=>[0x15,bits,0,0];
const message=id=>[0x0f,id],idle=[0,0,6,0],attack=[1,1,RANDOM_PC,4];
const tech=(id,target,text)=>[2,id,target,0,0,text];
const setStat=(offset,value,text=0)=>[0x0b,offset,value,0,text];

export function mrWorldwideTechMap(){
  return Object.fromEntries(mrWorldwideTechs.map((t,i)=>[t.key,{...t,id:mrWorldwideTechIds[i]}]));
}

// Native AI: an intro turn, three HP-gated phase changes (Magus-style
// barrier writes to the four element bytes and defenses), four attack
// rotations with a stable one-turn tell before FIREBALL, and Fire reactions.
export function mrWorldwideAI(){
  const t=mrWorldwideTechMap(),id=k=>t[k].id,phases=mrWorldwidePhases;
  const advance=(from)=>{
    const next=phases[from+1],[air,dirt,water,fire]=next.elements;
    const hint=[229,239,241][from];
    // Conditions are rechecked before each action, so the barrier change
    // (one turn) must precede the instant state change that ends the block.
    return {conditions:[state(from),hpBelow(next.hp>>8)],actions:[
      [0x12,t['world-tour'].id,RANDOM_PC,0,0,0x3f,air,0x40,dirt,0x41,water,0x42,fire,0x3e,next.defense,242],
      [0x11,STATE,from+1,0x3c,next.magicDefense,0x3d,next.attack,0x38,next.speed,hint]
    ]};
  };
  const tell=[message(233),idle],fireball=tech(id('fireball'),RANDOM_PC,234);
  const active=[
    {conditions:[state(0x10)],actions:[message(227),attack,setStat(STATE,0,228)]},
    advance(0),advance(1),advance(2),
    {conditions:[state(0)],actions:[attack,tech(id('dale'),RANDOM_PC,230),attack,tech(id('mic-drop'),RANDOM_PC,236),tech(id('pyrotechnics'),RANDOM_PC,231),...tell,fireball]},
    {conditions:[state(1)],actions:[attack,tech(id('heat-wave'),RANDOM_PC,237),tech(id('pyrotechnics'),RANDOM_PC,231),attack,tech(id('room-service'),SELF,235),...tell,fireball]},
    {conditions:[state(2)],actions:[tech(id('smoke-machine'),RANDOM_PC,232),attack,tech(id('dale'),RANDOM_PC,230),tech(id('mic-drop'),RANDOM_PC,236),...tell,fireball]},
    {conditions:[state(3)],actions:[tech(id('smoke-machine'),RANDOM_PC,232),tech(id('mic-drop'),RANDOM_PC,236),...tell,fireball,tech(id('pyrotechnics'),RANDOM_PC,231),tech(id('heat-wave'),RANDOM_PC,237),...tell,fireball]},
    {conditions:[always],actions:[attack]}
  ];
  const reaction=[
    {conditions:[hitBy(0x10),state(0)],actions:[message(240)]},
    {conditions:[hitBy(0x10),state(2)],actions:[setStat(0x3d,0xd0,238)]},
    {conditions:[always],actions:[idle]}
  ];
  // The native condition-failure scanner seeks raw FE bytes and sections end
  // at FF, so neither value may appear as an operand.
  for(const block of [...active,...reaction])for(const op of [...block.conditions,...block.actions])
    if(op.slice(1).some(v=>v===0xfe||v===0xff))throw Error('Mr. Worldwide AI operand collides with a native separator');
  return {sections:[active,reaction],bytes:encodeEnemyAI([active,reaction])};
}

export function mrWorldwideStatRecord(){
  const s=mrWorldwideStats,l=mrWorldwidePhases[0],r=new Uint8Array(23);
  put16(r,0,s.hp);r[2]=s.level;r.set(s.flags,3);r[8]=0x10;
  r.set([s.speed,s.magic,s.hit,s.evade,l.magicDefense,l.attack,l.defense,...l.elements,...s.category],9);
  return r;
}
export function mrWorldwideRewardRecord(){
  const w=mrWorldwideStats.reward,r=new Uint8Array(7);put16(r,0,w.xp);put16(r,2,w.gp);r[4]=w.drop;r[5]=w.charm;r[6]=w.tp;return r;
}

export function patchMrWorldwide(base,allocate,add,records,{uppercut}={}){
  const {enemy,gfx,asm,palette,animation,size,frames:frameCount,width,height}=mrWorldwide;
  // The source record is the unused Octobino: one HP, level zero, no
  // transform into it, and (checked in tests) no event loads it.
  if(u16(base,0xc4700+enemy*23)!==1||base[0xc4700+enemy*23+2]!==0)throw Error('Mr. Worldwide source enemy record changed');
  for(let id=0;id<256;id++)for(const section of readEnemyAI(base,id).sections)for(const block of section)for(const action of block.actions)
    if(action.bytes[0]===7&&action.bytes[1]===enemy)throw Error('Mr. Worldwide source enemy is a transform target');
  assertUnusedSpriteSlot(base,0,gfx);assertUnusedSpriteSlot(base,1,asm);assertUnusedPalette(base,palette);
  const claims=records.filter(r=>r.offset<0x250000&&r.offset+r.bytes.length>0x24f000);
  for(const r of claims)for(let i=0;i<r.bytes.length;i++){
    const p=r.offset+i,rel=p>=0x24f600?(p-0x24f600)%10:(p-0x24f000)%5;
    if([[0,gfx],[1,asm],[2,palette]].some(([field,value])=>rel===field&&r.bytes[i]===value))throw Error('Mr. Worldwide sprite slot is claimed by '+r.label);
  }
  if(u16(base,0x242600+animation*2)>=u16(base,0x242602+animation*2))throw Error('Mr. Worldwide animation program is not bounded');

  // Sprite: eight 48x64 frames in the native twelve-cell size class.
  const frames=mrWorldwideFrames();
  if(frames.length!==frameCount||frames.some(f=>f.length!==width*height))throw Error('Mr. Worldwide frame set changed');
  const compiled=compileSpriteFrames(frames,{width,height,size});
  const pointer=(where,offset,label)=>{const b=new Uint8Array(3);put24(b,0,0xc00000|offset);add(where,b,label);};
  const packed=compress(compiled.graphics);
  pointer(0x242000+gfx*3,allocate(packed,'Mr. Worldwide compressed graphics'),'Mr. Worldwide graphics pointer');
  pointer(0x242300+asm*3,allocate(compiled.assembly,'Mr. Worldwide frame assembly'),'Mr. Worldwide assembly pointer');
  const colors=new Uint8Array(24);mrWorldwidePalette.forEach((c,i)=>put16(colors,i*2,snesColor(c)));
  add(0x240000+u16(base,0x242a00+palette*2),colors,'Mr. Worldwide private palette');
  add(0x24f600+enemy*10,Uint8Array.of(gfx,asm,palette,animation,size,0,0xe0,0x0c,0x0c,0x00),'Mr. Worldwide sprite header');

  // Ordinary enemy records.
  add(0xc4700+enemy*23,mrWorldwideStatRecord(),'Mr. Worldwide stats');
  add(0xc5e00+enemy*7,mrWorldwideRewardRecord(),'Mr. Worldwide rewards');
  add(0xc6500+enemy*11,encode(mrWorldwide.short,{length:11}),'Mr. Worldwide battle name');

  // Private technique clones.
  const used=new Set();
  for(let id=0;id<256;id++)for(const section of readEnemyAI(base,id).sections)for(const block of section)for(const action of block.actions)
    if([2,18].includes(action.bytes[0]))used.add(action.bytes[1]);
  const techs=[];
  for(const t of Object.values(mrWorldwideTechMap())){
    if(used.has(t.id)||t.id===uppercut||[...used].some(u=>[5,6,7].some(k=>base[0xc6fc9+u*11+k]===t.id)))throw Error('Mr. Worldwide technique slot is in use: '+t.id);
    const control=base.slice(0xc6fc9+t.source*11,0xc6fc9+t.source*11+11);
    if(control[5]!==t.source||control[6]!==0xff||control[7]!==0xff)throw Error('Mr. Worldwide technique source is compound: '+t.key);
    control[5]=t.id;
    const effect=base.slice(0xc7ac9+t.source*12,0xc7ac9+t.source*12+12);
    if(t.power!==undefined)effect[9]=t.power;
    if(t.heal!==undefined){if(effect[0]!==0)throw Error('Only a healing technique takes heal strength');effect[1]=t.heal;}
    if(t.status){effect[1]=t.status[0];effect[2]=t.status[1];}
    add(0xc6fc9+t.id*11,control,'Mr. Worldwide '+t.key+' control');
    add(0xc7ac9+t.id*12,effect,'Mr. Worldwide '+t.key+' effect');
    add(0xc86c9+t.id*2,base.slice(0xc86c9+t.source*2,0xc86c9+t.source*2+2),'Mr. Worldwide '+t.key+' targeting');
    add(0xd5526+t.id*7,base.slice(0xd5526+t.source*7,0xd5526+t.source*7+7),'Mr. Worldwide '+t.key+' animation');
    techs.push({key:t.key,id:t.id,source:t.source,element:control[3]>>4,power:effect[0]===0?effect[1]:effect[9],status:effect[0]===0?null:[effect[1],effect[2]],message:t.message});
  }

  // AI in the released bank-CC message span, adjacent to the source scripts.
  if(!records.some(r=>r.offset===0xd0299&&r.bytes.length===2)||!records.some(r=>r.offset===0xd02a0))throw Error('Battle messages must be relocated before reusing their source span');
  if(base[0xd0298]!==0xa2||u16(base,0xd0299)!==(releasedMessageSpan.start&65535)||base[0xd029f]!==0xa9||base[0xd02a0]!==0xcc)throw Error('Unexpected battle message table reader');
  const ai=mrWorldwideAI();
  if(ai.bytes.length>releasedMessageSpan.end-releasedMessageSpan.start)throw Error('Mr. Worldwide AI exceeds released bank-CC span');
  add(releasedMessageSpan.start,ai.bytes,'Mr. Worldwide native AI');
  const aiPointer=new Uint8Array(2);put16(aiPointer,0,releasedMessageSpan.start&65535);
  add(0xc8b08+enemy*2,aiPointer,'Mr. Worldwide AI pointer');

  return {enemy,name:mrWorldwide.name,gfx,asm,palette,animation,size,frames:frameCount,tiles:compiled.tiles,graphicsBytes:compiled.graphics.length,compressedBytes:packed.length,
    aiOffset:releasedMessageSpan.start,aiBytes:ai.bytes.length,techs,stats:{...mrWorldwideStats,phases:mrWorldwidePhases.map(l=>({key:l.key,hpBelow:l.hp,defense:l.defense,magicDefense:l.magicDefense,elements:l.elements}))},
    kitchen:mrWorldwide.kitchen.location,walmart:mrWorldwide.walmart.location,song:mrWorldwide.song,storyGate:mrWorldwide.storyGate,flag:0x7f0000+mrWorldwide.flag,extraWramBytes:0,extraVramBytes:0,native:true};
}

// Forward relative jumps count from their own offset byte.
function assemble(items){
  const out=[],labels=new Map(),fixups=[];
  for(const item of items){
    if(typeof item==='number'){if(!Number.isInteger(item)||item<0||item>255)throw Error('Invalid event byte');out.push(item);}
    else if(item.label!==undefined){if(labels.has(item.label))throw Error('Duplicate event label');labels.set(item.label,out.length);}
    else{fixups.push([out.length,item.to]);out.push(0);}
  }
  for(const [at,label] of fixups){
    const target=labels.get(label),offset=target-at;
    if(target===undefined||offset<1||offset>255)throw Error('Invalid event jump to '+label);
    out[at]=offset;
  }
  return out;
}

// Only the opcodes present in the two signature-checked rooms and the added
// functions are accepted; anything else stops the build instead of guessing.
const commandLengths=new Map([
  [1,[0x00,0x0f,0x17,0x57,0x5c,0x62,0x68,0x6a,0x6c,0x6d,0x90,0x91,0xae,0xb0,0xb1,0xb2,0xb3,0xb4,0xda,0xee,0xf8]],
  [2,[0x0a,0x0d,0x0e,0x10,0x11,0x5a,0x75,0x77,0x80,0x82,0x87,0x89,0x8e,0xa9,0xaa,0xac,0xad,0xbb,0xc1,0xc2,0xca,0xe3,0xe8,0xea]],
  [3,[0x02,0x04,0x05,0x07,0x18,0x1a,0x24,0x4f,0x65,0x69,0x83,0x8b,0x96,0xc3,0xc4,0xd2,0xd8]],
  [4,[0x22,0xb8,0xec]],[5,[0x12,0x16,0x48,0x4a,0x4c,0x4d,0x8d,0xe0]],[7,[0xd9]],[8,[0xe4,0xe5]]
].flatMap(([length,ops])=>ops.map(op=>[op,length])));
const forwardBranches=new Set([0x10,0x12,0x16,0x18,0x1a,0xd2]);

export function eventCommands(event,label='Event'){
  const commands=[];
  for(let p=1+event[0]*32;p<event.length;){
    const op=event[p],length=commandLengths.get(op);
    if(!length||p+length>event.length)throw Error('Unsupported '+label+' command at '+(p-1).toString(16));
    commands.push({pc:p-1,op,length});p+=length;
  }
  const starts=new Set(commands.map(c=>c.pc));
  for(let i=0;i<event[0]*16;i++){const f=u16(event,1+i*2);if(!starts.has(f)&&f!==event.length-1)throw Error(label+' function is not an instruction boundary');}
  return commands;
}
export const lessonRoomCommands=event=>eventCommands(event,'lesson-room');

// Local operands: 12/75/77 first byte, 4F second, 48/4C/4D after a long address.
function usedLocals(event,commands){
  const used=new Set();
  for(const c of commands){
    if([0x12,0x75,0x77].includes(c.op))used.add(event[c.pc+2]);
    if(c.op===0x4f)used.add(event[c.pc+3]);
    if([0x48,0x4c,0x4d].includes(c.op))used.add(event[c.pc+5]);
    if(c.op===0x22)used.add(event[c.pc+4]);
  }
  return used;
}
// A function's bytes are relocatable verbatim when every branch inside it
// stays inside it. A branch to the following return (a shared 00) carries
// that one byte along.
function relocatable(event,commands,start,end,label){
  let tail=false;
  for(const c of commands)if(c.pc>=start&&c.pc<end&&(forwardBranches.has(c.op)||c.op===0x11)){
    const operand=c.pc+c.length,target=c.pc+c.length-1+(c.op===0x11?-1:1)*event[operand];
    if(target===end&&event[end+1]===0x00){tail=true;continue;}
    if(target<start||target>=end)throw Error(label+' branches outside itself');
  }
  return [...event.subarray(start+1,end+1+(tail?1:0))];
}
// Grow the object table by one entry: every source function moves by 32 and
// the appended functions follow the source body.
function appendObject(event,replacements,appended){
  const objects=event[0],out=[objects+1],body=[...event.subarray(1+objects*32)];
  const pointers=[];
  for(let i=0;i<objects*16;i++)pointers.push(u16(event,1+i*2)+32);
  let next=event.length-1+32;
  const place=bytes=>{const p=next;next+=bytes.length;return p;};
  const at=new Map();
  for(const [key,bytes] of Object.entries(replacements))at.set(key,place(bytes));
  const own=appended.map(f=>f?place(f):null);
  for(const key of Object.keys(replacements))pointers[Number(key)]=at.get(key);
  const end=next-1; // the trailing B2 doubles as every empty slot
  for(let f=0;f<16;f++)pointers.push(own[f]??end);
  for(const p of pointers)out.push(p&255,p>>8);
  out.push(...body);for(const bytes of Object.values(replacements))out.push(...bytes);for(const bytes of appended)if(bytes)out.push(...bytes);
  const result=Uint8Array.from(out);
  if(result[result.length-1]!==0xb2)throw Error('Appended functions must end with B2');
  if(result.length>0x1700)throw Error('Mr. Worldwide event exceeds native event buffer');
  return {result,at,own};
}

const S=mrWorldwideStates;
const flagRead=local=>[0x48,mrWorldwide.flag&255,mrWorldwide.flag>>8,0x7f,local];
const flagWrite=v=>[0x4a,mrWorldwide.flag&255,mrWorldwide.flag>>8,0x7f,v];
const warp=(location,[x,y])=>[0xe0,location&255,location>>8,x,y]; // facing up

// Location 465: append the greeter as object 21. Before the story gate the
// object stays empty. Talking offers the trip; accepting records a first or
// repeat visit and changes location to the Kodiak stockroom.
export function greeterEvent(event,location){
  const k=mrWorldwide.kitchen;
  if(location!==k.location)return event;
  if(event[0]!==k.objects||event.length!==k.eventBytes)throw Error('Lesson room event signature changed');
  const commands=lessonRoomCommands(event),used=usedLocals(event,commands);
  const {presentLocal:PL,flagLocal:FL,storyGate}=mrWorldwide,[gx,gy]=k.greeter,T=greeterText,w=mrWorldwide.walmart;
  if(used.has(PL)||used.has(FL))throw Error('Greeter locals are used by the lesson room');
  // The practice returns restore the room theme; the trip home reuses it.
  if(commands.filter(c=>c.op===0xea&&event[c.pc+2]===k.song).length!==7)throw Error('Lesson room theme signature changed');
  const init=assemble([
    0x77,PL,
    0x18,storyGate,{to:'gate'}, 0x10,{to:'done'},     // before the gate: stay empty
    {label:'gate'},0x82,k.npc,0x8b,gx,gy,0x75,PL,
    {label:'done'},0x00,0xb2]);
  const talk=assemble([
    0x12,PL,0x00,0x00,{to:'present'}, 0x00,          // absent: return
    {label:'present'},...flagRead(FL),
    0x12,FL,S.defeated,0x00,{to:'open'}, 0xc2,T.after, 0x00,
    {label:'open'},0xc2,T.greet,
    0xc3,T.choice,0x0b, 0x1a,0x03,{to:'go'}, 0xc2,T.decline, 0x00,
    {label:'go'},0xc2,T.go,
    0x12,FL,S.unmet,0x00,{to:'repeat'}, ...flagWrite(S.visitFirst), 0x10,{to:'warp'},
    {label:'repeat'},...flagWrite(S.visitRepeat),
    {label:'warp'},...warp(w.location,w.arrival),0x00,0xb2]);
  const {result,own}=appendObject(event,{},[init,talk]);
  const check=lessonRoomCommands(result);
  for(let i=0;i<k.objects*16;i++)if(u16(result,1+i*2)!==u16(event,1+i*2)+32)throw Error('Lesson room function moved unevenly');
  if(![own[0],own[1]].every(p=>check.some(c=>c.pc===p)))throw Error('Greeter functions are not decodable');
  return result;
}

// Location 344: during a Kodiak visit the storeroom becomes the Walmart
// stockroom. Object 0's script and object 8's startup run behind a guard
// (relocated verbatim, so ordinary visits execute the source bytes), and the
// appended object 9 is Mr. Worldwide: his scene starts on arrival and every
// outcome changes location back to Guy's kitchen.
export function walmartEvent(event,location){
  const w=mrWorldwide.walmart,k=mrWorldwide.kitchen;
  if(location!==w.location)return event;
  if(event[0]!==w.objects||event.length!==w.eventBytes)throw Error('Kodiak storeroom event signature changed');
  const commands=eventCommands(event,'storeroom'),used=usedLocals(event,commands);
  const {presentLocal:PL,flagLocal:FL,enemy,song}=mrWorldwide,[bx,by]=w.boss,T=mrWorldwideText;
  if(used.has(PL)||used.has(FL))throw Error('Mr. Worldwide locals are used by the storeroom');
  const fn=(object,f)=>u16(event,1+object*32+f*2);
  // Object 0: its startup returns at once; the script after it sets the
  // dialogue table and runs the storeroom scene.
  const setupStart=fn(0,0),setupEnd=fn(0,1);
  if(event[setupStart+1]!==0x00||event[setupStart+2]!==0xb8)throw Error('Storeroom setup signature changed');
  const setup=relocatable(event,commands,setupStart,setupEnd,'Storeroom setup'),table=setup.slice(1,5);
  const visiting=(local,yes,no)=>[0x12,local,S.visitFirst,0x00,{to:'repeat:'+yes},0x10,{to:yes},{label:'repeat:'+yes},0x12,local,S.visitRepeat,0x00,{to:no}];
  const setupGuard=assemble([0x00,...flagRead(FL),...visiting(FL,'kodiak','stock'),{label:'kodiak'},...table,0xb2,{label:'stock'},...setup.slice(1)]);
  // Object 8 (the storeroom resident) stays unloaded during a visit.
  const residentStart=fn(8,0),residentEnd=fn(8,1);
  if(event[residentStart+1]!==0x82)throw Error('Storeroom resident signature changed');
  const resident=relocatable(event,commands,residentStart,residentEnd,'Storeroom resident');
  const residentGuard=assemble([...flagRead(FL),...visiting(FL,'away','stock'),{label:'away'},0x00,0xb2,{label:'stock'},...resident]);
  // Object 9: Mr. Worldwide in battle slot 3, then the scene.
  const back=[0xea,k.song,...warp(k.location,k.returnTo)];
  const boss=assemble([
    ...flagRead(FL),...visiting(FL,'present','absent'),
    {label:'present'},0x83,enemy,0x83,0x8b,bx,by,0x75,PL,0x00,
    0xea,song,
    0x12,FL,S.visitFirst,0x00,{to:'again'},
    0xc2,T.intro, 0xd2,2,{to:'choose'}, 0xc2,T.donkey, 0x10,{to:'choose'},
    {label:'again'},0xc2,T.repeat,
    {label:'choose'},0xc3,T.choice,0x0b, 0x1a,0x03,{to:'fight'},
    0xc2,T.decline, ...flagWrite(S.met), ...back, 0x00,
    {label:'fight'},0xc2,T.accept,
    0xd9,...w.staging,
    0xd8,0x90,0xe0,                                  // no game over, fixed positions, no running
    0x48,0xec,0x01,0x7f,FL,
    0x12,FL,0x00,0x00,{to:'lost'},
    0xc2,T.victory, 0xca,187,0xca,197,0xca,197,0xca,197,
    0xc2,T.reward, 0xc2,T.aftermath, ...flagWrite(S.defeated), ...back, 0x00,
    {label:'lost'},0xf8,0xc2,T.loss, ...flagWrite(S.met), ...back, 0x00,
    {label:'absent'},0x00,0xb2]);
  const {result,at,own}=appendObject(event,{0:setupGuard,[8*16]:residentGuard},[boss,[0x00,0xb2]]);
  const check=eventCommands(result,'storeroom');
  for(let i=0;i<w.objects*16;i++)if(i!==0&&i!==8*16&&u16(result,1+i*2)!==u16(event,1+i*2)+32)throw Error('Storeroom function moved unevenly');
  if(![at.get('0'),at.get(String(8*16)),own[0],own[1]].every(p=>check.some(c=>c.pc===p)))throw Error('Kodiak functions are not decodable');
  return result;
}
