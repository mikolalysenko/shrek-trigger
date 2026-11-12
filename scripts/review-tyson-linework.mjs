import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {PNG} from 'pngjs';
import {generatedRasterArt} from '../engine/generated-raster-art.js';
import {tysonLinework,tysonLineworkSprite} from '../engine/tyson-linework.js';

const root=resolve(import.meta.dirname,'..'),out=resolve(root,'.local/qa');
await mkdir(out,{recursive:true});
const before=generatedRasterArt.tyson,sequence=before.sequences.native[1];
const oldFrame=slot=>{
  const entry=sequence[slot],index=typeof entry==='number'?entry:entry.frame,source=Uint8Array.from(before.frames[index],c=>parseInt(c,16)),pixels=new Uint8Array(before.width*before.height),mirror=typeof entry==='object'&&entry.flip;
  for(let y=0;y<before.height;y++)for(let x=0;x<before.width;x++)pixels[y*before.width+x]=source[y*before.width+(mirror?before.width-1-x:x)];
  return pixels;
};
const colors=tysonLinework.palette.map(hex=>[0,1,2].map(i=>parseInt(hex.slice(i*2,i*2+2),16)));
const font={A:['010','101','111','101','101'],B:['110','101','110','101','110'],E:['111','100','110','100','111'],F:['111','100','110','100','100'],I:['111','010','010','010','111'],K:['101','101','110','101','101'],L:['100','100','100','100','111'],N:['101','111','111','111','101'],O:['010','101','101','101','010'],R:['110','101','110','101','101'],T:['111','010','010','010','010'],W:['101','101','111','111','101'],'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['110','001','010','100','111'],'3':['110','001','010','001','110'],'4':['101','101','111','001','001'],'5':['111','100','110','001','110'],'6':['011','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],'9':['111','101','111','001','110'],' ':['000','000','000','000','000']};
function text(png,label,x,y,color,scale=2){for(const ch of label){const glyph=font[ch];if(!glyph)continue;glyph.forEach((row,gy)=>[...row].forEach((v,gx)=>{if(v==='1')for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++){const p=((y+gy*scale+yy)*png.width+x+gx*scale+xx)*4;png.data.set([...color,255],p);}}));x+=(3+1)*scale;}}
const scale=3,columns=9,rows=5,gap=8,labelHeight=18,header=34,panelWidth=columns*(48*scale+gap)+gap,panelHeight=rows*(64*scale+labelHeight+gap)+gap;
function panel(frames,label){
  const png=new PNG({width:panelWidth,height:panelHeight+header});png.data.fill(255);
  for(let p=0;p<png.data.length;p+=4)png.data.set([24,25,32,255],p);
  text(png,label,gap,10,[245,240,220],3);
  frames.forEach((frame,i)=>{
    const left=gap+(i%columns)*(48*scale+gap),top=header+gap+Math.floor(i/columns)*(64*scale+labelHeight+gap);
    for(let y=0;y<64*scale+labelHeight;y++)for(let x=0;x<48*scale;x++){const p=((top+y)*png.width+left+x)*4;png.data.set([216,211,201,255],p);}
    text(png,String(i).padStart(2,'0'),left+4,top+4,[45,42,48],2);
    for(let y=0;y<64;y++)for(let x=0;x<48;x++){
      const value=frame[y*48+x];if(!value)continue;const [r,g,b]=colors[value-1];
      for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++){const p=((top+labelHeight+y*scale+yy)*png.width+left+x*scale+xx)*4;png.data.set([r,g,b,255],p);}
    }
  });
  return png;
}
const oldFrames=Array.from({length:45},(_,i)=>oldFrame(i)),newFrames=Array.from({length:45},(_,i)=>tysonLineworkSprite('native',i));
await writeFile(resolve(out,'tyson-linework-before.png'),PNG.sync.write(panel(oldFrames,'BEFORE AREA')));
await writeFile(resolve(out,'tyson-linework-after.png'),PNG.sync.write(panel(newFrames,'AFTER LINEWORK')));
const oldPng=panel(oldFrames,'BEFORE AREA'),newPng=panel(newFrames,'AFTER LINEWORK'),contact=new PNG({width:oldPng.width+newPng.width+16,height:oldPng.height});
contact.data.fill(255);for(let p=0;p<contact.data.length;p+=4)contact.data.set([24,25,32,255],p);
for(const [source,x0]of[[oldPng,0],[newPng,oldPng.width+16]])for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){const p=(y*source.width+x)*4,q=(y*contact.width+x+x0)*4;contact.data.set(source.data.subarray(p,p+4),q);}
await writeFile(resolve(out,'tyson-linework-contact-sheet.png'),PNG.sync.write(contact));
console.log(resolve(out,'tyson-linework-contact-sheet.png'));
