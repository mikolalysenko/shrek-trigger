export const BASE_SHA256 = '06d1c2b06b716052c5596aaa0c2e5632a027fee1a9a28439e509f813c30829a9';
export const u16 = (b, p) => b[p] | b[p + 1] << 8;
export const u24 = (b, p) => u16(b, p) | b[p + 2] << 16;
export const fileOffset = a => a & 0x3fffff;
export function put16(b, p, v) { b[p] = v; b[p + 1] = v >> 8; }
export function put24(b, p, v) { put16(b, p, v); b[p + 2] = v >> 16; }
export async function validateRom(source) {
  let bytes = new Uint8Array(source);
  if (bytes.length % 0x8000 === 512) bytes = bytes.slice(512);
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
  if (hash !== BASE_SHA256) throw Error('This build needs the original Chrono Trigger (USA), 4 MiB, SHA-256 ' + BASE_SHA256 + '. A 512-byte copier header is supported.');
  return bytes;
}
export function checksum(rom) {
  put16(rom, 0xffdc, 0xffff); put16(rom, 0xffde, 0);
  const sum = rom.reduce((a, b) => (a + b) & 0xffff, 0);
  put16(rom, 0xffdc, sum ^ 0xffff); put16(rom, 0xffde, sum);
  return sum;
}
export function applyRecords(base, records) {
  const result = new Uint8Array(base);
  const intervals = [];
  for (const {offset, bytes, label} of records) {
    if (!Number.isInteger(offset) || offset < 0 || offset + bytes.length > base.length) throw Error('Out of bounds: ' + label);
    for (const [a, b, name] of intervals) if (offset < b && offset + bytes.length > a) throw Error(`Overlapping patches: ${label} / ${name}`);
    intervals.push([offset, offset + bytes.length, label]);
    result.set(bytes, offset);
  }
  checksum(result);
  return result;
}
export function makeIps(base, target) {
  if (base.length !== target.length) throw Error('IPS builder expects a fixed-size cartridge');
  const out = [...new TextEncoder().encode('PATCH')];
  for (let p = 0; p < base.length;) {
    if (base[p] === target[p]) { p++; continue; }
    const start = p;
    while (p < base.length && p - start < 65535 && base[p] !== target[p]) p++;
    out.push(start >> 16 & 255, start >> 8 & 255, start & 255, (p-start) >> 8, (p-start) & 255, ...target.subarray(start, p));
  }
  out.push(69, 79, 70);
  return Uint8Array.from(out);
}
