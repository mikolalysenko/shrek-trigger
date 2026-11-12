import {readFile,writeFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
const dir='assets/imagegen/townswomen-gfx36',a=JSON.parse(await readFile(dir+'/native-audit.json')),r=JSON.parse(await readFile(dir+'/face-preview/preview-raster.json'));
for(const p of a.palettes)for(const scale of[1,6]){const colors=p.colors.map(c=>c.match(/../g).map(x=>parseInt(x,16))),png=new PNG({width:32*3*scale,height:40*5*scale});for(let f=0;f<15;f++)for(let y=0;y<40;y++)for(let x=0;x<32;x++){const k=parseInt(r.frames[f][(y+8)*64+x+16],16);if(k)for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++)png.data.set([...colors[k-1],255],((Math.floor(f/3)*40*scale+y*scale+yy)*png.width+f%3*32*scale+x*scale+xx)*4);}await writeFile(dir+'/review/base-face-palette'+p.id+'-'+scale+'x.png',PNG.sync.write(png));}
console.log('Base source sampling sheets written. Gait contacts/scale not yet accepted.');
