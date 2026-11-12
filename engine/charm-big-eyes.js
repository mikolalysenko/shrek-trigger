import {pussSprite} from './puss-art.js';
import {conformPartyFrame} from './party-palette.js';
import {partyConvention} from './raster-art.js';

// A full-body native actor frame, not a replacement for Charm's separate
// resident heart. The original bow becomes an absurd glossy-eyed plea.
export function pussBigEyesSprite(weapon='rapier'){
 const p=pussSprite(0,'battle',1,{weapon});
 const dot=(x,y,c)=>{if(x>=0&&x<32&&y>=0&&y<32)p[y*32+x]=c;};
 for(const[cx,cy]of[[11,9],[21,9]]){
  for(let y=-7;y<=7;y++)for(let x=-5;x<=5;x++){
   const q=(x/5)**2+(y/7)**2;if(q>1)continue;
   dot(cx+x,cy+y,q>.68?1:8);
  }
  for(let y=-4;y<=4;y++)for(let x=-3;x<=3;x++)if((x/3)**2+(y/4.5)**2<=1)dot(cx+x,cy+y,9);
  for(let y=-3;y<=3;y++)for(let x=-1;x<=1;x++)dot(cx+x,cy+y,6);
  dot(cx-2,cy-3,8);dot(cx-1,cy-4,8);dot(cx-2,cy-4,8);dot(cx+2,cy+3,5);
 }
 // Tiny worried eyebrows sell the plea even at native resolution.
 for(const[x,y]of[[6,0],[7,1],[8,1],[23,1],[24,1],[25,0]])dot(x,y,6);
 const outlined=conformPartyFrame(p,32,32,partyConvention('puss'),{outline:true});
 for(const[cx,cy]of[[11,9],[21,9]])for(let y=-3;y<=3;y++)for(let x=-2;x<=2;x++)if((x/2)**2+(y/3.5)**2<=1)outlined[(cy+y)*32+cx+x]=9;
 return outlined;
}

export function patchBigEyesCharm(){
 return{techs:[36,81],actorFrame:206,cells:'existing Puss actor cells',palette:'native Puss party palette',extraVramBytes:0,extraWramBytes:0,animation:'dedicated full-body Puss battle stance with oversized glossy green eyes',hooks:[]};
}
