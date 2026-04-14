import { ACTIONS } from "./actions.js";

export function validatePlan(plan) {
  const errors = [];

  if (!plan || typeof plan !== "object") errors.push("Plan must be an object");
  if (!plan.version) errors.push("Missing version");
  if (!plan.intent) errors.push("Missing intent");
  if (!plan.adapter) errors.push("Missing adapter");
  if (!Array.isArray(plan.actions) || plan.actions.length === 0) {
    errors.push("actions must be a non-empty array");
  }

  for (const [idx, step] of (plan.actions || []).entries()) {
    const def = ACTIONS[step.action];
    if (!def) {
      errors.push(`Step ${idx + 1}: unsupported action '${step.action}'`);
      continue;
    }

    for (const req of def.args) {
      if (!(req in (step.args || {}))) {
        errors.push(`Step ${idx + 1}: missing arg '${req}' for ${step.action}`);
      }
    }

    if (!def.validate(step.args || {})) {
      errors.push(`Step ${idx + 1}: invalid args for ${step.action}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function isMutatingPlan(plan) {
  return (plan.actions || []).some((step) => ACTIONS[step.action]?.mutating);
}
