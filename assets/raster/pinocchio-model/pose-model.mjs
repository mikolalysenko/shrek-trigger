// Locally authored rigid-joint poses of the original game mesh, not recovered
// game animation. The wooden puppet already has separate joint/limb pieces.
import {V,around} from './render-model.mjs';
const rad=v=>v*Math.PI/180;
const armObjects=new Set(['Mesh_0287.rip','Mesh_0288.rip']);
const legObjects=new Set(['Mesh_0284.rip','Mesh_0290.rip','Mesh_0293.rip']);
const headObjects=new Set(['Mesh_0278.rip','Mesh_0279.rip','Mesh_0280.rip','Mesh_0281.rip','Mesh_0296.rip','Mesh_0298.rip','Mesh_0301.rip']);
export function poseModel(model,options={}){
 const roles=new Map();for(const f of model.faces)for(const [i]of f.indices)roles.set(i,f.object);
 const config={leftArm:{down:82,swing:0,bend:9},rightArm:{down:82,swing:0,bend:9},leftLeg:{pitch:0,knee:0,spread:3},rightLeg:{pitch:0,knee:0,spread:3},headYaw:0,headPitch:0,headScale:1,blink:0,jaw:0,lean:0,roll:0,pitch:0,turn:0,...options};
 return (p,i)=>{
  const object=roles.get(i),side=p[0]>=0?1:-1,arm=side<0?config.leftArm:config.rightArm,leg=side<0?config.leftLeg:config.rightLeg;let q=p.slice();
  if(armObjects.has(object)||(object==='Mesh_0282.rip'&&Math.abs(p[0])>.15)){
   const curl=arm.curl??15;
   if(object==='Mesh_0282.rip'&&Math.abs(p[0])>=.75){const fingerZ=p[2]<-.13?-.16:p[2]<-.065?-.09:-.025;if(Math.abs(p[0])>=.811)q=around(q,[side*.815,1.075,fingerZ],'z',rad(-side*curl));q=around(q,[side*.75,1.075,fingerZ],'z',rad(-side*curl));}
   if(Math.abs(p[0])>=.37)q=around(q,[side*.365,1.075,-.09],'y',rad(-side*(arm.bend??0)));
   q=around(q,[side*.08,1.075,-.09],'z',rad(-side*(arm.down??82)));
   q=around(q,[side*.08,1.075,-.09],'x',rad(arm.swing??0));
   q=around(q,[side*.08,1.075,-.09],'y',rad(-side*(arm.across??0)));
  }
  if(legObjects.has(object)){
   if(object!=='Mesh_0293.rip')q=around(q,[side*.062,.365,-.073],'x',rad(leg.knee??0));
   q=around(q,[side*.06,.59,-.07],'x',rad(leg.pitch??0));
   q=around(q,[side*.06,.59,-.07],'z',rad(side*(leg.spread??0)));
  }
  if(headObjects.has(object)){
   if(config.blink&&['Mesh_0280.rip','Mesh_0296.rip'].includes(object)&&Math.abs(p[0])>.035&&Math.abs(p[0])<.17&&p[1]>1.37&&p[1]<1.48&&p[2]>.0){const weight=object==='Mesh_0296.rip'?1:Math.min(1,(p[2]+.005)/.06);q[1]=q[1]+(1.421-q[1])*config.blink*weight;}
   if(config.jaw&&object==='Mesh_0279.rip')q=around(q,[0,1.29,-.01],'x',rad(-config.jaw));
   q=V.add(V.mul(V.sub(q,[0,1.155,-.075]),config.headScale),[0,1.155,-.075]);q=around(q,[0,1.155,-.075],'y',rad(config.headYaw));q=around(q,[0,1.155,-.075],'x',rad(config.headPitch));}
  if(config.lean&&p[1]>.59)q=around(q,[0,.65,-.07],'x',rad(config.lean));
  if(config.pitch)q=around(q,[0,.85,-.07],'x',rad(config.pitch));
  if(config.roll)q=around(q,[0,.85,-.07],'z',rad(config.roll));
  if(config.turn)q=around(q,[0,.85,-.07],'y',rad(config.turn));
  return V.add(q,config.translation??[0,0,0]);
 };
}
export const feasibilityPoses=[
 {name:'idle',options:{}},
 {name:'walk-contact-a',options:{leftArm:{down:80,swing:24,bend:8},rightArm:{down:80,swing:-24,bend:12},leftLeg:{pitch:-25,knee:0,spread:3},rightLeg:{pitch:25,knee:12,spread:3}}},
 {name:'walk-contact-b',options:{leftArm:{down:80,swing:-24,bend:12},rightArm:{down:80,swing:24,bend:8},leftLeg:{pitch:25,knee:12,spread:3},rightLeg:{pitch:-25,knee:0,spread:3}}},
 {name:'punch',options:{leftArm:{down:82,swing:-90,bend:0,curl:80},rightArm:{down:75,swing:-25,bend:70},leftLeg:{pitch:-8,knee:0,spread:8},rightLeg:{pitch:10,knee:4,spread:8},headPitch:4,lean:5}}
];
