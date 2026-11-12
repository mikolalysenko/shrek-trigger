import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';

const dir=import.meta.dirname,audit=JSON.parse(fs.readFileSync(path.resolve(dir,'../../raster/town-npc12-audit/native-audit.json'))),revision=process.argv[2]??'base';
fs.mkdirSync(path.join(dir,'review'),{recursive:true});
for(const method of ['area','nearest']){
  const raster=JSON.parse(fs.readFileSync(path.join(dir,revision+'-'+method+'/preview-raster.json')));
  for(const palette of audit.palettes)for(const scale of [1,6]){
    const png=new PNG({width:4*48*scale,height:4*40*scale});
    for(let i=0;i<png.data.length;i+=4)png.data.set([38,50,56,255],i);
    raster.frames.forEach((hex,f)=>{
      for(let i=0;i<hex.length;i++){
        const k=parseInt(hex[i],16);if(!k)continue;
        const x=i%64-32+24,y=(i>>6)-52+34,word=palette.words[k-1],rgb=[0,5,10].map(n=>{const v=word>>n&31;return v<<3|v>>2;});
        if(x<0||x>=48||y<0||y>=40)throw Error('Source review clipped a pixel');
        for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++)png.data.set([...rgb,255],((((f/4|0)*40+y)*scale+yy)*png.width+((f%4)*48+x)*scale+xx)*4);
      }
    });
    fs.writeFileSync(path.join(dir,'review',`${revision}-${method}-palette${palette.id}-${scale}x.png`),PNG.sync.write(png));
  }
}
