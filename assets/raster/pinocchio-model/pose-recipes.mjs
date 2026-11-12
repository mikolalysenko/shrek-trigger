// Every recipe below is newly authored against the original static game mesh.
// These are NOT recovered Shrek SuperSlam animation clips.
const arm=(down=82,swing=0,bend=9,curl=15)=>({down,swing,bend,curl});
const leg=(pitch=0,knee=0,spread=3)=>({pitch,knee,spread});
export function recipe(pose,phase=0){
 const t=phase,base={headScale:1.4};let p;
 switch(pose){
  case'idle':p={};break;
  case'walk':{const s=[1,.45,-.45,-1,-.45,.45][t%6];p={leftArm:arm(80,24*s,12),rightArm:arm(80,-24*s,12),leftLeg:leg(-25*s,s<0?12:0),rightLeg:leg(25*s,s>0?12:0)};break;}
  case'run':{const s=[1,.25,-1,-.25][t%4];p={leftArm:arm(76,45*s,65,45),rightArm:arm(76,-45*s,65,45),leftLeg:leg(-48*s,s<0?65:5,6),rightLeg:leg(48*s,s>0?65:5,6),lean:14,headPitch:-8};break;}
  case'ready':p={leftArm:arm(78,-20-20*t,35+35*t,80),rightArm:arm(76,-25-10*t,45+30*t,80),leftLeg:leg(-8,5,6),rightLeg:leg(8,5,6)};break;
  case'battle':p={leftArm:arm(76,-40,70+t*5,80),rightArm:arm(75,-25,90-t*5,80),leftLeg:leg(-10,8+t*4,8),rightLeg:leg(10,8,8),headPitch:2};break;
  case'blink':p={blink:1};break;
  case'look':p={headYaw:t?25:-25};break;
  case'kneel':p={leftLeg:leg(-80,90,6),rightLeg:leg(t?-70:-25,100,6),leftArm:arm(85,-20,25),rightArm:arm(85,-25,30),headPitch:12,lean:t?20:8};break;
  case'down':p={pitch:90,leftArm:arm(88,0,25),rightArm:arm(88,0,30),leftLeg:leg(-10,20),rightLeg:leg(10,25),blink:1,headPitch:8};break;
  case'arms-folded':p={leftArm:{...arm(76,15,145,50),across:60},rightArm:{...arm(79,15,135,50),across:60},headPitch:-4};break;
  case'laugh':p={leftArm:arm(80,-22,85),rightArm:arm(80,-25,85),headPitch:-8-t*7,lean:-2-t*3,jaw:18+t*12,blink:1};break;
  case'shock':p={leftArm:arm(20,-20,70),rightArm:arm(20,-20,70),headPitch:-12,lean:-8,jaw:30};break;
  case'surprise':p={leftArm:arm(25-t*25,-20,60),rightArm:arm(25-t*25,-20,60),headPitch:-10,lean:-5-t*3,jaw:25};break;
  case'victory':p={leftArm:arm(-80,0,15,80),rightArm:arm(60,-25,60,20),headPitch:-8,leftLeg:leg(-5,5,8),rightLeg:leg(8,5,8)};break;
  case'brace':p={leftArm:arm(75,-35,90,80),rightArm:arm(75,-35,90,80),lean:15,headPitch:8,leftLeg:leg(-15,15,10),rightLeg:leg(15,15,10)};break;
  case'hit':p={leftArm:arm(t?45:30,25,35),rightArm:arm(t?30:45,20,25),lean:t?22:-15,headPitch:t?15:-15,roll:t?-5:5,leftLeg:leg(-10,15),rightLeg:leg(10,20),blink:1};break;
  case'jump':p={leftArm:arm(t?-35:30,0,35),rightArm:arm(t?-35:30,0,35),leftLeg:leg(t?-20:-65,100,10),rightLeg:leg(t?-25:-60,95,10),headPitch:-5};break;
  case'punch':p=t?{leftArm:arm(82,-90,0,90),rightArm:arm(75,-25,85,80),leftLeg:leg(-12,0,8),rightLeg:leg(12,8,8),lean:8,headPitch:-3}:{leftArm:arm(75,-25,100,90),rightArm:arm(75,-35,80,80),leftLeg:leg(-12,15,8),rightLeg:leg(12,15,8),lean:-4};break;
  case'uppercut':p=t===0?{leftArm:arm(80,-15,105,90),rightArm:arm(78,-25,80,80),leftLeg:leg(-40,50,8),rightLeg:leg(20,30,8),lean:15}:t===1?{leftArm:arm(75,-140,20,90),rightArm:arm(76,-25,80,80),leftLeg:leg(-12,20,8),rightLeg:leg(10,15,8),headPitch:-10}:{leftArm:arm(-90,0,0,90),rightArm:arm(70,-20,65,80),leftLeg:leg(-5,10,7),rightLeg:leg(10,15,7),headPitch:-15};break;
  case'spin':p={leftArm:arm(8,0,10),rightArm:arm(8,0,10),turn:t*120,leftLeg:leg(-10,20,12),rightLeg:leg(15,30,12)};break;
  case'wave':p={leftArm:arm(t?-45:-65,0,t?40:15,0),rightArm:arm(),headYaw:t?8:-4};break;
  case'raise':p={leftArm:arm(-25-t*30,0,10),rightArm:arm(-25-t*30,0,10),headPitch:-5-t*3};break;
  case'bow':p={lean:60,headPitch:20,leftArm:arm(85,10,20),rightArm:arm(85,10,20),blink:1};break;
  case'cast':p={leftArm:arm(-25,-10,45,0),rightArm:arm(-25,-10,45,0),headPitch:-8,leftLeg:leg(-5,10,8),rightLeg:leg(5,10,8)};break;
  case'reach':p={leftArm:arm(78,-85-t*20,0,0),rightArm:arm(85,15,15),lean:10+t*5,headPitch:5};break;
  case'cheer':p={leftArm:arm(-35-t*25,0,15,45),rightArm:arm(-35-t*25,0,15,45),headPitch:-8, jaw:15,leftLeg:leg(-5,8,7),rightLeg:leg(5,8,7)};break;
  case'repair':p={leftArm:arm(80,-70+t*10,90,20),rightArm:arm(75,-45,100,20),headPitch:25,lean:35};break;
  case'tackle':p={leftArm:arm(80,-90,15,50),rightArm:arm(80,-90,15,50),leftLeg:leg(25,50,7),rightLeg:leg(-15,40,7),lean:65,headPitch:-15};break;
  case'offline':p={leftLeg:leg(-85,85,10),rightLeg:leg(-85,85,10),leftArm:arm(98,10,15),rightArm:arm(98,10,15),headPitch:45,lean:25,blink:1};break;
  case'wake':p={leftLeg:leg(-65,85,8),rightLeg:leg(-50,90,8),leftArm:arm(75,-30,55),rightArm:arm(75,-30,55),headPitch:15,lean:15};break;
  default:throw Error('No authored model pose: '+pose);
 }
 return {...base,...p};
}
