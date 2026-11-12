// Summarize already captured action-entry/alignment ticks separately from the
// two scored cycles. No emulator, source-pixel or candidate-ROM mutation.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='assets/imagegen/swamp-imps',out='.local/qa/swamp-imps-native-proof',proof=JSON.parse(await readFile(dir+'/native-timing-proof.json')),cases=[];
let ticks=0,delayedTicks=0,maxConsecutiveDelay=0;
for(const owner of proof.reports)for(const c of owner.cases){
  const raw=await readFile(out+'/'+c.trace);
  assert.equal(createHash('sha256').update(raw).digest('hex'),c.traceSha256);
  const trace=JSON.parse(raw);let consecutive=0,maximum=0;
  for(const tick of trace.startup){consecutive=tick.delay?consecutive+1:0;maximum=Math.max(maximum,consecutive);}
  const delayed=trace.startup.filter(t=>t.delay);
  ticks+=trace.startup.length;delayedTicks+=delayed.length;maxConsecutiveDelay=Math.max(maxConsecutiveDelay,maximum);
  if(delayed.length)cases.push({kind:owner.kind,id:owner.id,program:c.program,action:c.action,facing:c.facing,ticks:trace.startup.length,delayedTicks:delayed.length,maxConsecutiveDelay:maximum,delayedStates:delayed,trace:c.trace,traceSha256:c.traceSha256});
}
assert.equal(ticks,14876);assert.equal(delayedTicks,31);assert.equal(maxConsecutiveDelay,1);assert.ok(cases.every(c=>c.kind==='enemy'&&c.id===19));
const result={status:'Existing native startup/alignment traces audited',activation:false,baselineSha256:proof.baselineSha256,candidateSha256:proof.candidateSha256,scope:'Action-entry/alignment ticks before the two separately scored cycles; these are not included in native-timing-proof.json ticks/delayedVideoTicks totals.',startupVideoTicks:ticks,delayedStartupVideoTicks:delayedTicks,casesWithStartupDelay:cases.length,maxConsecutiveDelayVideoFrames:maxConsecutiveDelay,fourCellOwnerStartupDelayTicks:0,cases,combinedCapture:{videoTicks:ticks+proof.ticks,delayedVideoTicks:delayedTicks+proof.delayedVideoTicks,maximumConsecutiveDelayVideoFrames:1},limitation:'The warm-up/alignment interval includes native request transitions and first cycles before alignment. It is reported separately, not treated as extra scored complete cycles.'};
await writeFile(dir+'/native-timing-startup-audit.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({startupTicks:ticks,startupDelayedTicks:delayedTicks,maxDelay:maxConsecutiveDelay,combinedTicks:result.combinedCapture.videoTicks,combinedDelayedTicks:result.combinedCapture.delayedVideoTicks}));
