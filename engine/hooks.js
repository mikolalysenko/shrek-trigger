import {fileOffset,u16,u24} from './rom.js';
export function installHooks(snes,specs) {
  const handlers=new Map(),points=new Map(),counts={},timeline=[];
  const original=snes.cpu.cycle;
  let enabled=true,lastScene=-1,seq=0;
  for(const spec of specs) {
    if(!spec.expected.every((v,i)=>snes.cart.data[fileOffset(spec.address)+i]===v))throw Error('CPU signature mismatch: '+spec.name);
    points.set(spec.address&0x3fffff,spec);counts[spec.name]=0;
  }
  function emit(name,detail) {
    for(const fn of handlers.get(name)??[])fn(detail,snes);
    for(const fn of handlers.get('*')??[])fn({name,...detail},snes);
  }
  function hookCycle() {
    const cpu=this;
    if(enabled&&cpu.cyclesLeft===0&&!cpu.waiting&&!cpu.stopped) {
      const bank=cpu.r[1],pc=cpu.br[4],spec=points.get(((bank&63)<<16)|pc);
      // Do not mistake low-bank WRAM / I/O for a mirrored ROM address.
      if(spec&&(bank>=0xc0||(bank>=0x40&&bank<0x7e)||pc>=0x8000)&&!(cpu.nmiWanted||cpu.aboWanted||(cpu.irqWanted&&!cpu.i))) {
        counts[spec.name]++;
        const ram=snes.ram,location=u16(ram,0x100);
        const detail={frame:snes.frames,location,pc:(bank<<16)|pc,object:ram[0x16d]>>1};
        if(spec.name.startsWith('event.')){detail.scriptPC=cpu.br[1];detail.opcode=ram[0x12001+cpu.br[1]];}
        if(spec.name==='dialogue.render'){detail.stringId=ram[0x12a];detail.table=u24(ram,0x12b);}
        if(spec.name==='battle.tech'){detail.techId=ram[0xb18c];detail.actor=ram[0xb18b];}
        if(spec.name==='battle.result'){detail.actor=ram[0xb18b];detail.target=ram[0xad8e+Math.max(0,ram[0xad8d]-1)];detail.techId=ram[0xb18c];detail.value=u16(ram,0xad89);detail.flags=ram[0xb200];}
        if(spec.name==='item.use')detail.itemId=ram[0x4c9];
        if(spec.name==='battle.message'){detail.messageId=cpu.br[0]&255;detail.actor=ram[0xaec8]+3;detail.enemyId=ram[0xaeff+detail.actor];}
        if(spec.name==='battle.ai-message'||spec.name==='battle.enemy-tech'){
          detail.actor=ram[0xaec8]+3;detail.enemyId=ram[0xaeff+detail.actor];detail.aiPC=u16(ram,0xb1d2);
          detail.operand=snes.cart.data[0xc0000+detail.aiPC+1];
        }
        if(spec.name!=='field.nmi'&&!spec.name.startsWith('event.')){
          if(spec.name!=='scene.load'||location!==lastScene){
            const last=timeline.at(-1);
            if(!last||last.name!==spec.name||last.stringId!==detail.stringId||last.location!==location||last.frame!==detail.frame){timeline.push({seq:seq++,name:spec.name,...detail});if(timeline.length>256)timeline.shift();}
          }
          if(spec.name==='scene.load')lastScene=location;
        }
        emit(spec.name,detail);
      }
    }
    return original.call(this);
  }
  snes.cpu.cycle=hookCycle;
  snes.cpu.registerBreakpoints(hookCycle,original,specs.map(h=>[h.address>>16,h.address&65535]));
  return {
    counts,timeline,
    on(name,fn){if(!handlers.has(name))handlers.set(name,new Set());const bucket=handlers.get(name);bucket.add(fn);return()=>bucket.delete(fn);},
    setEnabled(value){enabled=!!value;},
    dispose(){if(snes.cpu.cycle===hookCycle)snes.cpu.cycle=original;handlers.clear();},
    registers(){const c=snes.cpu;return{pc:(c.r[1]<<16)|c.br[4],a:c.br[0],x:c.br[1],y:c.br[2],sp:c.br[3],dp:c.br[5],db:c.r[0],m:c.m,x8:c.x,irq:c.irqWanted,nmi:c.nmiWanted};}
  };
}
