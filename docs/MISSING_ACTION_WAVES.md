# Missing Actions Execution Waves (73 actions)

Objective: implement all remaining actions with strict test-first workflow.

## Wave 11 — Read/Introspection Core (low risk, high leverage)
- status
- ping
- health_check
- list_adapters
- get_adapter_capabilities
- list_tracks
- list_scenes
- list_track_clips
- list_clip_slots
- list_device_parameters
- list_rack_chains
- get_tempo
- get_time_signature
- get_metronome
- get_global_quantization
- get_is_playing
- get_current_song_time
- get_session_record
- get_arrangement_record
- get_overdub
- get_loop_enabled
- get_loop_region
- get_punch_in
- get_punch_out
- get_track_volume
- get_track_pan
- get_track_send
- get_track_monitoring
- get_track_input_routing
- get_track_output_routing
- get_track_crossfade_assign
- get_clip_loop
- get_clip_gain
- get_clip_transpose
- get_clip_warp
- get_device_parameter
- get_macro

## Wave 12 — Session/Track/Clip Management
- create_clip
- delete_track
- duplicate_track
- rename_track
- set_track_color
- delete_scene
- duplicate_scene
- rename_scene
- rename_clip
- set_clip_color
- stop_all_clips
- play
- tap_tempo
- undo

## Wave 13 — Device/Rack Deep Control
- select_device
- select_rack_chain
- enable_rack_chain
- set_macro

## Wave 14 — Browser + Plan/Utility Ops
- browser_list_categories
- browser_preview
- browser_load_to_selected_track
- browser_load_sample_to_clip
- save_plan
- load_plan
- dry_run_validate
- execute_plan

## Wave 15 — Arrangement Advanced Editing
- arrangement_select_time
- arrangement_split_clip
- arrangement_consolidate
- arrangement_duplicate_time
- arrangement_delete_time
- arrangement_set_locator
- arrangement_jump_to_locator
- quantize_clip

## Wave 16 — Watchers Extended
- watch_clip
- watch_device

## Delivery protocol for each wave
1) Add failing tests (planner + validator + CLI)
2) Implement actions + mappings
3) Run full suite green
4) Update docs + commit
5) Move to next wave
