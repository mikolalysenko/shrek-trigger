# Shrek's speaking role

Shrek is a speaking protagonist. The adaptation gives him direct answers,
objections, affection and decisions in conversations and cutscenes. His voice
is blunt and observant, with short jokes and increasing concern for other
people's homes. His final Tyson encounter includes the exact line
`SHREK: GET OUT OF MY SWAMP!` inside the battle message window.

## Current content

`content/shrek-dialogue.js` contains 373 additional responses across the swamp,
festival, medieval rescue, trial, prison escape, empty future, puppet rescue,
Last Inn, Guy Fieri lessons, Medina, southern villages, Carnival Hatchet quest,
fortress, hideout, Bakery chapters, Dragon scenes, both Cleveland variants,
Undertown, Ohio Palace, the Wish Palace and the direct Cosmic Muffin approach.
Existing directly authored Shrek lines remain in their chapter dialogue files.
Donkey's opening machine conversation no longer interprets Shrek's silence as consent.

Responses attach to named location/string pairs. Each is written for that
conversation; the system does not generate a generic reaction for every box.
All verbal native field strings now have authored adaptations. That is complete
text coverage, not a claim that every campaign branch has received a connected
playthrough. Flashbacks and the period when Shrek is awaiting rescue retain
their appropriate speakers.

## Cartridge implementation

The builder records each authored message's relocated null terminator. A
96-byte 65816 helper at the native text-byte fetch (`C2:58B2`) recognizes
those exact addresses. With Shrek in any of the three active field party
slots, it continues into an ordinary full-page break and his response.
Otherwise, the original null ends the message. The response's own null is
unregistered and always finishes normally.

Only the new text and one six-byte pointer pair per response are stored.
The original conversation, dictionary, numeric argument stream, message ID,
event instructions and choice results remain native. No extra WRAM, VRAM,
event object or browser gameplay callback is allocated. The builder rejects
timed strings, choice-style rows and oversized responses. The original 316-response
set's 357 native call sites were checked against the decoded source: each is an
ordinary or personal text box, not a decision box. The Cleveland extension preserves
its event instructions and all three fate choices; its first clown conversation
also runs through native text completion and a real walking input in the scene test.

The Tyson shout uses enemy AI message 245 during the first jab/tell action.
It adds no idle turn. A 62-byte native predicate occupies the source's unused
AI condition-1C handler. The builder verifies that none of the 256 source
enemy programs use that condition and checks its dispatch signature. It
requires the actual Tyson actor, initial cycle, a living Shrek in any party
position, and a living selected target. Later cycles use phase five; the
existing uppercut windup, cancellation and recovery states are retained.
The final AI is 242 bytes within the original 268-byte allocation.

The source dispatcher evaluates at most two predicates per condition block.
The retired stock 1C predicate also has a stop-after-test side effect, so it
cannot be used as a third conjunction. Both constraints are covered by the
native tests.

## Verification and development

`node --test tests/shrek-dialogue.test.mjs tests/finale.test.mjs` checks the
compact source/response bytes, every continuation in all three party slots,
reserve/absent cases, ordinary text controls, CPU state, numeric arguments,
actual conversation rendering and the native battle shout. The predicate
matrix also covers KO characters, all target slots, later cycles and other
acting enemies. The finale rebuild test now requires restored HP as well as
an actor ID: native death-list reconciliation can temporarily restore an ID
while its HP remains zero.

`npm run test:speech-cores` builds a private, fingerprinted cartridge and
runs the same opening conversation and four-party Tyson matrix in Snes9x
and bsnes. It uses setup writes followed by normal native event processing;
there are no JavaScript gameplay hooks or CPU/stack redirects. Cartridge
`21895dd2da62b2db01a3c5c690b0384cf3f304a7dd6860cb93407bec02c7a5b2`
passes both focused suites, at 15,132 and 15,123 frames respectively. Captures
and reports are under `.local/qa/speaking-21895dd2da62/`.

The extended suite passes cartridge
`d8ef5a4a819501b861608fb89c03fd33086dd086582a2da89417bc90d0732a11`
in Snes9x (19,393 frames) and bsnes (19,387 frames). It also opens the actual
Air/Dirt status menus and compares their displayed pixels, then talks to an
Cleveland clown projection and walks after closing its conversation. Evidence is
under `.local/qa/speaking-d8ef5a4a8195/`.

The current cast revision `7136406a9505a74e9a2bec64300eb2e5f719c0c4c69e7cc0c5207bc67c697e63` also passes the extended suite: 19,393 frames in Snes9x and 19,390 in bsnes. Its evidence is under `.local/qa/speaking-7136406a9505/`. All 206 cartridge/unit/integration checks and browser diagnostics pass on the cast revision.

Use the existing swamp, chapter and final-arena shortcuts to review lines in
the browser. Party selection allows checking different Shrek positions and
his absence. Return restores the checkpoint before the jump. The full
chapter regression and remaining authored scenes still determine broader
acceptance; these focused passes are not a hardware test or full-campaign
completion claim.

Pinocchio's recruitment and Guy Fieri's lesson use the four-line “Miracles” excerpt
supplied by the user, split across native text windows in `content/miracles.js`.
The operation joke also appears in his home and Cleveland conversations. Air and
Dirt follow the original Lightning and Shadow mechanics; see `elements.md`.

The complete-dialogue revision `69559982fb0aa22b64e926495a650fbfaa24dc1d2d496e14bc6f116a8ccd5ac0`
passes the expanded suite in Snes9x and bsnes at 19,869 frames each. It adds
Cleveland's native conversation and the Wish Palace's actual Godmother scene
to the existing menu and Tyson checks. Reports and clean captures are under
`.local/qa/speaking-69559982fb0a/`.
