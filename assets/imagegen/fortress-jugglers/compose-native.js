// Inactive, browser-compatible source placement and original-raster effect merge.
// This copies generated indices and exact original effects; it draws no anatomy.
export function composeJugglerArt(source,map,effects){
  const {width,height}=source;
  if(width!==64||height!==80||source.frames?.length!==8||map.length!==9)throw Error('Juggler source dimensions changed');
  const sampled=source.frames.map(s=>{if(s.length!==width*height||!/^[0-9abc]+$/.test(s))throw Error('Invalid Juggler source raster');return Uint8Array.from(s,c=>parseInt(c,16));});
  const frames=map.map((entry,frame)=>{
    if(entry.frame!==frame||!sampled[entry.source])throw Error('Juggler source mapping changed');
    const pixels=new Uint8Array(width*height),[sx,sy]=entry.sourceBounds,[tx,ty]=entry.bodyBounds,dx=tx-sx,dy=ty-sy;
    if(!Number.isInteger(dx)||!Number.isInteger(dy))throw Error('Juggler noninteger source translation');
    for(let i=0;i<width*height;i++)if(sampled[entry.source][i]){
      const x=i%width+dx,y=Math.floor(i/width)+dy;
      if(x<0||x>=width||y<0||y>=height)throw Error('Juggler source clipped');
      pixels[y*width+x]=sampled[entry.source][i];
    }
    const overlay=effects.frames.find(e=>e.frame===frame);
    if(overlay)for(const[x,y,k]of overlay.points){
      if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(k)||k<1||k>12)throw Error('Invalid original effect pixel');
      const px=x+32,py=y+64;if(px<0||px>=width||py<0||py>=height)throw Error('Original effect clipped');
      // The radial source flash intentionally covers body pixels; the separate
      // dots/flecks keep their original positions and any overlap is audited.
      pixels[py*width+px]=k;
    }
    return Array.from(pixels,k=>k.toString(16)).join('');
  });
  return{...source,frames,sequences:{native:{1:Array.from({length:9},(_,i)=>i)}},originalRasterComponents:[{file:'assets/imagegen/fortress-jugglers/original-effects.draft.json',sourceType:'original-ROM-raster',pixelRecordSha256:effects.pixelRecordSha256,nativePixelCount:363}]};
}
