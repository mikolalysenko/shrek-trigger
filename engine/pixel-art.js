// Integer pixel primitives shared by original cartridge artwork. No filters,
// antialiasing, floating-point colors or runtime image decoding are involved.
export function pixelCanvas(width,height) {
  const pixels=new Uint8Array(width*height);
  const dot=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<width&&y<height)pixels[y*width+x]=c;};
  const rect=(x,y,w,h,c)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)dot(x+i,y+j,c);};
  const line=(x,y,x2,y2,c)=>{const n=Math.max(Math.abs(x2-x),Math.abs(y2-y));for(let i=0;i<=n;i++)dot(x+(x2-x)*i/(n||1),y+(y2-y)*i/(n||1),c);};
  const oval=(x,y,w,h,c)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(((i+.5)/w-.5)**2+((j+.5)/h-.5)**2<=.25)dot(x+i,y+j,c);};
  const polygon=(points,c)=>{
    for(let y=Math.max(0,Math.min(...points.map(p=>p[1])));y<=Math.min(height-1,Math.max(...points.map(p=>p[1])));y++){
      const crossings=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))crossings.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
      crossings.sort((a,b)=>a-b);for(let i=0;i+1<crossings.length;i+=2)for(let x=Math.ceil(crossings[i]);x<crossings[i+1];x++)dot(x,y,c);
    }
    for(let i=0;i<points.length;i++)line(...points[i],...points[(i+1)%points.length],c);
  };
  return {width,height,pixels,dot,rect,line,oval,polygon};
}
