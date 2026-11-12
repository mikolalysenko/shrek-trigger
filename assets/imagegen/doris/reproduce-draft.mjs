// Rebuild only inactive preview data from the saved, approved source PNGs.
import {spawnSync} from'node:child_process';import path from'node:path';import assert from'node:assert/strict';
const root=path.resolve(import.meta.dirname,'../../..');
for(const child of['body','doris-mantle','doris-halo']){const r=spawnSync(process.execPath,['scripts/import-raster-art.mjs','--preview-spec',`assets/imagegen/doris/${child}/import-spec.draft.json`],{cwd:root,stdio:'inherit'});assert.equal(r.status,0);}
for(const file of['compile-draft.mjs','review-motion.mjs']){const r=spawnSync(process.execPath,[`assets/imagegen/doris/${file}`],{cwd:root,stdio:'inherit'});assert.equal(r.status,0);}
