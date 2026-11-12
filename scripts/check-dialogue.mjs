import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from '../tests/helpers.mjs';
import {newGameSequence} from '../engine/automation.js';
import {withIndependentController,writeCandidate} from './independent-controller.mjs';
import {elementBadge,elementBadgeTiles} from '../engine/elements.js';
import {PNG} from 'pngjs';

const requested=process.argv[2]??'all';
if(!['all','snes9x','bsnes'].includes(requested))throw Error('Choose all, snes9x or bsnes');
async function tool(env,name){
  if(process.env[env])return path.resolve(process.env[env]);
  for(const dir of ['.local/tools/emu','../secret-of-goku/.local/tools/emu']){
    const p=path.resolve(dir,name);try{await access(p);return p;}catch{}
  }
  throw Error('Set '+env+' to an installed '+name);
}
const b=await build(),sha256=createHash('sha256').update(b.rom).digest('hex');
const root=path.resolve('.local/qa/speaking-'+sha256.slice(0,12)),rom=path.join(root,'shrek-trigger.sfc');
await mkdir(root,{recursive:true});await writeCandidate(rom,b.rom);
const host=await tool('RETRO_HOST','retro-host'),reply=b.audit.shrekDialogue.replies.find(r=>r.location===1&&r.id===10);
for(const name of requested==='all'?['snes9x','bsnes']:[requested]){
  const out=path.join(root,name),core=await tool(name==='snes9x'?'SNES9X_CORE':'BSNES_CORE',name+'_libretro.dylib');
  const result=await withIndependentController({host,core,rom,out},async({request,write,controller:io})=>{
    for(const [frames,buttons]of newGameSequence)await io.hold(buttons,frames);
    assert.equal(await io.read(0x100,2),2);assert.equal(await io.read(0x1238e),0xb2);
    await request({op:'savestate',name:'bedroom'});
    await write(0x1238e,[0xe0,1,2,5,7,0xb2]);await io.wait(180);
    const pointer=async()=>{const bytes=await io.bytes(0x231,3);return bytes[0]|bytes[1]<<8|bytes[2]<<16;};
    const start=0xc00000|reply.offset,end=start+reply.bytes;
    let found=false;
    for(let n=0;n<30;n++){
      const p=await pointer();if(p>=start&&p<=end){found=true;break;}
      await io.tap(256,90);
    }
    assert.ok(found,'native field text enters Shrek continuation');
    if(await pointer()<=start+1)await io.tap(256,120);else await io.wait(120);
    const p=await pointer();assert.ok(p>start+1&&p<=end,'Shrek text renders normally');
    assert.equal(await io.read(0x12a),10,'original event keeps its message ID');
    await io.shot('shrek-home-conversation');
    const badges=[];
    for(const[id,element]of[[0,'Air'],[6,'Dirt']]){
      await request({op:'loadstate',file:path.join(out,'bedroom.state')});
      const party=[id,1,2],reserve=[0,1,2,3,4,5,6].filter(n=>!party.includes(n));
      await write(0x2980,[...party,...reserve,128,128]);await write(0x29af,[254]);
      await write(0x1238e,[0xe0,5,0,27,32,0xb2]);await io.wait(400);
      await io.tap(512,300);assert.equal((await io.read(0xd46))&7,id);
      await io.tap(256,120);await io.shot('element-'+element.toLowerCase());
      const png=PNG.sync.read(await readFile(path.join(out,'element-'+element.toLowerCase()+'.png'))),pixels=elementBadge(element),colors=new Map();
      for(let y=0;y<16;y++)for(let x=0;x<48;x++)if(pixels[y*48+x]){
        const k=pixels[y*48+x],p=((24+y)*png.width+176+x)*4,rgb=png.data[p]<<16|png.data[p+1]<<8|png.data[p+2];
        if(!colors.has(k))colors.set(k,rgb);else assert.equal(rgb,colors.get(k),element+' pixel '+x+','+y);
      }
      assert.equal(new Set(colors.values()).size,colors.size,'native badge colors remain distinct');
      if(name==='snes9x'){
        const vram=(await request({op:'read',mem:'vram',addr:0,len:65536})).value,expected=elementBadgeTiles(element);
        assert.ok(vram.some((v,i)=>v===expected[0]&&expected.every((w,j)=>vram[i+j]===w)),'exact native '+element+' tiles');
      }
      badges.push({character:id,element,pixels:true,tiles:name==='snes9x'});
    }
    await request({op:'loadstate',file:path.join(out,'bedroom.state')});
    await write(0x2980,[0,1,3,2,4,5,6,128,128]);await write(0x29af,[254]);
    await write(0x1238e,[0xe0,99,1,24,28,0xb2]);await io.wait(500);
    assert.equal(await io.read(0x100,2),355);
    let clown=false;
    for(let n=0;n<40;n++){
      await io.tap(256,90);
      if(await io.read(0x12a)===1&&await io.read(0x126)){clown=true;break;}
      if(!await io.read(0x126))await io.hold(128,4);
    }
    assert.ok(clown,'Cleveland dream clown conversation');await io.wait(160);await io.shot('enhasa-clown');
    for(let n=0;n<40&&(await io.read(0x126)||!await io.read(0x11f));n++)await io.tap(256,90);
    assert.equal(await io.read(0x126),0);assert.equal(await io.read(0x11f),1);
    const leader=await io.read(0x197,2),before=await io.read(0x1800+leader,2);await io.hold(64,12);
    assert.notEqual(await io.read(0x1800+leader,2),before,'native walking after Cleveland dialogue');
    await request({op:'loadstate',file:path.join(out,'bedroom.state')});
    await write(0x2980,[0,1,2,3,4,5,6,128,128]);await write(0x29af,[254]);
    await write(0x10000,[186]);await write(0x100d2,[0]);
    await write(0x1238e,[0xe0,0x9f,1,8,12,0xb2]);await io.wait(500);
    assert.equal(await io.read(0x100,2),415);assert.equal(await io.read(0x12a),123);assert.ok(await io.read(0x126));
    await io.shot('wish-palace-godmother');
    const battles=[];
    for(const party of [[0,1,2],[1,0,2],[1,2,0],[1,2,4]]){
      await request({op:'loadstate',file:path.join(out,'bedroom.state')});
      const reserve=[0,1,2,3,4,5,6].filter(id=>!party.includes(id));
      await write(0x2980,[...party,...reserve,128,128]);await write(0x29af,[254]);
      for(let id=0;id<7;id++){
        const p=0x2600+id*80;
        await write(p+3,[231,3,231,3,99,0,99,0]);await write(p+0xb,[65,60,12,60,60,50,60]);
        await write(p+0x12,[60]);await write(p+0x36,[65,60,12,60,60,50,60]);
        await write(p+0x27,[id===6?137:134,[109,108,108,107,109,108,112][id],[85,25,40,57,66,70,78][id],163]);
        await write(p+0x3d,[200,220,231,3]);
      }
      // Setup ends at this ordinary native ChangeLocation instruction.
      // All following messages, AI, party checks and rendering are cartridge code.
      await write(0x1238e,[0xe0,0xdf,3,7,10,0xb2]);
      let shout=false,tell=false,shoutAt=-1;
      for(let n=0;n<1200;n++){
        await io.wait(3);const id=await io.read(0xce18);
        if(id===245&&!shout){
          shout=true;shoutAt=n*3;
          assert.equal(await io.read(0xaf02),206);assert.ok(await io.read(0x117)&1);
          await io.wait(30);await io.shot('tyson-shout-slot-'+party.indexOf(0));
        }
        if(id>=247&&id<=249){tell=true;break;}
      }
      assert.ok(tell,'first native uppercut tell');assert.equal(shout,party.includes(0),'only a present Shrek speaks');
      assert.deepEqual(await io.bytes(0xaf0a,3),party,'native formation keeps the requested party');
      battles.push({party,shout,shoutAt,tell});
    }
    return{sha256,replies:b.audit.shrekDialogue.replies.length,fieldReply:true,badges,cleveland:true,wishPalace:true,battles};
  });
  await writeFile(path.join(out,'verification.json'),JSON.stringify(result,null,2));
  console.log(name,sha256,result.frames,'frames: native Shrek conversation, Air/Dirt menu pixels, Cleveland and Wish Palace dialogue, and Tyson shout party matrix passed');
}
