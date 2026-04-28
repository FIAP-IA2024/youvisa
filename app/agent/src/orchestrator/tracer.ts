import type { AgentTraceEntry } from './types';

/**
 * Collects per-step timing + outputs across the pipeline run.
 * One Tracer per pipeline invocation.
 */
export class Tracer {
  private entries: AgentTraceEntry[] = [];

  async run<T extends Record<string, unknown> | { toTrace: () => Record<string, unknown> }>(
    step: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const started_at = new Date();
    const t0 = performance.now();
    try {
      const result = await fn();
      const output =
        result && typeof (result as any).toTrace === 'function'
          ? ((result as any).toTrace() as Record<string, unknown>)
          : (result as Record<string, unknown>);
      this.entries.push({
        step,
        started_at,
        duration_ms: Math.round(performance.now() - t0),
        output,
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.entries.push({
        step,
        started_at,
        duration_ms: Math.round(performance.now() - t0),
        output: {},
        error: message,
      });
      throw err;
    }
  }

  /**
   * Adds a synthetic trace entry without running anything (e.g., for short-circuits).
   */
  push(entry: AgentTraceEntry): void {
    this.entries.push(entry);
  }

  trace(): AgentTraceEntry[] {
    return [...this.entries];
  }
}
