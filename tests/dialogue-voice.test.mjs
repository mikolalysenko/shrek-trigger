import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dialogue} from '../content/dialogue.js';
import {additionalDialogue} from '../engine/event-additions.js';
import {shrekReplies} from '../content/shrek-dialogue.js';

const {entries}=JSON.parse(await readFile('content/dialogue-options.json'));

test('voice edits preserve every native option label and row exactly',()=>{
  for(const entry of entries){
    const text=additionalDialogue[entry.location]?.[entry.id]??dialogue[entry.location]?.[entry.id];
    assert.ok(text,`missing dialogue ${entry.location}:${entry.id}`);
    const rows=text.replace('{null}','').split(/\{(?:page|full|page3)\}/).at(-1).split('\n');
    assert.deepEqual(rows.slice(entry.first,entry.last+1).map(row=>row.trim()),entry.options,`${entry.location}:${entry.id}`);
  }
});

test('Shrek keeps a complete, bounded set of native replies',()=>{
  const replies=Object.values(shrekReplies).reduce((n,lines)=>n+Object.keys(lines).length,0);
  assert.equal(replies,373);
  for(const[location,lines]of Object.entries(shrekReplies))for(const[id,text]of Object.entries(lines)){
    assert.ok(text.startsWith('SHREK: '),`${location}:${id}`);
    assert.ok(!text.includes('{'),`${location}:${id} contains an unsupported control`);
    assert.ok(text.split('\n').length<=3,`${location}:${id} has too many rows`);
    for(const row of text.split('\n'))assert.ok(row.length<=36,`${location}:${id} row is too wide`);
  }
});
