// State graph serializer adapted from Secret of Goku (MIT, Mikola Lysenko and
// contributors). Core closures and the cartridge are retained, never serialized.
function hash(b){let h=2166136261;for(const v of b)h=Math.imul(h^v,16777619);return h>>>0;}
export const CORE_VERSION='snesjs-shrek-nmi-2';
export function snapshot(snes){
  const seen=new Map(),nodes=[];
  function visit(v){
    if(v===null||typeof v!=='object')return v;
    if(seen.has(v))return{$ref:seen.get(v)};
    const id=nodes.length;seen.set(v,id);nodes.push(null);
    if(ArrayBuffer.isView(v))nodes[id]={typed:v.constructor.name,values:Array.from(v)};
    else {const props={};nodes[id]={props};for(const[k,child]of Object.entries(v))if(typeof child!=='function'&&child!==undefined&&child!==snes.cart.data)props[k]=visit(child);}
    return{$ref:id};
  }
  return{format:'shrek-trigger-state-v1',core:CORE_VERSION,romHash:hash(snes.cart.data),root:visit(snes),nodes};
}
export function restore(snes,state){
  if(state.format!=='shrek-trigger-state-v1'||state.core!==CORE_VERSION||state.romHash!==hash(snes.cart.data))throw Error('This checkpoint belongs to a different Shrek Trigger build.');
  const seen=new Set(),actions=[];
  function visit(ref,target){
    if(seen.has(ref.$ref))return;seen.add(ref.$ref);const node=state.nodes[ref.$ref];
    if(!node||!target)throw Error('Invalid checkpoint structure');
    if(node.typed){if(target.constructor.name!==node.typed||target.length!==node.values.length)throw Error('Invalid checkpoint array');actions.push(()=>target.set(node.values));return;}
    for(const[k,v]of Object.entries(node.props)){
      if(!(k in target)||typeof target[k]==='function')throw Error('Invalid checkpoint field');
      if(v&&typeof v==='object')visit(v,target[k]);else actions.push(()=>{target[k]=v;});
    }
  }
  visit(state.root,snes);for(const apply of actions)apply();snes.ppu.invalidateLineCaches?.();
}
export async function checkpoint(value){
  const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('shrek-trigger',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('saves',value===undefined?'readonly':'readwrite'),s=tx.objectStore('saves'),q=value===undefined?s.get('checkpoint'):s.put(value,'checkpoint');let result;q.onsuccess=()=>result=q.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}
