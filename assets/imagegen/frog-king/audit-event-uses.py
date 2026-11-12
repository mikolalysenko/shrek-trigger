"""Read-only current event decode. The immutable source packets stay private."""
import base64, builtins, contextlib, hashlib, io, json, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[3]
DIR = pathlib.Path(__file__).resolve().parent
QA = ROOT / '.local/qa/frog-king-audit-417914abe589'
sys.path.insert(0, str(ROOT / '.local/reference/jot-current/sourcefiles'))
from eventcommand import get_command

def no_input(*args):
    raise ValueError('Reference decoder requested an unsupported mode')
builtins.input = no_input
results, errors = [], []
names = (ROOT / '.local/reference/CTViewer/data/snes_na_scenes.txt').read_text().splitlines()
for item in json.loads((QA / 'current-events.json').read_text()):
    if 'error' in item:
        errors.append(item)
        continue
    raw, original = base64.b64decode(item['bytes']), base64.b64decode(item['originalBytes'])
    data, count, old = raw[1:], raw[0], original[1:]
    if count * 32 > len(data):
        errors.append({'location': item['location'], 'error': 'Invalid object table'})
        continue
    pointers = []
    for obj in range(count):
        for fn in range(16):
            at = obj * 32 + fn * 2
            pointers.append({'object': obj, 'function': fn, 'start': int.from_bytes(data[at:at+2], 'little')})
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
            commands.append({'offset': at, 'opcode': c.command, 'args': c.args,
                             'bytes': size, 'raw': list(data[at:at+size]),
                             'unchangedAtOriginalOffset': data[at:at+size] == old[at:at+size],
                             'owners': [p for p in pointers if p['start'] == start]})
            at += size
    except Exception as exc:
        decode_error = {'location': item['location'], 'offset': at, 'error': str(exc)}
        errors.append(decode_error)
    loads = [c for c in commands if c['opcode'] == 0x83 and c['args'][0] == 174]
    if not loads:
        continue
    objects = sorted(set(p['object'] for c in loads for p in c['owners']))
    selected = [c for c in commands if any(p['object'] in objects for p in c['owners'])]
    direct = [c for c in selected if c['opcode'] == 0xAC]
    results.append({'location': item['location'], 'name': names[item['location']],
                   'eventId': item['eventId'], 'offset': item['offset'],
                   'decodedBytes': len(raw), 'decodedSha256': hashlib.sha256(raw).hexdigest(),
                   'originalPacketUnchanged': item['originalPacketUnchanged'],
                   'objects': objects, 'loads': loads,
                   'functionEntries': [p for p in pointers if p['object'] in objects],
                   'actorCommands': selected,
                   'actorDirectFrames': direct,
                   'actorReferencedFrames': sorted(set(c['args'][0] for c in direct)),
                   'allActorLoads': [c for c in commands if c['opcode'] in (0x82, 0x83)],
                   'battleCommands': [c for c in commands if c['opcode'] == 0xD8],
                   'changedSourceCommands': [c for c in commands if not c['unchangedAtOriginalOffset']],
                   'allCommands': commands,
                   'decodeError': decode_error})

def fallback(value):
    if isinstance(value, (bytes, bytearray)):
        return list(value)
    raise TypeError(type(value).__name__)
report = {'status': 'Read-only decoded current Frog King consumers',
          'baselineSha256': '417914abe589d25e377b774009f983867c14617cbf7a7f176c52691c8c9f2e35',
          'decoder': '.local/reference/jot-current/sourcefiles/eventcommand.py',
          'scope': 'All512 location slots attempted; extraction/decoding errors retained. Native direct-frame commands are data, not observed timing.',
          'scenes': results, 'errors': errors}
(DIR / 'current-event-audit.json').write_text(json.dumps(report, indent=2, default=fallback) + '\n')
print(json.dumps({'targetScenes': len(results), 'locations': [s['location'] for s in results],
                  'frameUses': {s['location']: s['actorReferencedFrames'] for s in results},
                  'targetErrors': [s['decodeError'] for s in results if s['decodeError']],
                  'otherDecodeErrors': len(errors)}))
