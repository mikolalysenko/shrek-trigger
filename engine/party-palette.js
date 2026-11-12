// Chrono Trigger's party palettes reserve two entries for the outline. When a
// status such as Haste or Protect lands, the battle engine cycles palette
// entries 1 and 12 of that character's sprite palette through the status
// color, so the outline glows while the body keeps its colors. Entry 1 is a
// near-black outline that also draws inner line work; entry 12 is a softer
// dark accent used only on the silhouette (stock: Crono 291820 and 412039).
//
// The imported party art predates that rule: its outlines mix several dark
// colors and entry 12 is an ordinary body color, so statuses lit up parts of
// the body instead of the outline. partyPaletteConvention() derives a
// conforming palette from an imported one, and conformPartyFrame() applies it
// to the imported pixels: near-blacks join entry 1, the closest remaining
// colors merge until ten body colors are left, and every silhouette pixel
// becomes outline (1 beside dark colors, 12 beside lit ones). Single-pixel
// lines such as blades keep their color.
export const PARTY_OUTLINE='291820',PARTY_ACCENT='412039';
const BLACK_L=20,SPLIT_L=55;

const lin=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
export function lab(hex){
  const [r,g,b]=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)),R=lin(r),G=lin(g),B=lin(b),f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;
  const X=f((R*.4124+G*.3576+B*.1805)/.95047),Y=f(R*.2126+G*.7152+B*.0722),Z=f((R*.0193+G*.1192+B*.9505)/1.08883);
  return[116*Y-16,500*(X-Y),200*(Y-Z)];
}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);

// palette: the imported 12 colors (entries 1-12). counts[i]: pixels using
// entry i across the actor's frames (breaks merge ties toward common colors).
// darkFill: {members, color} gives source near-blacks that would otherwise
// merge into the outline their own entry when a body slot is free, so large
// dark masses such as hair keep a fill inside their outline.
export function partyPaletteConvention(palette,counts,{darkFill}={}){
  if(palette.length!==12)throw Error('Party palettes have twelve colors');
  const L=palette.map(lab);
  // Groups of source entries (1-based). Group 0 is the outline black.
  const black=[1,...palette.map((_,i)=>i+1).filter(i=>i!==1&&L[i-1][0]<BLACK_L)];
  if(L[0][0]>=BLACK_L)black.shift();
  let groups=palette.map((_,i)=>i+1).filter(i=>!black.includes(i)).map(i=>[i]);
  const rep=g=>g.reduce((a,b)=>(counts[b]??0)>(counts[a]??0)?b:a);
  while(groups.length>10){
    let best=null;
    for(let a=0;a<groups.length;a++)for(let b=a+1;b<groups.length;b++){const d=dist(L[rep(groups[a])-1],L[rep(groups[b])-1]);if(!best||d<best.d)best={a,b,d};}
    groups[best.a]=[...groups[best.a],...groups[best.b]].sort((x,y)=>x-y);groups.splice(best.b,1);
  }
  groups.sort((x,y)=>x[0]-y[0]);
  const colors=groups.map(g=>palette[rep(g)-1]);
  let fill=null;
  if(darkFill&&colors.length<10){
    if(!darkFill.members.every(i=>black.includes(i)&&i!==1))throw Error('Dark fill members must be merged near-blacks');
    fill=darkFill.members;colors.push(darkFill.color);
  }
  while(colors.length<10)colors.push(colors[colors.length-1]);
  const remap=new Uint8Array(13);
  for(const i of black)remap[i]=1;
  groups.forEach((g,k)=>{for(const i of g)remap[i]=k+2;});
  if(fill)for(const i of fill)remap[i]=groups.length+2;
  // An imported entry 1 lighter than the outline joins its nearest group.
  if(!remap[1]){let k=0,d=1e9;groups.forEach((g,j)=>{const e=dist(L[0],L[rep(g)-1]);if(e<d){d=e;k=j;}});remap[1]=k+2;}
  return{palette:[PARTY_OUTLINE,...colors,PARTY_ACCENT],remap,groups:[fill?black.filter(i=>!fill.includes(i)):black,...groups,...(fill?[fill]:[])]};
}

// pixels: width*height source indices (0 transparent). Returns conforming
// indices. Portraits pass outline:false (menus show no status glow).
export function conformPartyFrame(pixels,width,height,convention,{outline=true}={}){
  const out=Uint8Array.from(pixels,v=>v?convention.remap[v]:0);
  if(!outline)return out;
  const lit=convention.palette.map(h=>lab(h)[0]>SPLIT_L),body=out.slice();
  const empty=(x,y)=>x<0||y<0||x>=width||y>=height||!body[y*width+x];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,v=body[i];if(!v||v===1)continue;
    const l=empty(x-1,y),r=empty(x+1,y),u=empty(x,y-1),d=empty(x,y+1);
    if(!(l||r||u||d))continue;
    if((l&&r)||(u&&d))continue; // a single-pixel line keeps its color
    out[i]=lit[v-1]?12:1;
  }
  return out;
}
