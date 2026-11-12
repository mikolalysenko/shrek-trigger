import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {readBps} from '../tests/bps-reader.mjs';
import {assertReleaseScope} from '../engine/release-scope.js';

const run=promisify(execFile),version='1.0.0',name=`shrek-trigger-${version}`,root=path.resolve('dist',name);
const {stdout:commit}=await run('git',['rev-parse','HEAD']);const sourceCommit=commit.trim();
const {stdout:status}=await run('git',['status','--porcelain','--','.',':!dist/shrek-trigger-0.1.0',':!dist/shrek-trigger-0.1.0.zip',':!art-review']);
if(status.trim())throw Error('Release packaging requires a committed source and acceptance tree:\n'+status);
const [base,rom,patch,acceptance]=await Promise.all([
 readFile('.local/chrono-trigger-usa.sfc'),readFile('.local/shrek-trigger.sfc'),readFile(`dist/${name}.bps`),readFile('docs/acceptance.md','utf8')
]);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),romSha=sha(rom),bpsSha=sha(patch),baseSha=sha(base);
if(baseSha!=='06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9')throw Error('Unexpected private base ROM');
const reconstructed=readBps(base,patch).target;if(!Buffer.from(reconstructed).equals(rom))throw Error('Independent BPS reconstruction does not match the candidate');
const buildCommit=acceptance.match(/Source commit: `([0-9a-f]{40})`/)?.[1];
if(!acceptance.includes(romSha)||!buildCommit)throw Error('docs/acceptance.md is not for this exact source/ROM candidate');
await run('git',['merge-base','--is-ancestor',buildCommit,sourceCommit]).catch(()=>{throw Error('Acceptance build commit is not an ancestor of the release source');});
assertReleaseScope(acceptance);
const files=new Map([
 [`${name}.bps`,patch],['README.md',await readFile('docs/player-guide.md')],['CREDITS.md',await readFile('docs/credits.md')],
 ['SPOILERS.md',await readFile('docs/spoiler-routes.md')],['CHANGELOG.md',await readFile('CHANGELOG.md')],
 ['acceptance.md',Buffer.from(acceptance)],['manifest.json',await readFile('dist/manifest.json')]
]);
const checksums=[`${baseSha}  base/Chrono-Trigger-USA.sfc (user-supplied; not included)`,`${romSha}  rebuilt/${name}.sfc (private; not included)`,`${bpsSha}  ${name}.bps`,`${sourceCommit}  source commit`].join('\n')+'\n';
files.set('CHECKSUMS.txt',Buffer.from(checksums));
await rm(root,{recursive:true,force:true});await mkdir(root,{recursive:true});
for(const[file,data]of files)await writeFile(path.join(root,file),data);

// Deterministic uncompressed ZIP: sorted names, fixed timestamp, no host paths,
// permissions, comments or platform metadata. BPS is already compact.
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=data=>{let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
const u16=n=>Uint8Array.of(n&255,n>>>8&255),u32=n=>Uint8Array.of(n&255,n>>>8&255,n>>>16&255,n>>>24&255);
const locals=[],centrals=[];let offset=0;const dosTime=0,dosDate=(2026-1980)<<9|11<<5|4;
for(const[file,data]of[...files.entries()].sort(([a],[b])=>a.localeCompare(b))){
 const nameBytes=new TextEncoder().encode(`${name}/${file}`),sum=crc(data),head=Buffer.concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(dosTime),u16(dosDate),u32(sum),u32(data.length),u32(data.length),u16(nameBytes.length),u16(0)]);
 locals.push(head,nameBytes,data);
 const central=Buffer.concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(dosTime),u16(dosDate),u32(sum),u32(data.length),u32(data.length),u16(nameBytes.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset)]);
 centrals.push(central,nameBytes);offset+=head.length+nameBytes.length+data.length;
}
const centralStart=offset,centralSize=centrals.reduce((n,b)=>n+b.length,0),end=Buffer.concat([u32(0x06054b50),u16(0),u16(0),u16(files.size),u16(files.size),u32(centralSize),u32(centralStart),u16(0)]),zip=Buffer.concat([...locals,...centrals,end]);
await writeFile(`dist/${name}.zip`,zip);
console.log(JSON.stringify({sourceCommit,romSha256:romSha,bpsSha256:bpsSha,files:files.size,zip:`dist/${name}.zip`,zipSha256:sha(zip)},null,2));
