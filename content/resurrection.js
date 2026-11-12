// Additional Last Inn messages. The source table ends at 239; these IDs are
// owned by the appended native egg challenge, never by an existing choice.
export const eggChallengeDialogue={
  240:'STEVE: Two dozen eggs. One dare.\nYou think I cannot finish them?\n   Eat the eggs, rock star!\n   Leave him alone.{null}',
  241:'STEVE: Then the eggs stay here.\nSo does the Second Chance.\nCome back when you mean it.{null}',
  242:'STEVE: I am Steve Harwell.\nSmash Mouth. Keeper of Time.\nI can handle breakfast.{full}{pc1}: Prove it. All 24.\nShrek needs that Time Egg.{null}',
  243:'Six eggs down.\nSTEVE: Barely a warm-up.\n{pc1}: Eighteen to go, superstar.{null}',
  244:'Twelve eggs down.\nSTEVE: Who boiled these in armor?\n{pc1}: Half a concert. Keep going.{null}',
  245:'Eighteen eggs down.\nSTEVE: Time has stopped.\n{pc1}: That is literally your job.{null}',
  246:'Twenty-four eggs. An empty plate.\nSTEVE: Nobody mention breakfast.\nEver again.{full}The Time Egg begins to glow.\nA ridiculous promise, fulfilled.\nA Second Chance for Shrek.{null}'
};

export const eggChallenge={location:464,npc:72,object:28,eggs:24,item:217,
  choice:240,decline:241,accept:242,milestones:[243,244,245,246],
  frames:{bite:8,chew:9},native:true};
