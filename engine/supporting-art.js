import {pixelCanvas} from './pixel-art.js';
import {sprite} from './sprites.js';
import {rasterArt,rasterArtInfo} from './raster-art.js';

// All artwork is original indexed pixel work, at cartridge resolution.
// Direction numbers match the engine: back, front, left, right.
export function supportingSprite(key,{facing=1,pose='idle',phase=0}={}) {
  const rasterKey=key==='steve-guru'?'steve':key;
  if(rasterArtInfo(rasterKey)){
    const raster=rasterArt(rasterKey,{facing,pose,phase});
    if(!raster)throw Error(`Unassigned generated ${key} pose ${pose}/${facing}/${phase}`);
    return raster;
  }
  if(key==='puss-honored'||key==='puss-before-exile'){
    return sprite(4,facing,pose,phase);
  }
  if(key==='shrek-frozen')return sprite(0,1,pose,phase);
  const canvas=pixelCanvas(32,32),{pixels:p}=canvas,back=facing===0,side=facing>=2;
  // Keep the torso on a stable pixel grid while walking. Moving only the
  // limbs lets a crowded scene share torso tiles within the native gfx heap.
  const walk=pose==='walk',step=walk?(phase%3)-1:0,bob=!walk&&phase%2===1?-1:0;
  const dot=(x,y,c)=>canvas.dot(x,y+bob,c),rect=(x,y,w,h,c)=>canvas.rect(x,y+bob,w,h,c),oval=(x,y,w,h,c)=>canvas.oval(x,y+bob,w,h,c),line=(x,y,x2,y2,c)=>canvas.line(x,y+bob,x2,y2+bob,c),poly=(points,c)=>canvas.polygon(points.map(([x,y])=>[x,y+bob]),c);
  const talk=['talk','point','raise','cast','work','bow','laugh'].includes(pose);
  const raised=['raise','cast','surprise'].includes(pose);
  const legs=(x,y,gap=7)=>{rect(x,y,4,30-y-step,8);rect(x+gap,y,4,30-y+step,8);rect(x-1,29-step,6,2,8);rect(x+gap,29+step,6,2,8);};
  const face=(x,y,w=10,h=9)=>{
    oval(x,y,w,h,3);oval(x+1,y,w-3,4,4);
    if(back)return;
    if(side){rect(x,y+3,3,2,9);dot(x,y+4,1);rect(x-2,y+5,3,2,3);line(x,y+h-2,x+3,y+h-2,2);}
    else{rect(x+1,y+3,2,2,9);rect(x+w-4,y+3,2,2,9);dot(x+1,y+4,1);dot(x+w-4,y+4,1);dot(x+w/2,y+5,2);line(x+3,y+h-2,x+w-3,y+h-2,2);}
  };
  const hands=(x=7,y=17,right=23)=>{
    if(pose==='cry'){rect(10,13,4,5,3);rect(20,13,4,5,3);dot(13,17,9);dot(20,18,9);}
    else if(raised){line(x+3,y,x,y-6,7);oval(x-2,y-9,4,4,3);line(right-2,y,right+3,y-7,7);oval(right+1,y-10,4,4,3);}
    else if(pose==='point'){line(x+3,y,x-4,y-3,7);rect(x-7,y-5,5,3,3);line(right-2,y,right,y+6,7);rect(right-1,y+5,3,3,3);}
    else {rect(x,y+step,4,6,7);rect(x,y+5+step,3,3,3);rect(right,y-step,4,6,7);rect(right+1,y+5-step,3,3,3);}
  };
  const crown=(x,y,w=12)=>{rect(x,y,w,3,12);for(const dx of[0,5,w-2])rect(x+dx,y-2,2,3,12);dot(x+6,y+1,6);};
  if(key==='gingy'){
    // Gingy is deliberately smaller than Mongo and has a white icing mouth.
    const y=9;
    oval(9,22,5,9-step,3);oval(18,22,5,9+step,3);oval(8,17,16,10,3);
    oval(4,raised?13:18,8,5,3);oval(22,raised?13:18,7,5,3);oval(8,y,16,12,3);oval(10,y+1,10,3,4);
    if(!back){rect(11,y+4,2,2,9);rect(19,y+4,2,2,9);dot(11,y+5,1);dot(19,y+5,1);line(11,y+8,20,y+8,9);dot(10,y+7,9);dot(21,y+7,9);line(11,y+2,13,y+2,9);line(18,y+2,20,y+2,9);}
    if(!back){oval(14,21,4,3,6);dot(15,21,7);oval(14,25,4,3,11);}
    line(10,28-step,13,28-step,9);line(19,28+step,22,28+step,9);line(6,20,8,20,9);line(24,20,26,20,9);
    if(side){rect(9,14,3,3,9);rect(8,17,6,2,9);}
  } else if(key==='three-pigs') {
    const pig=(x,y,hat)=>{
      rect(x+2,y+12,3,5-step,8);rect(x+7,y+12,3,5+step,8);oval(x,y+7,12,8,hat===2?6:12);
      oval(x+1,y,10,10,3);rect(x+1,y,2,3,3);rect(x+9,y,2,3,3);oval(x+3,y+1,6,3,4);
      if(!back){dot(x+3,y+4,1);dot(x+8,y+4,1);oval(x+4,y+5,5,3,2);dot(x+5,y+6,1);dot(x+7,y+6,1);}
      if(hat===0){rect(x-1,y+1,14,2,10);rect(x+3,y-2,6,3,11);}
      if(hat===1){oval(x,y-2,12,5,10);rect(x,y+1,12,1,11);line(x+6,y-2,x+6,y+1,11);}
      if(hat===2){rect(x+3,y+9,6,5,5);rect(x+4,y+9,4,1,9);}
      if(pose==='work'){rect(x-1,y+8,3,3,3);line(x-2,y+6,x+2,y+10,8);rect(x-4,y+3,5,3,10);}
    };
    pig(10,4,0);pig(2,13,1);pig(18,13,2);
  } else if(key==='wolf') {
    const y=pose==='sleep'?8:6;
    legs(11,25,8);oval(7,14,19,15,6);oval(10,15,13,12,7);line(10,26,23,26,5);
    // Tail and bonnet distinguish the innkeeper even from behind.
    line(24,23,29,25,2);line(29,25,30,22,3);
    oval(8,y,18,12,2);poly([[9,y+3],[9,y-2],[14,y+1]],3);poly([[20,y+1],[24,y-2],[25,y+4]],3);
    oval(8,y-3,17,6,7);rect(7,y+1,19,2,5);oval(11,y-4,10,4,11);
    if(!back){oval(side?3:9,y+5,side?14:16,7,4);oval(side?2:13,y+5,6,3,1);if(pose==='sleep'){line(10,y+3,13,y+3,1);line(19,y+3,22,y+3,1);}else{rect(10,y+3,3,2,9);rect(19,y+3,3,2,9);dot(10,y+4,1);dot(19,y+4,1);}line(9,y+9,21,y+9,1);dot(11,y+10,9);dot(19,y+10,9);}
    hands(5,17,25);if(pose==='laugh'){oval(11,y+8,11,3,1);rect(12,y+8,9,1,9);}
  } else if(key==='muffin-man') {
    legs(11,23,8);rect(8,14,17,12,6);hands(5,17,25);rect(10,14,13,13,5);rect(11,16,11,9,9);rect(13,23,7,2,10);line(10,17,10,25,11);
    face(11,5,11,10);oval(10,11,14,6,10);oval(12,11,10,4,11);if(!back){rect(14,11,7,2,1);rect(15,11,5,1,2);}
    // Tall baker's toque and a wooden rolling pin, not borrowed smith tools.
    oval(8,0,8,6,9);oval(14,0,9,6,9);oval(20,1,6,5,5);rect(10,4,14,3,11);rect(10,4,14,1,9);
    if(pose==='work'){rect(5,23,22,3,2);rect(8,22,15,4,3);line(9,22,21,22,4);rect(12,20,3,3,3);}
    if(back){rect(11,7,12,6,10);rect(12,16,9,1,10);}
  } else if(['harold','alder'].includes(key)) {
    legs(11,24,8);poly([[10,13],[22,13],[27,28],[6,28]],6);rect(10,14,14,12,7);line(10,14,10,27,5);line(23,14,23,27,5);rect(14,14,6,10,6);line(14,22,20,22,12);hands(6,16,24);
    oval(10,3,14,12,10);face(11,6,11,9);rect(9,6,3,8,11);rect(22,6,3,8,11);
    if(!back){oval(10,11,14,7,10);oval(12,11,10,5,11);rect(14,12,6,2,2);dot(14,12,1);line(12,10,14,10,10);line(19,10,21,10,10);}
    crown(10,4,14);if(back)rect(10,8,14,9,10);
    if(pose==='sit'){rect(8,25,17,5,6);rect(11,27,4,3,8);rect(20,27,4,3,8);}
    if(pose==='point'){rect(4,11,2,14,12);oval(2,8,6,4,12);dot(4,9,7);}
  } else if(['elowen','fiona-human','lyra','godmother'].includes(key)) {
    const fairy=key==='lyra'||key==='godmother',gm=key==='godmother';
    if(fairy){oval(3,10,10,13,10);oval(21,10,9,13,10);line(5,12,11,21,11);line(26,12,21,22,11);}
    legs(12,27,7);poly([[11,14],[22,14],[26,29],[7,29]],6);poly([[14,15],[19,15],[22,28],[11,28]],7);line(9,27,24,27,12);rect(11,14,12,3,7);hands(6,17,24);
    oval(9,3,16,13,10);face(11,6,11,10);rect(9,7,3,10,10);rect(22,7,3,13,10);rect(11,4,12,3,11);
    if(gm){oval(9,1,17,7,11);oval(9,3,8,6,10);oval(13,1,10,5,11);if(!back){rect(10,9,6,4,6);rect(17,9,6,4,6);rect(11,10,4,2,9);rect(18,10,4,2,9);dot(12,11,1);dot(19,11,1);dot(16,10,12);line(14,14,20,14,2);}rect(15,16,5,2,9);}
    else if(key==='lyra'){rect(9,4,15,3,11);rect(20,6,5,4,11);dot(11,6,12);}
    else {crown(12,4,10);line(23,12,24,22,10);dot(24,16,11);dot(24,19,11);dot(24,22,12);}
    if(fairy){const x=raised?29:27,y=raised?3:12;line(x,y+3,x-2,y+14,12);rect(x-2,y,5,3,9);rect(x,y-2,1,7,11);dot(x,y+1,12);}
    if(pose==='pray'){rect(13,17,8,4,3);line(16,17,16,20,2);}
    if(back){oval(9,6,16,14,10);line(15,8,15,18,11);if(gm)oval(10,3,15,7,11);}
  } else if(key==='charming') {
    legs(11,24,8);poly([[9,13],[23,13],[26,28],[7,28]],5);rect(10,14,14,12,6);rect(13,14,8,9,7);line(11,23,23,23,12);hands(6,16,24);
    oval(9,2,17,14,10);face(11,5,11,10);rect(9,6,3,12,11);rect(23,7,3,11,11);oval(10,2,16,5,11);line(13,3,18,3,12);rect(11,5,4,2,10);
    if(!back){line(12,7,14,6,10);line(18,6,21,7,10);line(13,13,20,13,2);dot(20,12,9);}
    if(back){oval(10,4,15,13,11);rect(14,16,6,9,11);}
    if(pose==='bow'){line(6,22,14,19,7);rect(12,18,5,3,3);}
  } else if(key==='young-farquaad'||key==='prophet') {
    const small=key==='young-farquaad',top=small?11:8;
    legs(12,25,7);poly([[10,top+8],[23,top+8],[26,29],[7,29]],6);rect(12,top+9,9,13,7);hands(7,top+9,24);
    oval(9,top,16,14,8);face(11,top+3,11,10);rect(9,top+3,3,12,8);rect(22,top+3,3,12,8);rect(10,top,14,4,8);
    if(back)oval(9,top,16,14,8);
    if(!small){poly([[7,top+5],[8,top],[16,top-3],[25,top+1],[27,top+7],[23,top+8],[21,top+3],[12,top+2],[10,top+7]],6);line(9,top,16,top-2,7);line(7,top+8,7,27,7);if(back)oval(8,top,18,15,6);}
    if(small){line(12,26,22,26,12);rect(15,21,5,2,12);}
  } else if(key==='sir-bram') {
    // A red cloak, steel breastplate and a compact single-edged hatchet.
    // The helmet leaves his face visible in the quiet shrine reunion.
    poly([[10,12],[22,12],[27,29],[6,29]],5);poly([[11,13],[22,13],[25,27],[8,27]],6);
    legs(11,24,8);rect(10,15,14,12,10);rect(12,16,10,7,11);line(13,17,21,17,9);
    rect(10,24,14,2,8);rect(16,24,3,2,12);rect(11,26,4,3,10);rect(20,26,4,3,10);
    oval(8,13,8,6,11);oval(20,13,8,6,11);line(9,14,13,14,9);line(22,14,25,14,9);
    face(11,5,11,10);oval(9,2,15,8,10);oval(11,2,11,4,11);rect(10,6,3,7,10);rect(22,6,2,7,10);
    if(!back){rect(13,6,8,3,3);rect(13,7,2,1,1);rect(19,7,2,1,1);line(13,12,20,12,2);rect(14,13,6,2,2);}
    if(back){oval(10,5,14,10,10);rect(16,6,2,7,11);poly([[11,14],[23,14],[25,28],[8,28]],6);line(12,16,10,26,7);}
    const striking=pose==='attack'||raised;
    if(striking){line(9,17,5,12,10);oval(3,10,5,5,11);line(5,15,5,3,8);rect(3,2,3,4,11);poly([[6,2],[12,1],[13,6],[7,7]],11);line(12,2,12,5,9);dot(8,4,12);}
    else {rect(6,18+step,4,6,10);rect(6,22+step,4,3,11);line(7,24+step,4,13+step,8);poly([[4,13+step],[8,10+step],[10,14+step],[6,17+step]],11);line(9,11+step,10,14+step,9);dot(7,13+step,12);}
    rect(24,18-step,4,6,10);rect(24,22-step,4,3,11);
    if(pose==='burn'){
      for(let i=0;i<5;i++){const x=6+i*5,y=27-(i+phase)%3*4;poly([[x,y],[x-2,y-5],[x+1,y-10],[x+2,y-4],[x+4,y]],12);line(x+1,y-2,x+1,y-6,9);}
    }
  } else if(key==='rowan') {
    legs(11,24,8);rect(9,14,16,12,6);rect(12,14,9,10,7);hands(6,17,24);line(12,14,23,25,2);
    face(11,5,11,10);rect(9,7,3,8,10);rect(22,7,3,8,10);rect(7,4,19,3,6);poly([[11,4],[15,0],[23,4]],7);line(22,3,27,0,5);
    // Satchel/book stays on the same shoulder as the walking animation turns.
    rect(18,20,9,7,2);rect(19,20,7,5,10);line(20,21,24,21,5);dot(23,24,12);
    if(talk){rect(4,20,11,6,2);rect(5,20,9,4,5);line(9,20,9,24,10);rect(6,24,3,3,3);}
    if(back)rect(11,7,12,7,10);
  } else throw Error('Unknown supporting sprite '+key);

  // Distinct poses retain native facing and foot anchors. A bowed/crouched
  // body moves down; fallen characters use a separately rasterized silhouette.
  let image=p;
  if(pose==='bow'||pose==='sit'||pose==='work'){
    const q=new Uint8Array(1024),amount=pose==='bow'?3:pose==='sit'?4:1;
    for(let y=0;y<31;y++)for(let x=0;x<32;x++)if(p[y*32+x])q[Math.min(30,y+amount)*32+x]=p[y*32+x];image=q;
  }
  if(pose==='down'){
    const q=new Uint8Array(1024);for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(p[y*32+x])q[(21+Math.floor(x/4))*32+31-y]=p[y*32+x];image=q;
  }
  const outlined=image.slice();
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(image[y*32+x])for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){
    const xx=x+dx,yy=y+dy;if(xx>=0&&xx<32&&yy>=0&&yy<32&&!image[yy*32+xx])outlined[yy*32+xx]=1;
  }
  if(facing===3){const q=new Uint8Array(1024);for(let y=0;y<32;y++)for(let x=0;x<32;x++)q[y*32+x]=outlined[y*32+31-x];return q;}
  return outlined;
}
