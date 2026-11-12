import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {nativeSpriteBank,nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
const dir='assets/imagegen/swamp-imps',rom=new Uint8Array(await readFile('.local/chrono-trigger-usa.sfc')),audit=JSON.parse(await readFile(dir+'/native-resource-audit.json')),hash=b=>createHash('sha256').update(b).digest('hex');
const bounds=p=>{if(!p.length)return null;const x=Math.min(...p.map(p=>p[0])),y=Math.min(...p.map(p=>p[1]));return[x,y,Math.max(...p.map(p=>p[0]))-x+1,Math.max(...p.map(p=>p[1]))-y+1];};
const map=p=>new Map(p.map(p=>[p[0]+','+p[1],p[2]])),same=(a,b)=>a.size===b.size&&[...a].every(([k,v])=>b.get(k)===v);
function points(cells){const m=new Map();for(const c of cells)for(let i=0;i<256;i++)if(c.pixels[i]){const p=[c.x+i%16,c.y+(i>>4)],key=p.join(',');if(!m.has(key))m.set(key,[...p,c.pixels[i]]);}return[...m.values()];}
const cells={},original={};for(const g of audit.groups){const bank=nativeSpriteBank(rom,{...g,gfx:86,frames:g.frames.length});cells[g.key]=g.frames.map(f=>nativeSpriteCells(bank,f.frame));original[g.key]=cells[g.key].map(points);}
const arcBase={16:17,18:19,21:22,24:25};
const imp=original.imp.map((p,f)=>{
 const base=original.imp[arcBase[f]??f],shadows=base.filter(([x,y,k])=>[13,18,19,21,22,24,25].includes(f)&&y>=-5),dots=base.filter(([x,y,k])=>f===14&&y<=-29||f===27&&(x<=-12||x>=12)),excluded=new Set([...shadows,...dots].map(p=>p[0]+','+p[1])),body=base.filter(p=>!excluded.has(p[0]+','+p[1])),bm=map(base),arcs=arcBase[f]===undefined?[]:p.filter(([x,y,k])=>bm.get(x+','+y)!==k),effects=[...shadows,...dots,...arcs];
 const reconstructed=map([...body,...effects]);assert.ok(same(reconstructed,map(p)),'Original Imp body/effect composition '+f);
 return{frame:f,bodyReference:arcBase[f]??f,bodyBounds:bounds(body),bodyBottom:Math.max(...body.map(p=>p[1])),bodyPixels:body.length,effects:effects.map(p=>p.slice()),shadowPixels:shadows.length,dotPixels:dots.length,arcPixels:arcs.length,effectBounds:bounds(effects),originalBounds:bounds(p)};
});
const roly=original.roly.map((p,f)=>{const effects=f===12?p.filter(([x,y,k])=>k===2&&y<=-18&&(x<=-9||x>=8)):[],keys=new Set(effects.map(p=>p[0]+','+p[1])),body=p.filter(p=>!keys.has(p[0]+','+p[1]));return{frame:f,bodyBounds:bounds(body),bodyBottom:Math.max(...body.map(p=>p[1])),bodyPixels:body.length,effects,effectBounds:bounds(effects),originalBounds:bounds(p)};});
// These relationships are proven against the original independently decoded
// cell layers. Earlier cells have native OAM priority; a flattened image alone
// cannot establish the hidden pixels of the two compound bodies.
const riderImp=[15,15,15,3,3,3,6,6,6,9,9,9,14,12,19,null,0,1,2,3,4,5,6,7,8,9,10,11,19];
const impShift=[[3,-22],[3,-21],[3,-20],[-6,-18],[-6,-17],[-6,-16],[6,-14],[7,-13],[8,-14],[-6,-14],[-7,-13],[-8,-14],[-1,-22],[-2,-17],[-1,-18],[0,0],[1,-14],[0,-12],[0,-14],[0,-17],[0,-16],[-2,-17],[0,-16],[0,-16],[0,-16],[0,-16],[0,-16],[0,-16],[-1,-18]];
const mounts=[0,1,2,3,4,5,6,7,8,9,10,11,12,4,14,13,16,13,15,15,13,16,20,21,22,23,24,25,null];
const rider=mounts.map((mount,f)=>{
 const impFirst=!(f>=3&&f<=11),ic=cells.rider[f].filter(c=>(c.cell<4)===impFirst),mc=cells.rider[f].filter(c=>(c.cell<4)!==impFirst),ip=points(ic),mp=points(mc),shift=impShift[f],source=riderImp[f],cropMaxY=f===28?-9:null;
 if(source!==null){const expected=original.imp[source].filter(p=>cropMaxY===null||p[1]<=cropMaxY).map(([x,y,k])=>[x+shift[0],y+shift[1],k]);assert.ok(same(map(expected),map(ip)),'Original rider Imp component '+f);}
 const mountShift=[0,f===12?-1:0];let additionalNativeMountOutlinePixels=[];if(mount!==null){const effects=new Set(roly[mount].effects.map(p=>p[0]+','+p[1])),expected=original.roly[mount].filter(p=>f!==12||!effects.has(p[0]+','+p[1])).map(([x,y,k])=>[x+mountShift[0],y+mountShift[1],k]);const em=map(expected),mm=map(mp);assert.ok([...em].every(([k,v])=>mm.get(k)===v),'Original rider mount source pixels '+f);additionalNativeMountOutlinePixels=mp.filter(([x,y,k])=>em.get(x+','+y)!==k);assert.deepEqual(additionalNativeMountOutlinePixels,[3,5].includes(f)?[[f===3?-9:8,-10,12],[f===3?-9:8,-9,1],[f===3?-9:8,-8,1],[f===3?-9:8,-7,1]]:[],'Original rider extra mount outline '+f);}else assert.equal(mp.length,0);
 return{frame:f,impSourceFrame:source,impShift:shift,impCropMaxY:cropMaxY,impBounds:bounds(ip),impOpaquePixels:ip.length,mountSourceFrame:mount,mountShift,mountDropsOriginalDots:f===12,additionalNativeMountOutlinePixels,mountSourceRelation:[3,5].includes(f)?'Complete original Roly plus four dark outline pixels; candidate uses the complete new generated mount anatomy without these old-anatomy edge fragments.':'Exact original Roly component, with dots removed and native translation for slot12.',mountBounds:bounds(mp),mountOpaquePixels:mp.length,priorityOrder:impFirst?['imp','mount']:['mount','imp'],originalImpCellOrigins:ic.map(c=>[c.x,c.y]),originalMountCellOrigins:mc.map(c=>[c.x,c.y]),impSourceRelation:source===null?'Distinct turned rider body; actual generated additional source.':cropMaxY===null?'Exact original Imp pixels plus integer translation.':'Exact original Imp subset, cropped at authored native Y -9 before translation; excludes two lower body rows and the detached shadow.'};
});
const result={status:'Exact original source-component audit passed',activation:false,sourceType:'original-ROM-raster',sourceRomSha256:hash(rom),gfx:86,pixelOrder:'Earlier OAM cells have priority; all source equalities and effect masks use that ordering.',imp,roly,rider,effectsPolicy:'Original detached shadows, white dots and strike-arc raster differences are unchanged indices at unchanged native coordinates. New anatomy is actual generated PNG source. Rider compound order and component translations remain native.'};
await writeFile(dir+'/source-native-components.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({imp:imp.map(({effects,...p})=>({...p,effectPixels:effects.length})),roly:roly.map(({effects,...p})=>({...p,effectPixels:effects.length})),rider},null,2));
