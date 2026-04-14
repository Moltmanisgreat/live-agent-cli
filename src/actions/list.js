import { ACTIONS } from "./registry.js";

export function listActions(filters = {}) {
  const { category, batch } = filters;
  return Object.entries(ACTIONS)
    .map(([name, def]) => ({
      action: name,
      args: def.args,
      mutating: def.mutating,
      category: def.category,
      batch: def.batch,
      description: def.description
    }))
    .filter((a) => (category ? a.category === category : true))
    .filter((a) => (batch ? a.batch === Number(batch) : true));
}
