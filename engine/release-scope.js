export function assertReleaseScope(acceptance){
  const hardwareUntested=/physical[^\n]*(?:unverified|not established|not performed)/i.test(acceptance),emulatorScopeApproved=/Mikola explicitly approved an \*\*emulator-scoped release\*\*/.test(acceptance);
  if(!/\*\*blocked/i.test(acceptance)&&/release-ready/i.test(acceptance)&&hardwareUntested&&!emulatorScopeApproved)throw Error('Hardware-unverified candidate requires an explicitly approved emulator-only scope');
}
