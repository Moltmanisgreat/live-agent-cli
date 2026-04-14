/**
 * Remote Script Adapter for Ableton Live
 * 
 * Architecture:
 * ┌─────────────┐      OSC/UDP       ┌──────────────────┐      Live Object Model      ┌─────────────┐
 * │ live-agent  │ ◄────────────────► │ Remote Script    │ ◄────────────────────────► │ Ableton     │
 * │ (Node.js)   │   port 9000/9001   │ (Python)         │                            │ Live        │
 * └─────────────┘                    └──────────────────┘                            └─────────────┘
 * 
 * Protocol:
 * - CLI sends: { cmd: "create_track", args: { type: "midi" }, id: "uuid" }
 * - Script responds: { id: "uuid", ok: true, result: {...} }
 */

import dgram from 'dgram';
import { EventEmitter } from 'events';

export class RemoteScriptAdapter extends EventEmitter {
  name = "remotescript";
  
  constructor(options = {}) {
    super();
    this.host = options.host || '127.0.0.1';
    this.sendPort = options.sendPort || 9000;  // Script listens
    this.recvPort = options.recvPort || 9001;  // CLI listens
    this.socket = null;
    this.pending = new Map();  // id → { resolve, reject, timeout }
  }

  async preflight() {
    try {
      await this._bind();
      return { ok: true, message: `Connected to Remote Script at ${this.host}:${this.sendPort}` };
    } catch (e) {
      return { ok: false, message: `Cannot reach Remote Script: ${e.message}` };
    }
  }

  _bind() {
    return new Promise((resolve, reject) => {
      if (this.socket) return resolve();
      
      this.socket = dgram.createSocket('udp4');
      
      this.socket.on('error', (err) => {
        this.socket.close();
        this.socket = null;
        reject(err);
      });
      
      this.socket.bind(this.recvPort, () => {
        this.socket.setBroadcast(true);
        resolve();
      });
      
      this.socket.on('message', (msg, rinfo) => {
        this._handleMessage(msg.toString());
      });
    });
  }

  async execute(action, args = {}) {
    const id = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout waiting for ${action}`));
      }, 5000);
      
      this.pending.set(id, { resolve, reject, timeout });
      
      const payload = JSON.stringify({ id, action, args });
      this.socket.send(payload, this.sendPort, this.host, (err) => {
        if (err) {
          clearTimeout(timeout);
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

  _handleMessage(raw) {
    try {
      const { id, ok, result, error } = JSON.parse(raw);
      const pending = this.pending.get(id);
      if (!pending) return;
      
      clearTimeout(pending.timeout);
      this.pending.delete(id);
      
      if (ok) pending.resolve(result);
      else pending.reject(new Error(error));
    } catch (e) {
      console.error('Failed to parse response:', raw);
    }
  }

  async close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // --- Action shortcuts ---
  async createTrack(type = 'midi') {
    return this.execute('create_track', { type });
  }
  
  async play() {
    return this.execute('transport_play');
  }
  
  async stop() {
    return this.execute('transport_stop');
  }
  
  async loadDevice(deviceName) {
    return this.execute('load_device', { name: deviceName });
  }
}