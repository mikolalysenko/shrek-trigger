// Cuts the teaser trailer: the title pendulum with its own cue, then a montage
// cut on the beat of the in-game All Star Trigger arrangement (130 BPM), ending
// on the title logo. Footage: record-trailer-shot.mjs, record-tech.mjs clips,
// a power-on recording (boot.mkv) and record-trailer-song.mjs.
import {spawnSync} from 'node:child_process';
const T='.local/trailer',C='.local/qa/tech-clips',tech=n=>`${C}/tech-${String(n).padStart(3,'0')}.mp4`,area=(n,d='shots')=>`${T}/${d}/area-${String(n).padStart(3,'0')}.mkv`;
const BEAT=60/130,SONG_START=1.666,PENDULUM=[5.6,12.5],LOGO=22,LOGO_BEATS=9;
// [file, start seconds, beats]
const shots=[
  [area(2,'walk'),0.4,5],[area(4,'walk'),1.0,4],[tech(1),0.8,4],[area(5),0.3,4],[tech(18),1.7,4],[area(3,'walk'),1.0,2],
  [tech(32),4.3,4],[area(38),5.5,4],[tech(8),5.5,3],[area(8,'walk'),1.0,2],[tech(60),4.7,4],[area(76),2.6,3],
  [tech(40),5.5,3],[area(89),1.2,3],[tech(14),5.7,2],[tech(4),5.0,3],[tech(20),1.5,2],[tech(63),5.6,3],[area(98),0.5,4],
  [tech(28),1.5,1],[tech(1),1.6,1],[tech(32),5.2,1],[tech(18),2.6,1],[area(38),8,1],[tech(60),5.7,1],[tech(40),6.0,1],[area(98),4,1],
];
const inputs=[],filters=[],labels=[];let n=0,beat=0;
const clip=(file,start,frames)=>{inputs.push('-i',file);filters.push(`[${n}:v]trim=start=${start}:end=${start+frames/60+0.5},setpts=PTS-STARTPTS,fps=60,trim=end_frame=${frames},scale=1024:896:flags=neighbor,setsar=1,format=yuv420p[v${n}]`);labels.push(`[v${n}]`);n++;};
const pendulumFrames=Math.round((PENDULUM[1]-PENDULUM[0])*60);
clip(`${T}/boot.mkv`,PENDULUM[0],pendulumFrames);
// Whole-frame cut points so the picture never drifts off the beat.
for(const[file,start,beats]of shots){const a=Math.round(beat*BEAT*60);beat+=beats;clip(file,start,Math.round(beat*BEAT*60)-a);}
const montage=Math.round(beat*BEAT*60),logoFrames=Math.round((beat+LOGO_BEATS)*BEAT*60)-montage;
clip(`${T}/boot.mkv`,LOGO,logoFrames);
const musicLength=(montage+logoFrames)/60;
inputs.push('-i',`${T}/boot.mkv`,'-i',`${T}/song.mkv`);
filters.push(`${labels.join('')}concat=n=${labels.length}:v=1:a=0,fade=t=out:st=${pendulumFrames/60+musicLength-0.8}:d=0.8[v]`);
filters.push(`[${n}:a]atrim=start=${PENDULUM[0]}:end=${PENDULUM[1]},asetpts=PTS-STARTPTS,afade=t=in:d=0.3,afade=t=out:st=${PENDULUM[1]-PENDULUM[0]-0.12}:d=0.12,volume=2[a0]`);
filters.push(`[${n+1}:a]atrim=start=${SONG_START}:end=${SONG_START+musicLength},asetpts=PTS-STARTPTS,afade=t=out:st=${musicLength-2.2}:d=2.2,volume=2[a1]`);
filters.push('[a0][a1]concat=n=2:v=0:a=1,alimiter=limit=0.95[a]');
const out=process.argv[2]??`${T}/shrek-trigger-teaser.mp4`;
const r=spawnSync('ffmpeg',['-y','-loglevel','error',...inputs,'-filter_complex',filters.join(';'),'-map','[v]','-map','[a]','-r','60','-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',out],{stdio:'inherit'});
console.log(r.status===0?`wrote ${out}: ${(pendulumFrames/60+musicLength).toFixed(1)} s, ${shots.length} montage shots`:'ffmpeg failed');process.exit(r.status);
