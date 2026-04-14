#!/usr/bin/env python3
import json, sys
from pathlib import Path
from datetime import datetime

MISSION = Path('/Users/gsn8/live-agent-cli/mission.json')
STATUS = Path('/Users/gsn8/live-agent-cli/dashboard/status.json')


def load_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def save_json(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n')


def sync_status_from_mission(mission):
    status = load_json(STATUS, {})
    status['phase'] = mission.get('mission')
    status['batch'] = mission.get('activeBatch')
    status['currentBlocker'] = mission.get('currentBlocker')
    status['nextStep'] = mission.get('nextAction')
    status['task'] = mission.get('currentStep')
    status['status'] = mission.get('status', status.get('status', 'active'))
    status['updatedAt'] = datetime.now().astimezone().isoformat(timespec='seconds')
    save_json(STATUS, status)


def main(argv):
    mission = load_json(MISSION, {})
    changed = False
    for arg in argv[1:]:
        if '=' not in arg:
            continue
        k, v = arg.split('=', 1)
        if k == 'activeBatch':
            mission[k] = int(v)
        elif k == 'retryCount':
            mission[k] = int(v)
        else:
            mission[k] = v
        changed = True
    if not changed:
        print(json.dumps(mission, indent=2))
        return
    mission['lastUpdated'] = datetime.now().astimezone().isoformat(timespec='seconds')
    save_json(MISSION, mission)
    sync_status_from_mission(mission)
    print(MISSION)


if __name__ == '__main__':
    main(sys.argv)
