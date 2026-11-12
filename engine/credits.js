// The ending credits are ASCII strings in bank FD, terminated by $80.
// Replace the last remake-staff continuation in place so all later string
// indices and the native event script remain unchanged.
export const ROM_HACK_CREDIT='HACKED BY//KIMI K3.1 PRO';
const CREDIT_OFFSET=0x3da6c6;
const STOCK_CREDIT='E.GREGORY/D.ABRAHAM/C.BUDD/M.FREGUIA';

export function patchCredits(base,add) {
  const stock=String.fromCharCode(...base.subarray(CREDIT_OFFSET,CREDIT_OFFSET+STOCK_CREDIT.length));
  if(stock!==STOCK_CREDIT)throw Error('Native ending-credit signature mismatch');
  const bytes=Uint8Array.from([...ROM_HACK_CREDIT].map(c=>c.charCodeAt(0)).concat(0x80));
  add(CREDIT_OFFSET,bytes,'native ROM hack ending credit');
  return {offset:CREDIT_OFFSET,text:ROM_HACK_CREDIT};
}
