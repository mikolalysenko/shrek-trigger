import {pixelCanvas} from './pixel-art.js';
const edge=p=>{const q=p.slice();for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(p[y*32+x])for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<32&&yy>=0&&yy<32&&!p[yy*32+xx])q[yy*32+xx]=1;}return q;};
export const beetleFrames=Array.from({length:29},(_,f)=>f<12?{facing:Math.floor(f/3),phase:f%3}:f===12?{facing:1,phase:1,hit:true}:f<15?{facing:1,phase:1,prepare:true}:f<17?{facing:1,phase:1,open:true}:f<21?{facing:f<19?0:1,phase:1,fly:(f&1)?1:2}:f<24?{facing:2,phase:f-21,fall:true}:f<26?{facing:1,phase:f-24,fall:true}:f<28?{facing:1,phase:1,fly:f-25}:{facing:1,phase:1,hit:true});
export function beetleSprite(f){
 const a=beetleFrames[f],c=pixelCanvas(32,32),{rect,line,oval,polygon:poly,dot}=c,side=a.facing>=2,back=a.facing===0,step=[-1,0,1][a.phase];
 const limb=(points)=>{for(let i=1;i<points.length;i++){line(...points[i-1],...points[i],2);line(points[i-1][0],points[i-1][1]-1,points[i][0],points[i][1]-1,4);}};
 if(a.fly){
  const low=a.fly===1;
  poly([[13,14],[6,low?8:3],[1,low?7:1],[3,low?13:8],[12,19]],9);poly([[13,14],[6,low?9:4],[3,low?8:3],[5,low?13:8],[12,17]],12);line(5,low?10:5,11,15,10);
  poly([[19,14],[26,low?8:3],[30,low?7:1],[28,low?13:8],[20,19]],9);poly([[19,14],[26,low?9:4],[28,low?8:3],[26,low?13:8],[20,17]],12);line(27,low?10:5,21,15,10);
 }
 if(side){
  limb([[13,19],[8,23],[6,27+step]]);limb([[19,19],[17,25],[20,29-step]]);limb([[24,19],[27,23],[29,25+step]]);
  oval(9,12,19,12,9);oval(10,12,15,9,10);poly([[16,13],[24,14],[26,18],[22,21],[15,19]],9);line(13,13,17,13,12);line(10,18,24,19,1);line(23,13,25,15,10);
  oval(4,16,9,9,2);oval(5,16,6,6,3);rect(5,17,3,3,1);dot(5,17,11);dot(6,17,12);line(5,22,9,23,5);
  limb([[6,17],[3,13],[2,10]]);dot(2,9,11);limb([[9,16],[8,11],[6,9]]);dot(6,8,11);
 }else{
  const airborne=a.fly;
  for(const y of[14,19,23]){const k=y===19?-step:step;limb([[11,y],[6,y+1],[3,y+3+k+(airborne?2:0)]]);limb([[21,y],[26,y+1],[29,y+3-k+(airborne?2:0)]]);}
  oval(8,7,17,20,9);oval(9,7,14,17,10);oval(11,9,12,16,9);line(11,10,12,8,12);line(13,7,17,7,10);line(16,10,16,23,1);line(17,10,17,22,10);line(11,22,14,25,1);line(19,24,21,21,1);
  if(a.open){
   poly([[14,9],[8,6],[5,10],[7,20],[12,23],[14,17]],9);line(8,9,10,18,10);dot(8,8,12);
   poly([[18,9],[24,6],[27,10],[25,20],[20,23],[18,17]],9);line(24,9,22,18,10);dot(24,8,12);rect(14,12,5,11,2);line(15,14,17,14,4);line(15,18,17,18,4);
  }
  const y=back?5:a.prepare?21:22;
  oval(11,y,11,8,2);oval(12,y,8,6,3);line(14,y,17,y,4);line(14,y+6,18,y+6,5);
  if(a.hit){line(12,y+2,14,y+3,1);line(18,y+3,20,y+2,1);}else{rect(12,y+2,3,3,1);rect(18,y+2,3,3,1);dot(12,y+2,11);dot(18,y+2,11);dot(13,y+2,12);dot(19,y+2,12);}
  if(back){limb([[13,y+1],[9,4],[8,1]]);limb([[19,y+1],[23,4],[24,1]]);dot(8,1,11);dot(24,1,11);}
  else {limb([[12,y+3],[8,y+2],[6,y-1]]);limb([[21,y+3],[25,y+2],[27,y-1]]);dot(6,y-2,11);dot(27,y-2,11);}
 }
 const p=edge(c.pixels);return a.facing===3?Uint8Array.from(p,(_,i)=>p[(i>>5)*32+31-i%32]):p;
}
