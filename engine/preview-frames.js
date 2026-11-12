import {u16} from './rom.js';

// Development-only descriptors for the native size-2 animation streamer.
// Its incremental loader returns immediately for AC's static mode ($1780=3).
// Instead, point a one-frame animation at an existing byte in this actor's
// immutable ROM program. A native FF byte supplies a 255-tick hold duration.
// Expiring the timer advances FF to frame-list index zero and queues the
// normal tile upload. No CPU PC, stack, cartridge byte or PPU tile is patched.
export function largePreviewFrameWrites(rom,actor,object,frame){
  if((actor.size&3)!==2||!Number.isInteger(object)||object<0||object>63||!Number.isInteger(frame)||frame<0||frame>=actor.frames)throw Error('Invalid large actor preview');
  const animation=actor.previewAnimation??actor.animation??rom[0x24f600+actor.enemy*10+3];
  const start=u16(rom,0x242600+animation*2),end=u16(rom,0x242602+animation*2);
  if(end<=start)throw Error('Large preview animation program is not bounded');
  const program=rom.subarray(0x240000+start,0x240000+end),index=program.indexOf(frame),hold=program.indexOf(255);
  if(index<0||hold<0)throw Error('Large preview frame is absent from the native animation program');
  const x=object*2,word=v=>[v&255,v>>8];
  return [[0x1480+x,[0,0]],[0x1500+x,word(start+index)],[0x1580+x,word(start+hold)],
    [0x1680+x,[0,255]],[0x1601+x,[0]],[0x1780+x,[0]],[0x1301+x,[frame]]];
}
