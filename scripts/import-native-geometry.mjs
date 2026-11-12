import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),geometry={};
const json=async path=>JSON.parse(await readFile(new URL(path,root)));
for(const key of['kilnback','crumb-hunters','furnace-maw']){
 const source=await json(`assets/imagegen/${key}/draft/family.json`),group=source.groups[0];
 geometry[key]=Object.fromEntries(['width','height','frames','anchor','frameOffsets','cellOrigins','frameCellOrigins','cellOverlapFrames'].filter(k=>group[k]!==undefined).map(k=>[k,group[k]]));
}
for(const key of['court-beast','bone-guards','future-ushers']){
 const source=await json(`assets/imagegen/${key}/native-frame-map.draft.json`);
 geometry[key]={width:source.width,height:source.height,frames:source.nativeFrames,anchor:source.groupAnchor??source.anchor,frameOffsets:source.frameOffsets,frameCellOrigins:source.frames.map(f=>f.cellOrigins)};
 if(key==='court-beast')geometry[key].roles=source.frames.map(f=>({facing:f.facing,label:f.role}));
}
for(const [key,file]of[
 ['supply-keeper','supply-keeper/draft/family.json'],
 ['crumb-child','bakery-children-elder/child-draft/family.json'],
 ['brioche-elder','bakery-children-elder/elder-draft/family.json'],
 ['bread-drummer','bakery-feast/drummer-draft/family.json'],
 ['bun-percussionist','bakery-feast/percussionist-draft/family.json'],
 ['onion-bread-plate','bakery-feast/platter-draft/family.json'],
 ['warden-legs','bone-warden/legs-draft-area/family.json'],
 ['warden','bone-warden/upper-draft-area/family.json'],
 ['native-guard','native-guards/draft/family.json'],
 ['sewer-troll','sir-sludge/family.draft.json'],
 ['palace-hexer','palace-hexer/family.draft.json'],
 ['duloc-court-soldier','duloc-executioner/draft/family.json'],
 ['duloc-town-keeper','town-civilians-gfx11/full-nearest/family.json'],
 ['duloc-town-resident','town-civilians-gfx125/full-area/family.json'],
 ['woodland-sprites','woodland-sprites/native-family-proposal.draft.json'],
 ['town-tradesmen','town-tradesmen/family.draft.json'],
 ['hench-hobgoblins','hench-hobgoblins/native-family-proposal.draft.json'],
 ['duloc-household-resident','town-household-gfx12/full-area/family.json'],
 ['townswomen-gfx36','townswomen-gfx36/family.draft.json'],
 ['woodland-bats','woodland-bats/native-family-proposal.draft.json'],
 ['fortress-jugglers','fortress-jugglers/native-family-proposal.draft.json']
]){
 const group=(await json('assets/imagegen/'+file)).groups[0];
 geometry[key]=Object.fromEntries(['width','height','frames','anchor','frameOffsets','cellOrigins','frameCellOrigins','cellOverlapFrames'].filter(k=>group[k]!==undefined).map(k=>[k,group[k]]));
}
for(const [key,file]of[
 ['future-mites','future-mites-bells/mite/native-frame-map.draft.json'],
 ['future-bells','future-mites-bells/bell/native-frame-map.draft.json'],
 ['sewer-pods','future-sewer-creatures/pods/native-frame-map.draft.json'],
 ['lantern-bats','future-sewer-creatures/bats/native-frame-map.draft.json'],
 ['mire-golems','mire-golems/golem/native-frame-map.draft.json'],
 ['drain-imps','drain-imps/imp/native-frame-map.draft.json'],
 ['scavenger-rats','scavenger-rats/rat/native-frame-map.draft.json'],
 ['workshop-residues','workshop-residues/residue/native-frame-map.draft.json'],
 ['frog-guards','frog-guards/native-frame-map.draft.json']
]){
 const source=await json('assets/imagegen/'+file);
 geometry[key]={width:source.width,height:source.height,frames:source.nativeFrames,anchor:source.groupAnchor??source.anchor,frameOffsets:source.frameOffsets,frameCellOrigins:source.frames.map(f=>f.cellOrigins)};
}
const rivet=(await json('assets/imagegen/rivet/integration-proposal.json')).field.actor;
geometry.rivet=Object.fromEntries(['width','height','frames','anchor','frameCellOrigins'].map(k=>[k,rivet[k]]));
for(const family of(await json('assets/imagegen/cosmic-muffin-spawn/integration-proposal.json')).families){
 const group=family.groups[0];
 geometry[family.key]=Object.fromEntries(['width','height','frames','anchor','frameCellOrigins'].map(k=>[k,group[k]]));
}
for(const family of await json('assets/imagegen/enchanted-pots-beetles/family.draft.json'))for(const group of family.groups){
 geometry[group.art]=Object.fromEntries(['width','height','frames','anchor','frameOffsets','cellOrigins','frameCellOrigins','cellOverlapFrames'].filter(k=>group[k]!==undefined).map(k=>[k,group[k]]));
}
for(const group of(await json('assets/imagegen/rootlings-briars/native-family-proposal.draft.json')).groups){
 geometry[group.art]=Object.fromEntries(['width','height','frames','anchor','frameOffsets','cellOrigins','frameCellOrigins','cellOverlapFrames'].filter(k=>group[k]!==undefined).map(k=>[k,group[k]]));
}
for(const family of await json('assets/imagegen/rumpelstiltskin-wishworks/family.draft.json'))for(const group of family.groups){
 geometry[group.art]=Object.fromEntries(['width','height','frames','anchor','frameOffsets','cellOrigins','frameCellOrigins','cellOverlapFrames'].filter(k=>group[k]!==undefined).map(k=>[k,group[k]]));
}
for(const part of ['face','hands']){
 const group=(await json('assets/imagegen/godmother-giant/'+part+'/native-frame-map.draft.json')).group;
 geometry[group.art]=Object.fromEntries(['width','height','frames','anchor','frameOffsets','cellOrigins','frameCellOrigins','cellOverlapFrames'].filter(k=>group[k]!==undefined).map(k=>[k,group[k]]));
}
const arms=await json('assets/imagegen/cosmic-muffin-interior/arms-draft/audit.json');
geometry['cosmic-muffin-interior-arms']={width:128,height:128,frames:12,frameCellOrigins:arms.packing.map(p=>p.origins),cellOverlapFrames:arms.cellOverlapFrames,mirrorOffsets:arms.originalMirrorAdjustments.map(({dx,dy})=>[dx,dy])};
const reveal=await json('assets/raster/tyson-reveal/integration-proposal.json');
geometry['tyson-reveal']={width:reveal.canvas[0],height:reveal.canvas[1],frames:reveal.frames,anchor:[reveal.canvas[0]/2-reveal.origin[0],reveal.canvas[1]-reveal.origin[1]],frameCellOrigins:reveal.frameCellOrigins,cellOverlapFrames:reveal.cellOverlapFrames};
await writeFile(new URL('content/generated-actor-geometry.js',root),'// Generated from the accepted native cell/anchor manifests by scripts/import-native-geometry.mjs.\nexport const rasterActorGeometry='+JSON.stringify(geometry)+';\n');
console.log('Imported native geometry for '+Object.keys(geometry).join(', '));
