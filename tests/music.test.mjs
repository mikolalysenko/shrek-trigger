import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build,bedroom} from './helpers.mjs';
import {readMidi} from '../engine/midi.js';
import {compileMusic} from '../engine/music-sequence.js';
import {allStar} from '../content/music-all-star.js';
import {carnivalMusic} from '../content/music-carnival.js';
import {verse,chorus,bridge,place} from '../content/music-all-star-phrases.js';
import {stockMusicReplacements,arrangeStockMusic,worldwideSong,worldwideMusic,arrangeWorldwideMusic} from '../engine/music.js';
import {stockSong,stockVoice} from '../engine/music-stock.js';
import {fireballBossBattle,fireballInstruments,fireballTempo,toBossKey} from '../content/music-fireball.js';
import * as fireball from '../content/music-fireball-phrases.js';
import {importFireball} from '../scripts/import-fireball.mjs';
import {access} from 'node:fs/promises';
import {createCore} from '../scripts/core.mjs';
import {installHooks} from '../engine/hooks.js';
import {createDevTools} from '../engine/devtools.js';
import {runFrames} from '../engine/automation.js';
import {decompress} from '../engine/compression.js';
import {u16,u24,fileOffset} from '../engine/rom.js';
const b=await build();

// Independent reader of the emitted AKAO4 commands, including the native
// repeat stack. Compare audible note events, not a second copy of the encoder.
// `finale` follows the driver's conditional jump (FA) to the ending (EB);
// `once` reads a one-shot cue to its EB. Kit voices (FB) report no
// instrument; volumes record c4 at each key-on (a fade that starts on the
// same tick starts from it).
function readVoice(packet,voice,instruments,{finale=false,once=false}={}){
 const seq=packet.slice(2),durations=[192,96,64,72,48,32,36,24,16,12,8,6,4,3];
 let p=u16(seq,4+voice*2)-0x2000,t=0,octave=0,instrument=0,maxDepth=0,kit=false,volume=null,finaleAt=null,fade=null;const notes=[],volumes=[],stack=[],ticks=new Map();
 for(let safety=0;safety<100000;safety++){
  assert.ok(p>=36&&p<seq.length,'SPC program counter inside song');if(!stack.length&&!ticks.has(p))ticks.set(p,t);const op=seq[p++];
  if(op<0xc4){
   const pitch=Math.floor(op/14),duration=durations[op%14];
   if(pitch===12){assert.ok(notes.length&&notes.at(-1)[0]+notes.at(-1)[1]===t,'tie follows an active note');notes.at(-1)[1]+=duration;}
   else if(pitch<12){notes.push([t,duration,octave*12+pitch,kit?null:instrument]);volumes.push(fade?.t===t?fade.from:volume);}t+=duration;
  }else if(op===0xd6)octave=seq[p++];
  else if(op===0xd7)octave++;
  else if(op===0xd8)octave--;
  else if(op===0xdc){instrument=instruments[seq[p++]-32];assert.ok(instrument);}
  else if(op===0xc4)volume=seq[p++];
  else if(op===0xc5){p++;fade={t,from:volume};volume=seq[p++];}
  else if(op===0xe2){const count=seq[p++]+1;stack.push({p,count});maxDepth=Math.max(maxDepth,stack.length);assert.ok(maxDepth<=4,'native repeat stack');}
  else if(op===0xe3){assert.ok(stack.length);const top=stack.at(-1);if(--top.count)p=top.p;else stack.pop();}
  else if(op===0xf6){assert.equal(stack.length,0);const loop=u16(seq,p)-0x2000;assert.ok(loop>=36&&loop<p);return{notes,volumes,t,maxDepth,loopTick:ticks.get(loop),finaleAt};}
  else if(op===0xfa){assert.equal(stack.length,0,'condition outside repeats');finaleAt=t;p++;const target=u16(seq,p)-0x2000;p+=2;if(finale){assert.ok(target>p&&target<seq.length);p=target;}}
  else if(op===0xeb){assert.equal(stack.length,0);assert.ok(finale||once,'only a finale or a one-shot cue ends');return{notes,volumes,t,maxDepth,finaleAt,ended:true};}
  else if(op===0xfb)kit=true;
  else if([0xc6,0xf0,0xf2,0xfd,0xd9,0xdd,0xde,0xdf,0xe0].includes(op))p++;
  else if([0xf7,0xf8,0xc7,0xcd].includes(op))p+=2;
  else if(op===0xc9)p+=3;
  else assert.ok([0xd4,0xca,0xe1,0xe4,0xe5,0xe6,0xe7].includes(op),'known native command '+op.toString(16));
 }
 assert.fail('unterminated music program');
}

test('the supplied full song and original boss score preserve every arranged note through native compression and looping',()=>{
 assert.equal(allStar.source.sha256,'d1b6d92ff41231632925f7279685c628b4d2c2d3a8873e6e2529c66c6c2b3803');
 assert.equal(allStar.source.originalBeats,336);assert.equal(allStar.ticks/48,332);
 assert.deepEqual(allStar.source.loop,{pickupTicks:144,sourceEndTick:16080,beats:332});
 assert.equal(Math.min(...allStar.channels.flatMap(c=>c.notes.map(n=>n[0]))),0,'the opening pickup starts immediately');
 assert.equal(Math.max(...allStar.channels.flatMap(c=>c.notes.map(n=>n[0]+n[1]))),allStar.ticks,'the final chord reaches the pickup without a silent gap');
 for(const score of[allStar,carnivalMusic]){
  const c=compileMusic(score);assert.equal(c.voices,6);assert.ok(c.bytes<0xf00);assert.ok(c.instruments.length<=16);
  assert.equal(u16(c.packet,0),c.bytes);assert.equal(u16(c.packet,4),0x2000+c.bytes);
  for(let voice=0;voice<6;voice++){
   const decoded=readVoice(c.packet,voice,c.instruments),part=score.channels[voice];
   assert.equal(decoded.t,score.ticks,'all voices loop on the same tick');
   assert.deepEqual(decoded.notes,part.notes.map(n=>[...n.slice(0,3),n[3]??part.instrument]).sort((a,b)=>a[0]-b[0]),score.title+' voice '+voice);
  }
  assert.equal(u16(c.packet,2+4+6*2),0x2000+c.bytes,'two voices remain available to native effects');
 }
 const tied={bpm:100,ticks:768,channels:[{instrument:23,notes:[[3,399,60],[405,3,72],[408,360,60]]}]};
 assert.deepEqual(readVoice(compileMusic(tied).packet,0,[23]).notes,tied.channels[0].notes.map(n=>[...n,23]));
});

test('the music compiler rejects invalid timing, overlap and native resource overflows',()=>{
 const score={bpm:108,ticks:192,channels:[{instrument:23,notes:[[0,48,60]]}]};
 for(const change of[s=>s.bpm=NaN,s=>s.bpm=1000,s=>s.ticks=191,s=>s.channels[0].volume=128,s=>s.channels[0].pan=-1,s=>s.channels[0].instrument=63,s=>s.channels[0].notes=[[0,48,60],[24,48,62]],s=>s.channels[0].notes=[[0,1,60]],s=>s.channels[0].notes=[[NaN,48,60]],s=>s.channels=Array(9).fill(s.channels[0])]){
  const bad=structuredClone(score);change(bad);assert.throws(()=>compileMusic(bad));
 }
 const large={bpm:108,ticks:192*200,channels:[{instrument:23,notes:Array.from({length:12800},(_,i)=>[i*3,3,12+(i*41+Math.floor(i/64)*17)%96])}]};
 assert.throws(()=>compileMusic(large),/safe limit/);
 // One-shot form cues end with EB on every voice and take no loop or finale;
 // octave steps of one use the one-byte D7/D8.
 const cue={form:true,once:true,tempo:98,instruments:[19],ticks:192,channels:[{instrument:19,notes:[[0,48,60],[48,48,72],[96,48,60],[144,48,84]]}]};
 const c=compileMusic(cue),seq=c.packet.slice(2),body=seq.slice(u16(seq,4)-0x2000);
 assert.equal(c.once,true);assert.equal(body.at(-1),0xeb);assert.ok(body.includes(0xd7)&&body.includes(0xd8)&&!body.includes(0xf6));
 assert.deepEqual(readVoice(c.packet,0,c.instruments,{once:true}).notes,cue.channels[0].notes.map(n=>[...n,19]));
 for(const change of[s=>s.loop=192,s=>s.branch={at:0,value:1,ticks:192},s=>s.once=1]){const bad=structuredClone(cue);change(bad);assert.throws(()=>compileMusic(bad),/one-shot/);}
});

test('MIDI import handles running status, velocity-zero releases, tempo and programs and rejects truncated tracks',()=>{
 const track=Uint8Array.from([0,0xff,0x51,3,8,0x7a,0x23,0,0xc0,29,0,0x90,60,90,0x81,0x40,60,0,0,64,100,0x60,0x80,64,0,0,0xff,0x2f,0]);
 const file=new Uint8Array(22+track.length);file.set([77,84,104,100,0,0,0,6,0,0,0,1,0,192,77,84,114,107,0,0,0,track.length]);file.set(track,22);
 const m=readMidi(file);assert.equal(m.ppq,192);assert.equal(m.tempos[0].microseconds,555555);
 assert.deepEqual(m.tracks[0].notes.map(n=>[n.at,n.duration,n.pitch,n.program]),[[0,192,60,29],[192,96,64,29]]);
 for(const bad of[file.slice(0,-1),Uint8Array.of(0,1,2),file.map((v,i)=>i===13?0:v)])assert.throws(()=>readMidi(bad));
});

test('music uses two unused native slots and rewrites only the title theme, title pendulum cue and flight theme, keeping the wake-up cue, source samples and other locations',()=>{
 for(const id of[15,30,41,78]){
  const p=0x70d18+id*3,source=fileOffset(u24(b.base,p));assert.equal(u24(b.rom,p),u24(b.base,p));
  assert.deepEqual(b.rom.slice(source,source+2+u16(b.base,source)),b.base.slice(source,source+2+u16(b.base,source)),'preserved song '+id);
 }
 assert.deepEqual(b.rom.slice(0x70aea,0x70d18),b.base.slice(0x70aea,0x70d18),'sample, pitch, loop and envelope tables');
 for(const t of b.audit.music.tracks){assert.ok(t.sampleBytes<=0x9000);assert.equal(fileOffset(u24(b.rom,0x70d18+t.id*3)),t.address);}
 for(let loc=0;loc<512;loc++)assert.equal(b.rom[0x360000+loc*14],loc===1?82:b.base[0x360000+loc*14]);
 const event=id=>decompress(b.rom,fileOffset(u24(b.rom,0x3cf9f0+u16(b.rom,0x360008+id*14)*3))).bytes;
 const sourceEvent=id=>decompress(b.base,fileOffset(u24(b.base,0x3cf9f0+u16(b.base,0x360008+id*14)*3))).bytes;
 for(const id of[1,2]){const source=sourceEvent(id),patched=event(id);for(let p=1;p<source.length-1;p++)if(source[p]===0xea&&source[p+1]===15)assert.deepEqual(patched.slice(p,p+2),source.slice(p,p+2),'one-shot morning cue');}
 for(const p of[0x8b7,0x958])assert.deepEqual(event(151).slice(p+1,p+3),Uint8Array.of(0xea,81),'both guardian phases');
});

test('the swamp uploads and plays its six-voice arrangement through the unmodified SPC driver',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h);
 d.jump({id:1,x:8,y:8});runFrames(s,400);assert.equal(s.ram[0x29ae],82);
 const t=b.audit.music.tracks.find(t=>t.id===82);assert.deepEqual(s.apu.ram.slice(0x2000,0x2000+t.bytes),b.rom.slice(t.address+2,t.address+2+t.bytes));
 const l=new Float32Array(534),r=new Float32Array(534);let energy=0,peak=0;
 for(let frame=0;frame<600;frame++){
  s.runFrame();s.setSamples(l,r,534);for(const a of[l,r])for(const v of a){assert.ok(Number.isFinite(v));energy+=v*v;peak=Math.max(peak,Math.abs(v));}
  for(let ch=0;ch<6;ch++)assert.ok(u16(s.apu.dsp.ram,ch*16+2)<0x4000,'DSP pitch fits fourteen bits');
 }
 assert.ok(energy>1);assert.ok(peak<0.95);assert.equal(d.diagnostics().fatal,null);d.undo();assert.equal(u16(s.ram,0x100),2);d.dispose();h.dispose();
});

const stock=Object.fromEntries(stockMusicReplacements.map(r=>[r.arrangement.id,arrangeStockMusic(b.base,r)]));
const expected=(notes,c,dt=0)=>[...notes].sort((a,b)=>a[0]-b[0]).map(n=>[n[0]+dt,n[1],n[2],c.percussion?null:n[3]??c.instrument]);

test('the title theme, title pendulum cue and flight theme are rewritten in place with their stock slots, kit and form, preserving every arranged and quoted note',()=>{
 for(const{song,score,compiled}of Object.values(stock)){
  const id=song.id;
  assert.equal(u24(b.rom,0x70d18+id*3),u24(b.base,0x70d18+id*3),'stock song pointer');
  for(const[at,size,what]of[[0x70e11+id*32,32,'instrument slots'],[0x71871+id*36,36,'percussion kit']])assert.deepEqual(b.rom.slice(at,at+size),b.base.slice(at,at+size),'stock '+what);
  const packet=b.rom.slice(song.pointer,song.pointer+2+song.length);
  assert.deepEqual(packet.slice(0,compiled.packet.length),compiled.packet);assert.ok(packet.slice(compiled.packet.length).every(v=>v===0),'unused stock bytes cleared');
  assert.ok(compiled.bytes<=song.length);
  // The one-shot title cue keeps the stock cue's eight voices (the stock cue
  // leaves none to effects either); the looping themes leave two.
  if(score.once)assert.ok(compiled.voices===8&&new Set(song.tracks).size===8&&!song.tracks.includes(u16(song.seq,2)),'eight voices, as the stock cue');
  else{assert.equal(compiled.voices,6);assert.equal(u16(compiled.packet,2+4+6*2),0x2000+compiled.bytes,'two voices remain available to native effects');}
  for(let voice=0;voice<compiled.voices;voice++){
   const c=score.channels[voice],want=[...c.notes].sort((a,b)=>a[0]-b[0]).map(n=>n[4]);
   if(score.once){
    const cue=readVoice(compiled.packet,voice,compiled.instruments,{once:true});
    assert.ok(cue.ended);assert.equal(cue.t,score.ticks,'every voice ends on the last tick');assert.equal(cue.finaleAt,null);
    assert.deepEqual(cue.notes,expected(c.notes,c),score.title+' voice '+voice);
    cue.volumes.forEach((v,i)=>{if(want[i]!==undefined&&want[i]!==null)assert.equal(v,want[i],'accent '+voice+':'+i);});
    continue;
   }
   const main=readVoice(compiled.packet,voice,compiled.instruments);
   assert.equal(main.t,score.ticks,'all voices loop on the same tick');assert.equal(main.loopTick,score.loop,'loop point');
   assert.deepEqual(main.notes,expected(c.notes,c),score.title+' voice '+voice);
   main.volumes.forEach((v,i)=>{if(want[i]!==undefined&&want[i]!==null)assert.equal(v,want[i],'accent '+voice+':'+i);});
   if(!score.branch){assert.equal(main.finaleAt,null);continue;}
   const end=readVoice(compiled.packet,voice,compiled.instruments,{finale:true});
   assert.equal(end.finaleAt,score.branch.at);assert.ok(end.ended);assert.equal(end.t,score.branch.at+score.branch.ticks,'finale length');
   assert.deepEqual(end.notes.filter(n=>n[0]>=score.branch.at),expected(c.branch,c,score.branch.at),score.title+' finale voice '+voice);
  }
 }
 // Same shape as the stock theme: 48-tick pickup, 8-bar introduction, 16-bar
 // loop tested in its last bar, 25-bar finale; and the stock kit part itself.
 const trigger=stock[0x18].score;
 assert.deepEqual([trigger.pickup,trigger.loop,trigger.ticks,trigger.branch.at,trigger.branch.ticks,trigger.tempo],[48,1584,4656,4464,4800,130]);
 const kit=trigger.channels[4],stockKit=stockVoice(stock[0x18].song,4,{from:0,to:4656});
 assert.deepEqual(kit.notes.map(n=>n.slice(0,3)),stockKit.notes.map(([t,d,p])=>[t,t+d>4464&&t<4464?4464-t:d,p]),'stock snare march');
 assert.deepEqual(stock[0x13].score.instruments,stock[0x13].song.instruments.filter(Boolean));
 // The pendulum cue keeps the stock tempo and length, and quotes the stock
 // timpani roll (two of its three voices) into the logo and the stock cymbal on it.
 const cue=stock[0x30],pendulum=cue.score;
 assert.deepEqual([pendulum.once,pendulum.tempo,pendulum.ticks],[true,98,2496]);
 assert.deepEqual(pendulum.instruments,cue.song.instruments.filter(Boolean));
 for(const voice of[6,7])assert.deepEqual(pendulum.channels[voice].notes.filter(n=>n[0]>=768&&n[0]<960).map(n=>n.slice(0,4)),stockVoice(cue.song,voice,{from:768,to:960}).notes.map(([t,d,p,s])=>[t+768,d,p,s]),'stock roll '+voice);
 assert.deepEqual(pendulum.channels[7].notes.find(n=>n[0]===960).slice(0,4),stockVoice(cue.song,7,{from:960,to:1344}).notes[0].slice(0,4).map((x,i)=>i?x:x+960),'stock cymbal');
});

test('All Star quotes in the stock-song arrangements are the supplied MIDI melody at fixed transpositions',()=>{
 const flute=new Set(allStar.channels[0].notes.map(n=>(n[0]+allStar.source.loop.pickupTicks)+','+(n[2]-12)));
 for(const phrase of[verse,chorus,bridge])for(const[bar,tick,,pitch]of phrase.notes)assert.ok(flute.has((phrase.from+bar)*192+tick+','+pitch),'MIDI note '+phrase.from+':'+bar+':'+tick);
 const has=(score,notes,voice=0)=>{const lead=new Set(score.channels[voice].notes.map(n=>n[0]+','+n[2]));for(const[t,,p]of notes)assert.ok(lead.has(t+','+p),score.title+' quote at '+t);};
 has(stock[0x18].score,[...place(verse,1584,15,{from:0}),...place(chorus,1584+8*192,15)]);
 has(stock[0x13].score,[...place(verse,768,16),...place(chorus,12*192,16)]);
 // Music box: "Somebody once told me... in the shed", the chorus's first two
 // bars with the choir and its second half alone; choir: the first half.
 const pendulum=stock[0x30].score;
 has(pendulum,[...place(verse,192,20,{to:4}).filter(([t])=>t<912),...place(chorus,960,20,{to:2}),...place(chorus,960,20,{from:4})]);has(pendulum,place(chorus,960,20,{to:4}),4);
});

// Plays audio frames and returns per-frame RMS; checks DSP pitch on music voices.
function listen(s,frames){
 const l=new Float32Array(534),r=new Float32Array(534),rms=[];let peak=0;
 for(let f=0;f<frames;f++){
  s.runFrame();s.setSamples(l,r,534);let e=0;for(const a of[l,r])for(const v of a){assert.ok(Number.isFinite(v));e+=v*v;peak=Math.max(peak,Math.abs(v));}rms.push(Math.sqrt(e/1068));
  for(let ch=0;ch<6;ch++){const d=s.apu.dsp.ram;if(d[ch*16+4]>=0x20&&d[ch*16+4]<0x30)assert.ok(u16(d,ch*16+2)<0x4000,'DSP pitch fits fourteen bits');}
 }
 return{rms,peak};
}
const uploaded=(s,id)=>{const t=b.audit.music.tracks.find(t=>t.id===id);return s.apu.ram.slice(0x2000,0x2000+t.bytes).every((v,i)=>v===b.rom[t.address+2+i]);};

test('the native title plays All Star Trigger and the flight plays the Wings arrangement through the unmodified SPC driver',async()=>{
 const title=await createCore(b.rom);let frames=0;
 while(title.ram[0x29ae]!==24&&frames<3000){title.runFrame();frames++;}
 assert.equal(title.ram[0x29ae],24,'title theme requested');runFrames(title,240);assert.ok(uploaded(title,24),'title sequence uploaded');
 const opening=listen(title,600);assert.ok(Math.max(...opening.rms)>0.02);assert.ok(opening.peak<0.95);
 const s=await bedroom(b.rom),h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h);
 d.jump({id:496,x:55,y:35,party:[0,1,2],dragon:'flying'});runFrames(s,500);runFrames(s,3,256);runFrames(s,600);
 assert.ok(s.ram[0x294]&0x40,'flying');assert.ok(uploaded(s,19),'flight sequence uploaded');
 const flight=listen(s,600);assert.ok(Math.max(...flight.rms)>0.02);assert.ok(flight.peak<0.95);assert.equal(d.diagnostics().fatal,null);d.dispose();h.dispose();
});

test('the boot title plays All Star Pendulum under the pendulum and logo on the stock cue\'s beats and ends before the logo fades',async()=>{
 const boot=async rom=>{
  const s=await createCore(rom),l=new Float32Array(534),r=new Float32Array(534),rms=[],first=[null,null],prev=[0,0];let peak=0,upload=false,reveal=null,rollSample=null;
  for(let f=0;f<2158;f++){
   s.runFrame();s.setSamples(l,r,534);let e=0;for(const a of[l,r])for(const v of a){assert.ok(Number.isFinite(v));e+=v*v;peak=Math.max(peak,Math.abs(v));}rms.push(Math.sqrt(e/1068));
   for(let ch=0;ch<8;ch++)assert.ok(u16(s.apu.dsp.ram,ch*16+2)<0x4000,'DSP pitch fits fourteen bits');
   // Voice 1 keys the clock's first tick and voice 7 the stock roll's first
   // stroke; on the logo voice 7 changes from the timpani to the cymbal.
   [1,7].forEach((v,i)=>{const x=s.apu.dsp.ram[v*16+8];if(first[i]===null&&prev[i]<20&&x>prev[i]+20){first[i]=f;if(v===7)rollSample=s.apu.dsp.ram[7*16+4];}prev[i]=x;});
   if(rollSample!==null&&reveal===null&&s.apu.dsp.ram[7*16+4]!==rollSample)reveal=f;
   if(rom===b.rom&&!upload&&f<2134)upload=uploaded(s,0x30);
  }
  return{rms,peak,first,reveal,upload,silent:rms.findIndex((_,i)=>i>1000&&rms.slice(i).every(v=>v<1e-4))};
 };
 const patched=await boot(b.rom),original=await boot(b.base);
 assert.ok(patched.upload,'title cue uploaded at boot');
 assert.ok(Math.abs(patched.first[0]-original.first[0])<=2,`first tick at ${patched.first[0]}, stock ${original.first[0]}`);
 assert.ok(Math.abs(patched.first[1]-original.first[1])<=2,`roll at ${patched.first[1]}, stock ${original.first[1]}`);
 assert.ok(original.reveal>original.first[1]&&Math.abs(patched.reveal-original.reveal)<=2,`logo reveal at ${patched.reveal}, stock ${original.reveal}`);
 assert.ok(Math.max(...patched.rms)>0.05);assert.ok(patched.peak<0.95);
 // The game fades the logo and stops music at frame 2134; the cue is over first.
 assert.ok(patched.silent>original.reveal&&patched.silent<2134,`cue silent from frame ${patched.silent}`);
});

test('sound command 88 sends All Star Trigger through its finale to the same native ending as the stock theme',async()=>{
 const ending=async rom=>{
  const s=await bedroom(rom),h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h);
  d.jump({id:1,x:8,y:8});runFrames(s,400);let start=null,armed=false;
  const off=h.on('event.dispatch',e=>{if(e.location!==1)return;
   if(start===null){s.ram.set([0xea,0x18,0xb2],0x12001+e.scriptPC);start=s.frames;}
   else if(!armed&&s.frames-start>=600){s.ram.set([0xec,0x88,0x01,0x01,0xb2],0x12001+e.scriptPC);armed=true;}});
  const{rms}=listen(s,6200);off();d.dispose();h.dispose();
  assert.ok(armed&&s.apu.ram[0xd2]===1,'finale armed');
  const quiet=rms.findIndex((_,i)=>i>600&&rms.slice(i,i+120).every(v=>v<1e-4));
  assert.ok(quiet>0&&rms.slice(quiet).every(v=>v<1e-4),'song ended and stayed silent');
  return quiet;
 };
 const patched=await ending(b.rom),original=await ending(b.base);
 assert.ok(Math.abs(patched-original)<=90,`ending at frame ${patched}, stock ${original}`);
});

const worldwide=arrangeWorldwideMusic(b.base);

test('the Mr. Worldwide theme takes spare stock slot 0x4F and leaves Boss Battle 2 untouched',()=>{
 const id=worldwideSong,{compiled,score}=worldwide;
 assert.equal(id,0x4f);
 // The source slot is a two-bar one-shot fanfare nothing plays: no location
 // music byte, no event EA command and no immediate song request in code.
 const spare=stockSong(b.base,id);assert.equal(spare.length,252);assert.equal(spare.seq[spare.seq.length-1],0xeb);
 for(let loc=0;loc<512;loc++)assert.notEqual(b.base[0x360000+loc*14],id,'location '+loc);
 for(let ev=0;ev<513;ev++){let e;try{e=decompress(b.base,fileOffset(u24(b.base,0x3cf9f0+ev*3))).bytes;}catch{continue;}
  for(let p=1+e[0]*32;p<e.length-1;p++)assert.ok(!(e[p]===0xea&&e[p+1]===id),'event '+ev+' plays the spare slot');}
 for(let p=0;p+5<=b.base.length;p++)assert.ok(!(b.base[p]===0xa9&&b.base[p+1]===id&&[0x8d,0x8f].includes(b.base[p+2])&&b.base[p+3]===1&&b.base[p+4]===0x1e),'code requests the spare slot');
 // The cartridge carries the compiled song, its own instrument table and an
 // explicit empty percussion kit.
 const t=b.audit.music.tracks.find(t=>t.id===id);assert.ok(t.superboss);
 assert.equal(fileOffset(u24(b.rom,0x70d18+id*3)),t.address);
 assert.deepEqual(b.rom.slice(t.address,t.address+compiled.packet.length),compiled.packet);
 for(let i=0;i<16;i++)assert.equal(u16(b.rom,0x70e11+id*32+i*2),compiled.instruments[i]??0);
 assert.ok(b.rom.slice(0x71871+id*36,0x71871+id*36+36).every(v=>v===0));
 // Boss Battle 2 keeps its pointer, bytes, instruments and kit.
 const q=worldwideMusic.quotes.id,source=fileOffset(u24(b.base,0x70d18+q*3));
 assert.equal(u24(b.rom,0x70d18+q*3),u24(b.base,0x70d18+q*3));
 assert.deepEqual(b.rom.slice(source,source+2+u16(b.base,source)),b.base.slice(source,source+2+u16(b.base,source)));
 for(const[at,size]of[[0x70e11+q*32,32],[0x71871+q*36,36]])assert.deepEqual(b.rom.slice(at,at+size),b.base.slice(at,at+size));
 assert.equal(score.title,'Fireball · Boss Battle 2');
});

test('Fireball · Boss Battle 2 compiles within native limits and preserves every arranged note through its loop',()=>{
 const{compiled,score,quoted}=worldwide;
 assert.equal(compiled.voices,6);assert.ok(compiled.bytes<0xf00);
 assert.equal(u16(compiled.packet,2+4+6*2),0x2000+compiled.bytes,'two voices remain available to battle effects');
 assert.deepEqual(compiled.instruments,fireballInstruments);
 assert.deepEqual(compiled.instruments.slice(0,5),quoted.instruments.filter(Boolean),'Boss Battle 2\'s instrument slots come first');
 const samples=compiled.instruments.reduce((n,i)=>n+u16(b.base,fileOffset(u24(b.base,0x70aea+(i-1)*3))),0);
 assert.equal(b.audit.music.tracks.find(t=>t.id===worldwideSong).sampleBytes,samples);assert.ok(samples<=0x9000);
 assert.deepEqual([score.pickup,score.loop,score.ticks,score.tempo,fireballTempo],[96,96,96+32*192,136,136]);
 for(let voice=0;voice<6;voice++){
  const c=score.channels[voice],main=readVoice(compiled.packet,voice,compiled.instruments);
  assert.equal(main.t,score.ticks,'all voices loop on the same tick');assert.equal(main.loopTick,score.loop,'loop point');assert.equal(main.finaleAt,null);
  assert.deepEqual(main.notes,expected(c.notes,c),score.title+' voice '+voice);
 }
});

test('Fireball quotes are the supplied MIDI at fixed transpositions and Boss Battle 2 parts come from the ROM',async()=>{
 const{score,quoted}=worldwide,[lead,bass,strings,horn,kick,kit]=score.channels.map(c=>new Set(c.notes.map(n=>n[0]+','+n[2])));
 assert.equal(fireballBossBattle.source.sha256,fireball.fireballSource.sha256);
 const has=(set,notes,what)=>{for(const[t,,p]of notes)assert.ok(set.has(t+','+p),what+' at '+t);};
 const bar=k=>96+k*192,key=toBossKey;
 // The trumpet riff in D minor: an octave up on the lead, doubled at pitch on
 // the brass section; in Boss Battle 2's statement it answers an octave up on
 // D and a fourth down on G.
 for(const k of[0,2,8,10,12,14,28,30])has(lead,fireball.place(fireball.hook,bar(k),12,key),'riff');
 for(const k of[0,2,8,10,12,14])has(horn,fireball.place(fireball.hook,bar(k),0,key),'riff doubling');
 for(const[k,t]of[[16,12],[18,5],[22,12]])has(horn,fireball.place(fireball.hook,bar(k),t,key),'riff answer');
 for(const k of[2,8,10,12,14,28,30])has(bass,fireball.place(fireball.bass,bar(k),24,key),'bass riff');
 for(const k of[0,2])has(strings,fireball.place(fireball.strumTop,bar(k),12,key),'strum');
 has(lead,fireball.place(fireball.chop,bar(4),12,key).filter(([t])=>t<bar(7)),'sax chop');
 // The file's tom fill (second half of its bar 16) on timpani before each stop.
 const toms={45:38,43:33,41:29},fill=new Map();
 for(const[b,t,k]of fireball.fillDrums.notes)if(b===0&&t>=96&&k in toms&&!(fill.get(t)>toms[k]))fill.set(t,toms[k]);
 assert.equal(fill.size,4);for(const k of[6,26])has(kick,[...fill].map(([t,p])=>[bar(k)+t,0,p]),'tom fill');
 // The drop's groove from the file: a kick on every beat and its hats on the
 // offbeats, plus a snare on two and four.
 for(let k=8;k<16;k++){for(const t of[0,48,96,144])assert.ok(kick.has(bar(k)+t+',72'),'kick '+k+':'+t);assert.ok(kit.has(bar(k)+48+',75')&&kit.has(bar(k)+144+',75'),'backbeat '+k);}
 for(const[b,t,k]of fireball.hookDrums.notes)if(k===42)assert.ok(kit.has(bar(10+b)+t+',76'),'hat '+(10+b)+':'+t);
 // FIRE-BALL: every voice strikes beat one of bars 7 and 27 (the melodic
 // voices and the timpani beat two as well), then nothing sounds from beat
 // three until the pickup on the last eighth.
 for(const k of[7,27]){const at=bar(k);
  score.channels.forEach((c,v)=>{
   assert.ok(c.notes.some(n=>n[0]===at)&&(v===5||c.notes.some(n=>n[0]===at+48)),'voice '+v+' hits FIRE-BALL in bar '+k);
   assert.ok(!c.notes.some(n=>n[0]<at+168&&n[0]+n[1]>at+96),'voice '+v+' leaves room for the shout in bar '+k);
  });}
 // The string ostinato: sixteenths on the strum's own voicing in the drops,
 // on Boss Battle 2's pads and bass in its sections.
 const ostinato=(from,to)=>score.channels[2].notes.filter(n=>n[0]>=from&&n[0]<to);
 for(const[from,to]of[[bar(8),bar(16)],[bar(28),bar(32)]]){
  const ns=ostinato(from,to);assert.equal(ns.length,(to-from)/12);
  for(const[t,d,p]of ns){assert.equal(d,12);let v=null;
   fireball.strumTop.notes.forEach(([b,o,,top],i)=>{if(b*192+o<=(t-from)%384)v=[key(top)%12,key(fireball.strumInner.notes[i][3])%12];});
   const ok=new Set(v);if(v[0]===v[1])ok.add((v[0]+7)%12);assert.ok(ok.has(p%12),'drop ostinato at '+t);}
 }
 for(const[from,len,at]of[[1632,1536,bar(16)],[3936,576,bar(24)]]){
  const parts=[3,4,5,7].map(v=>stockVoice(quoted,v,{from,to:from+len}).notes);
  for(const[t,,p]of ostinato(at,at+len)){const pcs=new Set(parts.flatMap(ns=>ns.filter(([s,d])=>s<=t-at&&t-at<s+d).map(n=>n[2]%12)));assert.ok(pcs.has(p%12),'boss ostinato at '+t);}
 }
 // Boss Battle 2: pickup, second statement, brass harmony, turnaround in
 // octaves and the counter-melody under the last drop.
 const stock=(voice,from,to,at,set,what)=>has(set,stockVoice(quoted,voice,{from,to}).notes.map(([t,d,p])=>[t+at,d,p]),what);
 stock(0,0,96,0,lead,'stock pickup');
 stock(0,1632,3168,bar(16),lead,'stock melody');stock(5,1632,3168,bar(16),bass,'stock bass');stock(1,2400,2784,bar(20),horn,'stock brass harmony');
 stock(0,3936,4512,bar(24),lead,'stock turnaround');stock(1,3936,4512,bar(24),horn,'stock turnaround octave');stock(5,3936,4512,bar(24),bass,'stock turnaround bass');
 stock(0,96,864,bar(28),horn,'stock counter-melody');
 // Re-derive the quoted phrases from the private MIDI when it is present.
 const midi='.local/music/fireball-source.mid';
 if(await access(midi).then(()=>true,()=>false)){
  const fresh=await importFireball(midi);assert.equal(fresh.sha256,fireball.fireballSource.sha256);
  for(const[k,p]of Object.entries(fresh.phrases))assert.deepEqual(fireball[k],p,'phrase '+k);
 }
});

test('the native SPC driver uploads and loops Fireball · Boss Battle 2',async()=>{
 const s=await bedroom(b.rom),h=installHooks(s,JSON.parse(await readFile('content/hooks.json'))),d=createDevTools(s,h);
 d.jump({id:1,x:8,y:8});runFrames(s,400);let started=false;
 const off=h.on('event.dispatch',e=>{if(e.location!==1||started)return;s.ram.set([0xea,worldwideSong,0xb2],0x12001+e.scriptPC);started=true;});
 runFrames(s,240);off();assert.ok(started);assert.ok(uploaded(s,worldwideSong),'sequence uploaded');
 // 130 beats at tempo 136 last about 3,450 frames (the tempo byte is beats
 // per minute). The brass-section voice changes to strings only for the
 // counter-melody in the last drop (bar 28) and back to brass when the loop
 // restarts the trumpet riff, so listen until both have happened.
 const sources=[];let rms=[],peak=0;
 for(let chunk=0;chunk<24;chunk++){const r=listen(s,200);rms.push(...r.rms);peak=Math.max(peak,r.peak);const src=s.apu.dsp.ram[3*16+4];if(sources.at(-1)!==src)sources.push(src);}
 assert.ok(peak<0.95);assert.ok(Math.max(...rms.slice(0,600))>0.02,'the intro sounds');
 assert.ok(sources.length>=3&&sources[0]===sources[2]&&sources[1]!==sources[0],'counter-melody strings, then the looped riff on brass: '+sources);
 assert.ok(Math.max(...rms.slice(4400))>0.02,'still playing after the loop point');
 assert.equal(d.diagnostics().fatal,null);d.dispose();h.dispose();
});
