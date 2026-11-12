// Shared recorder for the teaser trailer: runs the in-house emulator and pipes
// picture and sound into an MP4 (256x224 doubled to 512x448, 60 fps).
import {spawn} from 'node:child_process';
import {writeFile,rm} from 'node:fs/promises';
export const RATE=32040,N=534,W=256,H=224;
export async function record(s,path,frames,input=()=>0){
  const raw=path+'.rgba',wavPath=path+'.wav';
  const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-r','60','-i','pipe:0','-c:v','libx264','-preset','veryfast','-crf','12','-pix_fmt','yuv444p',raw+'.mp4'],{stdio:['pipe','inherit','inherit']});
  const pcm=new Int16Array(frames*N*2),l=new Float32Array(N),r=new Float32Array(N),px=new Uint8Array(512*480*4),frame=Buffer.alloc(W*H*4);
  for(let f=0;f<frames;f++){
    s.joypad1State=input(f);
    s.runFrame();s.setSamples(l,r,N);s.setPixels(px);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=((y*2+16)*512+x*2)*4,t=(y*W+x)*4;frame[t]=px[o];frame[t+1]=px[o+1];frame[t+2]=px[o+2];frame[t+3]=255;}
    if(!ff.stdin.write(Buffer.from(frame)))await new Promise(k=>ff.stdin.once('drain',k));
    for(let i=0;i<N;i++){pcm[(f*N+i)*2]=Math.max(-32768,Math.min(32767,Math.round(l[i]*32767)));pcm[(f*N+i)*2+1]=Math.max(-32768,Math.min(32767,Math.round(r[i]*32767)));}
  }
  ff.stdin.end();await new Promise(k=>ff.on('close',k));
  const wav=Buffer.alloc(44+pcm.byteLength);
  wav.write('RIFF',0);wav.writeUInt32LE(36+pcm.byteLength,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(RATE,24);wav.writeUInt32LE(RATE*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.byteLength,40);Buffer.from(pcm.buffer).copy(wav,44);
  await writeFile(wavPath,wav);
  const {spawnSync}=await import('node:child_process');
  const m=spawnSync('ffmpeg',['-y','-loglevel','error','-i',raw+'.mp4','-i',wavPath,'-c:v','copy','-c:a','pcm_s16le',path+'.mkv']);
  if(m.status)throw Error(String(m.stderr));
  await rm(raw+'.mp4');await rm(wavPath);
}
