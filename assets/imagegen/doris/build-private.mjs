// In-memory source substitution for a private full native cartridge build.
// Does not alter the active renderer, raster catalogue, canonical ROM or dist.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'../../..'),target=pathToFileURL(path.join(root,'engine/doris.js')).href;
let substitutions=0;
const hook=registerHooks({load(url,context,nextLoad){
 const result=nextLoad(url,context);
 if(url!==target)return result;
 const source=Buffer.from(result.source).toString('utf8'),start=source.indexOf('const P='),end=source.indexOf('export function patchDoris');
 assert.ok(start>0&&end>start,'Doris source boundaries changed');substitutions++;
 return {...result,source:source.slice(0,start)+`import {draftDorisMaps,renderDorisDraft} from '../assets/imagegen/doris/compile-draft.mjs';\nexport const dorisFrameMap=tier=>draftDorisMaps[tier].map(role=>({...role}));\nexport const dorisSprite=(tier,role)=>renderDorisDraft(tier,role);\n\n`+source.slice(end)};
}});
const {buildPatch}=await import('../../../engine/patch.js');
const {validateRom}=await import('../../../engine/rom.js');
const base=await validateRom(fs.readFileSync(path.join(root,'.local/chrono-trigger-usa.sfc')));
const techs=JSON.parse(fs.readFileSync(path.join(root,'content/techs.json'))),layouts=JSON.parse(fs.readFileSync(path.join(root,'content/event-layouts.json')));
const built=buildPatch(base,{techs,layouts,cartridge:'exhirom'});assert.equal(substitutions,1);hook.deregister();
const output=path.join(root,'.local/qa/doris-generated');fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'shrek-trigger.sfc'),built.rom);fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(built.audit,null,2)+'\n');
const sha256=createHash('sha256').update(built.rom).digest('hex');
fs.writeFileSync(path.join(output,'build.json'),JSON.stringify({sha256,privateRendererSubstitutions:substitutions,cartridgeBytes:built.rom.length,doris:built.audit.doris,sourceOverride:'Only dorisFrameMap/dorisSprite replaced in memory with frozen generated-source draft. patchDoris, headers, statistics, AI, event code, allocator and native rendering use the ordinary build path.',activeFilesWritten:false,canonicalRomWritten:false},null,2)+'\n');
console.log(JSON.stringify({sha256,cartridgeBytes:built.rom.length,dorisGraphicsBytes:built.audit.doris.graphicsBytes,output}));
