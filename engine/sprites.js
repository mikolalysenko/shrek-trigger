import {cast} from '../content/cast.js';
import {u16,u24,fileOffset,put16} from './rom.js';
import {playerPoseMaps} from '../content/player-frames.js';
import {shrekSprite} from './shrek-art.js';
import {fionaSprite} from './fiona-art.js';
import {donkeySprite} from './donkey-art.js';
import {pinocchioSprite} from './pinocchio-art.js';
import {pussSprite} from './puss-art.js';
import {mongoSprite} from './mongo-art.js';
import {farquaadSprite} from './farquaad-art.js';
import {rasterArt,rasterArtInfo} from './raster-art.js';
import {packPlayerFrames} from './player-frame-packing.js';
import {pussBigEyesSprite} from './charm-big-eyes.js';

const attackPoses=['slash','shoot','shoot','punch','slash','punch','swing'];
export function playerRaster(id,facing=1,pose='idle',phase=0,weapon='rapier'){
  const key=id===4&&weapon==='hatchet'?'puss-hatchet':cast[id]?.key;
  if(id===4&&pose==='big-eyes')return pussBigEyesSprite(weapon);
  return key?rasterArt(key,{facing,pose:pose==='attack'?attackPoses[id]:pose,phase}):null;
}
// The same indexed pixels feed previews and cartridge compilation. Generated
// atlas poses take precedence; unconverted roles remain explicitly audited.
export function sprite(id, facing=1, pose='idle', phase=0, {weapon='rapier'}={}) {
  const raster=playerRaster(id,facing,pose,phase,weapon);if(raster)return raster;
  if(id===4&&pose==='big-eyes')return pussBigEyesSprite(weapon);
  if(id===0)return shrekSprite(facing,pose==='attack'?'slash':pose,phase);
  if(id===1)return fionaSprite(facing,pose==='attack'?'shoot':pose,phase);
  if(id===2)return donkeySprite(facing,pose==='attack'?'shoot':pose,phase);
  if(id===3)return pinocchioSprite(facing,pose==='attack'?'punch':pose,phase);
  if(id===4)return pussSprite(facing,pose==='attack'?'slash':pose,phase,{weapon});
  if(id===5)return mongoSprite(facing,pose==='attack'?'punch':pose,phase);
  if(id===6)return farquaadSprite(facing,pose==='attack'?'swing':pose,phase);
  throw Error('Unknown player sprite '+id);
}

export function tile4bpp(pixels,width,x,y) {
  const out=new Uint8Array(32);
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    const v=pixels[(y+row)*width+x+col];
    for(let bit=0;bit<4;bit++)out[(bit>>1)*16+row*2+(bit&1)]|=((v>>bit)&1)<<(7-col);
  }
  return out;
}
export function snesColor(hex) {const n=parseInt(hex,16);return ((n>>19)&31)|((n>>11)&31)<<5|((n>>3)&31)<<10;}
// Native assembly bit 14 mirrors an 8x8 tile in software before its upload.
// Store one copy of each horizontal pair; vertical mirroring is unsupported
// by the field loader and must never be inferred from generic SNES OAM rules.
export function internSpriteTile(tile,tiles,indices){
  const key=Array.from(tile).join(',');if(indices.has(key))return indices.get(key);
  const id=tiles.length;tiles.push(tile);indices.set(key,id);
  const mirror=Array.from(tile,v=>{v=(v>>1&0x55)|(v&0x55)<<1;v=(v>>2&0x33)|(v&0x33)<<2;return (v>>4)|(v&15)<<4;}).join(',');
  if(!indices.has(mirror))indices.set(mirror,id|0x4000);
  return id;
}
export function paletteBytes(id,{full=false}={}) {
  const colors=full?['000000',...cast[id].palette,'000000','000000','000000']:cast[id].palette;
  const out=new Uint8Array(colors.length*2);colors.forEach((c,i)=>put16(out,i*2,snesColor(c)));return out;
}
export function frameAssignments(rom,id) {
  const start=0x240000+u16(rom,0x242600+id*2),end=0x240000+u16(rom,0x242600+id*2+2),stride=(end-start)/4;
  const assembly=fileOffset(u24(rom,0x242300+id*3));
  const ends=Array.from({length:256},(_,i)=>fileOffset(u24(rom,0x242300+i*3))).filter(x=>x>assembly);
  let count=Math.min(256,Math.floor((Math.min(...ends)-assembly)/40));
  const extra=Math.max(-1,...Object.keys(playerPoseMaps[id]).map(Number));
  if(extra>=count)count=extra+1;
  const map=Array.from({length:count},()=>({facing:1,pose:'idle',phase:0,provisional:true}));
  // Infer each original frame's facing from its first reference in the animation
  // blob. Keep all original animation lists/timing; uncommon event poses receive
  // a safe directional stand-in and remain explicitly provisional in the audit.
  for(let f=0;f<4;f++)for(let k=0;k<stride;k++) {
    const frame=rom[start+f*stride+k];if(frame>=count||frame===255)continue;
    if(map[frame].provisional)map[frame]={facing:f,pose:k>=4&&k<10?'walk':k>=24&&k<32?'walk':'idle',phase:k%3,provisional:true};
  }
  for(let facing=0;facing<4;facing++){
    // Idle is one frame followed by FF and alignment padding. Treating that
    // padding as frame zero changed several characters' front/back idle into
    // a right-facing sprite on the last direction-table iteration.
    const idle=rom[start+facing*stride];
    if(idle<count)map[idle]={facing,pose:'idle',phase:0,provisional:false};
    for(let k=4;k<10;k++){
      const frame=rom[start+facing*stride+k];if(frame===255)break;
      if(frame<count)map[frame]={facing,pose:'walk',phase:k-4,provisional:false};
    }
  }
  for(const [frame,description]of Object.entries(playerPoseMaps[id])){
    if(Number(frame)>=count)throw Error(`Pose ${id}:${frame} exceeds native assembly`);
    map[frame]={...description};
  }
  return {assembly,count,map};
}
export function makeCharacterRecords(rom,id,{allowGrowth=false}={}) {
  const {assembly,count,map}=frameAssignments(rom,id),gfx=fileOffset(u24(rom,0x242000+id*3));
  const allGfx=Array.from({length:256},(_,i)=>fileOffset(u24(rom,0x242000+i*3))).filter(x=>x>gfx);
  const capacity=Math.min(...allGfx)-gfx;
  // Tile zero is also used by native clear/empty sprite paths. Keep it blank.
  const blank=new Uint8Array(32);
  const tiles=[blank],tileMap=new Map([[Array.from(blank).join(','),0]]);
  const byWeapon={};
  const compile=weapon=>{
    const frames=new Uint8Array(count*40);
    const coverage={rasterFrames:0,proceduralFrames:0,blankFrames:0,remaining:[]};
    for(let f=0;f<count;f++){
      const a=map[f],raster=playerRaster(id,a.facing,a.pose,a.phase,weapon),pixels=raster??sprite(id,a.facing,a.pose,a.phase,{weapon});
      if(a.pose==='blank')coverage.blankFrames++;
      else if(raster)coverage.rasterFrames++;
      else{coverage.proceduralFrames++;coverage.remaining.push({frame:f,facing:a.facing,pose:a.pose,phase:a.phase});}
      // Native assembly order is TL/TR for each 16x16 cell, then BL/BR.
      for(let row=0;row<2;row++)for(let cell=0;cell<4;cell++)for(let col=0;col<2;col++){
        const x=(cell%2)*16+col*8,y=(cell>>1)*16+row*8,tile=tile4bpp(pixels,32,x,y);
        put16(frames,f*40+row*16+cell*4+col*2,internSpriteTile(tile,tiles,tileMap));
      }
      frames.set([240,224,0,224,240,240,0,240],f*40+32);
    }
    byWeapon[weapon]=coverage;
    return frames;
  };
  const frames=compile('rapier'),hatchetSource=id===4?compile('hatchet'):null;
  const compact=id!==4||Object.values(byWeapon).every(v=>v.proceduralFrames===0);
  const packed=packPlayerFrames(frames,{compact}),hatchetPacked=hatchetSource?packPlayerFrames(hatchetSource,{compact}):null;
  if(hatchetPacked){
    if(!packed.frameMap.every((v,i)=>v===hatchetPacked.frameMap[i]))throw Error('Puss weapon variants need identical logical frame grouping');
    // The alternate field OAM builder reads the primary coordinate table.
    // Equipment may change pixels, but must preserve each frame's geometry.
    for(let f=0;f<count;f++)for(let i=32;i<40;i++)if(frames[f*40+i]!==hatchetSource[f*40+i])throw Error('Puss weapon frame coordinates differ');
  }
  const hatchetFrames=hatchetPacked?.bytes??null;
  const bytes=Uint8Array.from(tiles.flatMap(t=>Array.from(t)));
  if(bytes.length>(allowGrowth?0x10000:capacity))throw Error(`${cast[id].name} graphics exceed ${allowGrowth?'native bank':'original allocation'}: ${bytes.length}/${allowGrowth?0x10000:capacity}`);
  const pal=0x240000+u16(rom,0x242a00+id*2);
  const sources=[cast[id].key,...(id===4?['puss-hatchet']:[])].flatMap(key=>rasterArtInfo(key)?.provenance??[]);
  const rasterCoverage={rasterFrames:byWeapon.rapier.rasterFrames,proceduralFrames:byWeapon.rapier.proceduralFrames,blankFrames:byWeapon.rapier.blankFrames,byWeapon,sources};
  const roles=rasterArtInfo(cast[id].key)?.semanticRoles;let semanticCoverage=null;
  if(roles){
    const counts={source:0,adapted:0,fallback:0,blank:0},frames=map.map((a,frame)=>{
      const role=a.pose==='blank'?{kind:'blank',reason:'Native empty animation slot.'}:roles[a.pose]?.[a.facing]??(a.facing===3?roles[a.pose]?.[2]:null);
      if(!role||!(role.kind in counts))throw Error('Missing raster pose semantics: '+cast[id].key+' '+a.pose+'/'+a.facing);
      counts[role.kind]++;return{frame,...a,...role};
    });
    semanticCoverage={counts,frames,remaining:frames.filter(f=>f.kind==='fallback')};
  }
  return {records:[{offset:gfx,bytes,label:`${cast[id].name} 4bpp tiles`},{offset:assembly,bytes:packed.bytes,label:`${cast[id].name} native frames`},{offset:pal,bytes:paletteBytes(id),label:`${cast[id].name} palette`}],hatchetFrames,audit:{id,name:cast[id].name,frameCount:count,tiles:tiles.length,bytes:bytes.length,capacity,provisionalFrames:map.filter(x=>x.provisional).length,rasterCoverage,semanticCoverage,map,assembly:{offset:assembly,sourceBytes:frames.length,bytes:packed.bytes.length,uniqueFrames:packed.uniqueFrames,frameMap:packed.frameMap}}};
}
