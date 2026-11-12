"""Read-only native event consumer scan of the pinned cartridge packets."""
import base64, builtins, contextlib, hashlib, io, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
DIR = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / '.local/reference/jot-current/sourcefiles'))
from eventcommand import get_command

def no_input(*args):
    raise ValueError('Reference decoder requested an unsupported mode')
builtins.input = no_input
result, errors = [], []
for item in json.loads((DIR / 'private/current-events.json').read_text()):
    if 'error' in item:
        errors.append(item)
        continue
    raw = base64.b64decode(item['bytes'])
    data, count = raw[1:], raw[0]
    if count * 32 > len(data):
        errors.append({'location': item['location'], 'error': 'Invalid object table'})
        continue
    pointers = []
    for obj in range(count):
        for fn in range(16):
            at = obj * 32 + fn * 2
            pointers.append({'object': obj, 'function': fn,
                             'start': int.from_bytes(data[at:at+2], 'little')})
    starts = sorted(set(p['start'] for p in pointers if p['start'] < len(data)))
    commands, at, decode_error = [], count * 32, None
    try:
        while at < len(data):
            with contextlib.redirect_stdout(io.StringIO()):
                c = get_command(data, at)
            size = len(c)
            if size <= 0 or at + size > len(data):
                raise ValueError('Command extends beyond packet')
            start = max((p for p in starts if p <= at), default=None)
            commands.append({'offset': at, 'opcode': c.command,
                             'args': c.args, 'bytes': size,
                             'owners': [p for p in pointers if p['start'] == start]})
            at += size
    except Exception as exc:
        decode_error = {'location': item['location'], 'offset': at, 'error': str(exc)}
        errors.append(decode_error)
    loads = [c for c in commands if c['opcode'] == 0x82 and c['args'][0] in (15,80)]
    if not loads:
        continue
    objects = sorted(set(p['object'] for c in loads for p in c['owners']))
    selected = [c for c in commands if any(p['object'] in objects for p in c['owners'])]
    result.append({'location': item['location'], 'eventId': item['eventId'],
                   'offset': item['offset'], 'decodedBytes': len(raw),
                   'decodedSha256': hashlib.sha256(raw).hexdigest(),
                   'objects': objects, 'loads': loads,
                   'functionEntries': [p for p in pointers if p['object'] in objects],
                   'actorCommands': selected,
                   'stringTables': [c for c in commands if c['opcode'] == 0xB8],
                   'allFrameCalls': [c for c in commands if c['opcode'] == 0xAC],
                   'allActorLoads': [c for c in commands if c['opcode'] in (0x82, 0x83)],
                   'decodeError': decode_error})

def fallback(value):
    if isinstance(value, (bytes, bytearray)):
        return list(value)
    raise TypeError(type(value).__name__)
(DIR / 'current-event-audit.json').write_text(json.dumps({
    'status': 'Read-only decoded current event scan',
    'decoder': '.local/reference/jot-current/sourcefiles/eventcommand.py',
    'scope': 'All512 locations; errors are retained explicitly. No event bytes changed.',
    'scenes': result, 'errors': errors
}, indent=2, default=fallback) + '\n')
print(json.dumps({'targetScenes': len(result), 'locations': [s['location'] for s in result],
                  'targetErrors': [s['decodeError'] for s in result if s['decodeError']],
                  'otherDecodeErrors': len(errors)}))
