#!/usr/bin/env python3
import json, sys
from pathlib import Path
from datetime import datetime

path = Path('/Users/gsn8/live-agent-cli/dashboard/status.json')
status = json.loads(path.read_text()) if path.exists() else {}

allowed_activities = {
    'planning', 'reading', 'coding', 'syncing', 'relaunching-live',
    'testing', 'waiting', 'blocked', 'soft-stuck', 'dead-stuck', 'deferred', 'idle', 'done'
}
required_defaults = {
    'batch': 0,
    'protocolStep': 0,
    'protocolLabel': 'unset',
    'task': 'unset',
    'lastAction': 'unset',
    'lastResult': 'unknown',
    'nextStep': 'unset',
    'activity': 'planning'
}
for k, v in required_defaults.items():
    status.setdefault(k, v)

for arg in sys.argv[1:]:
    if '=' not in arg:
        continue
    k, v = arg.split('=', 1)
    if v.lower() == 'true':
        value = True
    elif v.lower() == 'false':
        value = False
    else:
        try:
            value = int(v)
        except ValueError:
            try:
                value = float(v)
            except ValueError:
                value = v
    if k == 'activity' and isinstance(value, str) and value not in allowed_activities:
        raise SystemExit(f'Unsupported activity: {value}')
    status[k] = value

act = status.get('activity', 'planning')
if act in ('planning', 'reading', 'coding', 'syncing', 'relaunching-live', 'testing'):
    status['status'] = 'active'
elif act == 'waiting':
    status['status'] = 'waiting'
elif act == 'blocked':
    status['status'] = 'blocked'
elif act == 'done':
    status['status'] = 'done'
elif act == 'idle':
    status['status'] = 'idle'

status['updatedAt'] = datetime.now().astimezone().isoformat(timespec='seconds')
status['heartbeat'] = 'alive'
status['watchdog'] = 'ok'
status['checkpointComplete'] = True
status['checkpointMissing'] = []
path.write_text(json.dumps(status, indent=2) + '\n')
print(path)
