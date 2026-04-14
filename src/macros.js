/**
 * Macro expansion for live-agent-cli
 * Expands run_macro actions into their stored sequences
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const MACRO_PATH = join(homedir(), '.live-agent', 'macros.json');

let macroCache = null;
let macroCacheTime = 0;

function loadMacros() {
  try {
    const stats = readFileSync(MACRO_PATH, { encoding: 'utf8' });
    const data = JSON.parse(stats);
    return data.macros || {};
  } catch (e) {
    return {};
  }
}

function getMacros() {
  // Simple cache - reload every time for now (can optimize later)
  return loadMacros();
}

export function expandMacros(plan) {
  if (!plan || !plan.actions) return plan;
  
  const macros = getMacros();
  const expandedActions = [];
  
  for (const step of plan.actions) {
    if (step.action === 'run_macro') {
      const macroName = step.args?.name;
      if (!macroName) {
        // Keep as-is if no name provided
        expandedActions.push(step);
        continue;
      }
      
      const macro = macros[macroName];
      if (!macro) {
        // Macro not found - keep the action but mark for error
        expandedActions.push({
          ...step,
          _error: `Macro "${macroName}" not found in ${MACRO_PATH}`
        });
        continue;
      }
      
      // Expand macro actions
      if (macro.actions && Array.isArray(macro.actions)) {
        for (const macroAction of macro.actions) {
          expandedActions.push({
            ...macroAction,
            _fromMacro: macroName
          });
        }
      }
    } else {
      expandedActions.push(step);
    }
  }
  
  return {
    ...plan,
    actions: expandedActions,
    _macroExpanded: true
  };
}

export function listMacros() {
  const macros = getMacros();
  return Object.entries(macros).map(([name, data]) => ({
    name,
    description: data.description || '',
    actionCount: data.actions?.length || 0
  }));
}

export function getMacro(name) {
  const macros = getMacros();
  return macros[name] || null;
}