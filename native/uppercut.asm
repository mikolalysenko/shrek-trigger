; Original Shrek Trigger code. A=8, X/Y=16, DB=7E, DP=0 on entry.
; Effect type 4, single target only. Reclaims unused type dispatch entries
; 11..40 at C1:D9ED (58 bytes). The builder checks those entries and all
; source effect types before patching. The normal battle engine owns KO,
; death poses, turn cancellation, menu cleanup, and subsequent revival.
;
; This deliberately bypasses damage magnitude, defense, immunity, shield,
; evasion and elemental absorption: exactly current HP becomes lethal damage.
org $C1D9ED
  jsr $E9A3          ; attacker base
  jsr $E9B8          ; target base
  lda $5FE4          ; locked party slot + 1
  dec
  cmp $B1FD
  beq .impact
  lda #4             ; target changed/died: cancel and enter recovery
  sta $5FE4
  stz $B200
  stz $AD8D
  rts
.impact:
  lda #4             ; enter recovery atomically with the strike
  sta $5FE4
  ldx $B1F6
  rep #$20
  lda $5E30,x        ; current target HP
  sta $AD89          ; pending damage, not an immediate HP write
  sep #$20
  stz $B200
  jsr $DD72          ; normal lethal-damage staging and action cleanup
  jsr $D508          ; commit target result
  stz $AD8D          ; single target consumed
  rts
