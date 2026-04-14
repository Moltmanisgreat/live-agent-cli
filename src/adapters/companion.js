/**
 * Companion adapter for live-agent-cli
 * Routes project_save_as to the macOS dialog bridge
 */

export class CompanionAdapter {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://127.0.0.1:31973';
    this.timeout = options.timeout || 30000;
  }

  async preflight() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        return { ok: true, message: 'Companion bridge is running' };
      }
      return { ok: false, message: 'Companion bridge returned error' };
    } catch (e) {
      return { ok: false, message: `Companion bridge not available: ${e.message}` };
    }
  }

  async execute(action, args) {
    if (action === 'project_save_as') {
      return this._saveAs(args);
    }
    if (action === 'project_save') {
      return this._simpleSave(args);
    }
    return { ok: false, error: `Unsupported action: ${action}` };
  }

  async _saveAs(args) {
    const targetPath = args.path || args.targetPath || args.filename;
    if (!targetPath) {
      return { ok: false, error: 'Missing target path for save_as' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/dialog/save-as`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPath: targetPath,
          activateLive: true,
          timeoutMs: this.timeout
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      const result = await response.json();
      
      if (result.ok) {
        return {
          ok: true,
          path: result.filePath,
          fileCreated: result.fileCreated,
          dialogClosed: result.dialogClosed,
          message: `Saved to ${result.filePath}`
        };
      }

      return {
        ok: false,
        error: result.error || 'Save failed',
        notes: result.notes,
        mode: result.mode
      };

    } catch (e) {
      return { ok: false, error: `Companion request failed: ${e.message}` };
    }
  }

  async _simpleSave(args) {
    const targetPath = args.path || args.targetPath;
    
    try {
      const response = await fetch(`${this.baseUrl}/v1/dialog/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPath: targetPath,  // Optional - if not provided, saves to current
          activateLive: true,
          timeoutMs: this.timeout
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      const result = await response.json();
      
      if (result.ok) {
        return {
          ok: true,
          path: result.filePath,
          fileCreated: result.fileCreated,
          dialogClosed: result.dialogClosed,
          message: `Saved to ${result.filePath || 'current location'}`
        };
      }

      return {
        ok: false,
        error: result.error || 'Save failed',
        notes: result.notes,
        mode: result.mode
      };

    } catch (e) {
      return { ok: false, error: `Companion request failed: ${e.message}` };
    }
  }

  async close() {
    // Nothing to close for HTTP adapter
  }
}
