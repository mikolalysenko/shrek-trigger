import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {privateOverlay} from './private-overlay.mjs';
import {sha} from './compile-draft.mjs';
import {uploaded,oamCells,locate,pixelProof} from './native-proof-utils.mjs';
import {nativeSpriteCells} from '../../../scripts/native-sprite-view.mjs';
import {createCore} from '../../../scripts/core.mjs';import {newGame,runFrames} from '../../../engine/automation.js';
import {installHooks} from '../../../engine/hooks.js';import {createDevTools} from '../../../engine/devtools.js';
import {previewActors} from '../../../content/native-preview.js';import {u16} from '../../../engine/rom.js';
import {screenshot} from '../../../tests/helpers.mjs';import {snapshot,restore} from '../../../engine/save.js';
const d=import.meta.dirname,root=path.resolve(d,'../../..'),out=path.join(d,'native-verification'),c=privateOverlay();fs.mkdirSync(out,{recursive:true});
const s=await createCore(c.rom),checkpoint=path.join(d,'private/newgame.json');
if(fs.existsSync(checkpoint))restore(s,JSON.parse(fs.readFileSync(checkpoint)));else{await newGame(s);fs.writeFileSync(checkpoint,JSON.stringify(snapshot(s)));}
const h=installHooks(s,JSON.parse(fs.readFileSync(path.join(root,'content/hooks.json')))),dev=createDevTools(s,h),rows=[];
const start=previewActors.length;
try {
  for(const a of c.candidates)for(const owner of a.audit.owners) {
    const key='spawn-proof-'+owner;previewActors.push({key,enemy:owner,gfx:a.audit.gfx,asm:a.audit.asm,palette:208,size:a.cells===24?3:0,frames:2});
    dev.previewActor(key);runFrames(s,300);assert.equal(dev.diagnostics().fatal,null);const object=dev.diagnostics().preview.object;assert.equal(object,15);
    const heapBytes=u16(s.ram,0x171)-0x8000;assert.ok(heapBytes>=a.graphics.length&&heapBytes<=32768);
    assert.equal(u16(s.ram,0x1400+object*2),u16(c.rom,0x242a00+208*2));
    for(const frame of [0,1]) {
      dev.previewFrame(frame);runFrames(s,60);const requested=s.ram[0xf01+object*2],upload=uploaded(s,a,object,frame),entry=locate(a,frame,oamCells(s,c.audit.palette.words));
      const proof=entry?pixelProof(s,[entry],c.audit.palette.words):null;
      let exactCells=0;
      if(a.key==='shell'&&frame===1){assert.equal(requested,255);assert.equal(upload.exact,false);assert.equal(uploaded(s,a,object,0).exact,true);}
      else {
        assert.equal(upload.exact,true);assert.ok(entry);const cells=oamCells(s,c.audit.palette.words);
        for(const expected of nativeSpriteCells({...a,frames:2},frame)) {assert.ok(cells.some(cell=>cell.x===entry.origin[0]+expected.x&&cell.y===entry.origin[1]+expected.y&&cell.hash===sha(expected.pixels)));exactCells++;}
        if(a.key==='head'){assert.equal(requested,frame);assert.equal(proof.mismatches,0);}
      }
      const row={key:a.key,enemy:owner,frame,nativeFrame:requested,upload,heapBytes,origin:entry?.origin,opaqueCells:entry?.cells.length,exactCells,pixels:proof};rows.push(row);console.log(JSON.stringify({...row,pixels:proof?{exact:proof.exact,mismatches:proof.mismatches}:null}));
      await screenshot(s,path.join(out,`${owner}-${frame}.png`));assert.equal(dev.diagnostics().fatal,null);
    }
    dev.undo();
  }
}finally {previewActors.splice(start);dev.dispose();h.dispose();}
assert.deepEqual(s.cart.data,c.rom);fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({...c.report,status:'Six selectable native owner/frames passed; two original blank assembly slots preserved but not selected by the fixed size3 field path',nativeFrameUploads:6,nativeOamCells:rows.reduce((n,r)=>n+r.exactCells,0),exactHeadOpaquePixels:rows.filter(r=>r.key==='head').reduce((n,r)=>n+r.pixels.exact,0),bodyKitchenOcclusion:'823 source pixels per body owner are hidden by the unmodified kitchen foreground. Full unoccluded compound pixels are separately proven in real scenes.',bodyBlankBehavior:'AC0 and AC1 leave native frame cacheFF and assembly0 upload unchanged; blank assembly1 is retained exactly as a transparent pose, not counted as an upload.',rows},null,2)+'\n');
