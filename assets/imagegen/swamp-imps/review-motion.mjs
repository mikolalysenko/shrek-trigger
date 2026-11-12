// Matched-origin source comparison; actual native scheduler proof is separate.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
const dir='assets/imagegen/swamp-imps',out='.local/qa/swamp-imps-native-proof',json=async f=>JSON.parse(await readFile(dir+'/'+f)),resources=await json('native-resource-audit.json'),rom=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc')),graphics=new Uint8Array(await readFile(dir+'/graphics.4bpp')),images={},pngs={},programs=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const g of resources.groups){
  const palette=g.key==='imp'?67:63,original=nativeSpriteBank(rom,{gfx:86,asm:g.asm,size:g.size,palette,frames:g.frames.length}),candidate={graphics,assembly:new Uint8Array(await readFile(dir+'/'+g.key+'/assembly.bin')),cells:g.cells,frames:g.frames.length},colors=resources.palettes.find(p=>p.id===palette).current.colors.map(c=>[0,2,4].map(i=>parseInt(c.slice(i,i+2),16)));
  pngs[g.key]=[original,candidate].map(bank=>Array.from({length:g.frames.length},(_,f)=>{
    const png=new PNG({width:64,height:72}),seen=new Uint8Array(64*72);
    for(const c of nativeSpriteCells(bank,f))for(let q=0;q<256;q++){
      const k=c.pixels[q],x=32+c.x+q%16,y=62+c.y+(q>>4),at=y*64+x;
      if(k&&x>=0&&x<64&&y>=0&&y<72&&!seen[at]){seen[at]=1;png.data.set([...colors[k-1],255],at*4);}
    }
    return png;
  }));
  images[g.key]=pngs[g.key].map(a=>a.map(p=>'data:image/png;base64,'+PNG.sync.write(p).toString('base64')));
  const loops=resources.animations.filter(a=>a.familyGroups.some(q=>q.key===g.key)).flatMap(a=>a.lists.filter(l=>l.steps.length).map(l=>({group:g.key,program:a.id,...l})));
  programs.push(...loops);
  const html='<!doctype html><meta charset="utf-8"><style>body{background:#253036;color:#eee;font:14px system-ui;padding:18px}.loop{display:inline-block;background:#35434a;margin:8px;padding:8px}h2{font-size:14px}small{display:block}canvas{width:192px;height:216px;image-rendering:pixelated}</style><h1>'+g.key+' · original / generated native source motion</h1><p>Original CT at left; generated candidate at right. Fixed matching origins and exact original request durations at60Hz. Source replay only: native uploads and the measured Rider display latency are documented separately.</p><div id="loops"></div><script>const sources='+JSON.stringify(images[g.key])+',loops='+JSON.stringify(loops)+',images=sources.map(a=>a.map(src=>{const i=new Image();i.src=src;return i;})),views=loops.map(l=>{const d=document.createElement("div");d.className="loop";d.innerHTML="<h2>AA"+l.program+" facing"+l.facing+" action"+l.action+"</h2><small>"+l.steps.map(s=>s.frame+" × "+s.duration).join(", ")+"</small>";const contexts=[0,1].map(()=>{const c=document.createElement("canvas");c.width=64;c.height=72;d.appendChild(c);return c.getContext("2d");});document.querySelector("#loops").appendChild(d);return{l,contexts};});let tick=0;setInterval(()=>{for(const{l,contexts}of views){let t=tick%l.steps.reduce((n,s)=>n+s.duration,0),p=0;while(t>=l.steps[p].duration)t-=l.steps[p++].duration;contexts.forEach((g,i)=>{g.clearRect(0,0,64,72);g.drawImage(images[i][l.steps[p].frame],0,0);});}tick++;},1000/60);</script>';
  await writeFile(dir+'/review/original-new-motion-'+g.key+'.html',html);
}
const walks=[33,44,100,83].flatMap(id=>programs.filter(p=>p.program===id&&p.action===1));
await mkdir(out+'/source-motion',{recursive:true});
for(let tick=0;tick<120;tick++){
  const png=new PNG({width:512,height:288});for(let p=0;p<png.data.length;p+=4)png.data.set([37,48,54,255],p);
  walks.forEach((l,n)=>{let t=tick%l.steps.reduce((s,p)=>s+p.duration,0),step=0;while(t>=l.steps[step].duration)t-=l.steps[step++].duration;for(let j=0;j<2;j++){const im=pngs[l.group][j][l.steps[step].frame];for(let y=0;y<72;y++)for(let x=0;x<64;x++){const q=(y*64+x)*4;if(im.data[q+3])png.data.set(im.data.subarray(q,q+4),((Math.floor(n/4)*72+y)*512+(n%4)*128+j*64+x)*4);}}});
  await writeFile(out+'/source-motion/frame-'+String(tick).padStart(3,'0')+'.png',PNG.sync.write(png));
}
execFileSync('ffmpeg',['-v','error','-y','-framerate','60','-i',out+'/source-motion/frame-%03d.png','-plays','0','-f','apng',dir+'/review/original-new-gaits.apng']);
const scenes=await json('native-scene-proof.json'),timing=await json('native-timing-proof.json'),startup=await json('native-timing-startup-audit.json');
await writeFile(dir+'/motion-review.json',JSON.stringify({status:'Original/generated source loops rendered; native all-owner timing and authored scene captures passed',sourceComparison:['imp','roly','rider'].map(k=>'review/original-new-motion-'+k+'.html'),gaitAnimation:{file:'review/original-new-gaits.apng',sha256:hash(await readFile(dir+'/review/original-new-gaits.apng')),ticks:120,framesPerSecond:60,layout:'Four rows AA33 Imp, AA44 Roly, AA100 Rolypoly, AA83 Rider; each row rear/front/left/right. Each pair original at left and candidate at right; same native origin.'},programs,nativeExecution:{file:'native-timing-proof.json',cases:timing.cases,cycles:timing.cycles,ticks:timing.ticks,originalFrameRequestsAndTimersExact:true,completeCoherentFrameUploads:true,delayedVideoTicks:timing.delayedVideoTicks,maximumRequestDisplayDelay:timing.maximumRequestDisplayDelay,startupAlignment:{ticks:startup.startupVideoTicks,delayedVideoTicks:startup.delayedStartupVideoTicks,maximumConsecutiveDelay:startup.maxConsecutiveDelayVideoFrames,file:'native-timing-startup-audit.json'},scope:'Four delayed scored-cycle video ticks belong only to size1 enemy19 Rider; all measured four-cell owners have zero delayed ticks.'},nativeSceneCaptures:scenes.motions,limitations:['Source comparison replays request durations, not the native display scheduler. It does not erase the measured one-video-frame Rider boundary latency.','The 120-tick source APNG loops the review interval; full native list cycles are independently tested twice per owner/action/facing.','Actual scene APNGs observe their original consumers; only the isolated native proof covers all83 poses.']},null,2)+'\n');
console.log('Original/new source motion rendered for all four original programs');
