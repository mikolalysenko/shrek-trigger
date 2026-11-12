import {pixelCanvas} from './pixel-art.js';
const outline=p=>{const q=p.slice();for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(p[y*32+x])for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<32&&yy>=0&&yy<32&&!p[yy*32+xx])q[yy*32+xx]=1;}return q;};
export function potSprite(art,f){
 const c=pixelCanvas(32,32),{rect,line,oval,polygon:poly,dot}=c,fire=art==='ember-pot',cap=art==='spore-pot',closed=f===(fire?7:6),spin=f===(fire?6:7),jump=f===3,attack=f===4||f===5,step=f<3?f-1:0;
 if(closed){
  oval(5,22,23,8,2);oval(7,23,19,6,3);oval(6,21,22,5,4);oval(9,22,16,2,1);line(8,23,11,23,5);line(22,24,25,23,3);dot(13,26,12);dot(20,26,12);line(14,28,19,28,2);
  if(cap){oval(4,18,25,6,6);oval(7,18,19,4,7);dot(11,19,12);dot(20,19,12);}if(fire){dot(13,20,11);dot(19,19,12);}
  return outline(c.pixels);
 }
 if(spin){
  oval(5,7,23,24,2);oval(6,7,20,21,3);oval(8,8,15,16,4);line(10,10,14,9,5);line(21,16,24,19,2);line(24,19,22,24,2);line(12,24,16,26,5);
  oval(9,11,15,12,2);oval(10,12,12,9,1);oval(12,14,8,5,6);line(12,15,15,14,7);dot(17,16,8);line(8,20,9,25,6);dot(8,22,7);
  if(cap){poly([[8,13],[11,7],[20,8],[25,14],[19,16],[12,15]],7);dot(12,10,12);dot(20,12,12);}if(fire){poly([[10,16],[8,10],[12,12],[14,4],[18,10],[22,8],[21,17]],11);poly([[12,16],[15,9],[19,15],[17,19]],12);}
  return outline(c.pixels);
 }
 // Four roots are the feet. Clay handles act as the small creature's arms.
 const root=(x,y,x2,y2)=>{line(x,y,x2,y2,6);line(x+1,y,x2+1,y2,7);dot(x2,y2,8);};
 root(11,26,6,jump?24:29+step);root(21,26,26,jump?24:29-step);root(14,27,12,jump?30:30-step);root(18,27,20,jump?30:30+step);
 const hy=jump?10:attack?f===4?12:16:17;
 oval(2,hy,9,10,2);oval(3,hy,7,8,3);oval(5,hy+2,4,4,0);dot(4,hy+1,5);
 oval(22,hy,9,10,2);oval(23,hy,7,8,3);oval(24,hy+2,4,4,0);dot(25,hy+1,4);
 poly([[6,11],[26,11],[25,22],[23,28],[10,28],[7,23]],2);poly([[7,12],[24,12],[23,23],[21,26],[10,26],[8,22]],3);poly([[8,12],[20,12],[19,23],[12,25],[9,22]],4);line(9,15,10,21,5);line(22,17,22,22,2);
 oval(5,8,23,7,3);oval(7,8,19,5,5);oval(9,9,15,3,1);line(8,12,11,13,4);line(21,13,24,12,2);
 if(attack){line(11,18,14,19,1);line(19,19,22,18,1);}else{rect(11,17,4,4,1);rect(19,17,4,4,1);dot(12,18,12);dot(20,18,12);dot(13,18,11);dot(21,18,11);}
 line(14,23,19,23,2);dot(15,22,5);line(20,24,19,27,2);line(19,25,17,26,2);
 poly([[7,21],[10,23],[9,26],[6,24]],6);dot(8,23,7);dot(8,24,8);line(24,24,25,21,7);dot(25,20,8);
 if(cap){
  rect(14,7,5,6,5);rect(16,7,3,6,4);poly([[5,7],[8,4],[12,1],[19,1],[25,4],[28,8],[22,10],[11,10]],6);poly([[7,7],[10,4],[15,2],[20,3],[25,7],[20,8],[11,8]],7);line(12,3,16,2,8);rect(11,5,3,2,12);rect(20,5,3,2,5);dot(16,3,5);line(9,9,23,9,4);
 }else if(fire){
  poly([[10,11],[8,6],[12,7],[13,1],[17,6],[21,2],[21,7],[25,7],[22,12]],9);poly([[11,10],[12,6],[15,8],[16,3],[19,8],[23,6],[21,11]],11);poly([[14,11],[16,7],[20,11]],12);
 }else {dot(11,10,7);dot(13,9,8);line(20,9,22,10,6);}
 return outline(c.pixels);
}
