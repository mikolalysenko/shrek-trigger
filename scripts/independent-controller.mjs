import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';

// Several core runs can share one candidate path (both cores of one check, or
// two sections started together). Write through a private temporary file and
// rename it into place so no emulator opens a partially written ROM, and leave
// an identical file untouched.
export async function writeCandidate(file,bytes){
 const data=Buffer.from(bytes);
 try{if(Buffer.compare(await readFile(file),data)===0)return file;}catch{}
 const temp=`${file}.${process.pid}.tmp`;await writeFile(temp,data);await rename(temp,file);return file;
}

// Development-only streaming protocol for unmodified libretro cores. The
// controller handed to route drivers deliberately has no write capability.
export async function withIndependentController({host,core,rom,out},check){
 await mkdir(out,{recursive:true});
 const child=spawn(host,['--core',core,'--rom',rom,'--out',out,'--stdin','--sram','zero','--quiet'],{stdio:['pipe','pipe','pipe']});
 let pending,stderr='',closed=false;
 const finished=new Promise((resolve,reject)=>{
  child.on('error',reject);child.on('close',code=>{closed=true;if(pending)pending.reject(Error('Emulator closed: '+stderr));code===0?resolve():reject(Error('Emulator exited '+code+': '+stderr));});
 });
 finished.catch(()=>{});child.stderr.on('data',b=>stderr=(stderr+b).slice(-4000));
 const lines=createInterface({input:child.stdout});lines.on('line',line=>{
  if(!pending)return;const p=pending;pending=null;
  try{const r=JSON.parse(line);r.ok?p.resolve(r):p.reject(Error(JSON.stringify(r)));}catch(e){p.reject(e);}
 });
 const request=step=>new Promise((resolve,reject)=>{
  if(closed)return reject(Error('Emulator is closed'));if(pending)return reject(Error('Emulator commands must be sequential'));
  pending={resolve,reject};child.stdin.write(JSON.stringify(step)+'\n');
 });
 const buttons=input=>[[1,'b'],[2,'y'],[4,'select'],[8,'start'],[16,'up'],[32,'down'],[64,'left'],[128,'right'],[256,'a'],[512,'x'],[1024,'l'],[2048,'r']].filter(([bit])=>input&bit).map(([,name])=>name).join(' ');
 const read=async(addr,size=1)=>(await request({op:'read',mem:'wram',addr,size})).value;
 const bytes=async(addr,len)=>(await request({op:'read',mem:'wram',addr,len})).value;
 const controller={read,bytes,wait:frames=>request({op:'wait',frames}),hold:(input,frames)=>request({op:'hold',buttons:buttons(input),frames}),tap:(input=256,gap=90)=>request({op:'tap',buttons:buttons(input),frames:3,gap}),shot:name=>request({op:'shot',name})};
 const write=(addr,bytes)=>request({op:'write',mem:'wram',addr,bytes:Array.from(bytes)});
 try{
  const result=await check({request,write,controller});const end=await request({op:'quit'});await finished;return{...result,frames:end.frame};
 }finally{lines.close();if(!closed){child.stdin.end();await finished;}}
}
