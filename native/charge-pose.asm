; Original Shrek Trigger code, relocated by the bank allocator.
; Common frame upload C1:1C5D: replace LDA $967B / CMP $9907,x with JSL.
; A=8, X/Y=16, DB=7E. X is the rendered combatant slot. The final formation
; center is slot 3; its existing work byte +37 stores the native AI phase.
  php
  cpx #3
  bne .original
  lda $AF02
  cmp #$CE
  bne .original
  lda $5FE4
  beq .original
  cmp #4
  bcs .original
  plp
  lda #24
  sta $967B
  cmp $9907,x
  rtl
.original:
  plp
  lda $967B
  cmp $9907,x
  rtl

; The companion at C1:423A uses JML, because the displaced timer loop has
; a back-edge into the overwritten entry. It requests a one-frame animation
; only when this actor's cached frame disagrees with the phase, then executes
; the original eleven-slot delay-counter loop and JMLs back to C1:424A.
; It uses the actor's existing A124/A12F/A13A/A150 and A1E8/A1FE fields.
; Full emitted source is engine/finale.js (nativeRoutine with branch labels).
; No extra WRAM, VRAM, host timer, persistent JS state or modified NMI needed.
