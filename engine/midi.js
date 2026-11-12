// Small, dependency-free Standard MIDI reader used by the music import tool.
// Times remain integer ticks until the arranger quantizes them for the SPC.
export function readMidi(input){
  const b=input instanceof Uint8Array?input:new Uint8Array(input),v=new DataView(b.buffer,b.byteOffset,b.byteLength);let p=0;
  const need=n=>{if(p+n>b.length)throw Error('Truncated MIDI');};
  const byte=()=>{need(1);return b[p++];};
  const word=()=>{need(2);const n=v.getUint16(p);p+=2;return n;};
  const long=()=>{need(4);const n=v.getUint32(p);p+=4;return n;};
  const tag=()=>String.fromCharCode(byte(),byte(),byte(),byte());
  const variable=()=>{let n=0;for(let i=0;i<4;i++){const q=byte();n=n*128+(q&127);if(!(q&128))return n;}throw Error('Invalid MIDI variable integer');};
  if(tag()!=='MThd')throw Error('Not a Standard MIDI file');const h=long(),format=word(),count=word(),ppq=word();
  if(h<6||format>1||!count||(format===0&&count!==1)||!ppq||(ppq&32768))throw Error('Use a type 0/1 MIDI with musical tick timing');p+=h-6;need(0);
  const tracks=[],tempos=[];
  for(let t=0;t<count;t++){
    if(tag()!=='MTrk')throw Error('Missing MIDI track');const length=long(),end=p+length;need(length);
    let at=0,running=0,name='';const notes=[],active=new Map(),programs=new Map(),controls=[];
    const finish=(channel,pitch)=>{const key=channel*128+pitch,list=active.get(key);if(list?.length){const n=list.shift();n.duration=Math.max(0,at-n.at);notes.push(n);}};
    while(p<end){
      at+=variable();let op=byte();if(op<128){p--;if(!running)throw Error('MIDI running status has no command');op=running;}else if(op<240)running=op;
      if(op===255){const type=byte(),n=variable();need(n);if(type===3)name=new TextDecoder().decode(b.slice(p,p+n));if(type===81){if(n!==3)throw Error('Invalid MIDI tempo');tempos.push({at,microseconds:b[p]*65536+b[p+1]*256+b[p+2]});}p+=n;}
      else if(op===240||op===247){const n=variable();need(n);p+=n;running=0;}
      else{
        const type=op>>4,channel=op&15,a=byte(),c=[12,13].includes(type)?0:byte();if(a>127||c>127||type<8||type>14)throw Error('Invalid MIDI channel event');
        if(type===8||(type===9&&!c))finish(channel,a);
        else if(type===9){const key=channel*128+a;if(!active.has(key))active.set(key,[]);active.get(key).push({at,pitch:a,velocity:c,channel,program:programs.get(channel)??0});}
        else if(type===12)programs.set(channel,a);
        else if(type===11)controls.push({at,channel,controller:a,value:c});
      }
      if(p>end)throw Error('MIDI event exceeds its track');
    }
    for(const list of active.values())for(const n of list)notes.push({...n,duration:Math.max(0,at-n.at)});
    tracks.push({name,ticks:at,notes:notes.sort((a,b)=>a.at-b.at||a.pitch-b.pitch),controls});
  }
  return{format,ppq,tracks,tempos:tempos.sort((a,b)=>a.at-b.at),ticks:Math.max(...tracks.map(t=>t.ticks))};
}
