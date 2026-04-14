import { DryRunAdapter } from './dryrun.js';
import { Max4LiveAdapter } from './max4live.js';
import { RemoteScriptAdapter } from './remotescript.js';
import { CompanionAdapter } from './companion.js';

export function listAdapters() {
  return [
    { name: 'showcontrol-osc', status: 'available', mode: 'dry-run' },
    { name: 'remotescript', status: 'available', mode: 'udp' },
    { name: 'max4live', status: 'planned', mode: 'bridge-required' },
    { name: 'companion', status: 'available', mode: 'http' }
  ];
}

export function createAdapter(name = 'showcontrol-osc', options = {}) {
  if (name === 'showcontrol-osc' || name === 'dryrun') return new DryRunAdapter(options);
  if (name === 'remotescript' || name === 'remotescript-osc') return new RemoteScriptAdapter(options);
  if (name === 'max4live') return new Max4LiveAdapter(options);
  if (name === 'companion') return new CompanionAdapter(options);
  throw new Error(`Unknown adapter: ${name}`);
}
