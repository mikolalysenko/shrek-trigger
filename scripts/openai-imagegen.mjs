import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import path from 'node:path';

// Generates one source sheet with the OpenAI Images API, saves the returned
// PNG unchanged and records provenance beside it. With reference images it
// uses the edits endpoint so the current sprite guides poses and scale. The
// key is read from ~/.config/openai/api_key (or OPENAI_API_KEY) and is never
// printed or stored. Sampling into native frames is import-raster-art's job.
//
//   node scripts/openai-imagegen.mjs --prompt assets/imagegen/x/prompt-v1.txt \
//     --ref assets/imagegen/x/reference-current-v1.png --out assets/imagegen/x/source-v1.png \
//     [--size 1536x1024] [--model gpt-image-2.6-sunburst] [--quality high]
//
// Newer models have no transparent output, so prompts ask for a flat key-color
// background; the importer masks it out (sheet.backgroundMask) and records it.
const root=path.resolve(import.meta.dirname,'..');
const args=process.argv.slice(2),take=name=>{const out=[];for(let i=0;i<args.length;i++)if(args[i]===name)out.push(args[++i]);return out;};
const [prompt]=take('--prompt'),[out]=take('--out'),refs=take('--ref');
const model=take('--model')[0]??'gpt-image-2.6-sunburst',size=take('--size')[0]??'1536x1024',quality=take('--quality')[0]??'high';
if(!prompt||!out)throw Error('Usage: openai-imagegen.mjs --prompt file --out file.png [--ref file.png ...] [--size WxH] [--model id] [--quality high]');
const key=(process.env.OPENAI_API_KEY??(await readFile(path.join(homedir(),'.config','openai','api_key'),'utf8'))).trim();
if(!key)throw Error('No OpenAI API key');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const promptText=(await readFile(path.resolve(root,prompt),'utf8')).trim();
const parameters={model,size,quality,output_format:'png',n:1};
let response,endpoint;
if(refs.length){
  endpoint='https://api.openai.com/v1/images/edits';
  const form=new FormData();
  for(const[k,v]of Object.entries(parameters))form.append(k,String(v));
  form.append('prompt',promptText);
  for(const r of refs)form.append('image[]',new Blob([await readFile(path.resolve(root,r))],{type:'image/png'}),path.basename(r));
  response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+key},body:form});
}else{
  endpoint='https://api.openai.com/v1/images/generations';
  response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({...parameters,prompt:promptText})});
}
const requestId=response.headers.get('x-request-id'),body=await response.json();
const base=path.resolve(root,out.replace(/\.png$/,''));
if(!response.ok||!body.data?.[0]?.b64_json){
  const error=body.error??{};
  await writeFile(base+'-attempt.json',JSON.stringify({status:'no usable output',httpStatus:response.status,errorCode:error.code??null,errorType:error.type??null,message:error.message??null,requestId,endpoint,parameters,prompt:{file:prompt,sha256:sha(promptText)},referenceImages:refs},null,2)+'\n');
  throw Error(`OpenAI image generation failed: HTTP ${response.status} ${error.code??''} ${error.message??''}`.trim());
}
const bytes=Buffer.from(body.data[0].b64_json,'base64');
await mkdir(path.dirname(path.resolve(root,out)),{recursive:true});await writeFile(path.resolve(root,out),bytes);
const provenance={
  tool:'OpenAI Images API',sourceType:'image-generation',endpoint,model,parameters,requestId,
  savedFile:out,sha256:sha(bytes),created:body.created?new Date(body.created*1000).toISOString():null,
  prompt:{file:prompt,sha256:sha(promptText)},
  referenceImages:await Promise.all(refs.map(async r=>({file:r,sha256:sha(await readFile(path.resolve(root,r)))}))),
  revisedPrompt:body.data[0].revised_prompt??null,usage:body.usage??null,transparentBackground:false,
  postGenerationEditing:'None. Source PNG saved unchanged from the API response; background masking, native extraction and palette indexing are recorded by the importer.'
};
const record=path.resolve(root,out.replace(/source-([^/]+)\.png$/,'provenance-$1.json'));
await writeFile(record,JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify({out,sha256:provenance.sha256,requestId,provenance:path.relative(root,record)}));
