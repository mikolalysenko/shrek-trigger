import{pixelCanvas}from'./pixel-art.js';
const edge=(p,w,h)=>{const out=p.slice();for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(p[y*w+x])for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){const a=x+dx,b=y+dy;if(a>=0&&b>=0&&a<w&&b<h&&!p[b*w+a])out[b*w+a]=1;}return out;};
export const rootFrames=Array.from({length:17},(_,f)=>f<12?{facing:Math.floor(f/3),phase:f%3}:f===12?{facing:1,phase:1,hit:true}:{facing:1,phase:1,reach:!!(f&1),stretch:!(f&1)});
export function rootlingSprite(f){
 const a=rootFrames[f],c=pixelCanvas(32,32),{rect,line,oval,polygon:poly,dot}=c,step=[-1,0,1][a.phase],side=a.facing>=2,back=a.facing===0,up=a.stretch?2:0;
 const root=(pts)=>{for(let i=1;i<pts.length;i++){line(...pts[i-1],...pts[i],2);line(pts[i-1][0],pts[i-1][1]-1,pts[i][0],pts[i][1]-1,3);}};
 root([[12,23],[10,26+step],[5,28+step],[3,27+step]]);root([[20,23],[23,27-step],[27,28-step],[29,27-step]]);
 root([[14,24],[13,29-step],[9,30-step]]);root([[18,24],[18,29+step],[22,30+step]]);
 if(a.reach){root([[11,18],[7,14],[3,15],[2,12]]);root([[21,18],[26,14],[29,15],[30,12]]);}else{root([[11,19],[8,22],[4,21+step]]);root([[21,19],[25,22],[28,21-step]]);}
 oval(9,8-up,15,19+up,2);oval(10,8-up,13,17+up,3);oval(11,9-up,9,13+up,4);line(20,12-up,21,22,2);line(12,19,13,24,3);
 // A cut stump crown, with a live shoot growing through the old rings.
 oval(9,7-up,15,7,3);oval(10,7-up,13,5,5);oval(12,8-up,9,3,4);line(14,9-up,19,9-up,2);dot(16,8-up,3);
 line(17,8-up,18,3-up,6);poly([[18,5-up],[20,1],[24,2],[22,5-up]],7);dot(21,2,8);poly([[17,6-up],[13,3-up],[12,5-up],[15,7-up]],7);dot(13,4-up,8);
 if(back){line(13,13-up,12,18,2);line(16,12-up,17,16,3);line(17,17,15,20,2);oval(15,21,4,4,2);dot(16,22,4);}
 else if(side){rect(11,14-up,3,4,1);dot(11,14-up,12);poly([[10,18-up],[7,19-up],[10,21-up],[13,20-up]],3);dot(8,19-up,5);line(11,23-up,15,22-up,2);line(17,16-up,19,19-up,3);}
 else {if(a.hit){line(11,16-up,14,17-up,1);line(18,17-up,21,16-up,1);}else{rect(11,14-up,3,4,1);rect(18,14-up,3,4,1);dot(12,14-up,12);dot(19,14-up,12);line(11,14-up,14,15-up,2);line(18,15-up,21,14-up,2);dot(12,16-up,12);dot(19,16-up,12);}oval(14,18-up,5,4,3);dot(15,18-up,5);line(13,23-up,20,23-up,2);dot(15,23-up,5);dot(18,23-up,5);}
 // Moss at the roots and a loose bark patch keep the body readable.
 poly([[9,21],[12,23],[11,26],[8,25]],6);dot(10,23,7);dot(11,24,8);line(20,24,22,24,7);dot(21,23,8);
 const p=edge(c.pixels,32,32);return a.facing===3?Uint8Array.from(p,(_,i)=>p[(i>>5)*32+31-i%32]):p;
}
export function snapBriarSprite(f){
 const c=pixelCanvas(32,32),{rect,line,oval,polygon:poly,dot}=c,sway=0,closed=f===3,bite=f>=4;
 line(15,28,16+sway,19,6);line(16,28,17+sway,18,7);line(16,27,20,24,8);
 poly([[15,27],[9,22],[3,23],[8,27]],7);line(5,24,11,25,8);poly([[17,28],[23,22],[29,24],[24,27]],6);line(21,25,26,24,8);
 for(const[x,y,dx,dy]of[[7,9,-4,-3],[23,9,4,-3],[7,18,-4,3],[24,18,4,3],[15,6,0,-4]]){poly([[x+sway,y],[x+dx+sway,y+dy],[x+dx+sway,y+dy+3],[x+2+sway,y+3]],6);dot(x+dx+sway,y+dy,8);}
 const x=7+sway,y=closed?12:bite?5:8,w=19,h=closed?12:bite?22:17;
 oval(x,y,w,h,2);oval(x+1,y,w-2,h-2,3);oval(x+2,y+1,w-5,5,4);line(x+5,y+1,x+10,y+1,5);
 if(closed){line(x+2,19,x+16,18,1);line(x+5,21,x+13,21,4);dot(x+4,18,12);dot(x+8,18,12);dot(x+12,18,12);}
 else {
  oval(x+3,y+5,w-6,h-7,1);oval(x+5,y+h-6,w-10,3,9);line(x+6,y+h-5,x+10,y+h-5,10);
  for(let n=0;n<4;n++){const tx=x+4+n*3,ty=y+5;poly([[tx,ty],[tx+1,ty+3+(bite?1:0)],[tx+2,ty]],12);}
  for(let n=0;n<3;n++){const tx=x+5+n*3,ty=y+h-4;poly([[tx,ty],[tx+1,ty-3],[tx+2,ty]],5);dot(tx+1,ty-2,12);}
  if(f===5){dot(2,14,11);dot(29,9,11);line(2,14,4,15,12);line(28,10,29,9,12);}
 }
 rect(x+1,y+3,3,3,1);rect(x+w-4,y+3,3,3,1);dot(x+2,y+3,11);dot(x+w-3,y+3,11);
 return edge(c.pixels,32,32);
}
export const riderFrames=Array.from({length:24},(_,f)=>f<12?{root:f,facing:Math.floor(f/3),phase:f%3}:f===12?{root:12,facing:1,phase:1,lift:8}:f<=16?{root:f,facing:1,phase:1}:f===17?{root:14,facing:0,phase:1}:f===18?{root:14,facing:0,phase:1,lift:8}:f===19?{root:14,facing:1,phase:1,lift:8}:f===20?{root:7,facing:2,phase:1,lean:0}:f===21?{root:7,facing:2,phase:1,lift:8,lean:4}:f===22?{root:10,facing:3,phase:1,lean:0}:{root:10,facing:3,phase:1,lift:8,lean:-4});
export function briarRiderSprite(f){
 const a=riderFrames[f],c=pixelCanvas(32,64),{rect,line,oval,polygon:poly,dot}=c;
 const root=rootlingSprite(a.root);c.pixels.set(root,32*32);
 const side=a.facing>=2,back=a.facing===0,dx=a.lean??0,dy=-(a.lift??0),rx=16+dx;
 // The small woodland guard sits above the stump. Recoil and throws separate
 // the guard from the mount while keeping all eight native cells unchanged.
 line(rx-5,39+dy,rx-8,46+dy,9);line(rx+5,39+dy,rx+8,46+dy,9);rect(rx-10,45+dy,5,3,2);rect(rx+5,45+dy,5,3,2);
 poly([[rx-6,31+dy],[rx+6,31+dy],[rx+7,40+dy],[rx,43+dy],[rx-7,40+dy]],9);line(rx-4,34+dy,rx-4,39+dy,10);line(rx+4,34+dy,rx+4,39+dy,10);rect(rx-5,39+dy,11,2,2);rect(rx-1,39+dy,3,2,11);
 line(rx-6,34+dy,rx-9,39+dy,3);line(rx+6,34+dy,rx+9,39+dy,3);oval(rx-10,38+dy,4,4,4);oval(rx+7,38+dy,4,4,4);
 oval(rx-6,22+dy,13,13,3);oval(rx-5,23+dy,11,9,4);
 poly([[rx-7,25+dy],[rx-6,21+dy],[rx-3,18+dy],[rx+3,18+dy],[rx+6,21+dy],[rx+7,25+dy]],9);line(rx-5,22+dy,rx-2,20+dy,10);line(rx-1,19+dy,rx+1,19+dy,12);rect(rx-7,24+dy,15,2,10);dot(rx+5,23+dy,11);
 poly([[rx+3,19+dy],[rx+7,15+dy],[rx+10,16+dy],[rx+6,21+dy]],7);dot(rx+8,16+dy,8);
 if(back){rect(rx-5,26+dy,11,5,2);line(rx-3,28+dy,rx+3,28+dy,3);}
 else if(side){const d=a.facing===2?-1:1;rect(rx+d*3-1,27+dy,2,3,1);dot(rx+d*3-1,27+dy,12);line(rx+d*5,29+dy,rx+d*8,30+dy,4);dot(rx+d*8,30+dy,5);line(rx+d*2,32+dy,rx+d*5,32+dy,2);}
 else {rect(rx-4,27+dy,2,3,1);rect(rx+2,27+dy,2,3,1);dot(rx-4,27+dy,12);dot(rx+2,27+dy,12);dot(rx,30+dy,5);line(rx-2,32+dy,rx+2,32+dy,2);}
 return edge(c.pixels,32,64);
}
export function plantSprite(art,f){
 const frames={'rootling':17,'snap-briar':6,'briar-rider':24}[art];
 if(!frames||!Number.isInteger(f)||f<0||f>=frames)throw Error('Invalid plant frame');
 return art==='rootling'?rootlingSprite(f):art==='snap-briar'?snapBriarSprite(f):briarRiderSprite(f);
}
