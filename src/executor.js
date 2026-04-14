import { validatePlan, isMutatingPlan } from "./validator.js";
import { expandMacros } from "./macros.js";

export async function executePlan(plan, adapter, options = {}) {
  const { execute = false, continueOnError = false } = options;

  // Expand any run_macro actions before validation
  const expandedPlan = expandMacros(plan);

  const validation = validatePlan(expandedPlan);
  if (!validation.ok) {
    return { ok: false, mode: execute ? "execute" : "dry-run", errors: validation.errors, steps: [] };
  }

  const mutating = isMutatingPlan(expandedPlan);

  if (mutating && !execute) {
    const previewSteps = plan.actions.map((s, i) => ({
      index: i + 1,
      action: s.action,
      ok: true,
      message: `[dry-run] would execute ${s.action} ${JSON.stringify(s.args || {})}`
    }));

    return {
      ok: true,
      mode: "dry-run",
      adapter: adapter.name,
      warnings: ["Mutating plan detected. Nothing applied. Re-run with --execute to apply changes."],
      steps: previewSteps
    };
  }

  const preflight = await adapter.preflight();
  if (!preflight.ok) {
    return { ok: false, mode: execute ? "execute" : "dry-run", errors: [preflight.message], steps: [] };
  }

  const steps = [];
  let ok = true;

  for (let i = 0; i < expandedPlan.actions.length; i++) {
    const step = expandedPlan.actions[i];
    try {
      const result = await adapter.execute(step.action, step.args);
      steps.push({ index: i + 1, action: step.action, ok: !!result.ok, message: result.message });

      if (!result.ok) {
        ok = false;
        if (!continueOnError) break;
      }
    } catch (err) {
      steps.push({ index: i + 1, action: step.action, ok: false, message: err.message });
      ok = false;
      if (!continueOnError) break;
    }
  }

  return {
    ok,
    mode: execute ? "execute" : "dry-run",
    adapter: adapter.name,
    steps
  };
}
