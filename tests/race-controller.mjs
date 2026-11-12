import {u16} from '../engine/rom.js';

// Acceptance-test driver only. It reads native race positions and presses
// ordinary directions to pass or block Rivet. It never writes game state.
// Both emulator harnesses use the same inputs and native camera controls.
export function raceController(){
  let target=0;
  return ram=>{
    const player=(u16(ram,0x53)<<16)|u16(ram,0x51),rival=(u16(ram,0x78)<<16)|u16(ram,0x76);
    const lane=u16(ram,0x4e),other=u16(ram,0x73);
    if(player<rival){if(Math.abs(target-other)<4096)target=other>14336?0:28672;}
    else target=other;
    const velocity=u16(ram,0x65)-u16(ram,0x67),rivalVelocity=u16(ram,0x8a)-u16(ram,0x8c);
    // Countersteer before crossing the target lane: the original race keeps
    // lateral momentum after a direction is released.
    const error=target-lane-velocity*6+(player>=rival?rivalVelocity*3:0);
    if(Math.abs(error)<128)return 0;
    const native=u16(ram,error<0?0xb6:0xb8);
    // Camera turns change which physical direction moves across the road.
    for(const [bit,button]of[[0x800,16],[0x400,32],[0x200,64],[0x100,128]])if(native&bit)return button;
    return 0;
  };
}

// Native race-return states for rare scores. Each reward is [item ID, count].
// These exercise reward branches; they do not claim a controller earned an
// exact 777/333/999 score or the high-score thresholds.
export const raceRewardCases=[
  {score:1300,flags:32,reward:[[190,5]],lines:[32]},
  {score:1500,flags:96,reward:[[205,1]],lines:[23,24]},
  {score:2000,flags:224,reward:[[192,5],[205,1]],lines:[30,31,24]},
  {score:2300,flags:224,reward:[[194,5],[205,1]],lines:[106,31,24]},
  {score:2300,flags:224,claimed:true,reward:[[194,5]],lines:[106,31]},
  {score:777,flags:2,reward:[[193,10]],lines:[29]},
  {score:111,flags:1,reward:[[191,1]],lines:[25,26]},
  {score:333,flags:1,reward:[[193,1]],lines:[25,28]},
  {score:999,flags:1,reward:[[192,1]],lines:[25,27]}
];
