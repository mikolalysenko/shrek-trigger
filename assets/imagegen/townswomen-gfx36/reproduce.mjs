import {execFileSync} from 'node:child_process';
const dir='assets/imagegen/townswomen-gfx36';
for(const script of['prepare-import.mjs','prepare-geometry.mjs','compile-draft.mjs','verify-source-details.mjs','verify-frozen.mjs'])execFileSync(process.execPath,[dir+'/'+script],{stdio:'inherit'});
