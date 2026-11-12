// Native event-load diagnostic only. No CPU, VRAM, OAM or palette writes.
export function swampPreview(s,h,dev,actor,{autoplay=false}={}){
 const p={frame:0,object:null,script:0};
 const init=h.on('event.init',({location,opcode,scriptPC,object})=>{const at=0x12001+scriptPC;if(location!==1||opcode!==0x82||s.ram[at+1]!==37)return;const load=actor.kind==='npc'?[0x82,actor.id]:[0x83,actor.id,0x83];s.ram.set([...load,0x8b,12,8,0xa6,1,0],at);p.object=object;});
 const dispatch=h.on('event.dispatch',({location,scriptPC,object})=>{if(location!==1||p.object===null)return;const at=0x12001+scriptPC;if(object===0)s.ram[at]=0xb2;if(object!==p.object)return;if(!p.script){s.ram.set(autoplay?[0xa6,1,0xaa,0,0xad,255,0x11,3]:[0xa6,1,0x8b,12,8,0xac,p.frame,0xad,1,0x11,8],at);p.script=at;}});
 dev.jump({id:1,x:8,y:8});return{state:p,frame(f){p.frame=f;if(p.script)s.ram[p.script+6]=f;},dispose(){init();dispatch();},origin:[200,143]};
}
export function expectedTiles(frame,graphics,assembly,cells=4){const bytes=[];for(let i=0;i<cells*4;i++){const p=frame*cells*10+i*2,t=assembly[p]|assembly[p+1]<<8;for(let b of graphics.slice((t&1023)*32,(t&1023)*32+32)){if(t&0x4000){b=(b>>1&85)|(b&85)<<1;b=(b>>2&51)|(b&51)<<2;b=(b>>4)|(b&15)<<4;}bytes.push(b);}}return Uint8Array.from(bytes);}
export function uploadedTiles(s,object,cells=4){const a=0xd00+object*2,p=(s.ram[a]|s.ram[a+1]<<8)*32,v=new Uint8Array(s.ppu.vram.buffer);if(cells===8)return v.slice(p,p+1024);if(cells!==4)throw Error('Unexpected swamp cell budget');return Uint8Array.from([...v.slice(p,p+256),...v.slice(p+512,p+768)]);}
