import {generatedRasterArt} from '../../../../engine/generated-raster-art.js';

// Hand-authored indexed-pixel acting for the native roles that the V.Smile
// sheet does not supply. Every drawing starts from that sheet's 32x32 anatomy
// and twelve-color ramp; no alternate model, runtime renderer or extra SNES
// resource is introduced. The ordinary party pass adds the status-safe outline.
const source=generatedRasterArt.shrek;
const frames=source.frames.slice();
const sequences=Object.fromEntries(Object.entries(source.sequences).map(([pose,directions])=>[pose,Object.fromEntries(Object.entries(directions).map(([facing,sequence])=>[facing,sequence.map(entry=>typeof entry==='number'?entry:{...entry})]))]));
const semanticRoles=Object.fromEntries(Object.entries(source.semanticRoles).map(([pose,directions])=>[pose,Object.fromEntries(Object.entries(directions).map(([facing,role])=>[facing,{...role}]))]));

const clone=id=>Array.from(frames[id],c=>parseInt(c,16));
const save=pixels=>{const p=pixels.slice();prune(p);if(p.length!==1024||p.some(v=>!Number.isInteger(v)||v<0||v>12))throw Error('Invalid authored Shrek frame');frames.push(p.map(v=>v.toString(16)).join(''));return frames.length-1;};
const put=(p,x,y,c)=>{if(x>=0&&x<32&&y>=0&&y<32)p[y*32+x]=c;};
const get=(p,x,y)=>x<0||y<0||x>=32||y>=32?0:p[y*32+x];
// Source gestures can leave one or two detached pixels after their old arms
// are removed. Keep every connected drawing, including diagonal one-pixel
// lines, but discard those tiny orphaned remnants.
function prune(p){
  const seen=new Uint8Array(1024);
  for(let i=0;i<1024;i++){
    if(seen[i]||!p[i])continue;const queue=[i],part=[];seen[i]=1;
    for(let n=0;n<queue.length;n++){
      const at=queue[n],x=at%32,y=Math.floor(at/32);part.push(at);
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
        const xx=x+ox,yy=y+oy,j=yy*32+xx;if(xx<0||xx>=32||yy<0||yy>=32||seen[j]||!p[j])continue;seen[j]=1;queue.push(j);
      }
    }
    if(part.length<3)for(const at of part)p[at]=0;
  }
}
const clear=(p,x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)put(p,x,y,0);};
const rect=(p,x0,y0,x1,y1,c)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)put(p,x,y,c);};
function poly(p,points,c){
  const inside=(x,y)=>{let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [ax,ay]=points[i],[bx,by]=points[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)hit=!hit;}return hit;};
  const xs=points.map(q=>q[0]),ys=points.map(q=>q[1]);
  for(let y=Math.min(...ys);y<=Math.max(...ys);y++)for(let x=Math.min(...xs);x<=Math.max(...xs);x++)if(inside(x+.5,y+.5))put(p,x,y,c);
}
function line(p,points,c,width=1){
  const r=Math.floor(width/2);
  for(let n=1;n<points.length;n++){
    let [x,y]=points[n-1];const [tx,ty]=points[n],dx=Math.abs(tx-x),sx=x<tx?1:-1,dy=-Math.abs(ty-y),sy=y<ty?1:-1;let err=dx+dy;
    for(;;){for(let oy=-r;oy<=r;oy++)for(let ox=-r;ox<=r;ox++)put(p,x+ox,y+oy,c);if(x===tx&&y===ty)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}
  }
}
const mirror=p=>{const out=new Array(1024).fill(0);for(let y=0;y<32;y++)for(let x=0;x<32;x++)out[y*32+x]=p[y*32+31-x];return out;};
function move(p,x0,y0,x1,y1,dx,dy){
  const copy=[];for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)copy.push([x,y,get(p,x,y)]);
  clear(p,x0,y0,x1,y1);for(const [x,y,c]of copy)if(c)put(p,x+dx,y+dy,c);
}
function role(pose,facing,reason){semanticRoles[pose][facing]={kind:'adapted',reason};}

// Knocked out: his side profile laid flat (transposed, so the head lies to
// the left with the face down and his rear up) and set on the ground line.
// The earlier rotation of the front view stood a full body-width tall and
// read as a curled ball rather than a fallen ogre.
const sideIdle=source.sequences.idle[2][0],sideFrame=clone(typeof sideIdle==='number'?sideIdle:sideIdle.frame);
const down=new Array(1024).fill(0);
for(let y=0;y<32;y++)for(let x=0;x<32;x++)down[x*32+y]=sideFrame[y*32+x];
const downBottom=Math.max(...down.map((c,i)=>c?Math.floor(i/32):0));
move(down,0,0,31,31,0,30-downBottom);
const downFrame=save(down);
sequences.down={1:[downFrame,downFrame],2:[downFrame,downFrame],3:[{frame:downFrame,flip:true},{frame:downFrame,flip:true}]};
for(const f of [1,2,3])role('down',f,'Authored same-model prone adaptation with closed eyes, relaxed hand and gathered boots; native left/right orientation and timing are preserved.');

// Folded arms are drawn over the original directional torso. Side forearms
// are removed first so the old hanging-hand silhouette cannot read through.
function foldedFront(){
  const p=clone(56);clear(p,4,12,8,22);clear(p,23,12,27,22);
  poly(p,[[8,13],[10,12],[21,16],[23,18],[21,21],[18,20],[8,16]],1);
  poly(p,[[9,14],[10,13],[20,17],[21,18],[20,19],[18,19],[9,15]],7);
  line(p,[[10,14],[19,18]],9,1);
  poly(p,[[20,16],[23,16],[24,18],[22,20],[20,19]],1);
  poly(p,[[21,17],[23,17],[23,18],[22,19],[21,19]],3);
  poly(p,[[22,13],[24,14],[22,17],[13,22],[9,21],[9,18],[20,13]],1);
  poly(p,[[22,14],[23,15],[21,16],[13,20],[10,20],[10,19],[21,14]],5);
  line(p,[[21,15],[12,20]],9,1);
  poly(p,[[9,18],[11,18],[13,20],[12,22],[9,22],[8,20]],1);
  poly(p,[[9,19],[11,19],[12,20],[11,21],[9,21],[9,20]],3);
  put(p,10,19,4);return p;
}
function foldedRear(){
  const p=clone(26);clear(p,4,12,8,22);clear(p,23,12,27,22);
  poly(p,[[8,14],[10,13],[21,17],[22,20],[19,20],[8,16]],1);
  poly(p,[[9,14],[10,14],[20,18],[20,19],[19,19],[9,15]],7);
  poly(p,[[23,14],[24,16],[21,19],[11,20],[9,18],[20,15]],1);
  poly(p,[[22,15],[22,16],[20,18],[12,19],[11,18],[21,15]],5);
  poly(p,[[9,17],[12,18],[12,20],[9,20],[8,19]],1);rect(p,9,18,10,19,3);
  poly(p,[[20,17],[23,17],[23,19],[21,20],[20,19]],1);rect(p,21,18,22,18,3);
  return p;
}
function foldedSide(){
  const p=clone(3);clear(p,7,11,14,21);
  poly(p,[[9,12],[12,12],[20,16],[21,19],[18,20],[10,17],[8,15]],1);
  poly(p,[[10,13],[12,13],[19,17],[19,18],[18,19],[10,16],[9,15]],7);
  poly(p,[[20,13],[22,14],[21,17],[14,20],[10,19],[10,17],[18,14]],1);
  poly(p,[[20,14],[21,15],[20,16],[14,19],[11,18],[11,17],[19,14]],5);
  poly(p,[[10,16],[13,17],[14,19],[12,20],[9,19],[9,17]],1);
  poly(p,[[10,17],[12,18],[12,19],[10,19],[10,18]],3);return p;
}
const folded={0:save(foldedRear()),1:save(foldedFront()),3:save(foldedSide())};
sequences['arms-folded']={0:[folded[0]],1:[folded[1]],2:[{frame:folded[3],flip:true}],3:[folded[3]]};
for(const f of [0,1,2,3])role('arms-folded',f,'Authored crossed sleeves and opposite green hands over the original directional V.Smile torso; no idle hanging-arm substitute remains.');

// Belly laughs: closed eyes, an open toothy mouth, both hands on the belly and
// a one-pixel rebound on the second five-tick phase.
function laughFace(p,side=false,wide=false){
  if(!side){
    // Eye lines and a broad open mouth sit inside the original face.
    line(p,[[12,9],[13,10],[14,9]],1,1);line(p,[[17,9],[18,10],[19,9]],1,1);
    poly(p,[[13,11],[15,10],[18,10],[20,12],[18,14],[14,14],[12,12]],1);
    rect(p,14,11,18,11,9);rect(p,15,13,17,13,2);if(wide){put(p,13,13,1);put(p,18,13,1);}
  }else{
    line(p,[[18,8],[19,9],[20,8]],1,1);
    poly(p,[[18,10],[21,9],[24,10],[24,12],[21,13],[18,12]],1);
    rect(p,20,10,23,10,9);rect(p,21,12,22,12,2);if(wide)put(p,20,12,1);
  }
}
function laughFront(wide){
  const p=clone(61);clear(p,4,13,8,22);clear(p,23,13,27,22);laughFace(p,false,wide);
  poly(p,[[8,14],[10,13],[15,18],[17,20],[14,22],[11,20],[8,17]],1);
  poly(p,[[9,14],[10,14],[15,19],[15,20],[14,20],[12,19],[9,16]],7);
  poly(p,[[23,14],[24,16],[21,20],[17,21],[15,19],[20,16]],1);
  poly(p,[[22,14],[23,16],[20,19],[17,20],[17,19],[21,16]],5);
  poly(p,[[13,18],[16,18],[18,20],[16,22],[13,21],[12,20]],1);
  poly(p,[[14,19],[16,19],[17,20],[16,21],[14,20]],3);return p;
}
function laughSide(wide){
  const p=clone(wide?9:8);clear(p,7,13,13,21);laughFace(p,true,wide);
  poly(p,[[9,14],[11,13],[18,17],[21,18],[20,21],[17,20],[10,17]],1);
  poly(p,[[10,14],[11,14],[18,18],[19,18],[19,19],[17,19],[10,16]],7);
  poly(p,[[17,17],[21,17],[23,19],[21,21],[18,20]],1);
  poly(p,[[19,18],[21,18],[22,19],[21,20],[19,19]],3);return p;
}
const laugh={front:[save(laughFront(false)),save(laughFront(true))],side:[save(laughSide(false)),save(laughSide(true))]};
sequences.laugh={1:[laugh.front[0],{frame:laugh.front[1],dy:-1}],2:[{frame:laugh.side[0],flip:true},{frame:laugh.side[1],flip:true,dy:-1}],3:[laugh.side[0],{frame:laugh.side[1],dy:-1}]};
for(const f of [1,2,3])role('laugh',f,'Authored two-phase belly laugh with closed eyes, open mouth, belly hands and a one-pixel rebound at the original five-tick cadence.');

// Five seated stages share a grounded hip line and forward boots. The original
// low source body supplies the head and vest; new thighs, knees and resting
// hands make the chair/ground acting read as sitting rather than crouching.
function seated(stage){
  const p=clone(126);clear(p,6,22,26,31);
  // Trouser seat and forward thighs.
  poly(p,[[9,22],[21,22],[24,25],[23,28],[8,28],[7,25]],1);
  poly(p,[[10,23],[20,23],[22,25],[21,26],[9,26],[8,25]],7);
  rect(p,10,24,20,25,5);
  // Bent knees and broad boots stay inside the four native cells.
  poly(p,[[7,24],[11,25],[12,28],[10,30],[4,30],[4,28],[6,27]],1);
  poly(p,[[20,25],[24,24],[26,27],[28,28],[28,30],[21,30],[20,28]],1);
  rect(p,5,28,10,29,8);rect(p,22,28,27,29,8);put(p,4,28,8);put(p,28,28,8);
  // Sleeves and green hands rest on the knees, with small acting offsets.
  const drop=stage===1||stage===3?1:0;
  poly(p,[[8,17],[10,18],[10,22+drop],[8,25],[6,24],[7,20]],1);
  poly(p,[[8,18],[9,18],[9,22+drop],[8,23],[7,23],[8,20]],5);
  poly(p,[[22,17],[24,18],[24,22],[25,24],[23,25],[21,22+drop],[21,19]],1);
  poly(p,[[22,18],[23,18],[23,22],[24,23],[23,23],[22,22+drop],[22,19]],5);
  poly(p,[[6,23],[9,23],[10,25],[8,26],[6,25]],1);rect(p,7,24,8,24,3);
  poly(p,[[23,23],[25,23],[26,25],[24,26],[22,25]],1);rect(p,24,24,25,24,3);
  if(stage===2||stage===4){ // contented seated eye-close / ending rest
    line(p,[[12,17],[13,18],[14,17]],1,1);line(p,[[17,17],[18,18],[19,17]],1,1);
  }
  if(stage===3){line(p,[[14,20],[17,20]],1,1);}
  if(stage===4){line(p,[[14,20],[15,21],[17,21],[18,20]],1,1);}
  return p;
}
const sitFrames=[0,1,2,3,4].map(stage=>save(seated(stage)));
sequences.sit={1:sitFrames};
role('sit',1,'Five authored seated stages with grounded hips, forward thighs and boots, hands on knees and subtle face/arm changes replace the old crouching substitutes.');

// Native 220 is the leftward horizontal strike at the start of mode 61. The
// genuine side lunge supplies extended knuckles and a trailing airborne leg;
// a two-pixel lift removes the old ground-contact read without changing cells.
const strike=clone(0);
move(strike,15,25,24,30,-2,-2); // tuck the landing boot under the body
const strikeFrame=save(strike);
sequences['horizontal-strike']={2:[{frame:strikeFrame,flip:true,dy:-2}],3:[{frame:strikeFrame,dy:-2}]};
for(const f of [2,3])role('horizontal-strike',f,'Authored horizontal airborne strike from the genuine V.Smile side lunge, with tucked trailing boot and a two-pixel lift; the prone-body substitute is removed.');

// Rear prison-escort gait: alternating original legs, sleeves drawn inward and
// clasped green hands visible at the small of the back.
function escort(base,phase){
  const p=clone(base);clear(p,0,8,5,24);clear(p,26,8,31,24);clear(p,3,9,9,21);clear(p,22,9,28,21);
  poly(p,[[8,12],[10,12],[15,18],[15,20],[12,20],[8,16]],1);
  poly(p,[[9,13],[10,13],[14,18],[13,19],[9,15]],7);
  poly(p,[[23,12],[24,15],[20,20],[16,20],[16,18],[21,14]],1);
  poly(p,[[22,13],[23,15],[20,19],[17,19],[17,18],[21,14]],5);
  poly(p,[[13,17],[17,17],[19,19],[17,21],[13,20],[12,19]],1);
  rect(p,14,18,16,19,3);put(p,17,19,4);put(p,14+phase,20,2);return p;
}
const escortFrames=[save(escort(114,0)),save(escort(113,1))];
sequences.hold[0]=escortFrames;
role('hold',0,'Authored two-contact rear escort gait with alternating native legs and clasped hands behind the back at the original sixteen-tick cadence.');

// One genuine open eye and one closed eye, copied from the matching V.Smile
// front expressions rather than painting over both eyes.
const wink=clone(56),closed=clone(61);
for(let y=7;y<=12;y++)for(let x=16;x<=20;x++)put(wink,x,y,get(closed,x,y));
const winkFrame=save(wink);sequences.wink={1:[winkFrame]};
role('wink',1,'Authored one-eye wink combining the matching genuine open and closed V.Smile eye regions while retaining the upright front body.');

// A small foaming wooden mug makes the ending loop unambiguous. The two source
// arm positions provide a smooth lift to the mouth; the hand wraps the handle.
function mug(p,x,y,raised){
  poly(p,[[x,y],[x+4,y],[x+4,y+5],[x+3,y+6],[x,y+6],[x-1,y+4]],1);
  rect(p,x,y+1,x+3,y+4,6);rect(p,x+1,y+2,x+3,y+4,7);rect(p,x,y,x+3,y,9);
  put(p,x+1,y+1,5);put(p,x+4,y+2,7);put(p,x+5,y+2,1);put(p,x+5,y+3,1);put(p,x+4,y+4,1);
  poly(p,[[x-2,y+2],[x,y+1],[x+1,y+3],[x,y+5],[x-2,y+4]],1);
  rect(p,x-1,y+2,x,y+3,3);if(raised)put(p,x,y+1,4);
}
const drinkLow=clone(161);mug(drinkLow,21,12,false);
const drinkHigh=clone(167);mug(drinkHigh,20,9,true);
const drinkFrames=[save(drinkLow),save(drinkHigh)];sequences.drink={1:drinkFrames};
role('drink',1,'Authored two-stage foaming-mug lift with a green gripping hand, using the genuine near-body arm gestures at the original 32-tick ending cadence.');

export const completeShrekArt={...source,frames,sequences,semanticRoles,authoredActing:{frames:frames.length-source.frames.length,nativeFallbacks:0,source:'assets/raster/shrek/acting-complete/art.mjs'}};
