// Equal-length native event edits. The forest scene keeps every call,
// dialogue, choice, movement and story flag, but Mongo listens with folded
// arms instead of using Ayla's strike animation and impact sound. Gingy's
// three apology reactions keep him upright, facing Mongo and the party.
export const bakeryEventEdits={
 282:[{pc:0x681,from:[0xab,62],to:[0xac,201]},{pc:0x683,from:[0xe8,129],to:[0xad,8]},
  ...[0x892,0x8a5,0x8b1].map(pc=>({pc,from:[0xaa,6],to:[0xac,2]}))]
};
export function bakeryEvent(event,location){
 const edits=bakeryEventEdits[location];if(!edits)return event;const out=event.slice();
 for(const{pc,from,to}of edits){
  if(from.length!==to.length||!from.every((v,i)=>out[pc+1+i]===v))throw Error('Bakery scene signature: '+location+':'+pc.toString(16));
  out.set(to,pc+1);
 }
 return out;
}
