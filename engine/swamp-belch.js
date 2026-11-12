import {nativeRoutine} from './asm.js';
import {put24,u16} from './rom.js';
import {swampBelchGraphics,techPictureGraphics,swampBelchWindow} from './swamp-belch-art.js';
import {techPictures} from './tech-pictures.js';
import {yarnBallGraphics,yarnBallGlint,yarnBallTech,yarnBallBackground} from './yarn-ball.js';
import {EFFECT_HOOKS_BLOCK,cartridgeDataAddress} from './expanded-rom.js';

export function swampBelchScene(base){
  if(u16(base,0xd5ef0+8*2)!==0x0f90||!base.slice(0x11a208,0x11a20f).every((v,i)=>v===[0x81,1,0x9d,0x13,0x88,0,0x17][i]))throw Error('Swamp Belch source choreography changed');
  return Uint8Array.from([
    0xe6,1,0x83,33,0x7f,0x84, // Native caster windup, 34 frames.
    0xe0,1,0x98,0x80,0x8a,0,128,112,0,0x95,0x0b,0x88,0,
    0x93,0x13,2,0x44, // BG3 over the original scene, native half-add color math.
    0xb0,9, // BG3 uses 8px cells; the message-region mode remains 09.
    0xb7,0,0,0xb7,1,1,0xb7,2,2,0xb7,3,3, // Four existing quadrant uploads.
    0x9d,0x17,0xe5,15, // Reveal the cloud and release the native caster wait.
    0x83,99,0x88,0,0x89,0,0,0,1,0x8b,0,0x7f,0x84,
    0x83,39,0x88,0,0x8b,0,0x7f,0x84,
    0x83,99,0x88,0,0x89,0,0,255,255,0x82,0xc0,0x8b,0,0x7f,0x84,
    0xe0,0,0x83,31,23,0x84,
    ...base.slice(0x11a208,0x11a232),0xff // Original window/scene cleanup, inline return.
  ]);
}

// A picture technique plays Swamp Belch's script with its own center, growth
// rate and hold, and with BG3 solid instead of half-added.
export function techPictureScene(base,picture,{center,radius}=techPictureGraphics(picture)){
  const scene=Array.from(swampBelchScene(base)),{grow,hold}=picture;
  if(![1,2].includes(grow)||radius%grow||radius>100||hold<1||hold>256)throw Error('Invalid picture timing: '+picture.name);
  const swap=(from,to)=>{const at=scene.findIndex((_,i)=>from.every((v,j)=>scene[i+j]===v));if(at<0)throw Error('Picture source choreography changed');scene.splice(at,from.length,...to);};
  swap([0x8a,0,128,112,0],[0x8a,0,center.x,center.y,0]);
  swap([0x93,0x13,2,0x44],[0x93,0x17,0,0]); // BG3 on the main screen, no color math: the picture is solid.
  if(picture.enter==='drop'){
    // Comes down from the sky. The window for a drop picture is a full-width
    // band (dropWindowTable) whose top edge stays at the top of the screen:
    // its center and radius grow together while the picture, first scrolled
    // 176 pixels up (scroll direction 6), comes down 4 pixels a frame (direction 1).
    // The band never reaches the copy of the picture that wraps around the
    // 256-pixel plane. It leaves as the others do, lifting as the band closes.
    if(center.y!==96||radius!==80)throw Error('Drop picture geometry changed');
    swap([0x8a,0,center.x,center.y,0],[0x8a,0,center.x,46,0]);
    swap([0x83,99,0x88,0,0x89,0,0,0,1,0x8b,0,0x7f,0x84,0x83,39],[0x82,0xdf,0x82,0xdf,0x82,0xdf,0x82,0xdf,0x82,0xdf,0x82,0xcf,0x88,0,0x89,0,0,0,46,0x8b,0,
      0x83,43,0x88,0,0x89,0,0,1,1,0x82,0x23,0x8b,0,0x7f,0x84,0x88,0,0x89,0,0,6,6,0x8b,0,0x83,hold-1]);
    swap([0x83,99,0x88,0,0x89,0,0,255,255],[0x83,95,0x88,0,0x89,0,0,255,255]);
  }else{
    swap([0x83,99,0x88,0,0x89,0,0,0,1,0x8b,0,0x7f,0x84,0x83,39],[0x83,radius/grow-1,0x88,0,0x89,0,0,0,grow,0x8b,0,0x7f,0x84,0x83,hold-1]);
    swap([0x83,99,0x88,0,0x89,0,0,255,255],[0x83,radius-1,0x88,0,0x89,0,0,255,255]);
  }
  return Uint8Array.from(scene);
}
export const callMyWifeTech=techPictures[0].tech;
export function callMyWifeScene(base){return techPictureScene(base,techPictures[0]);}

// One long burp for Swamp Belch, in the sound driver's own sequence
// commands: the buzzing resident instrument the fart uses (DC 04), low octave
// (D6), a slow wobble (C9 delay, rate, depth), a whole-note G that slides down
// ten semitones (C8 ticks, semitones) and a tied half note sliding back up.
// The second voice is the same an octave up with a wider, slower wobble.
export const swampBurp={id:0xfc,silent:0x3f,address:0x2f40,voices:[
  [0xdc,4,0xd6,2,0xc9,0,10,0x40,0xc8,0x40,0xf6,0x62,0xc8,0x20,4,0xa9,0xeb],
  [0xdc,4,0xd6,3,0xc9,0,6,0x60,0xc8,0x40,0xf6,0x62,0xc8,0x20,4,0xa9,0xeb]
]};

// A short one-shot toot for the fart combinations (content/tech-juice.js):
// the same instrument, one quarter note sliding down eight semitones. It sits
// in the next empty slots after the burp.
export const fartToot={id:0xfb,address:0x2f40+34,voices:[[0xdc,4,0xd6,2,0xc8,0x0c,0xf8,0x04,0xeb]]};

const long=(a,op,p)=>a.emit(op,p&255,p>>8&255,p>>16&255);
const selected=(a,tech,background,fail)=>{
  a.emit(0xad,0x91,0xae,0xc9,3);a.branch(0xb0,fail);
  a.emit(0xad,0x92,0xae,0xc9,2);a.branch(0xd0,fail);
  a.emit(0xad,0x93,0xae,0xc9,tech);a.branch(0xd0,fail);
  a.emit(0xad,0xa2,0xcc,0xc9,background);a.branch(0xd0,fail);
  a.emit(0xad,0xa3,0xcc);a.branch(0xd0,fail);
};
const active=a=>selected(a,8,1,'original');
// Any full-screen picture technique: Swamp Belch or one of techPictures.
const picture=(a,fail)=>{
  a.emit(0xad,0x91,0xae,0xc9,3);a.branch(0xb0,fail);
  a.emit(0xad,0x92,0xae,0xc9,2);a.branch(0xd0,fail);
  a.emit(0xad,0xa2,0xcc,0xc9,1);a.branch(0xd0,fail);
  a.emit(0xad,0xa3,0xcc);a.branch(0xd0,fail);
  a.emit(0xad,0x93,0xae);for(const t of[8,...techPictures.map(p=>p.tech)]){a.emit(0xc9,t);a.branch(0xf0,'pictureFound');}
  a.branch(0x80,fail);a.label('pictureFound');
};
// Copy staged background chunk $CACE (0-3) from a 4 KiB tile block into $7E:2D00.
const copyChunk=(a,offset)=>{const tiles=cartridgeDataAddress(offset);a.emit(0x8b,0x5a,0xc2,0x20,0x29,255,0,0xeb,0x0a,0x0a,0x18,0x69,tiles&255,tiles>>8&255,0xaa,0xa0,0,0x2d,0xa9,255,3,0x54,0x7e,tiles>>16,0x7b,0x7a,0xab);};

// Every window row for every radius, precomputed from the same integer
// reference the tests use: a 100-entry address table, then 4*radius bytes per
// radius. Building these rows on the console each frame took about half a
// frame at full size; with the rest of the battle engine that overran the
// frame, and the native lag path then blanked every other frame for the whole
// cloud (a 30 Hz strobe). A table copy costs about a tenth as much.
export function swampBelchWindowTable(contour){
  const rows=Array.from({length:100},(_,i)=>swampBelchWindow(i+1,contour)),bytes=new Uint8Array(200+rows.reduce((n,r)=>n+r.length,0));
  let p=200;rows.forEach((r,i)=>{bytes[i*2]=p&255;bytes[i*2+1]=p>>8;bytes.set(r,p);p+=r.length;});
  return bytes;
}

// Window rows for a picture that drops in: every row of every radius spans
// the whole line, so radius r is a band 2r lines tall.
export function dropWindowTable(){
  const bytes=new Uint8Array(200+20200);let p=200;
  for(let r=1;r<=100;r++){bytes[(r-1)*2]=p&255;bytes[(r-1)*2+1]=p>>8;for(let i=0;i<r*2;i++){bytes[p+i*2]=0;bytes[p+i*2+1]=255;}p+=r*4;}
  return bytes;
}

export function swampBelchWindowCode(table,pictures=[]){
  return nativeRoutine(a=>{
    a.emit(0x8d,0xaa,0xca,0x08);if(pictures.length)picture(a,'original');else active(a);
    a.emit(0xad,0xaa,0xca);a.branch(0xd0,'original');
    a.emit(0xad,0xa6,0xca,0xc9,128);a.branch(0xd0,'original');
    a.emit(0xad,0xa4,0xca);a.branch(0xf0,'empty');a.emit(0xc9,101);a.branch(0xb0,'original');
    a.branch(0x80,'render');
    // The overwritten JSR cannot be re-entered. Push its original return
    // address, then enter the helper in bank CD so its RTS resumes at318F.
    a.label('original');a.emit(0x28,0xf4,0x8e,0x31);long(a,0x5c,0xcd31aa);
    a.label('empty');a.emit(0x28);long(a,0x5c,0xcd319d);
    // A = radius (1-100), 8-bit; index registers are 16-bit; DBR is $7E.
    // Copy that radius's 4*radius window bytes to $B900+2*(128-radius).
    a.label('render');
    const render=table=>{
      if((table&0xffff)+200+20200>0x10000)throw Error('Picture window table crosses a bank');
      a.emit(0xc2,0x20,0x29,255,0,0x85,0x45,0x0a,0xaa); // X = radius*2
      a.emit(0xa9,128,0,0x38,0xe5,0x45,0x0a,0x18,0x69,0x00,0xb9,0xa8); // Y = destination
      long(a,0xbf,table-2);a.emit(0x18,0x69,table&255,table>>8&255,0x48); // Source address for this radius
      a.emit(0xa5,0x45,0x0a,0x0a,0x3a,0xfa); // A = byte count - 1, X = source
      a.emit(0x8b,0x54,0x7e,table>>16&255,0xab);
      // The block move leaves A = $FFFF. The native code at CD:35A5 loads the
      // radius into 8-bit A and transfers all 16 bits to Y, so the hidden high
      // byte must be zero, as the original renderer leaves it.
      a.emit(0xa9,0,0);
      a.emit(0x28);long(a,0x5c,0xcd35a5);
    };
    if(pictures.length){
      a.emit(0x48,0xad,0x93,0xae);
      pictures.forEach((p,i)=>{a.emit(0xc9,p.tech);a.branch(0xd0,'not'+i);a.longBranch('picture'+i);a.label('not'+i);});
      a.emit(0x68);
    }
    render(table);
    pictures.forEach((p,i)=>{a.label('picture'+i);a.emit(0x68);render(p.table);});
  });
}

export function patchSwampBelch(base,allocate,add,allocateData=allocate){
  const config=0xd45a6+8*7,hooks=[];
  if(![8,252,0,8,8,8,1].every((v,i)=>base[config+i]===v))throw Error('Swamp Belch source animation changed');
  const gfx=swampBelchGraphics(),yarn=yarnBallGraphics(),tiles=allocateData(gfx.graphics,'Swamp Belch native background tiles'),map=allocateData(gfx.tilemap,'Swamp Belch native background quadrants'),contour=allocateData(gfx.contour,'Swamp Belch generated cloud contour'),windows=allocateData(swampBelchWindowTable(gfx.contour),'Swamp Belch window rows by radius'),script=allocate(swampBelchScene(base),'Swamp Belch native scene script');
  // Flare, Dark Bomb and the rest have scene records with no background
  // script; Luminaire's has one. Everything but the record stays the technique's.
  const pictures=techPictures.map(p=>{
    const g=techPictureGraphics(p),record=0xd45a6+p.tech*7;
    if(p.tech===24&&![24,241,0,10,24,24,13].every((v,i)=>base[record+i]===v))throw Error('Call My Wife source animation changed');
    add(record,base.slice(config,config+7),p.name+' native scene record');
    return{...p,g,tiles:allocateData(g.graphics,p.name+' native background tiles'),map:allocateData(g.tilemap,p.name+' native background quadrants'),windows:allocateData(p.enter==='drop'?dropWindowTable():swampBelchWindowTable(g.contour),p.name+' window rows by radius'),script:allocate(techPictureScene(base,p,g),p.name+' native scene script')};
  });
  // Straight-line selectors for the picture techniques, called from the
  // shared hooks below (which stay inside their reserved block).
  const pictureChunks=allocate(nativeRoutine(a=>{
    a.emit(0x08);
    pictures.forEach((p,i)=>{selected(a,p.tech,1,'next'+i);a.emit(0xad,0xce,0xca,0xc9,4);a.branch(0xb0,'next'+i);copyChunk(a,p.tiles);a.longBranch('end');a.label('next'+i);});
    a.label('end');a.emit(0x28,0x6b);
  }),'Picture technique background upload');
  const pictureMaps=allocate(nativeRoutine(a=>{
    a.emit(0x08);
    pictures.forEach((p,i)=>{
      selected(a,p.tech,1,'next'+i);
      a.emit(0x8b,0xda,0x5a,0xc2,0x20,0xa2,p.map&255,p.map>>8&255,0xa0,0,0xd0,0xa9,255,7,0x54,0x7e,cartridgeDataAddress(p.map)>>16);
      p.g.palette.forEach((c,n)=>{a.emit(0xa9,c&255,c>>8);for(const q of[0x2032,0x2232,0x203a,0x223a])a.emit(0x8d,(q+n*2)&255,(q+n*2)>>8);});
      a.emit(0xe2,0x20,0xa9,255,0x8d,0x95,0xca,0x8d,0x96,0xca,0x7a,0xfa,0xab);a.longBranch('end');a.label('next'+i);
    });
    a.label('end');a.emit(0x28,0x6b);
  }),'Picture technique map and colors');
  // The reserved end of bank $7D: the hooks shared with Yarn Bomb, then
  // Yarn Bomb's glint table and tiles. Shared hooks use no original-pool space.
  const yarnGlint=EFFECT_HOOKS_BLOCK+0x280,yarnTiles=EFFECT_HOOKS_BLOCK+0x400;let shared=EFFECT_HOOKS_BLOCK;
  add(yarnTiles,yarn.graphics,'Yarn Bomb native background tiles');add(yarnGlint,yarnBallGlint(),'Yarn Bomb glint color math');
  function install(offset,expected,code,label,{jump=false,reserved=false}={}){
    if(!expected.every((v,i)=>base[offset+i]===v))throw Error('Swamp Belch boundary changed: '+label);
    let address;
    if(reserved){address=shared;shared+=code.length;if(shared>yarnGlint)throw Error('Shared effect hooks exceed their reserved block');add(address,code,label+' routine');}
    else address=allocate(code,label+' routine');
    const call=new Uint8Array(expected.length).fill(0xea);call[0]=jump?0x5c:0x22;put24(call,1,cartridgeDataAddress(address));add(offset,call,label);hooks.push({offset,address,bytes:code.length,label});
  }
  install(0xd0fa9,[0xad,0xce,0xca,0x0a,0xaa],nativeRoutine(a=>{
    a.emit(0x08);selected(a,8,1,'wife');a.emit(0xad,0xce,0xca,0xc9,4);a.branch(0xb0,'original');
    copyChunk(a,tiles);
    a.label('original');a.emit(0x28,0xad,0xce,0xca,0x0a,0xaa,0x6b);
    a.label('wife');long(a,0x22,cartridgeDataAddress(pictureChunks));
    // Puss's Yarn Bomb (tech 40, native frog background 65) stages the yarn ball.
    selected(a,yarnBallTech,yarnBallBackground,'original');a.emit(0xad,0xce,0xca,0xc9,4);a.branch(0xb0,'original');
    copyChunk(a,yarnTiles);a.emit(0x28,0xad,0xce,0xca,0x0a,0xaa,0x6b);
  }),'Swamp Belch and Yarn Bomb isolated background upload',{reserved:true});
  install(0xd1004,[0x7b,0xa8,0xad,0x95,0xca],nativeRoutine(a=>{
    const replace=(g,map)=>{
      a.emit(0x8b,0xda,0x5a,0xc2,0x20,0xa2,map&255,map>>8&255,0xa0,0,0xd0,0xa9,255,7,0x54,0x7e,cartridgeDataAddress(map)>>16);
      g.palette.forEach((c,i)=>{a.emit(0xa9,c&255,c>>8);for(const p of[0x2032,0x2232,0x203a,0x223a])a.emit(0x8d,(p+i*2)&255,(p+i*2)>>8);});
      a.emit(0xe2,0x20,0xa9,255,0x8d,0x95,0xca,0x8d,0x96,0xca,0x7a,0xfa,0xab,0x28,0x7b,0xa8,0xad,0x95,0xca,0x6b);
    };
    a.emit(0x08);selected(a,8,1,'wife');a.longBranch('belchPicture');
    a.label('wife');long(a,0x22,cartridgeDataAddress(pictureMaps));
    selected(a,yarnBallTech,yarnBallBackground,'original');
    a.emit(0xc2,0x20);yarn.palette.forEach((c,i)=>{a.emit(0xa9,c&255,c>>8);for(const p of[0x2032,0x2232])a.emit(0x8d,(p+i*2)&255,(p+i*2)>>8);});
    a.emit(0xe2,0x20,0xa9,255,0x8d,0x95,0xca); // Skip only the native palette-6 load.
    a.label('original');a.emit(0x28,0x7b,0xa8,0xad,0x95,0xca,0x6b);
    a.label('belchPicture');replace(gfx,map);
  }),'Swamp Belch and Yarn Bomb isolated map and colors',{reserved:true});
  // CD:2D5E starts the rainbow loops of opcode CD:2D44 (A 8-bit, DBR $7E,
  // CGADSUB in $45). Yarn Bomb writes the same CGADSUB with the glint's
  // COLDATA, then leaves through the native REP #$10/RTS with the native
  // loops' final X, Y, A, flags and $49.
  install(0xd2d5e,[0xe2,0x10,0x7b,0xaa,0xa8],nativeRoutine(a=>{
    selected(a,yarnBallTech,yarnBallBackground,'native');
    a.emit(0xc2,0x10,0xa2,0,0);
    a.label('line');a.emit(0xa5,0x45,0x9d,0x06,0xbb);long(a,0xbf,cartridgeDataAddress(yarnGlint+2));a.emit(0x9d,0x07,0xbb,0xe8,0xe8,0xe8,0xe8,0xe0,0x80,0x01);a.branch(0xd0,'line');
    a.emit(0x64,0x49,0x7b,0xa9,0x20,0xa2,0xfe,0x00,0xa0,0x80,0x00,0xc0,0x80,0x00,0xb8,0x5c,0xc8,0x2d,0xcd);
    a.label('native');a.emit(0xe2,0x10,0x7b,0xaa,0xa8,0x5c,0x63,0x2d,0xcd);
  }),'Yarn Bomb glint color math',{jump:true,reserved:true});
  install(0xd1655,[0xbc,0x35,0xca,0x84,0x40],nativeRoutine(a=>{
    a.emit(0x08,0xc2,0x20,0x48,0xe2,0x20);picture(a,'original');a.emit(0xe0,0,0);a.branch(0xd0,'original');
    a.emit(0xbd,0x37,0xca,0xc9,0xd1);a.branch(0xd0,'original');a.emit(0xc2,0x20,0xbd,0x35,0xca,0xc9,0x11,0xa0);a.branch(0xf0,'choose');
    a.label('original');a.emit(0xc2,0x20,0x68,0x28,0xbc,0x35,0xca,0x84,0x40,0x6b);
    a.label('choose');a.emit(0xe2,0x20,0xad,0x93,0xae);
    pictures.forEach((p,i)=>{a.emit(0xc9,p.tech);a.branch(0xd0,'script'+i);a.emit(0xc2,0x20,0xa9,p.script&255,p.script>>8&255,0x9d,0x35,0xca,0xe2,0x20,0xa9,(p.script>>16)|0xc0,0x9d,0x37,0xca);a.longBranch('original');a.label('script'+i);});
    a.emit(0xc2,0x20,0xa9,script&255,script>>8&255,0x9d,0x35,0xca,0xe2,0x20,0xa9,(script>>16)|0xc0,0x9d,0x37,0xca);a.longBranch('original');
  }),'Swamp Belch private native choreography');
  install(0xd3189,[0x8d,0xaa,0xca,0x20,0xaa,0x31],swampBelchWindowCode(cartridgeDataAddress(windows),pictures.map(p=>({tech:p.tech,table:cartridgeDataAddress(p.windows)}))),'Swamp Belch native gas silhouette',{jump:true});
  install(0x161a4,[0x38,0xad,0x95,0x98],nativeRoutine(a=>{
    // Luminaire's charge cue becomes the burp; its blast cue is dropped so the
    // burp carries on uninterrupted while the cloud hangs.
    a.emit(0x08);active(a);a.emit(0xad,1,0x1e,0xc9,0xa5);a.branch(0xf0,'burp');a.emit(0xc9,0xa6);a.branch(0xd0,'original');
    a.emit(0xa9,swampBurp.silent,0x8d,1,0x1e);a.branch(0x80,'original');
    a.label('burp');a.emit(0xa9,swampBurp.id,0x8d,1,0x1e);
    a.label('original');a.emit(0x28,0x38,0xad,0x95,0x98,0x6b);
  }),'Swamp Belch native burp');
  // The burp's two voices live in the pointer slots of sounds $10-$18, which
  // are empty in both resident sound banks (SPC $2F00 + id*4), so nothing in
  // either bank moves.
  if(u16(base,0x7430b+swampBurp.silent*4)||u16(base,0x75b0d+swampBurp.silent*4))throw Error('Silent sound slot is occupied');
  for(const sound of[swampBurp,fartToot])for(const block of[0x7430b,0x75b0d]){
    const at=block+(sound.address-0x2f00),bytes=Uint8Array.from(sound.voices.flat());
    if(base.subarray(at,at+bytes.length).some(Boolean)||u16(base,block+sound.id*4)||u16(base,block+sound.id*4+2))throw Error('Custom sound space is occupied');
    const pointers=new Uint8Array(4);pointers[0]=sound.address&255;pointers[1]=sound.address>>8;
    if(sound.voices[1]){const second=sound.address+sound.voices[0].length;pointers[2]=second&255;pointers[3]=second>>8;}
    add(at,bytes,'Custom sound program '+sound.id.toString(16));add(block+sound.id*4,pointers,'Custom sound pointers '+sound.id.toString(16));
    for(let p=0xe0000;p<0xea954-1;p++)if(base[p]===0x78&&base[p+1]===sound.id)throw Error('Custom sound slot has an animation owner');
  }
  const pictureAudit=pictures.map(p=>({tech:p.tech,name:p.name,damage:'source technique',targets:'source technique',mp:'source technique',scene:'source Luminaire scene record with a generated picture',graphics:{tiles:p.tiles,storedBytes:p.g.graphics.length,uniqueTiles:p.g.uniqueTiles,map:p.map,mapBytes:p.g.tilemap.length,windows:p.windows,width:p.g.width,height:p.g.height,mirrored:true,palette:sourcePalette(p.g),source:{file:p.g.source.source,sha256:p.g.source.sourceSha256}},script:p.script,extraVramBytes:0,extraWramBytes:0}));
  return{pictures:pictureAudit,callMyWife:pictureAudit[0],yarnBomb:{tech:yarnBallTech,name:'Yarn Bomb',background:yarnBallBackground,tiles:yarnTiles,glint:yarnGlint,hooks:hooks.filter(h=>[0xd0fa9,0xd1004,0xd2d5e].includes(h.offset)),damage:'source Frog Squash',targets:'source all enemies',mp:'source Frog Squash',extraVramBytes:0,extraWramBytes:0},tech:8,name:'Swamp Belch',damage:'source Luminaire',element:'Air',targets:'source all enemies',mp:'source Luminaire',status:'unchanged',graphics:{tiles,storedBytes:gfx.graphics.length,uniqueTiles:gfx.uniqueTiles,map,mapBytes:gfx.tilemap.length,contour,contourBytes:gfx.contour.length,width:gfx.width,height:gfx.height,palette:sourcePalette(gfx),source:{file:gfx.source.source,sha256:gfx.source.sourceSha256,phase:gfx.source.sourcePhase}},script,hooks,sound:{id:253,extraSamples:0},extraVramBytes:0,extraWramBytes:0,animation:'native generated gas cloud, expanding contour and rising dissipation'};
}
function sourcePalette(gfx){return gfx.source.palette.slice();}
