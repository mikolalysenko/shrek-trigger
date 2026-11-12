"""Read-only command-aware inventory; static candidates are not runtime claims."""
import base64,builtins,contextlib,io,json,pathlib,sys
DIR=pathlib.Path(__file__).resolve().parent
ROOT=DIR.parents[2]
sys.path.insert(0,str(ROOT/'.local/reference/jot-current/sourcefiles'))
from eventcommand import get_command
def no_input(*args): raise ValueError('Unsupported decoder mode')
builtins.input=no_input
for name in ('original','current'):
    scenes=[];all_scenes=[];errors=[]
    for item in json.loads((DIR/('private/events-'+name+'.json')).read_text()):
        if 'error' in item: errors.append(item);continue
        raw=base64.b64decode(item['bytes']);count=raw[0];data=raw[1:]
        pointers=[]
        if count*32>len(data): errors.append({'location':item['location'],'error':'Invalid object table'});continue
        for obj in range(count):
            for fn in range(16):
                at=obj*32+fn*2
                pointers.append({'object':obj,'function':fn,'start':int.from_bytes(data[at:at+2],'little')})
        starts=sorted(set(p['start'] for p in pointers if p['start']<len(data)))
        commands=[];at=count*32;error=None
        try:
            while at<len(data):
                with contextlib.redirect_stdout(io.StringIO()): c=get_command(data,at)
                size=len(c)
                if size<=0 or at+size>len(data):raise ValueError('Command extends beyond packet')
                start=max((p for p in starts if p<=at),default=None)
                commands.append({'offset':at,'opcode':c.command,'args':c.args,'bytes':size,'owners':[p for p in pointers if p['start']==start]})
                at+=size
        except Exception as exc: error={'location':item['location'],'offset':at,'error':str(exc)};errors.append(error)
        actors=[]
        for obj in range(count):
            cmds=[c for c in commands if any(o['object']==obj for o in c['owners'])]
            init=[c for c in cmds if any(o['object']==obj and o['function']==0 for o in c['owners'])]
            prefix=[]
            for c in init:
                prefix.append(c)
                if c['opcode']==0:break
            actors.append({'object':obj,'loads':[c for c in cmds if c['opcode'] in (0x80,0x81,0x82,0x83)],'initPrefix':prefix,'relevantCommands':[c for c in cmds if c['opcode'] in (0x33,0x8b,0x8d,0x8e,0x7c,0x7d,0x7e,0x90,0x91)]})
        all_scenes.append({k:item[k] for k in ('location','eventId','offset','decodedSha256')}|{'objectCount':count,'actors':actors,'error':error})
        if any(c['opcode']==0x33 for c in commands):
            scenes.append({k:item[k] for k in ('location','eventId','offset','decodedSha256')}|{'objectCount':count,'functions':pointers,'commands':commands,'error':error})
    def fallback(x):
        if isinstance(x,(bytes,bytearray)):return list(x)
        raise TypeError(type(x).__name__)
    (DIR/('events-'+name+'.json')).write_text(json.dumps({'scenes':scenes,'errors':errors,'scope':'All512 locations attempted. Only scenes containing decoded opcode33 retained; errors explicit.'},indent=2,default=fallback)+'\n')
    (DIR/('private/scene-loads-'+name+'.json')).write_text(json.dumps({'scenes':all_scenes,'errors':errors},default=fallback)+'\n')
    print(json.dumps({'name':name,'paletteScenes':len(scenes),'paletteCommands':sum(sum(c['opcode']==0x33 for c in s['commands']) for s in scenes),'errors':len(errors)}))
