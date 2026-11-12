// Original-ROM pose references only; never generates or paints replacement art.
import {readFile,writeFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
const dir='assets/imagegen/hench-hobgoblins',a=JSON.parse(await readFile(dir+'/native-audit.json'));
const bank=nativeSpriteBank(new Uint8Array(await readFile(a.baseline.path)),{gfx:83,asm:38,palette:24,size:0,frames:37});
for(const [name,slots,columns] of [['actions',[13,14,15,16,17,18,19,20,21],3],['tumbles',[25,26,27,28,29,30,31,32,33],3],['recoil-right',[12,24],2]]){
 const rows=Math.ceil(slots.length/columns),p=new PNG({width:columns*384,height:rows*384});
 for(let n=0;n<slots.length;n++){
  const f=slots[n],b=a.geometry.frames[f].bounds,scale=8,dx=n%columns*384+Math.floor((384-b[2]*scale)/2),dy=Math.floor(n/columns)*384+Math.floor((384-b[3]*scale)/2),seen=new Set();
  for(const c of nativeSpriteCells(bank,f))for(let i=0;i<256;i++)if(c.pixels[i]){
   const x=c.x+i%16,y=c.y+(i>>4),k=x+','+y;if(seen.has(k))continue;seen.add(k);
   for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++)p.data.set([...bank.palette[c.pixels[i]-1],255],((dy+(y-b[1])*scale+yy)*p.width+dx+(x-b[0])*scale+xx)*4);
  }
 }
 await writeFile(dir+'/reference-'+name+'.png',PNG.sync.write(p));
}
