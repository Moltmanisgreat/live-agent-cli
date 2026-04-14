import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../src/validator.js';

test('wave11 actions are supported by validator', () => {
  const plan = {
    version: '0.1',
    intent: 'wave11',
    adapter: 'showcontrol-osc',
    actions: [
    {
        "action": "status",
        "args": {}
    },
    {
        "action": "ping",
        "args": {}
    },
    {
        "action": "health_check",
        "args": {}
    },
    {
        "action": "list_adapters",
        "args": {}
    },
    {
        "action": "get_adapter_capabilities",
        "args": {}
    },
    {
        "action": "list_tracks",
        "args": {}
    },
    {
        "action": "list_scenes",
        "args": {}
    },
    {
        "action": "list_track_clips",
        "args": {
            "track": 1
        }
    },
    {
        "action": "list_clip_slots",
        "args": {
            "track": 1
        }
    },
    {
        "action": "list_device_parameters",
        "args": {
            "track": 1
        }
    },
    {
        "action": "list_rack_chains",
        "args": {
            "track": 1
        }
    },
    {
        "action": "get_tempo",
        "args": {}
    },
    {
        "action": "get_time_signature",
        "args": {}
    },
    {
        "action": "get_metronome",
        "args": {}
    },
    {
        "action": "get_global_quantization",
        "args": {}
    },
    {
        "action": "get_is_playing",
        "args": {}
    },
    {
        "action": "get_current_song_time",
        "args": {}
    },
    {
        "action": "get_session_record",
        "args": {}
    },
    {
        "action": "get_arrangement_record",
        "args": {}
    },
    {
        "action": "get_overdub",
        "args": {}
    },
    {
        "action": "get_loop_enabled",
        "args": {}
    },
    {
        "action": "get_loop_region",
        "args": {}
    },
    {
        "action": "get_punch_in",
        "args": {}
    },
    {
        "action": "get_punch_out",
        "args": {}
    },
    {
        "action": "get_track_volume",
        "args": {
            "track": 1
        }
    },
    {
        "action": "get_track_pan",
        "args": {
            "track": 1
        }
    },
    {
        "action": "get_track_send",
        "args": {
            "track": 1,
            "send": "A"
        }
    },
    {
        "action": "get_track_monitoring",
        "args": {
            "track": 1
        }
    },
    {
        "action": "get_track_input_routing",
        "args": {
            "track": 1
        }
    },
    {
        "action": "get_track_output_routing",
        "args": {
            "track": 1
        }
    },
    {
        "action": "get_track_crossfade_assign",
        "args": {
            "track": 1
        }
    },
    {
        "action": "get_clip_loop",
        "args": {
            "track": 1,
            "slot": 1
        }
    },
    {
        "action": "get_clip_gain",
        "args": {
            "track": 1,
            "slot": 1
        }
    },
    {
        "action": "get_clip_transpose",
        "args": {
            "track": 1,
            "slot": 1
        }
    },
    {
        "action": "get_clip_warp",
        "args": {
            "track": 1,
            "slot": 1
        }
    },
    {
        "action": "get_device_parameter",
        "args": {
            "track": 1,
            "device": 1,
            "parameter": "cutoff"
        }
    },
    {
        "action": "get_macro",
        "args": {
            "track": 1,
            "device": 1,
            "macro": "Macro 1"
        }
    }
],
    safety: { mutating: false, requiresExecuteFlag: false }
  };
  const result = validatePlan(plan);
  assert.equal(result.ok, true, result.errors.join('\n'));
});
