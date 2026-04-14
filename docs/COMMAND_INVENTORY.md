# Command Inventory (Target Full Surface)

Status: draft inventory for implementation planning.  
Goal: cover full practical control surface for Live Agent CLI.

> Note: final method signatures/availability must be validated on the Live 12 beta machine (Sunday) against the chosen adapter backend.

---

## A) Song/Global
- get_tempo / set_tempo
- get_time_signature / set_time_signature
- get_metronome / set_metronome
- get_global_quantization / set_global_quantization
- get_session_record / set_session_record
- get_arrangement_record / set_arrangement_record
- get_overdub / set_overdub
- get_loop_enabled / set_loop_enabled
- get_loop_region / set_loop_region
- get_punch_in / set_punch_in
- get_punch_out / set_punch_out
- get_current_song_time / set_current_song_time
- get_is_playing
- play / stop / continue_playback
- tap_tempo
- undo / redo

## B) Tracks (MIDI/Audio/Return/Master)
- list_tracks
- create_track(type)
- delete_track(track)
- duplicate_track(track)
- select_track(track)
- rename_track(track, name)
- set_track_color(track, color)
- arm_track(track, bool)
- mute_track(track, bool)
- solo_track(track, bool)
- get_track_monitoring / set_track_monitoring(track, mode)
- get_track_volume / set_track_volume(track, value)
- get_track_pan / set_track_pan(track, value)
- get_track_send / set_track_send(track, send, value)
- get_track_input_routing / set_track_input_routing
- get_track_output_routing / set_track_output_routing
- get_track_crossfade_assign / set_track_crossfade_assign
- list_track_clips(track)
- stop_all_clips(track?)

## C) Scenes
- list_scenes
- create_scene(index?)
- duplicate_scene(scene)
- delete_scene(scene)
- rename_scene(scene, name)
- fire_scene(scene)
- stop_scene(scene)

## D) Clips / Clip Slots
- list_clip_slots(track)
- create_clip(track, slot, length)
- delete_clip(track, slot)
- duplicate_clip(track, slot, target?)
- fire_clip(track, slot)
- stop_clip(track, slot)
- rename_clip(track, slot, name)
- set_clip_color(track, slot, color)
- get_clip_loop / set_clip_loop(track, slot, start, end, enabled)
- get_clip_warp / set_clip_warp(track, slot, enabled)
- get_clip_gain / set_clip_gain(track, slot, value)
- get_clip_transpose / set_clip_transpose(track, slot, semitones)
- quantize_clip(track, slot, grid, amount)

## E) Devices / Chains / Parameters
- list_devices(track)
- load_device(track, deviceName)
- select_device(track, device)
- enable_device(track, device, bool)
- list_device_parameters(track, device)
- get_device_parameter(track, device, param)
- set_device_parameter(track, device, param, value)
- list_rack_chains(track, device)
- select_rack_chain(track, device, chain)
- enable_rack_chain(track, device, chain, bool)
- get_macro(track, device, macro)
- set_macro(track, device, macro, value)

## F) Browser / Loading
- browser_list_categories
- browser_search(query)
- browser_preview(item, bool)
- browser_load_to_selected_track(item)
- browser_load_to_track(item, track)
- browser_load_preset(device, preset)
- browser_load_sample_to_clip(track, slot, file)

## G) Arrangement Editing (advanced)
- arrangement_select_time(start, end)
- arrangement_split_clip(track, time)
- arrangement_consolidate(track, start, end)
- arrangement_duplicate_time(start, end)
- arrangement_delete_time(start, end)
- arrangement_set_locator(name, time)
- arrangement_jump_to_locator(name)

## H) Observability / Watchers
- watch_song(fields[])
- watch_track(track, fields[])
- watch_clip(track, slot, fields[])
- watch_device(track, device, params[])
- unwatch(id)
- watch_list

## I) Utility / Session Control
- status
- ping
- health_check
- list_adapters
- get_adapter_capabilities
- dry_run_validate(plan)
- execute_plan(plan)
- save_plan(path)
- load_plan(path)

---

## Minimum guarantee by end-state
- Every category above has implemented read + write/control paths where backend supports it.
- Unsupported operations must return explicit capability errors (not silent failure).
