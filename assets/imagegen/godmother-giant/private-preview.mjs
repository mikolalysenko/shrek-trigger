// Same isolated caretaker-room native load path as devtools.previewActor,
// scoped here because this inactive family is absent from the active registry.
import {largePreviewFrameWrites} from '../../../engine/preview-frames.js';
export function giantPreview(s,h,dev,actor,{autoplay=false}={}){
 const p={frame:0,object:null,script:0,applied:-1,large:(actor.size&3)===2};
 const init=h.on('event.init',({location,opcode,scriptPC,object})=>{
  const at=0x12001+scriptPC;if(location!==1||opcode!==0x82||s.ram[at+1]!==37)return;
  s.ram.set([0x83,actor.enemy,0x83,0x8b,12,7,0xa6,1,0],at);p.object=object;
 });
 const dispatch=h.on('event.dispatch',({location,scriptPC,object})=>{
  if(location!==1||p.object===null)return;const at=0x12001+scriptPC;
  if(object===0)s.ram[at]=0xb2;
  if(object!==p.object)return;
  if(!p.script){s.ram.set(autoplay?[0xa6,1,0xaa,0,0xad,255,0x11,3]:p.large?[0xa6,1,0xad,1,0x11,3]:[0xa6,1,0x8b,12,7,0xac,p.frame,0xad,1,0x11,8],at);p.script=at;}
  if(p.large&&!autoplay){if(p.applied!==p.frame){for(const [address,bytes]of largePreviewFrameWrites(s.cart.data,actor,p.object,p.frame))s.ram.set(bytes,address);p.applied=p.frame;}else if(s.ram[0xf01+p.object*2]===p.frame)s.ram[0x1601+p.object*2]=255;}
 });
 dev.jump({id:1,x:8,y:8});
 return{state:p,frame(f){p.frame=f;if(p.script&&!p.large){s.ram[p.script+4]=[8,9,18,19].includes(f)?5:7;s.ram[p.script+6]=f;}},dispose(){init();dispatch();},get origin(){return[200,!p.large&&[8,9,18,19].includes(p.frame)?95:127];}};
}
export function expectedTiles(frame,graphics,assembly,cells){const bytes=[];for(let i=0;i<cells*4;i++){const p=frame*cells*10+i*2,t=assembly[p]|assembly[p+1]<<8;for(let b of graphics.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}bytes.push(b);}}return Uint8Array.from(bytes);}
export function uploadedTiles(s,object,cells){const a=0xd00+object*2,p=(s.ram[a]|s.ram[a+1]<<8)*32,v=new Uint8Array(s.ppu.vram.buffer);if(cells===12)return Uint8Array.from([0,512,256,768,1024,1536].flatMap(o=>[...v.slice(p+o,p+o+256)]));if(cells===8)return v.slice(p,p+1024);throw Error('Unexpected giant size');}
