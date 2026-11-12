import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const dir=import.meta.dirname,root=path.resolve(dir,'../../..'),prefix=path.relative(root,dir),sha=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(path.join(dir,f)));
const local=[
  '.gitignore','README.md','extract.mjs','parse-events.py','analyze.mjs','analyze-automatic.mjs','probe-scenes.mjs','write-report.mjs','freeze.mjs','verify.mjs',
  'headers.json','events-original.json','events-current.json','static-candidates.json','automatic-splits.json','native-semantics.json','fair5-report.json','report.json',
  ...fs.readdirSync(path.join(dir,'native-verification')).filter(f=>f.endsWith('.json')).map(f=>'native-verification/'+f),
  ...['original','current'].flatMap(v=>[
    'native-verification/fair-pan-west-'+v+'-1600.png',
    'native-verification/fair-merchant24-'+v+'-450.png',
    'native-verification/fair-merchant25-'+v+'-450.png',
  ]),
].sort();
const dependencies=[
  'engine/rom.js','engine/compression.js','engine/expanded-rom.js','engine/native-sprites.js',
  'scripts/core.mjs','scripts/native-sprite-view.mjs','engine/automation.js','engine/hooks.js','engine/devtools.js','engine/save.js','content/hooks.json',
  'assets/imagegen/town-civilians-gfx125/native-proof-utils.mjs','assets/imagegen/town-civilians-gfx125/private-overlay.mjs',
  ...['cpu','pipu','dsp','spc','apu','cart','snes'].map(f=>'vendor/snes/'+f+'.js'),
  '.local/reference/jot-current/sourcefiles/eventcommand.py','.local/reference/jot-current/sourcefiles/byteops.py',
  '.local/reference/temporal-redux/sourcefiles/editorui/lookups.py','.local/reference/ct_disassembly/bank_C0.asm',
  'package.json','package-lock.json',
].sort();
const describe=(file,relative)=>{const bytes=fs.readFileSync(file);return{path:relative,bytes:bytes.length,sha256:sha(bytes)};};
const report=read('report.json'),fair=read('fair5-report.json');
const freeze={
  status:'Frozen read-only diagnosis and bounded native proof; no active writes or source sprite changes',
  inputs:report.inputs,
  result:{confirmedAdditionalVisibleRegressions:1,location:5,event:27,failedObject:16,failurePc:'C072B2',wrongVisiblePixels:342,intendedVisiblePixels:0,originalIntendedVisiblePixels:342,occludedSourcePixels:46,verifiedMerchantObjects:[16,24,25],nativeCases:report.allNativeCases.length,nativeTicks:report.allNativeCases.reduce((n,c)=>n+c.ticks,0),explicitPaletteCommands:76,decodedLocations:504,newIncompatibleExplicitPairsOutsideParade:0,activeWrites:0},
  limitations:['Pinned historical af338 and original USA only; root owns fixed candidate validation.','Diagnostic entry followed by unmodified native events and ordinary controller inputs; not a natural campaign traversal.','Detailed parade80 is excluded and separately owned.','Static automatic-pointer unions include hidden/mutually exclusive actors and are not additional defect claims.','Only source-frame matches bound to each actor’s VRAM tile slot count as displayed pixel evidence.'],
  files:local.map(f=>describe(path.join(dir,f),prefix+'/'+f)),
  dependencies:dependencies.map(f=>describe(path.join(root,f),f)),
  dependencyScope:'Recorded direct helpers, emulator core and external reference files. These remain owned by their existing project modules; hashes are informational unless verify.mjs --dependencies is requested. Full local project checkout and the declared PNGJS package are needed to rerun native checks.',
  outputsNotWhitelisted:'Private ROMs, decoded event packets, new-game emulator states, redundant staging PNGs and research dependencies remain local/existing; none is newly distributed by this packet.',
  compatibleVariant:fair.compatibleExistingVariant,
};
fs.writeFileSync(path.join(dir,'freeze.json'),JSON.stringify(freeze,null,2)+'\n');
const whitelist=[...local,'freeze.json','reproducibility-files.txt'].sort().map(f=>prefix+'/'+f);
fs.writeFileSync(path.join(dir,'reproducibility-files.txt'),whitelist.join('\n')+'\n');
console.log(JSON.stringify({files:whitelist.length,hashedFiles:local.length,bytes:freeze.files.reduce((n,f)=>n+f.bytes,0),freezeSha256:sha(fs.readFileSync(path.join(dir,'freeze.json'))),result:freeze.result}));
