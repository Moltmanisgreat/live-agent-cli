#!/usr/bin/env python3
import json
import time
from pathlib import Path
from datetime import datetime, timezone

MISSION = Path('/Users/gsn8/live-agent-cli/mission.json')
STATUS = Path('/Users/gsn8/live-agent-cli/dashboard/status.json')
BLOCKERS = Path('/Users/gsn8/live-agent-cli/BLOCKERS.md')
STALE_SECONDS = 180
SOFT_STUCK_DEFER_CYCLES = 2
REMINDER = 'Protocol check: verify current step, planner coverage first, then sync/relaunch/test as needed.'
DEFAULT_NEXT = 'Re-evaluate the current batch, identify the blocker class, and take the next concrete action.'
REQUIRED_FIELDS = [
    'batch', 'protocolStep', 'protocolLabel', 'task', 'lastAction',
    'lastResult', 'nextStep', 'activity'
]


def parse_ts(value: str):
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def load_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def save_json(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n')


def append_blocker_note(batch, blocker, next_step):
    stamp = datetime.now().astimezone().isoformat(timespec='seconds')
    text = BLOCKERS.read_text() if BLOCKERS.exists() else '# LiveAgent Blockers\n\n'
    note = f"\n### AUTO-DEFER-{batch}-{stamp}\n- Type: soft\n- Area: Batch {batch}\n- Status: deferred\n- Summary: Auto-deferred by watchdog after repeated soft-stuck cycles.\n- Exact symptoms:\n  - {blocker}\n- Next hypothesis:\n  - {next_step}\n"
    BLOCKERS.write_text(text + note)


def defer_next_batch(mission, status):
    current = mission.get('activeBatch', status.get('batch', 0))
    batches = mission.get('batches', [])
    next_batch = None
    for b in batches:
        if b.get('id') == current:
            b['status'] = 'deferred'
        elif b.get('id', 0) > current and b.get('status') in ('pending', 'active') and next_batch is None:
            next_batch = b
    if next_batch is not None:
        next_batch['status'] = 'active'
        mission['activeBatch'] = next_batch['id']
        mission['status'] = 'active'
        mission['currentStep'] = f"Continue mission on Batch {next_batch['id']}: {next_batch.get('name', 'next batch')}"
        mission['currentBlocker'] = ''
        mission['nextAction'] = f"Resume Batch {next_batch['id']} and continue the protocol from planner coverage."
        mission['retryCount'] = 0
        status['status'] = 'deferred'
        status['activity'] = 'deferred'
        status['currentBlocker'] = f"Deferred Batch {current} after repeated soft-stuck cycles"
        status['nextStep'] = mission['nextAction']
        status['batch'] = next_batch['id']
        status['task'] = mission['currentStep']
        status['protocolLabel'] = f"auto-deferred Batch {current}, advanced to Batch {next_batch['id']}"
        status['lastAction'] = f"watchdog deferred Batch {current} and advanced mission queue"
        status['lastResult'] = 'deferred'
        status['softStuckCycles'] = 0
        append_blocker_note(current, status['currentBlocker'], status['nextStep'])
    else:
        mission['status'] = 'blocked'
        status['status'] = 'dead-stuck'
        status['activity'] = 'dead-stuck'
        status['currentBlocker'] = mission.get('currentBlocker') or 'No remaining batch to advance to.'


def main():
    while True:
        try:
            mission = load_json(MISSION, {})
            data = load_json(STATUS, {})
            if mission:
                data['phase'] = mission.get('mission', data.get('phase'))
                data['batch'] = mission.get('activeBatch', data.get('batch'))
                data['task'] = mission.get('currentStep', data.get('task'))
                data['currentBlocker'] = mission.get('currentBlocker', data.get('currentBlocker'))
                data['nextStep'] = mission.get('nextAction', data.get('nextStep'))
            now = datetime.now().astimezone()
            ts = parse_ts(data.get('updatedAt', ''))
            stale = True
            if ts is not None:
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc).astimezone()
                stale = (now - ts).total_seconds() > STALE_SECONDS
            missing = [k for k in REQUIRED_FIELDS if not data.get(k)]
            data['protocolReminder'] = REMINDER
            data['watchdog'] = 'stale' if stale else ('missing-checkpoint' if missing else 'ok')
            data['checkpointComplete'] = not missing
            data['checkpointMissing'] = missing
            if stale:
                stuck_type = data.get('stuckType', 'soft')
                if stuck_type == 'dead':
                    data['status'] = 'dead-stuck'
                    data['activity'] = 'dead-stuck'
                else:
                    data['status'] = 'soft-stuck'
                    data['activity'] = 'soft-stuck'
                    data['softStuckCycles'] = int(data.get('softStuckCycles', 0)) + 1
                    if data['softStuckCycles'] >= SOFT_STUCK_DEFER_CYCLES and mission:
                        defer_next_batch(mission, data)
                data['heartbeat'] = 'stale - escalation triggered'
                data['currentBlocker'] = data.get('currentBlocker') or 'Status heartbeat stale; agent must re-evaluate protocol step'
                data['nextStep'] = data.get('nextStep') or DEFAULT_NEXT
                data['lastResult'] = data.get('lastResult') or 'stalled'
            elif missing:
                data['status'] = 'blocked'
                data['activity'] = 'blocked'
                data['heartbeat'] = 'checkpoint incomplete'
                data['currentBlocker'] = f"Missing checkpoint fields: {', '.join(missing)}"
                data['nextStep'] = data.get('nextStep') or 'Fill the missing checkpoint fields before continuing.'
            else:
                data['heartbeat'] = 'alive'
                data['softStuckCycles'] = 0
                if data.get('status') in ('soft-stuck', 'blocked') and not data.get('currentBlocker'):
                    data['status'] = 'active'
            data['updatedAt'] = datetime.now().astimezone().isoformat(timespec='seconds')
            if mission:
                mission['lastUpdated'] = data['updatedAt']
                save_json(MISSION, mission)
            save_json(STATUS, data)
        except Exception:
            pass
        time.sleep(60)


if __name__ == '__main__':
    main()
