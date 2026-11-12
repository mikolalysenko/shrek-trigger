function clearArray(a) { a.fill(0); }
function log(message) { globalThis.dispatchEvent?.(new CustomEvent('snes-log', {detail:String(message)})); }
function getByteRep(v) { return v.toString(16).padStart(2, '0'); }
function getWordRep(v) { return v.toString(16).padStart(4, '0'); }
function getLongRep(v) { return v.toString(16).padStart(6, '0'); }
