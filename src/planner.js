function hasAny(input, terms) {
  return terms.some((t) => input.includes(t));
}

function extractNumberAfter(input, token, fallback = 1) {
  const re = new RegExp(`${token}\\s*(\\d+)`);
  const m = input.match(re);
  return m ? Number(m[1]) : fallback;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractDecimalAfter(input, token, fallback = 0) {
  const tokenPattern = token instanceof RegExp ? token.source : escapeRegExp(token);
  const re = new RegExp(`${tokenPattern}\\s*(?:to\\s*)?(-?\\d+(?:\\.\\d+)?)`, 'i');
  const m = input.match(re);
  return m ? Number(m[1]) : fallback;
}

export function planFromIntent(intent, adapter = "showcontrol-osc") {
  const input = intent.toLowerCase();
  const actions = [];

  if (hasAny(input, ["new midi track", "create midi track", "make a midi track"])) {
    actions.push({ action: "create_track", args: { type: "midi" } });
  }

  if (hasAny(input, ["new audio track", "create audio track", "make an audio track"])) {
    actions.push({ action: "create_track", args: { type: "audio" } });
  }

  if (hasAny(input, ["drum rack", "load drum kit", "load drumrack", "load drum rack"])) {
    actions.push({ action: "load_device", args: { track: "selected", device: "Drum Rack" } });
  }

  if (hasAny(input, ["arm track", "arm it", "arm selected"])) {
    actions.push({ action: "arm_track", args: { track: "selected", value: true } });
  }

  if (hasAny(input, ["monitor in", "set monitor in"])) {
    actions.push({ action: "set_monitor", args: { track: "selected", mode: "in" } });
  }

  if (hasAny(input, ["monitor auto", "set monitor auto"])) {
    actions.push({ action: "set_monitor", args: { track: "selected", mode: "auto" } });
  }

  if (hasAny(input, ["monitor off", "set monitor off"])) {
    actions.push({ action: "set_monitor", args: { track: "selected", mode: "off" } });
  }

  const isSessionRecordIntent = hasAny(input, ["session record on", "enable session record", "start session recording", "session record off", "disable session record", "stop session recording"]);

  if (hasAny(input, ["session record on", "enable session record", "start session recording"])) {
    actions.push({ action: "session_record", args: { value: true } });
  }

  if (hasAny(input, ["session record off", "disable session record", "stop session recording"])) {
    actions.push({ action: "session_record", args: { value: false } });
  }

  if (!isSessionRecordIntent && hasAny(input, ["record on", "start record", "start recording", "enable record"])) {
    actions.push({ action: "transport_record", args: { value: true } });
  }

  if (!isSessionRecordIntent && hasAny(input, ["record off", "disable record", "stop recording"])) {
    actions.push({ action: "transport_record", args: { value: false } });
  }

  const isSceneStopIntent = hasAny(input, ["stop scene"]);
  const isClipStopIntent = hasAny(input, ["stop clip"]);
  const isMacroIntent = hasAny(input, ["run macro", "execute macro", "macro "]);
  const isWatchIntent = hasAny(input, ["watch tempo", "watch song", "watch global", "watch track"]);
  const isQueryIntent = hasAny(input, ["is it playing", "is playing", "get is_playing", "check if playing", "playing?", "what is the tempo", "get tempo", "check tempo", "show tempo", "tempo?", "time signature", "get time signature", "check time signature", "what signature", "status", "what is the status"]);

  if (!isMacroIntent && !isWatchIntent && !isQueryIntent && hasAny(input, ["play", "start playback", "start transport"])) {
    actions.push({ action: "transport_play", args: {} });
  }

  if (!isSceneStopIntent && !isClipStopIntent && hasAny(input, ["stop", "stop transport"])) {
    actions.push({ action: "transport_stop", args: {} });
  }

  if (hasAny(input, ["create scene", "new scene", "add scene"])) {
    const index = extractNumberAfter(input, 'scene', 1);
    actions.push({ action: "create_scene", args: { index } });
  }

  if (hasAny(input, ["fire scene", "launch scene", "trigger scene"])) {
    const scene = extractNumberAfter(input, 'scene', 1);
    actions.push({ action: "fire_scene", args: { scene } });
  }

  if (hasAny(input, ["stop scene"])) {
    const scene = extractNumberAfter(input, 'scene', 1);
    actions.push({ action: "stop_scene", args: { scene } });
  }

  if (hasAny(input, ["fire clip", "launch clip", "trigger clip"])) {
    const track = extractNumberAfter(input, 'track', 1);
    const slot = extractNumberAfter(input, 'slot', 1);
    actions.push({ action: "fire_clip", args: { track, slot } });
  }

  if (hasAny(input, ["stop clip"])) {
    const track = extractNumberAfter(input, 'track', 1);
    const slot = extractNumberAfter(input, 'slot', 1);
    actions.push({ action: "stop_clip", args: { track, slot } });
  }

  if (hasAny(input, ["duplicate clip"])) {
    const track = extractNumberAfter(input, 'track', 1);
    const slot = extractNumberAfter(input, 'slot', 1);
    actions.push({ action: "duplicate_clip", args: { track, slot } });
  }

  if (hasAny(input, ["create clip", "new clip", "make a clip"])) {
    const track = extractNumberAfter(input, 'track', 1);
    const slot = extractNumberAfter(input, 'slot', 1);
    const lengthMatch = input.match(/length\s*(?:to\s*)?(\d+(?:\.\d+)?)/i);
    const length = lengthMatch ? Number(lengthMatch[1]) : 4;
    actions.push({ action: "create_clip", args: { track, slot, length } });
  }

  if (hasAny(input, ["delete clip", "remove clip"])) {
    const track = extractNumberAfter(input, 'track', 1);
    const slot = extractNumberAfter(input, 'slot', 1);
    actions.push({ action: "delete_clip", args: { track, slot } });
  }

  const isLoopRegionIntent = hasAny(input, ["loop region", "loop from", "set loop from", "enable loop"]);

  if (!isLoopRegionIntent && hasAny(input, ["set clip loop", "loop clip", "set loop"])) {
    const track = extractNumberAfter(input, 'track', 1);
    const slot = extractNumberAfter(input, 'slot', 1);
    const bars = input.match(/from\s*(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)/);
    const start = bars ? Number(bars[1]) : 1;
    const end = bars ? Number(bars[2]) : 4;
    actions.push({ action: "set_clip_loop", args: { track, slot, start, end, enabled: true } });
  }

  if (hasAny(input, ["set volume", "volume to"])) {
    const track = extractNumberAfter(input, 'track', 1);
    const valueMatch = input.match(/(?:set\s+volume(?:\s+track\s*\d+)?\s+to|volume\s+to)\s*(-?\d+(?:\.\d+)?)/i);
    const value = valueMatch ? Number(valueMatch[1]) : 0.75;
    actions.push({ action: "set_volume", args: { track, value } });
  }

  if (hasAny(input, ["set pan", "pan to"])) {
    const track = extractNumberAfter(input, 'track', 1);
    const valueMatch = input.match(/(?:set\s+pan(?:\s+track\s*\d+)?\s+to|pan\s+to)\s*(-?\d+(?:\.\d+)?)/i);
    const value = valueMatch ? Number(valueMatch[1]) : 0;
    actions.push({ action: "set_pan", args: { track, value } });
  }

  if (hasAny(input, ["send a", "set send", "send b", "send c"])) {
    const track = extractNumberAfter(input, 'track', 1);
    const sendMatch = input.match(/send\s*([a-z])/i);
    const send = sendMatch ? sendMatch[1].toUpperCase() : 'A';
    const valueMatch = input.match(/to\s*(-?\d+(?:\.\d+)?)/i);
    const value = valueMatch ? Number(valueMatch[1]) : 0.5;
    actions.push({ action: "set_send", args: { track, send, value } });
  }

  if (hasAny(input, ["mute track", "mute it", "mute selected"])) {
    const track = extractNumberAfter(input, 'track', 1);
    actions.push({ action: "mute_track", args: { track, value: true } });
  }

  if (hasAny(input, ["unmute track", "unmute it"])) {
    const track = extractNumberAfter(input, 'track', 1);
    actions.push({ action: "mute_track", args: { track, value: false } });
  }

  if (hasAny(input, ["solo track", "solo it"])) {
    const track = extractNumberAfter(input, 'track', 1);
    actions.push({ action: "solo_track", args: { track, value: true } });
  }

  if (hasAny(input, ["unsolo track", "unsolo it"])) {
    const track = extractNumberAfter(input, 'track', 1);
    actions.push({ action: "solo_track", args: { track, value: false } });
  }

  if (hasAny(input, ["list devices", "show devices"])) {
    const track = extractNumberAfter(input, 'track', 1);
    actions.push({ action: "list_devices", args: { track } });
  }

  if (hasAny(input, ["set device", "parameter", "set parameter"])) {
    if (input.includes('parameter')) {
      const track = extractNumberAfter(input, 'track', 1);
      const device = extractNumberAfter(input, 'device', 1);
      const paramMatch = input.match(/parameter\s+([a-zA-Z0-9_\-]+)/i);
      const parameter = paramMatch ? paramMatch[1] : 'param1';
      const valueMatch = input.match(/to\s*(-?\d+(?:\.\d+)?)/);
      const value = valueMatch ? Number(valueMatch[1]) : 0.5;
      actions.push({ action: "set_device_parameter", args: { track, device, parameter, value } });
    }
  }

  if (hasAny(input, ["enable device", "disable device"])) {
    const track = extractNumberAfter(input, 'track', 1);
    const device = extractNumberAfter(input, 'device', 1);
    const value = input.includes('disable') ? false : true;
    actions.push({ action: "enable_device", args: { track, device, value } });
  }

  if (hasAny(input, ["search browser", "find in browser", "browser for"])) {
    let query = 'sample';
    const m = input.match(/(?:search browser for|find in browser|browser for)\s+(.+?)(?:\s+then|$)/i);
    if (m) query = m[1].trim();
    actions.push({ action: "browser_search", args: { query } });
  }

  if (hasAny(input, ["load item", "load to track"])) {
    const itemMatch = input.match(/item\s*(\d+)/i);
    const item = itemMatch ? itemMatch[1] : '1';
    const track = extractNumberAfter(input, 'track', 1);
    actions.push({ action: "browser_load_to_track", args: { item, track } });
  }

  if (hasAny(input, ["load preset", "preset"])) {
    const deviceMatch = input.match(/on\s+([a-zA-Z0-9_\-]+)/i);
    const device = deviceMatch ? deviceMatch[1] : 'Operator';
    const presetMatch = input.match(/preset\s+(.+?)\s+on\s+/i) || input.match(/preset\s+(.+)$/i);
    const preset = presetMatch ? presetMatch[1].trim() : 'Default';
    actions.push({ action: "browser_load_preset", args: { device, preset } });
  }

  if (hasAny(input, ["set arrangement position", "arrangement position to", "set playhead to"])) {
    const m = input.match(/(?:position to|playhead to)\s*(-?\d+(?:\.\d+)?)/i);
    const value = m ? Number(m[1]) : 0;
    actions.push({ action: "set_arrangement_position", args: { value } });
  }

  if (hasAny(input, ["loop region", "loop from", "set loop from", "enable loop"])) {
    const m = input.match(/from\s*(-?\d+(?:\.\d+)?)\s*to\s*(-?\d+(?:\.\d+)?)/i);
    const start = m ? Number(m[1]) : 1;
    const end = m ? Number(m[2]) : 5;
    const enabled = !input.includes('disable loop');
    actions.push({ action: "set_loop_region", args: { start, end, enabled } });
  }

  if (hasAny(input, ["punch in"])) {
    const value = !input.includes('disable punch in');
    actions.push({ action: "set_punch_in", args: { value } });
  }

  if (hasAny(input, ["punch out"])) {
    const value = !input.includes('disable punch out');
    actions.push({ action: "set_punch_out", args: { value } });
  }

  if (hasAny(input, ["set tempo", "tempo to"])) {
    const m = input.match(/tempo\s*(?:to\s*)?(-?\d+(?:\.\d+)?)/i);
    const value = m ? Number(m[1]) : 120;
    actions.push({ action: "set_tempo", args: { value } });
  }

  if (hasAny(input, ["time signature", "set signature", "signature to"])) {
    const slash = input.match(/(\d+)\s*\/\s*(\d+)/);
    const spaced = input.match(/(?:time signature|set signature|signature to)\s*(?:to\s*)?(\d+)\s+(\d+)/i);
    const m = slash || spaced;
    const numerator = m ? Number(m[1]) : 4;
    const denominator = m ? Number(m[2]) : 4;
    actions.push({ action: "set_time_signature", args: { numerator, denominator } });
  }

  if (hasAny(input, ["metronome"])) {
    const value = !input.includes('disable metronome');
    actions.push({ action: "set_metronome", args: { value } });
  }

  if (hasAny(input, ["global quantization", "quantization to", "set quantization"])) {
    const slash = input.match(/quantization\s*(?:to\s*)?([0-9]+\/[0-9]+)/i);
    const bars = input.match(/quantization\s*(?:to\s*)?(\d+)\s*bar/i);
    let value = '1/16';
    if (slash) value = slash[1];
    else if (bars) value = `${bars[1]} bar`;
    actions.push({ action: "set_global_quantization", args: { value } });
  }

  if (hasAny(input, ["new set", "new project", "new live set"])) {
    actions.push({ action: "project_new", args: { confirm: true } });
  }

  const isSaveAsIntent = hasAny(input, ["save as", "save set as", "save project as"]);

  if (isSaveAsIntent) {
    const m = input.match(/save(?:\s+(?:set|project))?\s+as\s+(.+?)(?=\s+(?:and|then)\s+save\b|$)/i);
    const path = m ? m[1].trim() : 'untitled.als';
    actions.push({ action: "project_save_as", args: { path, confirm: true } });
  }

  const isPlainSaveIntent = !isSaveAsIntent && hasAny(input, ["save project", "save live set", "save now"]) || /(?:^|\s)(?:and|then)\s+save\s+set\b/i.test(input) || /(?:^|\s)save\s+set\b(?!\s+as)/i.test(input);

  if (isPlainSaveIntent) {
    actions.push({ action: "project_save", args: { confirm: true } });
  }

  if (hasAny(input, ["watch tempo", "watch song", "watch global"])) {
    const fields = [];
    if (input.includes('tempo')) fields.push('tempo');
    if (input.includes('playing')) fields.push('is_playing');
    if (!fields.length) fields.push('tempo');
    actions.push({ action: "watch_song", args: { fields } });
  }

  if (hasAny(input, ["watch track"]) || (input.includes('watch') && input.includes('track'))) {
    const track = extractNumberAfter(input, 'track', 1);
    const fields = [];
    if (input.includes('volume')) fields.push('volume');
    if (input.includes('pan')) fields.push('pan');
    if (input.includes('mute')) fields.push('mute');
    if (!fields.length) fields.push('volume');
    actions.push({ action: "watch_track", args: { track, fields } });
  }

  if (hasAny(input, ["list watches", "watch list"])) {
    actions.push({ action: "watch_list", args: {} });
  }

  if (hasAny(input, ["unwatch", "remove watch"])) {
    const m = input.match(/unwatch\s+([a-zA-Z0-9\-_]+)/i) || input.match(/remove watch\s+([a-zA-Z0-9\-_]+)/i);
    const id = m ? m[1] : 'watch-1';
    actions.push({ action: "unwatch", args: { id } });
  }

  if (hasAny(input, ["run macro", "execute macro", "macro "])) {
    const m = input.match(/(?:run|execute)\s+macro\s+(.+?)(?=\s+(?:and|then)\s+(?:set\s+confirmation\s+policy|confirmation\s+policy|set\s+policy|policy\s+to)\b|$)/i) || input.match(/macro\s+(.+?)(?=\s+(?:and|then)\s+(?:set\s+confirmation\s+policy|confirmation\s+policy|set\s+policy|policy\s+to)\b|$)/i);
    const name = m ? m[1].trim() : 'default_macro';
    actions.push({ action: "run_macro", args: { name } });
  }

  if (hasAny(input, ["confirmation policy", "set policy", "policy to"])) {
    const m = input.match(/(?:policy to|confirmation policy to)\s+(strict|normal|relaxed|cautious)/i);
    const value = m ? m[1].toLowerCase() : 'normal';
    actions.push({ action: "set_confirmation_policy", args: { value } });
  }


  // ===== GET/LIST/IS QUERIES =====

  // Status / Song Info
  if (hasAny(input, ["status", "what is the status", "get status"])) {
    actions.push({ action: "status", args: {} });
  }

  if (hasAny(input, ["what is the tempo", "get tempo", "check tempo", "show tempo", "tempo?"]) && !hasAny(input, ["set tempo", "change tempo"])) {
    actions.push({ action: "get_tempo", args: {} });
  }

  if (hasAny(input, ["is it playing", "is playing", "get is_playing", "check if playing", "playing?"]) && !hasAny(input, ["start playing"])) {
    actions.push({ action: "get_is_playing", args: {} });
  }

  if (hasAny(input, ["time signature", "get time signature", "check time signature", "what signature"]) && !hasAny(input, ["set time signature", "change time signature"])) {
    actions.push({ action: "get_time_signature", args: {} });
  }

  if (hasAny(input, ["metronome", "get metronome", "is metronome on", "check metronome"]) && !hasAny(input, ["set metronome", "enable metronome", "disable metronome"])) {
    actions.push({ action: "get_metronome", args: {} });
  }

  if (hasAny(input, ["quantization", "get quantization", "current quantization"]) && !hasAny(input, ["set quantization"])) {
    actions.push({ action: "get_global_quantization", args: {} });
  }

  if (hasAny(input, ["current song time", "song time", "get song time", "playhead position"]) && !hasAny(input, ["set arrangement position", "set song time"])) {
    actions.push({ action: "get_current_song_time", args: {} });
  }

  if (hasAny(input, ["loop enabled", "is loop on", "get loop enabled"]) && !hasAny(input, ["enable loop", "disable loop", "set loop"])) {
    actions.push({ action: "get_loop_enabled", args: {} });
  }

  if (hasAny(input, ["loop region", "get loop region"]) && !hasAny(input, ["set loop"])) {
    actions.push({ action: "get_loop_region", args: {} });
  }

  if (hasAny(input, ["punch in", "is punch in on", "get punch in"]) && !hasAny(input, ["set punch in", "enable punch in", "disable punch in"])) {
    actions.push({ action: "get_punch_in", args: {} });
  }

  if (hasAny(input, ["punch out", "is punch out on", "get punch out"]) && !hasAny(input, ["set punch out", "enable punch out", "disable punch out"])) {
    actions.push({ action: "get_punch_out", args: {} });
  }

  if (hasAny(input, ["overdub", "is overdub on", "get overdub", "arrangement overdub"]) && !hasAny(input, ["set overdub"])) {
    actions.push({ action: "get_overdub", args: {} });
  }

  if (hasAny(input, ["session record", "is session record on", "get session record"]) && !hasAny(input, ["enable session record", "disable session record"])) {
    actions.push({ action: "get_session_record", args: {} });
  }

  if (hasAny(input, ["arrangement record", "is arrangement record on", "get arrangement record"]) && !hasAny(input, ["enable arrangement record"])) {
    actions.push({ action: "get_arrangement_record", args: {} });
  }

  // Track Info
  if (hasAny(input, ["what tracks", "list tracks", "show tracks", "get tracks", "track list", "all tracks"]) && !hasAny(input, ["create track", "delete track", "select track"])) {
    actions.push({ action: "list_tracks", args: {} });
  }

  if (hasAny(input, ["what scenes", "list scenes", "show scenes", "get scenes", "scene list"]) && !hasAny(input, ["create scene", "delete scene", "fire scene"])) {
    actions.push({ action: "list_scenes", args: {} });
  }

  if (hasAny(input, ["track volume", "get track volume", "volume of track"]) && !hasAny(input, ["set volume", "set track volume"])) {
    const track = extractNumberAfter(input, "track", 1);
    actions.push({ action: "get_track_volume", args: { track } });
  }

  if (hasAny(input, ["track pan", "pan of track", "get track pan"]) && !hasAny(input, ["set pan", "set track pan"])) {
    const track = extractNumberAfter(input, "track", 1);
    actions.push({ action: "get_track_pan", args: { track } });
  }

  if (hasAny(input, ["track send", "get track send", "send level"]) && !hasAny(input, ["set send"])) {
    const track = extractNumberAfter(input, "track", 1);
    actions.push({ action: "get_track_send", args: { track } });
  }

  if (hasAny(input, ["track monitoring", "get track monitoring", "monitoring mode"]) && !hasAny(input, ["set monitor"])) {
    const track = extractNumberAfter(input, "track", 1);
    actions.push({ action: "get_track_monitoring", args: { track } });
  }

  if (hasAny(input, ["track routing", "input routing", "output routing", "get track routing"]) && !hasAny(input, ["set routing"])) {
    const track = extractNumberAfter(input, "track", 1);
    if (input.includes("input")) {
      actions.push({ action: "get_track_input_routing", args: { track } });
    } else if (input.includes("output")) {
      actions.push({ action: "get_track_output_routing", args: { track } });
    } else {
      actions.push({ action: "get_track_input_routing", args: { track } });
    }
  }

  if (hasAny(input, ["track crossfade", "get track crossfade"]) && !hasAny(input, ["set crossfade"])) {
    const track = extractNumberAfter(input, "track", 1);
    actions.push({ action: "get_track_crossfade_assign", args: { track } });
  }

  // Clip Info
  if (hasAny(input, ["track clips", "clips on track", "list track clips", "get track clips"]) && !hasAny(input, ["fire clip", "stop clip"])) {
    const track = extractNumberAfter(input, "track", 1);
    actions.push({ action: "list_track_clips", args: { track } });
  }

  if (hasAny(input, ["clip slots", "clip slots on track", "list clip slots"]) && !hasAny(input, ["fire clip", "stop clip"])) {
    const track = extractNumberAfter(input, "track", 1);
    actions.push({ action: "list_clip_slots", args: { track } });
  }

  if (hasAny(input, ["clip loop", "get clip loop"]) && !hasAny(input, ["set clip loop", "set loop"])) {
    const track = extractNumberAfter(input, "track", 1);
    const slot = extractNumberAfter(input, "slot", 1);
    actions.push({ action: "get_clip_loop", args: { track, slot } });
  }

  if (hasAny(input, ["clip gain", "get clip gain"]) && !hasAny(input, ["set clip gain"])) {
    const track = extractNumberAfter(input, "track", 1);
    const slot = extractNumberAfter(input, "slot", 1);
    actions.push({ action: "get_clip_gain", args: { track, slot } });
  }

  if (hasAny(input, ["clip transpose", "get clip transpose"]) && !hasAny(input, ["set clip transpose"])) {
    const track = extractNumberAfter(input, "track", 1);
    const slot = extractNumberAfter(input, "slot", 1);
    actions.push({ action: "get_clip_transpose", args: { track, slot } });
  }

  if (hasAny(input, ["clip warp", "get clip warp"]) && !hasAny(input, ["set clip warp"])) {
    const track = extractNumberAfter(input, "track", 1);
    const slot = extractNumberAfter(input, "slot", 1);
    actions.push({ action: "get_clip_warp", args: { track, slot } });
  }

  // Device Info
  if (hasAny(input, ["track devices", "devices on track", "list devices on track", "get track devices"]) && !hasAny(input, ["load device", "enable device"])) {
    const track = extractNumberAfter(input, "track", 1);
    actions.push({ action: "list_devices", args: { track } });
  }

  if (hasAny(input, ["device parameters", "parameters of device", "list device parameters"]) && !hasAny(input, ["set device parameter"])) {
    const track = extractNumberAfter(input, "track", 1);
    const device = extractNumberAfter(input, "device", 1);
    actions.push({ action: "list_device_parameters", args: { track, device } });
  }

  if (hasAny(input, ["device parameter", "get device parameter"]) && !hasAny(input, ["set device parameter"])) {
    const track = extractNumberAfter(input, "track", 1);
    const device = extractNumberAfter(input, "device", 1);
    const paramMatch = input.match(/parameters+([a-zA-Z0-9_\-]+)/i);
    const parameter = paramMatch ? paramMatch[1] : "param1";
    actions.push({ action: "get_device_parameter", args: { track, device, parameter } });
  }

  // Rack / Chain Info
  if (hasAny(input, ["rack chains", "list rack chains", "chains in rack"]) && !hasAny(input, ["select rack chain", "enable rack chain"])) {
    const track = extractNumberAfter(input, "track", 1);
    const device = extractNumberAfter(input, "device", 1);
    actions.push({ action: "list_rack_chains", args: { track, device } });
  }

  // Browser
  if (hasAny(input, ["browser categories", "list browser categories", "get browser categories"]) && !hasAny(input, ["browser for", "search browser"])) {
    actions.push({ action: "browser_list_categories", args: {} });
  }

  // Adapter Info
  if (hasAny(input, ["list adapters", "show adapters", "available adapters"]) && !hasAny(input, ["get adapter"])) {
    actions.push({ action: "list_adapters", args: {} });
  }

  if (hasAny(input, ["adapter capabilities", "get adapter capabilities", "what can the adapter do"])) {
    actions.push({ action: "get_adapter_capabilities", args: {} });
  }

  // Macro
  if (hasAny(input, ["get macro", "macro value", "current macro"]) && !hasAny(input, ["set macro", "run macro"])) {
    const track = extractNumberAfter(input, "track", 1);
    const device = extractNumberAfter(input, "device", 1);
    const chain = extractNumberAfter(input, "chain", 1);
    actions.push({ action: "get_macro", args: { track, device, chain } });
  }
  if (!actions.length) {
    throw new Error("No mappable actions found in intent. Try simpler phrasing.");
  }

  const mutating = actions.some((a) => a.action !== "wait");

  return {
    version: "0.1",
    intent,
    adapter,
    actions,
    safety: {
      mutating,
      requiresExecuteFlag: mutating
    }
  };
}
