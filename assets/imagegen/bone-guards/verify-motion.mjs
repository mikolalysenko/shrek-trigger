import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const dir='assets/imagegen/bone-guards',browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1420,height:1000},deviceScaleFactor:1}),errors=[],reports=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
  await page.goto('file://'+process.cwd()+'/'+dir+'/motion.html');await page.waitForTimeout(150);
  for(let palette=0;palette<4;palette++){
    await page.selectOption('#palette',String(palette));
    const expected=await page.evaluate(p=>{
      const hash=a=>{let h=2166136261;for(const n of a)h=Math.imul(h^n,16777619);return(h>>>0).toString(16);};
      const c=document.createElement('canvas');c.width=96;c.height=112;const g=c.getContext('2d');
      return loops.map(([,seq])=>[...new Set(seq.map(f=>{g.clearRect(0,0,96,112);g.drawImage(imgs[p][f],0,0);return hash(g.getImageData(0,0,96,112).data);} ))]);
    },palette),seen=Array.from({length:9},()=>new Set());
    let samples=0;
    while(samples++<100){
      await page.waitForTimeout(43);
      const hashes=await page.locator('canvas').evaluateAll(cs=>cs.map(c=>{let h=2166136261;for(const n of c.getContext('2d').getImageData(0,0,c.width,c.height).data)h=Math.imul(h^n,16777619);return(h>>>0).toString(16);}));
      hashes.forEach((h,i)=>{assert.ok(expected[i].includes(h),'Live canvas contains a documented compiled pose');seen[i].add(h);});
      if(seen.every((s,i)=>s.size===expected[i].length))break;
    }
    assert.ok(seen.every((s,i)=>s.size===expected[i].length),'Every documented unique motion state appeared');
    const id=[91,92,93,94][palette];await page.screenshot({path:dir+'/motion-palette-'+id+'.png',fullPage:true});
    reports.push({palette:id,loops:9,samples,expectedUniqueStates:expected.map(a=>a.length),observedUniqueStates:seen.map(s=>s.size)});
  }
}finally{await browser.close();}
assert.deepEqual(errors,[]);
await writeFile(dir+'/motion-review.json',JSON.stringify({status:'All nine visual loops render every documented unique pose in all four exact palettes',browser:'headless Chromium',pageErrors:errors,reports,scope:'Source-based compiled-native geometry review. Gait order and duration values are original. This does not assert native encounter transitions.'},null,2)+'\n');
console.log(JSON.stringify(reports));
