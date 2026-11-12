// Tiny emitter for bounded native helpers. Addresses remain explicit; branch
// labels are resolved and range-checked instead of hand-counting displacements.
export function nativeRoutine(build) {
  const bytes=[],labels=new Map(),fixups=[];
  const a={emit(...values){for(const v of values){if(!Number.isInteger(v)||v<0||v>255)throw Error('Invalid native byte');bytes.push(v);}},
    label(name){if(labels.has(name))throw Error('Duplicate native label');labels.set(name,bytes.length);},
    branch(op,name){bytes.push(op,0);fixups.push({at:bytes.length-1,name,width:1});},
    longBranch(name){bytes.push(0x82,0,0);fixups.push({at:bytes.length-2,name,width:2});}};
  build(a);
  for(const {at,name,width} of fixups){if(!labels.has(name))throw Error('Missing native label '+name);const d=labels.get(name)-at-width,limit=width===1?128:32768;if(d<-limit||d>=limit)throw Error('Native branch out of range: '+name);bytes[at]=d&255;if(width===2)bytes[at+1]=d>>8&255;}
  return Uint8Array.from(bytes);
}
