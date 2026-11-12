import {u16,put16} from './rom.js';
import {encodeDialogue} from './text.js';
import {carnivalBattleMessages} from '../content/carnival.js';
import {nativeRoutine} from './asm.js';

// Native bank-CC action widths. Conditions are four bytes; FE separates
// conditions/actions and FF separates active/reaction sections.
export const actionLengths=[4,4,6,1,1,3,1,4,1,2,3,5,4,3,1,2,4,10,16,3,10,16,12];
export function readEnemyAI(rom,id) {
  const start=0xc0000+u16(rom,0xc8b08+id*2);let p=start;
  const sections=[];
  for(let s=0;s<2;s++) {
    const blocks=[];
    while(rom[p]!==255) {
      const conditions=[],actions=[];
      while(rom[p]!==254){conditions.push([...rom.slice(p,p+4)]);p+=4;if(p>=0xd0000)throw Error('Unterminated AI conditions');}
      p++;
      while(rom[p]!==254&&rom[p]!==255){const n=actionLengths[rom[p]];if(!n)throw Error('Invalid enemy action '+rom[p]);actions.push({offset:p,bytes:[...rom.slice(p,p+n)]});p+=n;}
      if(rom[p]===254)p++; // The original Red Beast omits this terminator.
      blocks.push({conditions,actions});
    }
    p++;sections.push(blocks);
  }
  return {id,start,end:p,bytes:p-start,sections};
}
export function encodeEnemyAI(sections) {
  const out=[];
  for(const blocks of sections){for(const b of blocks){for(const c of b.conditions){if(c.length!==4)throw Error('AI condition width');out.push(...c);}out.push(254);for(const a of b.actions){if(a.length!==actionLengths[a[0]])throw Error('AI action width');out.push(...a);}out.push(254);}out.push(255);}
  return Uint8Array.from(out);
}

export function patchFinaleAI(base,allocate,add,{messages:extraMessages={}}={}) {
  const scripts=Array.from({length:256},(_,id)=>readEnemyAI(base,id));
  // The source AI dispatcher evaluates at most two conditions in a block.
  // Its unused 1C predicate also has a stop-after-test side effect. Retire
  // that unreferenced handler for one explicit, bounded intro predicate:
  // Tyson's first cycle, a living Shrek, and this living target slot.
  if(scripts.some(s=>s.sections.some(section=>section.some(block=>block.conditions.some(c=>c[0]===0x1c)))))throw Error('Shrek intro condition is already used');
  if(u16(base,0x1b80d+0x1c*2)!==0x96d4||![0x20,0x14,0xac].every((v,i)=>base[0x196d4+i]===v))throw Error('Native intro predicate signature');
  const introCondition=nativeRoutine(a=>{
    a.emit(0xad,0x52,0xb2);a.branch(0xd0,'fail');
    a.emit(0xad,0x02,0xaf,0xc9,0xce);a.branch(0xd0,'fail');
    a.emit(0xad,0xe4,0x5f);a.branch(0xd0,'fail');
    a.emit(0xa2,0,0);a.label('party');a.emit(0xbd,0xff,0xae);a.branch(0xf0,'present');
    a.emit(0xe8,0xe0,3,0);a.branch(0x90,'party');a.branch(0x80,'fail');
    a.label('present');a.emit(0xae,0xd2,0xb1,0x7b,0xbf,1,0,0xcc,0xc9,3);a.branch(0xb0,'fail');
    a.emit(0xaa,0xbd,0xff,0xae,0xc9,0xff);a.branch(0xf0,'fail');a.emit(0x4c,0x3e,0x8c);
    a.label('fail');a.emit(0xa9,1,0x8d,0x24,0xaf,0x60);
  });
  if(introCondition.length>0x19728-0x196d4)throw Error('Native intro predicate overflow');
  add(0x196d4,introCondition,'native Shrek battle intro presence and first-cycle predicate');
  const usedTech=new Set();
  for(const s of scripts)for(const section of s.sections)for(const b of section)for(const a of b.actions)if([2,18].includes(a.bytes[0]))usedTech.add(a.bytes[1]);
  // An unused enemy technique gets its own control, effect, targeting and
  // graphics records. No player tech or equipment effect is changed.
  const free=[];
  // FE is forbidden even as an operand: the native condition-failure scanner
  // seeks raw FE bytes rather than decoding action widths.
  for(let id=0xfd;id>=0xe0;id--)if(!usedTech.has(id)&&![...usedTech].some(t=>[5,6,7].some(k=>base[0xc6fc9+t*11+k]===id)))free.push(id);
  if(!free.length)throw Error('No private enemy technique slot');
  const uppercut=free[0],control=base.slice(0xc6fc9+0xf4*11,0xc6fc9+0xf5*11);
  control[5]=uppercut;control[3]=4;control[8]=0;
  add(0xc6fc9+uppercut*11,control,'uppercut enemy technique control');
  const effect=base.slice(0xc7ac9+0xf4*12,0xc7ac9+0xf5*12);effect[0]=4;
  add(0xc7ac9+uppercut*12,effect,'uppercut guaranteed target KO effect');
  // Type 4 is unused. The original dispatch entries 11..40 all point at the
  // same no-op, and no player/enemy/item record uses them. Reclaim 58 of those
  // bytes for a bank-local native handler; no new RAM or long-call shim.
  // See native/uppercut.asm. HP is staged through the normal lethal-damage
  // path, so death, menu selection, revival and action cleanup remain native.
  const reserved=new Set([4,...Array.from({length:30},(_,i)=>i+11)]);
  for(const [start,count] of [[0xc213f,69],[0xc7ac9,256]])
    for(let i=0;i<count;i++)if(reserved.has(base[start+i*12]))throw Error('Uppercut handler conflicts with an existing effect type');
  for(let i=11;i<=40;i++)if(u16(base,0x1d9d7+i*2)!==0xd48f)throw Error('Unexpected unused effect dispatch entry');
  const code=Uint8Array.from([
    0x20,0xa3,0xe9, 0x20,0xb8,0xe9,
    0xad,0xe4,0x5f,0x3a,0xcd,0xfd,0xb1,0xf0,12,
    0xa9,4,0x8d,0xe4,0x5f,0x9c,0x00,0xb2,0x9c,0x8d,0xad,0x60,
    0xa9,4,0x8d,0xe4,0x5f,0xae,0xf6,0xb1,
    0xc2,0x20, 0xbd,0x30,0x5e, 0x8d,0x89,0xad, 0xe2,0x20,
    0x9c,0x00,0xb2, 0x20,0x72,0xdd, 0x20,0x08,0xd5,
    0x9c,0x8d,0xad, 0x60
  ]);
  add(0x1d9df,Uint8Array.of(0xed,0xd9),'native uppercut type dispatch');
  add(0x1d9ed,code,'native uppercut damage handler');
  add(0xc86c9+uppercut*2,Uint8Array.of(7,0),'uppercut single target');
  const impact=Uint8Array.of(0x9b,0,0,0,0,0,0xff);
  add(0xd5526+uppercut*7,impact,'uppercut impact animation');

  // Retire the center's former 9B animation. Its 12-byte header and 35-byte
  // caster script are exclusively owned by this enemy. Shared target scripts
  // following DF97 are left intact. Both native target-mode headers are kept.
  for(const s of scripts)if(s.id!==0xce)for(const section of s.sections)for(const b of section)for(const a of b.actions)
    if([2,18].includes(a.bytes[0])&&base[0xd5526+a.bytes[1]*7]===0x9b)throw Error('Uppercut animation is shared');
  if(u16(base,0xd61f0+0x9b*2)!==0xdf68||u16(base,0xddf6c)!==0xdf74)throw Error('Unexpected retired animation layout');
  const caster=[0x72,0x0d,0x03,0x06,0x78,0x05,0x36,0x20,0x0f,0x50,0x36,0x06,0x03,0x2e,0x01,0x00];
  const target=[0x24,1,0x06,5,0x24,2,0x06,3,0];
  const animation=new Uint8Array(16+caster.length+target.length);animation.set([0x98,0,0x98,0]);
  for(let i=0;i<6;i++)put16(animation,4+i*2,0xdf68+16+(i%3?caster.length:0));
  animation.set(caster,16);animation.set(target,16+caster.length);
  add(0xddf68,animation,'native uppercut actor and target animation');

  const phase=0x37,idle=[0,0,6,0],state=n=>[0x18,n,3,phase],alive=slot=>[0x0b,0x30+slot,0x1d,0x7f];
  const active=[{conditions:[[4,0,0xef,1]],actions:[[2,0x7f,3,0,0,39]]},
    {conditions:[state(4)],actions:[[15,251],idle,[11,phase,5,0,0]]}];
  for(let slot=0;slot<3;slot++)active.push({
    conditions:[state(slot+1),alive(slot)],
    // The effect handler enters recovery atomically with the strike.
    actions:[idle,idle,[2,uppercut,0x30+slot,0,0,250]]
  });
  // A locked target can die before impact. Enter recovery without retargeting.
  for(let slot=0;slot<3;slot++)active.push({conditions:[state(slot+1)],actions:[[11,phase,4,0,246]]});
  // Speak inside the first jab/tell turn, with no extra idle turn;
  // subsequent cycles return to phase five.
  for(let slot=0;slot<3;slot++)active.push({conditions:[[0x1c,slot,0,0]],
    actions:[[15,245],[1,1,5,4],[11,phase,slot+1,0,247+slot]]});
  for(let slot=0;slot<3;slot++)active.push({conditions:[alive(slot)],actions:[[1,1,5,4],[11,phase,slot+1,0,247+slot]]});
  const reaction=[{conditions:[[0,0,0,0]],actions:[[0,0,6,0]]}];
  const ai=encodeEnemyAI([active,reaction]),old=scripts[0xce];
  if(ai.length>old.bytes)throw Error('Tyson script exceeds reclaimed native AI space');
  add(old.start,ai,'Tyson native jab windup uppercut recovery AI');

  const messages={...carnivalBattleMessages,
    245:'SHREK: GET OUT OF MY SWAMP!{null}',
    246:'The uppercut is canceled!{null}',
    247:'Uppercut aimed at {pc1}! Prepare!{null}',
    248:'Uppercut aimed at {pc2}! Prepare!{null}',
    249:'Uppercut aimed at {pc3}! Prepare!{null}',
    250:'Knockout Uppercut!{null}',251:'Tyson catches his breath.{null}',
    252:'The little muffin brings him back!{null}',
    0xbf:'Break the ward. Strike the muffin!{null}',
    0xc0:'The little muffin is exposed!{null}',
    0xc3:'The little muffin brings him back!{null}',
    0xc5:'The sugar ward is restored!{null}',
    0xcd:'The little muffin is exposed!{null}',
    0x47:'The sugar ward falls!{null}',
    35:'Dark Matter / Farquaad\'s strongest attack!{null}',
    46:'Carnival Hatchet lowers Dirt M def.{null}',
    47:'Farquaad risks casting a spell!{null}',
    71:'Muffin Core shuts off def{null}',
    117:'Bluuurp! / Copying Rumpel…{null}',
    124:'RUMPEL: Take this!!!!{null}',
    126:'Attacks with “Muffin Spawn Needle.”{null}',
    157:'Wish Engine modifies all energy…{null}',
    158:'Wish Engine stands still…{null}',
    163:'Muffin Spawn Needle: Disorder{null}',
    165:'Carnival Hatchet absorbs energy…{null}',
    175:'The Carnival Hatchet lowers the Muffin\'s M def!{null}',
    176:'Muffin casts a spell…{null}',
    184:'Evil Emanation / Muffin\'s attack pwr up!{null}',
    191:'Muffin Core is defended!{null}',
    195:'Active Life / Revives the starter!{null}',
    197:'The Muffin Core\'s Def pwr restored!{null}',
    211:'Muffin\'s sigh / Sleep{null}'
  };
  // Other native encounters own disjoint IDs in the same relocated table.
  for(const [id,text]of Object.entries(extraMessages)){
    if(!Number.isInteger(+id)||+id<0||+id>255||messages[id]!==undefined||+id<227)throw Error('Battle message '+id+' is already owned');
    messages[id]=text;
  }
  const table=0xccbc9,count=227;
  const data=new Array(512).fill(0),offsets=[];
  const pointers=Array.from({length:count},(_,i)=>0xc0000+u16(base,table+i*2));
  if(pointers.some(p=>p<table+count*2||p>=0xcddc6))throw Error('Unexpected battle message table');
  const ends=[...new Set([...pointers,0xcddc6])].sort((a,b)=>a-b);
  for(let id=0;id<256;id++){
    offsets[id]=data.length;
    if(messages[id])data.push(...encodeDialogue(messages[id],base));
    else if(id<count){const p=pointers[id],end=ends.find(x=>x>p);if(!end)throw Error('Battle message out of bounds');data.push(...base.slice(p,end));}
    else data.push(0);
  }
  const packet=Uint8Array.from(data),p=allocate(packet,'native battle message table');
  offsets.forEach((off,i)=>put16(packet,i*2,(p&65535)+off));
  const low=new Uint8Array(2);put16(low,0,p&65535);
  add(0xd0299,low,'battle message table local pointer');add(0xd02a0,Uint8Array.of(0xc0|(p>>16)),'battle message table bank');
  return {guardian:0xce,ward:0xed,core:0xef,uppercut,scriptOffset:old.start,scriptBytes:ai.length,windupTurns:2,recoveryTurns:3,targetPolicy:'lock first living party slot; cancel if it dies before impact',introMessage:245,introPredicate:0x196d4,introPredicateBytes:introCondition.length,native:true,messages:Object.keys(messages).length};
}
