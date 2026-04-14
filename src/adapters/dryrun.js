export class DryRunAdapter {
  name = "showcontrol-osc";

  async preflight() {
    return { ok: true, message: "Dry-run adapter preflight OK" };
  }

  async execute(action, args) {
    return {
      ok: true,
      message: `[dry-run] ${action} ${JSON.stringify(args)}`
    };
  }
}
