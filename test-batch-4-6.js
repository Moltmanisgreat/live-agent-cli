#!/usr/bin/env node
/**
 * Test script for Batch 4 (devices) and Batch 6 (arrangement)
 * Run against live Ableton session
 */

import { RemoteScriptAdapter } from './src/adapters/remotescript.js';
import { expandMacros } from './src/macros.js';

const adapter = new RemoteScriptAdapter();

async function testBatch4Devices() {
  console.log('=== Batch 4: Devices ===');
  
  // Test 1: Create track and load device
  console.log('\n1. Creating MIDI track and loading Drum Rack...');
  try {
    const createResult = await adapter.execute('create_track', { type: 'midi' });
    console.log('   create_track:', createResult.ok ? 'OK' : 'FAIL', createResult.message || '');
    
    const loadResult = await adapter.execute('load_device', { track: 'selected', device: 'Drum Rack' });
    console.log('   load_device:', loadResult.ok ? 'OK' : 'FAIL', loadResult.message || '');
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
  
  // Test 2: List devices
  console.log('\n2. Listing devices on track 1...');
  try {
    const result = await adapter.execute('list_devices', { track: 1 });
    console.log('   list_devices:', result.ok ? 'OK' : 'FAIL');
    if (result.ok && result.devices) {
      console.log('   Found', result.devices.length, 'devices:');
      result.devices.forEach(d => console.log(`     - ${d.name} (${d.class_name})`));
    }
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
  
  // Test 3: Enable/disable device
  console.log('\n3. Testing device enable/disable...');
  try {
    const result = await adapter.execute('enable_device', { track: 1, device: 1, value: false });
    console.log('   disable_device:', result.ok ? 'OK' : 'FAIL', result.message || '');
    
    const result2 = await adapter.execute('enable_device', { track: 1, device: 1, value: true });
    console.log('   enable_device:', result2.ok ? 'OK' : 'FAIL', result2.message || '');
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
  
  // Test 4: Set device parameter
  console.log('\n4. Testing device parameter...');
  try {
    // Try to set volume on Drum Rack (macro 1)
    const result = await adapter.execute('set_device_parameter', { 
      track: 1, 
      device: 1, 
      parameter: 'Macro 1', 
      value: 0.75 
    });
    console.log('   set_device_parameter:', result.ok ? 'OK' : 'FAIL', result.message || '');
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
}

async function testBatch6Arrangement() {
  console.log('\n=== Batch 6: Arrangement ===');
  
  // Test 1: Set arrangement position
  console.log('\n1. Setting arrangement position to 4.0...');
  try {
    const result = await adapter.execute('set_arrangement_position', { value: 4.0 });
    console.log('   set_arrangement_position:', result.ok ? 'OK' : 'FAIL', result.message || '');
    if (result.ok) {
      console.log('   current_song_time:', result.current_song_time);
    }
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
  
  // Test 2: Set loop region
  console.log('\n2. Setting loop region from 2 to 8 bars...');
  try {
    const result = await adapter.execute('set_loop_region', { start: 2, end: 8, enabled: true });
    console.log('   set_loop_region:', result.ok ? 'OK' : 'FAIL', result.message || '');
    if (result.ok) {
      console.log('   loop_start:', result.loop_start, 'loop_length:', result.loop_length);
    }
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
  
  // Test 3: Punch in/out
  console.log('\n3. Testing punch in/out...');
  try {
    const result1 = await adapter.execute('set_punch_in', { value: true });
    console.log('   set_punch_in:', result1.ok ? 'OK' : 'FAIL');
    
    const result2 = await adapter.execute('set_punch_out', { value: true });
    console.log('   set_punch_out:', result2.ok ? 'OK' : 'FAIL');
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
}

async function testMacroExpansion() {
  console.log('\n=== Macro Expansion ===');
  
  const plan = {
    version: '0.1',
    intent: 'run macro quick drum record',
    adapter: 'remotescript',
    actions: [{ action: 'run_macro', args: { name: 'quick drum record' } }],
    safety: { mutating: true, requiresExecuteFlag: true }
  };
  
  const expanded = expandMacros(plan);
  console.log('Original actions:', plan.actions.length);
  console.log('Expanded actions:', expanded.actions.length);
  console.log('Actions:');
  expanded.actions.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.action}`, a._fromMacro ? `(from macro: ${a._fromMacro})` : '');
  });
}

async function main() {
  console.log('Testing Batch 4 & 6 against Ableton Live...\n');
  
  const preflight = await adapter.preflight();
  console.log('Preflight:', preflight.ok ? 'OK' : 'FAIL', preflight.message);
  
  if (!preflight.ok) {
    console.log('Cannot connect to Ableton. Is Live running with LiveAgent remote script installed?');
    process.exit(1);
  }
  
  await testBatch4Devices();
  await testBatch6Arrangement();
  await testMacroExpansion();
  
  console.log('\n=== Tests Complete ===');
  await adapter.close();
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
