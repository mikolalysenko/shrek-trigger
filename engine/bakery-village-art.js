import {nativeRasterArt} from './raster-art.js';

// Preserve every native animation slot, including the child's blank pose and
// the elder's blank/head-only pieces. The remaining special poses are the
// feast's dancing/crouching sequence and the porter's fallen pose.
export function bakeryVillagerPose(art,f){
 const counts={'bread-porter':23,'cinnamon-baker':23,'crumb-child':15,'brioche-elder':19},count=counts[art];
 if(!count||!Number.isInteger(f)||f<0||f>=count)throw Error('Invalid Bakery civilian frame');
 if(art==='crumb-child'&&f===14||art==='brioche-elder'&&f===16)return{blank:true};
 if(art==='brioche-elder'&&f>=17)return{facing:f===17?2:3,phase:0,headOnly:true};
 if(f<4)return{facing:f,phase:0};
 if(art==='bread-porter'){
  if(f<16)return{facing:(f-4)/3|0,phase:(f-4)%3-1};
  if(f===22)return{facing:1,phase:0,fallen:true};
  return{facing:f===17?0:f===18||f===20?2:f===19||f===21?3:1,phase:0,crouch:f<18,raised:f>=20};
 }
 if(art==='cinnamon-baker'){
  if(f<20)return{facing:(f-4)/4|0,phase:[-1,0,1,0][(f-4)%4]};
  return{facing:1,phase:0,dance:f-20};
 }
 if(art==='crumb-child')return f<10?{facing:(f-4)/3|0,phase:(f-4)%3-1}:{facing:f<12?2:3,phase:f%2?1:-1};
 return f<12?{facing:(f-4)/4|0,phase:[-1,0,1,0][(f-4)%4]}:{facing:f<14?2:3,phase:f%2?1:-1};
}

export function bakeryVillagerSprite(art,frame){
 const frames={'bread-porter':23,'cinnamon-baker':23,'crumb-child':15,'brioche-elder':19,'bread-drummer':2,'bun-percussionist':2,'onion-bread-plate':8}[art];
 if(!frames)throw Error('Unknown Bakery civilian artwork');
 return nativeRasterArt(art,frame,{width:32,height:32,frames});
}
