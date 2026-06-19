// Minimal structured (JSON) logger with a per-request id for correlation.
// Never log secrets or PII (bill text, AI output, emails). See
// docs/security/logging-strategy.md.

export type Level = "debug" | "info" | "warn" | "error";

export interface Logger {
  requestId: string;
  log: (level: Level, msg: string, fields?: Record<string, unknown>) => void;
  info: (msg: string, fields?: Record<string, unknown>) => void;
  warn: (msg: string, fields?: Record<string, unknown>) => void;
  error: (msg: string, fields?: Record<string, unknown>) => void;
}

export function newRequestId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

export function createLogger(fn: string, req: Request): Logger {
  const requestId = req.headers.get("x-request-id") ?? newRequestId();
  const base = { fn, requestId };
  const emit = (level: Level, msg: string, fields: Record<string, unknown> = {}) => {
    const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...base, ...fields });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };
  return {
    requestId,
    log: emit,
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
  };
}
