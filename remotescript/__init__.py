"""
LiveAgent - minimal Ableton Remote Script bridge for live-agent-cli

This version is intentionally small and conservative:
- Proper ControlSurface subclass
- Non-blocking UDP socket
- Main-thread polling via schedule_message
- Full action surface: transport, tracks, scenes, clips, devices, mixer, etc.
"""

from __future__ import absolute_import

from _Framework.ControlSurface import ControlSurface
import Live
import socket
import json
import traceback
import re

Live.Base.log("LiveAgent MODULE LOADING - VERSION 2026-04-03-1945 - 4 new handlers: get_scene_names, get_track_color, is_track_armed, set_track_volume")


class LiveAgent(ControlSurface):
    def __init__(self, c_instance, *a, **k):
        Live.Base.log("LiveAgent __init__ called")
        super(LiveAgent, self).__init__(c_instance, *a, **k)
        self._sock = None
        self._running = False
        self._recv_port = 9000
        self._send_port = 9001
        self._remote_addr = ('127.0.0.1', self._send_port)
        self._confirmation_policy = 'normal'
        self._watches = {}
        self._next_watch_id = 1
        self._init_socket()
        self.schedule_message(1, self._tick)

    def _init_socket(self):
        try:
            self._sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self._sock.setblocking(0)
            self._sock.bind(('127.0.0.1', self._recv_port))
            self._running = True
            Live.Base.log("LiveAgent: UDP listening on 127.0.0.1:%d" % self._recv_port)
        except Exception as e:
            Live.Base.log("LiveAgent: socket init failed: %s" % e)
            self._sock = None
            self._running = False

    def _tick(self):
        if self._running and self._sock is not None:
            try:
                while True:
                    data, addr = self._sock.recvfrom(65536)
                    self._remote_addr = (addr[0], self._send_port)
                    self._handle_packet(data)
            except socket.error:
                pass
            except Exception:
                Live.Base.log("LiveAgent: tick error: %s" % traceback.format_exc())
        self.schedule_message(1, self._tick)

    def _song(self):
        return self.song()

    def _handle_packet(self, data):
        cmd_id = None
        try:
            msg = json.loads(data.decode('utf-8'))
            cmd_id = msg.get('id')
            action = msg.get('action')
            args = msg.get('args', {}) or {}
            result = self._execute(action, args)
            self._reply({'id': cmd_id, 'ok': True, 'result': result})
        except Exception as e:
            self._reply({'id': cmd_id, 'ok': False, 'error': str(e)})

    def _resolve_track(self, target=None):
        song = self._song()
        if target is None or target == 'selected':
            return song.view.selected_track
        if isinstance(target, int):
            index = target - 1 if target > 0 else target
            if 0 <= index < len(song.tracks):
                return song.tracks[index]
            raise ValueError('Track index out of range: %s' % target)
        for track in song.tracks:
            if getattr(track, 'name', None) == target:
                return track
        raise ValueError('Track not found: %s' % target)

    def _resolve_device(self, track, target=None):
        if target is None:
            if len(track.devices) > 0:
                return track.devices[0]
            raise ValueError('No devices on track')
        if isinstance(target, int):
            index = target - 1 if target > 0 else target
            if 0 <= index < len(track.devices):
                return track.devices[index]
            raise ValueError('Device index out of range: %s' % target)
        for device in track.devices:
            if getattr(device, 'name', None) == target:
                return device
        raise ValueError('Device not found: %s' % target)

    def _resolve_parameter(self, device, target):
        if isinstance(target, int):
            index = target - 1 if target > 0 else target
            if 0 <= index < len(device.parameters):
                return device.parameters[index]
            raise ValueError('Parameter index out of range: %s' % target)
        target_l = str(target).lower()
        for parameter in device.parameters:
            if getattr(parameter, 'name', '').lower() == target_l:
                return parameter
        raise ValueError('Parameter not found: %s' % target)

    def _browser_roots(self):
        browser = Live.Application.get_application().browser
        roots = []
        for name in ('instruments', 'audio_effects', 'midi_effects', 'drums', 'max_for_live', 'plugins', 'clips', 'samples', 'user_library'):
            item = getattr(browser, name, None)
            if item is not None:
                roots.append(item)
        return browser, roots

    def _normalize_name(self, value):
        return re.sub(r'[^a-z0-9]+', ' ', str(value).lower()).strip()

    def _find_browser_item(self, query):
        browser, roots = self._browser_roots()
        target = self._normalize_name(query)
        queue = list(roots)
        seen = set()
        best_partial = None
        while queue:
            item = queue.pop(0)
            item_id = id(item)
            if item_id in seen:
                continue
            seen.add(item_id)
            name = getattr(item, 'name', '')
            norm = self._normalize_name(name)
            if norm == target and getattr(item, 'is_loadable', False):
                return browser, item
            if target and target in norm and getattr(item, 'is_loadable', False) and best_partial is None:
                best_partial = item
            try:
                children = list(getattr(item, 'children', []))
            except Exception:
                children = []
            queue.extend(children)
        if best_partial is not None:
            return browser, best_partial
        raise ValueError('Browser item not found: %s' % query)

    def _reply(self, payload):
        if self._sock is None:
            return
        try:
            raw = json.dumps(payload).encode('utf-8')
            self._sock.sendto(raw, self._remote_addr)
        except Exception:
            Live.Base.log("LiveAgent: reply error: %s" % traceback.format_exc())

    def _song_watch_snapshot(self, fields):
        song = self._song()
        snapshot = {}
        for field in fields:
            if field == 'tempo':
                snapshot['tempo'] = float(song.tempo)
            elif field in ('is_playing', 'playing'):
                snapshot['is_playing'] = bool(song.is_playing)
            elif field == 'metronome' and hasattr(song, 'metronome'):
                snapshot['metronome'] = bool(song.metronome)
            elif field == 'signature_numerator' and hasattr(song, 'signature_numerator'):
                snapshot['signature_numerator'] = int(song.signature_numerator)
            elif field == 'signature_denominator' and hasattr(song, 'signature_denominator'):
                snapshot['signature_denominator'] = int(song.signature_denominator)
        return snapshot

    def _track_watch_snapshot(self, track, fields):
        snapshot = {'track': getattr(track, 'name', 'unknown')}
        mixer = getattr(track, 'mixer_device', None)
        for field in fields:
            if field == 'volume' and mixer is not None and hasattr(mixer, 'volume'):
                snapshot['volume'] = float(mixer.volume.value)
            elif field == 'pan' and mixer is not None and hasattr(mixer, 'panning'):
                snapshot['pan'] = float(mixer.panning.value)
            elif field == 'mute' and hasattr(track, 'mute'):
                snapshot['mute'] = bool(track.mute)
            elif field == 'solo' and hasattr(track, 'solo'):
                snapshot['solo'] = bool(track.solo)
            elif field == 'arm' and hasattr(track, 'arm'):
                snapshot['arm'] = bool(track.arm)
        return snapshot

    def _execute(self, action, args):
        song = self._song()

        if action == 'ping':
            return {'pong': True}

        if action == 'status':
            return {
                'playing': bool(song.is_playing),
                'tempo': float(song.tempo),
                'tracks': len(song.tracks),
                'scenes': len(song.scenes),
            }

        if action == 'transport_play':
            song.start_playing()
            return {'ok': True, 'message': 'playing'}

        if action == 'transport_stop':
            song.stop_playing()
            return {'ok': True, 'message': 'stopped'}

        if action == 'set_tempo':
            value = args.get('value', args.get('tempo', 120))
            song.tempo = float(value)
            return {'ok': True, 'tempo': float(song.tempo)}

        if action == 'create_track':
            track_type = (args.get('type') or 'midi').lower()
            index = len(song.tracks)
            if track_type == 'midi':
                song.create_midi_track(index)
            elif track_type == 'audio':
                song.create_audio_track(index)
            else:
                raise ValueError('Unsupported track type: %s' % track_type)
            return {'ok': True, 'track_type': track_type, 'index': index}

        if action == 'select_track':
            target = args.get('value') if args.get('target') in ('index', 'name') else 'selected'
            track = self._resolve_track(target)
            song.view.selected_track = track
            return {'ok': True, 'selected': getattr(track, 'name', 'unknown')}

        if action == 'arm_track':
            track = self._resolve_track(args.get('track'))
            track.arm = bool(args.get('value', True))
            return {'ok': True, 'armed': bool(track.arm), 'track': getattr(track, 'name', 'unknown')}

        if action == 'set_monitor':
            track = self._resolve_track(args.get('track'))
            mode = (args.get('mode') or 'auto').lower()
            mode_map = {'in': 0, 'auto': 1, 'off': 2}
            if hasattr(track, 'current_monitoring_state'):
                track.current_monitoring_state = mode_map[mode]
            return {'ok': True, 'mode': mode, 'track': getattr(track, 'name', 'unknown')}

        if action == 'transport_record':
            value = bool(args.get('value', True))
            if hasattr(song, 'record_mode'):
                song.record_mode = value
            elif hasattr(song, 'record'):
                song.record = value
            else:
                raise ValueError('Arrangement record not supported by this Live API surface')
            return {'ok': True, 'record': value}

        if action == 'session_record':
            value = bool(args.get('value', True))
            song.session_record = value
            return {'ok': True, 'session_record': bool(song.session_record)}

        if action == 'wait':
            return {'ok': True, 'waited_ms': int(args.get('ms', 0))}

        if action == 'load_device':
            query = args.get('device') or args.get('name')
            if not query:
                raise ValueError('load_device requires device or name')
            browser, item = self._find_browser_item(query)
            browser.load_item(item)
            return {
                'ok': True,
                'loaded': True,
                'device': getattr(item, 'name', str(query))
            }

        if action == 'create_scene':
            index = int(args.get('index', len(song.scenes)))
            if index < 0:
                raise ValueError('Scene index must be >= 0')
            if index > len(song.scenes):
                index = len(song.scenes)
            song.create_scene(index)
            return {'ok': True, 'scene_index': index}

        if action == 'fire_scene':
            scene_no = int(args.get('scene', 1))
            index = scene_no - 1 if scene_no > 0 else scene_no
            if not (0 <= index < len(song.scenes)):
                raise ValueError('Scene index out of range: %s' % scene_no)
            song.scenes[index].fire()
            return {'ok': True, 'scene': scene_no}

        if action == 'stop_scene':
            if hasattr(song, 'stop_all_clips'):
                song.stop_all_clips()
            return {'ok': True, 'message': 'stopped scene playback'}

        if action == 'fire_clip':
            track_no = int(args.get('track', 1))
            slot_no = int(args.get('slot', 1))
            track = self._resolve_track(track_no)
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range: %s' % slot_no)
            track.clip_slots[slot_index].fire()
            return {'ok': True, 'track': track_no, 'slot': slot_no}

        if action == 'stop_clip':
            track_no = int(args.get('track', 1))
            track = self._resolve_track(track_no)
            if hasattr(track, 'stop_all_clips'):
                track.stop_all_clips()
            elif hasattr(track, 'stop_all_clips_quantized'):
                track.stop_all_clips_quantized()
            else:
                raise ValueError('Track stop not supported for this track')
            return {'ok': True, 'track': track_no}

        if action == 'duplicate_clip':
            track_no = int(args.get('track', 1))
            slot_no = int(args.get('slot', 1))
            track = self._resolve_track(track_no)
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if hasattr(track, 'duplicate_clip_slot'):
                track.duplicate_clip_slot(slot_index)
                return {'ok': True, 'track': track_no, 'slot': slot_no}
            raise ValueError('duplicate_clip not supported by this Live API surface')

        if action == 'delete_clip':
            track_no = int(args.get('track', 1))
            slot_no = int(args.get('slot', 1))
            track = self._resolve_track(track_no)
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range: %s' % slot_no)
            clip_slot = track.clip_slots[slot_index]
            if not clip_slot.has_clip:
                raise ValueError('No clip in track %s slot %s' % (track_no, slot_no))
            clip_slot.delete_clip()
            return {'ok': True, 'track': track_no, 'slot': slot_no}

        if action == 'create_clip':
            track_no = int(args.get('track', 1))
            slot_no = int(args.get('slot', 1))
            length = float(args.get('length', 4.0))
            track = self._resolve_track(track_no)
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range: %s' % slot_no)
            clip_slot = track.clip_slots[slot_index]
            if clip_slot.has_clip:
                raise ValueError('Clip already exists in track %s slot %s' % (track_no, slot_no))
            clip_slot.create_clip(length)
            return {'ok': True, 'track': track_no, 'slot': slot_no, 'length': length}

        if action == 'set_clip_loop':
            track_no = int(args.get('track', 1))
            slot_no = int(args.get('slot', 1))
            track = self._resolve_track(track_no)
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range: %s' % slot_no)
            clip_slot = track.clip_slots[slot_index]
            if not clip_slot.has_clip:
                raise ValueError('No clip in track %s slot %s' % (track_no, slot_no))
            clip = clip_slot.clip
            clip.looping = bool(args.get('enabled', True))
            clip.loop_start = float(args.get('start', 0.0))
            clip.loop_end = float(args.get('end', 4.0))
            return {
                'ok': True,
                'track': track_no,
                'slot': slot_no,
                'loop_start': float(clip.loop_start),
                'loop_end': float(clip.loop_end),
                'looping': bool(clip.looping)
            }

        if action == 'set_volume':
            track = self._resolve_track(int(args.get('track', 1)))
            value = float(args.get('value', 0.75))
            track.mixer_device.volume.value = value
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'value': float(track.mixer_device.volume.value)}

        if action == 'set_pan':
            track = self._resolve_track(int(args.get('track', 1)))
            value = float(args.get('value', 0.0))
            track.mixer_device.panning.value = value
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'value': float(track.mixer_device.panning.value)}

        if action == 'set_send':
            track = self._resolve_track(int(args.get('track', 1)))
            send_name = str(args.get('send', 'A')).upper()
            send_index = ord(send_name[0]) - ord('A')
            if send_index < 0 or send_index >= len(track.mixer_device.sends):
                raise ValueError('Send out of range: %s' % send_name)
            value = float(args.get('value', 0.5))
            track.mixer_device.sends[send_index].value = value
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'send': send_name, 'value': float(track.mixer_device.sends[send_index].value)}

        if action == 'mute_track':
            track = self._resolve_track(int(args.get('track', 1)))
            track.mute = bool(args.get('value', True))
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'mute': bool(track.mute)}

        if action == 'solo_track':
            track = self._resolve_track(int(args.get('track', 1)))
            track.solo = bool(args.get('value', True))
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'solo': bool(track.solo)}

        if action == 'list_devices':
            track = self._resolve_track(int(args.get('track', 1)))
            devices = []
            for i, device in enumerate(track.devices):
                devices.append({
                    'index': i + 1,
                    'name': getattr(device, 'name', 'Unnamed Device'),
                    'class_name': getattr(device, 'class_name', type(device).__name__),
                    'enabled': bool(getattr(device, 'is_active', True))
                })
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'devices': devices}

        if action == 'enable_device':
            track = self._resolve_track(int(args.get('track', 1)))
            device_arg = args.get('device', 1)
            device = self._resolve_device(track, int(device_arg) if isinstance(device_arg, int) or str(device_arg).isdigit() else device_arg)
            value = bool(args.get('value', True))
            applied = False
            if hasattr(device, 'is_active'):
                try:
                    device.is_active = value
                    applied = True
                except Exception:
                    applied = False
            if not applied:
                try:
                    device_on = self._resolve_parameter(device, 'Device On')
                    device_on.value = 1.0 if value else 0.0
                    applied = True
                except Exception:
                    applied = False
            if not applied:
                raise ValueError('Device enable/disable not supported for this device')
            enabled = value
            if hasattr(device, 'is_active'):
                try:
                    enabled = bool(device.is_active)
                except Exception:
                    enabled = value
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'device': getattr(device, 'name', 'unknown'), 'enabled': enabled}

        if action == 'set_device_parameter':
            track = self._resolve_track(int(args.get('track', 1)))
            device_arg = args.get('device', 1)
            device = self._resolve_device(track, int(device_arg) if isinstance(device_arg, int) or str(device_arg).isdigit() else device_arg)
            parameter_arg = args.get('parameter')
            parameter = self._resolve_parameter(device, int(parameter_arg) if isinstance(parameter_arg, int) or str(parameter_arg).isdigit() else parameter_arg)
            value = float(args.get('value', 0.5))
            parameter.value = value
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'device': getattr(device, 'name', 'unknown'), 'parameter': getattr(parameter, 'name', 'unknown'), 'value': float(parameter.value)}

        if action == 'project_save':
            app = Live.Application.get_application()
            saved = False
            errors = []
            try:
                doc = app.get_document()
                if hasattr(doc, 'save'):
                    doc.save()
                    saved = True
            except Exception as e:
                errors.append('document.save: %s' % e)
            if not saved:
                try:
                    song = self._song()
                    if hasattr(song, 'save'):
                        song.save()
                        saved = True
                except Exception as e:
                    errors.append('song.save: %s' % e)
            if not saved:
                raise ValueError('project_save failed: %s' % '; '.join(errors or ['no supported save method found']))
            return {'ok': True, 'saved': True}

        if action == 'watch_song':
            fields = list(args.get('fields', []) or ['tempo'])
            watch_id = 'watch-%d' % self._next_watch_id
            self._next_watch_id += 1
            snapshot = self._song_watch_snapshot(fields)
            self._watches[watch_id] = {
                'id': watch_id,
                'kind': 'song',
                'fields': fields,
                'last': snapshot,
            }
            return {'ok': True, 'id': watch_id, 'kind': 'song', 'fields': fields, 'snapshot': snapshot}

        if action == 'watch_track':
            track = self._resolve_track(args.get('track'))
            fields = list(args.get('fields', []) or ['volume'])
            watch_id = 'watch-%d' % self._next_watch_id
            self._next_watch_id += 1
            snapshot = self._track_watch_snapshot(track, fields)
            self._watches[watch_id] = {
                'id': watch_id,
                'kind': 'track',
                'track': getattr(track, 'name', 'unknown'),
                'fields': fields,
                'last': snapshot,
            }
            return {'ok': True, 'id': watch_id, 'kind': 'track', 'track': getattr(track, 'name', 'unknown'), 'fields': fields, 'snapshot': snapshot}

        if action == 'watch_list':
            items = []
            for watch_id in sorted(self._watches.keys()):
                items.append(self._watches[watch_id])
            return {'ok': True, 'watches': items}

        if action == 'unwatch':
            watch_id = str(args.get('id', ''))
            if watch_id not in self._watches:
                raise ValueError('Unknown watch id: %s' % watch_id)
            removed = self._watches.pop(watch_id)
            return {'ok': True, 'removed': removed}

        if action == 'set_confirmation_policy':
            value = str(args.get('value', 'normal')).lower()
            if value not in ('strict', 'normal', 'relaxed', 'cautious'):
                raise ValueError('Unsupported confirmation policy: %s' % value)
            self._confirmation_policy = value
            return {'ok': True, 'value': self._confirmation_policy}

        if action == 'set_metronome':
            song = self._song()
            value = bool(args.get('value', True))
            if hasattr(song, 'metronome'):
                song.metronome = value
            else:
                raise ValueError('Metronome not supported by this Live API surface')
            return {'ok': True, 'metronome': bool(song.metronome)}

        if action == 'set_time_signature':
            song = self._song()
            numerator = int(args.get('numerator', 4))
            denominator = int(args.get('denominator', 4))
            song.signature_numerator = numerator
            song.signature_denominator = denominator
            return {'ok': True, 'numerator': int(song.signature_numerator), 'denominator': int(song.signature_denominator)}

        if action == 'set_arrangement_position':
            song = self._song()
            value = float(args.get('value', 0.0))
            if hasattr(song, 'current_song_time'):
                song.current_song_time = value
            else:
                raise ValueError('Arrangement position not supported by this Live API surface')
            return {'ok': True, 'current_song_time': float(song.current_song_time)}

        if action == 'set_loop_region':
            song = self._song()
            start = float(args.get('start', 1.0))
            end = float(args.get('end', 5.0))
            enabled = bool(args.get('enabled', True))
            song.loop_start = start
            song.loop_length = max(0.0, end - start)
            song.loop = enabled
            return {'ok': True, 'loop_start': float(song.loop_start), 'loop_length': float(song.loop_length), 'loop': bool(song.loop)}

        if action == 'set_punch_in':
            song = self._song()
            value = bool(args.get('value', True))
            if hasattr(song, 'punch_in'):
                song.punch_in = value
            else:
                raise ValueError('Punch in not supported by this Live API surface')
            return {'ok': True, 'punch_in': bool(song.punch_in)}

        if action == 'set_punch_out':
            song = self._song()
            value = bool(args.get('value', True))
            if hasattr(song, 'punch_out'):
                song.punch_out = value
            else:
                raise ValueError('Punch out not supported by this Live API surface')
            return {'ok': True, 'punch_out': bool(song.punch_out)}

        if action == 'set_global_quantization':
            song = self._song()
            value = str(args.get('value', '1/16')).lower()
            mapping = {
                'none': 0,
                '8 bars': 1,
                '4 bars': 2,
                '2 bars': 3,
                '1 bar': 4,
                '1/2': 5,
                '1/2 triplet': 6,
                '1/4': 7,
                '1/4 triplet': 8,
                '1/8': 9,
                '1/8 triplet': 10,
                '1/16': 11,
                '1/16 triplet': 12,
                '1/32': 13
            }
            if value not in mapping:
                raise ValueError('Unsupported quantization value: %s' % value)
            song.clip_trigger_quantization = mapping[value]
            return {'ok': True, 'value': value, 'clip_trigger_quantization': int(song.clip_trigger_quantization)}

        # ===== WAVE 11: Read/Introspection Core =====

        if action == 'health_check':
            return {'ok': True, 'service': 'live-agent', 'version': '0.1'}

        if action == 'list_adapters':
            return {'ok': True, 'adapters': ['remotescript', 'showcontrol-osc', 'max4live']}

        if action == 'get_adapter_capabilities':
            adapter = args.get('adapter', 'remotescript')
            caps = {
                'remotescript': ['transport', 'tracks', 'scenes', 'clips', 'devices', 'mixer', 'arrangement', 'project', 'browser'],
                'showcontrol-osc': ['transport', 'tracks', 'scenes', 'clips'],
                'max4live': ['transport', 'tracks', 'devices', 'parameters']
            }
            return {'ok': True, 'adapter': adapter, 'capabilities': caps.get(adapter, [])}

        if action == 'list_tracks':
            tracks = []
            for i, track in enumerate(song.tracks):
                tracks.append({
                    'index': i + 1,
                    'name': getattr(track, 'name', 'Track %d' % (i + 1)),
                    'type': 'midi' if hasattr(track, 'has_midi_input') and track.has_midi_input else 'audio',
                    'is_selected': song.view.selected_track == track
                })
            return {'ok': True, 'tracks': tracks}

        if action == 'list_scenes':
            scenes = []
            for i, scene in enumerate(song.scenes):
                scenes.append({
                    'index': i + 1,
                    'name': getattr(scene, 'name', 'Scene %d' % (i + 1))
                })
            return {'ok': True, 'scenes': scenes}

        if action == 'list_track_clips':
            track = self._resolve_track(args.get('track'))
            clips = []
            for i, clip_slot in enumerate(track.clip_slots):
                if clip_slot.has_clip:
                    clip = clip_slot.clip
                    clips.append({
                        'slot': i + 1,
                        'name': getattr(clip, 'name', 'Clip'),
                        'length': float(getattr(clip, 'length', 0))
                    })
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'clips': clips}

        if action == 'list_clip_slots':
            track = self._resolve_track(args.get('track'))
            slots = []
            for i, clip_slot in enumerate(track.clip_slots):
                slots.append({
                    'slot': i + 1,
                    'has_clip': clip_slot.has_clip
                })
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'slots': slots}

        if action == 'list_device_parameters':
            track = self._resolve_track(args.get('track'))
            device_arg = args.get('device', 1)
            device = self._resolve_device(track, int(device_arg) if isinstance(device_arg, int) or str(device_arg).isdigit() else device_arg)
            params = []
            for i, param in enumerate(device.parameters):
                params.append({
                    'index': i + 1,
                    'name': getattr(param, 'name', 'Param %d' % (i + 1)),
                    'value': float(getattr(param, 'value', 0)),
                    'min': float(getattr(param, 'min', 0)),
                    'max': float(getattr(param, 'max', 1)),
                    'is_enabled': bool(getattr(param, 'is_enabled', True))
                })
            return {'ok': True, 'device': getattr(device, 'name', 'unknown'), 'parameters': params}

        if action == 'list_rack_chains':
            track = self._resolve_track(args.get('track'))
            device_arg = args.get('device', 1)
            device = self._resolve_device(track, int(device_arg) if isinstance(device_arg, int) or str(device_arg).isdigit() else device_arg)
            chains = []
            if hasattr(device, 'chains'):
                for i, chain in enumerate(device.chains):
                    chains.append({
                        'index': i + 1,
                        'name': getattr(chain, 'name', 'Chain %d' % (i + 1)),
                        'is_active': bool(getattr(chain, 'is_active', True))
                    })
            return {'ok': True, 'device': getattr(device, 'name', 'unknown'), 'chains': chains}

        if action == 'get_tempo':
            return {'ok': True, 'tempo': float(song.tempo)}

        if action == 'get_time_signature':
            return {'ok': True, 'numerator': int(song.signature_numerator), 'denominator': int(song.signature_denominator)}

        if action == 'get_metronome':
            return {'ok': True, 'metronome': bool(song.metronome) if hasattr(song, 'metronome') else False}

        if action == 'get_global_quantization':
            mapping = {0: 'none', 1: '8 bars', 2: '4 bars', 3: '2 bars', 4: '1 bar', 5: '1/2', 6: '1/2 triplet', 7: '1/4', 8: '1/4 triplet', 9: '1/8', 10: '1/8 triplet', 11: '1/16', 12: '1/16 triplet', 13: '1/32'}
            val = int(song.clip_trigger_quantization) if hasattr(song, 'clip_trigger_quantization') else 11
            return {'ok': True, 'value': mapping.get(val, '1/16'), 'raw': val}

        if action == 'get_is_playing':
            return {'ok': True, 'is_playing': bool(song.is_playing)}

        if action == 'get_current_song_time':
            time = float(song.current_song_time) if hasattr(song, 'current_song_time') else 0.0
            return {'ok': True, 'current_song_time': time}

        if action == 'get_session_record':
            return {'ok': True, 'session_record': bool(song.session_record)}

        if action == 'get_arrangement_record':
            rec = False
            if hasattr(song, 'record_mode'):
                rec = bool(song.record_mode)
            elif hasattr(song, 'record'):
                rec = bool(song.record)
            return {'ok': True, 'arrangement_record': rec}

        if action == 'get_overdub':
            return {'ok': True, 'overdub': bool(song.overdub) if hasattr(song, 'overdub') else False}

        if action == 'get_loop_enabled':
            return {'ok': True, 'loop_enabled': bool(song.loop) if hasattr(song, 'loop') else False}

        if action == 'get_loop_region':
            start = float(song.loop_start) if hasattr(song, 'loop_start') else 0.0
            length = float(song.loop_length) if hasattr(song, 'loop_length') else 0.0
            enabled = bool(song.loop) if hasattr(song, 'loop') else False
            return {'ok': True, 'start': start, 'end': start + length, 'length': length, 'enabled': enabled}

        if action == 'get_punch_in':
            return {'ok': True, 'punch_in': bool(song.punch_in) if hasattr(song, 'punch_in') else False}

        if action == 'get_punch_out':
            return {'ok': True, 'punch_out': bool(song.punch_out) if hasattr(song, 'punch_out') else False}

        if action == 'get_track_volume':
            track = self._resolve_track(args.get('track'))
            mixer = getattr(track, 'mixer_device', None)
            val = float(mixer.volume.value) if mixer and hasattr(mixer, 'volume') else 0.75
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'volume': val}

        if action == 'get_track_pan':
            track = self._resolve_track(args.get('track'))
            mixer = getattr(track, 'mixer_device', None)
            val = float(mixer.panning.value) if mixer and hasattr(mixer, 'panning') else 0.0
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'pan': val}

        if action == 'get_track_send':
            track = self._resolve_track(args.get('track'))
            send_name = str(args.get('send', 'A')).upper()
            send_index = ord(send_name[0]) - ord('A')
            mixer = getattr(track, 'mixer_device', None)
            if mixer and hasattr(mixer, 'sends') and 0 <= send_index < len(mixer.sends):
                val = float(mixer.sends[send_index].value)
            else:
                val = 0.0
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'send': send_name, 'value': val}

        if action == 'get_track_monitoring':
            track = self._resolve_track(args.get('track'))
            mode = 'auto'
            if hasattr(track, 'current_monitoring_state'):
                mode_map = {0: 'in', 1: 'auto', 2: 'off'}
                mode = mode_map.get(track.current_monitoring_state, 'auto')
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'monitoring': mode}

        if action == 'get_track_input_routing':
            track = self._resolve_track(args.get('track'))
            routing = ''
            if hasattr(track, 'input_routing_type'):
                routing = str(track.input_routing_type)
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'input_routing': routing}

        if action == 'get_track_output_routing':
            track = self._resolve_track(args.get('track'))
            routing = ''
            if hasattr(track, 'output_routing_type'):
                routing = str(track.output_routing_type)
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'output_routing': routing}

        if action == 'get_track_crossfade_assign':
            track = self._resolve_track(args.get('track'))
            assign = 0
            if hasattr(track, 'crossfade_assign'):
                assign = int(track.crossfade_assign)
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'crossfade_assign': assign}

        if action == 'get_scene_names':
            names = [{'index': i + 1, 'name': getattr(s, 'name', 'Scene %d' % (i + 1))} for i, s in enumerate(song.scenes)]
            return {'ok': True, 'scene_names': names}

        if action == 'get_track_color':
            track = self._resolve_track(args.get('track'))
            color = getattr(track, 'color', None)
            if color is None:
                return {'ok': False, 'error': 'Track has no color'}
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'color': color}

        if action == 'is_track_armed':
            track = self._resolve_track(args.get('track'))
            armed = getattr(track, 'armed', False) or getattr(track, 'is_armed', False)
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'armed': bool(armed)}

        if action == 'set_track_volume':
            track = self._resolve_track(args.get('track'))
            volume = float(args.get('volume', 0.75))
            mixer = getattr(track, 'mixer_device', None)
            if mixer and hasattr(mixer, 'volume'):
                mixer.volume.value = volume
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'volume': volume}

        if action == 'get_clip_loop':
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range: %s' % slot_no)
            clip_slot = track.clip_slots[slot_index]
            if not clip_slot.has_clip:
                raise ValueError('No clip in track slot')
            clip = clip_slot.clip
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'slot': slot_no,
                    'looping': bool(clip.looping), 'start': float(clip.loop_start), 'end': float(clip.loop_end)}

        if action == 'get_clip_gain':
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range: %s' % slot_no)
            clip_slot = track.clip_slots[slot_index]
            if not clip_slot.has_clip:
                raise ValueError('No clip in track slot')
            clip = clip_slot.clip
            gain = float(getattr(clip, 'gain', 0.0))
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'slot': slot_no, 'gain': gain}

        if action == 'get_clip_transpose':
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range: %s' % slot_no)
            clip_slot = track.clip_slots[slot_index]
            if not clip_slot.has_clip:
                raise ValueError('No clip in track slot')
            clip = clip_slot.clip
            transpose = int(getattr(clip, 'transpose', 0))
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'slot': slot_no, 'transpose': transpose}

        if action == 'get_clip_warp':
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range: %s' % slot_no)
            clip_slot = track.clip_slots[slot_index]
            if not clip_slot.has_clip:
                raise ValueError('No clip in track slot')
            clip = clip_slot.clip
            warp = bool(getattr(clip, 'warping', False))
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'slot': slot_no, 'warping': warp}

        if action == 'get_device_parameter':
            track = self._resolve_track(args.get('track'))
            device_arg = args.get('device', 1)
            device = self._resolve_device(track, int(device_arg) if isinstance(device_arg, int) or str(device_arg).isdigit() else device_arg)
            parameter_arg = args.get('parameter')
            parameter = self._resolve_parameter(device, int(parameter_arg) if isinstance(parameter_arg, int) or str(parameter_arg).isdigit() else parameter_arg)
            return {'ok': True, 'device': getattr(device, 'name', 'unknown'), 'parameter': getattr(parameter, 'name', 'unknown'),
                    'value': float(parameter.value), 'min': float(parameter.min), 'max': float(parameter.max)}

        if action == 'get_macro':
            track = self._resolve_track(args.get('track'))
            device_arg = args.get('device', 1)
            device = self._resolve_device(track, int(device_arg) if isinstance(device_arg, int) or str(device_arg).isdigit() else device_arg)
            macro_name = args.get('macro', 'Macro 1')
            macro_param = None
            for param in device.parameters:
                if getattr(param, 'name', '').lower() == str(macro_name).lower():
                    macro_param = param
                    break
            if macro_param is None:
                raise ValueError('Macro not found: %s' % macro_name)
            return {'ok': True, 'device': getattr(device, 'name', 'unknown'), 'macro': getattr(macro_param, 'name', 'unknown'),
                    'value': float(macro_param.value)}

        # ===== WAVE 12: Session/Track/Clip Management =====

        if action == 'delete_track':
            track = self._resolve_track(args.get('track'))
            song.delete_track(list(song.tracks).index(track))
            return {'ok': True, 'message': 'Track deleted'}

        if action == 'duplicate_track':
            track = self._resolve_track(args.get('track'))
            song.duplicate_track(list(song.tracks).index(track))
            return {'ok': True, 'message': 'Track duplicated'}

        if action == 'rename_track':
            track = self._resolve_track(args.get('track'))
            name = str(args.get('name', ''))
            if hasattr(track, 'name'):
                track.name = name
            return {'ok': True, 'track': name, 'name': name}

        if action == 'set_track_color':
            track = self._resolve_track(args.get('track'))
            color = int(args.get('color', 0))
            if hasattr(track, 'color'):
                track.color = color
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'color': color}

        if action == 'delete_scene':
            scene_no = int(args.get('scene', 1))
            scene_index = scene_no - 1 if scene_no > 0 else scene_no
            if not (0 <= scene_index < len(song.scenes)):
                raise ValueError('Scene out of range: %s' % scene_no)
            song.delete_scene(scene_index)
            return {'ok': True, 'scene': scene_no, 'message': 'Scene deleted'}

        if action == 'duplicate_scene':
            scene_no = int(args.get('scene', 1))
            scene_index = scene_no - 1 if scene_no > 0 else scene_no
            if not (0 <= scene_index < len(song.scenes)):
                raise ValueError('Scene out of range: %s' % scene_no)
            song.duplicate_scene(scene_index)
            return {'ok': True, 'scene': scene_no, 'message': 'Scene duplicated'}

        if action == 'rename_scene':
            scene_no = int(args.get('scene', 1))
            scene_index = scene_no - 1 if scene_no > 0 else scene_no
            if not (0 <= scene_index < len(song.scenes)):
                raise ValueError('Scene out of range: %s' % scene_no)
            scene = song.scenes[scene_index]
            name = str(args.get('name', ''))
            if hasattr(scene, 'name'):
                scene.name = name
            return {'ok': True, 'scene': scene_no, 'name': name}

        if action == 'rename_clip':
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range: %s' % slot_no)
            clip_slot = track.clip_slots[slot_index]
            if not clip_slot.has_clip:
                raise ValueError('No clip in track slot')
            clip = clip_slot.clip
            name = str(args.get('name', ''))
            if hasattr(clip, 'name'):
                clip.name = name
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'slot': slot_no, 'name': name}

        if action == 'set_clip_color':
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range: %s' % slot_no)
            clip_slot = track.clip_slots[slot_index]
            if not clip_slot.has_clip:
                raise ValueError('No clip in track slot')
            clip = clip_slot.clip
            color = int(args.get('color', 0))
            if hasattr(clip, 'color'):
                clip.color = color
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'slot': slot_no, 'color': color}

        if action == 'stop_all_clips':
            song.stop_all_clips()
            return {'ok': True, 'message': 'All clips stopped'}

        if action == 'tap_tempo':
            if hasattr(song, 'tap_tempo'):
                song.tap_tempo()
                return {'ok': True, 'message': 'Tempo tapped'}
            raise ValueError('Tap tempo not supported by this Live API surface')

        if action == 'undo':
            if hasattr(song, 'undo'):
                song.undo()
                return {'ok': True, 'message': 'Undo performed'}
            raise ValueError('Undo not supported by this Live API surface')

        # ===== WAVE 13: Device/Rack Deep Control =====

        if action == 'select_device':
            track = self._resolve_track(args.get('track', 'selected'))
            device_arg = args.get('device', 1)
            device = self._resolve_device(track, int(device_arg) if isinstance(device_arg, int) or str(device_arg).isdigit() else device_arg)
            if hasattr(track, 'view') and hasattr(track.view, 'selected_device'):
                track.view.selected_device = device
            return {'ok': True, 'device': getattr(device, 'name', 'unknown'), 'track': getattr(track, 'name', 'unknown')}

        if action == 'select_rack_chain':
            track = self._resolve_track(args.get('track'))
            device_arg = args.get('device', 1)
            device = self._resolve_device(track, int(device_arg) if isinstance(device_arg, int) or str(device_arg).isdigit() else device_arg)
            if not hasattr(device, 'chains'):
                raise ValueError('Device is not a rack: %s' % getattr(device, 'name', 'unknown'))
            chain_arg = args.get('chain', 1)
            chain = None
            if isinstance(chain_arg, int) or str(chain_arg).isdigit():
                chain_idx = int(chain_arg) - 1
                if 0 <= chain_idx < len(device.chains):
                    chain = device.chains[chain_idx]
            else:
                for c in device.chains:
                    if getattr(c, 'name', '').lower() == str(chain_arg).lower():
                        chain = c
                        break
            if chain is None:
                raise ValueError('Chain not found: %s' % chain_arg)
            if hasattr(device, 'view') and hasattr(device.view, 'selected_chain'):
                device.view.selected_chain = chain
            return {'ok': True, 'chain': getattr(chain, 'name', 'unknown'), 'device': getattr(device, 'name', 'unknown')}

        if action == 'enable_rack_chain':
            track = self._resolve_track(args.get('track'))
            device_arg = args.get('device', 1)
            device = self._resolve_device(track, int(device_arg) if isinstance(device_arg, int) or str(device_arg).isdigit() else device_arg)
            if not hasattr(device, 'chains'):
                raise ValueError('Device is not a rack: %s' % getattr(device, 'name', 'unknown'))
            chain_arg = args.get('chain', 1)
            chain = None
            if isinstance(chain_arg, int) or str(chain_arg).isdigit():
                chain_idx = int(chain_arg) - 1
                if 0 <= chain_idx < len(device.chains):
                    chain = device.chains[chain_idx]
            else:
                for c in device.chains:
                    if getattr(c, 'name', '').lower() == str(chain_arg).lower():
                        chain = c
                        break
            if chain is None:
                raise ValueError('Chain not found: %s' % chain_arg)
            value = bool(args.get('value', True))
            if hasattr(chain, 'is_active'):
                chain.is_active = value
            return {'ok': True, 'chain': getattr(chain, 'name', 'unknown'), 'enabled': value}

        if action == 'set_macro':
            track = self._resolve_track(args.get('track'))
            device_arg = args.get('device', 1)
            device = self._resolve_device(track, int(device_arg) if isinstance(device_arg, int) or str(device_arg).isdigit() else device_arg)
            macro_name = args.get('macro', 'Macro 1')
            value = float(args.get('value', 0.5))
            macro_param = None
            for param in device.parameters:
                if getattr(param, 'name', '').lower() == str(macro_name).lower():
                    macro_param = param
                    break
            if macro_param is None:
                raise ValueError('Macro not found: %s' % macro_name)
            macro_param.value = value
            return {'ok': True, 'device': getattr(device, 'name', 'unknown'), 'macro': getattr(macro_param, 'name', 'unknown'), 'value': float(macro_param.value)}

        # ===== WAVE 14: Browser + Plan/Utility Ops =====

        if action == 'browser_list_categories':
            categories = []
            if hasattr(song, 'browser') and hasattr(song.browser, 'categories'):
                for i, cat in enumerate(song.browser.categories):
                    categories.append({'index': i + 1, 'name': getattr(cat, 'name', 'Category %d' % (i + 1))})
            return {'ok': True, 'categories': categories}

        if action == 'browser_preview':
            if hasattr(song, 'browser') and hasattr(song.browser, 'preview'):
                song.browser.preview()
                return {'ok': True, 'message': 'Preview started'}
            raise ValueError('Browser preview not available')

        if action == 'browser_load_to_selected_track':
            query = str(args.get('query', ''))
            if hasattr(song, 'browser') and hasattr(song.browser, 'search'):
                results = song.browser.search(query)
                if results and len(results) > 0:
                    item = results[0]
                    if hasattr(song.view, 'selected_track') and hasattr(song.view.selected_track, 'devices'):
                        song.view.selected_track.devices.append(item)
                        return {'ok': True, 'query': query, 'item': getattr(item, 'name', 'unknown')}
                return {'ok': False, 'error': 'No results found for: %s' % query}
            raise ValueError('Browser search not available')

        if action == 'browser_load_sample_to_clip':
            query = str(args.get('query', ''))
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range: %s' % slot_no)
            if hasattr(song, 'browser') and hasattr(song.browser, 'search'):
                results = song.browser.search(query)
                if results and len(results) > 0:
                    sample = results[0]
                    track.clip_slots[slot_index].create_clip()
                    if track.clip_slots[slot_no].has_clip:
                        clip = track.clip_slots[slot_no].clip
                        if hasattr(clip, 'file_path'):
                            clip.file_path = getattr(sample, 'file_path', '')
                        return {'ok': True, 'query': query, 'slot': slot_no}
                return {'ok': False, 'error': 'No sample found for: %s' % query}
            raise ValueError('Browser search not available')

        if action == 'get_track_muted_by_solo':
            track = self._resolve_track(args.get('track'))
            return {'ok': True, 'muted_by_solo': bool(getattr(track, 'muted_by_solo', False))}

        if action == 'get_track_output':
            track = self._resolve_track(args.get('track'))
            routing = getattr(track, 'output_routing_type', 'None')
            return {'ok': True, 'output': str(routing)}

        if action == 'get_looping':
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_idx = slot_no - 1 if slot_no > 0 else slot_no
            if 0 <= slot_idx < len(track.clip_slots):
                cs = track.clip_slots[slot_idx]
                if cs.has_clip:
                    return {'ok': True, 'looping': bool(cs.clip.looping)}
                return {'ok': False, 'error': 'No clip'}
            raise ValueError('Clip slot out of range')

        if action == 'get_clip_looping':
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_idx = slot_no - 1 if slot_no > 0 else slot_no
            if 0 <= slot_idx < len(track.clip_slots):
                cs = track.clip_slots[slot_idx]
                if cs.has_clip:
                    return {'ok': True, 'looping': bool(cs.clip.looping)}
                return {'ok': False, 'error': 'No clip'}
            raise ValueError('Clip slot out of range')

        if action == 'get_track_devices':
            track = self._resolve_track(args.get('track'))
            devices_out = []
            for i, d in enumerate(track.devices):
                devices_out.append({
                    'index': i + 1,
                    'name': getattr(d, 'name', 'Device %d' % (i + 1)),
                    'type': str(d.type),
                    'parameters': len(d.parameters)
                })
            return {'ok': True, 'devices': devices_out}

        if action == 'get_slot_clip_info':
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_idx = slot_no - 1 if slot_no > 0 else slot_no
            if 0 <= slot_idx < len(track.clip_slots):
                cs = track.clip_slots[slot_idx]
                if cs.has_clip:
                    clip = cs.clip
                    return {'ok': True, 'has_clip': True, 'name': str(clip.name), 'length': float(clip.length), 'start_time': float(clip.start_time), 'looping': bool(clip.looping)}
                return {'ok': True, 'has_clip': False}
            raise ValueError('Clip slot out of range')

        # ===== WAVE 15: Song Extended =====
        if action == 'capture_midi':
            song.capture_midi()
            return {'ok': True, 'message': 'MIDI captured'}

        if action == 'continue_playing':
            song.continue_playing()
            return {'ok': True, 'message': 'Continuing playback'}

        if action == 'create_return_track':
            song.create_return_track()
            return {'ok': True, 'message': 'Return track created'}

        if action == 'delete_return_track':
            track = self._resolve_track(args.get('track'))
            song.delete_return_track(list(song.tracks).index(track) - len(song.tracks) + song.return_tracks)
            return {'ok': True, 'message': 'Return track deleted'}

        if action == 'jump_by':
            value = float(args.get('value', 0))
            song.jump_by(value)
            return {'ok': True, 'jumped_by': value}

        if action == 'jump_to_next_cue':
            song.jump_to_next_cue()
            return {'ok': True, 'message': 'Jumped to next cue'}

        if action == 'jump_to_prev_cue':
            song.jump_to_prev_cue()
            return {'ok': True, 'message': 'Jumped to previous cue'}

        if action == 'redo':
            song.redo()
            return {'ok': True, 'message': 'Redo performed'}

        if action == 'trigger_session_record':
            song.trigger_session_record()
            return {'ok': True, 'message': 'Session record triggered'}

        if action == 'get_arrangement_overdub':
            val = bool(getattr(song, 'arrangement_overdub', False))
            return {'ok': True, 'arrangement_overdub': val}

        if action == 'set_arrangement_overdub':
            value = bool(args.get('value', True))
            song.arrangement_overdub = value
            return {'ok': True, 'arrangement_overdub': bool(song.arrangement_overdub)}

        if action == 'get_groove_amount':
            val = float(getattr(song, 'groove_amount', 0.0))
            return {'ok': True, 'groove_amount': val}

        if action == 'set_groove_amount':
            value = float(args.get('value', 0.0))
            song.groove_amount = value
            return {'ok': True, 'groove_amount': float(song.groove_amount)}

        if action == 'get_can_undo':
            val = bool(getattr(song, 'can_undo', False))
            return {'ok': True, 'can_undo': val}

        if action == 'get_can_redo':
            val = bool(getattr(song, 'can_redo', False))
            return {'ok': True, 'can_redo': val}

        if action == 'get_song_length':
            val = float(getattr(song, 'song_length', 0.0))
            return {'ok': True, 'song_length': val}

        if action == 'get_num_scenes':
            val = len(song.scenes)
            return {'ok': True, 'num_scenes': val}

        if action == 'get_num_tracks':
            val = len(song.tracks)
            return {'ok': True, 'num_tracks': val}

        if action == 'get_track_names':
            names = [{'index': i + 1, 'name': getattr(t, 'name', 'Track %d' % (i + 1))} for i, t in enumerate(song.tracks)]
            return {'ok': True, 'track_names': names}

        if action == 'get_time_signature':
            return {'ok': True, 'time_signature': '%d/%d' % (song.signature_numerator, song.signature_denominator)}

        if action == 'set_time_signature':
            num = int(args.get('numerator', 4))
            denom = int(args.get('denominator', 4))
            song.signature_numerator = num
            song.signature_denominator = denom
            return {'ok': True, 'time_signature': '%d/%d' % (num, denom)}

        # ===== WAVE 16: Track/Clip Extended =====
        if action == 'set_input_routing_type':
            track = self._resolve_track(args.get('track'))
            routing_type = str(args.get('value', 'Ext:In 1'))
            if hasattr(track, 'input_routing_type'):
                track.input_routing_type = routing_type
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'input_routing_type': routing_type}

        if action == 'set_output_routing_type':
            track = self._resolve_track(args.get('track'))
            routing_type = str(args.get('value', 'Int:Main'))
            if hasattr(track, 'output_routing_type'):
                track.output_routing_type = routing_type
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'output_routing_type': routing_type}

        if action == 'set_fold_state':
            track = self._resolve_track(args.get('track'))
            value = bool(args.get('value', True))
            if hasattr(track, 'fold_state'):
                track.fold_state = value
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'fold_state': bool(track.fold_state)}

        if action == 'get_fired_slot_index':
            track = self._resolve_track(args.get('track'))
            val = int(getattr(track, 'fired_slot_index', -2))
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'fired_slot_index': val}

        if action == 'get_playing_slot_index':
            track = self._resolve_track(args.get('track'))
            val = int(getattr(track, 'playing_slot_index', -1))
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'playing_slot_index': val}

        if action == 'get_is_foldable':
            track = self._resolve_track(args.get('track'))
            val = bool(getattr(track, 'is_foldable', False))
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'is_foldable': val}

        if action == 'get_has_midi_input':
            track = self._resolve_track(args.get('track'))
            val = bool(getattr(track, 'has_midi_input', False))
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'has_midi_input': val}

        if action == 'get_has_midi_output':
            track = self._resolve_track(args.get('track'))
            val = bool(getattr(track, 'has_midi_output', False))
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'has_midi_output': val}

        if action == 'get_can_be_armed':
            track = self._resolve_track(args.get('track'))
            val = bool(getattr(track, 'can_be_armed', False))
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'can_be_armed': val}

        if action == 'get_clip_position':
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range: %s' % slot_no)
            clip_slot = track.clip_slots[slot_index]
            if not clip_slot.has_clip:
                raise ValueError('No clip')
            return {'ok': True, 'track': getattr(track, 'name', 'unknown'), 'slot': slot_no, 'position': float(clip_slot.clip.position)}

        if action == 'get_clip_muted':
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range')
            clip_slot = track.clip_slots[slot_index]
            if not clip_slot.has_clip:
                raise ValueError('No clip')
            return {'ok': True, 'muted': bool(clip_slot.clip.muted)}

        if action == 'get_clip_is_audio':
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range')
            clip_slot = track.clip_slots[slot_index]
            if not clip_slot.has_clip:
                raise ValueError('No clip')
            return {'ok': True, 'is_audio': bool(clip_slot.clip.is_audio_clip)}

        if action == 'get_clip_is_midi':
            track = self._resolve_track(args.get('track'))
            slot_no = int(args.get('slot', 1))
            slot_index = slot_no - 1 if slot_no > 0 else slot_no
            if not (0 <= slot_index < len(track.clip_slots)):
                raise ValueError('Clip slot out of range')
            clip_slot = track.clip_slots[slot_index]
            if not clip_slot.has_clip:
                raise ValueError('No clip')
            return {'ok': True, 'is_midi': bool(clip_slot.clip.is_midi_clip)}

        if action == 'list_cue_points':
            cue_points = []
            if hasattr(song, 'cue_points'):
                for i, cp in enumerate(song.cue_points):
                    cue_points.append({'index': i, 'name': getattr(cp, 'name', 'Cue %d' % i), 'time': float(getattr(cp, 'time', 0))})
            return {'ok': True, 'cue_points': cue_points}

        if action == 'jump_to_cue_point':
            index = int(args.get('index', 0))
            if hasattr(song, 'cue_points') and index < len(song.cue_points):
                song.cue_points[index].jump()
                return {'ok': True, 'index': index}
            raise ValueError('jump_to_cue_point failed')

        raise ValueError('Unsupported action: %s' % action)

    def disconnect(self):
        Live.Base.log("LiveAgent: disconnecting...")
        self._running = False
        if self._sock is not None:
            try:
                self._sock.close()
            except Exception:
                pass
            self._sock = None
        super(LiveAgent, self).disconnect()


def create_instance(c_instance):
    Live.Base.log("LiveAgent: create_instance called")
    return LiveAgent(c_instance)
