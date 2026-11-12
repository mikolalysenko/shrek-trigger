"""Decode current immutable event packets, rather than assuming old offsets."""
import base64, contextlib, hashlib, io, json, pathlib, sys
root=pathlib.Path.cwd()
directory=root/'assets/raster/town-npc35-audit'
reference=root/'.local/reference/jot-current/sourcefiles'
sys.path.insert(0,str(reference))
from eventcommand import get_command, event_commands
def native_command(data,pos):
    # The older local decoder omits the inline palette blob in SNES 2E/8x
    # and one argument in FF/97. Use the corrected local Temporal Redux
    # definitions, without importing its unrelated editor UI dependencies.
    if data[pos]==0x2e and data[pos+1]>>4==8:
        cmd=event_commands[0x2e].copy()
        cmd.arg_lens=[1,1,2,data[pos+3]-2]
    elif data[pos]==0xff and data[pos+1]==0x97:
        cmd=event_commands[0xff].copy()
        cmd.arg_lens=[1,1,1,1]
    else:
        return get_command(data,pos)
    p=pos+1;cmd.args=[]
    for size in cmd.arg_lens:
        cmd.args.append(int.from_bytes(data[p:p+size],'little'));p+=size
    return cmd
packets=json.loads((directory/'private/event-packets.json').read_text())
names=(root/'.local/reference/CTViewer/data/snes_na_scenes.txt').read_text().splitlines()
result=[]; errors=[]
for p in packets:
    if 'error' in p:
        errors.append({k:v for k,v in p.items() if k!='bytes'});continue
    raw=bytearray(base64.b64decode(p['bytes'])); data=raw[1:]
    try:
        count=raw[0]
        if not count or count*32>len(data):
            raise ValueError('No valid native object/function table')
        functions=[[int.from_bytes(data[o*32+f*2:o*32+f*2+2],'little') for f in range(16)] for o in range(count)]
        start=min(v for row in functions for v in row)
        if start<count*32 or start>=len(data):raise ValueError('Invalid first function pointer')
        pos=start;commands=[];notes=[]
        while pos<len(data):
            with contextlib.redirect_stdout(io.StringIO()) as warning:
                cmd=native_command(data,pos)
            if warning.getvalue().strip():notes.append({'offset':pos,'warning':warning.getvalue().strip()})
            length=len(cmd)
            if length<1 or pos+length>len(data):raise ValueError(f'Command {data[pos]:02x} overruns at {pos}')
            args=[list(a) if isinstance(a,(bytes,bytearray)) else a for a in cmd.args]
            commands.append({'offset':pos,'opcode':cmd.command,'name':cmd.name,'args':args,'length':length})
            pos+=length
        boundaries={c['offset'] for c in commands}|{len(data)}
        unaligned=sorted({v for row in functions for v in row if v not in boundaries})
        if unaligned:raise ValueError('Function pointers are not command boundaries: '+str(unaligned))
        loads=[c for c in commands if c['opcode']==0x82 and c['args'][0] in [25,39,52]]
        if not loads:continue
        ends=sorted({v for row in functions for v in row}|{len(data)})
        objects=[]
        for o,row in enumerate(functions):
            ranges=[{'start':s,'endExclusive':next((v for v in ends if v>s),len(data)),'functionAliases':[f for f,v in enumerate(row) if v==s]} for s in sorted(set(row))]
            relevant=[l for l in loads if any(r['start']<=l['offset']<r['endExclusive'] for r in ranges)]
            if not relevant:continue
            objects.append({'object':o,'loads':relevant,'functions':row,'ranges':[{**r,'commands':[c for c in commands if r['start']<=c['offset']<r['endExclusive']]} for r in ranges]})
        result.append({**{k:v for k,v in p.items() if k!='bytes'},'name':names[p['location']] if p['location']<len(names) else None,'objectCount':count,'decodedBytes':len(raw),'parseWarnings':notes,'loads':loads,'objects':objects,'allEnemyLoads':[c for c in commands if c['opcode']==0x83],'allNpcLoads':[c for c in commands if c['opcode']==0x82],'paletteCommands':[c for c in commands if c['opcode'] in [0x33,0x2e,0x88]],'battleCommands':[c for c in commands if c['opcode']==0xd8],'stringTables':[c for c in commands if c['opcode']==0xb8],'transitions':[c for c in commands if 0xdc<=c['opcode']<=0xe2]})
    except Exception as e:
        errors.append({'location':p['location'],'error':str(e)})
correction=root/'.local/reference/temporal-redux/sourcefiles/jetsoftime/eventcommand.py'
report={'status':'Inactive current-event decode audit with explicit invalid-record exclusions','activation':False,'generationStarted':False,'decoder':{'path':str(reference.relative_to(root)/'eventcommand.py'),'sha256':hashlib.sha256((reference/'eventcommand.py').read_bytes()).hexdigest(),'variableLengthCorrections':{'path':str(correction.relative_to(root)),'sha256':hashlib.sha256(correction.read_bytes()).hexdigest(),'opcodes':['2E/8x inline palette bytes','FF/97 four arguments']}},'scenes':result,'decodeErrors':errors,'counts':{'recordsAttempted':len(packets),'recordsDecoded':len(packets)-len(errors),'locations':len(result),'loads':sum(len(e['loads']) for e in result),'objects':sum(len(e['objects']) for e in result)},'scope':'All 512 current location records were attempted; 504 packets decoded linearly with variable-length commands and object function pointers checked against command boundaries. Eight unchanged corrupt/empty-labelled source records are explicitly excluded. Parsed actor sites are ownership evidence, not guaranteed execution/visibility.'}
(directory/'event-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'counts':report['counts'],'errors':errors,'scenes':[{'location':s['location'],'name':s['name'],'loads':[(l['offset'],l['args'][0]) for l in s['loads']],'objects':[o['object'] for o in s['objects']],'sameAsCT':s['originalPacketUnchanged'],'warnings':s['parseWarnings']} for s in result]},indent=2))
