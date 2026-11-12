import{pixelCanvas}from'./pixel-art.js';
export const trollFrames=Array.from({length:27},(_,f)=>f<12?{facing:f/3|0,phase:f%3}:f===12?{facing:1,phase:1,hit:true}:f===13?{facing:1,phase:1,crouch:true}:f===14?{facing:1,phase:1}:f<18?{facing:0,phase:1,attack:f-15}:f<21?{facing:1,phase:1,attack:f-18}:f<24?{facing:2,phase:1,attack:f-21}:{facing:3,phase:1,attack:f-24});
export function sewerTrollSprite(f){
 const a=trollFrames[f],c=pixelCanvas(32,64),{rect,line,oval,polygon:poly,dot}=c,side=a.facing>=2,back=a.facing===0,step=[-1,0,1][a.phase],attack=a.attack!==undefined,swing=a.attack===1,charge=a.attack===2;
 const fist=(x,y)=>{oval(x,y,7,8,2);oval(x,y,5,6,3);line(x+1,y,x+3,y,4);line(x+1,y+4,x+4,y+4,2);dot(x+1,y+6,5);};
 const club=(x,y,angle=0)=>{
  if(angle){line(x,y,x+angle*15,y-8,9);line(x,y-1,x+angle*15,y-9,10);oval(x+angle*15-4,y-13,9,9,6);oval(x+angle*15-3,y-12,7,6,7);line(x+angle*15-2,y-11,x+angle*15+2,y-11,8);dot(x+angle*15-3,y-14,11);}
  else{rect(x,y,2,22,9);rect(x,y,1,21,10);oval(x-4,y-5,10,10,6);oval(x-3,y-5,8,7,7);line(x-2,y-4,x+2,y-4,8);line(x-2,y+1,x+2,y+1,6);dot(x-4,y-3,11);dot(x+5,y-1,11);}
 };
 // Bent knees, broad boots and an old iron breastplate give the toll keeper
 // a heavy silhouette. The dented bucket crown and drain mace are original.
 if(a.crouch){
  rect(5,58,10,4,9);rect(18,58,10,4,9);line(6,58,12,58,10);line(19,58,25,58,10);
  oval(6,39,22,21,6);oval(7,39,19,17,7);line(10,42,22,42,8);line(13,48,19,48,11);
  oval(9,36,16,14,2);oval(10,36,13,11,3);line(12,43,15,44,1);line(19,44,22,43,1);line(15,47,19,47,2);
  poly([[9,37],[9,31],[12,33],[14,28],[18,32],[22,30],[24,37]],6);line(10,35,22,35,8);dot(17,33,11);fist(4,49);fist(23,49);
 }else{
  for(const[x,k]of side?[[11,step],[21,-step]]:[[9,step],[22,-step]]){
   rect(x-3,49,7,10+k,2);rect(x-2,50,5,8+k,3);line(x-1,51,x+1,51,4);
   oval(x-5,57+k,11,6,9);line(x-4,58+k,x+2,58+k,10);dot(x+3,60+k,11);
  }
  if(back){poly([[8,31],[24,31],[27,51],[23,56],[18,53],[12,55],[5,51]],9);poly([[10,32],[21,32],[23,49],[19,52],[14,50],[9,52]],10);line(12,34,11,47,9);line(18,33,19,47,11);}
  else{poly([[9,31],[23,31],[26,39],[24,50],[8,50],[6,39]],6);poly([[10,33],[21,33],[23,39],[22,47],[10,47],[8,39]],7);line(10,34,19,34,8);line(10,36,9,41,8);line(22,38,21,44,6);rect(8,48,17,4,9);rect(14,48,5,4,11);rect(15,49,3,2,6);line(11,44,14,45,6);line(17,40,20,39,8);dot(18,42,11);}
  const raised=attack&&!swing;
  if(side){
   if(swing)club(20,43,-1);else club(raised?7:5,raised?8:30);
   poly([[12,31],[7,34],[8,44],[12,46],[15,41]],2);line(8,35,9,41,4);fist(raised?3:4,raised?26:40);
   if(raised){line(11,33,7,29,3);line(12,33,9,27,4);}else if(swing){line(12,35,19,42,3);fist(18,39);}
   poly([[23,32],[26,36],[26,44],[22,46],[20,40]],2);line(24,35,24,41,3);fist(22,43);
   poly([[9,19],[20,18],[24,23],[23,31],[19,34],[11,31],[8,27]],2);oval(9,19,13,12,3);line(12,20,17,20,4);poly([[9,23],[4,25],[5,28],[12,29],[16,27]],4);rect(8,21,4,3,1);dot(9,21,12);line(6,28,13,30,2);poly([[8,29],[8,25],[10,29]],5);line(20,24,22,23,4);dot(21,25,2);
   poly([[8,21],[9,14],[12,16],[14,11],[17,15],[22,13],[23,22]],6);poly([[10,20],[11,16],[14,18],[15,14],[18,18],[21,16],[21,21]],7);line(10,20,21,20,8);dot(17,18,11);line(13,16,14,19,6);
  }else{
   if(swing){club(20,43,-1);line(25,36,20,42,3);fist(18,39);}else{
    club(raised?5:4,raised?8:31);poly([[9,32],[5,35],[5,43],[9,46],[12,41]],2);line(6,35,7,40,4);fist(raised?2:2,raised?25:42);if(raised){line(8,33,5,29,3);line(9,32,7,27,4);}
    poly([[23,32],[27,35],[28,44],[24,47],[21,40]],2);line(25,35,26,41,3);fist(23,43);
   }
   for(const x of[5,22]){oval(x,22,6,8,2);oval(x+1,23,4,5,3);dot(x+1,23,4);}
   oval(9,18,16,16,2);oval(10,18,13,13,3);oval(11,20,10,8,4);
   if(back){oval(11,20,11,9,3);line(13,27,20,27,2);line(15,30,19,30,4);}
   else{
    if(a.hit){line(10,24,13,25,1);line(19,25,22,24,1);}else{rect(10,23,4,3,1);rect(19,23,4,3,1);dot(11,23,12);dot(20,23,12);line(10,22,14,22,2);line(18,22,22,22,2);}
    oval(14,25,6,4,3);dot(15,27,2);dot(18,27,2);line(12,30,21,30,1);poly([[12,30],[12,26],[14,30]],5);poly([[20,30],[21,26],[22,30]],5);line(15,32,19,32,4);
    if(attack){rect(15,30,4,3,1);dot(16,30,12);}
   }
   poly([[8,22],[9,14],[12,16],[14,10],[18,15],[23,12],[24,22]],6);poly([[10,20],[11,16],[14,18],[15,13],[18,18],[22,15],[22,20]],7);line(10,20,22,20,8);dot(17,18,11);line(13,17,14,19,6);dot(21,16,8);
  }
  if(charge){dot(1,17,12);line(0,22,3,22,11);dot(27,18,11);line(27,25,30,22,12);}
 }
 const p=c.pixels,q=p.slice();for(let y=0;y<64;y++)for(let x=0;x<32;x++)if(p[y*32+x])for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){const a=x+dx,b=y+dy;if(a>=0&&a<32&&b>=0&&b<64&&!p[b*32+a])q[b*32+a]=1;}return a.facing===3?Uint8Array.from(q,(_,i)=>q[(i>>5)*32+31-i%32]):q;
}
