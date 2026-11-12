import {supportingCast} from '../content/supporting-cast.js';
import {cast} from '../content/cast.js';
import {supportingSprite} from './supporting-art.js';
import {compileSpriteFrames,assertUnusedSpriteSlot,assertUnusedPalette,spriteHeaders} from './native-sprites.js';
import {u16,put16,put24} from './rom.js';
import {snesColor,playerRaster} from './sprites.js';
import {compress} from './compression.js';
import {rasterArt,rasterArtInfo} from './raster-art.js';

// Frame IDs are read by both animation lists and direct event commands. Keep
// every original frame slot, including the less common scene-specific poses.
const special = {
  'muffin-man':{14:[1,'talk'],15:[1,'bow'],16:[3,'work',0],17:[3,'work',1]},
  harold:{12:[1,'sit'],13:[1,'point'],14:[1,'talk'],15:[1,'down']},
  alder:{12:[1,'sit'],13:[1,'point'],14:[1,'talk']},
  elowen:{13:[1,'bow'],14:[3,'pray'],15:[1,'raise'],16:[1,'cast',0],17:[1,'cast',1],18:[0,'raise']},
  'fiona-human':{13:[1,'bow'],14:[3,'pray'],15:[1,'raise'],16:[1,'cast',0],17:[1,'cast',1],18:[0,'raise']},
  rowan:{16:[2,'talk',0],17:[2,'talk',1],18:[3,'talk',0],19:[3,'talk',1]},
  gingy:{20:[1,'raise'],21:[1,'sit'],22:[1,'cry',0],23:[1,'cry',1],24:[1,'down']},
  charming:{14:[1,'bow',0],15:[1,'bow',1],16:[3,'bow',0],17:[3,'bow',1],18:[0,'raise',0],19:[0,'raise',1],20:[1,'surprise']},
  lyra:{16:[1,'pray'],17:[1,'surprise'],18:[3,'pray'],19:[3,'bow',0],20:[3,'bow',1],21:[3,'raise',0],22:[3,'raise',1]},
  'young-farquaad':{12:[1,'raise'],13:[3,'point'],14:[1,'down'],15:[3,'down'],16:[3,'surprise']},
  'three-pigs':{15:[3,'work',0],16:[3,'work',1],17:[1,'sit']},
  steve:{0:[1,'sleep'],1:[1,'idle'],2:[2,'idle'],3:[3,'idle'],4:[1,'laugh',0],5:[1,'laugh',1],6:[1,'point'],7:[1,'surprise'],8:[1,'eat',0],9:[1,'eat',1]},
  'steve-guru':{0:[1,'idle'],1:[0,'idle']},
  godmother:{12:[1,'cast',0],13:[1,'cast',1],14:[3,'laugh'],15:[0,'cast',0],16:[0,'cast',1],17:[1,'point']},
  prophet:{6:[0,'walk',3],10:[1,'walk',3]},
  'sir-bram':{16:[0,'raise'],17:[2,'attack'],18:[3,'attack'],19:[1,'down'],20:[2,'burn',0],21:[2,'burn',1],22:[2,'burn',2]},
  'puss-before-exile':{16:[1,'cast'],17:[2,'hit'],18:[3,'hit'],19:[1,'bow']},
  'puss-honored':{16:[1,'cast'],17:[1,'attack']},
  'shrek-frozen':{0:[1,'hit'],1:[1,'cast'],2:[1,'down']}
};
export function supportingFrames(rom,actor) {
  const offset=0x24f000+(actor.npcs[0]+7)*5,animation=rom[offset+3];
  const start=0x240000+u16(rom,0x242600+animation*2),end=0x240000+u16(rom,0x242602+animation*2),stride=(end-start)/4;
  if(!Number.isInteger(stride))throw Error('Unexpected native animation direction table');
  const map=new Array(actor.frames);
  for(let facing=0;facing<4;facing++){
    const idle=rom[start+facing*stride];if(idle<map.length&&!map[idle])map[idle]={facing,pose:'idle',phase:0};
    for(let k=4;k<Math.min(12,stride);k++){
      const id=rom[start+facing*stride+k];if(id===255)break;
      if(id<map.length&&!map[id])map[id]={facing,pose:'walk',phase:(k-4)%3};
    }
  }
  const poses=special[actor.key]??special[actor.artAlias]??{};
  for(const [id,[facing,pose,phase=0]]of Object.entries(poses))map[id]={facing,pose,phase};
  for(let i=0;i<map.length;i++)if(!map[i])throw Error(`Unassigned ${actor.key} frame ${i}`);
  return {map,frames:map.map(p=>supportingSprite(actor.artAlias??actor.key,p))};
}

export function patchSupportingCast(base,allocate,add) {
  const audit=[],headers=spriteHeaders(base),writtenGraphics=new Map(),writtenAssembly=new Map();
  const pointer=(table,id,address,label)=>{const p=new Uint8Array(3);put24(p,0,0xc00000|address);add(table+id*3,p,label);};
  for(const actor of supportingCast){
    const npcOffsets=actor.npcs.map(id=>0x24f000+(id+7)*5),enemyOffsets=(actor.enemies??[]).map(id=>0x24f600+id*10),offsets=[...npcOffsets,...enemyOffsets];
    for(const p of offsets)if(base[p+4]&3)throw Error(`${actor.name} exceeds four native OBJ cells`);
    const sourceGfx=base[npcOffsets[0]],sourceAsm=base[npcOffsets[0]+1];
    if(actor.gfx!==sourceGfx)assertUnusedSpriteSlot(base,0,actor.gfx);
    if(actor.asm!==sourceAsm)assertUnusedSpriteSlot(base,1,actor.asm);
    const owners=headers.filter(h=>base[h.offset+2]===actor.palette);
    if(owners.length){if(owners.some(h=>!offsets.includes(h.offset)))throw Error(`${actor.name} palette is shared with unrelated actors`);}
    else assertUnusedPalette(base,actor.palette);
    const {map,frames}=supportingFrames(base,actor),compiled=compileSpriteFrames(frames);
    const previous=writtenGraphics.get(actor.gfx);
    if(previous){
      if(previous.length!==compiled.graphics.length||previous.some((v,i)=>v!==compiled.graphics[i]))throw Error('Shared actor graphics disagree');
    }else{
      const p=allocate(compress(compiled.graphics),actor.name+' compressed NPC graphics');pointer(0x242000,actor.gfx,p,actor.name+' graphics pointer');writtenGraphics.set(actor.gfx,compiled.graphics);
    }
    const previousAsm=writtenAssembly.get(actor.asm);
    if(previousAsm){
      if(previousAsm.length!==compiled.assembly.length||previousAsm.some((v,i)=>v!==compiled.assembly[i]))throw Error('Shared actor assemblies disagree');
    }else{
      // Relocate to allow the medieval queen's complete nineteen-frame table.
      // Her old fifteen-frame allocation abutted another NPC's data.
      const p=allocate(compiled.assembly,actor.name+' native NPC frames');pointer(0x242300,actor.asm,p,actor.name+' assembly pointer');writtenAssembly.set(actor.asm,compiled.assembly);
    }
    const colors=actor.colors??cast[actor.partyArt].palette,palette=new Uint8Array(24);
    if(colors.length!==12)throw Error('NPC palette requires exactly twelve opaque colors');
    colors.forEach((c,i)=>put16(palette,i*2,snesColor(c)));
    add(0x240000+u16(base,0x242a00+actor.palette*2),palette,actor.name+' isolated palette');
    for(const p of offsets)add(p,Uint8Array.of(actor.gfx,actor.asm,actor.palette),actor.name+' actor header '+p.toString(16));
    const rasterKey=actor.artAlias??(actor.partyArt!==undefined?cast[actor.partyArt].key:actor.key),raster=rasterArtInfo(rasterKey);
    const rasterFrames=map.filter(p=>actor.partyArt!==undefined?playerRaster(actor.partyArt,actor.key==='shrek-frozen'?1:p.facing,p.pose,p.phase):rasterArt(rasterKey,p)).length;
    const rasterCoverage={rasterFrames,proceduralFrames:map.length-rasterFrames,blankFrames:0,sources:raster?.provenance??[]};
    audit.push({key:actor.key,name:actor.name,source:actor.source,npcs:actor.npcs,enemies:actor.enemies??[],frames:map,width:32,height:32,tiles:compiled.tiles,graphicsBytes:compiled.graphics.length,assemblyBytes:compiled.assembly.length,gfx:actor.gfx,asm:actor.asm,palette:actor.palette,scene:actor.scene,author:rasterFrames===map.length?'Image-generated raster indexed for SNES':rasterFrames?'Mixed raster and procedural artwork':'Original project artwork',rasterSources:raster?.provenance,rasterCoverage,native:true,visualReview:'pending scene review'});
  }
  return audit;
}
