import {canvas,dot,ellipse,line} from './native-character-effects.js';
import {tile4bpp} from './sprites.js';
import techEffectArt from '../content/tech-effect-art.json' with {type:'json'};

// Generated effect frames (content/tech-effect-art.json): square native
// palette indices (16 or 32 pixels), resampled to the effect's cell size.
export function generatedFrame(key){
 const frames=techEffectArt[key]?.frames;if(!frames)throw Error('Missing generated effect art '+key);
 const draw=(size,frame)=>{
  const hex=frames[frame%frames.length],n=Math.round(Math.sqrt(hex.length)),p=canvas(size),step=n/size;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)p[y*size+x]=parseInt(hex[Math.floor(y*step)*n+Math.floor(x*step)],16);
  return p;
 };
 Object.defineProperty(draw,'name',{value:'generated:'+key});return draw;
}

// A whole 1 KB effect chunk tiled with 16x16 art in the hardware layout the
// native upload uses (two rows of sixteen 8x8 tiles; a 16x16 sprite at tile
// 2k uses 2k, 2k+1 and the same columns of the second row). Any 16x16 cell an
// effect draws from the chunk then lands on a whole sprite.
export function tiledChunk(key){
 return()=>{
  const draw=generatedFrame(key),out=new Uint8Array(1024);
  for(let k=0;k<8;k++){
   const p=draw(16,k);
   for(let y=0;y<2;y++)for(let x=0;x<2;x++)out.set(tile4bpp(p,16,x*8,y*8),(y*16+k*2+x)*32);
  }
  return out;
 };
}

const shifted=(size,dx,dy,draw)=>{const p=canvas(size);draw((x,y,c)=>dot(p,size,x+dx,y+dy,c));return p;};
const circle=(p,s,x,y,r,c)=>ellipse(p,s,x,y,r,r,c);

export function noseFrame(size,frame){
 return shifted(size,frame?1:0,0,dot=>{
  const length=frame?size-2:Math.floor(size*.58),cy=size/2;
  for(let x=1;x<=length;x++){
   const half=Math.max(1,Math.floor(5-(x/length)*4));
   for(let y=-half;y<=half;y++)dot(x,cy+y,Math.abs(y)===half?5:4);
   if(x<length-2)dot(x,cy-2,3);
  }
  for(let y=-4;y<=4;y++)dot(2,cy+y,5);dot(length,cy,1);
 });
}

export function woodenFistFrame(size,frame){
 return shifted(size,frame?2:-1,frame?1:0,dot=>{
  for(let y=10;y<27;y++)for(let x=3;x<23;x++)dot(x,y,x===3||x===22||y===26?5:4);
  for(let f=0;f<4;f++)for(let y=4;y<14;y++)for(let x=4+f*5;x<8+f*5;x++)dot(x,y,x===4+f*5||y===4?5:3);
  for(let x=7;x<19;x++)dot(x,17,2);
  if(frame)for(const[x,y]of[[27,7],[29,14],[26,23],[30,3]]){dot(x,y,4);dot(x+1,y,5);}
 });
}

export function heartFrame(size,frame){
 const p=canvas(size),s=frame?1:0;
 circle(p,s,5-s,5,4-s,10);circle(p,s,10+s,5,4-s,10);
 for(let y=7;y<15;y++)for(let x=Math.max(1,y-8);x<Math.min(15,23-y);x++)dot(p,s,x,y,10);
 dot(p,s,4,3,8);dot(p,s,3,4,8);dot(p,s,12,10,1);return p;
}

export function hookFrame(size,frame){
 const p=canvas(size),d=frame?1:0;
 line(p,size,2,14-d,12,2+d,1);line(p,size,3,14-d,13,3+d,8);
 line(p,size,12,2+d,14,5+d,1);line(p,size,14,5+d,11,8+d,1);
 line(p,size,2,12,7,14,10);dot(p,size,1,11,8);return p;
}

export function furFrame(size,frame){
 const p=canvas(size);
 for(const[x,y]of(frame?[[3,4],[9,2],[12,9]]:[[2,6],[7,3],[12,5]])){
  line(p,size,x,y+5,x+2,y,1);line(p,size,x+1,y+5,x+3,y+2,3);dot(p,size,x+1,y+3,8);
 }return p;
}

export function cookieFrame(size,frame){
 const p=canvas(size);circle(p,size,8,8,7,6);circle(p,size,8,8,6,4);
 for(const[x,y]of(frame?[[5,4],[11,6],[7,11],[12,12]]:[[4,7],[8,4],[11,10],[6,12]]))circle(p,size,x,y,1,6);
 for(const[x,y]of[[5,5],[11,5],[8,12]])dot(p,size,x,y,5);return p;
}

export function clawCrumbFrame(size,frame){
 const p=canvas(size);
 for(let i=0;i<3;i++){line(p,size,2+i*4,2+frame,6+i*4,12-frame,5);dot(p,size,6+i*4,13,6);}
 for(const[x,y]of(frame?[[1,12],[13,2],[12,14]]:[[2,14],[14,6],[9,1]]))dot(p,size,x,y,4);return p;
}

export function doughFrame(size,frame){
 const p=canvas(size);ellipse(p,size,8,8,7,6+frame,6);ellipse(p,size,8,7,6,5+frame,5);
 dot(p,size,5,7,6);dot(p,size,11,7,6);line(p,size,6,11,10,11,6);dot(p,size,8,10,7);return p;
}

export function cycloneFrame(size,frame){
 const p=canvas(size);
 for(let i=0;i<28;i++){const a=(i/28)*Math.PI*3+frame*Math.PI/2,r=1+i/4;dot(p,size,8+Math.cos(a)*r,8+Math.sin(a)*r,i%3?4:5);}
 dot(p,size,8,8,6);return p;
}

export function lastCrumbFrame(size,frame){
 const p=canvas(size);circle(p,size,8,8,7,6);circle(p,size,8,8,6,4);
 circle(p,size,13,4,4,0);for(const[x,y]of[[5,5],[10,7],[6,11]])circle(p,size,x,y,1,6);
 if(frame)for(const[x,y]of[[1,2],[14,12],[2,14]])dot(p,size,x,y,5);return p;
}

export function gumdropFrame(size,frame){
 const p=canvas(size);ellipse(p,size,8,10,6,5,7);for(let y=3;y<10;y++)for(let x=4+y/3;x<13-y/3;x++)dot(p,size,x,y,7);
 for(const[x,y]of[[6,5],[10,6],[5,9],[11,10],[8,3]])dot(p,size,x,y,5);
 if(frame)for(const[x,y]of[[1,14],[14,14],[2,2],[14,3]]){dot(p,size,x,y,10);dot(p,size,x+1,y,5);}return p;
}

export function timberFrame(size,frame){
 const p=canvas(size),d=frame?2:0;
 for(let y=8;y<25;y++)for(let x=5+d;x<25+d;x++)dot(p,size,x,y,(x===5+d||x===24+d||y===8||y===24)?5:4);
 for(let x=8+d;x<23+d;x+=4)line(p,size,x,10,x+2,22,3);
 for(const[x,y]of(frame?[[1,3],[28,5],[29,22],[3,28]]:[[2,7],[27,12],[24,27]])){
  line(p,size,x,y,x+3,y-2,5);dot(p,size,x+2,y+1,3);
 }return p;
}

export function nineLivesFrame(size,frame){
 const p=heartFrame(size,frame);
 for(let i=0;i<9;i++){const a=i*Math.PI*2/9;dot(p,size,8+Math.cos(a)*7,8+Math.sin(a)*7,i%2?5:8);}
 dot(p,size,5,13,9);dot(p,size,11,13,9);return p;
}

export const physicalEffectDefinitions=[
 // Flame Toss decodes chunks 235-238 in turn into the same VRAM slots; the
 // trail draws from the later ones, so all four carry the waffles.
 // Mega Bomb's blasts are 16x16 and 32x32 cells: tiled parfaits burst instead.
 {tech:23,name:'Parfait Bomb',selected:true,side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('parfait-bomb'),frames:[generatedFrame('parfait-bomb')]},
 // Napalm's lobbed bomb and blast become a tray of buttered waffles.
 {tech:20,name:'Waffle Bomb',side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('waffle-toss'),frames:[generatedFrame('waffle-toss')]},
 {tech:9,name:'Sing-Along',side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('sing-along'),frames:[generatedFrame('sing-along')]},
 {tech:19,name:'Dragon Kiss',selected:true,side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('dragon-kiss'),frames:[generatedFrame('dragon-kiss')]},
 {tech:12,name:'Fresh Eggs',side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('fresh-eggs'),frames:[generatedFrame('fresh-eggs')]},
 {tech:13,name:'Web Candy',side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('web-candy'),frames:[generatedFrame('web-candy')]},
 {tech:11,name:'High C',side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('high-c'),frames:[generatedFrame('high-c')]},
 {tech:26,name:'Blue Fairy',side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('blue-fairy'),frames:[generatedFrame('blue-fairy')]},
 {tech:31,name:'Sawdust',side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('sawdust'),frames:[generatedFrame('sawdust')]},
 {tech:41,name:'Sugar Kiss',side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('sugar-kiss'),frames:[generatedFrame('sugar-kiss')]},
 {tech:53,name:'Mirror Wall',side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('mirror-wall'),frames:[generatedFrame('mirror-wall')]},
 {tech:21,name:'Noble Steed',side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('noble-steed'),frames:[generatedFrame('noble-steed')]},
 {tech:15,name:'Balloon Pet',selected:true,side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('balloon-pet'),frames:[generatedFrame('balloon-pet')]},
 {tech:17,name:'Waffle Toss',side:1,chunks:4,keepAssembly:true,tileChunk:tiledChunk('waffle-toss'),frames:[generatedFrame('waffle-toss')]},
 {tech:25,name:'Nose Job',frames:[noseFrame]},
 {tech:28,name:'Timber!',frames:[timberFrame]},
 {tech:30,name:'Wood Chipper',frames:[woodenFistFrame]},
 {tech:33,name:'Cat Kiss',frames:[heartFrame]},
 {tech:34,name:'Hook & Whisker',frames:[hookFrame]},
 {tech:37,name:'Flying Fur',frames:[furFrame]},
 {tech:39,name:'Nine Lives',frames:[nineLivesFrame]},
 {tech:42,name:'Ginger Roll',frames:[cookieFrame]},
 {tech:43,name:'Crumb & Punishment',frames:[cookieFrame]},
 {tech:44,name:'Dough Hurl',frames:[cookieFrame]},
 {tech:46,name:'Crumb Cyclone',frames:[cookieFrame]},
 {tech:47,name:'Last Crumb',frames:[cookieFrame]},
 {tech:48,name:'My Buttons!',frames:[cookieFrame]}
];

export function crossFrame(size,frame){
 const p=canvas(size),d=frame?2:0;
 line(p,size,2,2+d,29,29-d,1);line(p,size,3,2+d,30,29-d,8);
 line(p,size,29,2+d,2,29-d,1);line(p,size,28,2+d,1,29-d,8);
 for(const[x,y]of[[2,2],[29,2],[2,29],[29,29]])dot(p,size,x,y,10);return p;
}

export function stringFrame(size,frame){
 const p=canvas(size);
 for(let i=0;i<3;i++){line(p,size,3+i*5,0,5+i*5,10,5);line(p,size,5+i*5,10,2+i*5,15,5);}
 hookFrame(size,frame).forEach((v,i)=>{if(v)p[i]=v;});
 if(frame)for(const[x,y]of[[1,1],[14,3],[8,13]])dot(p,size,x,y,10);return p;
}

export const comboEffectDefinitions=[
 {tech:63,name:'Fart Rocket',frames:[timberFrame]},
 {tech:64,name:'Mega Fart',presentationTech:124,frames:[cycloneFrame]},
 {tech:66,name:'Crop Duster',frames:[crossFrame]},
 {tech:69,name:'Gas Drill',frames:[cookieFrame]},
 {tech:71,name:'Swamp Airlift',frames:[cookieFrame]},
 {tech:81,name:'Purrfect Heist',frames:[heartFrame]},
 {tech:90,name:'String Fencing',frames:[stringFrame]},
 {tech:93,name:"Cat's Cradle",frames:[heartFrame,stringFrame]},
 {tech:94,name:'Cookie Lathe',frames:[cookieFrame,cycloneFrame]},
 {tech:95,name:'Cookie Catapult',frames:[cookieFrame]},
 {tech:98,name:'Boots & Buttons',frames:[cookieFrame]},
 {tech:105,name:'Royal Crumb Stomp',frames:[gumdropFrame]},
 {tech:108,name:'Ogre Bakery Brawl',frames:[clawCrumbFrame,cookieFrame]},
 {tech:109,name:'Pointy Trio',frames:[crossFrame,noseFrame]},
 {tech:110,name:'Fart Tornado',frames:[cycloneFrame]},
 {tech:111,name:'Silent But Deadly',frames:[crossFrame,clawCrumbFrame]},
 {tech:114,name:'Three-Ring Circus',frames:[cookieFrame,cycloneFrame]},
 {tech:115,name:'Swamp Hoedown',frames:[heartFrame,cookieFrame]}
];
