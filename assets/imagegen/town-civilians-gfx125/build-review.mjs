import fs from 'node:fs';
import path from 'node:path';
import {PNG} from 'pngjs';
import {chromium} from '@playwright/test';
import {nativeSpriteBank, nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';

const dir = import.meta.dirname;
const read = file => JSON.parse(fs.readFileSync(path.join(dir, file)));
const audit = read('native-audit.json');
const labels = read('native-role-notes.json').frames.map(f => f.label);
const method = process.argv[2] ?? 'area';
const frames = read(`full-${method}/native-frames.json`).map(s => Array.from(s, c => parseInt(c, 16)));
const rom = new Uint8Array(fs.readFileSync(path.join(dir, 'private/baseline-af3383746691.sfc')));
const oldBank = nativeSpriteBank(rom, {gfx: 125, asm: 188, palette: 135, size: 0, frames: 20});
const original = Array.from({length: 20}, (_, f) => {
  const pixels = new Uint8Array(4096);
  for (const c of nativeSpriteCells(oldBank, f)) for (let i = 0; i < 256; i++) if (c.pixels[i]) pixels[(52 + c.y + Math.floor(i / 16)) * 64 + 32 + c.x + i % 16] = c.pixels[i];
  return Array.from(pixels);
});
const image = (pixels, palette) => {
  const png = new PNG({width: 64, height: 64});
  pixels.forEach((k, i) => {if (k) {const c = parseInt(palette.colors[k - 1], 16); png.data.set([c >> 16, c >> 8 & 255, c & 255, 255], i * 4);}});
  return 'data:image/png;base64,' + PNG.sync.write(png).toString('base64');
};
const palettes = audit.palettes.map(p => ({...p, images: frames.map(f => image(f, p))}));
const head = `<!doctype html><meta charset="utf-8"><style>body{font:15px system-ui;background:#35454a;color:#f6efdd;margin:24px;max-width:1100px}p{line-height:1.45}img,canvas{image-rendering:pixelated}a{color:#cce5ff}.grid{display:grid;grid-template-columns:repeat(5,205px);gap:10px}.card{background:#46565b;text-align:center;padding:5px}.card b{display:block;min-height:35px;font-size:13px}.card img{display:block;margin:auto}.controls{display:flex;gap:10px}button,select{font:inherit;padding:6px}canvas{background:#46565b}.gait{display:flex;gap:14px;background:#46565b;margin:15px 0;padding:10px;text-align:center}.gait b{display:block}</style>`;
const intro = `<h1>Duloc Town Resident · inactive source candidate</h1><p>Actual generated anatomy for NPC14/79, gfx125 / exclusive assembly188. All20 native slots are visible, including startled16, seated17/18 and source-preserved kneeling19. Palettes135/133 and shared AA7 remain exact. Sampling: ${method}; source-only uniform sampling overrides and translations are recorded.</p><p>Native4-cell geometry retains159 of160 original coordinate bytes. Proposed frame19 lower-left Y−9→−14 closes the old cell gap without clipping or deleting source pixels; actor origin and opaque bottom remain unchanged. No extra native cells, palette edits or new assembly ID. Static source review only; native execution proof is separate.</p><p><a href="motion-review.html">Original timed motion</a> · <a href="role-review.html">Enlarged roles</a> · <a href="gait-contacts.html">Gait phases</a></p>`;
for (const [file, scale] of [['contact-sheet.html', 1], ['role-review.html', 3]]) {
  fs.writeFileSync(path.join(dir, 'review', file), head + intro + palettes.map(p => `<h2>Palette ${p.id}</h2><div class="grid">` + p.images.map((im, i) => `<div class="card"><b>${i} · ${labels[i]}</b><img width="${64 * scale}" height="${64 * scale}" src="${im}">${scale > 1 ? `<img width="64" height="64" src="${im}">` : ''}</div>`).join('') + '</div>').join(''));
}
const walks = audit.animationProgram.lists.filter(l => l.mode === 1 && l.steps.length);
fs.writeFileSync(path.join(dir, 'review/gait-contacts.html'), head + intro + '<h2>Actual native walk order · 15 ticks per phase</h2>' + walks.map(l => `<h3>${['Rear', 'Front', 'Left', 'Right'][l.facing]}</h3><div class="gait">` + l.steps.map(s => `<div><b>Frame ${s.frame} · ${s.ticks} ticks</b><img width="192" height="192" src="${palettes[0].images[s.frame]}"><img width="64" height="64" src="${palettes[0].images[s.frame]}"></div>`).join('') + '</div>').join(''));
const data = JSON.stringify({palettes: palettes.map(({id, colors}) => ({id, colors})), frames, original, labels, lists: audit.animationProgram.lists.filter(l => l.steps.length)}).replaceAll('<', '\\u003c');
const code = `const data=${data},$=id=>document.getElementById(id);let pal=data.palettes[0],list=data.lists[0],tick=0,play=true,last=0;data.palettes.forEach((p,i)=>$('palette').add(new Option('Palette '+p.id,i)));data.lists.forEach((l,i)=>$('list').add(new Option(['Rear','Front','Left','Right'][l.facing]+' / mode '+l.mode,i)));function draw(){let t=tick%list.steps.reduce((n,s)=>n+s.ticks,0),frame=list.steps[0].frame;for(const s of list.steps){frame=s.frame;if(t<s.ticks)break;t-=s.ticks;}for(const[id,frames]of[['old',data.original],['new',data.frames]]){const ctx=$(id).getContext('2d'),im=ctx.createImageData(64,64);frames[frame].forEach((k,i)=>{if(k){const c=parseInt(pal.colors[k-1],16);im.data.set([c>>16,c>>8&255,c&255,255],i*4);}});ctx.putImageData(im,0,0);$(id).style.width=64*+$('scale').value+'px';$(id).style.height=64*+$('scale').value+'px';}$('label').textContent='Frame '+frame+' · '+data.labels[frame]+' · tick '+tick;$('steps').textContent=list.steps.map(s=>s.frame+' × '+s.ticks).join(' → ')+' ticks';}function loop(now){if(!last)last=now;if(play){const delta=Math.floor((now-last)*60/1000);if(delta){tick+=delta;last+=delta*1000/60;draw();}}else last=now;requestAnimationFrame(loop);}$('palette').onchange=()=>{pal=data.palettes[+$('palette').value];draw();};$('list').onchange=()=>{list=data.lists[+$('list').value];tick=0;draw();};$('pause').onclick=()=>{play=!play;$('pause').textContent=play?'Pause':'Play';};$('step').onclick=()=>{play=false;$('pause').textContent='Play';tick++;draw();};$('scale').onchange=draw;draw();requestAnimationFrame(loop);window.reviewState=()=>({tick,label:$('label').textContent,palette:pal.id,mode:list.mode,facing:list.facing});`;
fs.writeFileSync(path.join(dir, 'review/motion-review.html'), head + intro + '<h2>Original pixels left · candidate right</h2><p>This offline visual player follows the unchanged original frame lists at 60 Hz. Native CPU/PPU execution is verified separately.</p><div class="controls"><select id="palette"></select><select id="list"></select><select id="scale"><option value="1">1× native</option><option value="2">2×</option><option value="4">4×</option></select><button id="pause">Pause</button><button id="step">One tick</button></div><h2 id="label"></h2><canvas id="old" width="64" height="64"></canvas> <canvas id="new" width="64" height="64"></canvas><p id="steps"></p><script>' + code + '</script>');
const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width: 1160, height: 900}, deviceScaleFactor: 1});
  const errors = [], checks = [];
  page.on('pageerror', e => errors.push(String(e)));
  for (const [file, output] of [['contact-sheet.html', 'contact-sheet-1x.png'], ['role-review.html', 'role-review.png'], ['gait-contacts.html', 'gait-contacts.png']]) {
    await page.goto(new URL('./review/' + file, import.meta.url).href);
    await page.screenshot({path: path.join(dir, 'review', output), fullPage: true});
  }
  await page.goto(new URL('./review/motion-review.html', import.meta.url).href);
  await page.locator('#pause').click();
  for (const p of ['0', '1']) for (const l of ['0', '1', '2', '3', '13']) {
    await page.locator('#palette').selectOption(p); await page.locator('#list').selectOption(l); await page.locator('#step').click();
    checks.push(await page.evaluate(() => window.reviewState()));
  }
  if (errors.length) throw Error(errors.join('\n'));
  fs.writeFileSync(path.join(dir, 'review/ui-check.json'), JSON.stringify({status: 'Offline review controls passed', method, checks, errors}, null, 2) + '\n');
} finally {await browser.close();}
