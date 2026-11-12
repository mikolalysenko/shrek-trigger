import {encodeDialogue} from './text.js';
import {nativeRoutine} from './asm.js';
import {put24} from './rom.js';

// A reply continues an ordinary field string at its terminator. The original
// message, dictionary and numeric argument stream stay in place. Each reply
// owns only its new text and a six-byte ROM pointer pair. No extra WRAM,
// event objects, script branches or browser gameplay callbacks are needed.
export function patchShrekDialogue(base, entries, allocate, add) {
  if (!entries.length) return {replies: [], extraWramBytes: 0};
  const pointers = new Uint8Array(entries.length * 6), replies = [];
  const ends = new Set();
  for (const [i, entry] of entries.entries()) {
    const {location, id, text, sourceText, terminator} = entry;
    if (!sourceText.endsWith('{null}') || /\{delay |\n {3}/.test(sourceText))
      throw Error(`Shrek reply needs an untimed, non-choice message: ${location}:${id}`);
    if (/\{/.test(text) || !text.startsWith('SHREK: '))
      throw Error(`Shrek reply must be plain speaker text: ${location}:${id}`);
    const rows = text.split('\n');
    if (rows.length > 3 || rows.some(row => row.length > 36))
      throw Error(`Shrek reply exceeds the native window: ${location}:${id}`);
    if (ends.has(terminator)) throw Error(`Aliased Shrek reply terminator: ${location}:${id} ${terminator.toString(16)}`);
    ends.add(terminator);
    const bytes = encodeDialogue('{full}' + text + '{null}', base);
    const offset = allocate(bytes, `Shrek reply ${location}:${id}`);
    put24(pointers, i * 6, 0xc00000 | terminator);
    put24(pointers, i * 6 + 3, 0xc00000 | offset);
    replies.push({location, id, terminator, offset, bytes: bytes.length, text});
  }
  const table = allocate(pointers, 'native Shrek reply pointers');
  const long = n => [n & 255, n >> 8 & 255, 0xc0 | n >> 16];
  // C2:58B2 is the main text-byte fetch, with DP=$0200, M=8 and X=16.
  // The fast path replays LDA [$31]; REP #$20. On a registered null only,
  // an active Shrek makes the next native byte a normal full-page break.
  // Reply terminators are unregistered, so there is no loop or sticky state.
  const code = nativeRoutine(a => {
    a.emit(0xa7, 0x31); a.branch(0xd0, 'original');
    a.emit(0x08, 0xc2, 0x30, 0x48, 0xda);
    for (const addr of [0x2980, 0x2981, 0x2982]) {
      a.emit(0xaf, addr & 255, addr >> 8, 0x7e, 0x29, 0xff, 0);
      a.branch(0xf0, 'search');
    }
    a.branch(0x80, 'restore');
    a.label('search'); a.emit(0xa2, 0, 0);
    a.label('next');
    a.emit(0xbf, ...long(table), 0xc5, 0x31); a.branch(0xd0, 'advance');
    a.emit(0xe2, 0x20, 0xbf, ...long(table + 2), 0xc5, 0x33);
    a.branch(0xd0, 'wide');
    a.emit(0xbf, ...long(table + 5), 0x85, 0x33, 0xc2, 0x20);
    a.emit(0xbf, ...long(table + 3), 0x85, 0x31); a.branch(0x80, 'restore');
    a.label('wide'); a.emit(0xc2, 0x20);
    a.label('advance'); a.emit(0xe8, 0xe8, 0xe8, 0xe8, 0xe8, 0xe8);
    a.emit(0xe0, pointers.length & 255, pointers.length >> 8); a.branch(0x90, 'next');
    a.label('restore'); a.emit(0xfa, 0x68, 0x28, 0xa7, 0x31);
    a.label('original'); a.emit(0xc2, 0x20, 0x6b);
  });
  if (![0xa7, 0x31, 0xc2, 0x20].every((v, i) => base[0x258b2 + i] === v))
    throw Error('Unexpected native dialogue byte fetch');
  const offset = allocate(code, 'native Shrek reply continuation');
  const call = new Uint8Array(4); call[0] = 0x22; put24(call, 1, 0xc00000 | offset);
  add(0x258b2, call, 'native conditional Shrek speaking lines');
  return {replies, table, routine: offset, routineBytes: code.length,
    textBytes: replies.reduce((n, r) => n + r.bytes, 0),
    pointerBytes: pointers.length, extraWramBytes: 0, extraVramBytes: 0,
    presence: 'any active field party slot; reserve characters do not speak', native: true};
}
