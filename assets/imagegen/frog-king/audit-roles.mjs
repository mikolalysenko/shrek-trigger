import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
import {chromium} from '@playwright/test';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
const dir='assets/imagegen/frog-king',a=JSON.parse(await readFile(dir+'/native-audit.json'));
const rom=new Uint8Array(await readFile(a.baseline.path));
const bank=nativeSpriteBank(rom,{gfx:193,asm:133,palette:225,size:1,frames:13});
const points=Array.from({length:13},(_,f)=>{const m=new Map();for(const c of nativeSpriteCells(bank,f))for(let i=0;i<256;i++)if(c.pixels[i]){const k=[c.x+i%16,c.y+(i>>4)].join(',');if(!m.has(k))m.set(k,c.pixels[i]);}return m;});
const relations=[];
for(let x=0;x<13;x++)for(let y=x+1;y<13;y++){
  if(points[x].size!==points[y].size)continue;
  const ax=a.geometry.frames[x].bounds,by=a.geometry.frames[y].bounds,dx=by[0]-ax[0],dy=by[1]-ax[1],mirrorK=by[0]+ax[0]+ax[2]-1;
  for(const mirror of[false,true])if([...points[x]].every(([key,k])=>{const[p,q]=key.split(',').map(Number);return points[y].get([mirror?mirrorK-p:p+dx,q+dy].join(','))===k;}))relations.push({frames:[x,y],kind:mirror?'exact horizontal reflection plus authored translation':'exact source raster plus authored translation',xTransform:mirror?'x→'+mirrorK+'−x':'x→x'+(dx<0?'':'+')+dx,dy});
}
const components=points.map((p,frame)=>{
  const seen=new Set(),groups=[];
  for(const key of p.keys())if(!seen.has(key)){
    const todo=[key];seen.add(key);
    for(let n=0;n<todo.length;n++){const[x,y]=todo[n].split(',').map(Number);for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){const k=[x+xx,y+yy].join(',');if(p.has(k)&&!seen.has(k)){seen.add(k);todo.push(k);}}}
    const xy=todo.map(k=>k.split(',').map(Number)),xs=xy.map(p=>p[0]),ys=xy.map(p=>p[1]);
    groups.push({pixels:todo.length,bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs)+1,Math.max(...ys)-Math.min(...ys)+1],indices:[...new Set(todo.map(k=>p.get(k)))].sort((a,b)=>a-b),points:todo.length<=60?todo.map(k=>[...k.split(',').map(Number),p.get(k)]):undefined});
  }
  return{frame,groups:groups.sort((a,b)=>b.pixels-a.pixels)};
});
const labels=[
  'Front upright / mouth open / crown seated',
  'Compressed front body / crown detached above',
  'Raised front body / tucked forefeet / ground shadow',
  'Front recoil / lowered eyelids / detached white dots',
  'Compressed front body / crown seated',
  'Rounded front landing / eyes open',
  'Rounded front landing / lowered eyelids',
  'Low descending front extension / ground shadow',
  'Left-displaced oblique raised body / shadow',
  'Right-displaced oblique raised body / shadow',
  'Front upright / mouth closed / wide eyes',
  'Front upright / mouth closed / half-lowered eyelids',
  'Front upright / mouth closed / lowered eyelids'
];
const roles=a.geometry.frames.map((f,i)=>({...f,role:labels[i],nativeFacing:'front or slightly oblique; no back/profile gait is authored',connectedComponents:components[i].groups}));
const report={status:'Read-only original Frog King visual role interpretation',baseline:a.baseline,frames:roles,exactSourceRelations:relations,
  caveats:['AA61 holds only frame0. Direct event calls and their waits must establish use of other poses; no uniform timing is invented.','The unusual original body/crown/shadow displacements are intentional source geometry, not an instruction to center each review card independently.','Eye and mouth state labels describe visible pixels; they do not assign unsupported combat effects.','Disconnected crown pixels belong to the model and must be generated coherently; retain tiny original dots/ground shadows separately where appropriate.']};
await writeFile(dir+'/native-role-audit.json',JSON.stringify(report,null,2)+'\n');
const images=roles.map(f=>{const img=new PNG({width:112,height:96});for(const[key,k]of points[f.frame]){const[x,y]=key.split(',').map(Number),xx=x+56,yy=y+64;assert.ok(xx>=0&&xx<112&&yy>=0&&yy<96);img.data.set([...bank.palette[k-1],255],(yy*112+xx)*4);}return'data:image/png;base64,'+PNG.sync.write(img).toString('base64');});
const css='body{background:#28363b;color:#eee9df;font:14px system-ui;padding:16px}h1{font-size:23px}h2{font-size:15px;min-height:48px;margin:0}.grid{display:grid;grid-template-columns:repeat(3,370px);gap:8px}.card{background:#3a484e;padding:8px;text-align:center}img{image-rendering:pixelated}.large{width:336px;height:288px}.small{width:112px;height:96px}small{display:block;color:#d0d6cb}';
const top='<h1>Original Frog King gfx193 · read-only 417914 audit</h1><p>Enemy174 ·13 original slots · exact palette225 ·8 cells · shared AA61. All native origins aligned; crown, dots and shadows retain authored offsets.</p>';
const card=(f,size='large')=>'<div class="card"><h2>'+f+' · '+labels[f]+'</h2><img class="'+size+'" src="'+images[f]+'"><small>native bounds '+JSON.stringify(roles[f].bounds)+'</small></div>';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});
  for(let start=0;start<13;start+=6){await page.setContent('<style>'+css+'</style>'+top+'<div class="grid">'+Array.from({length:Math.min(6,13-start)},(_,i)=>card(start+i)).join('')+'</div>');await page.screenshot({path:dir+'/review/original-frames-'+start+'-'+Math.min(12,start+5)+'-3x.png',fullPage:true});}
  const html='<style>'+css+'.grid{grid-template-columns:repeat(4,260px)}h2{font-size:13px;height:56px}</style>'+top+'<div class="grid">'+labels.map((_,f)=>card(f,'small')).join('')+'</div>';
  await page.setContent(html);await page.screenshot({path:dir+'/review/original-native-1x.png',fullPage:true});
  await writeFile(dir+'/review/original-native.html','<!doctype html><meta charset="utf-8">'+html);await page.close();
}finally{await browser.close();}
console.log(JSON.stringify({frames:roles.length,exactSourceRelations:relations,components:components.map(c=>({frame:c.frame,groups:c.groups.map(g=>({pixels:g.pixels,bounds:g.bounds,indices:g.indices}))}))},null,2));
