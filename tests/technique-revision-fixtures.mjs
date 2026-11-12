import assert from 'node:assert/strict';
import {techniqueTables as table} from '../engine/technique-revision.js';

const changed=[];
for(const id of[36,45]){
 changed.push([table.target(id),table.target(id)+2],[table.control(id),table.control(id)+11],[table.property(id),table.property(id)+12],[table.animation(id),table.animation(id)+7],[table.MP+id,table.MP+id+1],[table.HELP+id*2,table.HELP+id*2+2],[table.SCENE+id*2,table.SCENE+id*2+2],[table.ATTACK+id*2,table.ATTACK+id*2+2]);
}
// Joke mechanics: Love & Life (6) takes Life II's effect record; Some May Die (56) costs 0 MP.
changed.push([table.property(6),table.property(6)+12],[table.MP+56,table.MP+57]);
changed.push([table.target(39),table.target(39)+2],[table.HELP+39*2,table.HELP+39*2+2]);
for(const id of[80,81,92,93,113,114,115,116])changed.push([table.control(id),table.control(id)+1]);
changed.push([0xc249f+11*3,0xc249f+11*3+3],[0xc249f+15*3,0xc249f+15*3+3]);
changed.push([0xc249f+50*3,0xc249f+50*3+3]);
changed.push([0x1ca56,0x1ca5b],[0x1cb26,0x1cb2b],[0x1cd0d,0x1cd11]);
for(const[id,offset]of[[80,0xc2842],[81,0xc283f],[92,0xc2866],[93,0xc2863]])changed.push([offset,offset+3]);
for(const id of[113,114,115,116]){
 const req=0xc2953+(id-112)*3,mask=0xc2983+(id-112);
 changed.push([req,req+3],[mask,mask+1]);
}
changed.push([0xe7b75,0xe7b76],[0xe7b83,0xe7b84],[0xe7ea3,0xe7ea4]);
for(const address of[0x24a850,0x243050,0x24adc0,0x244610,0x24a8f8,0x2430f8])changed.push([address,address+4]);
export function assertRevisedBytes(actual,expected,start,end,message='unchanged native data'){
 for(let p=start;p<end;p++)if(!changed.some(([a,z])=>p>=a&&p<z))assert.equal(actual[p],expected[p],`${message} at ${p.toString(16)}`);
}
