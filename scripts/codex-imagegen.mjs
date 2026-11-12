import {readFile,writeFile,readdir,stat,copyFile,mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import path from 'node:path';

// Runs Codex's built-in image generation tool once for a saved prompt and
// reference images, copies the untouched PNG into the repository, and records
// the same provenance fields as the earlier generated sources. It never edits
// pixels; sampling into native frames is scripts/import-raster-art.mjs's job.
//
//   node scripts/codex-imagegen.mjs --prompt assets/imagegen/x/prompt-v1.txt \
//     --ref assets/imagegen/x/reference-current-v1.png --out assets/imagegen/x/source-v1.png
const run=promisify(execFile),root=path.resolve(import.meta.dirname,'..');
const args=process.argv.slice(2),take=name=>{const out=[];for(let i=0;i<args.length;i++)if(args[i]===name)out.push(args[++i]);return out;};
const [prompt]=take('--prompt'),[out]=take('--out'),refs=take('--ref');
if(!prompt||!out)throw Error('Usage: codex-imagegen.mjs --prompt file --out file.png [--ref file.png ...]');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const gallery=path.join(homedir(),'.codex','generated_images');
async function pngs(dir){
  const found=[];
  async function walk(d){let entries;try{entries=await readdir(d,{withFileTypes:true});}catch{return;}
    for(const e of entries){const p=path.join(d,e.name);if(e.isDirectory())await walk(p);else if(e.name.endsWith('.png'))found.push(p);}}
  await walk(dir);return new Set(found);
}
const promptText=await readFile(path.resolve(root,prompt),'utf8'),before=await pngs(gallery);
const instruction=[
 'Use your built-in image generation tool exactly once to create the image described below.',
 refs.length?'Use the attached image(s) as references, as the description says.':'',
 'Request a transparent background. Do not crop, edit, upscale or post-process the result, and do not write or modify any files yourself.',
 'When the image is generated, reply with only its absolute file path.',
 '','Image description:','',promptText
].filter((l,i)=>l!==''||i>2).join('\n');
const lastMessage=path.join(root,'.local','imagegen-last-message.txt');await mkdir(path.dirname(lastMessage),{recursive:true});
const codexArgs=['exec','--skip-git-repo-check','-s','read-only','-o',lastMessage,...refs.flatMap(r=>['-i',path.resolve(root,r)]),instruction];
let log='';
try{const r=await run('codex',codexArgs,{cwd:root,maxBuffer:1<<26,timeout:15*60*1000});log=r.stdout+r.stderr;}
catch(error){log=(error.stdout??'')+(error.stderr??'');
  const reason=/usage limit/i.test(log)?'usage-limit':/moderation|safety system|rejected/i.test(log)?'moderation-blocked':'codex-failed';
  await writeFile(path.resolve(root,out.replace(/\.png$/,'')+'-attempt.json'),JSON.stringify({status:'no usable output',reason,prompt:{file:prompt,sha256:sha(promptText)},referenceImages:refs,log:log.split('\n').filter(l=>/error|limit|moderation|rejected|safety/i.test(l)).slice(-6)},null,2)+'\n');
  throw Error(`Codex image generation failed (${reason}); see ${out.replace(/\.png$/,'')}-attempt.json`);
}
const after=[...await pngs(gallery)].filter(p=>!before.has(p));
if(after.length!==1)throw Error(`Expected exactly one new generated image, found ${after.length}`);
const [output]=after,bytes=await readFile(output);
await mkdir(path.dirname(path.resolve(root,out)),{recursive:true});await copyFile(output,path.resolve(root,out));
const provenance={
  tool:'built-in image_gen.imagegen',sourceType:'image-generation',outputPath:output,savedFile:out,sha256:sha(bytes),
  prompt:{file:prompt,sha256:sha(promptText)},
  referenceImages:await Promise.all(refs.map(async r=>({file:r,sha256:sha(await readFile(path.resolve(root,r)))}))),
  transparentBackground:true,generatedAt:(await stat(output)).mtime.toISOString(),
  postGenerationEditing:'None. Source PNG copied unchanged; native extraction and palette indexing are recorded by the importer.'
};
const record=path.resolve(root,out.replace(/source-([^/]+)\.png$/,'provenance-$1.json'));
await writeFile(record,JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify({out,sha256:provenance.sha256,provenance:path.relative(root,record)}));
