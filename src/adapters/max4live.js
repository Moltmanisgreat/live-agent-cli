export class Max4LiveAdapter {
  name = "max4live";

  constructor(options = {}) {
    this.options = options;
  }

  async preflight() {
    return {
      ok: false,
      message:
        "Max4Live adapter not connected yet. Implement bridge transport on Sunday machine (Live 12 beta)."
    };
  }

  async execute(action, args) {
    return {
      ok: false,
      message: `max4live adapter not implemented for action '${action}'`
    };
  }
}
