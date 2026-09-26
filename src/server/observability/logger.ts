import "server-only";

/**
 * Structured JSON logger. Never pass personal data (weights, e-mails, names)
 * in `context`: identifiers only. Fields named like sensitive data are redacted
 * as a safety net.
 */
type Level = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEYS = /(password|token|secret|email|weight|height|birth|name|cookie|authorization)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_KEYS.test(k) ? "[redacted]" : redact(v, depth + 1);
  }
  return out;
}

function write(level: Level, message: string, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" && level === "debug") return;
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(context ? { context: redact(context) } : {}),
  };
  const line = `${JSON.stringify(entry)}\n`;
  if (level === "error" || level === "warn") process.stderr.write(line);
  else process.stdout.write(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};

export function errorContext(error: unknown): Record<string, unknown> {
  if (error instanceof Error) return { errorName: error.name, errorMessage: error.message };
  return { error: String(error) };
}
