export const ACTIONS = {
  create_track: {
    mutating: true,
    args: ["type"],
    category: "tracks",
    batch: 1,
    description: "Create a new MIDI or audio track",
    validate: (args) => ["midi", "audio"].includes(args.type)
  },
  select_track: {
    mutating: false,
    args: ["target", "value"],
    category: "tracks",
    batch: 1,
    description: "Select track by selected/index/name",
    validate: (args) => ["selected", "index", "name"].includes(args.target)
  },
  load_device: {
    mutating: true,
    args: ["track", "device"],
    category: "devices",
    batch: 1,
    description: "Load a device on a target track",
    validate: (args) => !!args.track && typeof args.device === "string"
  },
  arm_track: {
    mutating: true,
    args: ["track", "value"],
    category: "tracks",
    batch: 1,
    description: "Arm/disarm a track",
    validate: (args) => !!args.track && typeof args.value === "boolean"
  },
  set_monitor: {
    mutating: true,
    args: ["track", "mode"],
    category: "tracks",
    batch: 1,
    description: "Set track monitoring mode",
    validate: (args) => !!args.track && ["in", "auto", "off"].includes(args.mode)
  },
  transport_play: { mutating: true, args: [], category: "transport", batch: 1, description: "Start transport", validate: () => true },
  transport_stop: { mutating: true, args: [], category: "transport", batch: 1, description: "Stop transport", validate: () => true },
  transport_record: {
    mutating: true,
    args: ["value"],
    category: "transport",
    batch: 1,
    description: "Enable/disable arrangement record",
    validate: (args) => typeof args.value === "boolean"
  },
  session_record: {
    mutating: true,
    args: ["value"],
    category: "transport",
    batch: 1,
    description: "Enable/disable session record",
    validate: (args) => typeof args.value === "boolean"
  },
  wait: {
    mutating: false,
    args: ["ms"],
    category: "utility",
    batch: 1,
    description: "Pause action pipeline",
    validate: (args) => Number.isFinite(args.ms) && args.ms >= 0
  },
  create_scene: {
    mutating: true,
    args: ["index"],
    category: "scenes",
    batch: 2,
    description: "Create scene at index",
    validate: (args) => Number.isInteger(args.index) && args.index >= 0
  },
  fire_scene: {
    mutating: true,
    args: ["scene"],
    category: "scenes",
    batch: 2,
    description: "Launch scene",
    validate: (args) => Number.isInteger(args.scene) && args.scene >= 0
  },
  stop_scene: {
    mutating: true,
    args: ["scene"],
    category: "scenes",
    batch: 2,
    description: "Stop scene",
    validate: (args) => Number.isInteger(args.scene) && args.scene >= 0
  },
  fire_clip: {
    mutating: true,
    args: ["track", "slot"],
    category: "clips",
    batch: 2,
    description: "Launch clip at track/slot",
    validate: (args) => Number.isInteger(args.track) && args.track >= 0 && Number.isInteger(args.slot) && args.slot >= 0
  },
  stop_clip: {
    mutating: true,
    args: ["track", "slot"],
    category: "clips",
    batch: 2,
    description: "Stop clip at track/slot",
    validate: (args) => Number.isInteger(args.track) && args.track >= 0 && Number.isInteger(args.slot) && args.slot >= 0
  },
  duplicate_clip: {
    mutating: true,
    args: ["track", "slot"],
    category: "clips",
    batch: 2,
    description: "Duplicate clip at track/slot",
    validate: (args) => Number.isInteger(args.track) && args.track >= 0 && Number.isInteger(args.slot) && args.slot >= 0
  },
  delete_clip: {
    mutating: true,
    args: ["track", "slot"],
    category: "clips",
    batch: 2,
    description: "Delete clip at track/slot",
    validate: (args) => Number.isInteger(args.track) && args.track >= 0 && Number.isInteger(args.slot) && args.slot >= 0
  },
  set_clip_loop: {
    mutating: true,
    args: ["track", "slot", "start", "end", "enabled"],
    category: "clips",
    batch: 2,
    description: "Set clip loop bounds",
    validate: (args) => Number.isInteger(args.track) && Number.isInteger(args.slot) && Number.isFinite(args.start) && Number.isFinite(args.end) && args.end > args.start && typeof args.enabled === "boolean"
  },
  set_volume: {
    mutating: true,
    args: ["track", "value"],
    category: "mixer",
    batch: 3,
    description: "Set track volume (0..1)",
    validate: (args) => Number.isInteger(args.track) && Number.isFinite(args.value) && args.value >= 0 && args.value <= 1
  },
  set_pan: {
    mutating: true,
    args: ["track", "value"],
    category: "mixer",
    batch: 3,
    description: "Set track pan (-1..1)",
    validate: (args) => Number.isInteger(args.track) && Number.isFinite(args.value) && args.value >= -1 && args.value <= 1
  },
  set_send: {
    mutating: true,
    args: ["track", "send", "value"],
    category: "mixer",
    batch: 3,
    description: "Set track send amount (0..1)",
    validate: (args) => Number.isInteger(args.track) && typeof args.send === "string" && args.send.length >= 1 && Number.isFinite(args.value) && args.value >= 0 && args.value <= 1
  },
  mute_track: {
    mutating: true,
    args: ["track", "value"],
    category: "mixer",
    batch: 3,
    description: "Mute/unmute track",
    validate: (args) => Number.isInteger(args.track) && typeof args.value === "boolean"
  },
  solo_track: {
    mutating: true,
    args: ["track", "value"],
    category: "mixer",
    batch: 3,
    description: "Solo/unsolo track",
    validate: (args) => Number.isInteger(args.track) && typeof args.value === "boolean"
  },
  list_devices: {
    mutating: false,
    args: ["track"],
    category: "devices",
    batch: 4,
    description: "List devices on track",
    validate: (args) => Number.isInteger(args.track)
  },
  enable_device: {
    mutating: true,
    args: ["track", "device", "value"],
    category: "devices",
    batch: 4,
    description: "Enable/disable device",
    validate: (args) => Number.isInteger(args.track) && (Number.isInteger(args.device) || typeof args.device === "string") && typeof args.value === "boolean"
  },
  set_device_parameter: {
    mutating: true,
    args: ["track", "device", "parameter", "value"],
    category: "devices",
    batch: 4,
    description: "Set device parameter",
    validate: (args) => Number.isInteger(args.track) && (Number.isInteger(args.device) || typeof args.device === "string") && typeof args.parameter === "string" && Number.isFinite(args.value)
  },
  browser_search: {
    mutating: false,
    args: ["query"],
    category: "browser",
    batch: 5,
    description: "Search browser for assets",
    validate: (args) => typeof args.query === "string" && args.query.trim().length > 0
  },
  browser_load_to_track: {
    mutating: true,
    args: ["item", "track"],
    category: "browser",
    batch: 5,
    description: "Load browser item to track",
    validate: (args) => (typeof args.item === "string" || Number.isInteger(args.item)) && Number.isInteger(args.track)
  },
  browser_load_preset: {
    mutating: true,
    args: ["device", "preset"],
    category: "browser",
    batch: 5,
    description: "Load preset on device",
    validate: (args) => typeof args.device === "string" && args.device.length > 0 && typeof args.preset === "string" && args.preset.length > 0
  },
  set_arrangement_position: {
    mutating: true,
    args: ["value"],
    category: "arrangement",
    batch: 6,
    description: "Set arrangement playhead position",
    validate: (args) => Number.isFinite(args.value) && args.value >= 0
  },
  set_loop_region: {
    mutating: true,
    args: ["start", "end", "enabled"],
    category: "arrangement",
    batch: 6,
    description: "Set arrangement loop region",
    validate: (args) => Number.isFinite(args.start) && Number.isFinite(args.end) && args.end > args.start && typeof args.enabled === "boolean"
  },
  set_punch_in: {
    mutating: true,
    args: ["value"],
    category: "arrangement",
    batch: 6,
    description: "Enable/disable punch in",
    validate: (args) => typeof args.value === "boolean"
  },
  set_punch_out: {
    mutating: true,
    args: ["value"],
    category: "arrangement",
    batch: 6,
    description: "Enable/disable punch out",
    validate: (args) => typeof args.value === "boolean"
  },
  set_tempo: {
    mutating: true,
    args: ["value"],
    category: "global",
    batch: 7,
    description: "Set song tempo",
    validate: (args) => Number.isFinite(args.value) && args.value > 0
  },
  set_time_signature: {
    mutating: true,
    args: ["numerator", "denominator"],
    category: "global",
    batch: 7,
    description: "Set time signature",
    validate: (args) => Number.isInteger(args.numerator) && args.numerator > 0 && Number.isInteger(args.denominator) && args.denominator > 0
  },
  set_metronome: {
    mutating: true,
    args: ["value"],
    category: "global",
    batch: 7,
    description: "Enable/disable metronome",
    validate: (args) => typeof args.value === "boolean"
  },
  set_global_quantization: {
    mutating: true,
    args: ["value"],
    category: "global",
    batch: 7,
    description: "Set global quantization",
    validate: (args) => typeof args.value === "string" && args.value.length > 0
  },
  project_new: {
    mutating: true,
    args: ["confirm"],
    category: "project",
    batch: 8,
    description: "Create new set (destructive context switch)",
    validate: (args) => args.confirm === true
  },
  project_save: {
    mutating: true,
    args: ["confirm"],
    category: "project",
    batch: 8,
    description: "Save current set",
    validate: (args) => args.confirm === true
  },
  project_save_as: {
    mutating: true,
    args: ["path", "confirm"],
    category: "project",
    batch: 8,
    description: "Save current set as path",
    validate: (args) => typeof args.path === "string" && args.path.trim().length > 0 && args.confirm === true
  },
  watch_song: {
    mutating: false,
    args: ["fields"],
    category: "watch",
    batch: 9,
    description: "Watch global song fields",
    validate: (args) => Array.isArray(args.fields) && args.fields.length > 0 && args.fields.every((f) => typeof f === "string")
  },
  watch_track: {
    mutating: false,
    args: ["track", "fields"],
    category: "watch",
    batch: 9,
    description: "Watch track fields",
    validate: (args) => Number.isInteger(args.track) && Array.isArray(args.fields) && args.fields.length > 0
  },
  watch_list: {
    mutating: false,
    args: [],
    category: "watch",
    batch: 9,
    description: "List active watches",
    validate: () => true
  },
  unwatch: {
    mutating: false,
    args: ["id"],
    category: "watch",
    batch: 9,
    description: "Remove watch subscription",
    validate: (args) => typeof args.id === "string" && args.id.length > 0
  },
  run_macro: {
    mutating: true,
    args: ["name"],
    category: "macro",
    batch: 10,
    description: "Run named macro sequence",
    validate: (args) => typeof args.name === "string" && args.name.length > 0
  },
  set_confirmation_policy: {
    mutating: true,
    args: ["value"],
    category: "macro",
    batch: 10,
    description: "Set confirmation policy",
    validate: (args) => ["strict", "normal", "relaxed", "cautious"].includes(args.value)
  },
  status: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "status",
    validate: (args) => true
  },
  ping: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "ping",
    validate: (args) => true
  },
  health_check: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "health check",
    validate: (args) => true
  },
  list_adapters: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "list adapters",
    validate: (args) => true
  },
  get_adapter_capabilities: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get adapter capabilities",
    validate: (args) => true
  },
  list_tracks: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "list tracks",
    validate: (args) => true
  },
  list_scenes: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "list scenes",
    validate: (args) => true
  },
  list_track_clips: {
    mutating: false,
    args: ["track"],
    category: "introspection",
    batch: 11,
    description: "list track clips",
    validate: (args) => Number.isInteger(args.track)
  },
  list_clip_slots: {
    mutating: false,
    args: ["track"],
    category: "introspection",
    batch: 11,
    description: "list clip slots",
    validate: (args) => Number.isInteger(args.track)
  },
  list_device_parameters: {
    mutating: false,
    args: ["track"],
    category: "introspection",
    batch: 11,
    description: "list device parameters",
    validate: (args) => Number.isInteger(args.track)
  },
  list_rack_chains: {
    mutating: false,
    args: ["track"],
    category: "introspection",
    batch: 11,
    description: "list rack chains",
    validate: (args) => Number.isInteger(args.track)
  },
  get_tempo: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get tempo",
    validate: (args) => true
  },
  get_time_signature: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get time signature",
    validate: (args) => true
  },
  get_metronome: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get metronome",
    validate: (args) => true
  },
  get_global_quantization: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get global quantization",
    validate: (args) => true
  },
  get_is_playing: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get is playing",
    validate: (args) => true
  },
  get_current_song_time: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get current song time",
    validate: (args) => true
  },
  get_session_record: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get session record",
    validate: (args) => true
  },
  get_arrangement_record: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get arrangement record",
    validate: (args) => true
  },
  get_overdub: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get overdub",
    validate: (args) => true
  },
  get_loop_enabled: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get loop enabled",
    validate: (args) => true
  },
  get_loop_region: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get loop region",
    validate: (args) => true
  },
  get_punch_in: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get punch in",
    validate: (args) => true
  },
  get_punch_out: {
    mutating: false,
    args: [],
    category: "introspection",
    batch: 11,
    description: "get punch out",
    validate: (args) => true
  },
  get_track_volume: {
    mutating: false,
    args: ["track"],
    category: "introspection",
    batch: 11,
    description: "get track volume",
    validate: (args) => Number.isInteger(args.track)
  },
  get_track_pan: {
    mutating: false,
    args: ["track"],
    category: "introspection",
    batch: 11,
    description: "get track pan",
    validate: (args) => Number.isInteger(args.track)
  },
  get_track_send: {
    mutating: false,
    args: ["track", "send"],
    category: "introspection",
    batch: 11,
    description: "get track send",
    validate: (args) => Number.isInteger(args.track) && typeof args.send === 'string' && args.send.length>0
  },
  get_track_monitoring: {
    mutating: false,
    args: ["track"],
    category: "introspection",
    batch: 11,
    description: "get track monitoring",
    validate: (args) => Number.isInteger(args.track)
  },
  get_track_input_routing: {
    mutating: false,
    args: ["track"],
    category: "introspection",
    batch: 11,
    description: "get track input routing",
    validate: (args) => Number.isInteger(args.track)
  },
  get_track_output_routing: {
    mutating: false,
    args: ["track"],
    category: "introspection",
    batch: 11,
    description: "get track output routing",
    validate: (args) => Number.isInteger(args.track)
  },
  get_track_crossfade_assign: {
    mutating: false,
    args: ["track"],
    category: "introspection",
    batch: 11,
    description: "get track crossfade assign",
    validate: (args) => Number.isInteger(args.track)
  },
  get_clip_loop: {
    mutating: false,
    args: ["track", "slot"],
    category: "introspection",
    batch: 11,
    description: "get clip loop",
    validate: (args) => Number.isInteger(args.track) && Number.isInteger(args.slot)
  },
  get_clip_gain: {
    mutating: false,
    args: ["track", "slot"],
    category: "introspection",
    batch: 11,
    description: "get clip gain",
    validate: (args) => Number.isInteger(args.track) && Number.isInteger(args.slot)
  },
  get_clip_transpose: {
    mutating: false,
    args: ["track", "slot"],
    category: "introspection",
    batch: 11,
    description: "get clip transpose",
    validate: (args) => Number.isInteger(args.track) && Number.isInteger(args.slot)
  },
  get_clip_warp: {
    mutating: false,
    args: ["track", "slot"],
    category: "introspection",
    batch: 11,
    description: "get clip warp",
    validate: (args) => Number.isInteger(args.track) && Number.isInteger(args.slot)
  },
  get_device_parameter: {
    mutating: false,
    args: ["track", "device", "parameter"],
    category: "introspection",
    batch: 11,
    description: "get device parameter",
    validate: (args) => Number.isInteger(args.track) && Number.isInteger(args.device) && typeof args.parameter === 'string' && args.parameter.length>0
  },
  get_macro: {
    mutating: false,
    args: ["track", "device", "macro"],
    category: "introspection",
    batch: 11,
    description: "get macro",
    validate: (args) => Number.isInteger(args.track) && Number.isInteger(args.device) && typeof args.macro === 'string' && args.macro.length>0
  },
  create_clip: {
    mutating: true,
    args: ["track", "slot", "length"],
    category: "session",
    batch: 12,
    description: "create clip",
    validate: (args) => Number.isInteger(args.track) && Number.isInteger(args.slot) && Number.isFinite(args.length)
  },
  delete_track: {
    mutating: true,
    args: ["track"],
    category: "session",
    batch: 12,
    description: "delete track",
    validate: (args) => Number.isInteger(args.track)
  },
  duplicate_track: {
    mutating: true,
    args: ["track"],
    category: "session",
    batch: 12,
    description: "duplicate track",
    validate: (args) => Number.isInteger(args.track)
  },
  rename_track: {
    mutating: true,
    args: ["track", "name"],
    category: "session",
    batch: 12,
    description: "rename track",
    validate: (args) => Number.isInteger(args.track) && typeof args.name === 'string' && args.name.length>0
  },
  set_track_color: {
    mutating: true,
    args: ["track", "color"],
    category: "session",
    batch: 12,
    description: "set track color",
    validate: (args) => Number.isInteger(args.track) && typeof args.color === 'string' && args.color.length>0
  },
  delete_scene: {
    mutating: true,
    args: ["scene"],
    category: "session",
    batch: 12,
    description: "delete scene",
    validate: (args) => Number.isInteger(args.scene)
  },
  duplicate_scene: {
    mutating: true,
    args: ["scene"],
    category: "session",
    batch: 12,
    description: "duplicate scene",
    validate: (args) => Number.isInteger(args.scene)
  },
  rename_scene: {
    mutating: true,
    args: ["scene", "name"],
    category: "session",
    batch: 12,
    description: "rename scene",
    validate: (args) => Number.isInteger(args.scene) && typeof args.name === 'string' && args.name.length>0
  },
  rename_clip: {
    mutating: true,
    args: ["track", "slot", "name"],
    category: "session",
    batch: 12,
    description: "rename clip",
    validate: (args) => Number.isInteger(args.track) && Number.isInteger(args.slot) && typeof args.name === 'string' && args.name.length>0
  },
  set_clip_color: {
    mutating: true,
    args: ["track", "slot", "color"],
    category: "session",
    batch: 12,
    description: "set clip color",
    validate: (args) => Number.isInteger(args.track) && Number.isInteger(args.slot) && typeof args.color === 'string' && args.color.length>0
  },
  stop_all_clips: {
    mutating: true,
    args: ["track"],
    category: "session",
    batch: 12,
    description: "stop all clips",
    validate: (args) => Number.isInteger(args.track)
  },
  play: {
    mutating: true,
    args: [],
    category: "session",
    batch: 12,
    description: "play",
    validate: (args) => true
  },
  tap_tempo: {
    mutating: true,
    args: [],
    category: "session",
    batch: 12,
    description: "tap tempo",
    validate: (args) => true
  },
  undo: {
    mutating: true,
    args: [],
    category: "session",
    batch: 12,
    description: "undo",
    validate: (args) => true
  },
  select_device: {
    mutating: true,
    args: ["track", "device"],
    category: "devices",
    batch: 13,
    description: "select device",
    validate: (args) => Number.isInteger(args.track) && (Number.isInteger(args.device) || (typeof args.device === "string" && args.device.length>0))
  },
  select_rack_chain: {
    mutating: true,
    args: ["track", "device", "chain"],
    category: "devices",
    batch: 13,
    description: "select rack chain",
    validate: (args) => Number.isInteger(args.track) && (Number.isInteger(args.device) || (typeof args.device === "string" && args.device.length>0)) && (Number.isInteger(args.chain) || (typeof args.chain === "string" && args.chain.length>0))
  },
  enable_rack_chain: {
    mutating: true,
    args: ["track", "device", "chain", "value"],
    category: "devices",
    batch: 13,
    description: "enable rack chain",
    validate: (args) => Number.isInteger(args.track) && (Number.isInteger(args.device) || (typeof args.device === "string" && args.device.length>0)) && (Number.isInteger(args.chain) || (typeof args.chain === "string" && args.chain.length>0)) && typeof args.value === "boolean"
  },
  set_macro: {
    mutating: true,
    args: ["track", "device", "macro", "value"],
    category: "devices",
    batch: 13,
    description: "set macro",
    validate: (args) => Number.isInteger(args.track) && (Number.isInteger(args.device) || (typeof args.device === "string" && args.device.length>0)) && (Number.isInteger(args.macro) || (typeof args.macro === "string" && args.macro.length>0)) && Number.isFinite(args.value)
  },
  browser_list_categories: {
    mutating: false,
    args: [],
    category: "utility",
    batch: 14,
    description: "browser list categories",
    validate: (args) => true
  },
  browser_preview: {
    mutating: true,
    args: ["item", "value"],
    category: "utility",
    batch: 14,
    description: "browser preview",
    validate: (args) => typeof args.item === "string" && args.item.length>0 && typeof args.value === "boolean"
  },
  browser_load_to_selected_track: {
    mutating: true,
    args: ["item"],
    category: "utility",
    batch: 14,
    description: "browser load to selected track",
    validate: (args) => typeof args.item === "string" && args.item.length>0
  },
  browser_load_sample_to_clip: {
    mutating: true,
    args: ["track", "slot", "file"],
    category: "utility",
    batch: 14,
    description: "browser load sample to clip",
    validate: (args) => Number.isInteger(args.track) && Number.isInteger(args.slot) && typeof args.file === "string" && args.file.length>0
  },
  save_plan: {
    mutating: true,
    args: ["path"],
    category: "utility",
    batch: 14,
    description: "save plan",
    validate: (args) => typeof args.path === "string" && args.path.length>0
  },
  load_plan: {
    mutating: false,
    args: ["path"],
    category: "utility",
    batch: 14,
    description: "load plan",
    validate: (args) => typeof args.path === "string" && args.path.length>0
  },
  dry_run_validate: {
    mutating: false,
    args: ["plan"],
    category: "utility",
    batch: 14,
    description: "dry run validate",
    validate: (args) => typeof args.plan === "object" && args.plan !== null
  },
  execute_plan: {
    mutating: true,
    args: ["plan"],
    category: "utility",
    batch: 14,
    description: "execute plan",
    validate: (args) => typeof args.plan === "object" && args.plan !== null
  },
  arrangement_select_time: {
    mutating: true,
    args: ["start", "end"],
    category: "arrangement",
    batch: 15,
    description: "arrangement select time",
    validate: (args) => Number.isFinite(args.start) && Number.isFinite(args.end)
  },
  arrangement_split_clip: {
    mutating: true,
    args: ["track", "time"],
    category: "arrangement",
    batch: 15,
    description: "arrangement split clip",
    validate: (args) => Number.isInteger(args.track) && Number.isFinite(args.time)
  },
  arrangement_consolidate: {
    mutating: true,
    args: ["track", "start", "end"],
    category: "arrangement",
    batch: 15,
    description: "arrangement consolidate",
    validate: (args) => Number.isInteger(args.track) && Number.isFinite(args.start) && Number.isFinite(args.end)
  },
  arrangement_duplicate_time: {
    mutating: true,
    args: ["start", "end"],
    category: "arrangement",
    batch: 15,
    description: "arrangement duplicate time",
    validate: (args) => Number.isFinite(args.start) && Number.isFinite(args.end)
  },
  arrangement_delete_time: {
    mutating: true,
    args: ["start", "end"],
    category: "arrangement",
    batch: 15,
    description: "arrangement delete time",
    validate: (args) => Number.isFinite(args.start) && Number.isFinite(args.end)
  },
  arrangement_set_locator: {
    mutating: true,
    args: ["name", "time"],
    category: "arrangement",
    batch: 15,
    description: "arrangement set locator",
    validate: (args) => typeof args.name === "string" && args.name.length>0 && Number.isFinite(args.time)
  },
  arrangement_jump_to_locator: {
    mutating: true,
    args: ["name"],
    category: "arrangement",
    batch: 15,
    description: "arrangement jump to locator",
    validate: (args) => typeof args.name === "string" && args.name.length>0
  },
  quantize_clip: {
    mutating: true,
    args: ["track", "slot", "grid", "amount"],
    category: "arrangement",
    batch: 15,
    description: "quantize clip",
    validate: (args) => Number.isInteger(args.track) && Number.isInteger(args.slot) && typeof args.grid === "string" && args.grid.length>0 && Number.isFinite(args.amount)
  },
  watch_clip: {
    mutating: false,
    args: ["track", "slot", "fields"],
    category: "watch",
    batch: 16,
    description: "watch clip",
    validate: (args) => Number.isInteger(args.track) && Number.isInteger(args.slot) && Array.isArray(args.fields) && args.fields.length>0
  },
  watch_device: {
    mutating: false,
    args: ["track", "device", "params"],
    category: "watch",
    batch: 16,
    description: "watch device",
    validate: (args) => Number.isInteger(args.track) && (Number.isInteger(args.device) || typeof args.device === "string") && Array.isArray(args.params) && args.params.length>0
  }
};
