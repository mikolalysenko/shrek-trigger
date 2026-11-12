import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
const dir='assets/imagegen/frog-guards',rom=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc')),hash=b=>createHash('sha256').update(b).digest('hex'),bank=nativeSpriteBank(rom,{gfx:98,asm:57,palette:54,size:0,frames:26});
const bounds=p=>{const xs=p.map(p=>p[0]),ys=p.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return[x,y,Math.max(...xs)-x+1,Math.max(...ys)-y+1];};
const roles=['rear contact right','rear raised passing','rear contact left','front contact right','front raised passing','front contact left','left contact A','left raised passing','left contact B','right contact A','right raised passing','right contact B','upturned recoil with tiny tongue','front spread arms','rear spread arms','front low arms open mouth','front initial inflation','front full inflation','rear upward short tongue','rear upward long tongue','front downward short tongue','front downward long tongue','left short tongue','left extended tongue and throat','right short tongue','right extended tongue and throat'];
const layers=[],frames=[];
for(let frame=0;frame<26;frame++){
 const p=new Map();for(const c of nativeSpriteCells(bank,frame))for(let y=0;y<16;y++)for(let x=0;x<16;x++){const k=c.pixels[y*16+x];if(k)p.set((c.x+x)+','+(c.y+y),[c.x+x,c.y+y,k]);}
 const all=[...p.values()],dark=all.filter(p=>p[2]===1),seen=new Set(),groups=[];
 for(const v of dark){const key=v.slice(0,2).join(',');if(seen.has(key))continue;const todo=[v];seen.add(key);for(let i=0;i<todo.length;i++){const[x,y]=todo[i];for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){const key=[x+dx,y+dy].join(','),n=p.get(key);if(n?.[2]===1&&!seen.has(key)){seen.add(key);todo.push(n);}}}groups.push(todo);}
 const bottom=Math.max(...dark.map(p=>p[1])),shadow=groups.filter(g=>g.length>=20&&Math.max(...g.map(p=>p[1]))===bottom).flat().filter(p=>frame!==21||p[1]<=3),shadowKeys=new Set(shadow.map(p=>p.slice(0,2).join(','))),body=all.filter(p=>!shadowKeys.has(p.slice(0,2).join(',')));
 assert.ok(shadow.length>=20&&body.length>0);const b=bounds(shadow),pixels=new Uint8Array(b[2]*b[3]);for(const[x,y,k]of shadow)pixels[(y-b[1])*b[2]+x-b[0]]=k;
 layers.push({frame,bounds:b,pixels:[...pixels],opaquePixels:shadow.length,sha256:hash(pixels)});frames.push({frame,role:roles[frame],bounds:bounds(all),bodyBounds:bounds(body),bodyBottom:Math.max(...body.map(p=>p[1])),shadowBounds:b,shadowPixels:shadow.length,originalCellOrigins:nativeSpriteCells(bank,frame).map(c=>[c.x,c.y]),all,body,shadow});
}
const mirror=(a,b)=>{const p=frames[a].all,q=frames[b].all,bp=bounds(p),bq=bounds(q);if(bp[2]!==bq[2]||bp[3]!==bq[3])return null;const target=new Map(q.map(p=>[p.slice(0,2).join(','),p[2]])),dx=bp[0]+bp[2]-1+bq[0],dy=bq[1]-bp[1];return p.length===q.length&&p.every(([x,y,k])=>target.get([dx-x,y+dy].join(','))===k)?{a,b,reflectionXSum:dx,dy}:null;};
const mirrors=[];for(let a=0;a<26;a++)for(let b=a+1;b<26;b++){const m=mirror(a,b);if(m)mirrors.push(m);}
for(const layer of['all','body','shadow']){const png=new PNG({width:5*64*4,height:6*80*4});for(let i=0;i<png.data.length;i+=4)png.data.set([37,48,54,255],i);for(const f of frames)for(const[x,y,k]of f[layer])for(let yy=0;yy<4;yy++)for(let xx=0;xx<4;xx++)png.data.set([...bank.palette[k-1],255],(((Math.floor(f.frame/5)*80+y+48)*4+yy)*png.width+((f.frame%5)*64+x+32)*4+xx)*4);await writeFile(dir+'/review/original-'+layer+'-4x.png',PNG.sync.write(png));}
await writeFile(dir+'/source-native-shadows.json',JSON.stringify({sourceType:'original-ROM-raster',sourceRomSha256:hash(rom),gfx:98,asm:57,selection:'Original index-1 connected bottom components of at least20 pixels. Slot21 is bounded at nativeY3 to exclude the two old tongue-outline rails; its separated shadow halves remain. Mask includes original foot-edge pixels where connected; never procedurally redrawn.',frames:layers},null,2)+'\n');
await writeFile(dir+'/native-role-audit.json',JSON.stringify({status:'Audited original native roles before source sampling',exactOriginalMirrors:mirrors,frames:frames.map(({all,body,shadow,...r})=>r),interpretation:'13 front and14 rear spread arms;18/19 rear/upward,20/21 front/downward; original source shadows have frame-specific displacements. These are visual roles, not new mechanics.'},null,2)+'\n');
console.log(JSON.stringify({mirrors,frames:frames.map(({all,body,shadow,...r})=>r)},null,2));
