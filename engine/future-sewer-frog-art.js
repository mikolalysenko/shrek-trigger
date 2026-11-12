import{pixelCanvas}from'./pixel-art.js';
export const frogFrames=Array.from({length:26},(_,f)=>f<12?{facing:f/3|0,phase:f%3}:f===12?{facing:1,phase:1,hit:true}:f<16?{facing:1,phase:1,sit:true,jump:f===15}:f<18?{facing:1,phase:1,inflate:f-15}:{facing:(f-18)>>1,phase:1,tongue:(f&1)?2:1});
export function sewerFrogSprite(f){
 const a=frogFrames[f],c=pixelCanvas(32,32),{rect,line,oval,polygon:poly,dot}=c,side=a.facing>=2,back=a.facing===0,step=[-1,0,1][a.phase];
 const web=(x,y,flip=false)=>{const pts=[[x,y],[x-4,y+1],[x-3,y-2],[x,y-1],[x+1,y-3],[x+3,y],[x+5,y-1],[x+4,y+2],[x,y+2]];poly(pts,2);line(x-2,y,x+2,y+1,4);dot(x+3,y,3);};
 if(side){
  web(10,29+step);web(23,28-step);oval(19,21,8,8,2);oval(20,21,5,6,3);line(22,22,24,24,4);
  poly([[14,17],[22,18],[24,26],[18,28],[11,25]],9);poly([[16,19],[21,20],[22,25],[17,26],[13,24]],10);line(14,22,19,24,9);dot(21,25,11);
  line(12,19,9,24,2);line(13,20,10,24,3);line(10,24,6,24,4);dot(5,23,5);
  oval(10,9,14,13,2);oval(11,9,11,10,3);oval(8,13,15,7,4);line(11,19,20,19,2);dot(8,16,2);dot(10,16,5);
  oval(10,6,7,8,2);oval(10,6,5,7,5);rect(11,8,2,4,1);dot(11,8,12);
  poly([[14,9],[16,5],[21,5],[24,9],[22,11],[17,10]],6);line(17,6,20,6,8);dot(22,9,11);
 }else{
  const sit=a.sit||a.inflate,fy=sit?28:29;
  web(8,fy+step);web(24,fy-step);oval(5,sit?23:22,9,7,2);oval(6,sit?23:22,6,5,3);oval(20,sit?23:22,8,7,2);oval(21,sit?23:22,5,5,3);
  if(a.jump){web(6,23);web(25,23);}
  poly([[10,17],[22,17],[24,25],[20,28],[12,28],[8,25]],9);poly([[11,18],[20,18],[22,24],[19,26],[12,26],[10,24]],10);line(12,18,19,18,11);
  if(back){line(13,21,12,25,9);line(18,20,19,25,9);}else{oval(12,20,8,7,5);line(14,23,18,23,4);dot(16,25,11);}
  const spread=a.jump||a.tongue;
  line(11,19,spread?5:7,spread?17:24,2);line(12,20,spread?5:7,spread?18:23,3);dot(spread?4:6,spread?17:24,5);
  line(21,19,spread?27:26,spread?17:24,2);line(20,20,spread?27:26,spread?18:23,3);dot(spread?28:27,spread?17:24,5);
  const w=a.inflate?22:20,x=16-w/2,y=a.sit?14:10;
  oval(x,y,w,a.inflate?15:12,2);oval(x+1,y,w-3,a.inflate?12:9,3);oval(x+3,y+4,w-6,6,4);line(x+5,y+9,x+w-5,y+9,2);
  for(const xx of[8,20]){oval(xx,y-4,7,8,2);oval(xx,y-4,5,7,5);if(!back){if(a.hit)line(xx+1,y-1,xx+4,y+1,1);else{rect(xx+1,y-2,2,4,1);dot(xx+1,y-2,12);}}else{oval(xx+1,y-3,4,5,3);dot(xx+2,y-3,4);}}
  if(!back){dot(13,y+5,2);dot(19,y+5,2);dot(14,y+4,5);dot(18,y+4,5);}
  poly([[12,y],[13,y-5],[16,y-7],[20,y-5],[21,y],[18,y+1]],6);poly([[14,y-1],[14,y-4],[16,y-5],[18,y-3],[19,y-1]],7);line(15,y-5,17,y-4,8);dot(17,y-1,11);
 }
 if(a.tongue){
  if(side){const end=a.tongue===2?0:5;line(11,18,end,18,9);line(11,17,end,17,10);dot(end,17,12);}
  else if(back){const end=a.tongue===2?0:5;line(16,11,16,end,9);line(17,11,17,end,10);dot(17,end,12);}
  else {const end=a.tongue===2?31:25;line(16,19,16,end,9);line(17,19,17,end,10);dot(17,end,12);}
 }
 const p=c.pixels,q=p.slice();for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(p[y*32+x])for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){const a=x+dx,b=y+dy;if(a>=0&&a<32&&b>=0&&b<32&&!p[b*32+a])q[b*32+a]=1;}return a.facing===3?Uint8Array.from(q,(_,i)=>q[(i>>5)*32+31-i%32]):q;
}
