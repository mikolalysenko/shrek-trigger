"""Build the inactive role/scene proposal from exact decoded native resources."""
import hashlib,json,pathlib
from PIL import Image,ImageDraw,ImageFont
D=pathlib.Path('assets/raster/town-cats-gfx43-audit')
n=json.loads((D/'native-audit.json').read_text());e=json.loads((D/'event-audit.json').read_text())
labels=['Rear idle','Front idle','Left upright idle','Right upright idle','Rear contact A','Rear passing A','Rear contact B','Rear passing B','Front contact A','Front passing A','Front contact B','Front passing B','Left contact A','Left passing','Left contact B','Right contact A','Right passing','Right contact B','Left airborne','Right airborne','Left crouch / curl','Right crouch / curl']
contexts={1:'Household pets and prize-cat count; follow and interaction functions. Extra cats may remain hidden.',2:'Bedroom pet wake/crouch/jump, feeding bowl, prize population and original ending/story alternatives.',5:'Festival animal race: the cat is one of four racers. This is distinct from the returned-cat scene in439.',18:'Ticket-office pet.',80:'Moonlight Parade race/interaction cat; NPC190 copies source palette133 to OBJ row7. Preserve root417914ab palette fix for the other actors.',85:'Telepod ending cat procession: eleven source objects controlled by original prize/count and ending branches.',93:'People of the Times ending part3 cat.',94:'People of the Times ending part4 court cat.',110:'Ancient Tyrano Lair trap/cat actor; placement and trigger require later scene observation.',181:'Horner hideout finale: cat approaches and operates the original floor switch, then leaves. Quest flags and companion reactions remain native.',207:'No-map duplicate of court bedroom328; source ownership only, not a traversed playable scene.',237:'Lower-sewer noise cat: interaction plays native sound and triggers the three-Drain-Imp encounter. Cat stays a separate noncombat actor.',252:'Dino Age fair ending cat variant.',328:'Purple court companion in Schala bedroom; story-dependent visibility and native child relationship.',333:'Purple court companion in the night Mammon hall scene.',335:'Wrong-map duplicate of Enhasa355; source ownership only.',355:'Purple court companion follows/reacts in Enhasa; preserve Janus/Farquaad affinity and original proximity checks.',379:'Dream Project ending court-cat actor.',399:'Prophet ending household with two cat objects.',402:'Purple court companion in palace hallway choreography.',415:'Purple court companion during Ocean Palace throne choreography, including hidden states.',424:'Purple court companion in Last Village; story210 gating and native interaction.',434:'Bekkler prize-cat appearance and minigame awards; preserve prize flags and food quantity.',439:'Original fair lost-cat return/follow/flight logic and trial evidence. This is distinct from the animal race in5.'}
roles=[]
for f in n['frames']:
 calls=[]
 for s in e['scenes']:
  for o in s['objects']:
   for r in o['ranges']:
    for c in r['commands']:
     if c['opcode']==0xac and c['args'][0]==f['frame']:calls.append({'location':s['location'],'object':o['object'],'bodyOffset':c['offset']})
 roles.append({'frame':f['frame'],'label':labels[f['frame']],'native':f,'animationPrograms':[l for l in n['animation']['lists'] if any(t['frame']==f['frame'] for t in l['steps'])],'explicitStaticCalls':calls})
flagops=set([0x12,0x13,0x14,0x15,0x16,0x18,0x48,0x4a,0x4b,0x4f,0x50,0x51,0x53,0x54,0x55,0x56,0x58,0x59,0x5a,0x5b,0x5f,0x60,0x61,0x63,0x64,0x65,0x66,0x69,0x6b,0x71,0x72,0x73,0x74,0x75,0x76,0x7f])
sceneRows=[]
for s in e['scenes']:
 fs=sorted(set(x for row in s['allFunctionPointers'] for x in row)+{s['decodedBytes']-1}) if False else sorted({x for row in s['allFunctionPointers'] for x in row}|{s['decodedBytes']-1})
 cmds=[]
 for c in s['allCommands']:
  if c['opcode'] not in flagops:continue
  refs=[]
  for i,row in enumerate(s['allFunctionPointers']):
   for f,st in enumerate(row):
    en=next((x for x in fs if x>st),s['decodedBytes']-1)
    if st<=c['offset']<en:refs.append([i,f])
  cmds.append({**c,'objectFunctionReferences':refs})
 sceneRows.append({'location':s['location'],'referenceName':s['name'],'context':contexts[s['location']],'eventId':s['eventId'],'decodedSha256':s['sha256'],'originalSha256':s['originalSha256'],'originalPacketUnchanged':s['originalPacketUnchanged'],'sourceObjects':[{'object':o['object'],'loads':o['loads']} for o in s['objects']],'sourcePaletteRowOverrides':[{'object':o['object'],**c} for o in s['objects'] for r in o['ranges'] for c in r['commands'] if c['opcode']==0x33],'allEventStateCommands':cmds,'otherSourceOwners':{'npcs':sorted(set(c['args'][0] for c in s['allNpcLoads'])-{59,175,176,177,190}),'enemies':sorted(set(c['args'][0] for c in s['allEnemyLoads']))}})
stateNotes=[
 {'role':'Prize cat and food/population','addresses':['7F0053','7F005D bit7','7F005F'],'evidence':[{'location':434,'bodyOffsets':[776,1009,1029,1037,1705,1858]},{'location':5,'bodyOffsets':[932,936,940,1125,1129]},{'location':2,'bodyOffsets':[2169,2176,2183,2190,2197,2207]},{'location':85,'bodyOffsets':[1202,1211,1220,1229,3438,3448]}],'note':'Count/food/prize controls remain untouched. The exact decoded opcodes are retained; source loads are not proof that all extra cats are simultaneously visible.'},
 {'role':'Lost-cat return and trial evidence','addresses':['7F0054 bits0/1','7F0055 bits4/5','7F0222'],'evidence':[{'location':439,'bodyOffsets':[1826,1874,1881,1894,1908,1925,1940,1949,1954,1968,1975,2014,2017]}],'note':'Original lost-cat interaction, following, frightened escape and girl return flags remain owned by the event. Do not replace a callback or seed a result in the art wrapper.'},
 {'role':'Hideout finale','addresses':['7F01A0 bit7','7F01A1 bit7','7F01F4 bit5','7F0216'],'evidence':[{'location':181,'bodyOffsets':[366,371,577,687,690,833,845,848,850,854,856,880,887]}],'note':'Existing tests/hideout-controller.mjs provides the real controller route. Cat animation and switch/collapse are separate from generating a source sheet.'},
 {'role':'Sewer cat trap','addresses':['7F0210'],'evidence':[{'location':237,'bodyOffsets':[918,928,942,944,948,963]}],'note':'Native noise trap dispatches the three-imp encounter. Other traps and their effects stay separate.'},
 {'role':'Ending/parade conditions','addresses':['7F006D bits2/3/6','7F006E','7F006F','7F0076 bit2'],'evidence':[{'location':80,'bodyOffsets':[2292,2294,2296,2317,2335]},{'location':85,'bodyOffsets':[979,988,1002,1009,1019,1022,3552]}],'note':'Parade cat uses shared source133/row7. Eleven telepod cats retain count-dependent original following and removal, without full-ending acceptance from this audit.'},
 {'role':'Court/child companion','addresses':['7F0000 story','7F00F4 bit4','7F0220'],'evidence':[{'location':328,'bodyOffsets':[421,427,432,731,736,747,749]},{'location':355,'bodyOffsets':[2547,2568,2570,2599,2606]},{'location':424,'bodyOffsets':[1607,1609,1636,1638]}],'note':'Purple recolor remains a recognizable court companion; keep native child affinity, proximity, follow, visibility and later-village story conditions. Duplicate no-map records207/335 are not playable-route evidence.'}
]
proposal={'status':'Root approved source generation after exact native audit; no candidate art accepted yet','activation':False,'rootDecision':'Ordinary storybook quadruped cat, preserving16px silhouettes/anchors/all22roles/exact palettes/AA57; native sample review before freeze.','baseline':n['baseline'],'direction':'Tiny ordinary storybook village cats with natural quadruped anatomy, compact muzzle, triangular ears, readable paws, light chin/chest and one alert curled tail. No clothing, human pose, new celebrity or playable-Puss duplication. Palette variants retain warm tabby, gray, moss-cream, violet court companion and festival ginger.','resources':{'gfx':43,'assembly':32,'animation':57,'owners':n['owners'],'sourceRawBytes':960,'sourceCompressedBytes':683,'assemblyBytes':880,'compressedPlusAssemblyBytes':1563,'frames':22,'reservedCells':4,'opaqueCellsPerFrame':1,'opaqueCellIndex':3,'usedHardwareColorIndices':[1,2,3,4,5,6,7],'all12PaletteWordsPreserved':True,'sharedPalette133OwnerCount':43,'plannedWorstCaseRawBytesIfFourTilesPerPosePlusBlank':2848},'geometryContract':{'keepAll176XYBytesExact':True,'blankCellIndices':[0,1,2],'blankFrames':[],'all22SlotsRemainVisible':True,'maximumSourceFootprint':[16,16],'airborneFrames':[18,19],'airborneAnchorY':-22,'ordinaryStandingAnchorY':-16,'crouchFrames':[20,21],'crouchCellOriginY':-15,'fullAssemblyAttributeBitsPreserved':True,'note':'Replace only tile-index fields in owned assembly32; keep all high attribute bits and XY bytes. Native source reuses a single16x16cell, so extra scene effects must never be folded into the cat cell. No clipping or procedural anatomy. Source growth/compression is unknown until actual generation.'},'animationContract':{'id':57,'lists':n['animation']['lists'],'note':'All four walking programs use12-tick phases. Mode3 uses26ticks and mode4 uses15ticks; front/rear reaction lists intentionally choose original left/right source poses. Preserve these native directional quirks, empty mode2, terminators, function callbacks and scheduler timing.'},'roles':roles,'scenes':sceneRows,'stateNotes':stateNotes,'effectContract':'No detached visual effect source is present in gfx43: every frame has exactly one opaque cell and three blank cells. Preserve all other NPC/enemy banks, sounds, controller-owned effects, original OAM/priority, and source palette133 users. Do not synthesize an aura, shadow or sparkle into cat frames.','reviewPaths':['review/original-all-palettes-labeled.png','review/original-role-sheet.png','review/original-motion-order.png'],'limitations':['This audit is static exact-resource/event decoding, not newly executed native pixels or completed chapters.','504 of512 location records decode; eight existing invalid/empty-labelled records are listed in event-audit.json.','Twenty-four location records include wrong/no-map duplicates and hidden branches;45source loads do not imply45simultaneous visible cats.','Source generation and final native sampling/posing still require visual acceptance. Tiny faces may reduce to two dark eye marks or a profile eye; paws/tail/silhouette carry identity.','Final allocator/raw-stream registration, independent-core production checks and complete route/ending tests are root-owned.']}
(D/'proposal.json').write_text(json.dumps(proposal,indent=2)+'\n')
(D/'native-role-notes.json').write_text(json.dumps({'baseline':n['baseline'],'labels':labels,'roles':roles,'stateNotes':stateNotes},indent=2)+'\n')
font='/System/Library/Fonts/Supplemental/Arial.ttf'
def F(size):
 try:return ImageFont.truetype(font,size)
 except OSError:return ImageFont.load_default()
bg=(30,32,38,255)
def src(p,f):
 im=Image.open(D/f'review/original-palette{p}-1x.png').convert('RGBA');w=n['atlas']['width'];h=n['atlas']['height'];return im.crop(((f%7)*w,(f//7)*h,(f%7+1)*w,(f//7+1)*h))
# Native row plus enlarged drawing: all pixels come directly from original ROM.
for p in [161,163,162,164,133]:
 out=Image.new('RGBA',(7*204,4*238+60),bg);dr=ImageDraw.Draw(out);dr.text((12,10),f'Original gfx43 cats | palette{p} |22native roles |1x and5x |417914ab',font=F(22),fill='white')
 for f in range(22):
  x=f%7*204;y=f//7*238+60;a=src(p,f);out.alpha_composite(a,(x+12,y+18));out.alpha_composite(a.resize((160,160),Image.Resampling.NEAREST),(x+40,y+12));dr.text((x+8,y+181),f'{f:02d} {labels[f]}',font=F(15),fill=(230,230,230));dr.text((x+8,y+207),str(n['frames'][f]['cellOrigins'][3])+' cell3',font=F(13),fill=(160,190,210))
 out.save(D/f'review/original-palette{p}-labeled.png')
 if p==161:out.save(D/'review/original-role-sheet.png')
out=Image.new('RGBA',(22*54+125,5*100+55),bg);dr=ImageDraw.Draw(out);dr.text((10,10),'Original five palette variants | native1x and2x | no colors changed',font=F(22),fill='white')
for row,p in enumerate([161,163,162,164,133]):
 y=55+row*100;dr.text((10,y+25),f'Palette{p}',font=F(17),fill='white')
 for f in range(22):
  x=125+f*54;a=src(p,f);out.alpha_composite(a,(x+10,y+8));out.alpha_composite(a.resize((48,48),Image.Resampling.NEAREST),(x,y+37));dr.text((x+15,y+84),str(f),font=F(11),fill='white')
out.save(D/'review/original-all-palettes-labeled.png')
programs=[l for l in n['animation']['lists'] if l['steps']];out=Image.new('RGBA',(1020,len(programs)*105+70),bg);dr=ImageDraw.Draw(out);dr.text((12,12),'AA57 original order and durations (data audit, not engine execution proof)',font=F(22),fill='white')
for row,l in enumerate(programs):
 y=70+row*105;dr.text((10,y+26),f"facing{l['facing']} mode{l['mode']}\n{l['loopTicks']}ticks",font=F(17),fill='white')
 for j,s in enumerate(l['steps']):
  x=195+j*180;out.alpha_composite(src(161,s['frame']).resize((96,96),Image.Resampling.NEAREST),(x,y));dr.text((x+95,y+30),f"{s['frame']}\n{s['ticks']}t",font=F(17),fill='white')
out.save(D/'review/original-motion-order.png')
print(json.dumps({'status':proposal['status'],'roles':len(roles),'scenes':len(sceneRows),'review':proposal['reviewPaths'],'auditOnly':True}))
