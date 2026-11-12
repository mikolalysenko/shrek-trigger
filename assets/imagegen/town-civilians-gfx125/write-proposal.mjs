import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';
import {chromium} from '@playwright/test';

const dir = import.meta.dirname;
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name)));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');
const audit = read('native-audit.json');
const events = read('current-event-audit.json');
const labels = [
  'Rear idle', 'Front idle', 'Left idle / gait neutral', 'Right idle / gait neutral',
  'Rear gait A', 'Rear raised-step A', 'Rear gait B', 'Rear raised-step B',
  'Front gait A', 'Front raised-step A', 'Front gait B', 'Front raised-step B',
  'Left contact A', 'Left contact B', 'Right contact A · mirror 12', 'Right contact B · mirror 13',
  'Front startled · raised arms and sweat', 'Seated facing left', 'Seated facing right · mirror 17',
  'Kneeling / head lowered · no observed consumer'
];
const roles = {
  status: 'Original source pixels and native command audit; no replacement art generated',
  frames: audit.nativeGeometry.map((f, i) => ({...f, label: labels[i]})),
  timing: {
    idle: '0/1/2/3 for the four facings, 5 ticks',
    rear: '4 → 5 → 6 → 7, 15 ticks each',
    front: '8 → 9 → 10 → 11, 15 ticks each',
    left: '2 → 12 → 2 → 13, 15 ticks each',
    right: '3 → 14 → 3 → 15, 15 ticks each',
    mode2: 'Empty original list; preserve it',
    startled: 'Mode 3 selects 16 in every direction, 15 ticks',
    seated: 'Mode 4 selects 17 for rear/left and 18 for front/right, 15 ticks',
    kneeling: 'Frame 19 exists in the exclusive 800-byte assembly packet but is not in AA7 or any parsed target-object AC call'
  },
  consumerLimits: [
    'The same shared AA7 addresses different semantic poses in different families: gfx125 has no blank or cap-fragment slot. Do not import the gfx11 role names.',
    'All twenty images are nonblank and distinct. Only 2/3, 12/14, 13/15 and 17/18 are exact normalized mirrors. Rear/front gait phases retain asymmetric original hair and clothing pixels.',
    'No kneeling frame19 consumer was found in the 23 decoded target locations. Preserve the complete source slot and label execution coverage separately.',
    'Eight unrelated original event packets fail decompression; this is not a claim to have decoded all 512 successfully.',
    'Opcode AD is a pause. B3/B4 are shorthand AA0/AA1 according to the reference decoder; do not treat B4 as seated mode4.'
  ]
};
write('native-role-notes.json', roles);

const descriptions = {
  5: ['Fair race attendant and two festival bystanders', [10, 12, 13, 14, 15, 16, 18, 24, 3], 'Three NPC79 loads; race choices and princess-recognition dialogue.'],
  12: ['Inn patrons', [75, 76, 77, 79, 80, 81, 82], 'Two NPC14 patrons discuss the fair, earthquakes and the Chancellor.'],
  13: ['Civic tutorial demonstrator', [89, 90], 'Save-point explanation in the mayor building.'],
  14: ['Civic tutorial demonstrator', [115], 'Battle escape and equipment-stat explanation.'],
  16: ['Household resident', [35, 36, 37], 'Festival and parade gossip. Current source still contains unadapted original pronouns.'],
  18: ['Ticket-office visitor', [72], 'Discusses the nearby whirlpool.'],
  24: ['Castle kitchen civilian', [70, 121, 151], 'Existing rewritten kitchen hospitality/chef dialogue; does not justify permanent chef equipment.'],
  27: ['Off-map trial controller', [], 'NPC79 object16 starts at tile[0,0] and directs dialogue for several speakers. Do not cast this model as Charming, Pierre or the Judge merely because their string calls are in its script.'],
  32: ['Bridge travelers', [47], 'Two NPC14 loads, both heading to the Duloc fair.'],
  52: ['Family house sitter', [40], 'Looks after the house while grandparents visit the anniversary fair.'],
  53: ['Tavern lore patron', [44, 45], 'Describes the forest restoration branch; original Fiona/metal-creature wording is outside this art task.'],
  62: ['Traveling merchant', [56], 'Visiting from Porre and asking for sales.'],
  80: ['Seated parade spectator', [56], 'NPC79 explicitly uses AA4 plus original opcode33 argument7; preserve and check actual CGRAM during future native proof.'],
  91: ['People-of-the-Times ending double', [], 'Source scene loads NPC14 and holds frame2. No dialogue attribution is invented.'],
  158: ['Marco, returning husband and forest-restoration participant', [106, 107, 108, 109, 110], 'Named adult reuse is the strongest reason to keep an ordinary human rather than a mascot, child or occupation-specific costume.'],
  188: ['Cafe patron', [58, 61], 'Discusses the Northern Ruins and grave.'],
  204: ['Forest ending / Frog King scene double', [], 'NPC79 holds native frame5 in the existing choreography. No combat role is assigned to this non-enemy header.'],
  338: ['Dream Project developer cameo', [39], 'Existing Yoshinori Ogura cameo; art does not rename the speaker.'],
  340: ['Dream Project developer cameo', [53], 'Existing Akihiko Matsui cameo.'],
  378: ['Two Dream Project developer cameos', [8, 9], 'Existing Kazuo Suzuki and Shun Moriya cameos.'],
  379: ['Dream Project developer cameo with startled action', [35], 'Existing Hiroki Chiba cameo; script requests AA3 then B4.'],
  438: ['Merchant accomplice in the royal trial', [76], 'NPC14 object11 starts drawing-off and later has the merchant/chancellor exchange; preserve reveal staging.'],
  439: ['Fair attendants and bystanders', [3, 56, 59], 'Three NPC79 loads; princess recognition, Donkey sparring directions and setup chatter.']
};
const contexts = audit.scenes.map(scene => ({
  location: scene.location, name: scene.name, objects: scene.objects,
  loads: scene.loads, role: descriptions[scene.location][0],
  messageIds: descriptions[scene.location][1], notes: descriptions[scene.location][2],
  paletteCommands: events.scenes.find(s => s.location === scene.location).actorCommands
    .filter(c => c.opcode === 0x33).map(c => ({offset: c.offset, args: c.args, owners: c.owners})),
  sourceEventSha256: scene.eventSha256
}));
write('scene-contexts.json', {
  status: 'Parsed current source contexts; bounded native execution not yet performed',
  sourceDialogue: 'dialogue-context-audit.json',
  warning: 'A loaded object can be a hidden event controller. Calls in its functions do not by themselves identify the visible speaker.',
  locations: contexts
});

const proposal = {
  status: 'Inactive design and resource proposal, waiting for root review before image generation',
  baselineSha256: audit.baselineSha256,
  workingKey: 'duloc-town-resident',
  identity: 'Versatile adult human resident and traveler of the Shrek fairy-tale towns',
  rationale: 'Shared reuse includes fair patrons and attendants, tutors, domestic residents, a kitchen civilian, a traveling merchant, Marco, a merchant accomplice and ending cameos. Preserve these existing roles through a neutral adult human model; add no named celebrity or fixed trade prop.',
  look: {
    face: 'Clean-shaven adult with a broad small nose, dark brows, swept copper-brown hair and a clear side hair tuft. A useful contrast with the capped moustached keeper and headband tradesman.',
    clothes: 'Short laced blue-violet doublet with a split waist over a pale rolled-sleeve linen shirt, narrow belt, russet trousers and practical broad boots. Palette133 turns the doublet blue and lower cloth moss-green. No hat, armor, apron, weapon, permanent cup or messenger bag.',
    silhouette: 'Original 31–32 px standing height, modestly broad shoulders, visible sleeve cuffs and split tunic hem; expressive mobile arms and legs. Seated poses retain their displaced legs, and kneeling remains a separate full-body source.',
    rendering: 'Chrono Trigger scale and clustered top-left shading; twelve native opaque indices and transparent zero. Actual generated raster after design approval, not a recolored original costume or geometric anatomy.'
  },
  resourcePlan: {
    gfx: 125, assembly: 188, owners: audit.owners, sizeByte: 0, cells: 4,
    frameCount: 20, originalRawBytes: 2656, originalCompressedBytes: 2204,
    originalAssemblyBytes: 800,
    pointerAliases: {gfx: [125], assembly: [188]},
    newSpriteOrAssemblyIds: [], headerIdEdits: [],
    plan: 'Replace only the exclusively owned gfx125 and asm188 resources; use all20 slots. No new assembly ID is needed or reserved. Private247 remains assigned to gfx11.',
    sharedPreserved: {paletteIds: [135, 133], animationId: 7, paletteWrites: 0, timingWrites: 0},
    constraints: [
      'Keep the original four-cell reservation and source anchors; retain exact original signed XY where complete new source fits. Any required source-only translation or row placement must be measured and reviewed before activation.',
      'Frame19 has a staggered four-cell layout, distinct from the ordinary grid. Do not silently crop its kneeling hands or knees.',
      'Measure actual sampled raw/compressed sizes. The existing 2656-byte decoded guard remains in force until root chooses an explicit family stream contract or proves a safe legacy bank.',
      'Current static all-branch unstreamed actor-bank union peaks at20032 bytes in204. This excludes unsupported dynamic/background allocations and is not a simultaneous-heap or future-expanded-cast proof.',
      'Preserve original shared palettes135 and133 byte-for-byte, including their unrelated NPC21/51 and43-owner consumers.',
      'Preserve AA7 and its 29header consumers. No animation-list edits are needed.'
    ]
  },
  contextCounts: {
    locations: contexts.length, sourceLoads: audit.scenes.reduce((n, s) => n + s.loadCount, 0),
    owners: audit.owners.map(o => ({id: o.id, palette: o.header[2],
      locations: audit.scenes.filter(s => s.loads.some(l => l.id === o.id)).map(s => s.location),
      loads: audit.scenes.reduce((n, s) => n + s.loads.filter(l => l.id === o.id).length, 0)}))
  },
  expectedSourceCoverage: {
    visibleSlots: 20, blankSlots: [],
    special: [16, 17, 18, 19],
    observedNativeProgramSlots: Array.from({length: 19}, (_, i) => i),
    unreferencedSourceSlots: [19],
    exactSourceMirrors: audit.exactNormalizedMirrors
  },
  futureAcceptance: [
    'Review every direction and actual opposed gait contact in both original palettes at1×.',
    'Reconstruct every opaque indexed pixel through the native4bpp cells with explicit overlap/blank checks.',
    'Verify40owner/pose uploads, AA7 requests/durations and unrelated shared-resource sentinels.',
    'Use representative fair/inn, Marco/restoration, merchant/trial and seated parade contexts. Treat scene80 opcode33 argument7 as a real runtime palette case.',
    'Preserve frame19 in the static/upload proof even if no original story consumer is found.'
  ],
  limitations: ['No image generation, new pixels, active patch, ROM build, runtime execution or new slot claim has occurred.'],
  evidence: ['native-audit.json', 'native-role-notes.json', 'current-event-audit.json', 'dialogue-context-audit.json', 'scene-contexts.json', 'review/original-role-sheet.html'],
  activation: false
};
write('design-proposal.json', proposal);
write('scene-resource-audit.json', {
  baselineSha256: audit.baselineSha256,
  limits: 'Static union of all load branches; not measured simultaneous WRAM residency. Dynamic and background allocation are not inferred.',
  scenes: audit.scenes.map(s => ({location: s.location, name: s.name, banks: s.banks, unstreamedActorUnion: s.unstreamedActorUnion}))
});

const style = 'body{font:14px system-ui;background:#34464b;color:#f2efdf;width:1100px;margin:20px}img{image-rendering:pixelated}.grid{display:grid;grid-template-columns:repeat(5,210px);gap:9px}.cell{background:#44575c;padding:5px;text-align:center}.cell b{display:block;min-height:38px}h2{margin-top:28px}';
let html = '<!doctype html><meta charset="utf-8"><style>' + style + '</style><h1>Town resident · original20 native slots</h1><p>Pinned af3383746691. NPC14 uses palette135; NPC79 uses133. Exclusive gfx125/asm188; shared AA7 and both palettes remain exact. All20 slots are visible. Frame19 is source-preserved but has no located AA/event consumer. This is read-only source review.</p>';
for (const pal of audit.palettes) {
  const atlas = PNG.sync.read(fs.readFileSync(path.join(dir, 'review/original-palette' + pal.id + '-1x.png')));
  html += '<h2>Palette ' + pal.id + '</h2><div class="grid">';
  for (let f = 0; f < 20; f++) {
    const p = new PNG({width: 64, height: 64});
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const from = (((f / 5 | 0) * 64 + y) * atlas.width + (f % 5) * 64 + x) * 4;
      p.data.set(atlas.data.subarray(from, from + 4), (y * 64 + x) * 4);
    }
    const data = 'data:image/png;base64,' + PNG.sync.write(p).toString('base64');
    html += '<div class="cell"><b>' + f + ' · ' + labels[f] + '</b><img width="192" height="192" src="' + data + '"><br><img width="64" height="64" src="' + data + '"><p>' + JSON.stringify(audit.nativeGeometry[f].bounds) + '</p></div>';
  }
  html += '</div>';
}
fs.writeFileSync(path.join(dir, 'review/original-role-sheet.html'), html);
const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width: 1160, height: 900}, deviceScaleFactor: 1});
  await page.goto(new URL('./review/original-role-sheet.html', import.meta.url).href);
  await page.screenshot({path: path.join(dir, 'review/original-role-sheet.png'), fullPage: true});
} finally { await browser.close(); }
console.log(JSON.stringify({proposal: 'design-proposal.json', owners: [14, 79], frames: 20, contexts: contexts.length, newIds: [], generationStarted: false}));
